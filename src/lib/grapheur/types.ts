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

export type Plottable = ExplicitFunction;

export function isExplicitFunction(p: Plottable): p is ExplicitFunction {
	return p.type === 'explicit';
}

// =============================================================================
// Graph State Types (grapheur-specific)
// =============================================================================

export const GRAPH_STATE_VERSION = 1;

export interface GraphState {
	readonly version: number;
	readonly viewport: Viewport;
	readonly showGrid: boolean;
	readonly functions: readonly ExplicitFunctionState[];
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

export const graphStateSchema = z.object({
	version: z
		.number()
		.int('Version must be an integer')
		.min(1, 'Version must be at least 1')
		.max(GRAPH_STATE_VERSION, `Unsupported version (max ${GRAPH_STATE_VERSION})`),
	viewport: sharedViewportSchema,
	showGrid: z.boolean().default(true),
	functions: z.array(explicitFunctionStateSchema).max(20, 'Too many functions (max 20)').default([])
});

export type GraphStateInput = z.infer<typeof graphStateSchema>;
