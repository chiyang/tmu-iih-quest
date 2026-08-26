import { inject, Injectable, NgZone } from '@angular/core';
import { BRANCHES, CAREERS, REGIONS } from '../data/game.data';

interface IdleDeadlineLike {
  readonly didTimeout: boolean;
  timeRemaining(): number;
}

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: (deadline: IdleDeadlineLike) => void,
    options?: { timeout: number },
  ) => number;
};

@Injectable({ providedIn: 'root' })
export class AssetPreloadService {
  private readonly zone = inject(NgZone);
  private started = false;
  private readonly requested = new Set<string>();
  private readonly inFlight = new Set<HTMLImageElement>();

  start(): void {
    if (this.started || typeof window === 'undefined' || typeof Image === 'undefined') return;
    this.started = true;

    this.zone.runOutsideAngular(() => {
      const sceneAndNpcAssets = this.unique([
        'assets/characters/lumi-guide.png',
        ...REGIONS.map((region) => region.scene),
        ...REGIONS.flatMap((region) => region.dialogue.map((line) => line.portrait)),
      ]);
      const careerAssets = this.unique(CAREERS.map((career) => career.image));
      const skillCoverAssets = this.unique(BRANCHES.map((branch) => branch.image));

      this.preloadGroup(sceneAndNpcAssets, () =>
        this.preloadGroup(careerAssets, () => this.preloadGroup(skillCoverAssets)),
      );
    });
  }

  private preloadGroup(paths: readonly string[], onQueued: () => void = () => undefined): void {
    let cursor = 0;
    const queueBatch = (deadline: IdleDeadlineLike): void => {
      let queued = 0;
      while (
        cursor < paths.length &&
        queued < 3 &&
        (queued === 0 || deadline.didTimeout || deadline.timeRemaining() > 4)
      ) {
        this.preload(paths[cursor]);
        cursor += 1;
        queued += 1;
      }

      if (cursor < paths.length) this.scheduleIdle(queueBatch);
      else onQueued();
    };

    if (paths.length) this.scheduleIdle(queueBatch);
    else onQueued();
  }

  private preload(path: string): void {
    const url = new URL(path, document.baseURI).href;
    if (this.requested.has(url)) return;
    this.requested.add(url);

    const image = new Image();
    const release = (): void => {
      this.inFlight.delete(image);
    };
    image.decoding = 'async';
    image.onload = release;
    image.onerror = release;
    this.inFlight.add(image);
    image.src = url;
  }

  private scheduleIdle(callback: (deadline: IdleDeadlineLike) => void): void {
    const idleWindow = window as IdleWindow;
    if (typeof idleWindow.requestIdleCallback === 'function') {
      idleWindow.requestIdleCallback(callback, { timeout: 1500 });
      return;
    }
    window.setTimeout(() => callback({ didTimeout: true, timeRemaining: () => 0 }), 250);
  }

  private unique(paths: readonly string[]): readonly string[] {
    return [...new Set(paths)];
  }
}
