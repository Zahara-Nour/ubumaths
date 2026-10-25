/**
 * `explainExpansion` — la seule rédaction montrée de l'intention `developper`
 * (option B de David, 2026-10-14) : l'atelier, les corrections d'exercices et
 * la démo l'appellent. Ici, son contrat : trois issues, la réponse du pipeline
 * rangée dans l'ordre du manuel (le RÉSULTAT ne change pas), les décimaux
 * selon l'écriture ou l'option, le rendu au niveau demandé. Entrées PARSÉES,
 * coefficients ≠ 1.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { generatePedagogicalSimplifySteps } from '../pipeline';
import { orderExpanded } from '../expand-order';
import { explainExpansion, type ExplainedExpansion } from '../expand-explained';

/** Le développement expliqué d'une entrée LaTeX, au lycée sauf mention. */
function explain(latex: string, decimal = false): ExplainedExpansion {
	return explainExpansion(parseLatex(latex), { schoolLevel: 'lycee', decimal });
}

/** La réponse en LaTeX, ou l'issue quand il n'y en a pas. */
function answerOf(explained: ExplainedExpansion): string {
	return explained.kind === 'expanded' ? toLatex(explained.answer) : explained.kind;
}

describe('explainExpansion — trois issues', () => {
	it('développée : la réponse et ses étapes, détaillées et résumées', () => {
		const explained = explain('(2x-1)(x+3)');

		expect(answerOf(explained)).toBe('2 x^2 + 5 x - 3');
		if (explained.kind !== 'expanded' || explained.steps === null) throw new Error('pas d’étapes');
		expect(explained.steps.detailed.map((step) => step.title)).toEqual([
			'On distribue : chaque terme du premier facteur multiplie chaque terme du second',
			'On calcule chaque produit',
			'On réduit'
		]);
		expect(explained.steps.summarized.length).toBeLessThan(explained.steps.detailed.length);
		expect(explained.steps.raw.steps.length).toBe(explained.steps.detailed.length);
	});

	it('rien à développer : unchanged', () => {
		expect(explain('3x^2+1').kind).toBe('unchanged');
		expect(explain('\\frac{1}{x+1}').kind).toBe('unchanged');
	});

	it('une somme dans un exposant : développée sur place, sans étapes (normalize-usages)', () => {
		const explained = explain('e^{(2x+1)^2}');

		expect(answerOf(explained)).toBe('\\exponentialE^{4 x^2 + 4 x + 1}');
		expect(explained.kind === 'expanded' && explained.steps).toBeNull();
	});

	it('une rédaction qui renonce : la réponse, sans étapes', () => {
		const explained = explain('\\cos(2(x+1))');

		expect(answerOf(explained)).toBe('\\cos\\left( 2 x + 2 \\right)');
		expect(explained.kind === 'expanded' && explained.steps).toBeNull();
	});

	it('−(2x − 3) : l’opposé d’une somme se développe', () => {
		expect(answerOf(explain('-(2x-3)'))).toBe('-2 x + 3');
	});

	it('des parenthèses autour de tout ne changent rien', () => {
		expect(explain('((2x+1)^2)')).toEqual(explain('(2x+1)^2'));
	});
});

describe('explainExpansion — la réponse est le résultat du pipeline, rangé', () => {
	it.each(['(2x-1)(x+3)', '(3x-1)^2-(x+2)^2', '(a+2b)^2', '3(x-2)-(x+1)', '(x+1)(x+2)(x+3)'])(
		'%s',
		(latex) => {
			const result = generatePedagogicalSimplifySteps(parseLatex(latex), {
				intent: 'developper',
				schoolLevel: 'lycee'
			}).result;

			expect(answerOf(explain(latex))).toBe(toLatex(orderExpanded(result)));
		}
	);
});

describe('explainExpansion — les décimaux suivent l’écriture', () => {
	it('des fractions écrites donnent des fractions', () => {
		expect(answerOf(explain('(\\frac{x}{2}+1)^2'))).toBe('\\dfrac{1}{4} x^2 + x + 1');
	});

	it('un décimal écrit donne des décimaux, dans la réponse et dans les étapes', () => {
		const explained = explain('(0.5x+1)^2');

		expect(answerOf(explained)).toBe('0.25 x^2 + x + 1');
		if (explained.kind !== 'expanded' || explained.steps === null) throw new Error('pas d’étapes');
		expect(explained.steps.detailed[0].title).toContain('a = 0.5x');
	});

	it('decimal: true (le mode décimal de l’atelier) : des décimaux même pour des fractions', () => {
		expect(answerOf(explain('(\\frac{x}{2}+1)^2', true))).toBe('0.25 x^2 + x + 1');
	});

	it('une fraction sans écriture décimale finie reste une fraction', () => {
		expect(answerOf(explain('(\\frac{x}{3}+1)^2', true))).toContain('\\dfrac{1}{9}');
	});
});

describe('explainExpansion — le rendu au niveau demandé', () => {
	it('collège : chaque étape rendue au collège', () => {
		const explained = explainExpansion(parseLatex('(x+3)(x-3)'), { schoolLevel: 'college' });
		if (explained.kind !== 'expanded' || explained.steps === null) throw new Error('pas d’étapes');

		for (const steps of [explained.steps.detailed, explained.steps.summarized]) {
			expect(steps.every((step) => step.schoolLevel === 'college')).toBe(true);
		}
	});
});
