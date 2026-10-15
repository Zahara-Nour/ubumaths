/**
 * Atelier — les fonctions à indice : `f_1`, `g_2`.
 *
 * `nextName` en crée quand f, g, h sont pris, et l'élève peut taper
 * `f_1(x) = x^2`. Mesuré sur main le 2026-10-15 : le parseur lisait `f_1(3)`
 * comme `f_1 × 3` (indice puis multiplication implicite), et Calcul recopiait
 * `f_1(3)` sans le calculer.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';
import { astOf } from '../parse';

function session() {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

const outputOf = (r: ReturnType<typeof runInput>) =>
	r.kind === 'calcul' || r.kind === 'commande' ? r.output : r.kind === 'refus' ? r.message : '';

const squashed = (r: ReturnType<typeof runInput>) => outputOf(r).replace(/\s/g, '');

describe('f_1(x) = 3x^2 : une fonction comme une autre', () => {
	it('se crée saine', () => {
		const s = session();
		const r = runInput(s, 'f_1(x) = 3x^2');

		expect(r.kind).toBe('definition');
		expect(s.atelier.get('f_1')?.status).toBe('ok');
	});

	it('f_1(3) vaut 27 dans Calcul', () => {
		const s = session();
		runInput(s, 'f_1(x) = 3x^2');

		expect(squashed(runInput(s, 'f_1(3)'))).toBe('27');
	});

	it('f_1(3) se lit comme un appel de fonction', () => {
		const ast = astOf('f_1(3)', 'text', ['f_1']);

		expect(ast).toMatchObject({ type: 'function', name: 'f_1' });
	});

	it('.dériver f_1 marche', () => {
		const s = session();
		runInput(s, 'f_1(x) = 3x^2');

		expect(squashed(runInput(s, '.dériver f_1'))).toContain('6x');
	});

	it("f_1'(2) est la dérivée en 2", () => {
		const s = session();
		runInput(s, 'f_1(x) = 3x^2');

		expect(squashed(runInput(s, "f_1'(2)"))).toBe('12');
	});
});

describe('f et f_1 ensemble : chacune la sienne', () => {
	it('f_1(3) appelle f_1, f(3) appelle f', () => {
		const s = session();
		runInput(s, 'f(x) = 2x+3');
		runInput(s, 'f_1(x) = 3x^2');

		expect(squashed(runInput(s, 'f_1(3)'))).toBe('27');
		expect(squashed(runInput(s, 'f(3)'))).toBe('9');
	});

	it('avec f(x) = 2x+3 et f_1(x) = x^2 : f_1(3) et f(3) valent 9 tous les deux', () => {
		const s = session();
		runInput(s, 'f(x) = 2x+3');
		runInput(s, 'f_1(x) = x^2');

		expect(squashed(runInput(s, 'f_1(3)'))).toBe('9');
		expect(squashed(runInput(s, 'f(3)'))).toBe('9');
	});

	it('f_1(2) vaut 4, pas f(2) = 7', () => {
		const s = session();
		runInput(s, 'f(x) = 2x+3');
		runInput(s, 'f_1(x) = x^2');

		expect(squashed(runInput(s, 'f_1(2)'))).toBe('4');
	});
});

describe('un nom indicé NON déclaré reste une variable indicée', () => {
	it('x_1 reste un indice', () => {
		const ast = astOf('x_1', 'text', ['f_1']);

		expect(ast).toMatchObject({ type: 'subscript' });
	});

	it('f_2(3) sans f_2 déclarée ne devient pas un appel', () => {
		const ast = astOf('f_2(3)', 'text', ['f_1']);

		expect(ast).not.toMatchObject({ type: 'function' });
	});
});
