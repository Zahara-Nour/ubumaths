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
import {
	DEFAULT_COBWEB_STEPS,
	DEFAULT_FIRST_TERM_MAX,
	DEFAULT_FIRST_TERM_MIN,
	MAX_SEQUENCE_TERMS
} from '$lib/grapheur/sequence';
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
	/**
	 * Whether the derivative curve is drawn alongside.
	 *
	 * It follows the function rather than standing on its own: editing `f`
	 * redraws `f'`, which is the point — le signe de `f'` et les variations de
	 * `f` se lisent ensemble.
	 */
	readonly showDerivative: boolean;
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
	/**
	 * Name of the parameter driving the first term, when one does.
	 *
	 * Set, it takes over `firstTerm`: the parameter's own slider becomes the one
	 * that sweeps `u₀`, and the same value can drive several sequences at once.
	 */
	readonly firstTermParameter: string | null;
	/** Lower bound of the slider that drives the first term. */
	readonly firstTermMin: number;
	/** Upper bound of the slider that drives the first term. */
	readonly firstTermMax: number;
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
	readonly parameters: readonly Parameter[];
	readonly functions: readonly PlottableState[];
}

export interface ExplicitFunctionState {
	readonly id: string;
	readonly type: 'explicit';
	readonly latex: string;
	readonly showDerivative: boolean;
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
	readonly firstTermParameter: string | null;
	readonly firstTermMin: number;
	readonly firstTermMax: number;
	readonly representation: SequenceRepresentation;
	readonly cobwebSteps: number;
	readonly color: string;
	readonly visible: boolean;
	readonly lineWidth: number;
	readonly lineStyle: LineStyle;
}

export type PlottableState = ExplicitFunctionState | SequenceState;

// =============================================================================
// Parameters
// =============================================================================

/**
 * A named constant the user can sweep with a slider.
 *
 * Referenced by its name inside any expression — `ax + b`, `u_n + a` — and
 * substituted before evaluation, so the curve redraws as the slider moves.
 */
export interface Parameter {
	readonly id: string;
	/** Single lowercase letter, never a reserved one. */
	readonly name: string;
	readonly value: number;
	readonly min: number;
	readonly max: number;
}

/** Names an expression already gives a meaning to, so unusable as parameters. */
export const RESERVED_PARAMETER_NAMES: ReadonlySet<string> = new Set(['x', 'n', 'e', 'pi', 'i']);

/** Letters offered to new parameters, in order. */
export const PARAMETER_NAMES = ['a', 'b', 'c', 'k', 'm', 'p', 'q', 'r'] as const;

/** Default bounds of a new parameter's slider. */
export const DEFAULT_PARAMETER_MIN = -10;
export const DEFAULT_PARAMETER_MAX = 10;

/** Steps the parameter slider offers between its bounds. */
export const PARAMETER_SLIDER_STEPS = 200;

/**
 * Pick the first unused letter for a new parameter.
 *
 * Falls back to the first letter when all are taken — a graph with eight
 * parameters is already past what the panel can show usefully.
 */
export function nextParameterName(used: readonly string[]): string {
	return PARAMETER_NAMES.find((name) => !used.includes(name)) ?? PARAMETER_NAMES[0];
}

// =============================================================================
// Analysis Types (grapheur-specific)
// =============================================================================

export interface Root {
	readonly x: number;
	readonly functionId: string;
	readonly confidence: number;
	/**
	 * Symbolic abscissa, when the root came from exact solving — `\sqrt{2}`
	 * rather than `1,414`. Absent when only the numeric sweep found the point.
	 */
	readonly exactX?: MathNode;
}

export interface Extremum {
	readonly x: number;
	readonly y: number;
	readonly type: 'min' | 'max';
	readonly functionId: string;
	readonly confidence: number;
	/** Symbolic abscissa, when the extremum came from exact solving. */
	readonly exactX?: MathNode;
	/** Symbolic ordinate, simplified, when it is known exactly. */
	readonly exactY?: MathNode;
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
	// Absent des états écrits avant la courbe dérivée.
	showDerivative: z.boolean().default(false),
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
	// Absent des états écrits avant l'arrivée des paramètres.
	firstTermParameter: z
		.string()
		.regex(/^[a-z]$/, 'Parameter name must be a single lowercase letter')
		.nullable()
		.default(null),
	// Bornes du curseur du premier terme. Absentes des états écrits avant leur
	// introduction : la valeur par défaut les rétablit sans casse.
	firstTermMin: z
		.number()
		.finite('Slider bound must be finite')
		.min(-1e9, 'Slider bound out of range')
		.max(1e9, 'Slider bound out of range')
		.default(DEFAULT_FIRST_TERM_MIN),
	firstTermMax: z
		.number()
		.finite('Slider bound must be finite')
		.min(-1e9, 'Slider bound out of range')
		.max(1e9, 'Slider bound out of range')
		.default(DEFAULT_FIRST_TERM_MAX),
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

const parameterSchema = z.object({
	id: z.string().uuid('Parameter ID must be a valid UUID'),
	name: z
		.string()
		.regex(/^[a-z]$/, 'Parameter name must be a single lowercase letter')
		.refine((n) => !RESERVED_PARAMETER_NAMES.has(n), 'This name is reserved'),
	value: z.number().finite().min(-1e9).max(1e9),
	min: z.number().finite().min(-1e9).max(1e9),
	max: z.number().finite().min(-1e9).max(1e9)
});

export const graphStateSchema = z.object({
	version: z
		.number()
		.int('Version must be an integer')
		.min(1, 'Version must be at least 1')
		.max(GRAPH_STATE_VERSION, `Unsupported version (max ${GRAPH_STATE_VERSION})`),
	viewport: sharedViewportSchema,
	showGrid: z.boolean().default(true),
	// Absents des états écrits avant l'arrivée des paramètres : le défaut les
	// rétablit sans casse.
	parameters: z.array(parameterSchema).max(20, 'Too many parameters').default([]),
	functions: z.array(plottableStateSchema).max(20, 'Too many plots (max 20)').default([])
});

export type GraphStateInput = z.infer<typeof graphStateSchema>;
