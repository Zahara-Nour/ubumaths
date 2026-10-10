import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import MATH_DICTIONARY, { resolveGradedField } from '../math-dictionary-fr';

const crypto = MATH_DICTIONARY.filter((t) => t.tags.includes('cryptographie'));

describe('glossaire du chiffrement', () => {
	it('les termes du Cabinet Noir sont présents', () => {
		const names = crypto.map((t) => (t.sense ? `${t.term} (${t.sense})` : t.term));
		for (const expected of [
			'chiffre (cryptographie)',
			'chiffrer',
			'déchiffrer',
			'décrypter',
			'clé (cryptographie)',
			'analyse de fréquences',
			'chiffre de César',
			'chiffre de Vigenère',
			'méthode de Kasiski',
			'indice de coïncidence',
			'congruence',
			'inverse modulaire',
			'chiffre affine',
			'chiffre de Hill',
			'identité de Bézout',
			'exponentiation rapide',
			'clé publique',
			'clé privée'
		]) {
			expect(names).toContain(expected);
		}
	});

	it('« crypter » n’est ni un terme ni un synonyme', () => {
		for (const term of MATH_DICTIONARY) {
			expect(term.term).not.toBe('crypter');
			expect(term.synonyms ?? []).not.toContain('crypter');
		}
	});

	it('chaque définition se lit au niveau où le terme apparaît', () => {
		for (const term of crypto) {
			if (!term.definitions) continue;
			expect(resolveGradedField(term.definitions, term.grade), term.term).not.toEqual([]);
		}
	});

	it('chaque « Voir aussi » mène à une page qui existe', () => {
		const linked = MATH_DICTIONARY.filter((t) => t.seeAlso);
		expect(linked.length).toBeGreaterThan(10);
		for (const term of linked) {
			const path = term.seeAlso?.path ?? '';
			expect(existsSync(`src/routes/(public)${path}/+page.svelte`), `${term.term} → ${path}`).toBe(
				true
			);
		}
	});
});
