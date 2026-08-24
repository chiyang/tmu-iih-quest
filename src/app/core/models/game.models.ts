export type GameView = 'intro' | 'map' | 'quest' | 'career';
export type BranchId = 'medical' | 'programming' | 'data' | 'ai' | 'product' | 'communication';
export type RegionKind = 'start' | 'main' | 'specialization' | 'career';
export type QuestPhase = 'dialogue' | 'choice' | 'result';

export interface SkillBranch {
  readonly id: BranchId;
  readonly name: string;
  readonly shortName: string;
  readonly image: string;
  readonly accent: string;
  readonly description: string;
}

export interface SkillItem {
  readonly id: string;
  readonly name: string;
  readonly branch: BranchId;
  readonly tier: number;
  readonly description: string;
  readonly canDo: string;
}

export interface Capability {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly requires: readonly string[];
}

export interface DialogueLine {
  readonly speaker: string;
  readonly role: string;
  readonly portrait: string;
  readonly text: string;
  readonly tone?: 'urgent' | 'thoughtful' | 'encouraging';
}

export interface QuestOption {
  readonly archetype: string;
  readonly icon: string;
  readonly label: string;
  readonly detail: string;
  readonly consequence: string;
  readonly rewards: readonly string[];
}

export interface WorldRegion {
  readonly id: string;
  readonly chapter: string;
  readonly name: string;
  readonly subtitle: string;
  readonly icon: string;
  readonly kind: RegionKind;
  readonly x: number;
  readonly y: number;
  readonly requiresRegions: readonly string[];
  readonly scene: string;
  readonly question: string;
  readonly dialogue: readonly DialogueLine[];
  readonly options: readonly QuestOption[];
}

export interface CareerProfile {
  readonly regionId: string;
  readonly kicker: string;
  readonly className: string;
  readonly realWorldTitle: string;
  readonly description: string;
  readonly formula: readonly string[];
  readonly careers: readonly string[];
  readonly research: readonly string[];
  readonly nextSkills: readonly string[];
}

export interface RoundSnapshot {
  readonly regionId: string;
  readonly acquiredSkills: readonly string[];
  readonly completedRegions: readonly string[];
  readonly choices: Readonly<Record<string, number>>;
  readonly selectedTrack: string | null;
}

export interface SavedGameState {
  readonly view: GameView;
  readonly acquiredSkills: readonly string[];
  readonly completedRegions: readonly string[];
  readonly choices: Readonly<Record<string, number>>;
  readonly selectedTrack: string | null;
  readonly previewRewards: boolean;
  readonly lastRound: RoundSnapshot | null;
}
