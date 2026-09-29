/**
 * Exposant symbolique sur une base numérique NÉGATIVE : le terme général d'une
 * suite géométrique de raison négative (questions #623/#624 du corpus, réponse
 * attendue `a×b^n`).
 *
 * Mesuré après `rules/general-power.ts` (bases positives seules) :
 *
 * | paire                                    | verdict     |
 * | ---------------------------------------- | ----------- |
 * | `5×(-2)^{n} ≡ -10×(-2)^{n-1}`            | **`false`** |
 * | `(-2)^{n+1} ≡ -2×(-2)^{n}`               | **`false`** |
 * | `(-3)^{n}×(-3)^{2} ≡ 9×(-3)^{n}`         | `true`      |
 *
 * ## Pourquoi c'est sûr pour une base négative
 *
 * Aucune écriture exponentielle réelle ici. Deux identités seulement, vraies
 * pour toute base `a` non nulle, que `a^u` soit lu comme puissance réelle
 * (exposant rationnel à dénominateur impair) ou comme valeur principale
 * complexe :
 *
 * - `a^{u+k} = a^{u}·a^{k}` pour `k` ENTIER : même domaine des deux côtés ;
 * - `(a^{u})^{p}·(a^{v})^{q} = a^{pu+qv}` pour `p`, `q` ENTIERS : le membre de
 *   droite est défini partout où le gauche l'est (il peut l'être ailleurs,
 *   ce que la convention permet).
 *
 * Jamais `(a^{u})^{v} → a^{uv}` pour `v` non entier, jamais de positivité.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseLatex } from '../../parser';
import { simplify } from '../../simplify';
import { toLatex } from '../../index';

const eq = (a: string, b: string) => areEquivalent(parseLatex(a), parseLatex(b));

describe('une base négative : décalage entier et produit de même base', () => {
	it.each([
		['5\\times(-2)^{n}', '-10\\times(-2)^{n-1}'],
		['(-2)^{n+1}', '-2\\times(-2)^{n}'],
		['(-3)^{n}\\times(-3)^{2}', '9\\times(-3)^{n}'],
		['(-2)^{n+1}', '(-2)^{1+n}'],
		['\\frac{(-2)^{n}}{(-2)^{n-1}}', '-2'],
		[
			'3\\times\\left(-\\frac{1}{2}\\right)^{n}',
			'-\\frac{3}{2}\\times\\left(-\\frac{1}{2}\\right)^{n-1}'
		],
		['\\left(-\\frac{1}{2}\\right)^{n}', '(-0.5)^{n}'],
		['(-1)^{n+2}', '(-1)^{n}'],
		['(-2)^{n}\\times(-2)^{m}', '(-2)^{n+m}'],
		['(-2)^{n}\\times(-2)^{n}', '(-2)^{2n}'],
		['\\left((-2)^{n}\\right)^{2}', '(-2)^{2n}'],
		['(-2)^{n}\\times(-2)^{n+1}', '-2\\times(-2)^{2n}'],
		['((-2)^{n}+1)((-2)^{n}-1)', '(-2)^{2n}-1']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});

describe('ce qui n’est pas égal ne le devient pas', () => {
	it.each([
		// En n = 1/2, (-2)^{2n} vaut -2 et 4^{n} vaut 2 : tous deux définis,
		// différents. Replier (a^u)^v ou supposer a > 0 rendrait ceci vrai.
		['(-2)^{2n}', '4^{n}'],
		['(-2)^{n}', '2^{n}'],
		['(-2)^{n+1}', '2\\times(-2)^{n}'],
		['5\\times(-2)^{n}', '10\\times(-2)^{n-1}'],
		['(-1)^{2n}', '1'],
		['(-1)^{n+1}', '(-1)^{n}'],
		['(-2)^{n}\\times(-2)^{m}', '(-2)^{nm}'],
		['(-2)^{n}\\times(-3)^{n}', '6^{n}'],
		['(-2)^{n}\\times(-3)^{n}', '(-6)^{n}'],
		['\\sqrt{(-2)^{2n}}', '(-2)^{n}'],
		['\\sqrt{(-2)^{2n}}', '2^{n}']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});
});

describe('réduire pour comparer, pas pour écrire (ADR 0006)', () => {
	it('l’affichage garde la puissance de l’élève', () => {
		expect(toLatex(simplify(parseLatex('(-2)^{n+1}')).result)).toContain('n + 1');
	});
});
