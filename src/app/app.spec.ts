import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { App } from './app';
import { AssetPreloadService } from './core/services/asset-preload.service';
import { GameStateService } from './core/services/game-state.service';
import { ProfileShareService } from './core/services/profile-share.service';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  function click(fixture: ComponentFixture<App>, selector: string): void {
    const page = fixture.nativeElement as HTMLElement;
    const button = page.querySelector<HTMLButtonElement>(selector);
    expect(button, `Expected button ${selector}`).toBeTruthy();
    button?.click();
    fixture.detectChanges();
  }

  function reachFirstChoice(fixture: ComponentFixture<App>): HTMLElement {
    click(fixture, '.academy-hero .primary-cta');
    click(fixture, '.region-node.is-recommended');
    click(fixture, '.dialogue-box .primary-cta');
    click(fixture, '.dialogue-box .primary-cta');
    click(fixture, '.dialogue-box .primary-cta');
    return fixture.nativeElement as HTMLElement;
  }

  it('should create the component-based app', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-game-header')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-intro')).toBeTruthy();
  });

  it('should preload scenes and NPCs before career images while the browser is idle', () => {
    type TestIdleDeadline = { didTimeout: boolean; timeRemaining: () => number };
    const idleCallbacks: Array<(deadline: TestIdleDeadline) => void> = [];
    const requestedImages: string[] = [];

    vi.stubGlobal(
      'requestIdleCallback',
      (callback: (deadline: TestIdleDeadline) => void): number => {
        idleCallbacks.push(callback);
        return idleCallbacks.length;
      },
    );
    vi.stubGlobal(
      'Image',
      class {
        decoding = '';
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        set src(value: string) {
          requestedImages.push(value);
          this.onload?.();
        }
      },
    );

    try {
      TestBed.inject(AssetPreloadService).start();
      while (idleCallbacks.length) {
        idleCallbacks.shift()?.({ didTimeout: false, timeRemaining: () => 50 });
      }

      const firstCareer = requestedImages.findIndex((url) => url.includes('/assets/careers/'));
      const lastSceneOrNpc = requestedImages.reduce(
        (lastIndex, url, index) =>
          url.includes('/assets/scenes/') || url.includes('/assets/characters/')
            ? index
            : lastIndex,
        -1,
      );
      expect(firstCareer).toBeGreaterThan(lastSceneOrNpc);
      expect(requestedImages.some((url) => url.endsWith('/assets/scenes/ml-forest.png'))).toBe(
        true,
      );
      expect(
        requestedImages.some((url) => url.endsWith('/assets/characters/mira-engineer.png')),
      ).toBe(true);
      expect(
        requestedImages.some((url) => url.endsWith('/assets/careers/model-engineer.jpg')),
      ).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('should introduce the health AI adventure and let players preview named classes', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('h1')?.textContent).toContain('智慧醫療的未知領域');
    expect(page.textContent).toContain('TMU AI跨域星引學院');
    expect(page.textContent).toContain('長照');
    expect(page.textContent).toContain('照護紀錄');
    expect(page.textContent).toContain('精準醫療');
    expect(page.textContent).toContain('腦波');
    expect(page.textContent).toContain('新藥探索');
    expect(page.textContent).toContain('技能組合職業');
    expect(page.textContent).toContain('微生物菌相');
    expect(page.textContent).toContain('質譜');
    expect(page.querySelectorAll('.compass-grid article')).toHaveLength(9);
    expect(page.textContent).toContain('智慧醫療產品落地');
    expect(page.textContent).toContain('跨域協作與產業導入');
    expect(page.textContent).toContain('選修支線');
    expect(page.textContent).toContain('不影響職業覺醒');
    expect(page.querySelector('.academy-provider span')?.textContent).toBe('單位');
    expect(page.querySelector('.academy-provider')?.textContent).toContain(
      '臺北醫學大學 智慧醫療跨領域學士學位學程',
    );
    expect(page.querySelector('.academy-disclaimer')?.textContent).toContain(
      '無法涵蓋所有專業、研究方向與職涯可能',
    );
    expect(page.querySelector('.academy-disclaimer strong')?.textContent).toBe('內容聲明');
    expect(page.querySelectorAll('.class-roster button')).toHaveLength(11);
    expect(page.textContent).toContain('精準醫療射手');
    expect(page.textContent).toContain('醫療照護視覺獵人');

    const precisionArcher = [
      ...page.querySelectorAll<HTMLButtonElement>('.class-roster button'),
    ].find((button) => button.textContent?.includes('精準醫療射手'))!;
    precisionArcher.click();
    fixture.detectChanges();
    expect(page.querySelector('.teaser-career-preview h3')?.textContent).toContain('精準醫療射手');
    expect(page.querySelector('.teaser-career-preview img')?.getAttribute('src')).toContain(
      'precision-archer.jpg',
    );
  });

  it('should enter the map before the player opens the welcome quest', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    click(fixture, '.academy-hero .primary-cta');
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('app-world-map')).toBeTruthy();
    expect(page.querySelector('app-quest')).toBeFalsy();
    expect(page.querySelector('.region-node.is-recommended')?.textContent).toContain(
      '智慧醫療迎新站',
    );
    click(fixture, '.region-node.is-recommended');

    expect(page.querySelector('app-quest')).toBeTruthy();
    expect(page.querySelector('.quest-page')?.getAttribute('style')).toContain('code-workshop.png');
    expect(page.querySelector('.speaker-portrait img')?.getAttribute('src')).toContain(
      'mira-engineer.png',
    );
    expect(page.textContent).toContain('AI 可以支援健康溝通與長期照護');
  });

  it('should begin without granting Prompt or any other skill', () => {
    const game = TestBed.inject(GameStateService);

    expect(game.acquiredSkills()).toEqual([]);
    expect(game.skillById('prompt')).toBeTruthy();
  });

  it('should show four broad directions and explain the acquired skills after choosing', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = reachFirstChoice(fixture);
    const welcomeQuest = TestBed.inject(GameStateService).regions.find(
      (region) => region.id === 'code-workshop',
    );

    expect(welcomeQuest?.dialogue[2].text).toContain('還不需要很會寫程式');
    const choices = page.querySelectorAll<HTMLButtonElement>('.quest-choice');
    expect(choices).toHaveLength(4);
    expect(page.querySelector('.choice-speaker-portrait img')?.getAttribute('src')).toContain(
      'mira-engineer.png',
    );
    expect(page.querySelector('.choice-dialogue-box')?.textContent).toContain('展開第一段探索');
    expect(choices[0].textContent).toContain('照護與健康溝通');
    expect(choices[1].textContent).toContain('診斷與生命訊號');
    expect(choices[2].textContent).toContain('分子研究與新藥探索');
    expect(choices[3].textContent).toContain('食品、營養與族群健康');
    expect(choices[3].querySelector('.choice-letter')?.textContent).toBe('D');
    expect(page.querySelector('.reward-preview')?.textContent).toContain('選擇後揭曉技能');

    choices[0].click();
    fixture.detectChanges();

    expect(page.querySelector('.result-scene')?.textContent).toContain('衛教轉譯');
    expect(page.querySelector('.result-scene')?.textContent).toContain('智慧長照觀察');
    expect(page.querySelector('.result-scene')?.textContent).toContain('數位工具運用');
    expect(page.querySelector('.result-scene')?.textContent).toContain('這條路需要的技能');
    expect(page.querySelector('.result-question-recap')?.textContent).toContain(
      '你想從哪一種智慧醫療任務開始',
    );
    expect(page.querySelectorAll('.result-skill-hand .reward-card')).toHaveLength(3);
    expect(page.querySelectorAll('.result-skill-hand .reward-card.is-new')).toHaveLength(3);
    expect(page.querySelector('.return-map-primary')?.textContent).toContain('返回大地圖');
    expect(page.querySelector('.undo-button')).toBeTruthy();
    expect(page.querySelector('.rebirth-button')).toBeTruthy();
  });

  it('should use a monochrome forecast sigil for prediction and early warning', () => {
    const game = TestBed.inject(GameStateService);
    const methodForest = game.regions.find((region) => region.id === 'ml-forest');
    const predictionOption = methodForest?.options.find(
      (option) => option.direction === '預測與預警',
    );

    expect(predictionOption?.icon).toBe('⌁');
  });

  it('should return to the map and highlight the next quest', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = reachFirstChoice(fixture);
    page.querySelectorAll<HTMLButtonElement>('.quest-choice')[1].click();
    fixture.detectChanges();

    click(fixture, '.return-map-primary');

    expect(page.querySelector('.world-board')).toBeTruthy();
    expect(page.querySelector('.region-node.is-recommended')?.textContent).toContain(
      '健康資料萬象庫',
    );
    click(fixture, '.region-node.is-recommended');

    expect(page.querySelector('.quest-topline')?.textContent).toContain('健康資料萬象庫');
    expect(page.querySelector('.speaker-portrait img')?.getAttribute('src')).toContain(
      'iris-archivist.png',
    );
    expect(page.textContent).toContain('病歷與護理紀錄是文字和表格');
  });

  it('should place new cards first while retaining the previous hand', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = reachFirstChoice(fixture);
    page.querySelectorAll<HTMLButtonElement>('.quest-choice')[0].click();
    fixture.detectChanges();
    click(fixture, '.return-map-primary');
    click(fixture, '.region-node.is-recommended');
    click(fixture, '.skip-dialogue');
    page.querySelectorAll<HTMLButtonElement>('.quest-choice')[0].click();
    fixture.detectChanges();

    const cards = page.querySelectorAll<HTMLElement>('.result-skill-hand .reward-card');
    expect(cards).toHaveLength(7);
    expect(cards[0].classList).toContain('is-new');
    expect(cards[1].classList).toContain('is-new');
    expect(cards[2].classList).toContain('is-new');
    expect(cards[3].classList).toContain('is-new');
    expect(cards[1].textContent).toContain('資料處理');
    expect(cards[2].textContent).toContain('資料清理');
    expect(cards[3].textContent).toContain('流程設計與自動化');
    expect(cards[4].textContent).toContain('衛教轉譯');
    expect(cards[5].textContent).toContain('智慧長照觀察');
    expect(cards[6].textContent).toContain('數位工具運用');
  });

  it('should undo only the latest completed round', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = reachFirstChoice(fixture);
    page.querySelectorAll<HTMLButtonElement>('.quest-choice')[0].click();
    fixture.detectChanges();
    click(fixture, '.result-actions .undo-button');

    expect(page.querySelector('.dialogue-box')).toBeTruthy();
    expect(page.querySelector('.undo-button')).toBeFalsy();
    expect(page.textContent).not.toContain('技能卡已收入卡冊');
  });

  it('should optionally preview skill rewards from settings', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    page.querySelectorAll<HTMLButtonElement>('.header-actions button')[1].click();
    fixture.detectChanges();
    click(fixture, '.toggle');
    click(fixture, '.settings-modal header > button');
    click(fixture, '.academy-hero .primary-cta');
    click(fixture, '.region-node.is-recommended');
    click(fixture, '.skip-dialogue');

    expect(page.querySelector('.reward-preview')?.textContent).toContain('衛教轉譯');
    expect(page.querySelector('.reward-preview')?.textContent).not.toContain('選擇後揭曉技能');
  });

  it('should preview every unacquired codex card in a muted state only when hints are on', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const game = TestBed.inject(GameStateService);
    const page = fixture.nativeElement as HTMLElement;

    game.openCollection();
    fixture.detectChanges();
    expect(page.querySelectorAll('.shelf-skill-entry')).toHaveLength(0);

    game.closeCollection();
    game.toggleRewardPreview();
    game.openCollection();
    fixture.detectChanges();

    expect(page.querySelectorAll('.shelf-skill-entry')).toHaveLength(game.skills.length);
    expect(page.querySelectorAll('.shelf-skill-entry.is-preview-locked')).toHaveLength(
      game.skills.length,
    );
    expect(page.textContent).toContain('技能提示中');
  });

  it('should light the codex category cover after its first skill is acquired', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const game = TestBed.inject(GameStateService);
    const page = fixture.nativeElement as HTMLElement;

    game.acquiredSkills.set(['digital-tools']);
    game.openCollection();
    fixture.detectChanges();

    expect(page.querySelectorAll('.branch-shelf.has-skills')).toHaveLength(1);
    expect(page.querySelector('.branch-shelf.has-skills .branch-cover img')).toBeTruthy();
  });

  it('should expose the map as the navigation hub', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    click(fixture, '.academy-hero .primary-cta');
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('app-world-map')).toBeTruthy();
    expect(page.querySelector('.region-node.is-open')?.textContent).toContain('智慧醫療迎新站');
    expect(page.textContent).toContain('智慧醫療方法森林');

    const regionNames = Array.from(page.querySelectorAll('.region-label strong'), (node) =>
      node.textContent?.trim(),
    );
    expect(regionNames).toEqual([
      '智慧醫療門',
      '智慧醫療迎新站',
      '健康資料萬象庫',
      '智慧醫療方法森林',
      '生命訊號觀測台',
      '照護語言秘典城',
      '分子星脈研究站',
      '食養安全守望塔',
      '星橋企業委託所',
      '職涯星冠城',
    ]);
    expect(
      Array.from(page.querySelectorAll('.mobile-map-stage'), (node) => node.textContent?.trim()),
    ).toEqual([
      '起點 · 學院入口',
      '主線任務 · 依序探索',
      '專精分支 · 可自由選擇',
      '終章 · 企業委託與職業覺醒',
    ]);
  });

  it('should use the prologue node to return home instead of opening the codex', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    click(fixture, '.academy-hero .primary-cta');
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('.region-node.is-start')?.textContent).toContain('返回學院首頁');
    click(fixture, '.region-node.is-start');

    expect(page.querySelector('app-intro')).toBeTruthy();
    expect(page.querySelector('.collection-drawer')).toBeFalsy();
  });

  it('should reset progress from the map and remain on the map', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const game = TestBed.inject(GameStateService);
    game.acquiredSkills.set(['digital-tools', 'workflow']);
    game.completedRegions.set(['prompt-academy', 'code-workshop', 'data-archive']);
    game.choices.set({ 'code-workshop': 0, 'data-archive': 0 });
    game.goToMap();
    fixture.detectChanges();

    click(fixture, '.map-rebirth-button');
    const page = fixture.nativeElement as HTMLElement;

    expect(game.view()).toBe('map');
    expect(game.acquiredSkills()).toEqual([]);
    expect(game.completedRegions()).toEqual(['prompt-academy']);
    expect(game.choices()).toEqual({});
    expect(game.recommendedRegionId()).toBe('code-workshop');
    expect(page.querySelector('app-world-map')).toBeTruthy();
    expect(page.querySelector('.region-node.is-recommended')?.textContent).toContain(
      '智慧醫療迎新站',
    );
  });

  it('should replace the empty first-skill placeholder with adventure progress', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const game = TestBed.inject(GameStateService);
    const page = fixture.nativeElement as HTMLElement;

    game.acquiredSkills.set(['biomedical-data', 'data-literacy']);
    game.completedRegions.set(['prompt-academy', 'code-workshop']);
    fixture.detectChanges();

    expect(page.querySelector('.guide-card-preview.is-progress')?.textContent).toContain(
      '已收集 2 張技能卡',
    );
    expect(page.querySelector('.guide-card-preview.is-progress')?.textContent).toContain('LV.2');
    expect(page.querySelector('.guide-card-preview.is-unclaimed')).toBeFalsy();
  });

  it('should make the third quest about AI methods and open every specialization', () => {
    const game = TestBed.inject(GameStateService);
    const forest = game.regions.find((region) => region.id === 'ml-forest');
    expect(forest).toBeTruthy();

    expect(forest?.options.map((option) => option.direction)).toEqual([
      '辨識與分群',
      '預測與預警',
      '生成與溝通',
      '整合與決策支援',
    ]);
    expect(forest?.question).toContain('讓 AI 幫忙完成');
    expect(game.nextRegionFor(forest!)).toBeNull();

    const completed = ['prompt-academy', 'code-workshop', 'data-archive', 'ml-forest'];
    game.completedRegions.set(completed);
    game.lastRound.set({
      regionId: 'ml-forest',
      acquiredSkills: [],
      completedRegions: completed.slice(0, -1),
      choices: {},
      selectedTrack: null,
    });
    const specializations = game.regions.filter((region) => region.kind === 'specialization');

    expect(specializations).toHaveLength(4);
    expect(specializations.every((region) => game.regionStatus(region) === 'open')).toBe(true);
    expect(game.recommendedRegionId()).toBeNull();
  });

  it('should connect activity sensing, pose analysis and long-term care safety', () => {
    const game = TestBed.inject(GameStateService);
    const archive = game.regions.find((region) => region.id === 'data-archive')!;
    const forest = game.regions.find((region) => region.id === 'ml-forest')!;
    const observatory = game.regions.find((region) => region.id === 'vision-observatory')!;
    const activityData = archive.options.find((option) => option.direction === '動作與環境感測')!;
    const activityQuest = observatory.options.find((option) => option.direction === '姿態與活動')!;

    expect(archive.options).toHaveLength(4);
    expect(activityData.detail).toContain('人體骨架座標');
    expect(activityData.rewards).toContain('multisensor-care');
    expect(forest.options[0].detail).toContain('影像分割');
    expect(forest.options[0].detail).toContain('姿態估測');
    expect(observatory.subtitle).toContain('人體動作');
    expect(observatory.options).toHaveLength(4);
    expect(activityQuest.rewards).toEqual([
      'pose-action-analysis',
      'multisensor-care',
      'long-term-care',
      'python',
    ]);

    game.acquiredSkills.set(activityQuest.rewards);
    game.completedRegions.set(['vision-observatory']);
    expect(game.unlockedCapabilities().map((capability) => capability.name)).toContain(
      '居家安全觀測術',
    );
    expect(game.unlockedCareers().map((career) => career.className)).toContain('醫療照護視覺獵人');
    expect(game.skillById('computer-vision')?.canDo).toContain('影像分割');
  });

  it('should teach microbiome analysis across precision medicine and food nutrition', () => {
    const game = TestBed.inject(GameStateService);
    const observatory = game.regions.find((region) => region.id === 'medical-observatory');
    const watchtower = game.regions.find((region) => region.id === 'food-nutrition-watchtower');
    const precisionMicrobiome = observatory?.options.find(
      (option) => option.direction === '人體菌相',
    );
    const foodMicrobiome = watchtower?.options.find((option) => option.direction === '飲食與菌相');

    expect(game.skillById('microbiome-analysis')?.name).toBe('微生物菌相分析');
    expect(precisionMicrobiome?.rewards).toContain('microbiome-analysis');
    expect(foodMicrobiome?.rewards).toContain('microbiome-analysis');
    expect(observatory?.dialogue.map((line) => line.text).join('')).toContain('質譜');
    expect(watchtower?.dialogue.map((line) => line.text).join('')).toContain('質譜');
  });

  it('should distinguish the molecular careers while allowing deliberate dual awakening', () => {
    const game = TestBed.inject(GameStateService);
    const station = game.regions.find((region) => region.id === 'medical-observatory')!;
    const sharedSkills = ['workflow', 'python'];
    game.completedRegions.set(['medical-observatory']);

    station.options.forEach((option, index) => {
      game.acquiredSkills.set([...new Set([...sharedSkills, ...option.rewards])]);
      const careerIds = game.unlockedCareers().map((career) => career.id);

      if (index === 2) {
        expect(careerIds).toContain('molecular-assassin');
        expect(careerIds).not.toContain('precision-archer');
      } else {
        expect(careerIds).toContain('precision-archer');
        expect(careerIds).not.toContain('molecular-assassin');
      }
    });

    const molecularIntroduction = game.regions.find((region) => region.id === 'code-workshop')!
      .options[2];
    const molecularData = game.regions.find((region) => region.id === 'data-archive')!.options[3];
    const treatmentResponse = station.options[1];
    game.acquiredSkills.set([
      ...new Set([
        ...molecularIntroduction.rewards,
        ...molecularData.rewards,
        ...treatmentResponse.rewards,
      ]),
    ]);

    const dualCareerIds = game.unlockedCareers().map((career) => career.id);
    expect(dualCareerIds).toContain('precision-archer');
    expect(dualCareerIds).toContain('molecular-assassin');
  });

  it('should label the recommended career gate as the awakening destination', () => {
    const game = TestBed.inject(GameStateService);
    const careerGate = game.regions.find((region) => region.id === 'career-citadel');
    const completed = [
      'prompt-academy',
      'code-workshop',
      'data-archive',
      'ml-forest',
      'food-nutrition-watchtower',
    ];
    game.completedRegions.set(completed);
    game.acquiredSkills.set(['food-nutrition-literacy', 'food-evidence-validation']);
    game.lastRound.set({
      regionId: 'food-nutrition-watchtower',
      acquiredSkills: ['food-nutrition-literacy'],
      completedRegions: completed.slice(0, -1),
      choices: {},
      selectedTrack: 'food-nutrition-watchtower',
    });

    expect(game.recommendedRegionId()).toBe('career-citadel');
    expect(game.regionStatusLabel(careerGate!)).toBe('前往職業覺醒');
  });

  it('should define eleven visual RPG classes without exposing audience departments', () => {
    const game = TestBed.inject(GameStateService);

    expect(game.careers).toHaveLength(11);
    expect(
      game.careers.every(
        (career) =>
          career.id && career.image.startsWith('assets/careers/') && career.requiresSkills.length,
      ),
    ).toBe(true);
    expect(game.careers.some((career) => 'departments' in career)).toBe(false);
    expect(game.careers.find((career) => career.id === 'precision-archer')?.description).toContain(
      '更適合不同病人或族群的預防、診斷與治療方向',
    );
    expect(game.careers.find((career) => career.id === 'medical-vision-hunter')?.image).toContain(
      'medical-vision-hunter.png',
    );
  });

  it('should make every skill obtainable from a quest choice', () => {
    const game = TestBed.inject(GameStateService);
    const rewardedSkills = new Set(
      game.regions.flatMap((region) => region.options.flatMap((option) => option.rewards)),
    );

    expect(
      game.skills.filter((skill) => !rewardedSkills.has(skill.id)).map((skill) => skill.name),
    ).toEqual([]);

    const welcome = game.regions.find((region) => region.id === 'code-workshop')!;
    const archive = game.regions.find((region) => region.id === 'data-archive')!;
    expect(welcome.options.every((option) => option.rewards.includes('digital-tools'))).toBe(true);
    expect(archive.options.every((option) => option.rewards.includes('workflow'))).toBe(true);
    expect(archive.options.every((option) => !option.rewards.includes('digital-tools'))).toBe(true);
    expect(archive.options.every((option) => !option.rewards.includes('python'))).toBe(true);
    expect(
      game.skills.filter((skill) => skill.branch === 'programming').map((skill) => skill.name),
    ).toEqual([
      '數位工具運用',
      '程式設計',
      '流程設計與自動化',
      '程式測試與驗證',
      'RAG 知識檢索',
      'Agent 工作流',
    ]);
    expect(game.skills.find((skill) => skill.id === 'python')?.description).toContain('Python');
    expect(archive.options[0].rewards).toContain('data-pipeline');
    expect(archive.options[3].rewards).toContain('multiomics');

    const modelForest = game.regions.find((region) => region.id === 'ml-forest')!;
    expect(
      modelForest.dialogue.some((line) => line.text.includes('程式設計會帶來更細緻的控制力')),
    ).toBe(true);
    expect(
      modelForest.options
        .filter((option) => option.rewards.includes('machine-learning'))
        .every((option) => option.rewards.includes('python')),
    ).toBe(true);
    expect(
      modelForest.options.find((option) => option.direction === '生成與溝通')?.rewards,
    ).toContain('rag');
    expect(
      game.regions
        .find((region) => region.id === 'vision-observatory')
        ?.options.every((option) => option.rewards.includes('python')),
    ).toBe(true);
    expect(
      game.regions
        .find((region) => region.id === 'medical-observatory')
        ?.options.every((option) => option.rewards.includes('python')),
    ).toBe(true);
    expect(
      game.regions
        .find((region) => region.id === 'medical-observatory')
        ?.options.every((option) => option.rewards.includes('workflow')),
    ).toBe(true);
    expect(
      game.regions
        .find((region) => region.id === 'vision-observatory')
        ?.options.find((option) => option.direction === '臨床驗證')?.rewards,
    ).toContain('validation-code');
    expect(
      game.regions
        .find((region) => region.id === 'language-library')
        ?.options.find((option) => option.direction === '可信知識')?.rewards,
    ).toContain('agent-workflow');
    expect(
      game.regions
        .find((region) => region.id === 'ml-forest')
        ?.options.find((option) => option.direction === '整合與決策支援')?.rewards,
    ).toContain('ai-ethics');
    expect(
      game.regions
        .find((region) => region.id === 'product-alchemy-commission')
        ?.options.find((option) => option.direction === '臨床軟體')?.rewards,
    ).toContain('clinical-context');
    expect(
      game.regions
        .find((region) => region.id === 'product-alchemy-commission')
        ?.options.find((option) => option.direction === '程式服務')?.rewards,
    ).toEqual(
      expect.arrayContaining([
        'health-product-strategy',
        'product-outcome-validation',
        'python',
        'workflow',
        'agent-workflow',
      ]),
    );
    expect(
      game.regions
        .find((region) => region.id === 'alliance-deployment-commission')
        ?.options.find((option) => option.direction === '小規模試行')?.rewards,
    ).toEqual(expect.arrayContaining(['workflow', 'agent-workflow']));

    expect(
      game.careers.find((career) => career.id === 'precision-archer')?.requiresSkills,
    ).toContain('workflow');
    expect(
      game.careers.find((career) => career.id === 'molecular-assassin')?.requiresSkills,
    ).toContain('workflow');
    expect(
      game.capabilities.find((capability) => capability.id === 'precision-research')?.requires,
    ).toContain('workflow');
    expect(
      game.capabilities.find((capability) => capability.id === 'molecular-discovery')?.requires,
    ).toContain('workflow');

    const ragDirections = game.regions.flatMap((region) =>
      region.options
        .filter((option) => option.rewards.includes('rag'))
        .map((option) => option.direction),
    );
    expect(ragDirections).toEqual(['生成與溝通', '可信知識']);

    const agentDirections = game.regions.flatMap((region) =>
      region.options
        .filter((option) => option.rewards.includes('agent-workflow'))
        .map((option) => option.direction),
    );
    expect(agentDirections).toEqual(['可信知識', '程式服務', '小規模試行']);
  });

  it('should support tool-based automation and agents without requiring programming', () => {
    const game = TestBed.inject(GameStateService);

    game.acquiredSkills.set(['digital-tools', 'workflow']);
    expect(game.unlockedCapabilities().map((capability) => capability.id)).toContain('automation');
    expect(game.acquiredSkills()).not.toContain('python');

    game.acquiredSkills.set(['digital-tools', 'agent-workflow']);
    expect(game.unlockedCapabilities().map((capability) => capability.id)).toContain('agent');

    game.acquiredSkills.set(['python', 'workflow']);
    expect(game.unlockedCapabilities().map((capability) => capability.id)).toContain('automation');
  });

  it('should require programming for the model engineer and restore new rewards to saved runs', () => {
    localStorage.setItem(
      'ai-academy-adventure-v6',
      JSON.stringify({
        view: 'career',
        acquiredSkills: ['machine-learning', 'model-training'],
        completedRegions: [
          'prompt-academy',
          'code-workshop',
          'data-archive',
          'ml-forest',
          'vision-observatory',
        ],
        choices: {
          'code-workshop': 0,
          'data-archive': 0,
          'ml-forest': 0,
          'vision-observatory': 0,
        },
        selectedTrack: 'vision-observatory',
        previewRewards: false,
        lastRound: null,
      }),
    );

    const game = TestBed.inject(GameStateService);
    expect(game.acquiredSkills()).toEqual(expect.arrayContaining(['digital-tools', 'workflow']));
    expect(game.acquiredSkills()).toContain('python');
    expect(game.unlockedCareers().map((career) => career.id)).toContain('model-engineer');

    game.acquiredSkills.set(['machine-learning', 'model-training']);
    expect(game.unlockedCareers().map((career) => career.id)).not.toContain('model-engineer');
  });

  it('should require a strong machine-learning profile for the model engineer', () => {
    const game = TestBed.inject(GameStateService);
    game.completedRegions.set(['vision-observatory']);

    game.acquiredSkills.set(['machine-learning', 'model-validation', 'python']);
    expect(game.unlockedCareers().map((career) => career.id)).toContain('model-engineer');
    expect(game.skillProfileScores().find((stat) => stat.id === 'machine-learning')?.value).toBe(9);

    game.acquiredSkills.set(['machine-learning', 'model-training', 'python']);
    expect(game.unlockedCareers().map((career) => career.id)).toContain('model-engineer');
    expect(game.skillProfileScores().find((stat) => stat.id === 'machine-learning')?.value).toBe(8);
  });

  it('should require completing a matching specialty before awakening a career', () => {
    const game = TestBed.inject(GameStateService);
    game.acquiredSkills.set(['rag', 'knowledge-design']);

    expect(game.unlockedCareers().map((career) => career.id)).not.toContain('nlp-mage');

    game.completedRegions.set(['language-library']);
    expect(game.unlockedCareers().map((career) => career.id)).toContain('nlp-mage');
  });

  it('should give every specialty choice at least one reachable career across all main paths', () => {
    const game = TestBed.inject(GameStateService);
    const mainRegions = ['code-workshop', 'data-archive', 'ml-forest'].map((regionId) =>
      game.regions.find((region) => region.id === regionId)!,
    );
    const mainPaths = mainRegions.reduce<readonly string[][]>(
      (paths, region) =>
        paths.flatMap((path) => region.options.map((option) => [...path, ...option.rewards])),
      [[]],
    );
    const careerRegions = game.regions.filter(
      (region) => region.kind === 'specialization' || region.kind === 'enterprise-contract',
    );
    const reachableCareerIds = new Set<string>();

    for (const region of careerRegions) {
      for (const option of region.options) {
        for (const path of mainPaths) {
          const skills = new Set([...path, ...option.rewards]);
          const matchingCareers = game.careers.filter(
            (career) =>
              [career.regionId, ...(career.alternateRegionIds ?? [])].includes(region.id) &&
              [career.requiresSkills, ...(career.alternateSkillRecipes ?? [])].some((recipe) =>
                recipe.every((skillId) => skills.has(skillId)),
              ),
          );
          expect(
            matchingCareers.length,
            `${region.name}「${option.label}」沒有可覺醒的職業`,
          ).toBeGreaterThan(0);
          matchingCareers.forEach((career) => reachableCareerIds.add(career.id));
        }
      }
    }

    expect(game.careers.filter((career) => !reachableCareerIds.has(career.id))).toEqual([]);
  });

  it('should open two optional enterprise commissions after any specialization', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const game = TestBed.inject(GameStateService);
    const page = fixture.nativeElement as HTMLElement;
    const hub = game.enterpriseHubRegion!;

    expect(game.mapRegions).toHaveLength(10);
    expect(game.mapRegions).toContain(hub);
    expect(game.mapRegions.some((region) => region.kind === 'enterprise-contract')).toBe(false);
    expect(game.regionStatus(hub)).toBe('locked');

    game.completedRegions.set([
      'prompt-academy',
      'code-workshop',
      'data-archive',
      'ml-forest',
      'medical-observatory',
    ]);
    game.goToEnterpriseHub();
    fixture.detectChanges();

    expect(game.view()).toBe('enterprise');
    expect(page.querySelectorAll('.enterprise-contract-card')).toHaveLength(2);
    expect(page.querySelector('.enterprise-mentor img')?.getAttribute('src')).toContain(
      'aria-enterprise-mentor-v2.png',
    );
    expect(page.textContent).toContain('不是前往職業覺醒的必經關卡');
    expect(page.textContent).toContain('產品鍊金委託');
    expect(page.textContent).toContain('聯盟導入委託');
  });

  it('should complete both enterprise contracts independently and awaken both classes', () => {
    const game = TestBed.inject(GameStateService);
    game.completedRegions.set([
      'prompt-academy',
      'code-workshop',
      'data-archive',
      'ml-forest',
      'medical-observatory',
    ]);
    const productContract = game.enterpriseContracts.find(
      (region) => region.id === 'product-alchemy-commission',
    )!;
    const allianceContract = game.enterpriseContracts.find(
      (region) => region.id === 'alliance-deployment-commission',
    )!;

    game.openRegion(productContract);
    game.skipToChoices();
    game.chooseQuestOption(1);
    expect(game.acquiredSkills()).toEqual(
      expect.arrayContaining([
        'health-product-strategy',
        'product-outcome-validation',
        'smart-medtech-prototype',
      ]),
    );
    expect(game.unlockedCareers().map((career) => career.className)).toContain(
      '智慧醫療產品鍊金術師',
    );

    game.openRegion(allianceContract);
    game.skipToChoices();
    game.chooseQuestOption(0);
    expect(game.unlockedCareers().map((career) => career.className)).toEqual(
      expect.arrayContaining(['智慧醫療產品鍊金術師', '跨域聯盟軍師']),
    );
    expect(game.completedEnterpriseContracts()).toHaveLength(2);
    expect(game.regionStatus(game.enterpriseHubRegion!)).toBe('completed');
    expect(game.recommendedRegionId()).toBe('career-citadel');
  });

  it('should unlock more than one class from matching skill combinations', () => {
    const game = TestBed.inject(GameStateService);
    game.completedRegions.set(['language-library', 'food-nutrition-watchtower']);
    game.acquiredSkills.set([
      'rag',
      'knowledge-design',
      'long-term-care',
      'experience-design',
      'food-nutrition-literacy',
      'food-evidence-validation',
    ]);

    expect(game.unlockedCareers().map((career) => career.className)).toEqual([
      '自然語言詠唱法師',
      '長照健康補師',
      '食品營養安全守護者',
    ]);
  });

  it('should calculate the eight-axis profile from collected skill cards', () => {
    const game = TestBed.inject(GameStateService);
    expect(game.skills.every((skill) => game.skillStatBonuses(skill.id).length > 0)).toBe(true);
    game.acquiredSkills.set(['rag', 'multiomics', 'statistics']);

    const scores = Object.fromEntries(
      game.skillProfileScores().map((stat) => [stat.id, stat.value]),
    );
    expect(game.skillProfileScores()).toHaveLength(8);
    expect(scores['generative-ai']).toBe(3);
    expect(scores['data']).toBe(3);
    expect(scores['math']).toBe(4);
    expect(scores['research']).toBe(2);
  });

  it('should present all awakened classes and collected cards on the adventure profile', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const game = TestBed.inject(GameStateService);
    game.acquiredSkills.set([
      'rag',
      'knowledge-design',
      'long-term-care',
      'experience-design',
      'food-nutrition-literacy',
      'food-evidence-validation',
    ]);
    game.completedRegions.set(['language-library', 'food-nutrition-watchtower']);
    game.showCareer('language-library');
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelectorAll('.career-gallery .career-card')).toHaveLength(3);
    expect(page.querySelectorAll('.profile-domain-card')).toHaveLength(0);
    expect(page.querySelectorAll('.profile-skill-grid .profile-skill-card')).toHaveLength(6);
    expect(page.querySelectorAll('.profile-skill-grid .profile-skill-card > img')).toHaveLength(6);
    expect(page.querySelectorAll('.profile-stat-row')).toHaveLength(8);
    expect(page.textContent).toContain('你在這趟冒險中，覺醒了以下專精職業');
    expect(page.textContent).toContain('冒險途中收集了 6 張技能卡');
    expect(page.textContent).not.toContain('北醫相關學系');
    expect(page.querySelector('.share-profile-button')?.textContent).toContain('分享履歷圖');
    expect(page.querySelector('.profile-actions .download-profile-button')?.textContent).toContain(
      '下載履歷圖',
    );
    expect(page.querySelector('.social-share-panel')).toBeNull();
    expect(page.querySelector('.share-primary-reminder')?.textContent).toContain(
      '分享主職業：自然語言詠唱法師',
    );

    const scrollTo = vi.mocked(window.scrollTo);
    scrollTo.mockClear();
    const careerCards = page.querySelectorAll<HTMLButtonElement>('.career-gallery .career-card');
    careerCards[2].click();
    fixture.detectChanges();
    expect(scrollTo).not.toHaveBeenCalled();
    expect(careerCards[2].getAttribute('aria-pressed')).toBe('true');
    expect(page.querySelector('.share-primary-reminder')?.textContent).toContain(
      '分享主職業：食品營養安全守護者',
    );
    expect(page.querySelector('.profile-rebirth-button')?.textContent).toContain('重生回原點');
  });

  it('should download the PNG instead of falling back to text-only sharing', async () => {
    const service = TestBed.inject(ProfileShareService);
    const file = new File(['profile'], 'profile.png', { type: 'image/png' });
    const internals = service as unknown as {
      createProfileImage: () => File;
      downloadFile: (profileFile: File) => void;
    };
    const shareDescriptor = Object.getOwnPropertyDescriptor(navigator, 'share');
    const canShareDescriptor = Object.getOwnPropertyDescriptor(navigator, 'canShare');
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(false);
    vi.spyOn(internals, 'createProfileImage').mockReturnValue(file);
    const download = vi.spyOn(internals, 'downloadFile').mockImplementation(() => undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: canShare });

    try {
      await expect(
        service.shareOrDownload({ careers: [], skills: [], stats: [], level: 1 }),
      ).resolves.toBe('downloaded');
      expect(canShare).toHaveBeenCalledWith({ files: [file] });
      expect(share).not.toHaveBeenCalled();
      expect(download).toHaveBeenCalledWith(file);
    } finally {
      if (shareDescriptor) Object.defineProperty(navigator, 'share', shareDescriptor);
      else Reflect.deleteProperty(navigator, 'share');
      if (canShareDescriptor) Object.defineProperty(navigator, 'canShare', canShareDescriptor);
      else Reflect.deleteProperty(navigator, 'canShare');
    }
  });

  it('should provide a dedicated adventure profile download', () => {
    const service = TestBed.inject(ProfileShareService);
    const file = new File(['profile'], 'profile.png', { type: 'image/png' });
    const internals = service as unknown as {
      createProfileImage: () => File;
      downloadFile: (profileFile: File) => void;
    };
    vi.spyOn(internals, 'createProfileImage').mockReturnValue(file);
    const download = vi.spyOn(internals, 'downloadFile').mockImplementation(() => undefined);

    service.download({ careers: [], skills: [], stats: [], level: 1 });

    expect(download).toHaveBeenCalledWith(file);
  });

  it('should explain that no other-career section is needed for a single awakened class', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const game = TestBed.inject(GameStateService);
    game.acquiredSkills.set(['food-nutrition-literacy', 'food-evidence-validation']);
    game.completedRegions.set(['food-nutrition-watchtower']);
    game.showCareer('food-nutrition-watchtower');
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelectorAll('.career-gallery .career-card')).toHaveLength(1);
    expect(page.querySelector('.share-primary-reminder')?.textContent).toContain(
      '目前只有這個覺醒職業',
    );
    expect(page.querySelector('.share-primary-reminder')?.textContent).toContain(
      '不會顯示「其他已覺醒職業」區塊',
    );
  });

  it('should keep one NPC throughout every quest dialogue', () => {
    const game = TestBed.inject(GameStateService);
    const storyRegions = game.regions.filter((region) => region.dialogue.length > 0);

    expect(storyRegions.length).toBeGreaterThan(0);
    expect(
      storyRegions.every(
        (region) =>
          new Set(region.dialogue.map((line) => line.speaker)).size === 1 &&
          new Set(region.dialogue.map((line) => line.portrait)).size === 1,
      ),
    ).toBe(true);
  });

  it('should unlock the food nutrition guardian through its dedicated quest skills', () => {
    const game = TestBed.inject(GameStateService);
    const watchtower = game.regions.find((region) => region.id === 'food-nutrition-watchtower');

    expect(watchtower?.options).toHaveLength(4);
    expect(watchtower?.dialogue.every((line) => line.speaker === '食養教授 Solan')).toBe(true);
    expect(
      watchtower?.dialogue.every(
        (line) => line.portrait === 'assets/characters/solan-food-professor.png',
      ),
    ).toBe(true);
    expect(
      watchtower?.options.every(
        (option) =>
          option.rewards.includes('food-nutrition-literacy') &&
          option.rewards.includes('food-evidence-validation'),
      ),
    ).toBe(true);
    game.acquiredSkills.set(watchtower!.options[0].rewards);
    game.completedRegions.set(['food-nutrition-watchtower']);
    expect(game.unlockedCareers().map((career) => career.className)).toContain(
      '食品營養安全守護者',
    );
  });
});
