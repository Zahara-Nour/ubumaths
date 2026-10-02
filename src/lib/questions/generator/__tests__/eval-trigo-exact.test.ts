/**
 * `{{eval:cos(p*pi/d)}}` : valeurs trigonométriques remarquables exactes
 * =====================================================================
 *
 * Les modèles de trigonométrie (scripts/questions/trigo-1spe/) figeaient une variation
 * par valeur : en syntaxe maison, `pi` se lisait p × i (erreur « free variables: p »,
 * ou « Complex numbers not supported » quand p est une variable), et en LaTeX la valeur
 * exacte sortait non réduite (`-\dfrac{1}{2} \sqrt{3}`).
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import type { QuestionTemplate } from '../../types';
import type { Variable } from '$lib/ubumark';
import { evalResultToNumber } from '$lib/mathAST/eval/evaluate-with-modifiers';

function valueOf(expression: string, variables: Variable[] = []): string {
	const template = {
		id: 't',
		title: 't',
		status: 'draft',
		grades: ['1_SPE'],
		theme: 'T',
		domain: 'D',
		level: 1,
		variations: [
			{
				statement: `$u={{eval:${expression}}}$ ; $?$`,
				variables,
				blanks: [{ expectedAnswer: '1' }]
			}
		]
	} as QuestionTemplate;
	const result = generateInstance(template, 1);
	if (!result.success) throw new Error(result.errors.join('; '));
	const match = /^\$u\s*=\s*(.*?)\$ ;/.exec(result.instance.statement);
	if (!match) throw new Error(`Énoncé inattendu : ${result.instance.statement}`);
	return match[1].trim();
}

const angle = (p: number, d: number): Variable[] => [
	{ name: 'p', expression: String(p) },
	{ name: 'd', expression: String(d) }
];

describe('{{eval:…}} : valeurs trigonométriques remarquables', () => {
	it.each([
		['cos', 5, 6, '-\\dfrac{\\sqrt{3}}{2}'],
		['cos', 1, 6, '\\dfrac{\\sqrt{3}}{2}'],
		['cos', 3, 4, '-\\dfrac{\\sqrt{2}}{2}'],
		['cos', 1, 3, '\\dfrac{1}{2}'],
		['cos', 1, 2, '0'],
		['cos', 1, 1, '-1'],
		['cos', -7, 4, '\\dfrac{\\sqrt{2}}{2}'],
		['cos', 13, 6, '\\dfrac{\\sqrt{3}}{2}'],
		['sin', 5, 6, '\\dfrac{1}{2}'],
		['sin', -1, 4, '-\\dfrac{\\sqrt{2}}{2}'],
		['sin', 25, 6, '\\dfrac{1}{2}'],
		['tan', 1, 3, '\\sqrt{3}'],
		['tan', 1, 6, '\\dfrac{\\sqrt{3}}{3}'],
		['tan', 3, 4, '-1']
	])('%s(p*pi/d) avec p = %i, d = %i → %s', (fn, p, d, expected) => {
		expect(valueOf(`${fn}(p*pi/d)`, angle(p, d))).toBe(expected);
	});

	it.each([
		['sin(5*pi/6)', '\\dfrac{1}{2}'],
		['cos(2*pi/3)', '-\\dfrac{1}{2}'],
		['tan(pi/4)', '1'],
		['cos(5pi/6)', '-\\dfrac{\\sqrt{3}}{2}']
	])('angle écrit en clair : %s → %s', (expression, expected) => {
		expect(valueOf(expression)).toBe(expected);
	});

	it('écriture LaTeX : réduite elle aussi', () => {
		expect(valueOf('\\cos(\\frac{5\\pi}{6})')).toBe('-\\dfrac{\\sqrt{3}}{2}');
	});

	it('variables en {{…}} : cos({{p}}*pi/{{d}})', () => {
		expect(valueOf('cos({{p}}*pi/{{d}})', angle(5, 6))).toBe('-\\dfrac{\\sqrt{3}}{2}');
	});

	it.each(['tan(pi/2)', 'tan(-3*pi/2)', 'tan(pi/2);d'])(
		'tangente non définie : %s est une erreur, pas 16331239353195370',
		(expression) => {
			expect(() => valueOf(expression)).toThrow(/tan/);
		}
	);

	it('tangente non définie avec un angle tiré : tan(p*pi/d), p = 1, d = 2', () => {
		expect(() => valueOf('tan(p*pi/d)', angle(1, 2))).toThrow(/tan/);
	});

	it('angle non remarquable : jamais de fausse valeur exacte', () => {
		const value = valueOf('cos(pi/5)');
		expect(value).toContain('\\cos');
		expect(evalResultToNumber(value)).toBeCloseTo(Math.cos(Math.PI / 5), 12);
	});

	it('expression combinée : 2*cos(pi/3)+1 → 2', () => {
		expect(valueOf('2*cos(pi/3)+1')).toBe('2');
	});

	it('expression combinée non réductible : valeur juste', () => {
		const value = valueOf('cos(pi/5)+1');
		expect(evalResultToNumber(value)).toBeCloseTo(Math.cos(Math.PI / 5) + 1, 12);
	});

	it('modificateur ;+ sur un résultat exact positif', () => {
		expect(valueOf('cos(pi/6);+')).toBe('+\\dfrac{\\sqrt{3}}{2}');
	});

	it('modificateur ;() sur un résultat exact négatif', () => {
		expect(valueOf('cos(5*pi/6);()')).toBe('\\left( -\\dfrac{\\sqrt{3}}{2} \\right)');
	});

	it('modificateur ;d : écriture décimale', () => {
		expect(evalResultToNumber(valueOf('cos(pi/3);d'))).toBe(0.5);
	});

	it('un résultat exact se réutilise dans un autre calcul', () => {
		const variables: Variable[] = [
			...angle(1, 6),
			{ name: 'c', expression: '{{eval:cos(p*pi/d)}}' }
		];
		expect(valueOf('2*c', variables)).toBe('\\sqrt{3}');
	});

	it('pi au sein d’un mot reste un produit de lettres : pin n’est pas π × n', () => {
		// i reste l'unité imaginaire, comme aujourd'hui : erreur, pas 7π
		const variables: Variable[] = [
			{ name: 'p', expression: '3' },
			{ name: 'n', expression: '7' }
		];
		expect(() => valueOf('pin', variables)).toThrow(/Complex/);
	});
});

describe('garde-fou : multiples de π/12 entre −2π et 2π', () => {
	const ks = Array.from({ length: 49 }, (_, i) => i - 24);

	it.each(['cos', 'sin'] as const)(
		'%s(k*pi/12) : la valeur rendue vaut la valeur de Math',
		(fn) => {
			for (const k of ks) {
				const value = valueOf(`${fn}(p*pi/d)`, angle(k, 12));
				const expected = Math[fn]((k * Math.PI) / 12);
				const actual = evalResultToNumber(value);
				expect(Math.abs(actual - expected), `${fn}(${k}π/12) → ${value}`).toBeLessThan(1e-12);
				// Multiple de π/6 ou π/4 : écriture exacte, sans fonction trigonométrique
				if (k % 2 === 0 || k % 3 === 0) {
					expect(value, `${fn}(${k}π/12)`).not.toMatch(/\\(cos|sin)/);
				}
			}
		}
	);
});
