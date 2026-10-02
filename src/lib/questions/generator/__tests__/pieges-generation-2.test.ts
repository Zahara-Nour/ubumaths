/**
 * Pièges de la génération, deuxième série (relevés en rédigeant des modèles, 2026-10) :
 * `%`, `or`/`and`/`not` et `pi` dans une condition, `sign()` dans `eval`, modificateurs
 * combinés en plusieurs `;`, tirage non défini (division par zéro, arccos hors domaine)
 * relancé, variable de plusieurs lettres valant π dans un calcul de fonctions.
 */
import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { evaluateConditions } from '../condition-evaluator';
import type { QuestionTemplate, QuestionVariation, ResolvedVariable } from '../../types';
import { templateMarkdown } from '$lib/ubumark';
import { resolveMarkdownContent } from '../content-resolver';

function makeTemplate(variation: Partial<QuestionVariation>): QuestionTemplate {
	return {
		id: 'pieges-2',
		title: 'Pièges 2',
		status: 'draft',
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		variations: [{ statement: templateMarkdown('$?$'), ...variation }]
	};
}

function generate(variation: Partial<QuestionVariation>, seed = 0) {
	const result = generateInstance(makeTemplate(variation), seed);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

function vars(values: Record<string, string>): ResolvedVariable[] {
	return Object.entries(values).map(([name, value]) => ({ name, value }));
}

function value(instance: ReturnType<typeof generate>, name: string): string | undefined {
	return instance.resolvedVariables?.find((v) => v.name === name)?.value;
}

describe('condition : % (reste de la division)', () => {
	it.each([
		['a % 10 != 0', '23', true],
		['a % 10 != 0', '30', false],
		['a % 2 = 1', '7', true],
		['(a+1) % 3 = 0', '8', true],
		['2*a % 4 = 2', '3', true],
		['gcd(a,4) % 2 = 0', '6', true]
	])('« %s » avec a = %s vaut %s', (condition, a, expected) => {
		expect(evaluateConditions([condition], vars({ a }))).toBe(expected);
	});

	it('se combine avec un autre reste', () => {
		expect(evaluateConditions(['a % 10 % 3 = 1'], vars({ a: '24' }))).toBe(true);
	});
});

describe('condition : or, and, not', () => {
	it.each([
		['a = 1 or a = 23', true],
		['a = 1 or a = 2', false],
		['a > 1 and a < 30', true],
		['a > 1 and a < 10', false],
		['not a = 1', true],
		['not a = 23', false],
		['not (a = 23)', false],
		['a > 0 and not a = 5', true],
		['not a = 1 and a = 23', true]
	])('« %s » avec a = 23 vaut %s', (condition, expected) => {
		expect(evaluateConditions([condition], vars({ a: '23' }))).toBe(expected);
	});

	it('un nom qui contient « or » (floor) n’est pas touché', () => {
		expect(evaluateConditions(['floor(a/2) = 11'], vars({ a: '23' }))).toBe(true);
	});

	it('`!a = 1` (négation collée à la variable) est une erreur explicite, pas un faux', () => {
		expect(() => evaluateConditions(['!a = 1'], vars({ a: '23' }))).toThrow(/!\(/);
	});
});

describe('sign() dans eval et dans une condition', () => {
	it.each([
		['-3', '-1'],
		['0', '0'],
		['5', '1']
	])('{{eval:sign(a)}} avec a = %s vaut %s', (a, expected) => {
		const instance = generate({
			variables: [{ name: 'a', expression: a }],
			blanks: [{ expectedAnswer: '{{eval:sign(a)}}' }]
		});
		expect(instance.blanks?.[0].expectedAnswer).toBe(expected);
	});

	it('sign() se calcule dans une condition', () => {
		expect(evaluateConditions(['sign(a) = -1'], vars({ a: '-3' }))).toBe(true);
	});
});

describe('pi dans une condition', () => {
	it('cos(pi/6) >= 0.1 est vrai', () => {
		expect(evaluateConditions(['cos(pi/6) >= 0.1'], [])).toBe(true);
	});

	it('pi vaut π aussi avec une variable tirée', () => {
		expect(evaluateConditions(['sin(a*pi/6) > 0.9'], vars({ a: '3' }))).toBe(true);
	});
});

describe('modificateurs combinés en plusieurs ;', () => {
	function statementWith(mods: string): string {
		const instance = generate({
			variables: [{ name: 'a', expression: '-7' }],
			statement: templateMarkdown(`$3\\times{{eval:a/2;${mods}}}=?$`),
			blanks: [{ expectedAnswer: '1' }]
		});
		return String(instance.statement).replace(/\s+/g, '');
	}

	it.each(['();d', 'd;()'])('{{eval:a/2;%s}} donne le décimal entre parenthèses', (mods) => {
		expect(statementWith(mods)).toContain('(-3.5)');
		expect(statementWith(mods)).toBe(statementWith('d,()'));
	});
});

describe('tirage non défini : relancé comme une condition fausse', () => {
	it('arccos hors de [−1 ; 1] dans une variable : le tirage est relancé', () => {
		for (let seed = 0; seed < 30; seed++) {
			const instance = generate(
				{
					variables: [
						{ name: 'a', expression: '1..3' },
						{ name: 'b', expression: '{{eval:arccos(a/2)}}' }
					],
					blanks: [{ expectedAnswer: '{{eval:b}}' }]
				},
				seed
			);
			expect(value(instance, 'a')).not.toBe('3');
		}
	});

	it('division par zéro dans une variable : le tirage est relancé', () => {
		for (let seed = 0; seed < 30; seed++) {
			const instance = generate(
				{
					variables: [
						{ name: 'a', expression: '1..3' },
						{ name: 'b', expression: '{{eval:1/(a-2)}}' }
					],
					conditions: ['a != 5'],
					blanks: [{ expectedAnswer: '{{eval:b}}' }]
				},
				seed
			);
			expect(value(instance, 'a')).not.toBe('2');
		}
	});

	it('jamais défini : échec explicite après épuisement des essais', () => {
		const result = generateInstance(
			makeTemplate({
				variables: [{ name: 'b', expression: '{{eval:arccos(2)}}' }],
				blanks: [{ expectedAnswer: '{{eval:b}}' }]
			}),
			0
		);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.errors.join(' ')).toMatch(/100/);
			expect(result.errors.join(' ')).toMatch(/arccos/);
		}
	});
});

describe('variable de plusieurs lettres valant un calcul avec π', () => {
	it('round(cos(ang)*100) avec ang = π/6', () => {
		const instance = generate({
			variables: [
				{ name: 'ang', expression: '{{eval:pi/6}}' },
				{ name: 'r', expression: '{{eval:round(cos(ang)*100)}}' }
			],
			blanks: [{ expectedAnswer: '{{r}}' }]
		});
		expect(value(instance, 'r')).toBe('87');
	});

	it('round(ex*10) avec ex = e²', () => {
		const instance = generate({
			variables: [
				{ name: 'ex', expression: '{{eval:e^2}}' },
				{ name: 'r', expression: '{{eval:round(ex*10)}}' }
			],
			blanks: [{ expectedAnswer: '{{r}}' }]
		});
		expect(value(instance, 'r')).toBe('74');
	});

	it('round(xy) avec xy = \\pi', () => {
		const instance = generate({
			variables: [
				{ name: 'xy', expression: '\\pi' },
				{ name: 'r', expression: '{{eval:round(xy)}}' }
			],
			blanks: [{ expectedAnswer: '{{r}}' }]
		});
		expect(value(instance, 'r')).toBe('3');
	});
});

describe('i en indice dans un énoncé', () => {
	it.each([
		['$x_i$', '$x_i$'],
		['$p_i$', '$p_i$'],
		['$u_{i+1}$', '$u_{i + 1}$']
	])('%s reste un indice', (source, expected) => {
		expect(resolveMarkdownContent(templateMarkdown(source), [])).toBe(expected);
	});

	it('$z=1+i$ garde l’unité imaginaire', () => {
		expect(resolveMarkdownContent(templateMarkdown('$z=1+i$'), [])).toContain('\\imaginaryI');
	});
});
