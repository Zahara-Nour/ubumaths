/**
 * Lot 3 du chantier simplify-carte (`docs/wip/simplify-carte-progress.md` § 33,
 * validé par David le 2026-10-23) : `réduire` et `auto` cessent de développer.
 *
 * - `réduire` : identités, puissances, racines (étapes nommées), puis `tidy`,
 *   qui raconte. Ni développement ni factorisation : `2(x+3)` reste.
 * - `auto` : `réduire`, puis les fractions de polynômes simplifiées en montrant
 *   la factorisation (Q4), puis « développer seulement si plus court », rédigé
 *   comme `.développer`. Le résultat n'est jamais factorisé (ADR 0007).
 *
 * Avant le lot, les deux passaient par `normalize`, qui développe tout :
 * `2(x+3) → 2x+6`, `(x+1)² → x²+2x+1`, et `auto` faisait l'aller-retour
 * `x²+2x+1 → (x+1)² → x²+2x+1` à l'écran.
 */

import { describe, it, expect } from 'vitest';
import { parseCustom } from '../../parser/custom';
import { toCustom } from '../../custom-generator';
import { generatePedagogicalSimplifySteps } from '../pipeline';
import { PedagogicalSimplifyRenderer } from '../renderer';
import type { SimplifyIntent } from '../types';

/** Les noms d'étapes de `normalize` : aucun ne doit plus sortir de `réduire` ni d'`auto`. */
const NORMALIZE_STEP_NAMES = ['combine-like-terms', 'simplify-fraction', 'expand-power'];

function run(input: string, intent: SimplifyIntent) {
	const outcome = generatePedagogicalSimplifySteps(parseCustom(input), {
		intent,
		schoolLevel: 'lycee'
	});
	return { ...outcome, text: toCustom(outcome.result), rules: outcome.steps.map((s) => s.rule) };
}

function titlesOf(input: string, intent: SimplifyIntent): string[] {
	const { steps } = run(input, intent);
	return new PedagogicalSimplifyRenderer()
		.renderAll(steps, { schoolLevel: 'lycee', verbosity: 'detailed' })
		.map((step) => step.title);
}

describe('réduire ne développe pas', () => {
	it.each([['2(x+3)'], ['(x+1)^2'], ['-(x+2)'], ['(x+1)(x-2)+1/{x+1}'], ['(x^2-1)/{x+1}']])(
		'%s reste tel quel, sans étape',
		(input) => {
			const { text, steps } = run(input, 'reduire');
			expect(text).toBe(toCustom(parseCustom(input)));
			expect(steps).toEqual([]);
		}
	);

	it('regroupe des termes semblables sans les développer : 2(x+1)²+3(x+1)² → 5(x+1)²', () => {
		expect(run('2(x+1)^2+3(x+1)^2', 'reduire').text).toBe('5(x+1)^2');
	});
});

describe('réduire garde ce qu’il savait faire, sans normalize', () => {
	it.each([
		['3x+2y+x-y', '4x+y'],
		['2x+3-x+1', 'x+4'],
		['sin(x)^2+cos(x)^2', '1'],
		['ln(exp(x))', 'x'],
		['x^2*x^3', 'x^5'],
		['(x^2)^3', 'x^6'],
		['sqrt(8)', '2sqrt(2)'],
		['1/2+1/3', '5/6'],
		['exp(x)*exp(2x)', 'exp(3x)']
	])('%s → %s', (input, expected) => {
		const { text, rules } = run(input, 'reduire');
		expect(text).toBe(expected);
		expect(rules.length).toBeGreaterThan(0);
		expect(rules.filter((rule) => NORMALIZE_STEP_NAMES.includes(rule))).toEqual([]);
	});

	it('les termes semblables ont leur titre', () => {
		expect(titlesOf('2x+3x', 'reduire')).toEqual(['On regroupe les termes semblables']);
	});
});

describe('auto : jamais de factorisation dans le résultat', () => {
	it('x²+2x+1 reste, sans aller-retour à l’écran', () => {
		const { text, steps } = run('x^2+2x+1', 'auto');
		expect(text).toBe('x^2+2x+1');
		expect(steps).toEqual([]);
	});

	it.each([['x^2-4'], ['x^3+3x^2+3x+1'], ['x^2+2x']])('%s reste développé', (input) => {
		const { text, steps } = run(input, 'auto');
		expect(text).toBe(input);
		expect(steps.filter((s) => s.category === 'factorisation')).toEqual([]);
	});
});

describe('auto : développer seulement si c’est plus court', () => {
	it.each([['(x+1)^2'], ['2(x+3)'], ['-(x+2)'], ['(x+1)(x-2)+1/{x+1}']])(
		'%s reste tel quel (développer allonge)',
		(input) => {
			const { text, steps } = run(input, 'auto');
			expect(text).toBe(toCustom(parseCustom(input)));
			expect(steps).toEqual([]);
		}
	);

	it.each([
		['(x+1)^2-x^2', '2x+1'],
		['x(x+1)', 'x^2+x'],
		['(x+1)(x-1)', 'x^2-1'],
		['(3x+2)^2-x^2+5x-3', '8x^2+17x+1']
	])('%s → %s, rédigé comme .développer', (input, expected) => {
		const { text, rules } = run(input, 'auto');
		expect(text).toBe(expected);
		expect(rules.some((rule) => rule.startsWith('expand-'))).toBe(true);
		expect(rules.filter((rule) => NORMALIZE_STEP_NAMES.includes(rule))).toEqual([]);
	});

	it('la dernière étape rend le résultat', () => {
		const { steps, result } = run('(x+1)^2-x^2', 'auto');
		const last = steps[steps.length - 1];
		expect(toCustom(last.globalAfter ?? last.after)).toBe(toCustom(result));
	});

	it('regroupe 2(x+1)²+3(x+1)² en 5(x+1)², sans développer', () => {
		expect(run('2(x+1)^2+3(x+1)^2', 'auto').text).toBe('5(x+1)^2');
	});
});

describe('auto : une fraction de polynômes se simplifie en montrant la factorisation (Q4)', () => {
	it.each([
		['(x^2-1)/{x+1}', 'x-1', 'x ≠ −1'],
		['(x^2-4)/{x-2}', 'x+2', 'x ≠ 2'],
		['(2x+2)/{x+1}', '2', 'x ≠ −1'],
		['(x^2-x)/x', 'x-1', 'x ≠ 0'],
		['(x^2+2x+1)/{x+1}', 'x+1', 'x ≠ −1']
	])('%s → %s, pour %s', (input, expected, condition) => {
		const { text, steps } = run(input, 'auto');
		expect(text).toBe(expected);
		// Une étape montre la fraction factorisée, avant la simplification
		expect(steps.some((s) => s.category === 'factorisation')).toBe(true);
		// La condition est dite
		expect(titlesOf(input, 'auto').some((title) => title.includes(condition))).toBe(true);
	});

	it('(x²−1)/(x+1) passe par (x−1)(x+1)/(x+1)', () => {
		const { steps } = run('(x^2-1)/{x+1}', 'auto');
		const images = steps.map((s) => toCustom(s.globalAfter ?? s.after));
		expect(images).toContain('{(x-1)(x+1)}/{x+1}');
	});

	it('une fraction sans facteur commun reste', () => {
		const { text, steps } = run('(x+1)/{x-1}', 'auto');
		expect(text).toBe(toCustom(parseCustom('(x+1)/{x-1}')));
		expect(steps).toEqual([]);
	});
});

// Revue de la PR (code-reviewer opus, 2026-10-23)
describe('revue du lot 3', () => {
	it.each([
		['exp(x)exp(x)+exp(x)', '(exp(x)+1)exp(x)'],
		['exp(x)exp(2)+3exp(x)', '(3+exp(2))exp(x)']
	])('factoriser garde son facteur commun : %s → %s', (input, expected) => {
		// Les règles de la fonction exp ne servent qu'à réduire et auto
		expect(run(input, 'factoriser').text).toBe(expected);
	});

	it.each([
		['(x^3+6x^2+11x+6)/{x+3}', 'x^2+3x+2'],
		['(x^3-x)/x^2', '{x^2-1}/x']
	])('auto ne rend pas de forme factorisée après une fraction : %s → %s', (input, expected) => {
		expect(run(input, 'auto').text).toBe(expected);
	});

	it.each([
		['(x^2-1)/{x+1}+1', 'x'],
		['(x^2-1)/{x+1}+(x^2-4)/{x-2}', '2x+1']
	])('auto réduit la somme après la fraction : %s → %s', (input, expected) => {
		expect(run(input, 'auto').text).toBe(expected);
	});

	it.each([
		['x-(x-1)', '1'],
		['3-(x+2)', '-x+1']
	])('auto développe une parenthèse précédée d’un − : %s → %s', (input, expected) => {
		expect(run(input, 'auto').text).toBe(expected);
	});

	it('réduire ne range pas une constante devant un produit à développer', () => {
		const { text, rules } = run('(x+1)(x-1)+1', 'reduire');
		expect(text).toBe('(x+1)(x-1)+1');
		expect(rules).not.toContain('tidy-sort-terms');
	});
});
