import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GameStateService } from '../../core/services/game-state.service';

@Component({
  selector: 'app-quest',
  templateUrl: './quest.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestComponent {
  readonly game = inject(GameStateService);
  readonly choiceLetters = ['A', 'B', 'C'];
}
