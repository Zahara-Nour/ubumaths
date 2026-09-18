/**
 * La mise en facteur commun.
 *
 * ⚠️ **Elle n'existait nulle part dans mathAST.** `algebraicFactoringRules` ne
 * contenait que des identités remarquables — différence de carrés, carré
 * parfait, somme et différence de cubes — et rien pour `a×c + b×c`.
 *
 * Conséquence, mesurée : la dérivée de `x·eˣ` restait `eˣ + x·eˣ` au lieu de
 * `(x+1)eˣ`, alors que c'est la forme factorisée qui permet d'étudier le signe.
 * Demandé par David.
 */

import { describe, it, expect } from 'vitest';
import { applyRuleDeep } from '../../rule';
import { commonFactorRules } from '../common-factor';
import { parseCustomSafe } from '../../../parser/custom';
import { toLatex } from '../../../latex-generator';
import type { MathNode } from '../../../types';

function ast(source: string): MathNode {
	const parsed = parseCustomSafe(source);
	if (parsed.ast === undefined) throw new Error(`parse KO : ${source}`);
	return parsed.ast;
}

/** L'expression après application de toutes les règles de facteur commun. */
function factored(source: string): string {
	const result = commonFactorRules.reduce<MathNode>(
		(node, rule) => applyRuleDeep(rule, node),
		ast(source)
	);
	return toLatex(result).replace(/\s+/g, ' ').trim();
}

describe('deux termes portant le même facteur', () => {
	it('le cas qui a motivé la règle', () => {
		// La dérivée de x·eˣ.
		expect(factored('exp(x)+x*exp(x)')).toBe('\\left( x + 1 \\right) \\exp\\left( x \\right)');
	});

	it('un facteur littéral', () => {
		expect(factored('x*a+a')).toBe('\\left( x + 1 \\right) a');
	});

	it('deux produits', () => {
		expect(factored('a*x+b*x')).toBe('\\left( a + b \\right) x');
	});
});

describe('⚠️ les parenthèses ne sont pas décoratives', () => {
	/**
	 * Sans elles, `(a+b)x` se rend `a + b x` — une expression FAUSSE, qui se lit
	 * `a + bx`. C'est le défaut qu'a produit ma première version.
	 */
	it('la somme mise en facteur est toujours parenthésée', () => {
		for (const source of ['exp(x)+x*exp(x)', 'x*a+a', 'a*x+b*x']) {
			expect(factored(source), source).toMatch(/^\\left\(/);
		}
	});
});

describe('ce qui ne doit PAS être touché', () => {
	it('une somme sans facteur commun', () => {
		expect(factored('x+a')).toBe('x + a');
		expect(factored('2x+3')).toBe('2 x + 3');
	});

	it('un terme seul', () => {
		expect(factored('x*a')).toBe('x \\times a');
	});

	/**
	 * ⚠️ Le facteur commun NUMÉRIQUE est laissé de côté, délibérément : le
	 * module traite déjà la factorisation numérique à part (`hasCommonFactor`),
	 * et `intent-rules.ts` note qu'elle est « ambiguë » — `2x+2` peut se vouloir
	 * `2(x+1)` ou rester tel quel selon ce qu'on cherche.
	 */
	it('un facteur commun purement numérique', () => {
		expect(factored('2x+2')).toBe('2 x + 2');
	});
});
