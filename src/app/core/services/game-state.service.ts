import { computed, effect, inject, Injectable, signal } from '@angular/core';
import {
  BRANCHES,
  CAPABILITIES,
  CAREERS,
  REGIONS,
  SKILLS,
  SKILL_STAT_BONUSES,
  STAT_AXES,
} from '../data/game.data';
import {
  BranchId,
  Capability,
  CareerProfile,
  GameView,
  RoundSnapshot,
  SavedGameState,
  SkillBranch,
  SkillItem,
  SkillStatBonus,
  WorldRegion,
} from '../models/game.models';
import { AdventureShareProfile, ProfileShareService } from './profile-share.service';

@Injectable({ providedIn: 'root' })
export class GameStateService {
  private readonly storageKey = 'ai-academy-adventure-v6';
  private readonly profileShare = inject(ProfileShareService);

  readonly branches = BRANCHES;
  readonly skills = SKILLS;
  readonly capabilities = CAPABILITIES;
  readonly regions = REGIONS;
  readonly mapRegions = this.regions.filter((region) => region.visibleOnMap !== false);
  readonly careers = CAREERS;
  readonly statAxes = STAT_AXES;
  readonly enterpriseHubRegion =
    this.regions.find((region) => region.kind === 'enterprise-hub') ?? null;
  readonly enterpriseContracts = this.regions.filter(
    (region) => region.kind === 'enterprise-contract',
  );

  readonly view = signal<GameView>('intro');
  readonly acquiredSkills = signal<readonly string[]>([]);
  readonly completedRegions = signal<readonly string[]>(['prompt-academy']);
  readonly choices = signal<Readonly<Record<string, number>>>({});
  readonly activeRegionId = signal<string | null>(null);
  readonly questPhase = signal<'dialogue' | 'choice' | 'result'>('dialogue');
  readonly dialogueIndex = signal(0);
  readonly selectedOption = signal<number | null>(null);
  readonly newlyUnlockedCapabilities = signal<readonly string[]>([]);
  readonly selectedTrack = signal<string | null>(null);
  readonly activeCareerId = signal<string | null>(null);
  readonly lastRound = signal<RoundSnapshot | null>(null);
  readonly previewRewards = signal(false);
  readonly collectionOpen = signal(false);
  readonly settingsOpen = signal(false);
  readonly shareStatus = signal<string | null>(null);
  readonly sharingProfile = signal(false);

  readonly activeRegion = computed(
    () => this.regions.find((region) => region.id === this.activeRegionId()) ?? null,
  );
  readonly activeDialogue = computed(() => {
    const region = this.activeRegion();
    return region?.dialogue[this.dialogueIndex()] ?? null;
  });
  readonly selectedQuestOption = computed(() => {
    const region = this.activeRegion();
    const index = this.selectedOption();
    return region && index !== null ? (region.options[index] ?? null) : null;
  });
  readonly acquiredSkillSet = computed(() => new Set(this.acquiredSkills()));
  readonly completedRegionSet = computed(() => new Set(this.completedRegions()));
  readonly unlockedCapabilities = computed(() =>
    this.capabilities.filter((capability) =>
      this.capabilityRequirementsMet(capability, this.acquiredSkillSet()),
    ),
  );
  readonly unlockedCareers = computed(() =>
    this.careers.filter((career) =>
      this.careerRequirementsMet(career, this.acquiredSkillSet(), this.completedRegionSet()),
    ),
  );
  readonly newlyUnlockedCareers = computed(() => {
    const snapshot = this.lastRound();
    if (!snapshot || snapshot.regionId !== this.activeRegionId()) return [];
    const previousSkills = new Set(snapshot.acquiredSkills);
    const previousCompletedRegions = new Set(snapshot.completedRegions);
    return this.unlockedCareers().filter(
      (career) => !this.careerRequirementsMet(career, previousSkills, previousCompletedRegions),
    );
  });
  readonly skillProfileScores = computed(() =>
    this.statAxes.map((axis) => ({
      ...axis,
      value: Math.min(
        10,
        this.acquiredSkills().reduce(
          (total, skillId) =>
            total +
            this.skillStatBonuses(skillId)
              .filter((bonus) => bonus.axis === axis.id)
              .reduce((sum, bonus) => sum + bonus.points, 0),
          0,
        ),
      ),
    })),
  );
  readonly playerLevel = computed(() => Math.max(1, this.completedRegions().length));
  readonly hasSpecialization = computed(() =>
    this.regions.some(
      (region) => region.kind === 'specialization' && this.completedRegions().includes(region.id),
    ),
  );
  readonly completedEnterpriseContracts = computed(() =>
    this.enterpriseContracts.filter((region) => this.completedRegions().includes(region.id)),
  );
  readonly progressPercent = computed(() => {
    const quests = this.regions.filter(
      (region) =>
        region.kind === 'main' ||
        region.kind === 'specialization' ||
        region.kind === 'enterprise-contract',
    );
    return Math.round(
      (quests.filter((region) => this.completedRegions().includes(region.id)).length /
        quests.length) *
        100,
    );
  });
  readonly activeCareer = computed(() => {
    const unlocked = this.unlockedCareers();
    return unlocked.find((career) => career.id === this.activeCareerId()) ?? unlocked[0] ?? null;
  });
  readonly currentClassName = computed(() => {
    const career = this.activeCareer();
    if (career) return career.className;
    return '星引學徒';
  });
  readonly nextRegion = computed(() => {
    const region = this.activeRegion();
    return region ? this.nextRegionFor(region) : null;
  });
  readonly recommendedRegionId = computed(() => {
    const snapshot = this.lastRound();
    if (!snapshot) {
      return (
        this.regions.find(
          (region) => region.kind === 'main' && this.regionStatus(region) === 'open',
        )?.id ?? null
      );
    }
    const completedRegion = this.regions.find((region) => region.id === snapshot.regionId);
    if (!completedRegion) return null;
    if (completedRegion.kind === 'specialization' && this.unlockedCareers().length)
      return 'career-citadel';
    if (completedRegion.kind === 'enterprise-contract') {
      const hasRemainingContract = this.enterpriseContracts.some(
        (region) => !this.completedRegions().includes(region.id),
      );
      if (hasRemainingContract) return this.enterpriseHubRegion?.id ?? null;
      if (this.unlockedCareers().length) return 'career-citadel';
    }
    return this.nextRegionFor(completedRegion)?.id ?? null;
  });

  constructor() {
    this.restoreState();
    effect(() => {
      if (typeof localStorage === 'undefined') return;
      const state: SavedGameState = {
        view: this.view() === 'quest' ? 'map' : this.view(),
        acquiredSkills: this.acquiredSkills(),
        completedRegions: this.completedRegions(),
        choices: this.choices(),
        selectedTrack: this.selectedTrack(),
        previewRewards: this.previewRewards(),
        lastRound: this.lastRound(),
      };
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    });
  }

  startAdventure(): void {
    this.goToMap();
  }

  goHome(): void {
    this.closeOverlays();
    this.view.set('intro');
    this.scrollToTop();
  }

  goToMap(): void {
    this.closeOverlays();
    this.view.set('map');
    this.activeRegionId.set(null);
    this.scrollToTop();
  }

  goToEnterpriseHub(): void {
    const hub = this.enterpriseHubRegion;
    if (!hub || this.regionStatus(hub) === 'locked') return;
    this.closeOverlays();
    this.activeRegionId.set(hub.id);
    this.view.set('enterprise');
    this.scrollToTop();
  }

  openCollection(): void {
    this.collectionOpen.set(true);
  }
  closeCollection(): void {
    this.collectionOpen.set(false);
  }
  openSettings(): void {
    this.settingsOpen.set(true);
  }
  closeSettings(): void {
    this.settingsOpen.set(false);
  }
  toggleRewardPreview(): void {
    this.previewRewards.update((value) => !value);
  }

  openRegion(region: WorldRegion): void {
    if (this.regionStatus(region) === 'locked') return;
    if (region.kind === 'start') {
      this.goHome();
      return;
    }
    if (region.kind === 'career') {
      this.view.set('career');
      this.scrollToTop();
      return;
    }
    if (region.kind === 'enterprise-hub') {
      this.goToEnterpriseHub();
      return;
    }

    this.activeRegionId.set(region.id);
    const savedChoice = this.choices()[region.id];
    this.selectedOption.set(typeof savedChoice === 'number' ? savedChoice : null);
    this.questPhase.set(typeof savedChoice === 'number' ? 'result' : 'dialogue');
    this.dialogueIndex.set(0);
    this.newlyUnlockedCapabilities.set([]);
    if (region.kind === 'specialization' || region.kind === 'enterprise-contract') {
      this.selectedTrack.set(region.id);
      this.activeCareerId.set(null);
    }
    this.view.set('quest');
    this.scrollToTop();
  }

  advanceDialogue(): void {
    const region = this.activeRegion();
    if (!region) return;
    if (this.dialogueIndex() < region.dialogue.length - 1) {
      this.dialogueIndex.update((index) => index + 1);
      return;
    }
    this.questPhase.set('choice');
  }

  skipToChoices(): void {
    this.questPhase.set('choice');
  }

  chooseQuestOption(index: number): void {
    const region = this.activeRegion();
    const option = region?.options[index];
    if (!region || !option || this.completedRegions().includes(region.id)) return;

    const snapshot: RoundSnapshot = {
      regionId: region.id,
      acquiredSkills: this.acquiredSkills(),
      completedRegions: this.completedRegions(),
      choices: this.choices(),
      selectedTrack: this.selectedTrack(),
    };
    const capabilitiesBefore = new Set(
      this.unlockedCapabilities().map((capability) => capability.id),
    );
    const nextSkills = [...new Set([...this.acquiredSkills(), ...option.rewards])];
    const nextSkillSet = new Set(nextSkills);
    const newCapabilities = this.capabilities
      .filter(
        (capability) =>
          !capabilitiesBefore.has(capability.id) &&
          this.capabilityRequirementsMet(capability, nextSkillSet),
      )
      .map((capability) => capability.id);

    this.lastRound.set(snapshot);
    this.acquiredSkills.set(nextSkills);
    this.completedRegions.update((completed) => [...new Set([...completed, region.id])]);
    this.choices.update((choices) => ({ ...choices, [region.id]: index }));
    if (region.kind === 'specialization' || region.kind === 'enterprise-contract')
      this.selectedTrack.set(region.id);
    this.selectedOption.set(index);
    this.newlyUnlockedCapabilities.set(newCapabilities);
    this.questPhase.set('result');
    this.scrollToTop();
  }

  goToNextStage(): void {
    const region = this.activeRegion();
    if (!region) return;
    if (region.kind === 'specialization') {
      this.showCareer(region.id);
      return;
    }
    if (region.kind === 'enterprise-contract') {
      this.goToEnterpriseHub();
      return;
    }
    const next = this.nextRegionFor(region);
    if (next) this.openRegion(next);
    else this.goToMap();
  }

  undoLastRound(): void {
    const snapshot = this.lastRound();
    if (!snapshot) return;
    this.acquiredSkills.set(snapshot.acquiredSkills);
    this.completedRegions.set(snapshot.completedRegions);
    this.choices.set(snapshot.choices);
    this.selectedTrack.set(snapshot.selectedTrack);
    this.activeCareerId.set(null);
    this.activeRegionId.set(snapshot.regionId);
    this.selectedOption.set(null);
    this.newlyUnlockedCapabilities.set([]);
    this.dialogueIndex.set(0);
    this.lastRound.set(null);
    this.questPhase.set('dialogue');
    this.view.set('quest');
    this.scrollToTop();
  }

  showCareer(regionId: string, careerId?: string): void {
    const unlocked = this.unlockedCareers();
    const career =
      unlocked.find((profile) => profile.id === careerId) ??
      unlocked.find((profile) => profile.regionId === regionId) ??
      unlocked[0];
    if (!career) return;
    const enteringCareerPage = this.view() !== 'career';
    this.selectedTrack.set(career.regionId);
    this.activeCareerId.set(career.id);
    this.view.set('career');
    if (enteringCareerPage) this.scrollToTop();
  }

  resetAdventure(destination: 'intro' | 'map' = 'intro'): void {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        destination === 'map'
          ? '確定要清除所有技能與任務進度，並從大地圖的智慧醫療迎新站重新開始嗎？'
          : '確定要清除所有技能與任務進度，重生回 TMU AI跨域星引學院入口嗎？',
      )
    )
      return;
    this.view.set(destination);
    this.acquiredSkills.set([]);
    this.completedRegions.set(['prompt-academy']);
    this.choices.set({});
    this.activeRegionId.set(null);
    this.selectedOption.set(null);
    this.selectedTrack.set(null);
    this.activeCareerId.set(null);
    this.lastRound.set(null);
    this.collectionOpen.set(false);
    this.settingsOpen.set(false);
    this.shareStatus.set(null);
    this.newlyUnlockedCapabilities.set([]);
    this.dialogueIndex.set(0);
    if (typeof localStorage !== 'undefined') localStorage.removeItem(this.storageKey);
    this.scrollToTop();
  }

  nextActionLabel(region: WorldRegion): string {
    if (region.kind === 'specialization') return '前往職業覺醒';
    if (region.kind === 'enterprise-contract') return '返回企業委託所';
    const next = this.nextRegionFor(region);
    return next ? `直接前往：${next.name}` : '繼續旅程';
  }

  nextRegionFor(region: WorldRegion): WorldRegion | null {
    const fixedNext: Readonly<Record<string, string>> = {
      'code-workshop': 'data-archive',
      'data-archive': 'ml-forest',
    };
    const nextId = fixedNext[region.id];
    return this.regions.find((candidate) => candidate.id === nextId) ?? null;
  }

  regionStatus(region: WorldRegion): 'completed' | 'open' | 'locked' {
    if (region.kind === 'enterprise-hub') {
      const contracts = region.contractRegionIds ?? [];
      if (contracts.length && contracts.every((id) => this.completedRegions().includes(id)))
        return 'completed';
      return this.hasSpecialization() ? 'open' : 'locked';
    }
    if (this.completedRegions().includes(region.id)) return 'completed';
    if (region.kind === 'career')
      return this.hasSpecialization() && this.unlockedCareers().length ? 'open' : 'locked';
    if (region.kind === 'enterprise-contract') return this.hasSpecialization() ? 'open' : 'locked';
    return region.requiresRegions.every((regionId) => this.completedRegions().includes(regionId))
      ? 'open'
      : 'locked';
  }

  regionStatusLabel(region: WorldRegion): string {
    const status = this.regionStatus(region);
    if (region.kind === 'start') return '返回學院首頁';
    if (region.kind === 'enterprise-hub') {
      const completed = this.completedEnterpriseContracts().length;
      if (status === 'completed')
        return `${completed} / ${this.enterpriseContracts.length} 委託完成`;
      if (status === 'open') return `${completed} / ${this.enterpriseContracts.length} 選修委託`;
      return '完成任一專精後開放';
    }
    if (region.kind === 'enterprise-contract')
      return status === 'completed' ? '委託完成' : status === 'open' ? '可接受委託' : '尚未開放';
    if (status === 'completed') return '探索完成';
    if (status === 'open') {
      if (this.isRecommendedRegion(region))
        return region.kind === 'career' ? '前往職業覺醒' : '建議下一站';
      return region.kind === 'career' ? '查看已覺醒職業' : '可接受任務';
    }
    return '迷霧籠罩';
  }

  isRecommendedRegion(region: WorldRegion): boolean {
    return this.regionStatus(region) === 'open' && this.recommendedRegionId() === region.id;
  }

  branchProgress(branchId: BranchId): number {
    return this.skills.filter(
      (skill) => skill.branch === branchId && this.acquiredSkillSet().has(skill.id),
    ).length;
  }
  branchSkills(branchId: BranchId): readonly SkillItem[] {
    return this.skills.filter(
      (skill) => skill.branch === branchId && this.acquiredSkillSet().has(skill.id),
    );
  }
  collectionBranchSkills(branchId: BranchId): readonly SkillItem[] {
    if (!this.previewRewards()) return this.branchSkills(branchId);
    return this.skills.filter((skill) => skill.branch === branchId);
  }
  skillIsAcquired(skillId: string): boolean {
    return this.acquiredSkillSet().has(skillId);
  }
  skillById(skillId: string): SkillItem | null {
    return this.skills.find((skill) => skill.id === skillId) ?? null;
  }
  branchForSkill(skillId: string): SkillBranch | null {
    const skill = this.skillById(skillId);
    return this.branches.find((branch) => branch.id === skill?.branch) ?? null;
  }
  capabilityById(capabilityId: string) {
    return this.capabilities.find((capability) => capability.id === capabilityId) ?? null;
  }
  careerIsUnlocked(career: CareerProfile): boolean {
    return this.unlockedCareers().some((profile) => profile.id === career.id);
  }
  careerForRegion(regionId: string): CareerProfile | null {
    return this.careers.find((career) => career.regionId === regionId) ?? null;
  }
  canUndoRegion(regionId: string): boolean {
    return this.lastRound()?.regionId === regionId;
  }
  chosenOptionFor(regionId: string) {
    const region = this.regions.find((item) => item.id === regionId);
    const index = this.choices()[regionId];
    return region && typeof index === 'number' ? (region.options[index] ?? null) : null;
  }
  resultSkillIds(): readonly string[] {
    const rewards = this.selectedQuestOption()?.rewards ?? [];
    return [...rewards, ...this.acquiredSkills().filter((skillId) => !rewards.includes(skillId))];
  }
  isResultSkillReward(skillId: string): boolean {
    return this.selectedQuestOption()?.rewards.includes(skillId) ?? false;
  }
  isResultSkillNew(skillId: string): boolean {
    if (!this.isResultSkillReward(skillId)) return false;
    const snapshot = this.lastRound();
    if (!snapshot || snapshot.regionId !== this.activeRegionId()) return true;
    return !snapshot.acquiredSkills.includes(skillId);
  }
  skillStatBonuses(skillId: string): readonly SkillStatBonus[] {
    return SKILL_STAT_BONUSES[skillId] ?? [];
  }
  statAxisName(axisId: SkillStatBonus['axis']): string {
    return this.statAxes.find((axis) => axis.id === axisId)?.shortName ?? axisId;
  }
  async shareAdventureProfile(): Promise<void> {
    if (this.sharingProfile()) return;
    this.sharingProfile.set(true);
    this.shareStatus.set('正在製作冒險履歷圖…');
    try {
      const result = await this.profileShare.shareOrDownload(this.adventureShareProfile());
      this.shareStatus.set(
        result === 'shared'
          ? '冒險履歷已送出！'
          : result === 'downloaded'
            ? '這個瀏覽器不支援圖片分享，已改為下載 PNG。'
            : '已取消分享。',
      );
    } catch {
      this.shareStatus.set('無法製作分享圖，請稍後再試。');
    } finally {
      this.sharingProfile.set(false);
    }
  }

  downloadAdventureProfile(): void {
    try {
      this.profileShare.download(this.adventureShareProfile());
      this.shareStatus.set('冒險履歷圖已下載為 PNG。');
    } catch {
      this.shareStatus.set('無法下載履歷圖，請稍後再試。');
    }
  }

  private adventureShareProfile(): AdventureShareProfile {
    const primaryCareer = this.activeCareer();
    const orderedCareers = primaryCareer
      ? [
          primaryCareer,
          ...this.unlockedCareers().filter((career) => career.id !== primaryCareer.id),
        ]
      : this.unlockedCareers();
    return {
      careers: orderedCareers.map((career) => ({
        name: career.className,
        realWorldTitle: career.realWorldTitle,
      })),
      skills: this.acquiredSkills()
        .map((skillId) => this.skillById(skillId)?.name)
        .filter((name): name is string => Boolean(name)),
      stats: this.skillProfileScores(),
      level: this.playerLevel(),
    };
  }

  private capabilityRequirementsMet(
    capability: Capability,
    skillSet: ReadonlySet<string>,
  ): boolean {
    return (
      capability.requires.every((skillId) => skillSet.has(skillId)) &&
      (!capability.requiresAny?.length ||
        capability.requiresAny.some((skillId) => skillSet.has(skillId)))
    );
  }

  private careerRequirementsMet(
    career: CareerProfile,
    skillSet: ReadonlySet<string>,
    completedRegions: ReadonlySet<string>,
  ): boolean {
    if (
      ![career.regionId, ...(career.alternateRegionIds ?? [])].some((regionId) =>
        completedRegions.has(regionId),
      )
    )
      return false;
    return [career.requiresSkills, ...(career.alternateSkillRecipes ?? [])].some((recipe) =>
      recipe.every((skillId) => skillSet.has(skillId)),
    );
  }

  private closeOverlays(): void {
    this.collectionOpen.set(false);
    this.settingsOpen.set(false);
  }

  private restoreState(): void {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return;
    try {
      const state = JSON.parse(raw) as Partial<SavedGameState>;
      const validRegions = new Set(this.regions.map((region) => region.id));
      const restoredCompletedRegions = [
        ...new Set([
          'prompt-academy',
          ...(Array.isArray(state.completedRegions)
            ? state.completedRegions.filter((id) => validRegions.has(id))
            : []),
        ]),
      ];
      const restoredChoices =
        state.choices && typeof state.choices === 'object' ? state.choices : {};
      this.completedRegions.set(restoredCompletedRegions);
      this.choices.set(restoredChoices);
      this.acquiredSkills.set(
        this.restoreRewardSkills(
          Array.isArray(state.acquiredSkills) ? state.acquiredSkills : [],
          restoredCompletedRegions,
          restoredChoices,
        ),
      );
      if (
        typeof state.selectedTrack === 'string' &&
        this.careers.some((career) => career.regionId === state.selectedTrack)
      )
        this.selectedTrack.set(state.selectedTrack);
      if (typeof state.previewRewards === 'boolean') this.previewRewards.set(state.previewRewards);
      if (state.lastRound && validRegions.has(state.lastRound.regionId))
        this.lastRound.set({
          ...state.lastRound,
          acquiredSkills: this.restoreRewardSkills(
            state.lastRound.acquiredSkills,
            state.lastRound.completedRegions,
            state.lastRound.choices,
          ),
        });
      if (
        state.view === 'career' ||
        state.view === 'enterprise' ||
        state.view === 'map' ||
        state.view === 'intro'
      )
        this.view.set(state.view);
    } catch {
      localStorage.removeItem(this.storageKey);
    }
  }

  private restoreRewardSkills(
    skillIds: readonly string[],
    completedRegionIds: readonly string[],
    choices: Readonly<Record<string, number>>,
  ): readonly string[] {
    const validSkills = new Set(this.skills.map((skill) => skill.id));
    const restoredSkills = new Set(skillIds.filter((id) => validSkills.has(id)));
    const completedRegions = new Set(completedRegionIds);
    for (const region of this.regions) {
      if (!completedRegions.has(region.id)) continue;
      const optionIndex = choices[region.id];
      if (!Number.isInteger(optionIndex)) continue;
      for (const reward of region.options[optionIndex]?.rewards ?? []) {
        if (validSkills.has(reward)) restoredSkills.add(reward);
      }
    }
    return [...restoredSkills];
  }

  private scrollToTop(): void {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
