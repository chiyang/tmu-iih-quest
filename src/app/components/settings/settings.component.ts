import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GameStateService } from '../../core/services/game-state.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  readonly game = inject(GameStateService);
  readonly selectionLimits = [1, 2, 3, 4] as const;
}
