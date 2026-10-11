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
	parenthesesAdvice,
	structureFromLatex,
	type AdviceSegment,
	type ParenthesesAdvice
} from '..';

// Constantes
const NBSP = ' ';
const MINUS_MESSAGE = "Le signe − devant un nombre ou une lettre s'apprend en 5e.";

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

function sumLeadingMinusMessage(example: string): string {
	return `Le signe − devant un nombre ou une lettre s'apprend en 5e${NBSP}: écris-le entre parenthèses, par exemple $${example}$.`;
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

describe('parenthesesAdvice — C2 (Q21, Q22) : un « − » sans parenthèses', () => {
	it.each([
		['-3+x', '\\left( -3 \\right) + x'],
		['-x+3', '\\left( -x \\right) + 3'],
		['-3x+2', '\\left( -3 x \\right) + 2'],
		['-2x+5', '\\left( -2 x \\right) + 5'],
		['-3+x-2', '\\left( -3 \\right) + x - 2'],
		['4\\times(-5+2y)', '\\left( -5 \\right) + 2 y']
	])('%s commence une somme : exemple %s', (latex, example) => {
		const advice = adviceOf(latex);
		expect(advice?.reason).toBe('leading-minus');
		if (advice?.reason !== 'leading-minus') return;
		expect(advice.example).toBe(example);
		expect(render(advice.segments)).toBe(sumLeadingMinusMessage(example));
	});

	it.each([
		'-3',
		'-3x',
		'-x',
		'2x=-6',
		'\\frac{-3}{4}',
		'10^{-3}',
		'5\\times\\frac{-2}{7}',
		// Parenthèses non écrites par l'élève (toLatex les ajoute à l'affichage)
		'3\\times-2',
		'5\\times-x',
		'2+3\\times-1',
		'12\\div-3'
	])('%s : ailleurs, message sans exemple', (latex) => {
		const advice = adviceOf(latex);
		expect(advice?.reason).toBe('leading-minus');
		if (advice?.reason !== 'leading-minus') return;
		expect(advice.example).toBeNull();
		expect(render(advice.segments)).toBe(MINUS_MESSAGE);
	});

	it('node désigne le « − » visé : 2x = −6', () => {
		const result = structureFromLatex('2x=-6');
		if (result.status !== 'ok') throw new Error(result.status);
		const advice = parenthesesAdvice(result.structure);
		expect(advice && result.structure.nodes[advice.node].kind).toBe('opposite');
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
		'\\frac{8-2}{3}',
		// Miroirs écrits avec parenthèses
		'3\\times(-2)',
		'5\\times(-x)',
		'2+3\\times(-1)',
		'12\\div(-3)'
	])('%s', (latex) => {
		expect(adviceOf(latex)).toBeNull();
	});
});

describe('parenthesesAdvice — virgule décimale', () => {
	it('2,5 − 1,2 − 0,3 : propositions écrites avec la virgule', () => {
		const advice = adviceOf('2{,}5-1{,}2-0{,}3');
		expect(advice?.reason).toBe('chain');
		if (advice?.reason !== 'chain') return;
		expect(advice.proposals).toEqual([
			'\\left( 2{,}5 - 1{,}2 \\right) - 0{,}3',
			'2{,}5 - \\left( 1{,}2 - 0{,}3 \\right)'
		]);
	});

	it('−2,5 + 1,2 : exemple écrit avec la virgule', () => {
		const advice = adviceOf('-2{,}5+1{,}2');
		expect(advice?.reason).toBe('leading-minus');
		if (advice?.reason !== 'leading-minus') return;
		expect(advice.example).toBe('\\left( -2{,}5 \\right) + 1{,}2');
	});
});
