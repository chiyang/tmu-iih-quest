import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GameStateService } from '../../core/services/game-state.service';

@Component({
  selector: 'app-skill-collection',
  templateUrl: './skill-collection.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillCollectionComponent {
  readonly game = inject(GameStateService);
}
