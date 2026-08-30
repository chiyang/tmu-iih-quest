import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GameStateService } from '../../core/services/game-state.service';

@Component({
  selector: 'app-career',
  templateUrl: './career.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CareerComponent {
  readonly game = inject(GameStateService);

  selectCareer(regionId: string, careerId: string): void {
    this.game.showCareer(regionId, careerId);
    if (typeof document === 'undefined') return;
    document
      .getElementById('selected-career-detail')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
