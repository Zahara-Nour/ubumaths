/**
 * Worksheet-level translations
 * ============================
 *
 * The worksheet title, its sections and the per-exercise custom instructions
 * live in columns rather than in the variations JSONB, so they carry their own
 * `translations` map. Same contract as the exercise content: French in the base
 * field, translation optional, field-by-field fallback.
 */
import { describe, expect, it } from 'vitest';
import { localizedText, worksheetLocale } from '../worksheets';
import type { RowTranslations, WorksheetConfig } from '../worksheets';

describe('worksheetLocale()', () => {
	it('is French when the config says nothing', () => {
		expect(worksheetLocale({})).toBe('fr');
		expect(worksheetLocale(null)).toBe('fr');
		expect(worksheetLocale(undefined)).toBe('fr');
	});

	it('reads the configured language', () => {
		expect(worksheetLocale({ language: 'en' } as WorksheetConfig)).toBe('en');
	});

	it('falls back to French on an unknown value rather than throwing', () => {
		expect(worksheetLocale({ language: 'kl' } as unknown as WorksheetConfig)).toBe('fr');
	});
});

describe('localizedText()', () => {
	const translations: RowTranslations = {
		en: { title: 'Quadratic functions', instructions: 'Answer every question.' }
	};

	it('returns the base text in French', () => {
		expect(localizedText('Fonctions du second degré', translations, 'title', 'fr')).toBe(
			'Fonctions du second degré'
		);
	});

	it('returns the translation in English', () => {
		expect(localizedText('Fonctions du second degré', translations, 'title', 'en')).toBe(
			'Quadratic functions'
		);
	});

	it('falls back to the base text for a field left untranslated', () => {
		expect(localizedText('Une description', translations, 'description', 'en')).toBe(
			'Une description'
		);
	});

	it('falls back to the base text when there is no translation at all', () => {
		expect(localizedText('Titre', null, 'title', 'en')).toBe('Titre');
		expect(localizedText('Titre', undefined, 'title', 'en')).toBe('Titre');
	});

	it('treats an empty translation as absent', () => {
		expect(localizedText('Titre', { en: { title: '' } }, 'title', 'en')).toBe('Titre');
	});

	it('keeps a null base null rather than inventing an empty string', () => {
		expect(localizedText(null, null, 'instructions', 'en')).toBeNull();
	});
});
