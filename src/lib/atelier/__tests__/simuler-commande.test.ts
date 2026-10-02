/**
 * `.simuler L M n` — simuler n tirages d'une loi (outils statistiques v2,
 * lot 1, PR (b), Q72-Q77, 2026-10-02).
 *
 * L = les valeurs, M = leurs probabilités. Le résultat est une NOUVELLE liste
 * des effectifs observés (Q73) : elle tient sous le plafond de 200 valeurs
 * quel que soit n.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';
import { commandCatalog } from '../commands';
import { actionsFor } from '../actions';
import { CalcDesk } from '../desk.svelte';
import { isList, type ListObject } from '../types';

function session(lists: Record<string, string>, seed = 4821): CalcSession {
	const atelier = new Atelier();
	for (const [name, definition] of Object.entries(lists)) {
		atelier.create({ kind: 'list', name, definition });
	}
	return { atelier, engine: new WebReplEngine(), seed: () => seed };
}

const DIE = { L: '1;2;3;4;5;6', M: '1/6;1/6;1/6;1/6;1/6;1/6' };

const listNamed = (s: CalcSession, name: string) => {
	const object = s.atelier.get(name);
	if (object === undefined || !isList(object)) throw new Error(`pas de liste ${name}`);
	return object as ListObject;
};

describe('la commande se découvre', () => {
	it('« simuler » est au catalogue, avec un exemple', () => {
		const entry = commandCatalog(new WebReplEngine()).find((c) => c.french === 'simuler');

		expect(entry?.example).toBe('.simuler L M 100');
	});
});

describe('cas nominal', () => {
	it('dé, 600 tirages : une liste N de 6 effectifs, de somme 600', () => {
		const s = session(DIE);
		const result = runInput(s, '.simuler L M 600');

		expect(result.kind).toBe('commande');
		const created = listNamed(s, 'N');
		expect(created.values).toHaveLength(6);
		expect(created.values.reduce((a, b) => a + b, 0)).toBe(600);
	});

	it('l’historique dit la graine, puis valeur, effectif, fréquence et probabilité', () => {
		const result = runInput(session(DIE), '.simuler L M 600');
		const text = result.kind === 'commande' ? result.output : '';

		expect(text.split('\n')[0]).toBe(
			'600 tirages de L avec probabilités M (graine 4821) → effectifs dans N'
		);
		// 1 en-tête, 6 valeurs, et la piste de Q83
		expect(text.split('\n')).toHaveLength(8);
		expect(text.split('\n')[1]).toMatch(/^1 : \d+ fois, fréquence 0,\d+ — probabilité 1\/6$/);
	});

	it('même graine, mêmes effectifs ; autre graine, autres effectifs', () => {
		const a = session(DIE, 4821);
		const b = session(DIE, 4821);
		const c = session(DIE, 17);
		for (const s of [a, b, c]) runInput(s, '.simuler L M 600');

		expect(listNamed(b, 'N').values).toEqual(listNamed(a, 'N').values);
		expect(listNamed(c, 'N').values).not.toEqual(listNamed(a, 'N').values);
	});

	it('probabilités décimales', () => {
		const s = session({ L: '1;0', M: '0,5;0,5' });

		expect(runInput(s, '.simuler L M 100').kind).toBe('commande');
		expect(listNamed(s, 'N').values.reduce((a, b) => a + b, 0)).toBe(100);
	});
});

describe('lecture de n et affichage (revue)', () => {
	it('« 1 000 » avec une espace : 1 000 tirages, en-tête « 1 000 tirages »', () => {
		const s = session(DIE);
		const result = runInput(s, '.simuler L M 1 000');

		expect(listNamed(s, 'N').values.reduce((a, b) => a + b, 0)).toBe(1000);
		expect(result.kind === 'commande' && result.output.startsWith('1 000 tirages de L')).toBe(true);
	});

	it('n = 1 : « 1 tirage », au singulier', () => {
		const result = runInput(session(DIE), '.simuler L M 1');

		expect(result.kind === 'commande' && result.output.startsWith('1 tirage de L')).toBe(true);
	});

	it.each(['0x10', '1e3', '1,000', '+5'])('n = %s : refusé, rien de créé', (n) => {
		const s = session(DIE);

		expect(runInput(s, `.simuler L M ${n}`)).toEqual({
			kind: 'refus',
			message: 'n doit être un entier entre 1 et 100 000'
		});
		expect(s.atelier.get('N')).toBeUndefined();
	});

	it('valeurs et probabilités telles que tapées : 0,5 et 0,25, pas 1/2 et 1/4', () => {
		const result = runInput(session({ L: '0,5 ; 2', M: '0,25 ; 0,75' }), '.simuler L M 10');
		const lines = result.kind === 'commande' ? result.output.split('\n') : [];

		expect(lines[1]).toMatch(/^0,5 : \d+ fois, fréquence [\d,]+ — probabilité 0,25$/);
		expect(lines[2]).toMatch(/^2 : \d+ fois, fréquence [\d,]+ — probabilité 0,75$/);
	});
});

describe('fréquence au millième', () => {
	it('arrondi juste sur un demi : 3 sur 80 = 0,0375 → 0,038 (toFixed donnait 0,037)', () => {
		const lists = { L: '1 ; 2', M: '1/20 ; 19/20' };
		// Une graine pour laquelle la valeur 1 sort 3 fois sur 80
		const seed = Array.from({ length: 2000 }, (_, i) => i).find((g) => {
			const s = session(lists, g);
			runInput(s, '.simuler L M 80');
			return listNamed(s, 'N').values[0] === 3;
		});
		expect(seed, 'aucune graine ne donne 3 sur 80').toBeDefined();
		const result = runInput(session(lists, seed), '.simuler L M 80');
		const lines = result.kind === 'commande' ? result.output.split('\n') : [];

		expect(lines[1]).toBe('1 : 3 fois, fréquence 0,038 — probabilité 1/20');
	});
});

describe('cas d’erreur — message, rien de créé', () => {
	it.each([
		[
			'somme ≠ 1',
			{ L: '1;0', M: '0,5;0,4' },
			'.simuler L M 10',
			'La somme des probabilités fait 9/10, pas 1.'
		],
		['liste inconnue', DIE, '.simuler L P 10', '« P » n’est pas une liste de l’atelier.'],
		[
			'longueurs différentes',
			{ L: '1;2;3', M: '1/2;1/2' },
			'.simuler L M 10',
			'3 valeur(s) pour 2 probabilité(s) : il en faut autant.'
		],
		[
			'n absent',
			DIE,
			'.simuler L M',
			'Écris la commande ainsi : .simuler L M 100 (valeurs, probabilités, nombre de tirages).'
		],
		['n décimal', DIE, '.simuler L M 2,5', 'n doit être un entier entre 1 et 100 000'],
		['n trop grand', DIE, '.simuler L M 100001', 'n doit être un entier entre 1 et 100 000'],
		[
			'probabilité négative',
			{ L: '1;0', M: '-1/2;3/2' },
			'.simuler L M 10',
			"La probabilité -1/2 n'est pas entre 0 et 1."
		]
	])('%s', (_, lists, input, message) => {
		const s = session(lists);
		const before = s.atelier.objects.length;
		const result = runInput(s, input);

		expect(result).toEqual({ kind: 'refus', message });
		expect(s.atelier.objects.length).toBe(before);
	});

	it('plafond de 8 listes : refusé, rien de créé', () => {
		const lists: Record<string, string> = { ...DIE };
		for (const name of ['A', 'B', 'C', 'D', 'E', 'F']) lists[name] = '1';
		const s = session(lists);
		const result = runInput(s, '.simuler L M 10');

		expect(result).toEqual({
			kind: 'refus',
			message: 'Un atelier ne peut pas contenir plus de 8 listes.'
		});
	});
});

describe('l’action sur la carte de la liste des valeurs', () => {
	it('« Simuler avec probabilités M » prépare la commande, n = 100 par défaut', () => {
		const s = session(DIE);
		const labels = actionsFor(s.atelier.get('L')!, s.atelier, 'M').map((a) => a.label);
		expect(labels).toContain('Simuler avec probabilités M');

		const desk = new CalcDesk(s.atelier);
		expect(desk.runFromPanel('simulate:M', 'L')).toBe('needs-argument');
		expect(desk.draft).toBe('.simuler L M 100');
	});
});
