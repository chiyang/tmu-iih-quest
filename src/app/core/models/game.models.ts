export type GameView = 'intro' | 'map' | 'enterprise' | 'quest' | 'career';
export type BranchId = 'medical' | 'programming' | 'data' | 'ai' | 'product' | 'communication';
export type RegionKind =
  'start' | 'main' | 'specialization' | 'enterprise-hub' | 'enterprise-contract' | 'career';
export type QuestPhase = 'dialogue' | 'choice' | 'result';
export type StatAxisId =
  | 'programming'
  | 'math'
  | 'data'
  | 'machine-learning'
  | 'generative-ai'
  | 'engineering'
  | 'medical'
  | 'research';

export interface StatAxis {
  readonly id: StatAxisId;
  readonly name: string;
  readonly shortName: string;
  readonly description: string;
  readonly accent: string;
}

export interface SkillStatBonus {
  readonly axis: StatAxisId;
  readonly points: number;
}

export interface PlayerStatScore extends StatAxis {
  readonly value: number;
  readonly maxValue: number;
}

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
  readonly requiresAny?: readonly string[];
}

export interface DialogueLine {
  readonly speaker: string;
  readonly role: string;
  readonly portrait: string;
  readonly text: string;
  readonly tone?: 'urgent' | 'thoughtful' | 'encouraging';
}

export interface QuestOption {
  readonly direction: string;
  readonly icon: string;
  readonly label: string;
  readonly detail: string;
  readonly consequence: string;
  readonly rewards: readonly string[];
}

export type QuestChoices = Readonly<Record<string, readonly number[]>>;

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
  readonly visibleOnMap?: boolean;
  readonly contractRegionIds?: readonly string[];
}

export interface CareerProfile {
  readonly id: string;
  readonly regionId: string;
  readonly kicker: string;
  readonly className: string;
  readonly realWorldTitle: string;
  readonly image: string;
  readonly description: string;
  readonly requiresSkills: readonly string[];
  readonly alternateSkillRecipes?: readonly (readonly string[])[];
  readonly alternateRegionIds?: readonly string[];
  readonly crossRegionRecipes?: readonly {
    readonly regionId: string;
    readonly requiresSkills: readonly string[];
  }[];
  readonly formula: readonly string[];
  readonly careers: readonly string[];
  readonly research: readonly string[];
  readonly nextSkills: readonly string[];
}

export interface RoundSnapshot {
  readonly regionId: string;
  readonly acquiredSkills: readonly string[];
  readonly completedRegions: readonly string[];
  readonly choices: QuestChoices;
  readonly selectedTrack: string | null;
}

export interface SavedGameState {
  readonly view: GameView;
  readonly acquiredSkills: readonly string[];
  readonly completedRegions: readonly string[];
  readonly choices: QuestChoices;
  readonly selectedTrack: string | null;
  readonly previewRewards: boolean;
  readonly maxQuestSelections: number;
  readonly lastRound: RoundSnapshot | null;
}
