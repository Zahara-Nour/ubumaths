import { describe, expect, it } from 'vitest';
import MATH_DICTIONARY from '$lib/data/math-dictionary-fr';
import { draftToInput, rowToDraft, searchRows } from '../admin-draft';
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
		const changed = MATH_DICTIONARY.map(termToRow).filter((row) => {
			const input = draftToInput(rowToDraft(row));
			return JSON.stringify(input) !== JSON.stringify(dictionaryEntryInputSchema.parse(row));
		});
		expect(changed.map((r) => r.term)).toEqual([]);
	});

	it('should accept every entry of the reference dictionary as admin input', () => {
		const refused = MATH_DICTIONARY.map(termToRow).filter(
			(row) => !dictionaryEntryInputSchema.safeParse(draftToInput(rowToDraft(row))).success
		);
		expect(refused.map((r) => r.term)).toEqual([]);
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
