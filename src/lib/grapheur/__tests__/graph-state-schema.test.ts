/**
 * Tests for the persisted grapheur state schema.
 *
 * The risk being covered is backward compatibility: sequences turned
 * `functions` into a discriminated union and bumped the state version, and a
 * student's localStorage still holds version 1 states made of functions only.
 */

import { describe, it, expect } from 'vitest';
import { GRAPH_STATE_VERSION, graphStateSchema } from '$lib/grapheur/types';

// =============================================================================
// Helpers
// =============================================================================

const VIEWPORT = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

const EXPLICIT_ENTRY = {
	id: '11111111-1111-4111-8111-111111111111',
	type: 'explicit',
	latex: 'x^2',
	color: '#ff0000',
	visible: true,
	lineWidth: 2,
	lineStyle: 'solid',
	variable: 'x'
};

const SEQUENCE_ENTRY = {
	id: '22222222-2222-4222-8222-222222222222',
	type: 'sequence',
	name: 'u',
	mode: 'recurrence',
	latex: '0.5u_n+3',
	firstIndex: 0,
	firstTerm: 8,
	representation: 'cobweb',
	cobwebSteps: 10,
	color: '#0000ff',
	visible: true,
	lineWidth: 2,
	lineStyle: 'solid'
};

// =============================================================================
// Tests
// =============================================================================

describe('graphStateSchema — backward compatibility (L4)', () => {
	it('still accepts a version 1 state made of functions only', () => {
		const result = graphStateSchema.safeParse({
			version: 1,
			viewport: VIEWPORT,
			showGrid: true,
			functions: [EXPLICIT_ENTRY]
		});

		expect(result.success).toBe(true);
		expect(result.data?.functions).toHaveLength(1);
		expect(result.data?.functions[0].type).toBe('explicit');
	});

	it('accepts the current version', () => {
		const result = graphStateSchema.safeParse({
			version: GRAPH_STATE_VERSION,
			viewport: VIEWPORT,
			showGrid: true,
			functions: []
		});

		expect(result.success).toBe(true);
	});

	it('rejects a version from the future', () => {
		const result = graphStateSchema.safeParse({
			version: GRAPH_STATE_VERSION + 1,
			viewport: VIEWPORT,
			showGrid: true,
			functions: []
		});

		expect(result.success).toBe(false);
	});
});

describe('graphStateSchema — sequences (N9)', () => {
	it('accepts a state mixing a function and a sequence', () => {
		const result = graphStateSchema.safeParse({
			version: GRAPH_STATE_VERSION,
			viewport: VIEWPORT,
			showGrid: true,
			functions: [EXPLICIT_ENTRY, SEQUENCE_ENTRY]
		});

		expect(result.success).toBe(true);
		expect(result.data?.functions.map((p) => p.type)).toEqual(['explicit', 'sequence']);
	});

	it('accepts a null first term (explicit sequence)', () => {
		const result = graphStateSchema.safeParse({
			version: GRAPH_STATE_VERSION,
			viewport: VIEWPORT,
			showGrid: true,
			functions: [{ ...SEQUENCE_ENTRY, mode: 'explicit', firstTerm: null }]
		});

		expect(result.success).toBe(true);
	});

	it('falls back to the ranks representation when the field is absent', () => {
		const withoutCobweb = { ...SEQUENCE_ENTRY };
		delete (withoutCobweb as Record<string, unknown>).representation;
		delete (withoutCobweb as Record<string, unknown>).cobwebSteps;

		const result = graphStateSchema.safeParse({
			version: GRAPH_STATE_VERSION,
			viewport: VIEWPORT,
			showGrid: true,
			functions: [withoutCobweb]
		});

		expect(result.success).toBe(true);
		const sequence = result.data?.functions[0];
		expect(sequence?.type).toBe('sequence');
		if (sequence?.type === 'sequence') {
			expect(sequence.representation).toBe('ranks');
			expect(sequence.cobwebSteps).toBeGreaterThan(0);
		}
	});

	it('rejects a multi-letter sequence name', () => {
		const result = graphStateSchema.safeParse({
			version: GRAPH_STATE_VERSION,
			viewport: VIEWPORT,
			showGrid: true,
			functions: [{ ...SEQUENCE_ENTRY, name: 'uu' }]
		});

		expect(result.success).toBe(false);
	});

	it('rejects an unknown definition mode', () => {
		const result = graphStateSchema.safeParse({
			version: GRAPH_STATE_VERSION,
			viewport: VIEWPORT,
			showGrid: true,
			functions: [{ ...SEQUENCE_ENTRY, mode: 'order2' }]
		});

		expect(result.success).toBe(false);
	});

	it('rejects a negative first index', () => {
		const result = graphStateSchema.safeParse({
			version: GRAPH_STATE_VERSION,
			viewport: VIEWPORT,
			showGrid: true,
			functions: [{ ...SEQUENCE_ENTRY, firstIndex: -1 }]
		});

		expect(result.success).toBe(false);
	});

	it('rejects a non-finite first term', () => {
		const result = graphStateSchema.safeParse({
			version: GRAPH_STATE_VERSION,
			viewport: VIEWPORT,
			showGrid: true,
			functions: [{ ...SEQUENCE_ENTRY, firstTerm: Number.POSITIVE_INFINITY }]
		});

		expect(result.success).toBe(false);
	});

	it('rejects an unknown plot type', () => {
		const result = graphStateSchema.safeParse({
			version: GRAPH_STATE_VERSION,
			viewport: VIEWPORT,
			showGrid: true,
			functions: [{ ...EXPLICIT_ENTRY, type: 'parametric' }]
		});

		expect(result.success).toBe(false);
	});
});
