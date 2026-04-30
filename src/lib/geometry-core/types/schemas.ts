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
		fillOpacity: z.number().min(0).max(1).optional(),
		render: z.enum(['normal', 'rough']).optional(),
		roughness: z.number().min(0).max(5).optional(),
		roughSeed: z.number().int().optional(),
		roughBowing: z.number().min(0).max(20).optional(),
		roughFillStyle: z
			.enum(['hachure', 'solid', 'zigzag', 'cross-hatch', 'dots', 'dashed'])
			.optional(),
		roughPreserveVertices: z.boolean().optional()
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
	draggable: z.boolean().default(true),
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

const intersectionLCSchema = baseElementSchema.extend({
	type: z.literal('intersectionLC'),
	lineId: z.string().min(1),
	circleId: z.string().min(1),
	index: z.union([z.literal(0), z.literal(1)]),
	dependsOn: z.tuple([z.string(), z.string()])
});

const intersectionCCSchema = baseElementSchema.extend({
	type: z.literal('intersectionCC'),
	circle1Id: z.string().min(1),
	circle2Id: z.string().min(1),
	index: z.union([z.literal(0), z.literal(1)]),
	dependsOn: z.tuple([z.string(), z.string()])
});

const intersectionLQSchema = baseElementSchema.extend({
	type: z.literal('intersectionLQ'),
	lineId: z.string().min(1),
	curveId: z.string().min(1),
	index: z.union([z.literal(0), z.literal(1)]),
	dependsOn: z.tuple([z.string(), z.string()])
});

const intersectionQQSchema = baseElementSchema.extend({
	type: z.literal('intersectionQQ'),
	curve1Id: z.string().min(1),
	curve2Id: z.string().min(1),
	index: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
	dependsOn: z.tuple([z.string(), z.string()])
});

const intersectionLFSchema = baseElementSchema.extend({
	type: z.literal('intersectionLF'),
	lineId: z.string().min(1),
	functionId: z.string().min(1),
	// No upper bound: functions can have arbitrarily many intersections in the window
	index: z.number().int().min(0),
	xMin: z.number().finite(),
	xMax: z.number().finite(),
	dependsOn: z.tuple([z.string(), z.string()])
});

const intersectionFFSchema = baseElementSchema.extend({
	type: z.literal('intersectionFF'),
	function1Id: z.string().min(1),
	function2Id: z.string().min(1),
	// No upper bound: functions can have arbitrarily many intersections in the window
	index: z.number().int().min(0),
	xMin: z.number().finite(),
	xMax: z.number().finite(),
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

const textSchema = baseElementSchema.extend({
	type: z.literal('text'),
	template: z.string(),
	scalarRefs: z.array(z.string()),
	anchorId: z.string().min(1).optional(),
	anchorOffset: z.object({ dx: z.number().finite(), dy: z.number().finite() }).optional(),
	position: z.object({ x: z.number().finite(), y: z.number().finite() }).optional(),
	autoPosition: z.enum(['midpoint', 'bisector', 'centroid']).optional(),
	autoTargetIds: z.array(z.string().min(1)).optional(),
	dependsOn: z.array(z.string())
});

const mathTextSchema = baseElementSchema.extend({
	type: z.literal('mathText'),
	template: z.string(),
	scalarRefs: z.array(z.string()),
	anchorId: z.string().min(1).optional(),
	anchorOffset: z.object({ dx: z.number().finite(), dy: z.number().finite() }).optional(),
	position: z.object({ x: z.number().finite(), y: z.number().finite() }).optional(),
	autoPosition: z.enum(['midpoint', 'bisector', 'centroid']).optional(),
	autoTargetIds: z.array(z.string().min(1)).optional(),
	dependsOn: z.array(z.string())
});

const richTextSchema = baseElementSchema.extend({
	type: z.literal('richText'),
	template: z.string(),
	scalarRefs: z.array(z.string()),
	anchorId: z.string().min(1).optional(),
	anchorOffset: z.object({ dx: z.number().finite(), dy: z.number().finite() }).optional(),
	position: z.object({ x: z.number().finite(), y: z.number().finite() }).optional(),
	autoPosition: z.enum(['midpoint', 'bisector', 'centroid']).optional(),
	autoTargetIds: z.array(z.string().min(1)).optional(),
	dependsOn: z.array(z.string())
});

const imageSchema = baseElementSchema.extend({
	type: z.literal('image'),
	url: z.string().min(1),
	width: z.number().nonnegative(),
	height: z.number().positive().optional(),
	anchorId: z.string().min(1).optional(),
	anchorOffset: z.object({ dx: z.number().finite(), dy: z.number().finite() }).optional(),
	position: z.object({ x: z.number().finite(), y: z.number().finite() }).optional(),
	point1Id: z.string().min(1).optional(),
	point2Id: z.string().min(1).optional(),
	layer: z.enum(['fond', 'avant']).optional(),
	rotation: z.number().finite().optional(),
	flipped: z.boolean().optional(),
	dependsOn: z.array(z.string())
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

const pointOnCurveSchema = baseElementSchema.extend({
	type: z.literal('pointOnCurve'),
	functionId: z.string().min(1),
	x0: geoValueSchema,
	draggable: z.boolean().default(true),
	dependsOn: z.tuple([z.string().min(1)])
});

const tangentLineSchema = baseElementSchema.extend({
	type: z.literal('tangentLine'),
	functionId: z.string().min(1),
	pointOnCurveId: z.string().min(1).optional(),
	x0: geoValueSchema.optional(),
	dependsOn: z.array(z.string().min(1)).min(1)
});

const functionSchema = baseElementSchema.extend({
	type: z.literal('function'),
	equation: z.string().min(1),
	dependsOn: z.tuple([])
});

export const geoElementSchema = z.discriminatedUnion('type', [
	freePointSchema,
	midpointSchema,
	intersectionLLSchema,
	intersectionLCSchema,
	intersectionCCSchema,
	intersectionLQSchema,
	intersectionQQSchema,
	intersectionLFSchema,
	intersectionFFSchema,
	reflectedPointSchema,
	rotatedPointSchema,
	translatedPointSchema,
	dilatedPointSchema,
	reflectedOverLineSchema,
	angleMarkSchema,
	segmentMarkSchema,
	textSchema,
	mathTextSchema,
	richTextSchema,
	imageSchema,
	segmentSchema,
	lineSchema,
	raySchema,
	circleByRadiusSchema,
	circleByPointSchema,
	arcByAnglesSchema,
	arcByPointsSchema,
	polygonSchema,
	functionSchema,
	pointOnCurveSchema,
	tangentLineSchema
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
