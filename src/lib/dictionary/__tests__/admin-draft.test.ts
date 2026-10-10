import { describe, expect, it } from 'vitest';
import { REFERENCE_DICTIONARY } from '../../../../tests/fixtures/lexique/dictionnaire-reference';
import { draftToInput, parallelGrades, pruneShares, rowToDraft, searchRows } from '../admin-draft';
import { dictionaryEntryInputSchema, type DictionaryRow } from '../entry-schema';
import type { MathTerm } from '../model';

/** La ligne de la base pour une entrée du fichier (comme la reprise de la PR 1). */
function termToRow(t: MathTerm): DictionaryRow {
	return {
		term: t.term,
		sense: t.sense ?? null,
		grade: t.grade,
		tags: t.tags,
		definitions: (t.definitions ?? null) as DictionaryRow['definitions'],
		exemples: (t.exemples ?? null) as DictionaryRow['exemples'],
		history: t.history ?? null,
		image: t.image ?? null,
		synonyms: t.synonyms ?? [],
		forms: t.forms ?? [],
		auto_link: t.autoLink !== false,
		derived_from: t.derivedFrom ?? null,
		see_also: (t.seeAlso ?? null) as DictionaryRow['see_also'],
		shared_with: t.sharedWith ?? []
	};
}

describe('brouillon de la page d’admin', () => {
	// Ouvrir une fiche puis l'enregistrer sans rien toucher ne doit rien changer
	it('should give back every entry unchanged after a round trip', () => {
		const changed = REFERENCE_DICTIONARY.map(termToRow).filter((row) => {
			const input = draftToInput(rowToDraft(row));
			return JSON.stringify(input) !== JSON.stringify(dictionaryEntryInputSchema.parse(row));
		});
		expect(changed.map((r) => r.term)).toEqual([]);
	});

	it('should accept every entry of the reference dictionary as admin input', () => {
		const refused = REFERENCE_DICTIONARY.map(termToRow).filter(
			(row) => !dictionaryEntryInputSchema.safeParse(draftToInput(rowToDraft(row))).success
		);
		expect(refused.map((r) => r.term)).toEqual([]);
	});

	// Le dictionnaire actuel n'a ni image ni mode : une ligne fabriquée prouve qu'ils survivent
	it('should keep image, mode, shared definitions and see-also unchanged', () => {
		const row: DictionaryRow = {
			term: 'exponentielle',
			sense: 'fonctions',
			grade: '1_SPE',
			tags: ['fonctions'],
			definitions: {
				mode: 'discriminant',
				items: [
					{ grade: '1_SPE', content: 'La fonction $\\exp$.', sharedWith: ['1_TECHNO'] },
					{ grade: 'T_SPE', content: 'Sa réciproque est $\\ln$.' }
				]
			},
			exemples: { mode: 'cumulative', items: [{ grade: 'T_SPE', content: 'Exemple.' }] },
			history: 'Euler.',
			image: '/images/dictionnaire/exp.png',
			synonyms: ['exp'],
			forms: [],
			auto_link: false,
			derived_from: null,
			see_also: { label: 'Le chiffre RSA', path: '/chiffrement/rsa' },
			shared_with: ['1_TECHNO']
		};
		expect(draftToInput(rowToDraft(row))).toEqual(row);
	});

	it('should split lists on commas and drop empty parts', () => {
		const draft = { ...rowToDraft(null), term: 'x', synonyms: ' a, b ,, c ', tags: 'Nombres' };
		const input = draftToInput(draft);
		expect(input.synonyms).toEqual(['a', 'b', 'c']);
		expect(input.tags).toEqual(['nombres']);
		expect(input.definitions).toBeNull();
		expect(input.sense).toBeNull();
	});
});

describe('partage entre filières', () => {
	it('should offer only the parallel branches of the same year', () => {
		expect(parallelGrades('1_SPE').sort()).toEqual(['1_GEN', '1_TECHNO']);
		expect(parallelGrades('6')).toEqual([]);
	});

	// Le niveau change : un partage devenu impossible n'a plus de case à décocher
	it('should drop the shares that are no longer parallel when the grade changes', () => {
		expect(pruneShares('T_SPE', ['1_GEN', '1_TECHNO'])).toEqual([]);
		expect(pruneShares('1_GEN', ['1_SPE', 'T_SPE'])).toEqual(['1_SPE']);
	});
});

describe('clés des niveaux', () => {
	it('should give every level of a draft its own stable key', () => {
		const draft = rowToDraft({
			term: 'x',
			sense: null,
			grade: '6',
			tags: [],
			definitions: {
				items: [
					{ grade: '6', content: 'a' },
					{ grade: '5', content: 'b' }
				]
			},
			exemples: null,
			history: null,
			image: null,
			synonyms: [],
			forms: [],
			auto_link: true,
			derived_from: null,
			see_also: null,
			shared_with: []
		});
		const keys = draft.definitions.items.map((item) => item.key);
		expect(new Set(keys).size).toBe(2);
		expect(draftToInput(draft).definitions?.items[0]).not.toHaveProperty('key');
	});
});

describe('searchRows', () => {
	const rows = [
		{ term: 'équation', sense: null, synonyms: [] },
		{ term: 'inéquation', sense: null, synonyms: [] },
		{ term: 'base', sense: 'géométrie', synonyms: [] },
		{ term: 'carré', sense: null, synonyms: ['Quadrilatère régulier'] }
	];

	it('should ignore accents and case, names starting with the query first', () => {
		expect(searchRows(rows, 'EQUA').map((r) => r.term)).toEqual(['équation', 'inéquation']);
	});

	it('should find a word by its sense or a synonym', () => {
		expect(searchRows(rows, 'geometrie').map((r) => r.term)).toEqual(['base']);
		expect(searchRows(rows, 'quadrilatere').map((r) => r.term)).toEqual(['carré']);
	});
});
