/**
 * Écart V62 — redéfinir un nom sous un autre type.
 *
 * `update()` reconstruit l'objet sous son type RANGÉ : `a = 3` puis
 * `a(x) = x^2` laissait une VALEUR a de définition x², au statut « ok ». Avec
 * `f(x) = a x` avant, le refus de V58 (une fonction citée comme un nombre) ne
 * voyait pas de fonction, et `.dériver f` affichait 3x² : une dérivée fausse.
 *
 * Comportement voulu, celui des courbes, points et listes (« le type rangé ne
 * change pas ») : la ligne est refusée, l'objet garde son ancienne
 * définition, et le refus dit quoi faire.
 *
 * Exception gardée (#905) : `f = t + 1`, sans parenthèses, redéfinit la
 * fonction f dans SA lettre.
 *
 * Tous les gestes passent par le vrai chemin (`CalcDesk.submit`) : on
 * asserte la ligne que voit l'élève.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';

function deskWith(...lines: string[]): CalcDesk {
	const desk = new CalcDesk(new Atelier());
	for (const line of lines) desk.submit(line);
	return desk;
}

/** La ligne n° `index` (la dernière par défaut), telle que l'élève la lit. */
function lineOf(lines: string[], index = -1) {
	const entry = deskWith(...lines).entries.at(index)!;
	return { text: entry.text, failed: entry.failed };
}

const KEPT = (name: string, was: string, wanted: string) =>
	`« ${name} » est déjà ${was} ou choisis un autre nom pour créer ${wanted}.`;

describe('un nom ne change pas de type en se redéfinissant', () => {
	it.each([
		[['a = 3', 'a(x) = x^2'], 'a', 'un nombre : supprime-le', 'une fonction'],
		[['a = 3', 'a(t) = t'], 'a', 'un nombre : supprime-le', 'une fonction'],
		[['a = 3', 'a = x^2'], 'a', 'un nombre : supprime-le', 'une fonction'],
		[['a = 3', 'a(n) = 2n'], 'a', 'un nombre : supprime-le', 'une suite'],
		[['u(n) = 2n', 'u(x) = x^2'], 'u', 'une suite : supprime-la', 'une fonction'],
		[['f(x) = x^2', 'f(n) = n^2'], 'f', 'une fonction : supprime-la', 'une suite']
	] as const)('%j : refus', (lines, name, was, wanted) => {
		expect(lineOf([...lines])).toEqual({ text: KEPT(name, was, wanted), failed: true });
	});

	it('a = 3 puis a(x) = x^2 refusé : a vaut toujours 3', () => {
		const desk = deskWith('a = 3', 'a(x) = x^2');
		const a = desk.atelier.get('a')!;
		expect(a.kind).toBe('value');
		expect(a.definition).toBe('3');
		expect(lineOf(['a = 3', 'a(x) = x^2', 'a + 1'])).toEqual({ text: '4', failed: false });
	});

	it('a = 3, f(x) = a x, a(x) = x^2 : .dériver f répond 3, plus 3x²', () => {
		const lines = ['a = 3', 'f(x) = a x', 'a(x) = x^2', '.dériver f'];
		expect(lineOf(lines, -2).failed).toBe(true);
		const derived = lineOf(lines);
		expect(derived.failed).toBe(false);
		expect(derived.text).toMatch(/= 3$/);
	});
});

describe('ce qui reste permis', () => {
	it('f(t) = t^2 puis f = t + 1 : f redéfinie dans sa lettre (#905)', () => {
		expect(lineOf(['f(t) = t^2', 'f = t + 1', 'f(2)'])).toEqual({ text: '3', failed: false });
	});

	it('même type : a = 3 puis a = 5', () => {
		expect(lineOf(['a = 3', 'a = 5', 'a + 1'])).toEqual({ text: '6', failed: false });
	});

	it('même type : f(x) = x puis f(t) = t^2', () => {
		expect(lineOf(['f(x) = x', 'f(t) = t^2', 'f(3)'])).toEqual({ text: '9', failed: false });
	});

	it('suite redéfinie par récurrence : u(n) = 2n puis u(n+1) = u(n) + 1', () => {
		expect(lineOf(['u(n) = 2n', 'u(n+1) = u(n) + 1']).failed).toBe(false);
	});
});
