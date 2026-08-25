import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GameStateService } from '../../core/services/game-state.service';

@Component({
  selector: 'app-enterprise-hub',
  templateUrl: './enterprise-hub.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnterpriseHubComponent {
  readonly game = inject(GameStateService);
}
