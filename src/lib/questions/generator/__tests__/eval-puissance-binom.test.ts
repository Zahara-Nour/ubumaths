/**
 * `{{eval:…}}` : puissance d'une fraction à exposant calculé (`(2/3)^(n-k)`, rendu
 * `\left(\dfrac{2}{3}\right)^{4-3}` avant correction) ; fonctions `factorial` et `binom`
 * (cartes de probabilités de terminale, 2026-10-04).
 */
import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { evaluateConditions } from '../condition-evaluator';
import type { QuestionTemplate, QuestionVariation, ResolvedVariable } from '../../types';
import { templateMarkdown } from '$lib/ubumark';

function makeTemplate(variation: Partial<QuestionVariation>): QuestionTemplate {
	return {
		id: 'eval-puissance',
		title: 'Eval puissance',
		status: 'draft',
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		variations: [{ statement: templateMarkdown('$?$'), ...variation }]
	};
}

function attendu(expression: string, n = '4', k = '1'): string | undefined {
	const result = generateInstance(
		makeTemplate({
			variables: [
				{ name: 'n', expression: n },
				{ name: 'k', expression: k }
			],
			blanks: [{ expectedAnswer: `{{eval:${expression}}}` }]
		}),
		0
	);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance.blanks?.[0].expectedAnswer;
}

function echoue(expression: string, n = '4', k = '1'): boolean {
	const result = generateInstance(
		makeTemplate({
			variables: [
				{ name: 'n', expression: n },
				{ name: 'k', expression: k }
			],
			blanks: [{ expectedAnswer: `{{eval:${expression}}}` }]
		}),
		0
	);
	return !result.success;
}

function vars(values: Record<string, string>): ResolvedVariable[] {
	return Object.entries(values).map(([name, value]) => ({ name, value }));
}

describe('eval : puissance d’une fraction à exposant calculé', () => {
	it.each([
		['(2/3)^(4-3)', '\\dfrac{2}{3}'],
		['(2/3)^(n-k)', '\\dfrac{8}{27}'],
		['(2/3)^{n-1}', '\\dfrac{8}{27}'],
		['(1-1/n)^(n-1)', '\\dfrac{27}{64}'],
		['((n-1)/n)^(n-1)', '\\dfrac{27}{64}'],
		['(1/2)^(1-n)', '8'],
		['(1/3)^(2*k)', '\\dfrac{1}{9}'],
		['3*(2/3)^(n-k)+1', '\\dfrac{17}{9}']
	])('{{eval:%s}} (n = 4, k = 1) vaut %s', (expression, expected) => {
		expect(attendu(expression)).toBe(expected);
	});

	it.each([
		['(2/3)^n', '\\dfrac{16}{81}'],
		['(2/3)^1', '\\dfrac{2}{3}'],
		['(2/3)^3', '\\dfrac{8}{27}'],
		['0.7^(n-1)', '0.343'],
		['2^(n-1)', '8'],
		['(2/3)^(1/2)', '\\sqrt{\\dfrac{2}{3}}']
	])('non-régression : {{eval:%s}} vaut toujours %s', (expression, expected) => {
		expect(attendu(expression)).toBe(expected);
	});
});

describe('eval : factorial et binom', () => {
	it.each([
		['factorial(0)', '1'],
		['factorial(5)', '120'],
		['factorial(n)', '24'],
		['factorial(18)', '6402373705728000'],
		['binom(5,2)', '10'],
		['binom(n,k)', '4'],
		['binom(n,0)', '1'],
		['binom(n,n)', '1'],
		['binom(n,5)', '0'],
		['binom(n,-1)', '0'],
		['binom(50,25)', '126410606437752'],
		['factorial(n)/(factorial(k)*factorial(n-k))', '4']
	])('{{eval:%s}} (n = 4, k = 1) vaut %s', (expression, expected) => {
		expect(attendu(expression)).toBe(expected);
	});

	it('loi binomiale : binom(n,k)·p^k·(1−p)^(n−k) reste une fraction exacte', () => {
		expect(attendu('binom(n,k)*(2/3)^k*(1/3)^(n-k)')).toBe('\\dfrac{8}{81}');
		expect(attendu('binom(n,k)*(2/3)^k*(1/3)^(n-k)', '5', '2')).toBe('\\dfrac{40}{243}');
	});

	it('loi binomiale en décimal avec ;d', () => {
		expect(attendu('binom(n,k)*0.5^n;d', '4', '2')).toBe('0.375');
	});

	it.each([
		['factorial(-1)'],
		['factorial(5/2)'],
		['factorial(19)'],
		['binom(-1,0)'],
		['binom(5/2,1)'],
		['binom(n,1/2)'],
		['binom(60,30)']
	])('{{eval:%s}} est refusé (entier naturel exigé, résultat entier exact)', (expression) => {
		expect(echoue(expression)).toBe(true);
	});

	it('se calculent dans une condition', () => {
		expect(evaluateConditions(['binom(n,2) = 6'], vars({ n: '4' }))).toBe(true);
		expect(evaluateConditions(['factorial(n) > 20'], vars({ n: '4' }))).toBe(true);
	});
});
