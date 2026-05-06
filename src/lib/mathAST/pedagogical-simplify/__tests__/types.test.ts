/**
 * Phase 1 — Types isolation tests for pedagogical-simplify
 *
 * Verifies the type surface compiles correctly and the runtime sentinels
 * (category count, error class) behave as expected. No pipeline/runtime
 * logic is exercised here.
 */

import { describe, it, expect, expectTypeOf } from 'vitest';
import { number } from '../../factory';
import {
	ALL_PEDAGOGICAL_SIMPLIFY_CATEGORIES,
	PEDAGOGICAL_SIMPLIFY_CATEGORY_COUNT,
	PedagogicalSimplifyNotImplemented,
	type PedagogicalSimplifyCategory,
	type PedagogicalSimplifyOptions,
	type PedagogicalSimplifyResult,
	type PedagogicalSimplifyStep,
	type SimplifyIntent
} from '../types';

describe('pedagogical-simplify/types — sentinels', () => {
	it('ALL_PEDAGOGICAL_SIMPLIFY_CATEGORIES has exactly 10 entries', () => {
		expect(ALL_PEDAGOGICAL_SIMPLIFY_CATEGORIES).toHaveLength(10);
		expect(PEDAGOGICAL_SIMPLIFY_CATEGORY_COUNT).toBe(10);
		expect(PEDAGOGICAL_SIMPLIFY_CATEGORY_COUNT).toBe(ALL_PEDAGOGICAL_SIMPLIFY_CATEGORIES.length);
	});

	it('ALL_PEDAGOGICAL_SIMPLIFY_CATEGORIES contains the 9 pedagogical + 1 fallback', () => {
		expect([...ALL_PEDAGOGICAL_SIMPLIFY_CATEGORIES].sort()).toEqual([
			'autre',
			'combinaison-termes-semblables',
			'distribution',
			'factorisation',
			'fractions',
			'identites-log-exp',
			'identites-trig',
			'puissances',
			'radicaux',
			'valeur-absolue'
		]);
	});

	it('ALL_PEDAGOGICAL_SIMPLIFY_CATEGORIES has no duplicates', () => {
		const seen = new Set(ALL_PEDAGOGICAL_SIMPLIFY_CATEGORIES);
		expect(seen.size).toBe(ALL_PEDAGOGICAL_SIMPLIFY_CATEGORIES.length);
	});
});

describe('pedagogical-simplify/types — PedagogicalSimplifyNotImplemented', () => {
	it('is an Error instance', () => {
		const err = new PedagogicalSimplifyNotImplemented('test reason');
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(PedagogicalSimplifyNotImplemented);
	});

	it('has the expected name and message', () => {
		const err = new PedagogicalSimplifyNotImplemented('hyperbolic identities are V2+');
		expect(err.name).toBe('PedagogicalSimplifyNotImplemented');
		expect(err.message).toBe('hyperbolic identities are V2+');
	});

	it('captures the offending node when provided', () => {
		const node = number('42');
		const err = new PedagogicalSimplifyNotImplemented('reason', node);
		expect(err.node).toBe(node);
	});
});

describe('pedagogical-simplify/types — type surface', () => {
	it('SimplifyIntent has 4 valid string values', () => {
		const intents: SimplifyIntent[] = ['factoriser', 'developper', 'reduire', 'auto'];
		expect(intents).toHaveLength(4);
		expectTypeOf<SimplifyIntent>().toEqualTypeOf<
			'factoriser' | 'developper' | 'reduire' | 'auto'
		>();
	});

	it('PedagogicalSimplifyCategory matches ALL_PEDAGOGICAL_SIMPLIFY_CATEGORIES element type', () => {
		expectTypeOf<PedagogicalSimplifyCategory>().toEqualTypeOf<
			(typeof ALL_PEDAGOGICAL_SIMPLIFY_CATEGORIES)[number]
		>();
		// Runtime smoke: every literal in the array is a valid category at runtime.
		const sample: PedagogicalSimplifyCategory = 'distribution';
		expect(ALL_PEDAGOGICAL_SIMPLIFY_CATEGORIES).toContain(sample);
	});

	it('PedagogicalSimplifyOptions makes intent and schoolLevel required', () => {
		// @ts-expect-error — intent is required
		const _missingIntent: PedagogicalSimplifyOptions = { schoolLevel: 'lycee' };

		// @ts-expect-error — schoolLevel is required
		const _missingSchool: PedagogicalSimplifyOptions = { intent: 'reduire' };

		const _ok: PedagogicalSimplifyOptions = { intent: 'reduire', schoolLevel: 'lycee' };
		expect(_ok.intent).toBe('reduire');
		expect(_ok.schoolLevel).toBe('lycee');
	});

	it('PedagogicalSimplifyStep extends BaseStep with category + optional bindings/sub-steps/global*', () => {
		const node = number('1');
		const step: PedagogicalSimplifyStep = {
			id: 1,
			rule: 'pythagorean',
			description: 'Identité de Pythagore',
			before: node,
			after: node,
			verbosityLevel: 'detailed',
			category: 'identites-trig'
		};
		expect(step.category).toBe('identites-trig');

		const stepWithExtras: PedagogicalSimplifyStep = {
			...step,
			bindings: { x: node },
			subSteps: [],
			globalBefore: node,
			globalAfter: node
		};
		expect(stepWithExtras.bindings).toBeDefined();
		expect(stepWithExtras.subSteps).toEqual([]);
	});

	it('PedagogicalSimplifyResult exposes result + steps + optional aborted', () => {
		const node = number('1');
		const r: PedagogicalSimplifyResult = {
			result: node,
			steps: []
		};
		expect(r.result).toBe(node);
		expect(r.steps).toEqual([]);
		expect(r.aborted).toBeUndefined();

		const aborted: PedagogicalSimplifyResult = {
			result: node,
			steps: [],
			aborted: true
		};
		expect(aborted.aborted).toBe(true);
	});
});
