/**
 * Mots de la lecture d'une expression (2026-10-11, migration
 * 20261016090300_dictionnaire_mots_lecture) : les 4 entrées ajoutées au
 * dictionnaire ne créent aucun problème de cohérence, et l'admin aurait pu les
 * saisir telles quelles (schéma du formulaire).
 */

import { describe, expect, it } from 'vitest';
import { REFERENCE_DICTIONARY } from '../../../../tests/fixtures/lexique/dictionnaire-reference';
import { READING_WORDS_2026_10_11 } from '../../../../tests/fixtures/lexique/mots-lecture-2026-10-11';
import { checkDictionary, newProblems, type CheckedEntry } from '../consistency';
import { dictionaryEntryInputSchema } from '../entry-schema';
import type { MathTerm } from '../model';

function visible(terms: readonly MathTerm[]): CheckedEntry[] {
	return terms.map((term) => ({ term, hidden: false }));
}

describe('mots de la lecture ajoutés au dictionnaire', () => {
	it('ajoute exactement les 4 clés de la lecture, au niveau validé par David', () => {
		expect(READING_WORDS_2026_10_11.map((t) => [t.term, t.grade])).toEqual([
			['différent', 'CE1'],
			['racine cubique', '2'],
			['racine n-ième', 'T_EXP'],
			['logarithme décimal', 'T_TECHNO']
		]);
	});

	it('ne crée aucun problème de cohérence', () => {
		const before = visible(REFERENCE_DICTIONARY);
		const after = visible([...REFERENCE_DICTIONARY, ...READING_WORDS_2026_10_11]);
		expect(newProblems(before, after)).toEqual([]);
		expect(checkDictionary(after)).toEqual([]);
	});

	it.each(READING_WORDS_2026_10_11.map((t) => [t.term, t] as const))(
		'« %s » passe le schéma du formulaire admin',
		(_name, term) => {
			const result = dictionaryEntryInputSchema.safeParse({
				term: term.term,
				sense: term.sense ?? null,
				grade: term.grade,
				tags: term.tags,
				definitions: term.definitions ?? null,
				exemples: term.exemples ?? null,
				history: term.history ?? null,
				image: term.image ?? null,
				synonyms: term.synonyms ?? [],
				forms: term.forms ?? [],
				auto_link: term.autoLink !== false,
				derived_from: term.derivedFrom ?? null,
				see_also: term.seeAlso ?? null,
				shared_with: term.sharedWith ?? []
			});
			expect(result.success ? [] : result.error.issues).toEqual([]);
		}
	);
});
