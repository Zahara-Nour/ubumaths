/**
 * Écriture des nombres dans les `{{eval:…}}` (2026-11-26)
 * =======================================================
 *
 * Règle : un zéro final ne s'écrit que s'il dit quelque chose — arrondi (`;aN`, `;pN`),
 * centimes (euro), ou demandé par l'auteur (`;dN`).
 *
 * Chaque cas asserte le RENDU : la chaîne LaTeX que voit l'élève dans l'énoncé
 * (`expressionToLatex` du `$…$`) et la réponse attendue de la case — un passage par un
 * nœud nombre ne doit pas perdre les zéros finaux.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import type { QuestionTemplate } from '../../types';
import type { Variable } from '#lib/ubumark/index.ts';
import { templateMarkdown } from '#lib/ubumark/index.ts';
import { expressionToLatex } from '#lib/components/markdown/utils/math-utils.ts';

function instanceOf(statement: string, expectedAnswer: string, variables: Variable[] = []) {
	const template: QuestionTemplate = {
		id: 't',
		title: 't',
		status: 'draft',
		grades: ['6'],
		level: 1,
		variations: [
			{
				statement: templateMarkdown(`${statement} $?$`),
				variables,
				blanks: [{ expectedAnswer }]
			}
		]
	};
	const result = generateInstance(template, 1);
	if (!result.success) throw new Error(result.errors.join('; '));
	return result.instance;
}

/** Le premier `$…$` de l'énoncé, rendu comme à l'écran */
function firstMathRendered(statement: string): string {
	const match = /\$([^$]+)\$/.exec(statement);
	if (!match) throw new Error(`pas de $…$ dans ${statement}`);
	return expressionToLatex(match[1], 'latex');
}

/** Énoncé rendu et réponse attendue de `{{eval:<expression>}}` */
function shown(expression: string, variables: Variable[] = []) {
	const token = `{{eval:${expression}}}`;
	const instance = instanceOf(`$${token}$`, token, variables);
	return {
		statement: firstMathRendered(String(instance.statement)),
		expected: instance.blanks?.[0]?.expectedAnswer
	};
}

/** Message d'erreur d'un tirage */
function drawError(expression: string): string {
	const template: QuestionTemplate = {
		id: 't',
		title: 't',
		status: 'draft',
		grades: ['6'],
		level: 1,
		variations: [
			{
				statement: templateMarkdown(`\${{eval:${expression}}}$ $?$`),
				blanks: [{ expectedAnswer: '1' }]
			}
		]
	};
	const result = generateInstance(template, 1);
	return result.success ? '' : result.errors.join('; ');
}

describe(';dN — au moins N décimales, sans arrondir', () => {
	it.each([
		['1.5;d2', '1{,}50', '1.50'],
		['4;d2', '4{,}00', '4.00'],
		['3.755;d2', '3{,}755', '3.755'],
		['3/2;d3', '1{,}500', '1.500']
	])('{{eval:%s}} → %s', (expression, latex, answer) => {
		expect(shown(expression)).toEqual({ statement: latex, expected: answer });
	});

	it(';d seul garde son sens', () => {
		expect(shown('3/2;d')).toEqual({ statement: '1{,}5', expected: '1.5' });
	});
});

describe(';aN — arrondi à N décimales, N décimales écrites', () => {
	it.each([
		['2.675;a2', '2{,}68', '2.68'],
		['3.04;a1', '3{,}0', '3.0'],
		['3.704;a2', '3{,}70', '3.70'],
		['-2.345;a2', '-2{,}35', '-2.35'],
		['2.6;a0', '3', '3'],
		['1/3;a3', '0{,}333', '0.333'],
		['sqrt(2);a4', '1{,}4142', '1.4142']
	])('{{eval:%s}} → %s', (expression, latex, answer) => {
		expect(shown(expression)).toEqual({ statement: latex, expected: answer });
	});

	it('la valeur arrondie d’une variable garde ses zéros quand on la cite', () => {
		const instance = instanceOf('${{p}}$', '{{p}}', [
			{ name: 'x', expression: '1.364' },
			{ name: 'p', expression: '{{eval:x*1.1;a2}}' }
		]);
		expect(firstMathRendered(String(instance.statement))).toBe('1{,}50');
		expect(instance.blanks?.[0]?.expectedAnswer).toBe('1.50');
	});
});

describe(';pN — arrondi à N chiffres significatifs, tous écrits', () => {
	it.each([
		['3.04;p2', '3{,}0', '3.0'],
		['0.00456;p2', '0{,}0046', '0.0046'],
		['9.96;p2', '10', '10'],
		['0.0996;p2', '0{,}10', '0.10'],
		['1234;p2', '1200', '1200'],
		['123456;p2', '120\\,000', '120000'],
		['-0.04567;p3', '-0{,}0457', '-0.0457']
	])('{{eval:%s}} → %s', (expression, latex, answer) => {
		expect(shown(expression)).toEqual({ statement: latex, expected: answer });
	});

	it.each([
		['1234;sci;p2', '1{,}2\\times10^{3}', '1.2 \\times 10^{3}'],
		['3;sci;p2', '3{,}0\\times10^{0}', '3.0 \\times 10^{0}'],
		['0.0009996;sci;p2', '1{,}0\\times10^{-3}', '1.0 \\times 10^{-3}']
	])('{{eval:%s}} : la mantisse a N chiffres', (expression, _latex, answer) => {
		expect(shown(expression).expected).toBe(answer);
		expect(shown(expression).statement).toContain('\\times');
	});
});

describe('combinaisons : grandeurs, ;+, ;()', () => {
	it('grandeur arrondie : 1,50 m', () => {
		const result = shown('(x)[m];a2', [{ name: 'x', expression: '1.4987' }]);
		expect(result.expected).toBe('1.50[m]');
		expect(result.statement).toBe('1{,}50~\\mathrm{m}');
	});

	it('la conversion ;[cm] se fait avant l’arrondi', () => {
		expect(shown('(x)[m];[cm];a0', [{ name: 'x', expression: '1.4987' }]).expected).toBe('150[cm]');
		expect(shown('1[min];[h];a2').expected).toBe('0.02[h]');
	});

	it('grandeur et ;dN, ;pN', () => {
		expect(shown('1.5[m];d2').expected).toBe('1.50[m]');
		expect(shown('1234[m];p2').expected).toBe('1200[m]');
	});

	it(';+ et ;() avec un arrondi', () => {
		expect(shown('3.04;a1,+').expected).toBe('+3.0');
		expect(shown('-3.04;a1;()').expected).toBe('(-3.0)');
		expect(shown('-0.001;a2,+').expected).toBe('+0.00');
	});
});

describe('refus : erreur de tirage en français', () => {
	it.each([
		['x;a2;p2', /;a.*;p|;p.*;a/],
		['x;d2;a1', /;d2/],
		['135[min];hms;a1', /;hms/],
		['x;a', /chiffre/],
		['x;p16', /entre 1 et 15/]
	])('{{eval:%s}}', (expression, message) => {
		expect(drawError(expression)).toMatch(message);
	});
});

describe('euro : une seule décimale s’écrit avec deux', () => {
	it.each([
		['(37/10)[€]', '3.70[€]', '3{,}70~\\text{€}'],
		['12[€]', '12[€]', '12~\\text{€}'],
		['4.25[€]', '4.25[€]', '4{,}25~\\text{€}'],
		['3.755[€]', '3.755[€]', '3{,}755~\\text{€}'],
		['3.7[euros]', '3.70[euros]', null],
		['2*1.85[€]', '3.70[€]', null],
		['37[€];[€]', '37[€]', null],
		['370[€]/100;[€]', '3.70[€]', null]
	])('{{eval:%s}} → %s', (expression, answer, latex) => {
		const result = shown(expression);
		expect(result.expected).toBe(answer);
		if (latex !== null) expect(result.statement).toBe(latex);
	});

	it('un réglage écrit l’emporte', () => {
		expect(shown('12.345[€];p3').expected).toBe('12.3[€]');
		expect(shown('3.7[€];d3').expected).toBe('3.700[€]');
		expect(shown('3.7[€];a0').expected).toBe('4[€]');
	});

	it('une autre unité n’est pas touchée', () => {
		expect(shown('3.7[m]').expected).toBe('3.7[m]');
	});
});
