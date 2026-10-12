/**
 * Les opérateurs logiques et d'égalité de la console de Calcul (2026-10-12, « corrige ça ») :
 * `&&`, `||`, `!`, `and`, `or`, `not` (et `et`, `ou`, `non`), `==`, `===`, `!==` répondaient
 * « Unexpected token » ou « Nombre écrit après un facteur » ; `\lnot (2 > 1)` ne s'évaluait pas ;
 * `1 < 2 \approx 2` répondait en anglais.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '../web-repl-engine';

function run(...inputs: string[]) {
	const engine = new WebReplEngine();
	let last = engine.execute(inputs[0]);
	for (const input of inputs.slice(1)) last = engine.execute(input);
	return last;
}

describe('et, ou, non', () => {
	it.each([
		['2 > 1 && 3 > 2', 'true'],
		['2 > 1 && 3 < 2', 'false'],
		['2 > 1 || 1 > 2', 'true'],
		['2 < 1 || 1 > 2', 'false'],
		['!(2 > 1)', 'false'],
		['!(2 < 1)', 'true'],
		['2 > 1 and 3 > 2', 'true'],
		['2 > 1 or 1 > 2', 'true'],
		['not(2 > 1)', 'false'],
		['not (2 < 1)', 'true'],
		['2 > 1 et 3 > 2', 'true'],
		['2 < 1 ou 1 > 2', 'false'],
		['non(2 > 1)', 'false'],
		['2 > 1 \\land 3 > 2', 'true'],
		['\\lnot (2 > 1)', 'false'],
		['(2 > 1)', 'true'],
		['2 > 1 && 3 = 3', 'true'],
		['2 > 1 and 3 = 4', 'false']
	])('%s : %s', (input, output) => {
		expect(run(input).output).toBe(output);
	});

	it('avec une variable liée', () => {
		expect(run('x := 3', 'x > 1 && x < 5').output).toBe('true');
		expect(run('x := 3', 'x > 4 or x < 2').output).toBe('false');
	});

	it('la factorielle n’est pas un « non »', () => {
		expect(run('3! = 6').output).toBe('true');
		expect(run('3!').output).toBe('6');
		expect(run('(2+1)!').output).toBe('6');
	});
});

describe('==, ===, !==', () => {
	it.each([
		['2 == 2', 'true'],
		['2 == 3', 'false'],
		['2 === 2', 'true'],
		['2 !== 3', 'true'],
		['2 !== 2', 'false'],
		['1/2 == 0.5', 'true']
	])('%s : %s', (input, output) => {
		expect(run(input).output).toBe(output);
	});
});

describe('une relation que le calcul ne tranche pas : en français', () => {
	it.each(['1 < 2 \\approx 2', '2 \\approx 2', '1 \\in 2'])('%s', (input) => {
		const line = run(input);

		expect(line.success).toBe(false);
		expect(line.output).toMatch(/non évaluable/);
		expect(line.output).not.toMatch(/Cannot|Evaluation error/);
	});

	it('le préfixe des erreurs est en français', () => {
		expect(run('(1/0)^2000').output).toMatch(/^Erreur de calcul : /);
	});
});

// Revue : la réécriture changeait le sens d'entrées que la console lisait juste
describe('ce qui ne devient pas un opérateur logique', () => {
	it.each([
		['5 !', '120'],
		['2 + 3 !', '8'],
		['|-3|!', '6'],
		['||-2||', '2']
	])('%s : %s, comme avant', (input, output) => {
		expect(run(input).output).toBe(output);
	});

	it('n! ! reste une double factorielle refusée en français', () => {
		expect(run('n! !').output).toMatch(/factorielle/i);
	});

	it.each([
		['et := 3', 'et + 1'],
		['ou := 3', 'ou*2'],
		['x := 1', 'or+1'],
		['x := 1', '\\text{et}']
	])('un mot collé ou dans \\text : %s puis %s', (first, input) => {
		expect(run(first, input).output).not.toMatch(/Unknown command|lor|land|lnot/);
	});

	it('==== n’est pas réécrit', () => {
		expect(run('2 ==== 2').output).not.toBe('true');
	});
});

describe('le message d’une comparaison non évaluable dit la vraie cause', () => {
	// Depuis la suite du lot : un « non » sans parenthèses porte sur toute la comparaison
	it('!5 > 1 se lit non(5 > 1)', () => {
		expect(run('!5 > 1').output).toBe('false');
	});

	it('sans variable, pas de variable soupçonnée', () => {
		expect(run('1/0 > 1').output).not.toMatch(/variable/);
	});
});

// 2ᵉ revue : une variable nommée `non`/`not` en tête devenait un « non » ; le message
// parlait d'une comparaison absente
describe('sans comparaison, aucun mot logique', () => {
	it.each([
		['non := 2', 'non + 1'],
		['not := 2', 'not + 1'],
		['non := 2', '(non + 1)']
	])('%s puis %s : une variable', (first, input) => {
		expect(run(first, input).output).not.toMatch(/« non »|lnot/);
	});

	it('!5 seul : le message ne parle pas de comparaison', () => {
		expect(run('!5').output).not.toMatch(/comparaison entre parenthèses/);
	});
});

// 3ᵉ revue : une variable `non` dans une comparaison
describe('une variable « non » dans une comparaison', () => {
	// Lue comme avant (un nom à plusieurs lettres : n·o·n), jamais comme un « non »
	it.each(['non > 1', 'non + 1 > 2', '(non + 1) > 2'])('non := 2 puis %s', (input) => {
		const output = run('non := 2', input).output;

		expect(output).toContain('variables: n, o');
		expect(output).not.toMatch(/« non »|lnot/);
	});
});
