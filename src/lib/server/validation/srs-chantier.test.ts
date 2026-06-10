/**
 * Tests for Zod schemas introduced/extended by the chantier 2026-06-10
 * ====================================================================
 *
 * Couvre les schémas non testés par srs.test.ts (qui couvre les schémas
 * historiques) :
 *   - dueCardsQuerySchema : extension du filtre `states` (CSV transform).
 *   - createSectionSchema : création de sous-section manuelle.
 *   - updateSectionSchema : MAJ partielle.
 *   - updateCardSchema : extension section_id.
 *
 * Source : src/lib/server/validation/srs.ts (chantier 2026-06-10)
 */

import { describe, it, expect } from 'vitest';
import {
	dueCardsQuerySchema,
	createSectionSchema,
	updateSectionSchema,
	updateCardSchema
} from './srs';

// ============================================================================
// dueCardsQuerySchema — filtre `?states=`
// ============================================================================

describe('dueCardsQuerySchema — filtre states (P1#8 fix)', () => {
	const validUuid = crypto.randomUUID();

	it('accepts valid deck_id without states (undefined)', () => {
		const result = dueCardsQuerySchema.safeParse({ deck_id: validUuid });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.deck_id).toBe(validUuid);
			expect(result.data.states).toBeUndefined();
		}
	});

	it('parses single state correctly', () => {
		const result = dueCardsQuerySchema.safeParse({
			deck_id: validUuid,
			states: 'learning'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.states).toEqual(['learning']);
		}
	});

	it('parses multiple states CSV', () => {
		const result = dueCardsQuerySchema.safeParse({
			deck_id: validUuid,
			states: 'learning,relearning,review'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.states).toEqual(['learning', 'relearning', 'review']);
		}
	});

	it('trims whitespace around state values', () => {
		const result = dueCardsQuerySchema.safeParse({
			deck_id: validUuid,
			states: ' learning , review '
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.states).toEqual(['learning', 'review']);
		}
	});

	it('filters out invalid state values silently', () => {
		const result = dueCardsQuerySchema.safeParse({
			deck_id: validUuid,
			states: 'learning,foo,review,bar'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.states).toEqual(['learning', 'review']);
		}
	});

	it('returns undefined when all states are invalid (no silent 0-filter)', () => {
		// Important : empty filter list → undefined (no filter), pas Set vide
		// qui filtrerait tout (cf. P1#8 audit code review).
		const result = dueCardsQuerySchema.safeParse({
			deck_id: validUuid,
			states: 'foo,bar,baz'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.states).toBeUndefined();
		}
	});

	it('returns undefined for empty states string', () => {
		const result = dueCardsQuerySchema.safeParse({
			deck_id: validUuid,
			states: ''
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.states).toBeUndefined();
		}
	});

	it('accepts all 4 valid CardState values', () => {
		const cardStates = ['new', 'learning', 'review', 'relearning'];
		const result = dueCardsQuerySchema.safeParse({
			deck_id: validUuid,
			states: cardStates.join(',')
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.states).toEqual(cardStates);
		}
	});

	it('rejects invalid deck_id (not UUID)', () => {
		const result = dueCardsQuerySchema.safeParse({ deck_id: 'not-uuid' });
		expect(result.success).toBe(false);
	});

	it('rejects missing deck_id', () => {
		const result = dueCardsQuerySchema.safeParse({ states: 'learning' });
		expect(result.success).toBe(false);
	});

	it('accepts the typical "À remédier" filter (learning,relearning)', () => {
		const result = dueCardsQuerySchema.safeParse({
			deck_id: validUuid,
			states: 'learning,relearning'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.states).toEqual(['learning', 'relearning']);
		}
	});

	it('accepts the typical "À renforcer" filter (review)', () => {
		const result = dueCardsQuerySchema.safeParse({
			deck_id: validUuid,
			states: 'review'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.states).toEqual(['review']);
		}
	});
});

// ============================================================================
// createSectionSchema — nouvelle sous-section manuelle
// ============================================================================

describe('createSectionSchema', () => {
	it('accepts a minimal valid section (name only)', () => {
		const result = createSectionSchema.safeParse({ name: 'Symétries' });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe('Symétries');
			expect(result.data.display_order).toBe(0); // default
		}
	});

	it('accepts full section with description and display_order', () => {
		const result = createSectionSchema.safeParse({
			name: 'Triangles',
			description: 'Toutes les sous-cartes triangles',
			display_order: 5
		});
		expect(result.success).toBe(true);
	});

	it('rejects empty name', () => {
		const result = createSectionSchema.safeParse({ name: '' });
		expect(result.success).toBe(false);
	});

	it('rejects whitespace-only name (trim then min 1)', () => {
		const result = createSectionSchema.safeParse({ name: '   ' });
		expect(result.success).toBe(false);
	});

	it('rejects name exceeding 50 chars (max length)', () => {
		const result = createSectionSchema.safeParse({ name: 'x'.repeat(51) });
		expect(result.success).toBe(false);
	});

	it('accepts name of exactly 50 chars (boundary)', () => {
		const result = createSectionSchema.safeParse({ name: 'x'.repeat(50) });
		expect(result.success).toBe(true);
	});

	it('rejects description exceeding 200 chars', () => {
		const result = createSectionSchema.safeParse({
			name: 'Sec',
			description: 'x'.repeat(201)
		});
		expect(result.success).toBe(false);
	});

	it('accepts description of exactly 200 chars (boundary)', () => {
		const result = createSectionSchema.safeParse({
			name: 'Sec',
			description: 'x'.repeat(200)
		});
		expect(result.success).toBe(true);
	});

	it('rejects negative display_order', () => {
		const result = createSectionSchema.safeParse({
			name: 'Sec',
			display_order: -1
		});
		expect(result.success).toBe(false);
	});

	it('rejects non-integer display_order', () => {
		const result = createSectionSchema.safeParse({
			name: 'Sec',
			display_order: 1.5
		});
		expect(result.success).toBe(false);
	});

	it('rejects missing name', () => {
		const result = createSectionSchema.safeParse({ description: 'no name' });
		expect(result.success).toBe(false);
	});

	it('trims leading/trailing whitespace from name', () => {
		const result = createSectionSchema.safeParse({ name: '  Symétries  ' });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe('Symétries');
		}
	});
});

// ============================================================================
// updateSectionSchema — MAJ partielle (createSectionSchema.partial())
// ============================================================================

describe('updateSectionSchema', () => {
	it('accepts empty body (all fields optional)', () => {
		const result = updateSectionSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it('accepts name update only', () => {
		const result = updateSectionSchema.safeParse({ name: 'Renommé' });
		expect(result.success).toBe(true);
	});

	it('accepts description update only', () => {
		const result = updateSectionSchema.safeParse({ description: 'Nouvelle desc' });
		expect(result.success).toBe(true);
	});

	it('accepts display_order update only', () => {
		const result = updateSectionSchema.safeParse({ display_order: 3 });
		expect(result.success).toBe(true);
	});

	it('rejects invalid name even in partial update', () => {
		const result = updateSectionSchema.safeParse({ name: 'x'.repeat(51) });
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// updateCardSchema — extension section_id
// ============================================================================

describe('updateCardSchema (extension section_id chantier 2026-06-10)', () => {
	it('accepts section_id as UUID', () => {
		const result = updateCardSchema.safeParse({ section_id: crypto.randomUUID() });
		expect(result.success).toBe(true);
	});

	it('accepts section_id as null (déplace en "Non rangées")', () => {
		const result = updateCardSchema.safeParse({ section_id: null });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.section_id).toBeNull();
		}
	});

	it('accepts section_id absent (optional)', () => {
		const result = updateCardSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it('rejects section_id as invalid UUID string', () => {
		const result = updateCardSchema.safeParse({ section_id: 'not-uuid' });
		expect(result.success).toBe(false);
	});

	it('accepts combination of frontContent + section_id', () => {
		const result = updateCardSchema.safeParse({
			frontContent: 'Front markdown',
			section_id: crypto.randomUUID()
		});
		expect(result.success).toBe(true);
	});
});
