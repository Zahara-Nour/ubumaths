/**
 * Trigonometric Circle Types - Type Definitions
 * ==============================================
 *
 * Types for representing trigonometric circles in the custom markdown AST.
 *
 * Features:
 * - Preset angle collections (quarters, sixths, thirds, all, custom)
 * - Custom angle expressions (pi/5, 7*pi/6, etc.)
 * - Trigonometric equations and inequations (cos(x) > 1/2, sin(x) = √2/2)
 * - Multiple display modes (points, arc, interactive)
 * - Optional projection lines and value table
 *
 * @module ubumark/types/trig-circle
 */

import type { BaseNode } from './ast';

// ============================================================================
// ANGLE TYPES
// ============================================================================

/**
 * Preset collections of remarkable angles
 *
 * - 'quarters': 0, π/2, π, 3π/2 (4 angles)
 * - 'sixths': 0, π/6, π/3, π/2, 2π/3, 5π/6, π, 7π/6, 4π/3, 3π/2, 5π/3, 11π/6 (12 angles)
 * - 'thirds': 0, π/3, 2π/3, π, 4π/3, 5π/3 (6 angles)
 * - 'all': All remarkable values (combination of quarters, sixths with π/4 variants)
 * - 'custom': No preset, only explicitly specified angles
 */
export type TrigPreset = 'all' | 'quarters' | 'sixths' | 'thirds' | 'custom';

/**
 * Representation of an angle
 *
 * Stores both the display expression (e.g., "π/3", "7π/6") and the numeric value in radians.
 *
 * @example
 * ```typescript
 * { expression: "π/3", radians: Math.PI / 3 }
 * { expression: "7*pi/6", radians: 7 * Math.PI / 6 }
 * ```
 */
export interface TrigAngle {
	/** Display expression as written (e.g., "π/3", "2π/3", "7*pi/6") */
	expression: string;
	/** Numeric value in radians (normalized to [0, 2π)) */
	radians: number;
	/** LaTeX-formatted expression for rendering (e.g., "\\frac{\\pi}{3}") */
	latex?: string;
}

// ============================================================================
// EQUATION TYPES
// ============================================================================

/**
 * Trigonometric function type
 */
export type TrigFunction = 'cos' | 'sin' | 'tan';

/**
 * Comparison operator for equations/inequations
 */
export type TrigOperator = '=' | '<' | '>' | '<=' | '>=';

/**
 * A trigonometric equation or inequation
 *
 * Represents expressions like:
 * - cos(x) = 1/2
 * - sin(x) > √2/2
 * - tan(x) <= 1
 *
 * @example
 * ```typescript
 * { func: 'cos', operator: '>', value: '1/2', numericValue: 0.5 }
 * { func: 'sin', operator: '=', value: '√2/2', numericValue: Math.SQRT2 / 2 }
 * ```
 */
export interface TrigEquation {
	/** Trigonometric function: cos, sin, or tan */
	func: TrigFunction;
	/** Comparison operator */
	operator: TrigOperator;
	/** Display value (e.g., "1/2", "√2/2", "-√3/2") */
	value: string;
	/** Numeric value for calculations */
	numericValue: number;
	/** LaTeX-formatted value for rendering */
	latex?: string;
}

// ============================================================================
// SOLUTION TYPES
// ============================================================================

/**
 * An arc on the unit circle representing a solution set
 *
 * For inequations like cos(x) > 1/2, the solution is an arc (or multiple arcs).
 *
 * @example cos(x) > 1/2 has solution arc from -π/3 to π/3
 * ```typescript
 * { startAngle: -Math.PI/3, endAngle: Math.PI/3, includeStart: false, includeEnd: false }
 * ```
 */
export interface TrigArc {
	/** Start angle in radians (normalized to [0, 2π)) */
	startAngle: number;
	/** End angle in radians (normalized to [0, 2π)) */
	endAngle: number;
	/** Whether the start point is included (for ≥ vs >) */
	includeStart: boolean;
	/** Whether the end point is included (for ≤ vs <) */
	includeEnd: boolean;
}

/**
 * Solution to a trigonometric equation or inequation
 *
 * For equations (=): a list of specific angle solutions
 * For inequations (>, <, ≥, ≤): one or more arcs on the circle
 */
export interface TrigSolution {
	/** Type of equation: equality or inequality */
	type: 'equation' | 'inequation';
	/** Individual angle solutions (for equations) */
	angles: TrigAngle[];
	/** Arc solutions (for inequations) */
	arcs: TrigArc[];
	/** Whether there's no solution (e.g., |k| > 1 for cos/sin) */
	noSolution: boolean;
	/** Whether the solution is all reals (e.g., tan(x) exists for all x except asymptotes) */
	allReals: boolean;
	/** Error message if parsing/solving failed */
	error?: string;
}

// ============================================================================
// DISPLAY CONFIGURATION
// ============================================================================

/**
 * Display mode for the trigonometric circle
 *
 * - 'points': Show individual angle points (for equations or preset angles)
 * - 'arc': Show arc(s) representing solution sets (for inequations)
 * - 'interactive': Allow dragging to explore angles dynamically
 */
export type TrigDisplayMode = 'points' | 'arc' | 'interactive';

/**
 * What elements to display
 *
 * - 'circle': Just the circle with angles
 * - 'table': Just the value table (cos/sin values)
 * - 'circle+table': Both circle and table side by side
 */
export type TrigDisplayType = 'circle' | 'table' | 'circle+table';

/**
 * Configuration options for the trigonometric circle display
 */
export interface TrigCircleConfig {
	/** Preset angle collection */
	preset: TrigPreset;
	/** Additional custom angles (expressions like "pi/5", "7*pi/6") */
	customAngles: TrigAngle[];
	/** Optional equation or inequation to solve and display */
	equation?: TrigEquation;
	/** Display mode: points, arc, or interactive */
	mode: TrigDisplayMode;
	/** What to display: circle, table, or both */
	display: TrigDisplayType;
	/** Whether to show projection lines to axes */
	showProjections: boolean;
	/** Primary color for highlighting (CSS color) */
	color: string;
	/** Whether to show the coordinate grid */
	showGrid: boolean;
	/** Whether to show the x and y axes */
	showAxes: boolean;
	/** Whether to show angle labels */
	showLabels: boolean;
	/** Whether to show cos/sin values on axes */
	showAxisValues: boolean;
}

// ============================================================================
// AST NODE
// ============================================================================

/**
 * Trigonometric Circle AST Node
 *
 * Represents a complete trigonometric circle visualization with:
 * - Preset and/or custom angles
 * - Optional equation/inequation with computed solutions
 * - Display configuration
 *
 * @example Basic circle with quarters
 * ```
 * ```trig
 * preset: quarters
 * ```
 * ```
 *
 * @example Circle with equation
 * ```
 * ```trig
 * equation: cos(x) > 1/2
 * mode: arc
 * projections: true
 * ```
 * ```
 *
 * @example Interactive with custom angles
 * ```
 * ```trig
 * preset: custom
 * angles: pi/5, 7*pi/6
 * mode: interactive
 * display: circle+table
 * ```
 * ```
 */
export interface TrigCircleNode extends BaseNode {
	type: 'trig-circle';
	/** Display configuration */
	config: TrigCircleConfig;
	/** All angles to display (preset + custom) */
	angles: TrigAngle[];
	/** Computed solution if an equation was provided */
	solution?: TrigSolution;
}

// ============================================================================
// PARSER TYPES
// ============================================================================

/**
 * Parser error information
 */
export interface TrigCircleParseError {
	/** Error message */
	message: string;
	/** Line number where error occurred (1-based, relative to block start) */
	line?: number;
	/** The problematic line content */
	content?: string;
}

/**
 * Parser warning information (non-fatal issues)
 */
export interface TrigCircleParseWarning {
	/** Warning message */
	message: string;
	/** Line number where warning occurred (1-based) */
	line?: number;
	/** Additional context */
	context?: string;
}

/**
 * Result of parsing a trig circle block
 */
export interface TrigCircleParseResult {
	/** Parsed node, null if parsing failed */
	node: TrigCircleNode | null;
	/** Errors encountered during parsing (fatal) */
	errors: TrigCircleParseError[];
	/** Warnings encountered during parsing (non-fatal) */
	warnings: TrigCircleParseWarning[];
}

/**
 * Block range for trig circle detection
 */
export interface TrigCircleBlockRange {
	/** Start line index (0-based, inclusive) */
	startIndex: number;
	/** End line index (0-based, inclusive) */
	endIndex: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default configuration for trigonometric circle
 */
export const DEFAULT_TRIG_CIRCLE_CONFIG: TrigCircleConfig = {
	preset: 'quarters',
	customAngles: [],
	mode: 'points',
	display: 'circle',
	showProjections: false,
	color: 'blue',
	showGrid: false,
	showAxes: true,
	showLabels: true,
	showAxisValues: true
};

/**
 * Remarkable angle values with their LaTeX representations
 *
 * Maps radians (as multiples of π) to display values.
 * Key format: "numerator/denominator" where angle = numerator * π / denominator
 */
export const REMARKABLE_ANGLES: Record<
	string,
	{ radians: number; latex: string; cos: string; sin: string }
> = {
	// Quarters (π/2 increments)
	'0/1': { radians: 0, latex: '0', cos: '1', sin: '0' },
	'1/2': { radians: Math.PI / 2, latex: '\\frac{\\pi}{2}', cos: '0', sin: '1' },
	'1/1': { radians: Math.PI, latex: '\\pi', cos: '-1', sin: '0' },
	'3/2': { radians: (3 * Math.PI) / 2, latex: '\\frac{3\\pi}{2}', cos: '0', sin: '-1' },

	// Sixths (π/6 increments)
	'1/6': {
		radians: Math.PI / 6,
		latex: '\\frac{\\pi}{6}',
		cos: '\\frac{\\sqrt{3}}{2}',
		sin: '\\frac{1}{2}'
	},
	'1/3': {
		radians: Math.PI / 3,
		latex: '\\frac{\\pi}{3}',
		cos: '\\frac{1}{2}',
		sin: '\\frac{\\sqrt{3}}{2}'
	},
	'2/3': {
		radians: (2 * Math.PI) / 3,
		latex: '\\frac{2\\pi}{3}',
		cos: '-\\frac{1}{2}',
		sin: '\\frac{\\sqrt{3}}{2}'
	},
	'5/6': {
		radians: (5 * Math.PI) / 6,
		latex: '\\frac{5\\pi}{6}',
		cos: '-\\frac{\\sqrt{3}}{2}',
		sin: '\\frac{1}{2}'
	},
	'7/6': {
		radians: (7 * Math.PI) / 6,
		latex: '\\frac{7\\pi}{6}',
		cos: '-\\frac{\\sqrt{3}}{2}',
		sin: '-\\frac{1}{2}'
	},
	'4/3': {
		radians: (4 * Math.PI) / 3,
		latex: '\\frac{4\\pi}{3}',
		cos: '-\\frac{1}{2}',
		sin: '-\\frac{\\sqrt{3}}{2}'
	},
	'5/3': {
		radians: (5 * Math.PI) / 3,
		latex: '\\frac{5\\pi}{3}',
		cos: '\\frac{1}{2}',
		sin: '-\\frac{\\sqrt{3}}{2}'
	},
	'11/6': {
		radians: (11 * Math.PI) / 6,
		latex: '\\frac{11\\pi}{6}',
		cos: '\\frac{\\sqrt{3}}{2}',
		sin: '-\\frac{1}{2}'
	},

	// Fourths (π/4 increments)
	'1/4': {
		radians: Math.PI / 4,
		latex: '\\frac{\\pi}{4}',
		cos: '\\frac{\\sqrt{2}}{2}',
		sin: '\\frac{\\sqrt{2}}{2}'
	},
	'3/4': {
		radians: (3 * Math.PI) / 4,
		latex: '\\frac{3\\pi}{4}',
		cos: '-\\frac{\\sqrt{2}}{2}',
		sin: '\\frac{\\sqrt{2}}{2}'
	},
	'5/4': {
		radians: (5 * Math.PI) / 4,
		latex: '\\frac{5\\pi}{4}',
		cos: '-\\frac{\\sqrt{2}}{2}',
		sin: '-\\frac{\\sqrt{2}}{2}'
	},
	'7/4': {
		radians: (7 * Math.PI) / 4,
		latex: '\\frac{7\\pi}{4}',
		cos: '\\frac{\\sqrt{2}}{2}',
		sin: '-\\frac{\\sqrt{2}}{2}'
	}
};

/**
 * Get angles for a preset
 */
export function getPresetAngles(preset: TrigPreset): TrigAngle[] {
	const quarters = ['0/1', '1/2', '1/1', '3/2'];
	const sixths = [
		'0/1',
		'1/6',
		'1/3',
		'1/2',
		'2/3',
		'5/6',
		'1/1',
		'7/6',
		'4/3',
		'3/2',
		'5/3',
		'11/6'
	];
	const thirds = ['0/1', '1/3', '2/3', '1/1', '4/3', '5/3'];
	const all = [
		'0/1',
		'1/6',
		'1/4',
		'1/3',
		'1/2',
		'2/3',
		'3/4',
		'5/6',
		'1/1',
		'7/6',
		'5/4',
		'4/3',
		'3/2',
		'5/3',
		'7/4',
		'11/6'
	];

	let keys: string[];
	switch (preset) {
		case 'quarters':
			keys = quarters;
			break;
		case 'sixths':
			keys = sixths;
			break;
		case 'thirds':
			keys = thirds;
			break;
		case 'all':
			keys = all;
			break;
		case 'custom':
			return [];
		default:
			keys = quarters;
	}

	return keys.map((key) => {
		const angle = REMARKABLE_ANGLES[key];
		return {
			expression: angle.latex
				.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
				.replace(/\\pi/g, 'π'),
			radians: angle.radians,
			latex: angle.latex
		};
	});
}
