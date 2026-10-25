/**
 * Corrections automatiques d'équations : les étapes écrites comme la réponse
 * (lot 5f-4 du chantier `simplify-carte`, R8 ; Q46, David, 2026-10-24) — même
 * règle que `.résoudre` (`atelier/__tests__/resoudre-etapes-5f4.test.ts`).
 */

import { describe, it, expect } from 'vitest';
import { generateCorrection } from '../correction-generator';
import { resolvedMarkdown } from '$lib/ubumark';
import type { QuestionInstance } from '../../types';
import type { GradeCode } from '$lib/types/grades';

// =============================================================================
// Décor
// =============================================================================

function instanceWith(
	generatedSteps: NonNullable<QuestionInstance['correction']>['generatedSteps'],
	grades: readonly GradeCode[]
): QuestionInstance {
	return {
		templateId: 'test-template',
		statement: resolvedMarkdown('Test statement'),
		resolvedVariables: [],
		grades: [...grades],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: '2026-10-25T00:00:00Z',
		correction: { generatedSteps }
	};
}

/** Titres et LaTeX des étapes rendues, sans espaces ni `\left`/`\right` ni `\{`. */
function shown(instance: QuestionInstance): string {
	const steps = generateCorrection(instance).correction?._renderedSteps ?? [];
	if (steps.length === 0) throw new Error('pas d’étapes');
	return steps
		.map((s) => `${s.title} :: ${s.expressionLatex ?? ''}`)
		.join('\n')
		.replace(/\\left|\\right|\\,/g, '')
		.replace(/\\([{}])/g, '$1')
		.replace(/\s/g, '');
}

// =============================================================================
// Comportements
// =============================================================================

describe('generateCorrection — équations : étapes écrites comme la réponse (Q46)', () => {
	it('linear-equation 0,5x + 1 = 2 : 0,5x = 1, « On divise par 0,5 »', () => {
		const text = shown(instanceWith({ kind: 'linear-equation', equation: '0.5*x+1=2' }, ['4']));
		expect(text).toContain('0.5x&=1');
		expect(text).toContain('Ondiviselesdeuxmembrespar$0.5$');
		expect(text).not.toContain('\\dfrac{1}{2}');
	});

	it('linear-equation 2x = 0,6 : x = 0,3', () => {
		const text = shown(instanceWith({ kind: 'linear-equation', equation: '2*x=0.6' }, ['4']));
		expect(text).toContain('Solution:$x=0.3$');
		expect(text).not.toContain('\\dfrac{3}{10}');
	});

	it('quadratic-equation 2x² = 1 : S = {−√2/2 ; √2/2}', () => {
		const text = shown(
			instanceWith({ kind: 'quadratic-equation', equation: '2*x^2=1' }, ['1_SPE'])
		);
		expect(text).toContain('S={-\\dfrac{\\sqrt{2}}{2};\\dfrac{\\sqrt{2}}{2}}');
	});

	it('sans décimal tapé, une fraction reste une fraction : 3x = 2 → x = 2/3', () => {
		const text = shown(instanceWith({ kind: 'linear-equation', equation: '3*x=2' }, ['4']));
		expect(text).toContain('Solution:$x=\\dfrac{2}{3}$');
	});
});

describe('generateCorrection — inéquations : étapes écrites comme la réponse (Q50)', () => {
	it('quadratic-inequality x² − 0,3x − 0,1 < 0 : b = −0,3, racines −0,2 et 0,5, S en décimal', () => {
		const text = shown(
			instanceWith({ kind: 'quadratic-inequality', inequality: 'x^2-0.3*x-0.1<0' }, ['1_SPE'])
		);
		expect(text).toContain('b=-0.3');
		expect(text).toContain('S=]-0.2;0.5[');
		expect(text).not.toContain('\\dfrac{3}{10}');
		expect(text).not.toContain('\\dfrac{1}{5}');
	});

	it('rational-inequality (x − 0,5)/(x + 1) > 0 : la racine 0,5 jusqu’au tableau', () => {
		const text = shown(
			instanceWith({ kind: 'rational-inequality', inequality: '(x-0.5)/(x+1)>0' }, ['1_SPE'])
		);
		expect(text).toContain(']0.5;+\\infty[');
		expect(text).not.toContain('\\dfrac{1}{2}');
	});
});
