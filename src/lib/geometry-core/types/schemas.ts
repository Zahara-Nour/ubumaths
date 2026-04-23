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
// Element schemas
// =============================================================================

const baseElementSchema = z.object({
	id: z.string().min(1),
	label: z.string().optional(),
	color: z.string().min(1).max(50),
	visible: z.boolean()
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

const polygonSchema = baseElementSchema.extend({
	type: z.literal('polygon'),
	dependsOn: z.array(z.string().min(1)).min(3, 'Polygon needs at least 3 vertices')
});

export const geoElementSchema = z.discriminatedUnion('type', [
	freePointSchema,
	midpointSchema,
	segmentSchema,
	lineSchema,
	raySchema,
	circleByRadiusSchema,
	circleByPointSchema,
	polygonSchema
]);

export type GeoElementSerialized = z.infer<typeof geoElementSchema>;

// =============================================================================
// Figure state schema
// =============================================================================

export const CONSTRUCTION_STATE_VERSION = 1;

export const figureStateSchema = z.object({
	version: z.number().int().min(1).max(CONSTRUCTION_STATE_VERSION),
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
