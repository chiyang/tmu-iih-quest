import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GameStateService } from '../../core/services/game-state.service';

@Component({
  selector: 'app-world-map',
  templateUrl: './world-map.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldMapComponent {
  readonly game = inject(GameStateService);
}
