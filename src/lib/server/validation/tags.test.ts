/**
 * Tags Validation Schema Tests
 * ============================
 *
 * Tests for the tag validation schemas used in API endpoints.
 */

import { describe, it, expect } from 'vitest';
import { createTagSchema, validateCreateTag, tagSchema, tagListResponseSchema } from './tags';

describe('createTagSchema', () => {
	describe('valid inputs', () => {
		it('accepts simple tag names', () => {
			expect(createTagSchema.safeParse({ name: 'algèbre' }).success).toBe(true);
			expect(createTagSchema.safeParse({ name: 'fractions' }).success).toBe(true);
		});

		it('accepts tags with spaces', () => {
			expect(createTagSchema.safeParse({ name: 'calcul mental' }).success).toBe(true);
		});

		it('accepts tags with hyphens', () => {
			expect(createTagSchema.safeParse({ name: 'premier-degré' }).success).toBe(true);
		});

		it('accepts tags with apostrophes', () => {
			expect(createTagSchema.safeParse({ name: "théorème d'Euler" }).success).toBe(true);
		});

		it('accepts tags with numbers', () => {
			expect(createTagSchema.safeParse({ name: '3ème' }).success).toBe(true);
		});

		it('accepts tags with accented characters', () => {
			expect(createTagSchema.safeParse({ name: 'équations' }).success).toBe(true);
			expect(createTagSchema.safeParse({ name: 'géométrie' }).success).toBe(true);
		});

		it('trims whitespace', () => {
			const result = createTagSchema.safeParse({ name: '  algèbre  ' });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.name).toBe('algèbre');
			}
		});

		it('accepts tags up to 50 characters', () => {
			const maxTag = 'a'.repeat(50);
			expect(createTagSchema.safeParse({ name: maxTag }).success).toBe(true);
		});
	});

	describe('invalid inputs', () => {
		it('rejects empty string', () => {
			const result = createTagSchema.safeParse({ name: '' });
			expect(result.success).toBe(false);
		});

		it('rejects whitespace-only string', () => {
			const result = createTagSchema.safeParse({ name: '   ' });
			expect(result.success).toBe(false);
		});

		it('rejects tags longer than 50 characters', () => {
			const longTag = 'a'.repeat(51);
			const result = createTagSchema.safeParse({ name: longTag });
			expect(result.success).toBe(false);
		});

		it('rejects tags with special characters', () => {
			expect(createTagSchema.safeParse({ name: 'tag@email' }).success).toBe(false);
			expect(createTagSchema.safeParse({ name: 'tag#hash' }).success).toBe(false);
			expect(createTagSchema.safeParse({ name: 'tag!exclaim' }).success).toBe(false);
			expect(createTagSchema.safeParse({ name: 'tag/slash' }).success).toBe(false);
		});

		it('rejects missing name field', () => {
			const result = createTagSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it('rejects non-string name', () => {
			expect(createTagSchema.safeParse({ name: 123 }).success).toBe(false);
			expect(createTagSchema.safeParse({ name: null }).success).toBe(false);
		});
	});
});

describe('validateCreateTag', () => {
	it('returns success for valid input', () => {
		const result = validateCreateTag({ name: 'algèbre' });
		expect(result.success).toBe(true);
	});

	it('returns error for invalid input', () => {
		const result = validateCreateTag({ name: '' });
		expect(result.success).toBe(false);
	});
});

describe('tagSchema', () => {
	it('validates a complete tag object', () => {
		const validTag = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'algèbre',
			created_by: '550e8400-e29b-41d4-a716-446655440001',
			created_at: '2024-01-01T00:00:00Z'
		};

		expect(tagSchema.safeParse(validTag).success).toBe(true);
	});

	it('allows null created_by', () => {
		const tagWithNullCreator = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'algèbre',
			created_by: null,
			created_at: '2024-01-01T00:00:00Z'
		};

		expect(tagSchema.safeParse(tagWithNullCreator).success).toBe(true);
	});

	it('rejects invalid UUID for id', () => {
		const invalidTag = {
			id: 'invalid-uuid',
			name: 'algèbre',
			created_by: null,
			created_at: '2024-01-01T00:00:00Z'
		};

		expect(tagSchema.safeParse(invalidTag).success).toBe(false);
	});
});

describe('tagListResponseSchema', () => {
	it('validates empty tag list', () => {
		const emptyList = { tags: [] };
		expect(tagListResponseSchema.safeParse(emptyList).success).toBe(true);
	});

	it('validates list with multiple tags', () => {
		const tagList = {
			tags: [
				{
					id: '550e8400-e29b-41d4-a716-446655440000',
					name: 'algèbre',
					created_by: null,
					created_at: '2024-01-01T00:00:00Z'
				},
				{
					id: '550e8400-e29b-41d4-a716-446655440001',
					name: 'équations',
					created_by: '550e8400-e29b-41d4-a716-446655440002',
					created_at: '2024-01-02T00:00:00Z'
				}
			]
		};

		expect(tagListResponseSchema.safeParse(tagList).success).toBe(true);
	});
});
