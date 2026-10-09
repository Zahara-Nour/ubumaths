/**
 * `L = 1,5 ; 2 ; 3,5` tapé dans Calcul crée une LISTE (demande de David,
 * 2026-10-09) — le même objet que la carte « + Liste » : `atelier.create`
 * avec `kind: 'list'`, la définition rangée telle que tapée (la carte range
 * `1{,}5;2;3{,}5`, la vue Données `1,5 ; 2 ; 3,5` : `readListValue` lit les deux).
 *
 * Règle de #983 : une virgule entre deux chiffres est décimale, « ; » sépare.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult, type CalcSession } from '../calcul';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine(), seed: () => 1 };
}

function output(result: CalcResult): string {
	if (result.kind !== 'commande') throw new Error(`attendu une commande, reçu ${result.kind}`);
	return result.output;
}

describe('une liste tapée dans Calcul', () => {
	it.each([
		['L = 1,5 ; 2 ; 3,5', 'L', [1.5, 2, 3.5]],
		['M = 12 ; 15 ; 9', 'M', [12, 15, 9]],
		['N = -1 ; 0,5 ; 2/3', 'N', [-1, 0.5, 2 / 3]],
		['P = 1;2', 'P', [1, 2]]
	])('%s crée une liste', (input, name, values) => {
		const s = session();

		const result = runInput(s, input);

		expect(result.kind).toBe('definition');
		const list = s.atelier.get(name);
		expect(list?.kind).toBe('list');
		expect(list?.status).toBe('ok');
		expect(list?.kind === 'list' && list.values).toEqual(values);
	});

	it('la définition est rangée comme la vue Données la range : telle que tapée', () => {
		const s = session();
		runInput(s, 'L = 1,5 ; 2 ; 3,5');

		expect(s.atelier.get('L')?.definition).toBe('1,5 ; 2 ; 3,5');
	});

	it('elle survit à l’enregistrement, comme une liste de la carte', () => {
		const s = session();
		runInput(s, 'L = 1,5 ; 2 ; 3,5');

		const restored = new Atelier();
		restored.restore(JSON.parse(JSON.stringify(s.atelier.serialize())));
		const list = restored.get('L');
		expect(list?.kind === 'list' && list.values).toEqual([1.5, 2, 3.5]);
	});

	it('une liste n’est pas tracée d’office', () => {
		const s = session();
		runInput(s, 'L = 1 ; 2 ; 3');

		expect(s.atelier.get('L')?.plotted).toBeFalsy();
	});

	it('une seule valeur reste un nombre', () => {
		const s = session();
		runInput(s, 'a = 1,5');

		expect(s.atelier.get('a')?.kind).toBe('value');
	});

	it.each(['f(t) = t^2 ; t', 'a = x ; 2', 'a = 1 ; ', 'a = 1 ; ; 2'])(
		'%s n’est pas une liste (le membre de droite n’est pas fait que de nombres)',
		(input) => {
			const s = session();
			runInput(s, input);

			const name = input[0];
			expect(s.atelier.get(name)?.kind).not.toBe('list');
		}
	);

	it('redéfinir une liste la remplace', () => {
		const s = session();
		runInput(s, 'L = 1 ; 2 ; 3');

		const result = runInput(s, 'L = 4 ; 5');

		expect(result.kind).toBe('definition');
		const list = s.atelier.get('L');
		expect(list?.kind === 'list' && list.values).toEqual([4, 5]);
		expect(s.atelier.objects.filter((o) => o.name === 'L')).toHaveLength(1);
	});

	it('un « ; » final est accepté, comme sur la carte', () => {
		const s = session();

		const result = runInput(s, 'L = 12 ; 15 ;');

		expect(result.kind).toBe('definition');
		const list = s.atelier.get('L');
		expect(list?.kind === 'list' && list.values).toEqual([12, 15]);
	});

	it.each([
		[
			'a = 2',
			'a = 1 ; 2',
			'« a » est déjà un nombre : supprime-le ou choisis un autre nom pour créer une liste.'
		],
		[
			'L = 12 ; 15 ; x',
			'L = 12 ; 15',
			'« L » est déjà un nombre : supprime-le ou choisis un autre nom pour créer une liste.'
		],
		[
			'f(x) = x^2',
			'f = 1 ; 2',
			'« f » est déjà une fonction : supprime-la ou choisis un autre nom pour créer une liste.'
		],
		[
			'u(n) = 2n',
			'u = 1 ; 2',
			'« u » est déjà une suite : supprime-la ou choisis un autre nom pour créer une liste.'
		]
	])(
		'après %s, %s est refusé en le disant (le type de l’atelier ne change pas)',
		(first, second, message) => {
			const s = session();
			runInput(s, first);
			const before = s.atelier.get(second[0]);

			const result = runInput(s, second);

			expect(result).toEqual({ kind: 'refus', message });
			expect(s.atelier.get(second[0])).toEqual(before);
		}
	);

	it.each([
		['L = 1,2,3', 'L = 1 ; 2 ; 3'],
		['L = 12, 15, 9', 'L = 12 ; 15 ; 9']
	])('l’ancienne écriture %s est refusée, avec la forme corrigée', (input, fixed) => {
		const s = session();

		const result = runInput(s, input);

		expect(result.kind).toBe('refus');
		expect(result.kind === 'refus' && result.message).toContain(fixed);
		expect(s.atelier.get('L')).toBeUndefined();
	});

	it('la forme corrigée, retapée, crée la liste', () => {
		const s = session();
		const refused = runInput(s, 'L = 1,2,3');
		const message = refused.kind === 'refus' ? refused.message : '';
		const retyped = message.slice(message.indexOf('L ='));

		runInput(s, retyped);

		const list = s.atelier.get('L');
		expect(list?.kind === 'list' && list.values).toEqual([1, 2, 3]);
	});
});

describe('les outils statistiques sur la liste créée', () => {
	it('.stats L', () => {
		const s = session();
		runInput(s, 'L = 1,5 ; 2 ; 3,5');

		const text = output(runInput(s, '.stats L'));

		expect(text).toContain('Effectif : 3');
		expect(text).toContain('Minimum = 1,5');
	});

	it('.ajustement L : M', () => {
		const s = session();
		runInput(s, 'L = 1 ; 2 ; 3 ; 4');
		runInput(s, 'M = 2 ; 4 ; 6 ; 8');

		const result = runInput(s, '.ajustement L : M');

		expect(result.kind).toBe('commande');
		expect(output(result)).toMatch(/y = 2x/);
	});

	it('.comparer L M', () => {
		const s = session();
		runInput(s, 'L = 12 ; 15 ; 9');
		runInput(s, 'M = 10 ; 11 ; 14');

		const result = runInput(s, '.comparer L M');

		expect(result.kind).toBe('commande');
	});

	it('l’action Statistiques de la carte', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('L = 1,5 ; 2 ; 3,5');

		expect(desk.runFromPanel('stats', 'L')).toBe('ok');

		const last = desk.entries[desk.entries.length - 1];
		expect(last.failed).toBe(false);
		expect(last.text).toContain('Effectif : 3');
	});
});

describe('une liste citée comme un nombre', () => {
	it.each(['M = L', 'a = 2L', '2L + 1', 'g(x) = x + L'])('%s est refusé en français', (input) => {
		const s = session();
		runInput(s, 'L = 1 ; 2 ; 3');
		const names = s.atelier.names.length;

		const result = runInput(s, input);

		expect(result).toEqual({ kind: 'refus', message: 'L est une liste : utilise .stats L' });
		expect(s.atelier.names).toHaveLength(names);
	});
});
