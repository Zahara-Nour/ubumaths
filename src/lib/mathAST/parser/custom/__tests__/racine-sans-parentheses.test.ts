/**
 * `√` tapé SANS parenthèses (décision de David, 2026-10-08 : les saisies des
 * élèves de lycée) : la racine porte sur l'ATOME qui suit — un nombre ou une
 * lettre —, comme sur une calculatrice. `√2x` est √2 · x, `√x+1` est √x + 1.
 *
 * Mesuré avant : « Function sqrt requires parentheses » sur toutes ces saisies.
 */

import { describe, it, expect } from 'vitest';
import { parseCustomPratt, parseCustomRD } from '../index';

const cases: [string, string][] = [
	['√x', 'sqrt(x)'],
	['√2', 'sqrt(2)'],
	['√2x', 'sqrt(2)x'],
	['√x+1', 'sqrt(x)+1'],
	['2x+√3', '2x+sqrt(3)'],
	['3√x', '3sqrt(x)'],
	['√12', 'sqrt(12)'],
	// Le décimal à virgule reste un nombre (dans `sqrt(2,5)`, la virgule
	// séparerait deux arguments)
	['√2,5', 'sqrt(2.5)'],
	['√x=3', 'sqrt(x)=3'],
	['√x<2', 'sqrt(x)<2'],
	['√xy', 'sqrt(x)y'],
	// L'indice fait partie de l'atome (suites : u_{n+1} = √u_n + 2)
	['√u_n', 'sqrt(u_n)'],
	['√x_1', 'sqrt(x_1)'],
	['√u_{n+1}', 'sqrt(u_{n+1})'],
	['√u_n+2', 'sqrt(u_n)+2'],
	['u_{n+1}=√u_n+2', 'u_{n+1}=sqrt(u_n)+2'],
	// Inchangés
	['√(x+1)', 'sqrt(x+1)'],
	['√(2)x', 'sqrt(2)x']
];

describe('√ suivi d’un nombre ou d’une lettre : racine de cet atome', () => {
	for (const parse of [parseCustomPratt, parseCustomRD]) {
		it.each(cases)(`${parse.name} : %s = %s`, (written, canonical) => {
			expect(parse(written)).toEqual(parse(canonical));
		});
	}

	it('√ suivi d’autre chose qu’un atome reste refusé (√-x, √)', () => {
		expect(() => parseCustomPratt('√-x')).toThrow();
		expect(() => parseCustomPratt('√')).toThrow();
	});
});
