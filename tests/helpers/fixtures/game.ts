// Test fixtures and factories for game testing
// Author: Claude Code
// Date: 2025-10-17

import type {
	GamePlayer,
	GameSpell,
	GameMonster,
	GameCombat,
	GameChallenge,
	PlayerSnapshot,
	MonsterSnapshot
} from '$lib/types/game';

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a test game player with default values
 */
export function createTestPlayer(overrides: Partial<GamePlayer> = {}): GamePlayer {
	const basePlayer: GamePlayer = {
		id: 'test-player-id',
		user_id: 'test-user-id',
		level: 1,
		xp: 0,
		prestige: 0,
		pyrs_fire: 100,
		pyrs_water: 100,
		pyrs_earth: 100,
		pyrs_wind: 100,
		pyrs_fire_spent: 0,
		pyrs_water_spent: 0,
		pyrs_earth_spent: 0,
		pyrs_wind_spent: 0,
		tutorial_stage: 'fini',
		tutorial_completed_at: new Date().toISOString(),
		total_combats: 0,
		combats_won: 0,
		combats_lost: 0,
		help_bubbles_enabled: true,
		help_bubbles_seen: [],
		music_settings: { enabled: true, volume: 0.7 },
		last_played_at: new Date().toISOString(),
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	};

	return { ...basePlayer, ...overrides };
}

/**
 * Create a test spell with default values
 */
export function createTestSpell(overrides: Partial<GameSpell> = {}): GameSpell {
	const baseSpell: GameSpell = {
		id: 'test-spell-id',
		user_id: 'test-user-id',
		spell_num: 1,
		level: 1,
		element: 'fire',
		power: 50,
		type: 'attack',
		unlocked_at: new Date().toISOString(),
		last_upgraded_at: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	};

	return { ...baseSpell, ...overrides };
}

/**
 * Create a test monster with default values
 */
export function createTestMonster(
	category: 'common' | 'elite' | 'legendary' = 'common',
	overrides: Partial<GameMonster> = {}
): GameMonster {
	const categoryStats = {
		common: { max_endurance: 100, attack_coefficient: 1.0 },
		elite: { max_endurance: 200, attack_coefficient: 1.3 },
		legendary: { max_endurance: 500, attack_coefficient: 1.8 }
	};

	const stats = categoryStats[category];

	const baseMonster: GameMonster = {
		id: 'test-monster-id',
		name: `Test ${category} Monster`,
		element: 'earth',
		level: 1,
		category,
		max_endurance: stats.max_endurance,
		attack_coefficient: stats.attack_coefficient,
		img_url: `/monsters/test-${category}.png`,
		img_head_url: `/monsters/test-${category}-head.png`,
		position: null,
		spawned_by: null,
		spawned_at: new Date().toISOString(),
		is_dead: false,
		defeated_by: null,
		defeated_at: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	};

	return { ...baseMonster, ...overrides };
}

/**
 * Create a test combat session with default values
 */
export function createTestCombat(overrides: Partial<GameCombat> = {}): GameCombat {
	const monster = createTestMonster();

	const playerSnapshot: PlayerSnapshot = {
		user_id: 'test-user-id',
		level: 1,
		max_endurance: 120,
		current_endurance: 120,
		spells: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
	};

	const monsterSnapshot: MonsterSnapshot = {
		name: monster.name,
		element: monster.element,
		level: monster.level,
		max_endurance: monster.max_endurance,
		attack_coefficient: monster.attack_coefficient,
		img_url: monster.img_url
	};

	const baseCombat: GameCombat = {
		id: 'test-combat-id',
		organizer_id: 'test-user-id',
		monster_id: monster.id,
		invited_player_ids: [],
		ready_player_ids: ['test-user-id'],
		status: 'active',
		current_round: 1,
		current_turn: 1,
		turn_order: ['test-user-id'],
		player_snapshots: { 'test-user-id': playerSnapshot },
		monster_snapshot: monsterSnapshot,
		combat_flow: [],
		outcome: null,
		monster_endurance_remaining: monster.max_endurance,
		prestige_gained: null,
		xp_gained: null,
		pyrs_gained: null,
		started_at: new Date().toISOString(),
		completed_at: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	};

	return { ...baseCombat, ...overrides };
}

/**
 * Create a test challenge with default values
 */
export function createTestChallenge(
	type: 'addition' | 'subtraction' | 'multiplication' = 'addition',
	difficulty: number = 1,
	overrides: Partial<GameChallenge> = {}
): GameChallenge {
	const challengeTemplates = {
		addition: {
			slug: `test-addition-${difficulty}`,
			question: 'Calculer {a} + {b}',
			variables: {
				a: { value: 'randomInt(1, 10)' },
				b: { value: 'randomInt(1, 10)' }
			},
			answer: { value: 'a + b' }
		},
		subtraction: {
			slug: `test-subtraction-${difficulty}`,
			question: 'Calculer {a} - {b}',
			variables: {
				a: { value: 'randomInt(10, 20)' },
				b: { value: 'randomInt(1, 10)' }
			},
			answer: { value: 'a - b' }
		},
		multiplication: {
			slug: `test-multiplication-${difficulty}`,
			question: 'Calculer {a} × {b}',
			variables: {
				a: { value: 'randomInt(2, 10)' },
				b: { value: 'randomInt(2, 10)' }
			},
			answer: { value: 'a * b' }
		}
	};

	const template = challengeTemplates[type];

	const baseChallenge: GameChallenge = {
		id: `test-challenge-${type}-${difficulty}`,
		slug: template.slug,
		element: 'base',
		category: type,
		difficulty,
		timer: 30000, // 30 seconds
		challenge_type: 1,
		question: template.question,
		view_config: {},
		variables: template.variables,
		answer: template.answer,
		hint: null,
		show_answer: null,
		times_attempted: 0,
		times_succeeded: 0,
		avg_time_taken: null,
		is_active: true,
		created_by: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	};

	return { ...baseChallenge, ...overrides };
}

// ============================================================================
// Seed Data Collections
// ============================================================================

/**
 * Collection of test monsters for different scenarios
 */
export const TEST_MONSTERS = {
	common: createTestMonster('common', { id: 'monster-common-1', name: 'Goblin' }),
	elite: createTestMonster('elite', { id: 'monster-elite-1', name: 'Orc Champion' }),
	legendary: createTestMonster('legendary', { id: 'monster-legendary-1', name: 'Dragon' }),
	fire: createTestMonster('common', {
		id: 'monster-fire-1',
		element: 'fire',
		name: 'Fire Sprite'
	}),
	water: createTestMonster('common', {
		id: 'monster-water-1',
		element: 'water',
		name: 'Water Elemental'
	}),
	earth: createTestMonster('common', {
		id: 'monster-earth-1',
		element: 'earth',
		name: 'Rock Golem'
	}),
	wind: createTestMonster('common', {
		id: 'monster-wind-1',
		element: 'wind',
		name: 'Wind Spirit'
	})
};

/**
 * Collection of test challenges for different types
 */
export const TEST_CHALLENGES = {
	addition_easy: createTestChallenge('addition', 1),
	addition_medium: createTestChallenge('addition', 3),
	addition_hard: createTestChallenge('addition', 5),
	subtraction_easy: createTestChallenge('subtraction', 1),
	subtraction_medium: createTestChallenge('subtraction', 3),
	multiplication_easy: createTestChallenge('multiplication', 1),
	multiplication_medium: createTestChallenge('multiplication', 3)
};

/**
 * Collection of test spells for different elements
 */
export const TEST_SPELLS = {
	fire_attack: createTestSpell({
		id: 'spell-fire-attack-1',
		spell_num: 1,
		element: 'fire',
		type: 'attack',
		power: 50
	}),
	water_attack: createTestSpell({
		id: 'spell-water-attack-1',
		spell_num: 2,
		element: 'water',
		type: 'attack',
		power: 50
	}),
	earth_heal: createTestSpell({
		id: 'spell-earth-heal-1',
		spell_num: 3,
		element: 'earth',
		type: 'heal',
		power: 30
	}),
	wind_attack: createTestSpell({
		id: 'spell-wind-attack-1',
		spell_num: 4,
		element: 'wind',
		type: 'attack',
		power: 50
	})
};

// ============================================================================
// Mock Supabase Client
// ============================================================================

/**
 * Create a mock Supabase client for testing
 */
export function createMockSupabaseClient() {
	const mockData = {
		game_players: [] as GamePlayer[],
		game_monsters: Object.values(TEST_MONSTERS),
		game_challenges: Object.values(TEST_CHALLENGES),
		game_spells: Object.values(TEST_SPELLS),
		game_combats: [] as GameCombat[]
	};

	return {
		from: (table: string) => ({
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			select: (columns: string = '*') => ({
				// columns for future filtering

				eq: (column: string, value: unknown) => ({
					// column, value for future filtering
					single: async () => {
						const tableData = (mockData as Record<string, unknown[]>)[table];
						const data = tableData?.find(
							(item: unknown) => (item as Record<string, unknown>)[column] === value
						);
						return { data, error: null };
					},
					maybeSingle: async () => {
						const tableData = (mockData as Record<string, unknown[]>)[table];
						const data = tableData?.find(
							(item: unknown) => (item as Record<string, unknown>)[column] === value
						);
						return { data, error: null };
					}
				}),
				limit: (n: number) => ({
					then: async (resolve: (value: unknown) => unknown) => {
						const tableData = (mockData as Record<string, unknown[]>)[table];
						const data = tableData?.slice(0, n);
						return resolve({ data, error: null });
					}
				})
			}),
			insert: (values: unknown) => ({
				select: () => ({
					single: async () => {
						const inserted = Array.isArray(values) ? values[0] : values;
						return { data: inserted, error: null };
					}
				})
			}),
			update: (values: unknown) => ({
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				eq: (column: string, value: unknown) => ({
					// column, value for future filtering
					select: () => ({
						single: async () => {
							return { data: { ...(values as Record<string, unknown>) }, error: null };
						}
					})
				})
			})
		})
	};
}

// ============================================================================
// Random Number Generator Seeding
// ============================================================================

// Store original Math.random
const originalRandom = Math.random;

/**
 * Seed Math.random for deterministic tests
 * Uses mulberry32 algorithm for simple seeding
 */
export function seedRandom(seed: number = 12345) {
	let state = seed;

	Math.random = () => {
		state = (state * 1664525 + 1013904223) % 4294967296;
		return state / 4294967296;
	};
}

/**
 * Reset Math.random to original implementation
 */
export function resetRandom() {
	Math.random = originalRandom;
}
