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
import {
	localizedText,
	worksheetLocale,
	asWorksheetConfig,
	asRowTranslations
} from '../worksheets';
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

/**
 * Les colonnes jsonb arrivent typées `Json` : une union sans aucune clé. Ces
 * convertisseurs remplacent les casts `as`, qui laissaient passer en silence
 * des lignes mal formées. Une fiche dont la configuration est corrompue doit
 * continuer à se générer, en retombant sur les valeurs par défaut.
 */
describe('asWorksheetConfig', () => {
	it('conserve les champs bien typés', () => {
		const config = asWorksheetConfig({
			language: 'en',
			show_title: true,
			font_size: 12,
			page_layout: 'A4',
			margins: { top: 1, bottom: 2, left: 3, right: 4 }
		});

		expect(config.language).toBe('en');
		expect(config.show_title).toBe(true);
		expect(config.font_size).toBe(12);
		expect(config.page_layout).toBe('A4');
		expect(config.margins).toEqual({ top: 1, bottom: 2, left: 3, right: 4 });
	});

	it('écarte les champs du mauvais type au lieu de les propager', () => {
		const config = asWorksheetConfig({
			language: 'kl',
			show_title: 'oui',
			font_size: 'grand',
			page_layout: 'A3',
			margins: { top: 1 }
		});

		expect(config.language).toBeUndefined();
		expect(config.show_title).toBeUndefined();
		expect(config.font_size).toBeUndefined();
		expect(config.page_layout).toBeUndefined();
		expect(config.margins).toBeUndefined();
	});

	it('rend une configuration vide pour toute valeur non exploitable', () => {
		expect(asWorksheetConfig(null)).toEqual({});
		expect(asWorksheetConfig('A4')).toEqual({});
		expect(asWorksheetConfig([1, 2])).toEqual({});
	});
});

describe('asRowTranslations', () => {
	it('conserve les traductions bien formées', () => {
		const t = asRowTranslations({ en: { title: 'Fractions', instructions: 'Simplify' } });

		expect(t?.en?.title).toBe('Fractions');
		expect(t?.en?.instructions).toBe('Simplify');
	});

	it('ignore le français, qui n’est jamais une clé de traduction', () => {
		const t = asRowTranslations({ fr: { title: 'Fractions' }, en: { title: 'Fractions' } });

		expect(t).not.toHaveProperty('fr');
		expect(t?.en?.title).toBe('Fractions');
	});

	it('écarte les textes qui ne sont pas des chaînes', () => {
		const t = asRowTranslations({ en: { title: 42, description: 'ok' } });

		expect(t?.en?.title).toBeUndefined();
		expect(t?.en?.description).toBe('ok');
	});

	it('rend null pour toute valeur non exploitable', () => {
		expect(asRowTranslations(null)).toBeNull();
		expect(asRowTranslations('en')).toBeNull();
		expect(asRowTranslations([{ en: {} }])).toBeNull();
	});
});
