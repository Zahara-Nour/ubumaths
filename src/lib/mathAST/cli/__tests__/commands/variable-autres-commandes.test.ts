/**
 * `.variations`, `.domain`, `.taylor` : la variable est x, sauf `; v`.
 *
 * Même règle que `.solve`, `.diff`, `.integrate` (#888, décision de David du
 * 2026-10-06) : plus de « dernier mot après un espace = variable ». L'espace
 * est un produit implicite : `.variations t^2 t` est t³, pas t² en t. Quand x
 * n'apparaît pas, le calcul se fait en x et la sortie l'indique.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '../../web/web-repl-engine';
import { variableHintOf } from '../../core/variable-argument';

/** La sortie du moteur, sans les séquences de couleur d'un terminal. */
function run(command: string): { success: boolean; output: string; error?: string } {
	const result = new WebReplEngine().execute(command);
	return {
		success: result.success,
		// eslint-disable-next-line no-control-regex -- couleurs de chalk
		output: result.output.replace(/\u001b\[[0-9;]*m/g, ''),
		...(result.error?.message !== undefined && { error: result.error.message })
	};
}

const HINT_T = 'Calcul par rapport à x. Pour une autre variable, écris « ; t ».';
const HINT_TAYLOR_T =
	'Calcul par rapport à x. Pour une autre variable, écris « ; t » ; le nombre de termes et le point se mettent à la fin : « ; t 5 0 ».';

describe('.variations : x par défaut, une autre variable après « ; »', () => {
	it('`x^3-3x` : inchangé, points critiques ±1, sans indication', () => {
		const result = run('.variations x^3-3x');
		expect(result.success).toBe(true);
		expect(result.output).toContain('x = -1');
		expect(result.output).toContain('x = 1');
		expect(result.output).not.toContain('Calcul par rapport');
	});

	it('`x^2 + x` : le x final fait partie de l’expression', () => {
		// L'ancienne règle arrachait le dernier « x » et lisait « x^2 + »
		const result = run('.variations x^2 + x');
		expect(result.success).toBe(true);
		expect(result.output).toContain('x = -1/2');
	});

	it('`t^3-3t ; t` : points critiques ±1, en t', () => {
		const result = run('.variations t^3-3t ; t');
		expect(result.success).toBe(true);
		expect(result.output).toContain("f'(t)");
		expect(result.output).toContain('t = -1');
		expect(result.output).toContain('t = 1');
		expect(result.output).not.toContain('Calcul par rapport');
	});

	it('`t^2` sans « ; » : en x, avec l’indication', () => {
		const result = run('.variations t^2');
		expect(result.success).toBe(true);
		expect(result.output).toContain(HINT_T);
	});

	it('ancienne syntaxe `t^2 t` : le produit t³, en x, avec l’indication', () => {
		const result = run('.variations t^2 t');
		expect(result.success).toBe(true);
		expect(result.output).toContain(HINT_T);
	});

	it('`sin x` : refus, des parenthèses', () => {
		const result = run('.variations sin x');
		expect(result.success).toBe(false);
		expect(result.error).toBe('Écris sin(x) avec des parenthèses.');
	});

	it('`t^2 ; 2` : refus, « 2 » n’est pas une variable', () => {
		const result = run('.variations t^2 ; 2');
		expect(result.success).toBe(false);
	});
});

describe('.domain : x par défaut, une autre variable après « ; »', () => {
	it('`1/x` : inchangé, sans indication', () => {
		const result = run('.domain 1/x');
		expect(result.success).toBe(true);
		expect(result.output).toContain('Condition : x');
		expect(result.output).not.toContain('Calcul par rapport');
	});

	it('`ln(t) ; t` → t > 0', () => {
		const result = run('.domain ln(t) ; t');
		expect(result.success).toBe(true);
		expect(result.output).toContain('Condition : t > 0');
		expect(result.output).not.toContain('Calcul par rapport');
	});

	it('`ln(t)` sans « ; » : en x, avec l’indication', () => {
		const result = run('.domain ln(t)');
		expect(result.output).toContain(HINT_T);
	});

	it('`ln x` : refus, des parenthèses', () => {
		const result = run('.domain ln x');
		expect(result.success).toBe(false);
		expect(result.error).toBe('Écris ln(x) avec des parenthèses.');
	});
});

describe('.taylor : x par défaut, une autre variable après « ; »', () => {
	it('`exp(x) 4` : inchangé (4 termes en 0)', () => {
		const result = run('.taylor exp(x) 4');
		expect(result.success).toBe(true);
		expect(result.output.split('\n')[0]).toContain('x=0');
		expect(result.output).toContain('x^3');
		expect(result.output).not.toContain('Calcul par rapport');
	});

	it('`exp(x) 4 1` : point 1, inchangé', () => {
		const result = run('.taylor exp(x) 4 1');
		expect(result.success).toBe(true);
		expect(result.output.split('\n')[0]).toContain('x=1');
	});

	it('`exp(x)` sans nombre de termes : refus, comme avant', () => {
		expect(run('.taylor exp(x)').success).toBe(false);
	});

	it.each(['.taylor exp(t) 4 ; t', '.taylor exp(t) ; t 4'])(
		'%s : en t, nombre de termes avant ou après « ; t »',
		(input) => {
			const result = run(input);
			expect(result.success).toBe(true);
			expect(result.output.split('\n')[0]).toContain('t=0');
			expect(result.output).toContain('t^3');
			expect(result.output).not.toContain('Calcul par rapport');
		}
	);

	it.each(['.taylor exp(t) 4 1 ; t', '.taylor exp(t) ; t 4 1'])('%s : point 1, en t', (input) => {
		const result = run(input);
		expect(result.success).toBe(true);
		expect(result.output.split('\n')[0]).toContain('t=1');
	});

	it('`exp(t) 4` sans « ; » : en x (une constante), l’indication dit où mettre les nombres', () => {
		const result = run('.taylor exp(t) 4');
		expect(result.success).toBe(true);
		expect(result.output.split('\n')[1]).toBe('exp(t)');
		expect(result.output).toContain(HINT_TAYLOR_T);
	});

	it('`sin x 5` : refus, des parenthèses', () => {
		const result = run('.taylor sin x 5');
		expect(result.success).toBe(false);
		expect(result.error).toBe('Écris sin(x) avec des parenthèses.');
	});

	it('le raccourci `sin 5` (nom seul) reste accepté : sin(x)', () => {
		expect(run('.taylor sin 5').success).toBe(true);
	});

	it('le raccourci `sin 5 ; t` donne sin(t)', () => {
		const result = run('.taylor sin 5 ; t');
		expect(result.success).toBe(true);
		expect(result.output).toContain('t^3');
	});
});

describe('variableHintOf : `.taylor`', () => {
	it('nombres ôtés, avant ou après « ; »', () => {
		expect(variableHintOf('exp(t) 4', { taylor: true })).toBe(HINT_TAYLOR_T);
		expect(variableHintOf('exp(t) 4 1', { taylor: true })).toBe(HINT_TAYLOR_T);
		expect(variableHintOf('exp(t) 4 ; t', { taylor: true })).toBeNull();
		expect(variableHintOf('exp(t) ; t 4 1', { taylor: true })).toBeNull();
	});
});
