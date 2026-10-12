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
