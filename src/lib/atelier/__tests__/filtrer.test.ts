/**
 * `.filtrer` — un sous-ensemble d'individus répondant à un critère (outils
 * statistiques v2, lot 2, PR (c), Q90, 2026-10-02 ; 2de `2-174` : filtre,
 * ET, OU, NON). Une entrée par individu dans chaque liste.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';
import { commandCatalog } from '../commands';
import { isList, type ListObject } from '../types';

function session(lists: Record<string, string>): CalcSession {
	const atelier = new Atelier();
	for (const [name, definition] of Object.entries(lists)) {
		atelier.create({ kind: 'list', name, definition });
	}
	return { atelier, engine: new WebReplEngine() };
}

/** 6 élèves : sexe, réponse, note */
const CLASS = {
	L: 'fille ; garçon ; fille ; garçon ; fille ; garçon',
	M: 'oui ; oui ; non ; oui ; oui ; non',
	N: '12 ; 8 ; 15 ; 11 ; 9 ; 14'
};

const output = (s: CalcSession, input: string) => {
	const result = runInput(s, input);
	if (result.kind !== 'commande') throw new Error(`refus : ${JSON.stringify(result)}`);
	return result.output;
};

const listNamed = (s: CalcSession, name: string) => {
	const object = s.atelier.get(name);
	if (object === undefined || !isList(object)) throw new Error(`pas de liste ${name}`);
	return object as ListObject;
};

describe('la commande se découvre', () => {
	it('« filtrer » au catalogue, avec son exemple et son décor', () => {
		const entry = commandCatalog(new WebReplEngine()).find((c) => c.french === 'filtrer');

		expect(entry?.example).toBe('.filtrer L = fille et M = oui');
		expect(entry?.exampleSetup).toBeDefined();
	});
});

describe('compter les individus', () => {
	it('L = fille et M = oui : 2 sur 6', () => {
		expect(output(session(CLASS), '.filtrer L = fille et M = oui')).toBe(
			'2 individus sur 6 vérifient L = fille et M = oui (33,3 %)'
		);
	});

	it.each([
		['L = fille ou M = non', 4],
		['non L = fille', 3],
		['non (L = fille ou M = non)', 2],
		['L = fille et (M = oui ou N ≥ 15)', 3],
		['L = fille ou M = oui et N > 10', 4],
		['L ≠ fille', 3],
		['L != fille', 3],
		['N < 10', 2],
		['N <= 11', 3],
		['N >= 14', 2],
		['N = 12', 1],
		['L = Fille', 3],
		['L = FILLE et N > 9', 2]
	])('%s → %i', (criterion, expected) => {
		expect(output(session(CLASS), `.filtrer ${criterion}`)).toMatch(
			new RegExp(`^${expected} individus? sur 6 `)
		);
	});

	it('aucun individu : « 0 individu », et la modalité absente est signalée', () => {
		expect(output(session(CLASS), '.filtrer L = filles')).toBe(
			'0 individu sur 6 vérifie L = filles (0 %) — « filles » n’apparaît pas dans L'
		);
	});
});

describe('créer la liste des individus filtrés (`si`)', () => {
	it('les notes des filles qui ont répondu oui', () => {
		const s = session(CLASS);
		const text = output(s, '.filtrer N si L = fille et M = oui');

		expect(text).toBe(
			'Liste L_1 créée : les valeurs de N pour les 2 individus qui vérifient L = fille et M = oui'
		);
		expect(listNamed(s, 'L_1').values).toEqual([12, 9]);
	});

	it('une liste de MOTS filtrée reste qualitative', () => {
		const s = session(CLASS);
		output(s, '.filtrer M si N ≥ 12');

		expect(listNamed(s, 'L_1').categories).toEqual(['oui', 'non', 'non']);
	});

	it('aucun individu : aucune liste créée, et la ligne le dit', () => {
		const s = session(CLASS);

		expect(output(s, '.filtrer N si N > 100')).toBe(
			'0 individu sur 6 vérifie N > 100 : aucune liste créée'
		);
		expect(s.atelier.objects).toHaveLength(3);
	});
});

describe('cas d’erreur — message, rien de créé', () => {
	const USAGE =
		'Écris la commande ainsi : .filtrer L = fille et M = oui, ou .filtrer N si L = fille.';

	it.each([
		[
			'longueurs différentes',
			{ L: 'a ; b ; a', M: 'x ; y' },
			'.filtrer L = a et M = x',
			'L a 3 entrées et M 2 : il faut une entrée par individu.'
		],
		['< sur des mots', CLASS, '.filtrer L < fille', 'L contient des mots : < compare des nombres.'],
		['liste inconnue', CLASS, '.filtrer P = fille', '« P » n’est pas une liste de l’atelier.'],
		['parenthèse non fermée', CLASS, '.filtrer (L = fille', USAGE],
		['opérateur manquant', CLASS, '.filtrer L fille', USAGE],
		['critère vide', CLASS, '.filtrer', USAGE],
		[
			'nombre attendu',
			CLASS,
			'.filtrer N > beaucoup',
			'« beaucoup » n’est pas un nombre : N contient des nombres.'
		]
	])('%s', (_, lists, input, message) => {
		const s = session(lists);
		const before = s.atelier.objects.length;

		expect(runInput(s, input)).toEqual({ kind: 'refus', message });
		expect(s.atelier.objects.length).toBe(before);
	});

	it('une liste refusée : son message', () => {
		const s = session({ ...CLASS, R: Array.from({ length: 25 }, (_, i) => `m${i}`).join(' ; ') });

		expect(runInput(s, '.filtrer R = m1')).toEqual({
			kind: 'refus',
			message: 'Une liste qualitative a au plus 20 modalités (celle-ci en a 25).'
		});
	});

	it('plafond de 8 listes avec `si` : le message du plafond', () => {
		const lists: Record<string, string> = { ...CLASS };
		for (const name of ['A', 'B', 'C', 'D', 'E']) lists[name] = '1 ; 2 ; 3 ; 4 ; 5 ; 6';
		const s = session(lists);

		expect(runInput(s, '.filtrer N si N > 10')).toEqual({
			kind: 'refus',
			message: 'Un atelier ne peut pas contenir plus de 8 listes.'
		});
	});
});

describe('.croiser propose de filtrer', () => {
	it('dernière ligne : un exemple avec les noms et des modalités réelles', () => {
		const text = output(session(CLASS), '.croiser L M');

		expect(text.split('\n').at(-1)).toBe('Pour filtrer : .filtrer L = fille et M = oui');
	});
});

// Revue de la PR (c)
describe('revue — une liste trouée décalerait les individus', () => {
	it.each([
		[{ N: '12 ; ; 15 ; 9', L: 'a ; b ; c ; d' }, '.filtrer N si L = c', 'N', 2],
		[{ N: '12 ; 1/0 ; 15 ; 9', P: '1 ; 2 ; 3 ; 4' }, '.filtrer P si N > 10', 'N', 2],
		[{ L: 'a ;  ; c', M: 'x ; y ; z' }, '.filtrer L = a', 'L', 2]
	])('refusée, avec la place du trou (%#)', (lists, input, name, position) => {
		const s = session(lists);
		const before = s.atelier.objects.length;

		expect(runInput(s, input)).toEqual({
			kind: 'refus',
			message: `L'entrée n° ${position} de ${name} est vide ou illisible : il faut une entrée par individu, dans le même ordre que les autres listes.`
		});
		expect(s.atelier.objects.length).toBe(before);
	});

	it('un point-virgule final n’est pas un trou', () => {
		expect(output(session({ N: '12 ; 8 ;', L: 'a ; b' }), '.filtrer N > 10')).toMatch(
			/^1 individu sur 2 /
		);
	});

	it('.croiser refuse aussi une liste trouée', () => {
		expect(runInput(session({ L: 'a ;  ; b', M: 'x ; y ; z' }), '.croiser L M')).toEqual({
			kind: 'refus',
			message:
				"L'entrée n° 2 de L est vide ou illisible : il faut une entrée par individu, dans le même ordre que les autres listes."
		});
	});
});

describe('revue — liste créée, piste de .croiser', () => {
	it('les entrées de la liste créée sont recopiées telles quelles (1/3 reste 1/3)', () => {
		const s = session({ N: '1/3 ; 2/3 ; 1', L: 'a ; b ; a' });
		output(s, '.filtrer N si L = a');

		expect(listNamed(s, 'M').definition).toBe('1/3 ; 1');
	});

	it('un seul individu : « pour le seul individu »', () => {
		expect(output(session(CLASS), '.filtrer N si N = 12')).toBe(
			'Liste L_1 créée : les valeurs de N pour le seul individu qui vérifie N = 12'
		);
	});

	it('pas de piste quand la modalité ne se cite pas telle quelle', () => {
		const text = output(session({ L: 'noir et blanc ; couleur', M: 'oui ; non' }), '.croiser L M');

		expect(text).not.toContain('Pour filtrer');
	});
});
