/**
 * Structure d'une expression — règle « 6e ou avant » (lot 3)
 * =========================================================
 *
 * Spécification : `docs/wip/structure-expression-progress.md`, section C.
 * L'enchaînement d'additions et de soustractions et les nombres relatifs
 * arrivent en 5e : avant, l'élève écrit les parenthèses.
 *
 * Entrées PARSÉES (invariant 4 du module), coefficients ≠ 1.
 */
import { describe, expect, it } from 'vitest';
import {
	needsParenthesesAdvice,
	parenthesesAdvice,
	structureFromLatex,
	type AdviceSegment,
	type ParenthesesAdvice
} from '..';

// Constantes
const NBSP = ' ';

// Fonctions
function adviceOf(latex: string): ParenthesesAdvice | null {
	const result = structureFromLatex(latex);
	if (result.status !== 'ok') throw new Error(`${latex} : ${result.status}`);
	return parenthesesAdvice(result.structure);
}

/** Message lisible : formules entre `$` */
function render(segments: readonly AdviceSegment[]): string {
	return segments.map((s) => (s.kind === 'text' ? s.text : `$${s.latex}$`)).join('');
}

function chainMessage(first: string, second: string): string {
	return `Ajoute des parenthèses pour montrer ce que tu calcules d'abord${NBSP}: $${first}$ ou $${second}$${NBSP}?`;
}

function leadingMinusMessage(example: string): string {
	return `Un nombre précédé de − arrive en 5e${NBSP}: écris-le entre parenthèses, par exemple $${example}$.`;
}

describe('parenthesesAdvice — C1 : suite de 3 termes ou plus avec une soustraction', () => {
	it('5 − 3 + x : regroupement des deux premiers ou des deux derniers', () => {
		const advice = adviceOf('5-3+x');
		expect(advice?.reason).toBe('chain');
		if (advice?.reason !== 'chain') return;
		expect(advice.proposals).toEqual(['\\left( 5 - 3 \\right) + x', '5 - \\left( 3 + x \\right)']);
		expect(render(advice.segments)).toBe(
			chainMessage('\\left( 5 - 3 \\right) + x', '5 - \\left( 3 + x \\right)')
		);
	});

	it('10 − 2 − 3 : deux soustractions comptent aussi', () => {
		const advice = adviceOf('10-2-3');
		expect(advice?.reason).toBe('chain');
		if (advice?.reason !== 'chain') return;
		expect(advice.proposals).toEqual([
			'\\left( 10 - 2 \\right) - 3',
			'10 - \\left( 2 - 3 \\right)'
		]);
	});

	it('2x + 3 − 4y : les termes gardent leur écriture (coefficients)', () => {
		const advice = adviceOf('2x+3-4y');
		expect(advice?.reason).toBe('chain');
		if (advice?.reason !== 'chain') return;
		expect(advice.proposals).toEqual([
			'\\left( 2 x + 3 \\right) - 4 y',
			'2 x + \\left( 3 - 4 y \\right)'
		]);
	});

	it('plus de 3 termes : de gauche à droite, ou de droite à gauche', () => {
		const advice = adviceOf('7-2+3x-5');
		expect(advice?.reason).toBe('chain');
		if (advice?.reason !== 'chain') return;
		expect(advice.proposals).toEqual([
			'\\left( \\left( 7 - 2 \\right) + 3 x \\right) - 5',
			'7 - \\left( 2 + \\left( 3 x - 5 \\right) \\right)'
		]);
	});

	it('un terme entre parenthèses garde ses parenthèses', () => {
		const advice = adviceOf('8-(2+x)+3');
		expect(advice?.reason).toBe('chain');
		if (advice?.reason !== 'chain') return;
		expect(advice.proposals).toEqual([
			'\\left( 8 - \\left( 2 + x \\right) \\right) + 3',
			'8 - \\left( \\left( 2 + x \\right) + 3 \\right)'
		]);
	});

	it('la règle vaut pour toute somme de l’arbre : 2 × (5 − 3 + x)', () => {
		const advice = adviceOf('2\\times(5-3+x)');
		expect(advice?.reason).toBe('chain');
		if (advice?.reason !== 'chain') return;
		expect(advice.proposals).toEqual(['\\left( 5 - 3 \\right) + x', '5 - \\left( 3 + x \\right)']);
	});

	it('somme au numérateur d’une fraction', () => {
		expect(adviceOf('\\frac{9-4+2x}{3}')?.reason).toBe('chain');
	});

	it('somme imbriquée dans une somme sans soucis : 4 + 2(6 − 1 + y)', () => {
		const advice = adviceOf('4+2(6-1+y)');
		expect(advice?.reason).toBe('chain');
		if (advice?.reason !== 'chain') return;
		expect(advice.proposals).toEqual(['\\left( 6 - 1 \\right) + y', '6 - \\left( 1 + y \\right)']);
	});

	it('somme dans un membre d’égalité : 3x = 9 − 2 + 4', () => {
		expect(adviceOf('3x=9-2+4')?.reason).toBe('chain');
	});

	it('node désigne la somme visée', () => {
		const result = structureFromLatex('2\\times(5-3+x)');
		if (result.status !== 'ok') throw new Error(result.status);
		const advice = parenthesesAdvice(result.structure);
		expect(advice && result.structure.nodes[advice.node].kind).toBe('sum');
		expect(advice?.node).not.toBe(result.structure.root);
	});
});

describe('parenthesesAdvice — C2 : un « − » en tête sans parenthèses', () => {
	it('−3 + x', () => {
		const advice = adviceOf('-3+x');
		expect(advice?.reason).toBe('leading-minus');
		if (advice?.reason !== 'leading-minus') return;
		expect(advice.example).toBe('\\left( -3 \\right) + x');
		expect(render(advice.segments)).toBe(leadingMinusMessage('\\left( -3 \\right) + x'));
	});

	it('−2x + 5 : le « − » porte sur le produit', () => {
		const advice = adviceOf('-2x+5');
		expect(advice?.reason).toBe('leading-minus');
		if (advice?.reason !== 'leading-minus') return;
		expect(advice.example).toBe('\\left( -2 x \\right) + 5');
	});

	it('−3x seul (décision à valider : message)', () => {
		const advice = adviceOf('-3x');
		expect(advice?.reason).toBe('leading-minus');
		if (advice?.reason !== 'leading-minus') return;
		expect(advice.example).toBe('\\left( -3 x \\right)');
	});

	it('−3 seul (décision à valider : message)', () => {
		const advice = adviceOf('-3');
		expect(advice?.reason).toBe('leading-minus');
		if (advice?.reason !== 'leading-minus') return;
		expect(advice.example).toBe('\\left( -3 \\right)');
	});

	it('dans un membre : 2x = −6', () => {
		const advice = adviceOf('2x=-6');
		expect(advice?.reason).toBe('leading-minus');
		if (advice?.reason !== 'leading-minus') return;
		expect(advice.example).toBe('\\left( -6 \\right)');
	});

	it('−3 + x − 2 : le « − » en tête passe avant la suite', () => {
		expect(adviceOf('-3+x-2')?.reason).toBe('leading-minus');
	});

	it('somme imbriquée : 4 × (−5 + 2y)', () => {
		const advice = adviceOf('4\\times(-5+2y)');
		expect(advice?.reason).toBe('leading-minus');
		if (advice?.reason !== 'leading-minus') return;
		expect(advice.example).toBe('\\left( -5 \\right) + 2 y');
	});
});

describe('parenthesesAdvice — C3 : pas de message', () => {
	it.each([
		'2+3+4',
		'5-3',
		'5-(3+x)',
		'7x-2',
		'2+3x+4y',
		'(-3)+x',
		'2\\times(-3)',
		'5+(-3)',
		'(5-3)+2x',
		'5-(3+(x-2))',
		'3\\times(4-2)',
		'\\frac{8-2}{3}'
	])('%s', (latex) => {
		expect(adviceOf(latex)).toBeNull();
	});
});

describe('needsParenthesesAdvice — C4 : niveau de l’élève', () => {
	it.each(['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6'])('%s : oui', (grade) => {
		expect(needsParenthesesAdvice(grade)).toBe(true);
	});

	it.each(['5', '4', '3', '2', '1_SPE', 'T_EXP', '1_TECHNO'])('%s : non', (grade) => {
		expect(needsParenthesesAdvice(grade)).toBe(false);
	});

	it('visiteur (null, undefined) : non', () => {
		expect(needsParenthesesAdvice(null)).toBe(false);
		expect(needsParenthesesAdvice(undefined)).toBe(false);
	});

	it('niveau inconnu : non', () => {
		expect(needsParenthesesAdvice('6e')).toBe(false);
		expect(needsParenthesesAdvice('')).toBe(false);
	});
});
