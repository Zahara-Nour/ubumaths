/**
 * L'ordre que `sortTermsAndFactorsAST` établit.
 *
 * ⚠️ **Relevé par David : les facteurs numériques étaient relégués à la fin, et
 * ça n'a jamais été voulu.** La fonction réutilisait `compareNodes`, écrit pour
 * comparer les facteurs SYMBOLIQUES d'un monôme — où le coefficient est traité
 * à part et n'apparaît donc jamais dans la liste. Appliqué à un produit brut,
 * ce comparateur envoyait le coefficient au bout.
 *
 * Mesuré avant correctif :
 *
 *   2x-3       ->  -3 + x 2
 *   3x^2+2x+1  ->  1 + 3 x^2 + x 2      (ni croissant, ni décroissant)
 *   5*sin(x)   ->  \sin(x) 5
 *
 * ⚠️ Cette fonction sert à COMPARER, appliquée aux deux côtés avant
 * confrontation (`constraintId: null`, « normalisation only ») : c'est ce qui
 * fait que `1+x` et `x+1` ne sont pas une faute de forme. N'importe quel ordre
 * total y convient — mais elle devient lisible, donc utilisable à l'affichage,
 * si cet ordre est celui qu'on écrit au tableau.
 */

import { describe, it, expect } from 'vitest';
import { sortTermsAndFactorsAST } from '../cosmetic-transforms';
import { parseCustomSafe } from '../parser/custom';
import { multiply, number, variable } from '../factory';
import { toLatex } from '../latex-generator';

function sorted(source: string): string {
	const parsed = parseCustomSafe(source);
	if (parsed.ast === undefined) throw new Error(`parse KO : ${source}`);
	return toLatex(sortTermsAndFactorsAST(parsed.ast)).replace(/\s+/g, ' ').trim();
}

describe('le coefficient passe devant', () => {
	/**
	 * ⚠️ Cette fonction TRIE ; elle ne change pas le style de multiplication.
	 * C'est `removeMultOperatorAST` qui transforme `×` en juxtaposition, juste
	 * avant elle dans le pipeline. Les tests écrits en `*` gardent donc leur
	 * `\times`, et ceux écrits en implicite gardent l'implicite.
	 */
	it('un produit écrit à l’envers se remet à l’endroit', () => {
		expect(sorted('x*2')).toBe('2 \\times x');
	});

	it('et un produit déjà à l’endroit ne bouge pas', () => {
		expect(sorted('2*x')).toBe('2 \\times x');
	});

	it('en juxtaposition, comme après le pipeline', () => {
		expect(sorted('2x')).toBe('2 x');
	});

	it('devant une fonction aussi', () => {
		expect(sorted('sin(x)*5')).toBe('5 \\times \\sin\\left( x \\right)');
	});
});

describe('un nombre négatif est un nombre', () => {
	/**
	 * ⚠️ `-3` s'écrit `opposite(number)`, pas `number`. Ne tester que le type
	 * laissait les coefficients négatifs derrière : `-sin(3x) × 3` devenait
	 * `sin(3x) × -3`, pire que le défaut qu'on répare. Trouvé en appliquant le
	 * tri aux dérivées.
	 */
	it('un coefficient négatif passe devant lui aussi', () => {
		// Les parenthèses viennent de l'écriture source `(-3)` ; ce qui compte
		// est que le facteur soit passé DEVANT le sinus.
		expect(sorted('sin(x)*(-3)')).toBe('\\left( -3 \\right) \\times \\sin\\left( x \\right)');
	});

	it('et il se range comme son opposé', () => {
		expect(sorted('x*(-2)')).toBe('\\left( -2 \\right) \\times x');
	});
});

describe('les termes se rangent par degré décroissant', () => {
	/**
	 * C'est l'ordre d'un polynôme au tableau. L'ancien mélangeait les degrés :
	 * `3x^2+2x+1` devenait `1 + 3 x^2 + x 2`.
	 */
	it('un trinôme', () => {
		expect(sorted('1+2x+3x^2')).toBe('3 x^2 + 2 x + 1');
	});

	it('un trinôme avec un terme négatif garde sa soustraction', () => {
		expect(sorted('2-3x+x^2')).toBe('x^2 - 3 x + 2');
	});

	it('un binôme du premier degré', () => {
		expect(sorted('-3+2x')).toBe('2 x - 3');
	});

	it('et celui qui était déjà bien rangé ne bouge pas', () => {
		expect(sorted('2x-3')).toBe('2 x - 3');
	});
});

describe('ce qui n’a pas de degré garde l’ordre alphabétique', () => {
	it('des variables de même degré', () => {
		expect(sorted('c+a+b')).toBe('a + b + c');
	});

	it('une somme de fonctions', () => {
		expect(sorted('sin(x)+cos(x)')).toBe('\\cos\\left( x \\right) + \\sin\\left( x \\right)');
	});
});

describe('la normalisation reste une normalisation', () => {
	/**
	 * ⚠️ Le garde qui protège la validation des réponses : deux écritures
	 * commutatives doivent se ranger IDENTIQUEMENT, sinon `1+x` redeviendrait
	 * une faute de forme face à `x+1`.
	 */
	it('deux écritures commutatives se rejoignent', () => {
		for (const [a, b] of [
			['1+x', 'x+1'],
			['2*x', 'x*2'],
			['1+2x+3x^2', '3x^2+1+2x'],
			['a+b+c', 'c+b+a']
		]) {
			expect(sorted(a), `${a} vs ${b}`).toBe(sorted(b));
		}
	});

	it('et l’ordre est idempotent', () => {
		// ⚠️ On retrie l'ARBRE, pas sa sortie : `sorted()` rend du LaTeX, que le
		// parseur de syntaxe custom ne relit pas (il rendait `null`, et le
		// deuxième passage jetait).
		for (const source of ['1+2x+3x^2', 'x*2', '2-3x+x^2', '2x-3']) {
			const parsed = parseCustomSafe(source);
			if (parsed.ast === undefined) throw new Error(`parse KO : ${source}`);

			const once = sortTermsAndFactorsAST(parsed.ast);
			const twice = sortTermsAndFactorsAST(once);

			expect(toLatex(twice), source).toBe(toLatex(once));
		}
	});
});

describe('ce que ce tri ne fait PAS', () => {
	/**
	 * ⚠️ **Cette fonction trie ; elle ne simplifie pas.** Deux facteurs
	 * numériques passent tous deux devant et se retrouvent côte à côte :
	 * `3 (x^2+1)^2 × 2x` devient `2 3 x (x^2+1)^2`, où « 2 3 » se lit vingt-trois.
	 *
	 * Ce n'est pas un défaut de ce lot mais sa LIMITE : regrouper `2 × 3` en `6`
	 * est le travail de la simplification. Pour sa raison d'être — normaliser
	 * avant comparaison — c'est sans conséquence, les deux côtés subissant le
	 * même traitement.
	 *
	 * Conséquence pratique : **ne pas s'en servir pour afficher** une expression
	 * à plusieurs coefficients sans la simplifier d'abord.
	 */
	it('deux coefficients restent deux facteurs, côte à côte', () => {
		// `3x × 2` en juxtaposition — impossible à écrire en syntaxe custom
		// (« 3x2 » serait ambigu), donc construit à la main.
		const trois_x_fois_deux = multiply(
			multiply(number('3'), variable('x'), 'implicit'),
			number('2'),
			'implicit'
		);

		expect(toLatex(sortTermsAndFactorsAST(trois_x_fois_deux)).replace(/\s+/g, ' ').trim()).toBe(
			'2 3 x'
		);
	});

	/**
	 * ⚠️ **Le style de multiplication reste à sa POSITION, donc deux écritures
	 * qui ne portent pas les mêmes styles ne se rejoignent pas ici.** `3x*2`
	 * donne `2 3 \times x` et `2*3x` donne `2 \times 3 x`.
	 *
	 * Ce n'est pas un défaut de ce lot : dans le pipeline, `removeMultOperatorAST`
	 * passe AVANT et met tout en juxtaposition, si bien que les deux côtés
	 * arrivent ici avec les mêmes styles. Mesuré sur `checkForm`, avant comme
	 * après ce lot, ces deux écritures donnent le même verdict — `bad_form`,
	 * pour une raison qui ne tient pas au tri.
	 */
	it('en juxtaposition, les deux écritures se rejoignent', () => {
		const rendu = (node: Parameters<typeof sortTermsAndFactorsAST>[0]) =>
			toLatex(sortTermsAndFactorsAST(node)).replace(/\s+/g, ' ').trim();

		const gauche = multiply(
			multiply(number('3'), variable('x'), 'implicit'),
			number('2'),
			'implicit'
		);
		const droite = multiply(
			number('2'),
			multiply(number('3'), variable('x'), 'implicit'),
			'implicit'
		);

		expect(rendu(gauche)).toBe(rendu(droite));
	});
});
