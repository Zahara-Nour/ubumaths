/**
 * Lecture d'une ligne de `dictionary_entries` (ADR 0022, comportement 1 de
 * docs/wip/dictionnaire-en-base-spec.md) : une entrée reprise en base se relit
 * à l'identique, et une ligne qui sortirait de la liste blanche est écartée.
 */

import { describe, expect, it } from 'vitest';
import MATH_DICTIONARY from '$lib/data/math-dictionary-fr';
import type { MathTerm } from '../model';
import { rowToTerm } from '../entry-schema';

/** La ligne écrite par la reprise (scratchpad gen-migration.mjs) pour une entrée. */
function termToRow(e: MathTerm) {
	return {
		term: e.term,
		sense: e.sense ?? null,
		grade: e.grade,
		tags: e.tags ?? [],
		definitions: e.definitions ?? null,
		exemples: e.exemples ?? null,
		history: e.history ?? null,
		image: e.image ?? null,
		synonyms: e.synonyms ?? [],
		forms: e.forms ?? [],
		auto_link: e.autoLink !== false,
		derived_from: e.derivedFrom ?? null,
		see_also: e.seeAlso ?? null,
		shared_with: e.sharedWith ?? []
	};
}

const base = termToRow({
	term: 'carré',
	sense: 'géométrie',
	tags: ['géométrie'],
	grade: 'CP',
	definitions: { items: [{ grade: 'CP', content: 'Une figure.' }] }
});

describe('rowToTerm', () => {
	it('1. chacune des entrées reprises se relit à l’identique', () => {
		const relues = MATH_DICTIONARY.map((entry) => rowToTerm(termToRow(entry)));
		expect(relues).toEqual(MATH_DICTIONARY);
		// toEqual ignore une clé `undefined` : aucune ne doit apparaître
		for (const entry of relues) {
			expect(Object.values(entry ?? {}).includes(undefined)).toBe(false);
		}
	});

	it('une ligne valide donne une entrée', () => {
		expect(rowToTerm(base)).toEqual({
			term: 'carré',
			sense: 'géométrie',
			tags: ['géométrie'],
			grade: 'CP',
			definitions: { items: [{ grade: 'CP', content: 'Une figure.' }] }
		});
	});

	it('« jamais souligné » et filières partagées sont relus', () => {
		const term = rowToTerm({ ...base, auto_link: false, shared_with: ['1_GEN'] });
		expect(term?.autoLink).toBe(false);
		expect(term?.sharedWith).toEqual(['1_GEN']);
	});

	it.each([
		['un niveau inconnu', { grade: '7e' }],
		['un nom vide', { term: '  ' }],
		['un renvoi hors du Cabinet Noir', { see_also: { label: 'x', path: 'javascript:alert(1)' } }],
		['un renvoi vers un autre site', { see_also: { label: 'x', path: 'https://exemple.fr' } }],
		['une image sur un autre site', { image: 'https://exemple.fr/a.png' }],
		['une image sans protocole sur un autre site', { image: '//exemple.fr/a.png' }],
		['une clé inconnue dans les définitions', { definitions: { items: [], html: '<b>' } }],
		['une définition sans texte', { definitions: { items: [{ grade: 'CP' }] } }],
		['un synonyme vide', { synonyms: [''] }]
	])('écarte une ligne avec %s', (_label, change) => {
		expect(rowToTerm({ ...base, ...change })).toBeNull();
	});

	it('accepte une image du site', () => {
		expect(rowToTerm({ ...base, image: '/images/glossaire/carre.svg' })?.image).toBe(
			'/images/glossaire/carre.svg'
		);
	});
});
