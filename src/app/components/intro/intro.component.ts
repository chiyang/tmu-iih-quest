import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GameStateService } from '../../core/services/game-state.service';

@Component({
  selector: 'app-intro',
  templateUrl: './intro.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntroComponent {
  readonly game = inject(GameStateService);
  readonly selectedCareerId = signal(
    this.game.unlockedCareers()[0]?.id ?? this.game.careers[0]?.id ?? '',
  );
  readonly selectedCareer = computed(
    () =>
      this.game.careers.find((career) => career.id === this.selectedCareerId()) ??
      this.game.careers[0] ??
      null,
  );

  selectCareer(careerId: string): void {
    this.selectedCareerId.set(careerId);
  }
}
