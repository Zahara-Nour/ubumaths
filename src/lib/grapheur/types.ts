/**
 * Grapheur Types - Type definitions and Zod schemas for the graphing calculator
 *
 * This module defines the core types for representing mathematical functions,
 * viewport state, and graph configuration. All types are designed to be
 * extensible for future plottable types (implicit, parametric, polar).
 *
 * @module grapheur/types
 */

import { z } from 'zod';
import type { MathNode } from '$lib/mathAST/types';

// =============================================================================
// Line Style Types
// =============================================================================

/**
 * Available line styles for function curves
 */
export const LINE_STYLES = ['solid', 'dashed', 'dotted', 'dashdot'] as const;

/**
 * Type for line styles
 */
export type LineStyle = (typeof LINE_STYLES)[number];

/**
 * Available line widths for function curves
 */
export const LINE_WIDTHS = [1, 2, 3, 4, 5] as const;

/**
 * Type for line widths
 */
export type LineWidthOption = (typeof LINE_WIDTHS)[number];

/**
 * SVG stroke-dasharray values for each line style
 */
export const LINE_STYLE_DASHARRAY: Record<LineStyle, string> = {
	solid: 'none',
	dashed: '8,4',
	dotted: '2,4',
	dashdot: '8,4,2,4'
};

// =============================================================================
// Plottable Types
// =============================================================================

/**
 * Base interface shared by all plottable elements
 */
export interface PlottableBase {
	/** Unique identifier for this plottable */
	readonly id: string;
	/** Display color (CSS color string) */
	readonly color: string;
	/** Whether this plottable is currently visible */
	readonly visible: boolean;
	/** Line width in pixels (1-5) */
	readonly lineWidth: number;
	/** Line style (solid, dashed, dotted, dashdot) */
	readonly lineStyle: LineStyle;
}

/**
 * Explicit function of the form y = f(x)
 *
 * Examples: y = x^2, y = sin(x), y = 2x + 1
 */
export interface ExplicitFunction extends PlottableBase {
	readonly type: 'explicit';
	/** Original LaTeX expression entered by the user */
	readonly latex: string;
	/** Parsed AST for evaluation (undefined if parse failed) */
	readonly ast: MathNode | undefined;
	/** Parse error message (undefined if parsing succeeded) */
	readonly parseError: string | undefined;
	/** Variable name (default: 'x') */
	readonly variable: string;
}

/**
 * Union type for all plottable elements
 *
 * This is designed to be extensible. Future types:
 * - ImplicitFunction: F(x, y) = 0
 * - ParametricCurve: x(t), y(t)
 * - PolarFunction: r = f(theta)
 */
export type Plottable = ExplicitFunction;

/**
 * Type guard to check if a plottable is an explicit function
 */
export function isExplicitFunction(p: Plottable): p is ExplicitFunction {
	return p.type === 'explicit';
}

// =============================================================================
// Viewport Types
// =============================================================================

/**
 * Defines the visible mathematical coordinate range
 *
 * The viewport uses mathematical coordinates where:
 * - x increases left to right
 * - y increases bottom to top
 */
export interface Viewport {
	/** Minimum x value (left edge) */
	readonly xMin: number;
	/** Maximum x value (right edge) */
	readonly xMax: number;
	/** Minimum y value (bottom edge) */
	readonly yMin: number;
	/** Maximum y value (top edge) */
	readonly yMax: number;
}

/**
 * Derived viewport metrics for convenience
 */
export interface ViewportMetrics {
	/** Width in math units (xMax - xMin) */
	readonly width: number;
	/** Height in math units (yMax - yMin) */
	readonly height: number;
	/** Center x coordinate */
	readonly centerX: number;
	/** Center y coordinate */
	readonly centerY: number;
}

// =============================================================================
// Graph State Types
// =============================================================================

/**
 * Current version of the graph state schema
 * Increment when making breaking changes to the state structure
 */
export const GRAPH_STATE_VERSION = 1;

/**
 * Complete graph state for serialization (localStorage)
 *
 * This structure is designed to be:
 * - Versionable for migration support
 * - JSON-serializable
 * - Restorable from localStorage
 */
export interface GraphState {
	/** Schema version for migration support */
	readonly version: number;
	/** Current viewport */
	readonly viewport: Viewport;
	/** Whether the grid is visible */
	readonly showGrid: boolean;
	/** List of functions to plot */
	readonly functions: readonly ExplicitFunctionState[];
}

/**
 * Serializable function state (without AST)
 *
 * The AST is regenerated from latex on load since MathNode
 * is not JSON-serializable.
 */
export interface ExplicitFunctionState {
	readonly id: string;
	readonly type: 'explicit';
	readonly latex: string;
	readonly color: string;
	readonly visible: boolean;
	readonly lineWidth: number;
	readonly lineStyle: LineStyle;
	readonly variable: string;
}

// =============================================================================
// Analysis Types
// =============================================================================

/**
 * A root (zero) of a function where f(x) = 0
 */
export interface Root {
	/** The x-coordinate where f(x) = 0 */
	readonly x: number;
	/** The function ID this root belongs to */
	readonly functionId: string;
	/** Confidence score (0-1), lower means less certain */
	readonly confidence: number;
}

/**
 * A local extremum (minimum or maximum) of a function
 */
export interface Extremum {
	/** The x-coordinate of the extremum */
	readonly x: number;
	/** The y-coordinate (f(x)) of the extremum */
	readonly y: number;
	/** Whether this is a minimum or maximum */
	readonly type: 'min' | 'max';
	/** The function ID this extremum belongs to */
	readonly functionId: string;
	/** Confidence score (0-1), lower means less certain */
	readonly confidence: number;
}

/**
 * A vertical asymptote where f(x) → ±∞
 */
export interface VerticalAsymptote {
	/** The x-coordinate of the asymptote */
	readonly x: number;
	/** The function ID this asymptote belongs to */
	readonly functionId: string;
	/** Behavior: 'positive' means both sides → +∞, 'negative' means both → -∞, 'both' means different */
	readonly behavior: 'positive' | 'negative' | 'both';
}

/**
 * A horizontal asymptote where f(x) → y as x → ±∞
 */
export interface HorizontalAsymptote {
	/** The y-value of the asymptote */
	readonly y: number;
	/** The function ID this asymptote belongs to */
	readonly functionId: string;
	/** Direction: 'left' means as x → -∞, 'right' means as x → +∞, 'both' means both directions */
	readonly direction: 'left' | 'right' | 'both';
}

/**
 * An oblique (slant) asymptote y = mx + b as x → ±∞
 */
export interface ObliqueAsymptote {
	/** The slope of the asymptote */
	readonly m: number;
	/** The y-intercept of the asymptote */
	readonly b: number;
	/** The function ID this asymptote belongs to */
	readonly functionId: string;
	/** Direction: 'left' means as x → -∞, 'right' means as x → +∞, 'both' means both directions */
	readonly direction: 'left' | 'right' | 'both';
}

/**
 * Complete analysis result for a function
 */
export interface FunctionAnalysis {
	/** The function ID this analysis is for */
	readonly functionId: string;
	/** Roots (zeros) found in viewport */
	readonly roots: readonly Root[];
	/** Local extrema (min/max) found in viewport */
	readonly extrema: readonly Extremum[];
	/** Vertical asymptotes detected */
	readonly verticalAsymptotes: readonly VerticalAsymptote[];
	/** Horizontal asymptotes detected */
	readonly horizontalAsymptotes: readonly HorizontalAsymptote[];
	/** Oblique asymptotes detected */
	readonly obliqueAsymptotes: readonly ObliqueAsymptote[];
}

// =============================================================================
// Sampling Types
// =============================================================================

/**
 * A 2D point in mathematical coordinates
 */
export interface Point {
	readonly x: number;
	readonly y: number;
}

/**
 * Result of sampling a function over an interval
 *
 * Contains the sampled points and indices where discontinuities
 * were detected (for breaking the path in SVG rendering).
 */
export interface SampledCurve {
	/** Sampled points in order */
	readonly points: readonly Point[];
	/**
	 * Indices in the points array where discontinuities occur
	 *
	 * A discontinuity at index i means there should be a path break
	 * between points[i-1] and points[i].
	 */
	readonly discontinuityIndices: readonly number[];
}

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * Zod schema for viewport validation
 *
 * Constraints:
 * - All values must be finite numbers
 * - xMin must be less than xMax
 * - yMin must be less than yMax
 * - Reasonable bounds to prevent rendering issues
 */
export const viewportSchema = z
	.object({
		xMin: z
			.number()
			.finite('xMin must be a finite number')
			.min(-1e10, 'xMin is too small')
			.max(1e10, 'xMin is too large'),
		xMax: z
			.number()
			.finite('xMax must be a finite number')
			.min(-1e10, 'xMax is too small')
			.max(1e10, 'xMax is too large'),
		yMin: z
			.number()
			.finite('yMin must be a finite number')
			.min(-1e10, 'yMin is too small')
			.max(1e10, 'yMin is too large'),
		yMax: z
			.number()
			.finite('yMax must be a finite number')
			.min(-1e10, 'yMax is too small')
			.max(1e10, 'yMax is too large')
	})
	.refine((data) => data.xMin < data.xMax, {
		message: 'xMin must be less than xMax',
		path: ['xMin']
	})
	.refine((data) => data.yMin < data.yMax, {
		message: 'yMin must be less than yMax',
		path: ['yMin']
	});

/**
 * Zod schema for line style validation
 */
const lineStyleSchema = z.enum(LINE_STYLES);

/**
 * Zod schema for explicit function state (serializable)
 */
const explicitFunctionStateSchema = z.object({
	id: z.string().uuid('Function ID must be a valid UUID'),
	type: z.literal('explicit'),
	latex: z.string().max(1000, 'LaTeX expression too long (max 1000 chars)'),
	color: z.string().min(1, 'Color is required').max(50, 'Color string too long'),
	visible: z.boolean(),
	lineWidth: z
		.number()
		.int('Line width must be an integer')
		.min(1, 'Line width minimum is 1')
		.max(5, 'Line width maximum is 5'),
	lineStyle: lineStyleSchema.default('solid'),
	variable: z
		.string()
		.min(1, 'Variable name is required')
		.max(10, 'Variable name too long')
		.regex(/^[a-zA-Z][a-zA-Z0-9]*$/, 'Invalid variable name')
});

/**
 * Zod schema for complete graph state (localStorage validation)
 *
 * Constraints:
 * - Version must match current version
 * - Maximum 20 functions (prevents performance issues)
 * - Valid viewport
 */
export const graphStateSchema = z.object({
	version: z
		.number()
		.int('Version must be an integer')
		.min(1, 'Version must be at least 1')
		.max(GRAPH_STATE_VERSION, `Unsupported version (max ${GRAPH_STATE_VERSION})`),
	viewport: viewportSchema,
	showGrid: z.boolean().default(true),
	functions: z.array(explicitFunctionStateSchema).max(20, 'Too many functions (max 20)').default([])
});

// =============================================================================
// Type Inference from Schemas
// =============================================================================

/** Inferred type from viewportSchema */
export type ViewportInput = z.infer<typeof viewportSchema>;

/** Inferred type from graphStateSchema */
export type GraphStateInput = z.infer<typeof graphStateSchema>;
