/**
 * `.variations` et le bouton « Variations » : la dérivée de `.dériver` (lot 5a),
 * puis, si l'écriture change, « On factorise pour étudier le signe » ; la
 * ligne de réponse montre la forme factorisée (D2, lot 5b de simplify-carte).
 */

import { describe, it, expect } from 'vitest';
import { variationsRendering } from '../variations-steps';

const FACTOR_TITLE = 'On factorise pour étudier le signe';

function rendering(expression: string) {
	const result = variationsRendering(expression);
	if (result === null) throw new Error(`pas de rendu pour ${expression}`);
	const titles = result.steps.map((s) => s.title);
	const latexOf = (title: string) => result.steps.find((s) => s.title === title)?.expressionLatex;
	return { answer: result.answer, titles, latexOf };
}

describe('variationsRendering : la dérivée, puis sa factorisation', () => {
	it.each([
		[
			'x^2/(x+1)',
			String.raw`f'(x) = \dfrac{x^2 + 2 x}{\left( x + 1 \right)^2}`,
			String.raw`f'(x) = \dfrac{x \left( x + 2 \right)}{\left( x + 1 \right)^2}`
		],
		[
			'x^3/3-2x',
			"f'(x) = x^2 - 2",
			String.raw`f'(x) = \left( x - \sqrt{2} \right) \left( x + \sqrt{2} \right)`
		],
		[
			'x^2*e^(-x)',
			String.raw`f'(x) = \left( 2 x - x^2 \right) \exponentialE^{-x}`,
			String.raw`f'(x) = x \left( 2 - x \right) \exponentialE^{-x}`
		]
	])('%s', (expression, derivative, factored) => {
		const { answer, titles, latexOf } = rendering(expression);
		expect(latexOf('Dérivée')).toBe(derivative);
		expect(latexOf(FACTOR_TITLE)).toBe(factored);
		// L'étape de factorisation suit immédiatement la dérivée
		expect(titles.indexOf(FACTOR_TITLE)).toBe(titles.indexOf('Dérivée') + 1);
		// Sans tableau (x³/3 − 2x), les sens de variation suivent f′ sur la ligne
		expect(answer.startsWith(factored)).toBe(true);
		expect(answer).not.toContain(derivative);
	});

	it.each([
		['x^3/3+x', "f'(x) = x^2 + 1"],
		['x^2-3x+1', "f'(x) = 2 x - 3"],
		['x*e^x', String.raw`f'(x) = \left( x + 1 \right) \exponentialE^x`]
	])('%s : rien ne change, pas d’étape de factorisation', (expression, derivative) => {
		const { answer, titles, latexOf } = rendering(expression);
		expect(latexOf('Dérivée')).toBe(derivative);
		expect(titles).not.toContain(FACTOR_TITLE);
		expect(answer.startsWith(derivative)).toBe(true);
	});
});
