/**
 * Deux limites de la console de Calcul (2026-10-12, demande de David « corrige ces limites ») :
 * - `2 != 3` était lu par le parseur LaTeX, où `!=` n'existe pas : `factorial(2) = 3`, `false` ;
 *   le parseur maison lit déjà `x!=3` comme ≠ (et `x! = 3`, avec espace, comme une factorielle) ;
 * - une chaîne `1 < x < 3` répondait « Cannot evaluate boolean expression ».
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '../web-repl-engine';

function run(...inputs: string[]) {
	const engine = new WebReplEngine();
	let last = engine.execute(inputs[0]);
	for (const input of inputs.slice(1)) last = engine.execute(input);
	return last;
}

describe('« différent de » : != ', () => {
	it.each([
		['2 != 3', 'true'],
		['2 != 2', 'false'],
		['2!=3', 'true'],
		['1/2 != 0.5', 'false'],
		['2 \\ne 3', 'true'],
		['2 ≠ 3', 'true']
	])('%s : %s', (input, output) => {
		expect(run(input).output).toBe(output);
	});

	it('avec une variable liée', () => {
		expect(run('x := 5', 'x != 5').output).toBe('false');
		expect(run('x := 5', 'x != 4').output).toBe('true');
	});

	it('la factorielle, avec une espace, reste une factorielle', () => {
		expect(run('3! = 6').output).toBe('true');
		expect(run('3! = 7').output).toBe('false');
	});
});

describe('une chaîne de comparaisons : vraie si chaque maillon l’est', () => {
	it.each([
		['1 < 2 < 3', 'true'],
		['1 < 5 < 3', 'false'],
		['5 < 2 < 3', 'false'],
		['3 > 2 > 1', 'true'],
		['1 <= 1 < 2', 'true'],
		['1 < 2 <= 2', 'true'],
		['1 < 2 < 2', 'false'],
		['1 < 3/2 < 2', 'true'],
		['0 < 1 < 2 < 3', 'true'],
		['0 < 1 < 5 < 3', 'false']
	])('%s : %s', (input, output) => {
		expect(run(input).output).toBe(output);
	});

	it('avec une variable liée', () => {
		expect(run('x := 2', '1 < x < 3').output).toBe('true');
		expect(run('x := 4', '1 < x < 3').output).toBe('false');
	});

	it('une variable libre : l’expression reste écrite', () => {
		expect(run('1 < y < 3').output).toContain('variables: y');
	});

	// Le plafond de calcul passe aussi par chaque maillon
	it('1 < 1.0001^30000 < 30 : en moins de 300 ms', () => {
		const start = performance.now();
		const line = run('1 < 1.0001^30000 < 30');

		expect(performance.now() - start).toBeLessThan(300);
		expect(line.output).toBe('true');
	});
});

// Revue : `!=` restait une factorielle dès que l'entrée portait du LaTeX ; une chaîne avec un `=`
// partait dans la comparaison de deux membres (un booléen face à un nombre : false)
describe('les cas de la revue', () => {
	it.each([
		['\\frac{1}{2} != 3', 'true'],
		['\\pi != 3', 'true'],
		['\\frac{1}{2} != 0.5', 'false']
	])('!= avec du LaTeX : %s', (input, output) => {
		expect(run(input).output).toBe(output);
	});

	it('!= avec du LaTeX et une variable liée', () => {
		expect(run('x := 4', '\\sqrt{x} != 2').output).toBe('false');
	});

	it.each([
		['1 < 2 = 2', 'true'],
		['2 = 2 < 3', 'true'],
		['1 < 2 = 3', 'false'],
		['2 = 2 = 2', 'true'],
		['2 = 2 = 3', 'false']
	])('une chaîne avec un = : %s', (input, output) => {
		expect(run(input).output).toBe(output);
	});

	it('une chaîne avec un = et une variable liée', () => {
		expect(run('x := 2', '1 < x = 2').output).toBe('true');
	});

	it('une chaîne avec un = passe par le plafond de calcul', () => {
		const start = performance.now();
		const line = run('1 < 2 = 10^30000/10^29999');

		expect(performance.now() - start).toBeLessThan(300);
		expect(line.output).toBe('false');
	});
});

// Revue : une chaîne de grandeurs répondait « On ne peut pas comparer un nombre sans unité et une
// longueur » (le premier maillon, booléen, comparé à une longueur)
describe('une chaîne de grandeurs', () => {
	it.each([
		['5[m] < 6[m] < 7[m]', 'true'],
		['5[m] < 600[cm] < 7[m]', 'true'],
		['5[m] < 8[m] < 7[m]', 'false'],
		['6[m] = 600[cm] = 6[m]', 'true'],
		['6[m] = 600[cm] = 7[m]', 'false']
	])('%s : %s', (input, output) => {
		expect(run(input).output).toBe(output);
	});
});
