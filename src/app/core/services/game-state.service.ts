import { computed, effect, Injectable, signal } from '@angular/core';
import { BRANCHES, CAPABILITIES, CAREERS, REGIONS, SKILLS } from '../data/game.data';
import {
  BranchId,
  GameView,
  RoundSnapshot,
  SavedGameState,
  SkillBranch,
  SkillItem,
  WorldRegion,
} from '../models/game.models';

@Injectable({ providedIn: 'root' })
export class GameStateService {
  private readonly storageKey = 'ai-academy-adventure-v4';

  readonly branches = BRANCHES;
  readonly skills = SKILLS;
  readonly capabilities = CAPABILITIES;
  readonly regions = REGIONS;
  readonly careers = CAREERS;

  readonly view = signal<GameView>('intro');
  readonly acquiredSkills = signal<readonly string[]>(['prompt']);
  readonly completedRegions = signal<readonly string[]>(['prompt-academy']);
  readonly choices = signal<Readonly<Record<string, number>>>({});
  readonly activeRegionId = signal<string | null>(null);
  readonly questPhase = signal<'dialogue' | 'choice' | 'result'>('dialogue');
  readonly dialogueIndex = signal(0);
  readonly selectedOption = signal<number | null>(null);
  readonly newlyUnlockedCapabilities = signal<readonly string[]>([]);
  readonly selectedTrack = signal<string | null>(null);
  readonly lastRound = signal<RoundSnapshot | null>(null);
  readonly previewRewards = signal(false);
  readonly collectionOpen = signal(false);
  readonly settingsOpen = signal(false);

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
  readonly unlockedCapabilities = computed(() =>
    this.capabilities.filter((capability) =>
      capability.requires.every((skillId) => this.acquiredSkillSet().has(skillId)),
    ),
  );
  readonly playerLevel = computed(() => Math.max(1, this.completedRegions().length));
  readonly hasSpecialization = computed(() =>
    this.regions.some(
      (region) => region.kind === 'specialization' && this.completedRegions().includes(region.id),
    ),
  );
  readonly progressPercent = computed(() => {
    const quests = this.regions.filter(
      (region) => region.kind === 'main' || region.kind === 'specialization',
    );
    return Math.round(
      (quests.filter((region) => this.completedRegions().includes(region.id)).length /
        quests.length) *
        100,
    );
  });
  readonly activeCareer = computed(
    () =>
      this.careers.find((career) => career.regionId === this.selectedTrack()) ??
      this.careers.find((career) => this.completedRegions().includes(career.regionId)) ??
      this.careers[0],
  );
  readonly currentClassName = computed(() => {
    const selectedCareer = this.careers.find(
      (career) =>
        career.regionId === this.selectedTrack() &&
        this.completedRegions().includes(career.regionId),
    );
    if (selectedCareer) return selectedCareer.className;
    const completedCareer = this.careers.find((career) =>
      this.completedRegions().includes(career.regionId),
    );
    if (completedCareer) return completedCareer.className;
    if (this.branchProgress('ai') >= 2 && this.branchProgress('programming') >= 1)
      return '魔型工程師';
    if (this.branchProgress('data') >= 2) return '資料鍊金師';
    return '星引學徒';
  });
  readonly nextRegion = computed(() => {
    const region = this.activeRegion();
    return region ? this.nextRegionFor(region) : null;
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
    const nextMain = this.regions.find(
      (region) => region.kind === 'main' && !this.completedRegions().includes(region.id),
    );
    if (nextMain && this.regionStatus(nextMain) === 'open') this.openRegion(nextMain);
    else this.goToMap();
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
      this.openCollection();
      return;
    }
    if (region.kind === 'career') {
      this.view.set('career');
      this.scrollToTop();
      return;
    }

    this.activeRegionId.set(region.id);
    const savedChoice = this.choices()[region.id];
    this.selectedOption.set(typeof savedChoice === 'number' ? savedChoice : null);
    this.questPhase.set(typeof savedChoice === 'number' ? 'result' : 'dialogue');
    this.dialogueIndex.set(0);
    this.newlyUnlockedCapabilities.set([]);
    if (region.kind === 'specialization') this.selectedTrack.set(region.id);
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
          capability.requires.every((skillId) => nextSkillSet.has(skillId)),
      )
      .map((capability) => capability.id);

    this.lastRound.set(snapshot);
    this.acquiredSkills.set(nextSkills);
    this.completedRegions.update((completed) => [...new Set([...completed, region.id])]);
    this.choices.update((choices) => ({ ...choices, [region.id]: index }));
    if (region.kind === 'specialization') this.selectedTrack.set(region.id);
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
    this.activeRegionId.set(snapshot.regionId);
    this.selectedOption.set(null);
    this.newlyUnlockedCapabilities.set([]);
    this.dialogueIndex.set(0);
    this.lastRound.set(null);
    this.questPhase.set('dialogue');
    this.view.set('quest');
    this.scrollToTop();
  }

  showCareer(regionId: string): void {
    if (!this.completedRegions().includes(regionId)) return;
    this.selectedTrack.set(regionId);
    this.view.set('career');
    this.scrollToTop();
  }

  resetAdventure(): void {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('確定要清除所有技能與任務進度，重生回星引學院入口嗎？')
    )
      return;
    this.view.set('intro');
    this.acquiredSkills.set(['prompt']);
    this.completedRegions.set(['prompt-academy']);
    this.choices.set({});
    this.activeRegionId.set(null);
    this.selectedOption.set(null);
    this.selectedTrack.set(null);
    this.lastRound.set(null);
    this.collectionOpen.set(false);
    this.settingsOpen.set(false);
    this.newlyUnlockedCapabilities.set([]);
    this.dialogueIndex.set(0);
    if (typeof localStorage !== 'undefined') localStorage.removeItem(this.storageKey);
    this.scrollToTop();
  }

  nextActionLabel(region: WorldRegion): string {
    if (region.kind === 'specialization') return '前往職業覺醒';
    const next = this.nextRegionFor(region);
    return next ? `直接前往：${next.name}` : '繼續旅程';
  }

  nextRegionFor(region: WorldRegion): WorldRegion | null {
    const fixedNext: Readonly<Record<string, string>> = {
      'code-workshop': 'data-archive',
      'data-archive': 'ml-forest',
    };
    let nextId = fixedNext[region.id];
    if (region.id === 'ml-forest') {
      const chosenIndex = this.choices()[region.id] ?? this.selectedOption() ?? 0;
      nextId = ['vision-observatory', 'medical-observatory', 'language-library'][chosenIndex];
    }
    return this.regions.find((candidate) => candidate.id === nextId) ?? null;
  }

  regionStatus(region: WorldRegion): 'completed' | 'open' | 'locked' {
    if (this.completedRegions().includes(region.id)) return 'completed';
    if (region.kind === 'career') return this.hasSpecialization() ? 'open' : 'locked';
    return region.requiresRegions.every((regionId) => this.completedRegions().includes(regionId))
      ? 'open'
      : 'locked';
  }

  regionStatusLabel(region: WorldRegion): string {
    const status = this.regionStatus(region);
    if (status === 'completed') return '探索完成';
    if (status === 'open') return region.kind === 'career' ? '查看職涯' : '可接受任務';
    return '迷霧籠罩';
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
  trackIsComplete(regionId: string): boolean {
    return this.completedRegions().includes(regionId);
  }
  canUndoRegion(regionId: string): boolean {
    return this.lastRound()?.regionId === regionId;
  }
  chosenOptionFor(regionId: string) {
    const region = this.regions.find((item) => item.id === regionId);
    const index = this.choices()[regionId];
    return region && typeof index === 'number' ? (region.options[index] ?? null) : null;
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
      const validSkills = new Set(this.skills.map((skill) => skill.id));
      const validRegions = new Set(this.regions.map((region) => region.id));
      if (Array.isArray(state.acquiredSkills))
        this.acquiredSkills.set([
          ...new Set(['prompt', ...state.acquiredSkills.filter((id) => validSkills.has(id))]),
        ]);
      if (Array.isArray(state.completedRegions))
        this.completedRegions.set([
          ...new Set([
            'prompt-academy',
            ...state.completedRegions.filter((id) => validRegions.has(id)),
          ]),
        ]);
      if (state.choices && typeof state.choices === 'object') this.choices.set(state.choices);
      if (
        typeof state.selectedTrack === 'string' &&
        this.careers.some((career) => career.regionId === state.selectedTrack)
      )
        this.selectedTrack.set(state.selectedTrack);
      if (typeof state.previewRewards === 'boolean') this.previewRewards.set(state.previewRewards);
      if (state.lastRound && validRegions.has(state.lastRound.regionId))
        this.lastRound.set(state.lastRound);
      if (state.view === 'career' || state.view === 'map' || state.view === 'intro')
        this.view.set(state.view);
    } catch {
      localStorage.removeItem(this.storageKey);
    }
  }

  private scrollToTop(): void {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
