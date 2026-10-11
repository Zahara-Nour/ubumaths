/**
 * Atelier — dérivée de `sin^2(x)`, puissance d'une fonction écrite à l'exposant du nom.
 *
 * ⚠️ Mesuré sur main le 2026-10-06 : `k(x) = \sin^2(x)` puis `.dériver k`
 * affichait `cos(x)` dans la sortie texte du moteur, alors que les étapes
 * pédagogiques étaient justes. Le parseur porte l'exposant dans le champ
 * `power` du nœud fonction, et `differentiate` l'ignorait.
 *
 * Chaque cas compare l'écriture `f^n(x)` à son témoin `f(x)^n`, déjà juste.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';
import { expressionOf } from '../engine';

function session(definition: string) {
	const s = { atelier: new Atelier(), engine: new WebReplEngine() };
	s.atelier.create({ kind: 'function', name: 'k', definition }, 'text');
	return s;
}

const outputOf = (r: ReturnType<typeof runInput>) =>
	r.kind === 'calcul' || r.kind === 'commande' ? r.output : r.kind === 'refus' ? r.message : '';

/** La ligne « d/dx(…) = … » de `.dériver`, sans l'écriture de l'expression dérivée. */
const derivativeLine = (output: string) => output.split('\n')[0].split(' = ').slice(1).join(' = ');

describe('.dériver k avec k(x) = sin²(x)', () => {
	it.each([
		['\\sin^2(x)', 'sin(x)^2'],
		['sin^2(x)', 'sin(x)^2'],
		['\\cos^3(x)', 'cos(x)^3']
	])('%s se dérive comme %s', (written, witness) => {
		const derived = derivativeLine(outputOf(runInput(session(written), '.dériver k')));
		const expected = derivativeLine(outputOf(runInput(session(witness), '.dériver k')));
		expect(derived).not.toBe('');
		expect(derived).toBe(expected);
	});

	it('sin²(x) donne 2cos(x)sin(x), pas cos(x)', () => {
		const output = outputOf(runInput(session('\\sin^2(x)'), '.dériver k'));
		expect(derivativeLine(output)).toBe('2cos(x)sin(x)');
	});
});

describe("k' et g = k' avec k(x) = sin²(x)", () => {
	it("k' vaut la dérivée de sin(x)^2", () => {
		const derived = outputOf(runInput(session('\\sin^2(x)'), "k'")).replace(/\s/g, '');
		const expected = outputOf(runInput(session('sin(x)^2'), "k'")).replace(/\s/g, '');
		expect(derived).toBe(expected);
	});

	it("g = k' vaut la dérivée de sin(x)^2", () => {
		const derivativeOf = (definition: string) => {
			const s = session(definition);
			s.atelier.create({ kind: 'function', name: 'g', definition: "k'" }, 'text');
			const expression = expressionOf(s.atelier, 'g');
			return expression.ok ? expression.expression.replace(/\s/g, '') : null;
		};
		expect(derivativeOf('\\sin^2(x)')).toBe(derivativeOf('sin(x)^2'));
	});
});
