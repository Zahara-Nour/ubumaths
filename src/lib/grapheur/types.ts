/**
 * Grapheur Types - Type definitions and Zod schemas for the graphing calculator
 *
 * Shared types (Point, Viewport, ViewportMetrics, SampledCurve, LineStyle, etc.)
 * are re-exported from geometry-core/viewport. Grapheur-specific types stay here.
 */

import { z } from 'zod';
import type { MathNode } from '$lib/mathAST/types';
import {
	LINE_STYLES as SHARED_LINE_STYLES,
	viewportSchema as sharedViewportSchema
} from '$lib/geometry-core/viewport';
import type { LineStyle, Viewport } from '$lib/geometry-core/viewport';
import { DEFAULT_COBWEB_STEPS, MAX_SEQUENCE_TERMS } from '$lib/grapheur/sequence';
import type { SequenceMode } from '$lib/grapheur/sequence';

export type { SequenceMode, SequenceTerm } from '$lib/grapheur/sequence';

// =============================================================================
// Re-exports from geometry-core (shared types)
// =============================================================================

export type {
	Point,
	Viewport,
	ViewportMetrics,
	SampledCurve,
	LineStyle,
	LineWidthOption,
	ViewportInput
} from '$lib/geometry-core/viewport';

export {
	LINE_STYLES,
	LINE_WIDTHS,
	LINE_STYLE_DASHARRAY,
	viewportSchema
} from '$lib/geometry-core/viewport';

// =============================================================================
// Plottable Types (grapheur-specific)
// =============================================================================

export interface PlottableBase {
	readonly id: string;
	readonly color: string;
	readonly visible: boolean;
	readonly lineWidth: number;
	readonly lineStyle: LineStyle;
}

export interface ExplicitFunction extends PlottableBase {
	readonly type: 'explicit';
	readonly latex: string;
	readonly ast: MathNode | undefined;
	readonly parseError: string | undefined;
	readonly variable: string;
}

/**
 * How a sequence is drawn.
 *
 * The two are exclusive on purpose: the abscissa means the rank `n` in one and
 * the value `u_n` in the other, so superimposing them would put two
 * incompatible x-axes on the same grid.
 */
export type SequenceRepresentation = 'ranks' | 'cobweb';

/**
 * A numeric sequence, drawn either as a cloud of points (n, u_n) or, for a
 * first-order recurrence, as a staircase (cobweb) diagram.
 */
export interface SequencePlottable extends PlottableBase {
	readonly type: 'sequence';
	/** Sequence name, a single lowercase letter (u, v, w...). */
	readonly name: string;
	/** Explicit `u_n = f(n)` or first-order recurrence `u_{n+1} = f(u_n)`. */
	readonly mode: SequenceMode;
	/** Right-hand side of the definition only. */
	readonly latex: string;
	/** AST with `u_n` rewritten, ready to compile (undefined when invalid). */
	readonly ast: MathNode | undefined;
	readonly parseError: string | undefined;
	/** Whether the expression depends on `n` — a cobweb requires it to be false. */
	readonly usesIndex: boolean;
	/** Index of the first term (`n0`). */
	readonly firstIndex: number;
	/** Value of the first term; required for a recurrence, unused otherwise. */
	readonly firstTerm: number | null;
	/** Which of the two representations is drawn. */
	readonly representation: SequenceRepresentation;
	/** Number of staircase steps drawn, in cobweb representation. */
	readonly cobwebSteps: number;
}

export type Plottable = ExplicitFunction | SequencePlottable;

export function isExplicitFunction(p: Plottable): p is ExplicitFunction {
	return p.type === 'explicit';
}

export function isSequence(p: Plottable): p is SequencePlottable {
	return p.type === 'sequence';
}

/**
 * Whether the staircase representation is available for this sequence: only a
 * first-order recurrence whose function does not depend on the index defines a
 * single curve `y = f(x)` to bounce on.
 */
export function supportsCobweb(seq: SequencePlottable): boolean {
	return seq.mode === 'recurrence' && !seq.usesIndex && seq.ast !== undefined;
}

// =============================================================================
// Graph State Types (grapheur-specific)
// =============================================================================

/** Bumped to 2 when sequences were added; version 1 states still load. */
export const GRAPH_STATE_VERSION = 2;

export interface GraphState {
	readonly version: number;
	readonly viewport: Viewport;
	readonly showGrid: boolean;
	readonly functions: readonly PlottableState[];
}

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

export interface SequenceState {
	readonly id: string;
	readonly type: 'sequence';
	readonly name: string;
	readonly mode: SequenceMode;
	readonly latex: string;
	readonly firstIndex: number;
	readonly firstTerm: number | null;
	readonly representation: SequenceRepresentation;
	readonly cobwebSteps: number;
	readonly color: string;
	readonly visible: boolean;
	readonly lineWidth: number;
	readonly lineStyle: LineStyle;
}

export type PlottableState = ExplicitFunctionState | SequenceState;

// =============================================================================
// Analysis Types (grapheur-specific)
// =============================================================================

export interface Root {
	readonly x: number;
	readonly functionId: string;
	readonly confidence: number;
}

export interface Extremum {
	readonly x: number;
	readonly y: number;
	readonly type: 'min' | 'max';
	readonly functionId: string;
	readonly confidence: number;
}

export interface VerticalAsymptote {
	readonly x: number;
	readonly functionId: string;
	readonly behavior: 'positive' | 'negative' | 'both';
}

export interface HorizontalAsymptote {
	readonly y: number;
	readonly functionId: string;
	readonly direction: 'left' | 'right' | 'both';
}

export interface ObliqueAsymptote {
	readonly m: number;
	readonly b: number;
	readonly functionId: string;
	readonly direction: 'left' | 'right' | 'both';
}

export interface FunctionAnalysis {
	readonly functionId: string;
	readonly roots: readonly Root[];
	readonly extrema: readonly Extremum[];
	readonly verticalAsymptotes: readonly VerticalAsymptote[];
	readonly horizontalAsymptotes: readonly HorizontalAsymptote[];
	readonly obliqueAsymptotes: readonly ObliqueAsymptote[];
}

// =============================================================================
// Snapped Point Types (grapheur-specific)
// =============================================================================

export type SnappedPointType = 'root' | 'max' | 'min' | 'intersection';

export interface SnappedPoint {
	readonly x: number;
	readonly y: number;
	readonly type: SnappedPointType;
	readonly functionIds: readonly string[];
}

// =============================================================================
// Zod Schemas (grapheur-specific)
// =============================================================================

const lineStyleSchema = z.enum(SHARED_LINE_STYLES);

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

const sequenceStateSchema = z.object({
	id: z.string().uuid('Sequence ID must be a valid UUID'),
	type: z.literal('sequence'),
	name: z
		.string()
		.regex(/^[a-z]$/, 'Sequence name must be a single lowercase letter')
		.default('u'),
	mode: z.enum(['explicit', 'recurrence']),
	latex: z.string().max(1000, 'LaTeX expression too long (max 1000 chars)'),
	firstIndex: z
		.number()
		.int('First index must be an integer')
		.min(0, 'First index cannot be negative')
		.max(1000, 'First index too large (max 1000)'),
	firstTerm: z
		.number()
		.finite('First term must be finite')
		.min(-1e9, 'First term out of range')
		.max(1e9, 'First term out of range')
		.nullable(),
	representation: z.enum(['ranks', 'cobweb']).default('ranks'),
	cobwebSteps: z
		.number()
		.int('Step count must be an integer')
		.min(0, 'Step count cannot be negative')
		.max(MAX_SEQUENCE_TERMS, `Too many steps (max ${MAX_SEQUENCE_TERMS})`)
		.default(DEFAULT_COBWEB_STEPS),
	color: z.string().min(1, 'Color is required').max(50, 'Color string too long'),
	visible: z.boolean(),
	lineWidth: z
		.number()
		.int('Line width must be an integer')
		.min(1, 'Line width minimum is 1')
		.max(5, 'Line width maximum is 5'),
	lineStyle: lineStyleSchema.default('solid')
});

/** Version 1 states only contained explicit functions; they still validate here. */
const plottableStateSchema = z.discriminatedUnion('type', [
	explicitFunctionStateSchema,
	sequenceStateSchema
]);

export const graphStateSchema = z.object({
	version: z
		.number()
		.int('Version must be an integer')
		.min(1, 'Version must be at least 1')
		.max(GRAPH_STATE_VERSION, `Unsupported version (max ${GRAPH_STATE_VERSION})`),
	viewport: sharedViewportSchema,
	showGrid: z.boolean().default(true),
	functions: z.array(plottableStateSchema).max(20, 'Too many plots (max 20)').default([])
});

export type GraphStateInput = z.infer<typeof graphStateSchema>;
