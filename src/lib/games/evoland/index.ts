/**
 * Evoland Game - Public exports
 *
 * Port of Evoland Classic (Haxe/OpenFL) to TypeScript/Svelte 5
 * Original: https://github.com/deepnight/evolern
 */

// Types (main type definitions)
export type {
	Position,
	Bounds,
	GridPosition,
	EntityState,
	HeroState,
	MonsterState,
	SwordState,
	WorldState,
	GameState,
	InputState
} from './logic/types';

// Constants (game configuration)
export {
	Direction,
	Block,
	EKind,
	ChestKind,
	// Timing
	TARGET_FPS,
	FRAME_DURATION,
	// World
	WORLD_SIZE,
	TILE_SIZE,
	// Hero
	HERO_BASE_SPEED,
	SWORD_DURATION,
	HIT_RECOVER_FRAMES
} from './logic/constants';

// Store (for external state access)
export { evolandStore } from './stores/evoland.svelte';
