/**
 * Correction d'exercice générée — l'intention `developper` (option B, 2026-10-14)
 *
 * Décision de David : une intention, une seule rédaction. Une correction
 * `generatedSteps: { kind: 'simplify', intent: 'developper' }` montre à l'élève
 * les étapes de `writeExpandSteps`, celles du « Comment ? » de `.développer`
 * dans l'atelier — jamais la trace du pipeline (produits collés « 2x1 », la
 * même ligne répétée, la distribution cachée sous « On regroupe les termes
 * semblables »). Ce qu'elle ne sait pas rédiger retombe en silence sur le
 * Mode A (aucune étape générée), jamais sur l'ancienne trace.
 *
 * On asserte ce que l'élève VOIT : le titre de chaque étape et son image (la
 * ligne « = … » sous le titre). Coefficients ≠ 1.
 */

import { describe, it, expect } from 'vitest';
import { generateCorrection } from '../correction-generator';
import { resolvedMarkdown } from '$lib/ubumark';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import type { GeneratedStepsOptions, QuestionInstance } from '../../types';
import type { GradeCode } from '$lib/types/grades';
import { expandExpression } from '$lib/atelier/expand';

// =============================================================================
// Helpers
// =============================================================================

interface Exercise {
	readonly expression: string;
	readonly grades?: readonly GradeCode[];
	readonly resolvedVariables?: readonly { name: string; value: string }[];
	readonly options?: GeneratedStepsOptions;
}

function instanceOf({
	expression,
	grades = ['1_SPE'],
	resolvedVariables = [],
	options
}: Exercise): QuestionInstance {
	return {
		templateId: 'test-developper',
		statement: resolvedMarkdown('Développe et réduis.'),
		resolvedVariables: [...resolvedVariables],
		grades: [...grades],
		theme: 'Calcul littéral',
		domain: 'Développement',
		level: 1,
		generatedAt: '2026-10-14T00:00:00Z',
		correction: {
			generatedSteps: {
				kind: 'simplify',
				expression,
				intent: 'developper',
				...(options && { options })
			}
		}
	};
}

/** Les étapes que la correction affiche, ou `undefined` (Mode A). */
function stepsOf(exercise: Exercise): readonly RenderedStep[] | undefined {
	return generateCorrection(instanceOf(exercise)).correction?._renderedSteps;
}

/**
 * Les deux lignes d'une étape : l'expression de départ (en bleu) et l'image,
 * la ligne « = … » que l'élève lit sous le titre.
 */
function linesOf(step: RenderedStep): { before: string; image: string } {
	const latex = step.expressionLatex ?? '';
	const match =
		/^\\begin\{aligned\}\n {2}\\textcolor\{blue\}\{(.*)\} & \\\\\n {2}= (.*)\n\\end\{aligned\}$/.exec(
			latex
		);
	expect(match, `étape illisible : ${latex}`).not.toBeNull();
	return { before: match![1], image: match![2] };
}

/** [titre, image] de chaque étape affichée. */
function seen(exercise: Exercise): [string, string][] {
	const steps = stepsOf(exercise);
	expect(steps, `« ${exercise.expression} » n'a pas d'étapes`).toBeDefined();
	return steps!.map((step) => [step.title, linesOf(step).image]);
}

/** Les règles de l'ancienne trace du pipeline, qu'aucune correction ne montre plus. */
const OLD_TRACE_RULES = [
	'distribute-binomial-product',
	'expand-sum-squared',
	'expand-diff-squared',
	'product-to-diff-squares',
	'expand-power',
	'combine-like-terms'
];

// =============================================================================
// Ce que l'élève lit
// =============================================================================

describe('développer : la correction rédigée comme au tableau', () => {
	it('(2x − 1)(x + 3) : la distribution, chaque produit, la réduction', () => {
		expect(seen({ expression: '(2x-1)(x+3)' })).toEqual([
			[
				'On distribue : chaque terme du premier facteur multiplie chaque terme du second',
				'2 x \\times x + 2 x \\times 3 - 1 \\times x - 1 \\times 3'
			],
			['On calcule chaque produit', '2 x^2 + 6 x - x - 3'],
			['On réduit', '2 x^2 + 5 x - 3']
		]);
	});

	it('(x + 1)² : l’identité qui nomme a et b, puis chaque terme calculé', () => {
		expect(seen({ expression: '(x+1)^2' })).toEqual([
			[
				'On reconnaît (a + b)² = a² + 2ab + b², avec a = x et b = 1',
				'x^2 + 2 \\times x \\times 1 + 1^2'
			],
			['On calcule chaque terme', 'x^2 + 2 x + 1']
		]);
	});

	it('3(x − 2) − (x + 1) : distribuer 3 et le signe − en une ligne, puis réduire', () => {
		expect(seen({ expression: '3(x-2)-(x+1)' })).toEqual([
			[
				'On distribue 3, et le signe − devant la parenthèse change le signe de chaque terme',
				'3 x - 6 - x - 1'
			],
			['On réduit', '2 x - 7']
		]);
	});

	it('la première ligne part de l’expression de l’énoncé, chaque étape de la précédente', () => {
		const steps = stepsOf({ expression: '(2x-1)(x+3)' })!;

		expect(linesOf(steps[0]).before).toBe('\\left( 2 x - 1 \\right) \\left( x + 3 \\right)');
		for (let i = 1; i < steps.length; i++) {
			expect(linesOf(steps[i]).before).toBe(linesOf(steps[i - 1]).image);
		}
	});

	it('les variables du modèle sont remplacées, au niveau de la classe (4e → collège)', () => {
		const steps = stepsOf({
			expression: '(x+{{a}})(x-{{a}})',
			grades: ['4'],
			resolvedVariables: [{ name: 'a', value: '3' }]
		})!;

		expect(steps.map((step) => [step.title, linesOf(step).image])).toEqual([
			['On reconnaît (a + b)(a − b) = a² − b², avec a = x et b = 3', 'x^2 - 3^2'],
			['On calcule chaque terme', 'x^2 - 9']
		]);
		expect(steps.every((step) => step.schoolLevel === 'college')).toBe(true);
	});

	it('jamais une règle de l’ancienne trace du pipeline', () => {
		for (const expression of ['(2x-1)(x+3)', '(x+1)^2', '(x-3)^2', '(x+2)(x-2)', '3(x-2)-(x+1)']) {
			const rules = stepsOf({ expression })!.map((step) => step.rule);

			for (const old of OLD_TRACE_RULES) expect(rules, expression).not.toContain(old);
		}
	});
});

describe('développer : la version résumée de l’exercice', () => {
	it('verbosity summarized : chaque ligne à × fondue dans le calcul, sans « pourquoi »', () => {
		const steps = stepsOf({
			expression: '(2x-1)(x+3)',
			options: { verbosity: 'summarized' }
		})!;

		expect(steps.map((step) => [step.title, linesOf(step).image])).toEqual([
			[
				'On distribue : chaque terme du premier facteur multiplie chaque terme du second',
				'2 x^2 + 6 x - x - 3'
			],
			['On réduit', '2 x^2 + 5 x - 3']
		]);
		expect(steps.every((step) => step.explanation === undefined)).toBe(true);
	});

	it('verbosity detailed (défaut) : chaque étape dit son « pourquoi »', () => {
		const steps = stepsOf({ expression: '(2x-1)(x+3)' })!;

		expect(steps.every((step) => step.explanation !== undefined)).toBe(true);
	});
});

describe('développer : l’écriture de l’énoncé décide des décimaux', () => {
	// Le point décimal : les étapes des corrections générées l'écrivent ainsi pour
	// tous les pipelines (l'atelier, lui, pose la virgule à l'affichage)
	it('un décimal écrit dans l’expression donne des décimaux, dans le titre et dans les images', () => {
		expect(seen({ expression: '(0.5x+1)^2' })).toEqual([
			[
				'On reconnaît (a + b)² = a² + 2ab + b², avec a = 0.5x et b = 1',
				'\\left( 0.5 x \\right)^2 + 2 \\times 0.5 x \\times 1 + 1^2'
			],
			['On calcule chaque terme', '0.25 x^2 + x + 1']
		]);
	});

	it('des fractions écrites donnent des fractions', () => {
		const images = seen({ expression: '(x/2+1)^2' }).map(([, image]) => image);

		expect(images[images.length - 1]).toBe('\\dfrac{1}{4} x^2 + x + 1');
	});
});

describe('développer : les maths d’un titre sont entre $…$ (rendu par InlineMarkdown)', () => {
	it('un facteur eˣ : « On distribue $\\exponentialE^x$ »', () => {
		expect(seen({ expression: 'e^x(x+1)' })[0][0]).toBe('On distribue $\\exponentialE^x$');
	});

	it('des lettres indicées : « avec a = $x_1$ et b = $x_2$ »', () => {
		expect(seen({ expression: '(x_1+x_2)^2' })[0][0]).toBe(
			'On reconnaît (a + b)² = a² + 2ab + b², avec a = $x_1$ et b = $x_2$'
		);
	});
});

describe('développer : la même rédaction que l’atelier (une intention, une rédaction)', () => {
	it.each(['(2x-1)(x+3)', '(x+1)^3', '(3x-1)^2-(x+2)^2', '5-2(x-3)', '-(2x-3)', '2(x+1)^2'])(
		'%s',
		(expression) => {
			const atelier = expandExpression(expression, 'exact');
			expect(atelier.kind).toBe('developpee');
			if (atelier.kind !== 'developpee') return;

			const steps = stepsOf({ expression })!;
			expect(steps.map((s) => [s.title, s.expressionLatex])).toEqual(
				atelier.steps!.map((s) => [s.title, s.expressionLatex])
			);
		}
	);
});

// =============================================================================
// Ce qu'on ne sait pas rédiger : Mode A, jamais l'ancienne trace
// =============================================================================

describe('développer : sans rédaction, retour silencieux au Mode A', () => {
	it('une somme sous une fonction (le pipeline la développe, la rédaction ne sait pas)', () => {
		const instance = instanceOf({ expression: 'cos(2(x+1))' });
		const result = generateCorrection(instance);

		expect(result).toBe(instance);
		expect(result.correction?._renderedSteps).toBeUndefined();
	});

	it('rien à développer : pas d’étapes générées', () => {
		expect(stepsOf({ expression: 'x^2+1' })).toBeUndefined();
	});

	it('une équation : pas d’étapes générées (on développe une expression)', () => {
		expect(stepsOf({ expression: '(x+1)^2=0' })).toBeUndefined();
	});

	it('une réponse que le pipeline n’a pas su finir : pas d’étapes générées', () => {
		// Une somme dans un exposant : le pipeline rend `e^{x^2 + 2 x 1 + 1^2}`,
		// produit collé et puissance non calculée (revue de la PR 3)
		expect(stepsOf({ expression: 'e^((x+1)^2)' })).toBeUndefined();
	});
});
