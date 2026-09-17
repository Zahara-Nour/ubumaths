/**
 * Les conventions d'écriture des détails de résolution, dites par David.
 *
 * 1. **Pas de point médian pour une multiplication** : `\times`, pas `\cdot`.
 * 2. **Deux racines s'écrivent toutes les deux** : `x_1` et `x_2`, plutôt
 *    qu'une seule ligne avec un `\pm`.
 */

import { describe, it, expect } from 'vitest';
import { generateEquationSteps, QuadraticEquationRenderer } from '../index';
import { parseCustomSafe } from '../../parser/custom';
import type { RenderedStep } from '../../common/step-renderer-base';

const ast = (s: string) => (parseCustomSafe(s) as { ast: never }).ast;

function renderedSteps(source: string): readonly RenderedStep[] {
	const steps = generateEquationSteps(ast(source), { level: 'lycee' });
	return new QuadraticEquationRenderer().renderAll(steps, {
		schoolLevel: 'lycee',
		verbosity: 'detailed'
	});
}

function latexOf(source: string, rule: string): string {
	const step = renderedSteps(source).find((s) => s.rule === rule);
	if (step === undefined) throw new Error(`étape ${rule} absente pour ${source}`);
	return step.expressionLatex ?? '';
}

describe('les multiplications s’écrivent en croix', () => {
	it('le discriminant', () => {
		const latex = latexOf('x^2-3x+2=0', 'compute-discriminant');

		expect(latex).toContain('\\times');
		expect(latex).not.toContain('\\cdot');
	});

	it('la formule substituée', () => {
		const latex = latexOf('x^2-3x+2=0', 'apply-quadratic-formula');

		expect(latex).not.toContain('\\cdot');
	});

	it('les solutions substituées', () => {
		const latex = latexOf('x^2-3x+2=0', 'simplify-solutions');

		expect(latex).toContain('\\times');
		expect(latex).not.toContain('\\cdot');
	});

	it('aucune étape n’emploie le point médian', () => {
		for (const source of ['x^2-3x+2=0', 'x^2-2x+1=0', 'x^2-4=0', '(x-1)(x-2)=0']) {
			for (const step of renderedSteps(source)) {
				expect(step.expressionLatex ?? '', `${source} / ${step.rule}`).not.toContain('\\cdot');
			}
		}
	});
});

describe('deux racines s’écrivent toutes les deux', () => {
	/**
	 * ⚠️ L'étape n'affichait qu'UNE ligne, avec un `\pm` :
	 *
	 *   x = \dfrac{-b \pm \sqrt{\Delta}}{2a}
	 *     = \dfrac{3 \pm \sqrt{1}}{2 \times 1}
	 *
	 * Un élève lit deux solutions distinctes à l'étape d'avant, puis une seule
	 * expression ici. On écrit les deux.
	 */
	it('la formule appliquée nomme x_1 et x_2', () => {
		const latex = latexOf('x^2-3x+2=0', 'apply-quadratic-formula');

		expect(latex).toContain('x_1');
		expect(latex).toContain('x_2');
		// Le `\pm` disparaît du corps : c'est ce qu'il servait à éviter d'écrire.
		expect(latex).not.toContain('\\pm');
	});

	it('chaque racine porte son propre signe', () => {
		const latex = latexOf('x^2-3x+2=0', 'apply-quadratic-formula');

		// ⚠️ La forme substituée garde le littéral `-(-3)` : c'est la
		// substitution AVANT simplification des signes, voulue pour la pédagogie
		// (`simplify-solutions` montre ensuite `3 - √1`). Ce qui compte ici,
		// c'est que chaque racine porte SON signe devant le radical.
		expect(latex).toContain('- \\sqrt{1}');
		expect(latex).toContain('+ \\sqrt{1}');
	});

	it('une racine double reste seule, sans indice', () => {
		// « Quand il y a DEUX racines » — ici il n'y en a qu'une.
		const latex = latexOf('x^2-2x+1=0', 'apply-quadratic-formula');

		expect(latex).not.toContain('x_1');
		expect(latex).not.toContain('x_2');
	});
});
