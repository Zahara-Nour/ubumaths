// Game types for Navadra integration
// Author: Claude Code
// Date: 2025-10-15

// ============================================================================
// Game Player
// ============================================================================

export interface GamePlayer {
	id: string;
	user_id: string;

	// RPG Stats
	level: number;
	xp: number;
	prestige: number;

	// Element Pyrs (in-game currency)
	pyrs_fire: number;
	pyrs_water: number;
	pyrs_earth: number;
	pyrs_wind: number;

	// Pyrs Spent
	pyrs_fire_spent: number;
	pyrs_water_spent: number;
	pyrs_earth_spent: number;
	pyrs_wind_spent: number;

	// Progress
	tutorial_stage: TutorialStage;
	tutorial_completed_at: string | null;
	total_combats: number;
	combats_won: number;
	combats_lost: number;

	// Settings
	help_bubbles_enabled: boolean;
	help_bubbles_seen: string[];
	music_settings: MusicSettings;

	// Timestamps
	last_played_at: string | null;
	created_at: string;
	updated_at: string;
}

export type TutorialStage =
	| 'cinematic_0'
	| 'index_1'
	| 'combattre_2'
	| 'index_3'
	| 'accueil_defi_4'
	| 'fin_defi_5'
	| 'grimoire_6'
	| 'grimoire_7'
	| 'index_8'
	| 'prepa_combats_9'
	| 'combats_decks_10'
	| 'combattre_11'
	| 'index_12'
	| 'fini';

export interface MusicSettings {
	enabled: boolean;
	volume: number; // 0-1
}

// ============================================================================
// Game Spells
// ============================================================================

export interface GameSpell {
	id: string;
	user_id: string;
	spell_num: number;
	level: number; // 1-5
	element: GameElement;
	power: number;
	type: SpellType;
	unlocked_at: string;
	last_upgraded_at: string | null;
	created_at: string;
	updated_at: string;
}

export type GameElement = 'fire' | 'water' | 'earth' | 'wind';
export type SpellType = 'attack' | 'heal' | 'buff' | 'debuff';

// ============================================================================
// Game Monsters
// ============================================================================

export interface GameMonster {
	id: string;
	name: string;
	element: GameElement;
	level: number; // 1-50
	category: MonsterCategory;
	max_endurance: number; // HP
	attack_coefficient: number;
	img_url: string;
	img_head_url: string;
	position: string | null;
	spawned_by: string | null;
	spawned_at: string;
	is_dead: boolean;
	defeated_by: string | null;
	defeated_at: string | null;
	created_at: string;
	updated_at: string;
}

export type MonsterCategory = 'common' | 'elite' | 'legendary';

// ============================================================================
// Game Combats
// ============================================================================

export interface GameCombat {
	id: string;
	organizer_id: string;
	monster_id: string;
	invited_player_ids: string[];
	ready_player_ids: string[];
	status: CombatStatus;
	current_round: number;
	current_turn: number;
	turn_order: string[]; // Player IDs
	player_snapshots: Record<string, PlayerSnapshot>;
	monster_snapshot: MonsterSnapshot;
	combat_flow: CombatTurn[];
	outcome: CombatOutcome | null;
	monster_endurance_remaining: number | null;
	prestige_gained: number | null;
	xp_gained: number | null;
	pyrs_gained: PyrsGained | null;
	started_at: string | null;
	completed_at: string | null;
	created_at: string;
	updated_at: string;
}

export type CombatStatus = 'pending' | 'active' | 'completed' | 'abandoned';
export type CombatOutcome = 'victory' | 'defeat';

export interface PlayerSnapshot {
	user_id: string;
	level: number;
	max_endurance: number;
	current_endurance: number;
	spells: number[]; // Spell nums in deck
}

export interface MonsterSnapshot {
	name: string;
	element: GameElement;
	level: number;
	max_endurance: number;
	attack_coefficient: number;
	img_url: string;
}

export interface CombatTurn {
	round: number;
	turn: number;
	player_id: string;
	action: 'spell' | 'challenge' | 'monster_attack' | 'heal';
	spell_num?: number;
	challenge_result?: ChallengeResult;
	damage_dealt?: number;
	healing_done?: number;
	critical?: boolean;
	timestamp: string;
}

export interface ChallengeResult {
	challenge_id: string;
	success: boolean;
	time_taken: number; // milliseconds
}

export interface PyrsGained {
	fire?: number;
	water?: number;
	earth?: number;
	wind?: number;
}

// ============================================================================
// Game Challenges
// ============================================================================

export interface GameChallenge {
	id: string;
	slug: string;
	element: GameElement | 'base';
	category: string;
	difficulty: number; // 1-5
	timer: number; // milliseconds
	challenge_type: number;
	question: string;
	view_config: Record<string, unknown>;
	variables: ChallengeVariables;
	answer: ChallengeAnswer;
	hint: string | null;
	show_answer: unknown;
	times_attempted: number;
	times_succeeded: number;
	avg_time_taken: number | null;
	is_active: boolean;
	created_by: string | null;
	created_at: string;
	updated_at: string;
}

export type ChallengeVariables = Record<string, ChallengeVariable>;

export interface ChallengeVariable {
	type?: string;
	value?: string;
	expression?: string;
	// Additional properties from original challenge system
	[key: string]: unknown;
}

export interface ChallengeAnswer {
	type?: string;
	value?: string | number | unknown[];
	tolerance?: number;
	// Additional properties
	[key: string]: unknown;
}

export interface ChallengeInstance {
	challenge: GameChallenge;
	variables: Record<string, unknown>;
	expressions: Record<string, string>;
	correct_answer: unknown;
}

// Type aliases for compatibility with challenge-variables system
export type Challenge = GameChallenge;
export type VariableDefinition = ChallengeVariable;
export type AnswerDefinition = ChallengeAnswer;

// ============================================================================
// Game Challenge Attempts
// ============================================================================

export interface GameChallengeAttempt {
	id: string;
	user_id: string;
	challenge_id: string;
	combat_id: string | null;
	success: boolean;
	time_taken: number; // milliseconds
	answer_given: unknown;
	correct_answer: unknown;
	challenge_instance: unknown;
	attempted_at: string;
}

// ============================================================================
// Game Achievements
// ============================================================================

export interface GameAchievement {
	id: string;
	slug: string;
	name: string;
	description: string;
	category: AchievementCategory;
	requirement_type: string;
	requirement_value: number;
	element: GameElement | null;
	prestige_reward: number;
	gidouilles_reward: number;
	icon_url: string;
	created_at: string;
}

export type AchievementCategory = 'combat' | 'progression' | 'exploration' | 'social';

export interface GamePlayerAchievement {
	id: string;
	user_id: string;
	achievement_id: string;
	progress: number;
	completed: boolean;
	completed_at: string | null;
	created_at: string;
	updated_at: string;
}

// ============================================================================
// Game Leaderboards
// ============================================================================

export interface GameLeaderboard {
	id: string;
	season_identifier: string; // "YYYY-MM"
	user_id: string;
	prestige_earned: number;
	combats_won: number;
	challenges_completed: number;
	rank: number | null;
	created_at: string;
	updated_at: string;
}

// ============================================================================
// Game Timeslots
// ============================================================================

export interface GameTimeslot {
	id: string;
	class_id: string;
	teacher_id: string;
	name: string;
	challenge_ids: string[];
	difficulty: number; // 1-5
	starts_at: string;
	ends_at: string;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

// ============================================================================
// Game Spell Decks
// ============================================================================

export interface GameSpellDeck {
	id: string;
	user_id: string;
	deck_name: string;
	spell_ids: string[]; // Must be exactly 10
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

// ============================================================================
// Game Class Settings
// ============================================================================

export interface GameClassSettings {
	id: string;
	class_id: string;
	base_difficulty: number; // 1-5
	challenge_timer_multiplier: number; // 1.0 = normal, 1.5 = 50% more time
	multiplayer_enabled: boolean;
	leaderboard_enabled: boolean;
	xp_multiplier: number;
	gidouilles_multiplier: number;
	created_at: string;
	updated_at: string;
}

// ============================================================================
// Helper Types
// ============================================================================

export interface GameStats {
	level: number;
	xp: number;
	xp_for_next_level: number;
	xp_progress: number; // percentage
	prestige: number;
	total_pyrs: number;
	combats_won: number;
	combats_lost: number;
	win_rate: number; // percentage
}

export interface ElementPyrs {
	fire: number;
	water: number;
	earth: number;
	wind: number;
}
