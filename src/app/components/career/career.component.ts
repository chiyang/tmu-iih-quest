import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GameStateService } from '../../core/services/game-state.service';

@Component({
  selector: 'app-career',
  templateUrl: './career.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CareerComponent {
  readonly game = inject(GameStateService);
}
