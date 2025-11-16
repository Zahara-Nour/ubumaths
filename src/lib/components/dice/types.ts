/**
 * Dice Roller - Type Definitions
 *
 * Core types for the 3D dice rolling system with Threlte.
 */

import type { Vector3Tuple } from 'three';

/**
 * Supported dice types (polyhedrons)
 */
export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

/**
 * Visual styles for dice
 */
export type DiceStyle = 'classic' | 'neon' | 'wood';

/**
 * Configuration for a single die or group of dice
 */
export interface DiceConfig {
	/** Type of die (d4, d6, etc.) */
	type: DiceType;

	/** Number of dice to roll (default: 1) */
	count?: number;

	/** Visual style (default: 'classic') */
	style?: DiceStyle;

	/** Custom color (overrides style) */
	color?: string;

	/** Custom text color for numbers */
	textColor?: string;

	/** Size multiplier (default: 1.0) */
	size?: number;
}

/**
 * Result from rolling a single die
 */
export interface SingleDiceResult {
	/** Die type that was rolled */
	type: DiceType;

	/** Result value (1 to max faces) */
	value: number;

	/** Unique identifier for this die instance */
	id: string;
}

/**
 * Result from rolling one or more dice
 */
export interface DiceRollResult {
	/** Type of dice rolled */
	dice: DiceType;

	/** Individual results for each die */
	results: SingleDiceResult[];

	/** Sum of all results */
	total: number;

	/** Timestamp of roll */
	timestamp: number;
}

/**
 * Style configuration for dice materials
 */
export interface DiceStyleConfig {
	/** Base color of the die */
	baseColor: string;

	/** Color of numbers/dots */
	numberColor: string;

	/** Metalness (0-1) */
	metalness?: number;

	/** Roughness (0-1) */
	roughness?: number;

	/** Emissive color (for glow effects) */
	emissive?: string;

	/** Emissive intensity */
	emissiveIntensity?: number;
}

/**
 * Physics configuration for dice rolling
 */
export interface PhysicsConfig {
	/** Initial position [x, y, z] */
	position?: Vector3Tuple;

	/** Initial velocity [x, y, z] */
	velocity?: Vector3Tuple;

	/** Initial angular velocity [x, y, z] */
	angularVelocity?: Vector3Tuple;

	/** Gravity strength (default: 9.81) */
	gravity?: number;

	/** Friction coefficient (0-1, default: 0.5) */
	friction?: number;

	/** Restitution/bounciness (0-1, default: 0.3) */
	restitution?: number;
}

/**
 * Props for the main DiceRoller component
 */
export interface DiceRollerProps {
	/**
	 * Mode 1: Controlled configuration
	 * Dice configuration is provided via props (no user selection)
	 */
	config?: DiceConfig[];

	/**
	 * Mode 2: Interactive mode
	 * Shows dropdown for user to select dice type
	 */
	interactive?: boolean;

	/**
	 * Default style for all dice
	 */
	style?: DiceStyle;

	/**
	 * Show roll history (default: false)
	 */
	showHistory?: boolean;

	/**
	 * Maximum number of rolls to keep in history
	 */
	maxHistory?: number;

	/**
	 * Callback fired when dice start rolling
	 */
	onRollStart?: () => void;

	/**
	 * Callback fired during rolling (progress 0-1)
	 */
	onRollProgress?: (progress: number) => void;

	/**
	 * Callback fired when dice finish rolling
	 */
	onRollComplete?: (result: DiceRollResult[]) => void;

	/**
	 * Custom physics configuration
	 */
	physics?: Partial<PhysicsConfig>;

	/**
	 * Animation duration in milliseconds (default: 2500)
	 */
	duration?: number;

	/**
	 * Disable the roll button
	 */
	disabled?: boolean;
}

/**
 * Props for individual dice models
 */
export interface DiceModelProps {
	/** Die type */
	type: DiceType;

	/** Style configuration */
	style: DiceStyleConfig;

	/** Size multiplier */
	size?: number;

	/** Position in 3D space */
	position?: Vector3Tuple;

	/** Rotation in radians [x, y, z] */
	rotation?: Vector3Tuple;
}

/**
 * Dice geometry data
 */
export interface DiceGeometry {
	/** Number of faces */
	faces: number;

	/** Vertices for the polyhedron */
	vertices: number[];

	/** Face indices */
	indices: number[];

	/** Normal vectors for each face (for result detection) */
	faceNormals: Vector3Tuple[];

	/** Scale factor to normalize size */
	scale: number;
}

/**
 * State of a rolling die (for physics simulation)
 */
export interface DiceState {
	/** Unique ID */
	id: string;

	/** Die type */
	type: DiceType;

	/** Current position */
	position: Vector3Tuple;

	/** Current rotation (quaternion or euler) */
	rotation: number[];

	/** Current velocity */
	velocity: Vector3Tuple;

	/** Current angular velocity */
	angularVelocity: Vector3Tuple;

	/** Is die settled? */
	settled: boolean;

	/** Final result (once settled) */
	result?: number;
}
