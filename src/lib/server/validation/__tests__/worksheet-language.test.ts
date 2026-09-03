/**
 * Zod contract for English worksheets
 * ==================================
 *
 * The language and the row translations come from the request body, so they go
 * through the same validation as everything else: a known locale, a bounded
 * payload, and no unknown language silently stored.
 */
import { describe, expect, it } from 'vitest';
import {
	createWorksheetSchema,
	createWorksheetSectionSchema,
	worksheetConfigSchema
} from '../worksheets';
import { exerciseTranslationsSchema } from '../exercises';

describe('worksheet config language', () => {
	it('accepts fr and en', () => {
		expect(worksheetConfigSchema.parse({ language: 'fr' }).language).toBe('fr');
		expect(worksheetConfigSchema.parse({ language: 'en' }).language).toBe('en');
	});

	it('accepts a config without language, as today', () => {
		expect(worksheetConfigSchema.parse({}).language).toBeUndefined();
	});

	it('rejects an unknown language', () => {
		expect(worksheetConfigSchema.safeParse({ language: 'kl' }).success).toBe(false);
		expect(worksheetConfigSchema.safeParse({ language: 'EN' }).success).toBe(false);
	});
});

describe('row translations', () => {
	it('accepts an English translation of the title', () => {
		const parsed = createWorksheetSchema.parse({
			title: 'Fonctions du second degré',
			translations: { en: { title: 'Quadratic functions' } }
		});

		expect(parsed.translations?.en?.title).toBe('Quadratic functions');
	});

	it('accepts a worksheet without translations', () => {
		expect(createWorksheetSchema.parse({ title: 'Fiche' }).translations).toBeUndefined();
	});

	it('rejects an unknown locale key', () => {
		const result = createWorksheetSchema.safeParse({
			title: 'Fiche',
			translations: { de: { title: 'Quadratische Funktionen' } }
		});

		expect(result.success).toBe(false);
	});

	it('bounds the translated text like the French one', () => {
		const result = createWorksheetSchema.safeParse({
			title: 'Fiche',
			translations: { en: { title: 'x'.repeat(201) } }
		});

		expect(result.success).toBe(false);
	});

	it('accepts translated section instructions', () => {
		const parsed = createWorksheetSectionSchema.parse({
			title: 'Partie A',
			position: 0,
			translations: { en: { title: 'Part A', instructions: 'Show your working.' } }
		});

		expect(parsed.translations?.en?.instructions).toBe('Show your working.');
	});
});

describe('hint translations', () => {
	it('accepts a translation keyed by hint id', () => {
		const parsed = exerciseTranslationsSchema.parse({
			en: { hints: { pythagore: { title: 'Pythagoras', content: 'Use the theorem' } } }
		});

		expect(parsed.en?.hints?.pythagore?.title).toBe('Pythagoras');
	});

	it('rejects an id that could not appear in a {{hint:id}} reference', () => {
		expect(
			exerciseTranslationsSchema.safeParse({ en: { hints: { '9bad id': { title: 'x' } } } }).success
		).toBe(false);
	});

	it('rejects a structural field smuggled into a translation', () => {
		// id/type/url must never be translatable: they anchor the reference.
		const result = exerciseTranslationsSchema.safeParse({
			en: { hints: { h1: { title: 'Hint', url: 'https://evil.example' } } }
		});

		expect(result.success).toBe(false);
	});
});
