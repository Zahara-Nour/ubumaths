/**
 * Les étapes de « développer », rédigées comme au tableau (section E de la phase 0
 * `docs/archive/wip/atelier-developper-phase0.md`, validée par David le 2026-10-14).
 *
 * Le RÉSULTAT reste celui de l'intention `developper` (il sert à l'intégration
 * et à la stratégie 6 de `factoriser`) : `writeExpandSteps` ne calcule pas la
 * réponse, il la reçoit et la rédige. Ici, ce que l'atelier ne voit pas :
 * chaque image est ÉGALE à l'entrée (`areEquivalent`), chaque étape part de la
 * précédente, la dernière image est la réponse — et `null` quand on ne sait pas
 * rédiger, plutôt qu'une étape fausse. Entrées PARSÉES, coefficients ≠ 1.
 */

import { describe, it, expect } from 'vitest';
import { toLatex } from '../../latex-generator';
import { areEquivalent } from '../../equivalence';
import { parseLatex } from '../../parser';
import { generatePedagogicalSimplifySteps } from '../pipeline';
import { orderExpanded } from '../expand-order';
import { writeExpandSteps } from '../expand-steps';

/** L'entrée, sa réponse (résultat de `developper` dans l'ordre du manuel), et la rédaction. */
function rediger(source: string) {
	const input = parseLatex(source);
	const answer = orderExpanded(
		generatePedagogicalSimplifySteps(input, { intent: 'developper', schoolLevel: 'lycee' }).result
	);
	return { input, answer, written: writeExpandSteps(input, answer) };
}

const PANEL = [
	'(2x+5)^2',
	'(3x-1)^2-(x+2)^2',
	'(2x-1)(x+3)',
	'3(x-2)-(x+1)',
	'5-2(x-3)',
	'(x+1)(x+2)(x+3)',
	'(2x+1)^3',
	'2(3x-1)^2',
	'-(2x+1)(x-4)',
	'(a+2b)^2',
	'(2x+1)^5'
];

describe('writeExpandSteps — chaque image est l’entrée, autrement écrite', () => {
	it.each(PANEL)('%s', (source) => {
		const { input, answer, written } = rediger(source);

		expect(written, `${source} : pas de rédaction`).not.toBeNull();
		for (const steps of [written!.steps, written!.summary]) {
			expect(steps.length).toBeGreaterThan(0);
			// La première part de l'entrée, chacune de la précédente, la dernière est la réponse
			expect(toLatex(steps[0].globalBefore!)).toBe(toLatex(input));
			for (let i = 1; i < steps.length; i++) {
				expect(toLatex(steps[i].globalBefore!)).toBe(toLatex(steps[i - 1].globalAfter!));
				expect(toLatex(steps[i].globalAfter!), `${source}, étape ${i + 1}`).not.toBe(
					toLatex(steps[i - 1].globalAfter!)
				);
			}
			expect(toLatex(steps[steps.length - 1].globalAfter!)).toBe(toLatex(answer));
			for (const step of steps) {
				expect(areEquivalent(step.globalAfter!, input), `${source} : ${step.description}`).toBe(
					true
				);
			}
		}
	});
});

describe('writeExpandSteps — ce qu’on ne sait pas rédiger rend null', () => {
	it.each(['\\cos(2(x+1))', '(x+1)^2+\\sqrt{x+1}', 'e^{2(x+1)}', '\\frac{(2x+1)(x-3)}{x+2}'])(
		'%s',
		(source) => {
			expect(rediger(source).written).toBeNull();
		}
	);
});

describe('writeExpandSteps — la mise en forme des images', () => {
	it('le format de l’appelant s’applique à chaque image, la dernière comprise', () => {
		const input = parseLatex('(2x+1)^2');
		const answer = orderExpanded(
			generatePedagogicalSimplifySteps(input, { intent: 'developper', schoolLevel: 'lycee' }).result
		);
		const seen: string[] = [];
		const written = writeExpandSteps(input, answer, {
			format: (node) => {
				seen.push(toLatex(node));
				return node;
			}
		});

		expect(written).not.toBeNull();
		expect(seen).toContain('4 x^2 + 4 x + 1');
	});
});
