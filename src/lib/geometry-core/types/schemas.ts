/**
 * Zod schemas for geometry-core serialization.
 *
 * GeoValue exact values are serialized as LaTeX strings (via toLatex/parseLatex).
 * This is the canonical string representation of MathNode.
 */

import { z } from 'zod';
import { toLatex, parseLatex } from '$lib/mathAST';
import { viewportSchema } from '../viewport/types';
import type { GeoValue } from './geo-value';

// =============================================================================
// GeoValue schema
// =============================================================================

const geoExactSchema = z.object({
	kind: z.literal('exact'),
	latex: z.string().min(1, 'LaTeX expression cannot be empty').max(1000)
});

const geoNumericSchema = z.object({
	kind: z.literal('numeric'),
	value: z.number().finite('Coordinate must be finite')
});

export const geoValueSchema = z.discriminatedUnion('kind', [geoExactSchema, geoNumericSchema]);

export type GeoValueSerialized = z.infer<typeof geoValueSchema>;

// =============================================================================
// GeoPoint schema (Vec2<GeoValue>)
// =============================================================================

export const geoPointSchema = z.object({
	x: geoValueSchema,
	y: geoValueSchema
});

// =============================================================================
// Style schema
// =============================================================================

export const geoStyleSchema = z
	.object({
		color: z.string().min(1).max(50).optional(),
		opacity: z.number().min(0).max(1).optional(),
		strokeWidth: z.number().min(0).optional(),
		dash: z.enum(['solid', 'dashed', 'dotted']).optional(),
		pointShape: z.enum(['dot', 'circle', 'cross', 'square']).optional(),
		pointSize: z.number().min(0).optional(),
		fillColor: z.string().min(1).max(50).optional(),
		fillOpacity: z.number().min(0).max(1).optional()
	})
	.optional();

// =============================================================================
// Element schemas
// =============================================================================

const baseElementSchema = z.object({
	id: z.string().min(1),
	label: z.string().optional(),
	color: z.string().min(1).max(50),
	visible: z.boolean(),
	style: geoStyleSchema,
	labelOffset: z
		.object({
			dx: z.number().finite(),
			dy: z.number().finite()
		})
		.optional()
});

const freePointSchema = baseElementSchema.extend({
	type: z.literal('freePoint'),
	position: geoPointSchema,
	dependsOn: z.tuple([])
});

const midpointSchema = baseElementSchema.extend({
	type: z.literal('midpoint'),
	point1Id: z.string().min(1),
	point2Id: z.string().min(1),
	dependsOn: z.tuple([z.string(), z.string()])
});

const segmentSchema = baseElementSchema.extend({
	type: z.literal('segment'),
	startId: z.string().min(1),
	endId: z.string().min(1),
	dependsOn: z.tuple([z.string(), z.string()])
});

const lineSchema = baseElementSchema.extend({
	type: z.literal('line'),
	point1Id: z.string().min(1),
	point2Id: z.string().min(1),
	dependsOn: z.tuple([z.string(), z.string()])
});

const raySchema = baseElementSchema.extend({
	type: z.literal('ray'),
	originId: z.string().min(1),
	throughId: z.string().min(1),
	dependsOn: z.tuple([z.string(), z.string()])
});

const circleByRadiusSchema = baseElementSchema.extend({
	type: z.literal('circleByRadius'),
	centerId: z.string().min(1),
	radius: geoValueSchema,
	dependsOn: z.tuple([z.string()])
});

const circleByPointSchema = baseElementSchema.extend({
	type: z.literal('circleByPoint'),
	centerId: z.string().min(1),
	edgePointId: z.string().min(1),
	dependsOn: z.tuple([z.string(), z.string()])
});

const intersectionLLSchema = baseElementSchema.extend({
	type: z.literal('intersectionLL'),
	line1Id: z.string().min(1),
	line2Id: z.string().min(1),
	dependsOn: z.tuple([z.string(), z.string()])
});

const reflectedPointSchema = baseElementSchema.extend({
	type: z.literal('reflectedPoint'),
	sourceId: z.string().min(1),
	centerId: z.string().min(1),
	dependsOn: z.tuple([z.string(), z.string()])
});

const rotatedPointSchema = baseElementSchema.extend({
	type: z.literal('rotatedPoint'),
	sourceId: z.string().min(1),
	centerId: z.string().min(1),
	angle: geoValueSchema,
	dependsOn: z.tuple([z.string(), z.string()])
});

const translatedPointSchema = baseElementSchema.extend({
	type: z.literal('translatedPoint'),
	sourceId: z.string().min(1),
	vectorStartId: z.string().min(1),
	vectorEndId: z.string().min(1),
	dependsOn: z.tuple([z.string(), z.string(), z.string()])
});

const dilatedPointSchema = baseElementSchema.extend({
	type: z.literal('dilatedPoint'),
	sourceId: z.string().min(1),
	centerId: z.string().min(1),
	factor: geoValueSchema,
	dependsOn: z.tuple([z.string(), z.string()])
});

const reflectedOverLineSchema = baseElementSchema.extend({
	type: z.literal('reflectedOverLine'),
	sourceId: z.string().min(1),
	linePoint1Id: z.string().min(1),
	linePoint2Id: z.string().min(1),
	dependsOn: z.tuple([z.string(), z.string(), z.string()])
});

const angleMarkSchema = baseElementSchema.extend({
	type: z.literal('angleMark'),
	p1Id: z.string().min(1),
	vertexId: z.string().min(1),
	p2Id: z.string().min(1),
	arcCount: z.union([z.literal(1), z.literal(2), z.literal(3)]),
	rightAngle: z.boolean(),
	dependsOn: z.tuple([z.string(), z.string(), z.string()])
});

const segmentMarkSchema = baseElementSchema.extend({
	type: z.literal('segmentMark'),
	startId: z.string().min(1),
	endId: z.string().min(1),
	markCount: z.union([z.literal(1), z.literal(2), z.literal(3)]),
	dependsOn: z.tuple([z.string(), z.string()])
});

const measureSchema = baseElementSchema.extend({
	type: z.literal('measure'),
	measureType: z.enum(['distance', 'angle', 'area']),
	targetIds: z.array(z.string().min(1)).min(2),
	format: z.enum(['exact', 'approx', 'degrees', 'radians']),
	dependsOn: z.array(z.string().min(1)).min(2)
});

const arcByAnglesSchema = baseElementSchema.extend({
	type: z.literal('arcByAngles'),
	centerId: z.string().min(1),
	radius: geoValueSchema,
	startAngle: geoValueSchema,
	endAngle: geoValueSchema,
	dependsOn: z.tuple([z.string()])
});

const arcByPointsSchema = baseElementSchema.extend({
	type: z.literal('arcByPoints'),
	startId: z.string().min(1),
	centerId: z.string().min(1),
	endId: z.string().min(1),
	dependsOn: z.tuple([z.string(), z.string(), z.string()])
});

const polygonSchema = baseElementSchema.extend({
	type: z.literal('polygon'),
	dependsOn: z.array(z.string().min(1)).min(3, 'Polygon needs at least 3 vertices')
});

export const geoElementSchema = z.discriminatedUnion('type', [
	freePointSchema,
	midpointSchema,
	intersectionLLSchema,
	reflectedPointSchema,
	rotatedPointSchema,
	translatedPointSchema,
	dilatedPointSchema,
	reflectedOverLineSchema,
	angleMarkSchema,
	segmentMarkSchema,
	measureSchema,
	segmentSchema,
	lineSchema,
	raySchema,
	circleByRadiusSchema,
	circleByPointSchema,
	arcByAnglesSchema,
	arcByPointsSchema,
	polygonSchema
]);

export type GeoElementSerialized = z.infer<typeof geoElementSchema>;

// =============================================================================
// Figure state schema
// =============================================================================

export const FIGURE_STATE_VERSION = 1;

export const figureStateSchema = z.object({
	version: z.number().int().min(1).max(FIGURE_STATE_VERSION),
	viewport: viewportSchema,
	elements: z.array(geoElementSchema).max(500, 'Too many elements (max 500)')
});

export type FigureStateSerialized = z.infer<typeof figureStateSchema>;

// =============================================================================
// Serialization helpers
// =============================================================================

/** Serialize a GeoValue to a Zod-compatible shape (LaTeX for exact values). */
export function serializeGeoValue(v: GeoValue): GeoValueSerialized {
	if (v.kind === 'exact') {
		return { kind: 'exact', latex: toLatex(v.node) };
	}
	return { kind: 'numeric', value: v.value };
}

/** Deserialize a validated GeoValue shape back to a GeoValue. */
export function deserializeGeoValue(s: GeoValueSerialized): GeoValue {
	if (s.kind === 'exact') {
		const result = parseLatex(s.latex);
		return { kind: 'exact', node: result };
	}
	return { kind: 'numeric', value: s.value };
}
