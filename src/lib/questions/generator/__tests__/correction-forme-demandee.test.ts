/**
 * La forme de la réponse finale demandée par l'énoncé (D4, lot 5e du chantier
 * simplify-carte, § 20 et § 67-68 du journal)
 *
 * `generatedSteps.finalForm` sur une dérivée ou une primitive : vide, la
 * correction finit sur la forme par défaut (D1, § 7) ; `factorisee` ou
 * `developpee`, une dernière étape « On factorise » / « On développe » part de
 * la forme par défaut. Aucune étape quand la forme demandée est déjà là.
 *
 * - Dérivée factorisée : la forme du tableau de variations (D2), un nombre
 *   devant une somme accepté (Q39, David 2026-10-24 : `8x − 8 → 8(x − 1)`).
 * - Développée : numérateur seul d'un quotient (dénominateur gardé), une somme
 *   n'est pas mise au même dénominateur, un décimal tapé reste décimal (S1).
 * - Primitive factorisée : un facteur qui porte une fraction reste développé (Q34).
 */

import { describe, it, expect } from 'vitest';
import { generateCorrection } from '../correction-generator';
import { resolvedMarkdown } from '$lib/ubumark';
import type { GeneratedSteps, QuestionInstance } from '../../types';

// =============================================================================
// Helpers
// =============================================================================

function makeInstance(generatedSteps: GeneratedSteps): QuestionInstance {
	return {
		templateId: 'test-template',
		statement: resolvedMarkdown('Test statement'),
		resolvedVariables: [],
		grades: ['T_SPE'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: '2026-10-24T00:00:00Z',
		correction: { generatedSteps }
	};
}

function steps(generatedSteps: GeneratedSteps) {
	return generateCorrection(makeInstance(generatedSteps)).correction?._renderedSteps ?? [];
}

/** Le titre de la dernière étape et ce qu'elle écrit après son dernier « = ». */
function last(generatedSteps: GeneratedSteps) {
	const step = steps(generatedSteps).at(-1);
	const latex = step?.expressionLatex ?? '';
	return { title: step?.title, result: latex.split(' = ').at(-1) };
}

const derivative = (expression: string, finalForm?: 'developpee' | 'factorisee') =>
	last({ kind: 'differentiate', expression, ...(finalForm && { finalForm }) });

/** La primitive : l'étape avant « + C ». */
function antiderivative(expression: string, finalForm?: 'developpee' | 'factorisee') {
	const all = steps({ kind: 'integrate', expression, ...(finalForm && { finalForm }) });
	const beforeConstant = all.filter((step) => step.rule !== 'add-constant');
	const step = beforeConstant.at(-1);
	return {
		title: step?.title,
		result: (step?.expressionLatex ?? '').split(' = ').at(-1),
		constant: all.at(-1)?.expressionLatex
	};
}

// =============================================================================
// Dérivée
// =============================================================================

describe('finalForm — dérivée factorisée', () => {
	it('x³ − 3x² + 5 : On factorise, 3x(x − 2)', () => {
		expect(derivative('x^3 - 3x^2 + 5', 'factorisee')).toEqual({
			title: 'On factorise',
			result: '3 x \\left( x - 2 \\right)'
		});
	});

	it('2x³ − 9x² + 12x : 6(x − 1)(x − 2)', () => {
		expect(derivative('2x^3 - 9x^2 + 12x', 'factorisee').result).toBe(
			'6 \\left( x - 1 \\right) \\left( x - 2 \\right)'
		);
	});

	it('quotient : numérateur factorisé, dénominateur gardé', () => {
		expect(derivative('x/(x^2+1)', 'factorisee').result).toBe(
			'\\dfrac{\\left( 1 - x \\right) \\left( 1 + x \\right)}{\\left( x^2 + 1 \\right)^2}'
		);
	});

	it('Q39 : 4x² − 8x donne 8(x − 1), un nombre devant une somme est accepté', () => {
		expect(derivative('4x^2 - 8x', 'factorisee')).toEqual({
			title: 'On factorise',
			result: '8 \\left( x - 1 \\right)'
		});
	});

	it('déjà factorisée par défaut (x eˣ → (x + 1)eˣ) : pas d’étape en plus', () => {
		expect(derivative('x e^x', 'factorisee')).toEqual(derivative('x e^x'));
	});

	it('rien ne se factorise (ln x / x²) : pas d’étape en plus', () => {
		expect(derivative('ln(x)/x^2', 'factorisee')).toEqual(derivative('ln(x)/x^2'));
	});
});

describe('finalForm — dérivée développée', () => {
	it('x eˣ : On développe, x eˣ + eˣ', () => {
		expect(derivative('x e^x', 'developpee')).toEqual({
			title: 'On développe',
			result: 'x \\exponentialE^x + \\exponentialE^x'
		});
	});

	it('(x² + 2x)eˣ : x²eˣ + 4x eˣ + 2eˣ', () => {
		expect(derivative('(x^2+2x) e^x', 'developpee').result).toBe(
			'x^2 \\exponentialE^x + 4 x \\exponentialE^x + 2 \\exponentialE^x'
		);
	});

	it('quotient : le dénominateur n’est pas développé', () => {
		expect(derivative('x/(x^2+1)', 'developpee')).toEqual(derivative('x/(x^2+1)'));
	});

	it('signe devant la barre : −7/(x − 3)² reste tel quel', () => {
		expect(derivative('(2x+1)/(x-3)', 'developpee')).toEqual(derivative('(2x+1)/(x-3)'));
	});

	it('dénominateur numérique : (x + 1)³/3 → x³/3 + x² + x + 1/3', () => {
		expect(derivative('(x+1)^4/12', 'developpee').result).toBe(
			'\\dfrac{x^3}{3} + x^2 + x + \\dfrac{1}{3}'
		);
	});

	it('une somme n’est pas mise au même dénominateur : 2x − 4 + 1/x reste', () => {
		const result = derivative('x^2 - 4x + ln(x)', 'developpee');
		expect(result).toEqual(derivative('x^2 - 4x + ln(x)'));
		expect(result.result).not.toContain('\\dfrac{2 x^2');
	});

	it('S1 : un décimal tapé reste décimal (0,5x² − 1,5x → x − 1,5)', () => {
		const result = derivative('0,5x^2 - 1,5x + 2', 'developpee');
		expect(result).toEqual(derivative('0,5x^2 - 1,5x + 2'));
		expect(result.result).not.toContain('frac');
	});
});

describe('finalForm absent : la forme par défaut, inchangée', () => {
	it('dérivée : x³ − 3x² + 5 finit sur 3x² − 6x', () => {
		expect(derivative('x^3 - 3x^2 + 5').result).toBe('3 x^2 - 6 x');
	});

	it('primitive : 3x² − 2x finit sur x³ − x²', () => {
		expect(antiderivative('3x^2 - 2x').result).toBe('x^3 - x^2');
	});
});

// =============================================================================
// Primitive
// =============================================================================

describe('finalForm — primitive factorisée', () => {
	it('3x² − 2x : On factorise, x²(x − 1), puis + C sur la forme factorisée', () => {
		const result = antiderivative('3x^2 - 2x', 'factorisee');
		expect(result.title).toBe('On factorise');
		expect(result.result).toBe('x^2 \\left( x - 1 \\right)');
		expect(result.constant).toContain('x^2 \\left( x - 1 \\right) + C');
	});

	it('3x² − 12 : x(x − 2√3)(x + 2√3)', () => {
		expect(antiderivative('3x^2 - 12', 'factorisee').result).toBe(
			'x \\left( x - 2 \\sqrt{3} \\right) \\left( x + 2 \\sqrt{3} \\right)'
		);
	});

	it('Q34 : une fraction dans un facteur, la primitive reste développée (x² + 1 → x³/3 + x)', () => {
		expect(antiderivative('x^2 + 1', 'factorisee')).toEqual(antiderivative('x^2 + 1'));
	});

	it('Q34 et S1 : 0,6x + 1,2 reste développée', () => {
		expect(antiderivative('0,6x + 1,2', 'factorisee')).toEqual(antiderivative('0,6x + 1,2'));
	});
});

describe('finalForm — primitive développée', () => {
	it('x eˣ : On développe, x eˣ − eˣ', () => {
		const result = antiderivative('x e^x', 'developpee');
		expect(result.title).toBe('On développe');
		expect(result.result).toBe('x \\exponentialE^x - \\exponentialE^x');
		expect(result.constant).toContain('x \\exponentialE^x - \\exponentialE^x + C');
	});

	it('x² eˣ : x²eˣ − 2x eˣ + 2eˣ', () => {
		expect(antiderivative('x^2 e^x', 'developpee').result).toBe(
			'x^2 \\exponentialE^x - 2 x \\exponentialE^x + 2 \\exponentialE^x'
		);
	});

	it('déjà développée (3x² − 2x) : pas d’étape en plus', () => {
		expect(antiderivative('3x^2 - 2x', 'developpee')).toEqual(antiderivative('3x^2 - 2x'));
	});
});
