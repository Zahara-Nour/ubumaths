/**
 * Suite des opérateurs logiques de la console (2026-10-12, « corrige les défauts ») :
 * - `not 2 > 1` se lisait (non 2) > 1 : un « non » sans parenthèses porte sur la comparaison ;
 * - `| 2 || 3 |` lisait un « ou » dans une valeur absolue (message en anglais) ;
 * - `.def f(x) = x == 2` avertissait en anglais (« Could not auto-compute derivative »).
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '../web-repl-engine';

function run(...inputs: string[]) {
	const engine = new WebReplEngine();
	let last = engine.execute(inputs[0]);
	for (const input of inputs.slice(1)) last = engine.execute(input);
	return last;
}

describe('un « non » sans parenthèses porte sur toute la comparaison', () => {
	it.each([
		['not 2 > 1', 'false'],
		['not 2 < 1', 'true'],
		['non 2 > 1', 'false'],
		['! 2 > 1', 'false'],
		['!2 < 1', 'true'],
		['2 > 1 and not 3 > 2', 'false'],
		['2 > 1 et non 3 < 2', 'true'],
		['not 2 > 1 or 3 > 2', 'true'],
		['(not 2 > 1)', 'false']
	])('%s : %s', (input, output) => {
		expect(run(input).output).toBe(output);
	});

	it('une variable « non » reste lue comme avant', () => {
		expect(run('non := 2', 'non > 1').output).toContain('variables: n, o');
	});

	it('la factorielle reste une factorielle', () => {
		expect(run('5 ! > 100').output).toBe('true');
		expect(run('3! = 6').output).toBe('true');
	});
});

describe('valeurs absolues et « ou »', () => {
	// `| 2 || 3 |` = |2|·|3| : deux valeurs absolues collées font un produit (V40,
	// comme `|x||y|`), jamais un « ou »
	it('| 2 || 3 | : le produit |2|·|3|, sans « ou » dans la valeur absolue', () => {
		const line = run('| 2 || 3 |');

		expect(line.success).toBe(true);
		expect(line.output).toBe('6');
	});

	it('|2| || |3| : un « ou » entre deux nombres, refusé en français', () => {
		expect(run('|2| || |3|').output).toMatch(/non évaluable/);
	});

	it('un « ou » entre deux comparaisons reste un « ou »', () => {
		expect(run('2 > 1 || 1 > 2').output).toBe('true');
		expect(run('|2| > 1 || 1 > 2').output).toBe('true');
	});
});

// Revue : exiger une comparaison cassait les variables booléennes (justes sur main)
describe('des variables booléennes', () => {
	it.each([
		['b || c', 'true'],
		['b && !c', 'true'],
		['!(b) && c', 'false'],
		['b && c || b', 'true']
	])('b := 2 > 1, c := 1 > 2 : %s = %s', (input, output) => {
		expect(run('b := 2 > 1', 'c := 1 > 2', input).output).toBe(output);
	});
});

describe('les « non » collés ou doublés', () => {
	it.each([
		['\\lnot2>1', 'false'],
		['2>1\\land\\lnot3>2', 'false'],
		['\\lnot\\lnot 2 > 1', 'true'],
		['!!2 > 1', 'true'],
		['! ! 2 > 1', 'true']
	])('%s : %s', (input, output) => {
		expect(run(input).output).toBe(output);
	});
});

describe('une définition booléenne', () => {
	it('.def f(x) = x == 2 : sans avertissement anglais', () => {
		const output = run('.def f(x) = x == 2').output;

		expect(output).not.toMatch(/Could not|Warning|Cannot/);
	});

	it('elle s’évalue', () => {
		expect(run('.def f(x) = x == 2', 'f(2)').output).toBe('true');
	});
});

describe('une expression logique sans valeur numérique : en français', () => {
	it('2 + (1 < 2)', () => {
		expect(run('2 + (1 < 2)').output).not.toMatch(/Cannot/);
	});
});
