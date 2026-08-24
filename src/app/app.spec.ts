import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { App } from './app';
import { GameStateService } from './core/services/game-state.service';

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

  it('should introduce broad health AI paths and creative classes', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('h1')?.textContent).toContain('哪一種 AI 冒險者');
    expect(page.textContent).toContain('長照');
    expect(page.textContent).toContain('照護紀錄');
    expect(page.textContent).toContain('精準醫療');
    expect(page.textContent).toContain('腦波');
    expect(page.textContent).toContain('新藥探索');
    expect(page.textContent).toContain('沒有錯誤答案');
    [
      '精準醫療射手',
      '長照健康補師',
      '生理訊號偵測斥侯',
      '自然語言詠唱法師',
      '智慧模型工程師',
      '健康安全守護者',
      '分子標靶刺客',
      '臨床決策劍士',
    ].forEach((className) => expect(page.textContent).toContain(className));
  });

  it('should start directly in the first illustrated character dialogue', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    click(fixture, '.academy-hero .primary-cta');
    const page = fixture.nativeElement as HTMLElement;

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

  it('should show three valid approaches and four post-quest destinations', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = reachFirstChoice(fixture);

    const choices = page.querySelectorAll<HTMLButtonElement>('.quest-choice');
    expect(choices).toHaveLength(3);
    expect(page.querySelector('.choice-speaker-portrait img')?.getAttribute('src')).toContain(
      'mira-engineer.png',
    );
    expect(page.querySelector('.choice-dialogue-box')?.textContent).toContain(
      '培養自己的第一條專精職業',
    );
    expect(choices[0].textContent).toContain('照護與健康溝通');
    expect(choices[1].textContent).toContain('診斷與生命訊號');
    expect(choices[2].textContent).toContain('分子研究與新藥探索');
    expect(page.querySelector('.reward-preview')?.textContent).toContain('選擇後揭曉技能');

    choices[0].click();
    fixture.detectChanges();

    expect(page.querySelector('.result-scene')?.textContent).toContain('衛教轉譯');
    expect(page.querySelector('.result-scene')?.textContent).toContain('智慧長照觀察');
    expect(page.querySelector('.direct-next')?.textContent).toContain('健康資料萬象庫');
    expect(page.querySelector('.map-return-button')).toBeTruthy();
    expect(page.querySelector('.undo-button')).toBeTruthy();
    expect(page.querySelector('.rebirth-button')).toBeTruthy();
  });

  it('should continue linearly to the next scene without returning to the map', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = reachFirstChoice(fixture);
    page.querySelectorAll<HTMLButtonElement>('.quest-choice')[1].click();
    fixture.detectChanges();

    click(fixture, '.direct-next');

    expect(page.querySelector('.world-board')).toBeFalsy();
    expect(page.querySelector('.quest-topline')?.textContent).toContain('健康資料萬象庫');
    expect(page.querySelector('.speaker-portrait img')?.getAttribute('src')).toContain(
      'iris-archivist.png',
    );
    expect(page.textContent).toContain('病歷與護理紀錄是文字和表格');
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
    click(fixture, '.skip-dialogue');

    expect(page.querySelector('.reward-preview')?.textContent).toContain('衛教轉譯');
    expect(page.querySelector('.reward-preview')?.textContent).not.toContain('選擇後揭曉技能');
  });

  it('should expose the map as an optional navigation surface', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    click(fixture, '.academy-hero .primary-cta');
    click(fixture, '.quest-topline > button');
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('app-world-map')).toBeTruthy();
    expect(page.querySelector('.region-node.is-open')?.textContent).toContain('智慧醫療迎新站');
    expect(page.textContent).toContain('智慧醫療方法森林');
  });

  it('should route each machine-learning choice to a matching specialization', () => {
    const game = TestBed.inject(GameStateService);
    const forest = game.regions.find((region) => region.id === 'ml-forest');
    expect(forest).toBeTruthy();

    const destinations = ['生命訊號觀測台', '照護語言秘典城', '分子星脈研究站'];
    destinations.forEach((destination, index) => {
      game.choices.set({ 'ml-forest': index });
      expect(game.nextRegionFor(forest!)?.name).toBe(destination);
    });
  });

  it('should connect all eight RPG classes to TMU-related departments', () => {
    const game = TestBed.inject(GameStateService);

    expect(game.careers).toHaveLength(8);
    expect(game.careers.every((career) => career.id && career.departments.length > 0)).toBe(true);
    expect(game.careers.flatMap((career) => career.departments)).toContain('生物醫學工程學系');
    expect(game.careers.flatMap((career) => career.departments)).toContain('公共衛生學系');
    expect(game.careers.flatMap((career) => career.departments)).toContain('藥學系');
  });
});
