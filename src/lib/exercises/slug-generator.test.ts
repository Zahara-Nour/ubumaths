import { describe, it, expect } from 'vitest';
import { generateExerciseSlug, isValidSlug } from './slug-generator';

describe('slug-generator', () => {
	describe('generateExerciseSlug', () => {
		it('should generate slug with topic', () => {
			const slug = generateExerciseSlug('Algèbre');
			expect(slug).toMatch(/^algebre-[a-z0-9]{8}$/);
		});

		it('should generate slug without topic', () => {
			const slug = generateExerciseSlug();
			expect(slug).toMatch(/^[a-z0-9]{8}$/);
		});

		it('should generate slug with null topic', () => {
			const slug = generateExerciseSlug(null);
			expect(slug).toMatch(/^[a-z0-9]{8}$/);
		});

		it('should handle accented characters', () => {
			const slug = generateExerciseSlug('Géométrie');
			expect(slug).toMatch(/^geometrie-[a-z0-9]{8}$/);
		});

		it('should handle multi-word topics', () => {
			const slug = generateExerciseSlug('Géométrie plane');
			expect(slug).toMatch(/^geometrie-plane-[a-z0-9]{8}$/);
		});

		it('should handle special characters', () => {
			const slug = generateExerciseSlug('Fonctions (2nd degré)');
			expect(slug).toMatch(/^fonctions-2nd-degre-[a-z0-9]{8}$/);
		});

		it('should generate unique slugs', () => {
			const slug1 = generateExerciseSlug('Test');
			const slug2 = generateExerciseSlug('Test');
			expect(slug1).not.toBe(slug2);
		});
	});

	describe('isValidSlug', () => {
		it('should accept valid slugs', () => {
			expect(isValidSlug('algebre-k8m2n4p7')).toBe(true);
			expect(isValidSlug('geometrie-plane-abc123')).toBe(true);
			expect(isValidSlug('abc')).toBe(true);
		});

		it('should reject invalid slugs', () => {
			expect(isValidSlug('ab')).toBe(false); // too short
			expect(isValidSlug('Algebre-123')).toBe(false); // uppercase
			expect(isValidSlug('algebre_123')).toBe(false); // underscore
			expect(isValidSlug('-algebre')).toBe(false); // starts with dash
			expect(isValidSlug('algebre-')).toBe(false); // ends with dash
		});
	});
});
