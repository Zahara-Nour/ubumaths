/**
 * `.solve` dans le moteur web : un membre entre parenthèses.
 *
 * Mesuré avant correctif : `.solve (2x-3)=0` affichait « On divise les deux
 * membres par 0 » puis x = 0, et `.solve (x^2-3x)=0` identifiait
 * a = 0, b = 0, c = (x^2-3x). L'atelier envoie ces entrées (`.resoudre f(x)=0`
 * devient `.resoudre (expression)=0`).
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '../web-repl-engine';

function solveOutput(input: string): string {
	const result = new WebReplEngine().execute(`.solve ${input} --verbose`);
	expect(result.success).toBe(true);
	return result.output;
}

/** Dernière ligne non vide : la conclusion. */
function conclusion(output: string): string {
	const lines = output.split('\n').filter((l) => l.trim() !== '');
	return lines[lines.length - 1].trim();
}

describe('.solve — membre entre parenthèses', () => {
	it.each([
		['(2x-3)=0', 'x = 3/2'],
		['((x-5))=0', 'x = 5'],
		['0=(x-4)', 'x = 4'],
		['2(x-1)=4', 'x = 3'],
		['(e^x-1)=0', 'x = 0']
	])('%s conclut %s', (input, expected) => {
		expect(conclusion(solveOutput(input))).toBe(expected);
	});

	it.each(['(2x-3)=0', '((x-5))=0', '0=(x-4)', '2(x-1)=4'])(
		'%s ne divise jamais par 0',
		(input) => {
			expect(solveOutput(input)).not.toContain('par 0');
		}
	);

	it('(2x-3)=0 raconte les mêmes étapes que 2x-3=0', () => {
		const withParens = solveOutput('(2x-3)=0').split('\n').slice(1);
		const without = solveOutput('2x-3=0').split('\n').slice(1);
		expect(withParens.map((l) => l.trim())).toEqual(without.map((l) => l.trim()));
	});

	it.each([
		['(x^2-3x)=0', 'a = 1, b = -3, c = 0'],
		['(3x^2-12)=0', 'a = 3, b = 0, c = -12']
	])('%s identifie %s', (input, coefficients) => {
		const output = solveOutput(input);
		expect(output).toContain(coefficients);
		expect(output).not.toContain('pas de solution reelle');
	});

	it('témoin sans parenthèses : x^2-3x=0 inchangé', () => {
		const output = solveOutput('x^2-3x=0');
		expect(output).toContain('a = 1, b = -3, c = 0');
		expect(conclusion(output)).toBe('x = 3 ou x = 0');
	});
});
