import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should introduce a no-wrong-answer AI adventure', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('h1')?.textContent).toContain('哪一種 AI 冒險者');
    expect(page.textContent).toContain('沒有錯誤答案');
    expect(page.textContent).toContain('語言咒術師');
    expect(page.textContent).toContain('視覺獵人');
    expect(page.textContent).toContain('魔型工程師');
  });

  it('should open the illustrated map and expose the first quest', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    page.querySelector<HTMLButtonElement>('.primary-cta')?.click();
    fixture.detectChanges();

    expect(page.querySelector('.world-board')).toBeTruthy();
    expect(page.querySelector('.region-node.is-open')?.textContent).toContain('符文程式工坊');
    expect(page.textContent).toContain('機器學習森林');
  });

  it('should reveal three valid approaches and award different skills after a choice', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    page.querySelector<HTMLButtonElement>('.primary-cta')?.click();
    fixture.detectChanges();
    page.querySelector<HTMLButtonElement>('.region-node.is-open')?.click();
    fixture.detectChanges();
    page.querySelector<HTMLButtonElement>('.dialogue-box .primary-cta')?.click();
    fixture.detectChanges();

    const choices = page.querySelectorAll<HTMLButtonElement>('.quest-choice');
    expect(choices).toHaveLength(3);
    expect(page.querySelector('.reward-preview')?.textContent).toContain('選擇後揭曉技能');

    choices[0].click();
    fixture.detectChanges();

    expect(page.querySelector('.result-scene')?.textContent).toContain('Python');
    expect(page.querySelector('.result-scene')?.textContent).toContain('流程自動化');
    expect(page.querySelector('.result-scene')?.textContent).not.toContain('答錯');
  });

  it('should undo only the latest completed round', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    page.querySelector<HTMLButtonElement>('.primary-cta')?.click();
    fixture.detectChanges();
    page.querySelector<HTMLButtonElement>('.region-node.is-open')?.click();
    fixture.detectChanges();
    page.querySelector<HTMLButtonElement>('.dialogue-box .primary-cta')?.click();
    fixture.detectChanges();
    page.querySelectorAll<HTMLButtonElement>('.quest-choice')[0].click();
    fixture.detectChanges();
    page.querySelector<HTMLButtonElement>('.result-actions .undo-button')?.click();
    fixture.detectChanges();

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
    page.querySelector<HTMLButtonElement>('.toggle')?.click();
    fixture.detectChanges();
    page.querySelector<HTMLButtonElement>('.settings-modal header > button')?.click();
    fixture.detectChanges();
    page.querySelector<HTMLButtonElement>('.primary-cta')?.click();
    fixture.detectChanges();
    page.querySelector<HTMLButtonElement>('.region-node.is-open')?.click();
    fixture.detectChanges();
    page.querySelector<HTMLButtonElement>('.dialogue-box .primary-cta')?.click();
    fixture.detectChanges();

    expect(page.querySelector('.reward-preview')?.textContent).toContain('Python');
    expect(page.querySelector('.reward-preview')?.textContent).not.toContain('選擇後揭曉技能');
  });
});
