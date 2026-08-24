import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from '@angular/core';
import { CareerComponent } from './components/career/career.component';
import { GameHeaderComponent } from './components/game-header/game-header.component';
import { IntroComponent } from './components/intro/intro.component';
import { QuestComponent } from './components/quest/quest.component';
import { SettingsComponent } from './components/settings/settings.component';
import { SkillCollectionComponent } from './components/skill-collection/skill-collection.component';
import { WorldMapComponent } from './components/world-map/world-map.component';
import { GameStateService } from './core/services/game-state.service';

@Component({
  selector: 'app-root',
  imports: [
    CareerComponent,
    GameHeaderComponent,
    IntroComponent,
    QuestComponent,
    SettingsComponent,
    SkillCollectionComponent,
    WorldMapComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  readonly game = inject(GameStateService);
}
