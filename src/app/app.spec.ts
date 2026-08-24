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

  it('should introduce concrete no-wrong-answer quests and creative classes', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('h1')?.textContent).toContain('哪一種 AI 冒險者');
    expect(page.textContent).toContain('312 份回饋');
    expect(page.textContent).toContain('沒有錯誤答案');
    expect(page.textContent).toContain('語言咒術師');
    expect(page.textContent).toContain('視覺獵人');
    expect(page.textContent).toContain('魔型工程師');
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
    expect(page.textContent).toContain('新生說明會今天 17:00');
  });

  it('should show three valid approaches and four post-quest destinations', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = reachFirstChoice(fixture);

    const choices = page.querySelectorAll<HTMLButtonElement>('.quest-choice');
    expect(choices).toHaveLength(3);
    expect(page.querySelector('.reward-preview')?.textContent).toContain('選擇後揭曉技能');

    choices[0].click();
    fixture.detectChanges();

    expect(page.querySelector('.result-scene')?.textContent).toContain('Python');
    expect(page.querySelector('.result-scene')?.textContent).toContain('流程自動化');
    expect(page.querySelector('.direct-next')?.textContent).toContain('水晶資料典藏室');
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
    expect(page.querySelector('.quest-topline')?.textContent).toContain('水晶資料典藏室');
    expect(page.querySelector('.speaker-portrait img')?.getAttribute('src')).toContain(
      'iris-archivist.png',
    );
    expect(page.textContent).toContain('486 筆健康篩檢紀錄');
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

    expect(page.querySelector('.reward-preview')?.textContent).toContain('Python');
    expect(page.querySelector('.reward-preview')?.textContent).not.toContain('選擇後揭曉技能');
  });

  it('should expose the map as an optional navigation surface', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    click(fixture, '.academy-hero .primary-cta');
    click(fixture, '.quest-topline > button');
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('app-world-map')).toBeTruthy();
    expect(page.querySelector('.region-node.is-open')?.textContent).toContain('符文程式工坊');
    expect(page.textContent).toContain('機器學習森林');
  });

  it('should route each machine-learning choice to a matching specialization', () => {
    const game = TestBed.inject(GameStateService);
    const forest = game.regions.find((region) => region.id === 'ml-forest');
    expect(forest).toBeTruthy();

    const destinations = ['魔眼觀測台', '星脈醫療觀測站', '萬語秘典城'];
    destinations.forEach((destination, index) => {
      game.choices.set({ 'ml-forest': index });
      expect(game.nextRegionFor(forest!)?.name).toBe(destination);
    });
  });
});
