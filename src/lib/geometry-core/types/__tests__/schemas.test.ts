import { describe, it, expect } from 'vitest';
import {
	geoValueSchema,
	geoElementSchema,
	figureStateSchema,
	serializeGeoValue,
	deserializeGeoValue
} from '../schemas';
import { exact, numeric } from '../geo-value';
import { geoToNumber } from '../../compute/to-number';
import { number, sqrt, fraction } from '$lib/mathAST';

// =============================================================================
// geoValueSchema
// =============================================================================

describe('geoValueSchema', () => {
	it('validates exact value', () => {
		const result = geoValueSchema.safeParse({ kind: 'exact', latex: '5' });
		expect(result.success).toBe(true);
	});

	it('validates numeric value', () => {
		const result = geoValueSchema.safeParse({ kind: 'numeric', value: 3.14 });
		expect(result.success).toBe(true);
	});

	it('rejects exact with empty latex', () => {
		const result = geoValueSchema.safeParse({ kind: 'exact', latex: '' });
		expect(result.success).toBe(false);
	});

	it('rejects numeric with NaN', () => {
		const result = geoValueSchema.safeParse({ kind: 'numeric', value: NaN });
		expect(result.success).toBe(false);
	});

	it('rejects numeric with Infinity', () => {
		const result = geoValueSchema.safeParse({ kind: 'numeric', value: Infinity });
		expect(result.success).toBe(false);
	});

	it('rejects missing kind', () => {
		const result = geoValueSchema.safeParse({ value: 5 });
		expect(result.success).toBe(false);
	});

	it('rejects unknown kind', () => {
		const result = geoValueSchema.safeParse({ kind: 'unknown', value: 5 });
		expect(result.success).toBe(false);
	});
});

// =============================================================================
// serializeGeoValue / deserializeGeoValue round-trip
// =============================================================================

describe('GeoValue serialization round-trip', () => {
	it('round-trips exact integer', () => {
		const original = exact(number(5));
		const serialized = serializeGeoValue(original);
		expect(serialized.kind).toBe('exact');
		const restored = deserializeGeoValue(serialized);
		expect(restored.kind).toBe('exact');
		expect(geoToNumber(restored)).toBe(5);
	});

	it('round-trips exact fraction', () => {
		const original = exact(fraction(number(1), number(3)));
		const serialized = serializeGeoValue(original);
		const restored = deserializeGeoValue(serialized);
		expect(geoToNumber(restored)).toBeCloseTo(1 / 3, 10);
	});

	it('round-trips exact sqrt', () => {
		const original = exact(sqrt(number(2)));
		const serialized = serializeGeoValue(original);
		expect(serialized.kind).toBe('exact');
		const restored = deserializeGeoValue(serialized);
		expect(geoToNumber(restored)).toBeCloseTo(Math.SQRT2, 10);
	});

	it('round-trips numeric', () => {
		const original = numeric(3.14);
		const serialized = serializeGeoValue(original);
		expect(serialized).toEqual({ kind: 'numeric', value: 3.14 });
		const restored = deserializeGeoValue(serialized);
		expect(restored).toEqual({ kind: 'numeric', value: 3.14 });
	});

	it('round-trips numeric zero', () => {
		const serialized = serializeGeoValue(numeric(0));
		const restored = deserializeGeoValue(serialized);
		expect(geoToNumber(restored)).toBe(0);
	});

	it('serialized exact passes schema validation', () => {
		const serialized = serializeGeoValue(exact(sqrt(number(2))));
		expect(geoValueSchema.safeParse(serialized).success).toBe(true);
	});

	it('serialized numeric passes schema validation', () => {
		const serialized = serializeGeoValue(numeric(42));
		expect(geoValueSchema.safeParse(serialized).success).toBe(true);
	});
});

// =============================================================================
// geoElementSchema
// =============================================================================

describe('geoElementSchema', () => {
	it('validates freePoint', () => {
		const result = geoElementSchema.safeParse({
			type: 'freePoint',
			id: 'pt_1',
			color: '#000',
			visible: true,
			position: {
				x: { kind: 'exact', latex: '3' },
				y: { kind: 'numeric', value: 4 }
			},
			dependsOn: []
		});
		expect(result.success).toBe(true);
	});

	it('validates segment', () => {
		const result = geoElementSchema.safeParse({
			type: 'segment',
			id: 'seg_1',
			color: '#000',
			visible: true,
			startId: 'pt_1',
			endId: 'pt_2',
			dependsOn: ['pt_1', 'pt_2']
		});
		expect(result.success).toBe(true);
	});

	it('validates circleByRadius', () => {
		const result = geoElementSchema.safeParse({
			type: 'circleByRadius',
			id: 'circ_1',
			color: '#f00',
			visible: true,
			centerId: 'pt_1',
			radius: { kind: 'exact', latex: '5' },
			dependsOn: ['pt_1']
		});
		expect(result.success).toBe(true);
	});

	it('validates polygon with 3 vertices', () => {
		const result = geoElementSchema.safeParse({
			type: 'polygon',
			id: 'poly_1',
			color: '#0f0',
			visible: true,
			dependsOn: ['a', 'b', 'c']
		});
		expect(result.success).toBe(true);
	});

	it('rejects polygon with less than 3 vertices', () => {
		const result = geoElementSchema.safeParse({
			type: 'polygon',
			id: 'poly_1',
			color: '#0f0',
			visible: true,
			dependsOn: ['a', 'b']
		});
		expect(result.success).toBe(false);
	});

	it('rejects unknown type', () => {
		const result = geoElementSchema.safeParse({
			type: 'unknown',
			id: 'x',
			color: '#000',
			visible: true,
			dependsOn: []
		});
		expect(result.success).toBe(false);
	});

	it('rejects missing id', () => {
		const result = geoElementSchema.safeParse({
			type: 'freePoint',
			color: '#000',
			visible: true,
			position: { x: { kind: 'numeric', value: 0 }, y: { kind: 'numeric', value: 0 } },
			dependsOn: []
		});
		expect(result.success).toBe(false);
	});
});

// =============================================================================
// figureStateSchema
// =============================================================================

describe('figureStateSchema', () => {
	it('validates a minimal construction state', () => {
		const result = figureStateSchema.safeParse({
			version: 1,
			viewport: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
			elements: []
		});
		expect(result.success).toBe(true);
	});

	it('validates a construction with elements', () => {
		const result = figureStateSchema.safeParse({
			version: 1,
			viewport: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
			elements: [
				{
					type: 'freePoint',
					id: 'pt_1',
					color: '#000',
					visible: true,
					position: {
						x: { kind: 'exact', latex: '0' },
						y: { kind: 'exact', latex: '0' }
					},
					dependsOn: []
				}
			]
		});
		expect(result.success).toBe(true);
	});

	it('rejects invalid viewport', () => {
		const result = figureStateSchema.safeParse({
			version: 1,
			viewport: { xMin: 10, xMax: -10, yMin: -10, yMax: 10 },
			elements: []
		});
		expect(result.success).toBe(false);
	});

	it('rejects version 0', () => {
		const result = figureStateSchema.safeParse({
			version: 0,
			viewport: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
			elements: []
		});
		expect(result.success).toBe(false);
	});
});
