/**
 * Shared viewport types used by geometry-core and grapheur.
 *
 * Extracted from grapheur/types.ts — these are generic 2D visualization types.
 */

import { z } from 'zod';

// =============================================================================
// Point
// =============================================================================

/**
 * A 2D point in numeric coordinates (for SVG rendering, sampling, etc.)
 */
export interface Point {
	readonly x: number;
	readonly y: number;
}

// =============================================================================
// Viewport
// =============================================================================

/**
 * Defines the visible mathematical coordinate range.
 *
 * The viewport uses mathematical coordinates where:
 * - x increases left to right
 * - y increases bottom to top
 */
export interface Viewport {
	readonly xMin: number;
	readonly xMax: number;
	readonly yMin: number;
	readonly yMax: number;
}

/**
 * Derived viewport metrics for convenience.
 */
export interface ViewportMetrics {
	readonly width: number;
	readonly height: number;
	readonly centerX: number;
	readonly centerY: number;
}

// =============================================================================
// Sampled Curve
// =============================================================================

/**
 * Result of sampling a function/curve over an interval.
 *
 * Contains the sampled points and indices where discontinuities
 * were detected (for breaking the path in SVG rendering).
 */
export interface SampledCurve {
	readonly points: readonly Point[];
	readonly discontinuityIndices: readonly number[];
}

// =============================================================================
// Line Styles
// =============================================================================

export const LINE_STYLES = ['solid', 'dashed', 'dotted', 'dashdot'] as const;
export type LineStyle = (typeof LINE_STYLES)[number];

export const LINE_WIDTHS = [1, 2, 3, 4, 5] as const;
export type LineWidthOption = (typeof LINE_WIDTHS)[number];

export const LINE_STYLE_DASHARRAY: Record<LineStyle, string> = {
	solid: 'none',
	dashed: '8,4',
	dotted: '2,4',
	dashdot: '8,4,2,4'
};

// =============================================================================
// Zod Schemas
// =============================================================================

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

export type ViewportInput = z.infer<typeof viewportSchema>;
