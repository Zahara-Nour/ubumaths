/**
 * Une valeur mal dimensionnée est en erreur dès sa définition (demande de
 * David du 2026-10-18) : avant, `b = 3[min] + 2[km]` était rangée « ok », et
 * le refus n'arrivait qu'en citant `b`.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { Atelier } from '../atelier.svelte';
import { runInput } from '../calcul';

function session(...lines: string[]) {
	const s = { atelier: new Atelier(), engine: new WebReplEngine() };
	for (const line of lines) runInput(s, line);
	return s;
}

const statusOf = (s: ReturnType<typeof session>, name: string) => {
	const object = s.atelier.get(name);
	return { status: object?.status, message: object?.message };
};

describe('une valeur mal dimensionnée est en erreur', () => {
	it('une somme d’une durée et d’une longueur', () => {
		const s = session('b = 3[min] + 2[km]');
		expect(statusOf(s, 'b')).toEqual({
			status: 'error',
			message: 'On ne peut pas ajouter une durée et une longueur.'
		});
	});

	it('écrite naturellement', () => {
		const s = session('a = 3 min + 2 km');
		expect(statusOf(s, 'a').status).toBe('error');
	});

	it('par une valeur du panneau', () => {
		const s = session('r = 3[s]', 'd = r + 2[m]');
		expect(statusOf(s, 'd')).toEqual({
			status: 'error',
			message: 'On ne peut pas ajouter une durée et une longueur.'
		});
	});

	it('ce qui en dépend est en erreur aussi', () => {
		const s = session('b = 3[min] + 2[km]', 'c = 2b');
		expect(statusOf(s, 'c').status).toBe('error');
	});

	// Revue : le message dépendait de l'ordre de création
	it('ce qui en dépend désigne la valeur fautive, quel que soit l’ordre', () => {
		const before = session('b = 3[min] + 2[km]', 'c = 2b');
		const after = session('c = 2b', 'b = 3[min] + 2[km]');
		for (const s of [before, after]) {
			expect(statusOf(s, 'c')).toEqual({
				status: 'error',
				message: 'Dépend de « b », qui est en erreur.'
			});
		}
	});

	it('une fonction qui cite la valeur fautive est en erreur', () => {
		const s = session('b = 3[min] + 2[km]', 'f(x) = b x');
		expect(statusOf(s, 'f').status).toBe('error');
	});

	// Le texte relu de l'arbre (`\pi:/2`) ne se relisait pas : la faute échappait au contrôle
	it.each([['b = 3[m]*π/2 + 1[s]'], ['b = π/2*3[m] + 1[s]'], ['b = 3[m]*π + 1[s]']])(
		'avec π : %s',
		(line) => {
			const s = session(line);
			expect(statusOf(s, 'b')).toEqual({
				status: 'error',
				message: 'On ne peut pas ajouter une longueur et une durée.'
			});
		}
	);

	it('avec π, par une valeur du panneau', () => {
		const s = session('r = 3[s]', 'd = r*π/2 + 2[m]');
		expect(statusOf(s, 'd').status).toBe('error');
	});

	it('se répare quand la valeur citée change', () => {
		const s = session('r = 3[s]', 'd = r + 2[m]');
		runInput(s, 'r = 3[m]');
		expect(statusOf(s, 'd').status).toBe('ok');
	});
});

describe('ce qui reste juste', () => {
	it.each([
		['k = 5[km]'],
		['v = 10[km]/2[h]'],
		['t = 2 h 30 min'],
		['p = 5[km] + 300[m]'],
		['w = 3'],
		['q = 10[km]/1[km]'],
		['c = 3[m]*π/2 + 1[m]']
	])('%s', (line) => {
		const s = session(line);
		const name = line.split(' ')[0];
		expect(statusOf(s, name).status).toBe('ok');
	});

	it('une valeur juste qui cite une grandeur', () => {
		const s = session('d = 5[km]', 't = 2[h]', 'v = d/t');
		expect(statusOf(s, 'v').status).toBe('ok');
	});
});
