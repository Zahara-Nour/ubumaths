/**
 * Tests des schemas Zod anti-fraud.
 *
 * Couvre l'entrée des 4 endpoints (admin run, GET flags, PATCH resolve, count).
 * Cf. spec TDD : docs/wip/srs-anti-fraud-spec-tdd.md §B7..B12
 */

import { describe, expect, it } from 'vitest';
import {
	flagIdParamSchema,
	flagsListQuerySchema,
	markResolvedBodySchema,
	runJobOptionsSchema
} from '../anti-fraud';

describe('runJobOptionsSchema', () => {
	it('accepte body vide', () => {
		const r = runJobOptionsSchema.safeParse({});
		expect(r.success).toBe(true);
		expect(r.data?.dry_run).toBe(false);
	});

	it('accepte dry_run + student_id UUID + since ISO', () => {
		const r = runJobOptionsSchema.safeParse({
			student_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
			since: '2026-06-01T00:00:00.000Z',
			dry_run: true
		});
		expect(r.success).toBe(true);
	});

	it('refuse student_id non-UUID', () => {
		const r = runJobOptionsSchema.safeParse({ student_id: 'not-a-uuid' });
		expect(r.success).toBe(false);
	});

	it('refuse since malformé', () => {
		const r = runJobOptionsSchema.safeParse({ since: '2026-13-99' });
		expect(r.success).toBe(false);
	});

	it('refuse clés inconnues (.strict)', () => {
		const r = runJobOptionsSchema.safeParse({ unknown: true });
		expect(r.success).toBe(false);
	});
});

describe('flagsListQuerySchema', () => {
	it('accepte query vide → resolved=false (default transform)', () => {
		const r = flagsListQuerySchema.safeParse({});
		expect(r.success).toBe(true);
		expect(r.data?.resolved).toBe(false);
	});

	it('resolved=true → boolean true', () => {
		const r = flagsListQuerySchema.safeParse({ resolved: 'true' });
		expect(r.success).toBe(true);
		expect(r.data?.resolved).toBe(true);
	});

	it('resolved=false → boolean false', () => {
		const r = flagsListQuerySchema.safeParse({ resolved: 'false' });
		expect(r.success).toBe(true);
		expect(r.data?.resolved).toBe(false);
	});

	it('refuse type inconnu', () => {
		const r = flagsListQuerySchema.safeParse({ type: 'unknown_signal' });
		expect(r.success).toBe(false);
	});

	it('accepte tous les types valides', () => {
		const types = [
			'high_easy_ratio',
			'no_again',
			'fast_timeSpent',
			'burst',
			'srs_vs_quiz_gap',
			'composite'
		];
		for (const t of types) {
			const r = flagsListQuerySchema.safeParse({ type: t });
			expect(r.success).toBe(true);
		}
	});

	it('refuse capacity non-UUID', () => {
		const r = flagsListQuerySchema.safeParse({ capacity: 'abc' });
		expect(r.success).toBe(false);
	});

	it('accepte since ISO + capacity UUID + type', () => {
		const r = flagsListQuerySchema.safeParse({
			since: '2026-06-01T00:00:00.000Z',
			type: 'burst',
			capacity: 'c3ee0eea-ab18-4f1f-9b15-2a3b4c5d6e7f'
		});
		expect(r.success).toBe(true);
	});
});

describe('flagIdParamSchema', () => {
	it('accepte UUID valide', () => {
		const r = flagIdParamSchema.safeParse({ flagId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' });
		expect(r.success).toBe(true);
	});

	it('refuse non-UUID', () => {
		const r = flagIdParamSchema.safeParse({ flagId: 'not-a-uuid' });
		expect(r.success).toBe(false);
	});
});

describe('markResolvedBodySchema', () => {
	it('accepte resolved=true', () => {
		const r = markResolvedBodySchema.safeParse({ resolved: true });
		expect(r.success).toBe(true);
	});

	it("refuse resolved=false (pas d'unresolve V1)", () => {
		const r = markResolvedBodySchema.safeParse({ resolved: false });
		expect(r.success).toBe(false);
	});

	it('refuse clés inconnues (.strict)', () => {
		const r = markResolvedBodySchema.safeParse({ resolved: true, extra: 'no' });
		expect(r.success).toBe(false);
	});

	it('refuse body vide', () => {
		const r = markResolvedBodySchema.safeParse({});
		expect(r.success).toBe(false);
	});
});
