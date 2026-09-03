import { describe, expect, it } from 'vitest';
import { documentLabels, labelPlaceholders } from '../labels';
import { CONTENT_LOCALES } from '$lib/types/locale';

describe('documentLabels()', () => {
	it('gives every locale the same set of labels', () => {
		const keys = CONTENT_LOCALES.map((locale) => Object.keys(documentLabels(locale)).sort());

		// A label added to one language and forgotten in the other would print a
		// French word on an English worksheet.
		expect(keys[1]).toEqual(keys[0]);
	});

	it('leaves no French label in the English set', () => {
		const en = documentLabels('en');
		const fr = documentLabels('fr');

		// Words genuinely spelled the same in both languages.
		const shared = [
			'Date',
			'Signature',
			'Total',
			'Points',
			'Score',
			'Application',
			'Presentation',
			'QUIZ',
			'Quiz',
			'EDITION',
			'Instructions',
			'Léopold Sédar Senghor',
			'pt',
			'pts',
			'minutes'
		];
		for (const [key, value] of Object.entries(en)) {
			if (typeof value !== 'string') continue;
			const french = fr[key as keyof typeof fr];
			if (typeof french !== 'string') continue;
			if (shared.includes(value)) continue;
			expect(value, `label "${key}" identique au français`).not.toBe(french);
		}
	});

	it('falls back to French on an unknown locale rather than throwing', () => {
		// @ts-expect-error deliberately invalid
		expect(documentLabels('kl').exercise).toBe('Exercice');
	});
});

describe('labelPlaceholders()', () => {
	it('exposes labels as snake_case placeholders', () => {
		const placeholders = labelPlaceholders('en');

		expect(placeholders.label_name).toBe('Surname');
		expect(placeholders.label_daily_exercises).toBe("Today's exercises");
		expect(placeholders.label_point_abbrev_plural).toBe('pts');
	});

	it('exposes every label, instruction sentences included', () => {
		expect(labelPlaceholders('en').label_read_carefully).toBe(
			'Read each question carefully before answering.'
		);
		expect(Object.keys(labelPlaceholders('fr'))).toHaveLength(
			Object.keys(documentLabels('fr')).length
		);
	});

	it('offers the same placeholder keys in both languages', () => {
		expect(Object.keys(labelPlaceholders('en')).sort()).toEqual(
			Object.keys(labelPlaceholders('fr')).sort()
		);
	});
});
