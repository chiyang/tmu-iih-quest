import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GameStateService } from '../../core/services/game-state.service';

@Component({
  selector: 'app-intro',
  templateUrl: './intro.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntroComponent {
  readonly game = inject(GameStateService);
}
