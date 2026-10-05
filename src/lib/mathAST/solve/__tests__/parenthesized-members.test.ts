/**
 * Membres et termes entre parenthèses.
 *
 * Un membre purement parenthésé doit être lu comme son contenu : `(2x-3)=0`
 * est l'équation `2x-3=0`. Avant le correctif, le solveur linéaire divisait
 * le terme parenthésé par x (`a = (2x-3)/x`) et répondait x = 0 ; les
 * solveurs polynomial, exponentiel, logarithmique et trigonométrique
 * répondaient « pas de solution ». L'atelier envoie ce genre d'entrée : il
 * remplace `f(x)` par `(expression)`.
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import type { RelationNode } from '../../types';

function parseEquation(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') throw new Error(`Expected relation, got ${node.type}`);
	return node;
}

/** Solutions en LaTeX, triées : l'ordre de sortie n'est pas un contrat. */
function solutionsOf(latex: string): string[] {
	const result = solve(parseEquation(latex));
	return result.solutions.map((s) => toLatex(s.value)).sort();
}

describe('solve — membre entre parenthèses', () => {
	it.each([
		['(2x-3)=0', ['\\dfrac{3}{2}']],
		['(x^2-3x)=0', ['0', '3']],
		['2(x-1)=4', ['3']],
		['(x+1)(x-2)=0', ['-1', '2']],
		['((x-5))=0', ['5']],
		['(3x^2-12)=0', ['-2', '2']],
		['(e^x-1)=0', ['0']],
		['0=(x-4)', ['4']],
		['(x^4-1)=0', ['-1', '1']],
		['(\\ln(x)-1)=0', ['\\exponentialE']],
		['(2x-3)+1=0', ['1']],
		['x+(2x-3)=0', ['1']],
		['3(2x-3)=0', ['\\dfrac{3}{2}']]
	])('%s a pour solutions %j', (latex, expected) => {
		expect(solutionsOf(latex)).toEqual([...expected].sort());
	});

	it('(sin(x))=0 se résout comme sin(x)=0', () => {
		expect(solutionsOf('(\\sin(x))=0')).toEqual(solutionsOf('\\sin(x)=0'));
		expect(solutionsOf('(\\sin(x))=0').length).toBeGreaterThan(0);
	});

	it('le coefficient identifié ne dépend plus de x', () => {
		const result = solve(parseEquation('(2x-3)=0'), { verbosity: 'detailed' });
		const descriptions = result.steps.map((s) => s.description).join('\n');

		expect(result.equationType).toBe('linear');
		expect(descriptions).toContain('a = 2, b = -3');
		expect(descriptions).not.toContain('/x');
	});

	describe('témoins sans parenthèses, inchangés', () => {
		it.each([
			['2x-3=0', ['\\dfrac{3}{2}']],
			['x^2-3x=0', ['0', '3']],
			['2x-2=4', ['3']],
			['x-5=0', ['5']],
			['3x^2-12=0', ['-2', '2']],
			['e^x-1=0', ['0']],
			['0=x-4', ['4']]
		])('%s a pour solutions %j', (latex, expected) => {
			expect(solutionsOf(latex)).toEqual([...expected].sort());
		});
	});
});
