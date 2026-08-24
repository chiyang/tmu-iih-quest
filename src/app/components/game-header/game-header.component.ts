import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GameStateService } from '../../core/services/game-state.service';

@Component({
  selector: 'app-game-header',
  templateUrl: './game-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameHeaderComponent {
  readonly game = inject(GameStateService);
}
