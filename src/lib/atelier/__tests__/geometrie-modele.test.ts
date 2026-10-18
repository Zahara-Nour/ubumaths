/**
 * La géométrie dans l'atelier, lot 1, PR 1 : le MODÈLE des points et des
 * courbes, sans la vue Figure (phase 0 `docs/wip/atelier-geometrie-phase0.md`,
 * comportements C, P, M et décisions Q1, Q3, validés le 2026-10-18).
 *
 * Chaque test porte l'identifiant du comportement qu'il prouve. Ce qui est
 * asserté est ce que l'élève voit : l'objet créé, la ligne de Calcul, le refus.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult, type CalcSession } from '../calcul';
import { nameRejectionMessage, validateName } from '../names';
import { actionsFor } from '../actions';
import { MAX_FIGURE_OBJECTS } from '../types';

// =============================================================================
// Outils
// =============================================================================

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine(), seed: () => 1 };
}

/** Le message d'un refus, ou une erreur parlante. */
function refusal(result: CalcResult): string {
	if (result.kind !== 'refus') throw new Error(`attendu un refus, reçu ${JSON.stringify(result)}`);
	return result.message;
}

/** Ce que répond une ligne de calcul, en texte. */
function answer(result: CalcResult): string {
	if (result.kind !== 'calcul') {
		throw new Error(`attendu un calcul, reçu ${JSON.stringify(result)}`);
	}
	return result.output;
}

// =============================================================================
// 1. Écrire une courbe
// =============================================================================

describe('1. écrire une courbe', () => {
	it('C1 : d : y = 3x - 2 crée la courbe d, une ligne dans Calcul', () => {
		const s = session();

		const result = runInput(s, 'd : y = 3x - 2');

		expect(result.kind).toBe('definition');
		const d = s.atelier.get('d');
		expect(d?.kind).toBe('curve');
		expect(d?.definition).toBe('y = 3x - 2');
		expect(d?.status).toBe('ok');
	});

	it('C1 : la courbe n’est pas tracée dans Graphe et n’a que modifier / supprimer', () => {
		const s = session();
		runInput(s, 'd : y = 3x - 2');

		s.atelier.setPlotted('d', true);

		expect(s.atelier.get('d')?.plotted).not.toBe(true);
		// Les actions communes à toute carte, et aucune autre (modifier = le champ)
		expect(actionsFor(s.atelier.get('d')!, s.atelier).map((a) => a.id)).toEqual([
			'rename',
			'remove'
		]);
	});

	it('C1 : la carte se crée aussi par « + Objet » (create)', () => {
		const atelier = new Atelier();

		const created = atelier.create({ kind: 'curve', name: 'd', definition: 'y = 3x - 2' }, 'text');

		expect(created.ok).toBe(true);
		expect(atelier.get('d')?.status).toBe('ok');
	});

	it('C1 : une courbe vide est « à compléter », comme toute carte neuve', () => {
		const atelier = new Atelier();

		const created = atelier.create({ kind: 'curve' });

		expect(created.ok && created.object.status).toBe('incomplete');
		expect(created.ok && created.object.name).toBe('d');
	});

	it.each(['C : x^2 + y^2 - 1 = 0', 'C : x^2 + y^2 = 1'])('C2 : %s crée la courbe C', (input) => {
		const s = session();

		runInput(s, input);

		expect(s.atelier.get('C')?.kind).toBe('curve');
		expect(s.atelier.get('C')?.status).toBe('ok');
	});

	it('C3 : v : x = 2 est une courbe (la droite verticale)', () => {
		const s = session();

		runInput(s, 'v : x = 2');

		expect(s.atelier.get('v')?.kind).toBe('curve');
		expect(s.atelier.get('v')?.status).toBe('ok');
	});

	it('C4 : C : x^2 + y^2 = a^2, a absent → en attente, avec l’offre de curseur', () => {
		const s = session();

		runInput(s, 'C : x^2 + y^2 = a^2');

		const C = s.atelier.get('C');
		expect(C?.status).toBe('pending');
		expect(C?.missing).toEqual([{ name: 'a', as: 'value' }]);
		expect(s.atelier.createFromOffer('a').ok).toBe(true);
		expect(s.atelier.get('C')?.status).toBe('ok');
	});

	it('C5 : T : y = f′(2)(x − 2) + f(2) cite f et la suit', () => {
		const s = session();
		runInput(s, 'f(x) = x^2');

		runInput(s, "T : y = f'(2)(x - 2) + f(2)");

		expect(s.atelier.get('T')?.status).toBe('ok');
		expect(s.atelier.dependents('f')).toEqual(['T']);
		// f en erreur : T le dit, comme toute carte qui la cite
		runInput(s, 'f(x) = x^^2');
		expect(s.atelier.get('T')?.status).toBe('error');
		expect(s.atelier.get('T')?.message).toBe('Dépend de « f », qui est en erreur.');
		// f supprimée : T part avec elle (suppression en cascade)
		expect(s.atelier.removalOf('f')).toEqual(['T']);
	});

	it('C7 : d : 2y = 6x - 4 est gardée telle qu’écrite', () => {
		const s = session();

		runInput(s, 'd : 2y = 6x - 4');

		expect(s.atelier.get('d')?.definition).toBe('2y = 6x - 4');
		expect(s.atelier.get('d')?.status).toBe('ok');
	});

	it('C8 : d : 2 = 3 est refusée, rien n’est créé', () => {
		const s = session();

		expect(refusal(runInput(s, 'd : 2 = 3'))).toBe('Une équation de courbe contient x ou y.');
		expect(s.atelier.get('d')).toBeUndefined();
	});

	it('C8 : la carte refuse aussi une équation sans x ni y', () => {
		const atelier = new Atelier();

		atelier.create({ kind: 'curve', name: 'd', definition: '2 = 3' }, 'text');

		expect(atelier.get('d')?.status).toBe('error');
		expect(atelier.get('d')?.message).toBe('Une équation de courbe contient x ou y.');
	});

	it.each(['d : y < 2x', 'd : y >= 2x', 'd : y ≤ 2x'])('C9 : %s est refusée (région)', (input) => {
		const s = session();

		expect(refusal(runInput(s, input))).toBe(
			'Une courbe s’écrit avec « = ». Les régions ne sont pas encore prises en charge.'
		);
		expect(s.atelier.get('d')).toBeUndefined();
	});

	it('C10 : d : y = 2x = 3 est refusée (un seul « = »)', () => {
		const s = session();

		expect(refusal(runInput(s, 'd : y = 2x = 3'))).toBe(
			'Une équation de courbe n’a qu’un seul « = ».'
		);
		expect(s.atelier.get('d')).toBeUndefined();
	});

	it('C11 : d : y = 3[m] x est refusée (une grandeur ne se trace pas, D4)', () => {
		const s = session();

		expect(refusal(runInput(s, 'd : y = 3[m] x'))).toBe(
			'Une équation de courbe s’écrit sans unité : une grandeur ne se trace pas.'
		);
		expect(s.atelier.get('d')).toBeUndefined();
	});

	it('C12 : d : y = 3x alors que d est une valeur → refus, la valeur gardée', () => {
		const s = session();
		runInput(s, 'd = 5');

		expect(refusal(runInput(s, 'd : y = 3x'))).toBe('« d » est déjà une valeur.');
		expect(s.atelier.get('d')?.kind).toBe('value');
		expect(s.atelier.get('d')?.definition).toBe('5');
	});

	it('C12 : redéfinir une courbe la met à jour, son type gardé', () => {
		const s = session();
		runInput(s, 'd : y = 3x - 2');

		const result = runInput(s, 'd : y = -x');

		expect(result.kind).toBe('definition');
		expect(s.atelier.get('d')?.definition).toBe('y = -x');
	});

	it.each([
		['y : x = 2', 'y'],
		['x : y = 2', 'x']
	])('C13 : %s est refusé (nom réservé)', (input, name) => {
		const s = session();

		expect(refusal(runInput(s, input))).toBe(nameRejectionMessage('reserved', name));
		expect(s.atelier.objects).toEqual([]);
	});

	it('C14 : x^2 = 4 sans nom reste un calcul, aucune courbe', () => {
		const s = session();

		const result = runInput(s, 'x^2 = 4');

		expect(result.kind).toBe('calcul');
		expect(s.atelier.objects).toEqual([]);
	});

	it('C15 : 6 : 3 reste la division', () => {
		expect(answer(runInput(session(), '6 : 3'))).toBe('2');
	});

	it('C15 : a : b (a, b valeurs) reste la division, aucune courbe', () => {
		const s = session();
		runInput(s, 'a = 2');
		runInput(s, 'b = 3');

		const result = runInput(s, 'a : b');

		expect(answer(result)).toBe('2/3');
		expect(s.atelier.names).toEqual(['a', 'b']);
	});

	it('C15 : a : b = 2 (a, b valeurs) reste une comparaison, aucune courbe', () => {
		const s = session();
		runInput(s, 'a = 4');
		runInput(s, 'b = 2');

		expect(runInput(s, 'a : b = 2').kind).toBe('calcul');
		expect(s.atelier.get('a')?.kind).toBe('value');
	});

	it('taper le nom d’une courbe répond son équation', () => {
		const s = session();
		runInput(s, 'd : y = 3x - 2');

		expect(answer(runInput(s, 'd'))).toBe('d : y = 3x - 2');
	});

	it('une courbe ne se calcule pas : d + 1 est refusé', () => {
		const s = session();
		runInput(s, 'd : y = 3x - 2');

		expect(refusal(runInput(s, 'd + 1'))).toBe('On ne calcule pas avec une courbe.');
	});
});

// =============================================================================
// 2. Écrire un point
// =============================================================================

describe('2. écrire un point', () => {
	it('P1 : A = (1 ; 2) crée le point A, une ligne dans Calcul', () => {
		const s = session();

		const result = runInput(s, 'A = (1 ; 2)');

		expect(result.kind).toBe('definition');
		const A = s.atelier.get('A');
		expect(A?.kind).toBe('point');
		expect(A?.definition).toBe('(1 ; 2)');
		expect(A?.status).toBe('ok');
		expect(actionsFor(A!, s.atelier).map((a) => a.id)).toEqual(['rename', 'remove']);
	});

	it('P1 : un point n’est pas tracé dans Graphe', () => {
		const s = session();
		runInput(s, 'A = (1 ; 2)');

		s.atelier.setPlotted('A', true);

		expect(s.atelier.get('A')?.plotted).not.toBe(true);
	});

	it('P1 : la carte se crée aussi par « + Objet » (create), nommée A', () => {
		const atelier = new Atelier();

		const created = atelier.create({ kind: 'point' });

		expect(created.ok && created.object.name).toBe('A');
		expect(created.ok && created.object.status).toBe('incomplete');
	});

	it('P2 : M = (a ; 2a) suit le curseur a', () => {
		const s = session();
		runInput(s, 'M = (a ; 2a)');
		expect(s.atelier.get('M')?.status).toBe('pending');
		expect(s.atelier.get('M')?.missing).toEqual([{ name: 'a', as: 'value' }]);

		runInput(s, 'a = 2');

		expect(s.atelier.get('M')?.status).toBe('ok');
		expect(answer(runInput(s, 'M'))).toBe('M(2 ; 4)');
		s.atelier.slideTo('a', 3);
		expect(answer(runInput(s, 'M'))).toBe('M(3 ; 6)');
	});

	it('P3 : B = (1,5 ; 2/3) : virgule décimale et fraction, coordonnées exactes', () => {
		const s = session();

		runInput(s, 'B = (1,5 ; 2/3)');

		expect(s.atelier.get('B')?.status).toBe('ok');
		expect(answer(runInput(s, 'B'))).toBe('B(3/2 ; 2/3)');
	});

	it('P4 : taper A répond A(1 ; 2)', () => {
		const s = session();
		runInput(s, 'A = (1 ; 2)');

		const result = runInput(s, 'A');

		expect(answer(result)).toBe('A(1 ; 2)');
		// Rien à « Garder » : ce n'est pas un nombre
		expect(result.kind === 'calcul' && result.ast).toBeUndefined();
	});

	it('P4 : un point en attente le dit quand on le tape', () => {
		const s = session();
		runInput(s, 'M = (a ; 2a)');

		expect(refusal(runInput(s, 'M'))).toBe("En attente de « a », qui n'est pas encore défini.");
	});

	it('P5 : A(1 ; 2) est refusé avec l’aide', () => {
		const s = session();

		expect(refusal(runInput(s, 'A(1 ; 2)'))).toBe('Pour définir un point, écris A = (1 ; 2).');
		expect(s.atelier.objects).toEqual([]);
	});

	it('P6 : A = (1, 2) est refusé : la virgule est décimale', () => {
		const s = session();

		expect(refusal(runInput(s, 'A = (1, 2)'))).toBe('Sépare les coordonnées avec « ; ».');
		expect(s.atelier.objects).toEqual([]);
	});

	it('P7 : A = (1 ; 2 ; 3) est refusé : deux coordonnées', () => {
		const s = session();

		expect(refusal(runInput(s, 'A = (1 ; 2 ; 3)'))).toMatch(
			/^Un point du plan a deux coordonnées\./
		);
		expect(s.atelier.objects).toEqual([]);
	});

	it('P8 : A = (2[m] ; 1) est refusé (D4)', () => {
		const s = session();

		expect(refusal(runInput(s, 'A = (2[m] ; 1)'))).toBe(
			'Les coordonnées d’un point sont des nombres sans unité.'
		);
		expect(s.atelier.objects).toEqual([]);
	});

	it.each(['A + 1', '2A', '2*A'])('P9 : %s est refusé', (input) => {
		const s = session();
		runInput(s, 'A = (1 ; 2)');

		expect(refusal(runInput(s, input))).toBe('On ne calcule pas encore avec des points.');
	});

	it('P9 : une valeur qui cite un point est en erreur, avec la même raison', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'point', name: 'A', definition: '(1 ; 2)' }, 'text');

		atelier.create({ kind: 'value', name: 'a', definition: 'A + 1' }, 'text');

		expect(atelier.get('a')?.status).toBe('error');
		expect(atelier.get('a')?.message).toBe('On ne calcule pas encore avec des points.');
	});

	it('un point redéfini garde son type ; une valeur ne devient pas un point', () => {
		const s = session();
		runInput(s, 'A = (1 ; 2)');
		runInput(s, 'A = (3 ; 4)');
		expect(answer(runInput(s, 'A'))).toBe('A(3 ; 4)');

		runInput(s, 'a = 2');
		expect(refusal(runInput(s, 'a = (1 ; 2)'))).toBe('« a » est déjà une valeur.');
		expect(refusal(runInput(s, 'A = 5'))).toBe('« A » est déjà un point.');
	});

	it('un point se renomme, et ses coordonnées suivent le renommage d’une valeur', () => {
		const s = session();
		runInput(s, 'a = 2');
		runInput(s, 'M = (a ; 2a)');

		expect(s.atelier.rename('a', 'b').ok).toBe(true);

		expect(s.atelier.get('M')?.definition).toBe('(b ; 2b)');
		expect(answer(runInput(s, 'M'))).toBe('M(2 ; 4)');
	});
});

// =============================================================================
// 3. y réservé (G5, Q1)
// =============================================================================

describe('3. y est réservé', () => {
	it('G5 : y est un nom réservé, comme x', () => {
		expect(validateName('y', [])).toBe('reserved');
	});

	it('Q1 : y = 3x - 2 sans nom est refusé, avec les deux écritures', () => {
		const s = session();

		expect(refusal(runInput(s, 'y = 3x - 2'))).toBe(
			'Pour une fonction, écris f(x) = 3x - 2 ; pour une droite, nomme-la : d : y = 3x - 2.'
		);
		expect(s.atelier.objects).toEqual([]);
	});

	it('Q1 : la proposition prend des noms libres', () => {
		const s = session();
		runInput(s, 'f(x) = x');
		runInput(s, 'd : y = 1');

		expect(refusal(runInput(s, 'y = 2x'))).toBe(
			'Pour une fonction, écris g(x) = 2x ; pour une droite, nomme-la : C : y = 2x.'
		);
	});

	it('Q1 : y = 2 (sans x) est refusé aussi, sans créer de valeur y', () => {
		const s = session();

		expect(refusal(runInput(s, 'y = 2'))).toBe(
			'« y » est réservé aux équations. Pour une valeur, choisis une autre lettre : a = 2 ; pour une droite, nomme-la : d : y = 2.'
		);
		expect(s.atelier.objects).toEqual([]);
	});

	it('y dans une courbe est la variable, jamais une valeur en attente', () => {
		const s = session();

		runInput(s, 'd : y = 2');

		expect(s.atelier.get('d')?.status).toBe('ok');
		expect(s.atelier.get('d')?.missing).toBeUndefined();
	});

	it('y dans une fonction est refusé, sans offre de curseur', () => {
		const s = session();

		runInput(s, 'f(x) = x + y');

		const f = s.atelier.get('f');
		expect(f?.status).toBe('error');
		expect(f?.message).toBe(
			'« y » est réservé aux équations de courbe : une fonction ne peut pas s’en servir.'
		);
		expect(f?.missing).toBeUndefined();
	});

	it('x ou y dans les coordonnées d’un point est refusé', () => {
		const s = session();

		runInput(s, 'A = (x ; 2)');

		expect(s.atelier.get('A')?.status).toBe('error');
		expect(s.atelier.get('A')?.message).toBe(
			'Les coordonnées d’un point ne contiennent ni x ni y : ce sont les variables des équations.'
		);
	});
});

// =============================================================================
// 4. Plafond et suppression (M2, M3)
// =============================================================================

describe('4. plafond et suppression', () => {
	it(`M2 / Q3 : au-delà de ${MAX_FIGURE_OBJECTS} points et courbes, refus avec la raison`, () => {
		const s = session();
		for (let i = 1; i <= MAX_FIGURE_OBJECTS / 2; i++) {
			expect(s.atelier.create({ kind: 'point', definition: `(${i} ; 0)` }).ok).toBe(true);
			expect(s.atelier.create({ kind: 'curve', definition: `y = ${i}x` }).ok).toBe(true);
		}

		const message = `Un atelier ne peut pas contenir plus de ${MAX_FIGURE_OBJECTS} points et courbes.`;
		const refused = s.atelier.create({ kind: 'point', definition: '(0 ; 0)' });
		expect(refused.ok === false && refused.message).toBe(message);
		expect(refusal(runInput(s, 'Z = (0 ; 0)'))).toBe(message);
		expect(refusal(runInput(s, 'z : y = 0'))).toBe(message);
		// Les autres objets ne comptent pas
		expect(s.atelier.create({ kind: 'value', definition: '1' }).ok).toBe(true);
	});

	it('M3 : supprimer a propose de supprimer M = (a ; 2a) et C : x² + y² = a²', () => {
		const s = session();
		runInput(s, 'a = 2');
		runInput(s, 'M = (a ; 2a)');
		runInput(s, 'C : x^2 + y^2 = a^2');

		expect(s.atelier.removalOf('a')).toEqual(['M', 'C']);
		const removed = s.atelier.removeWithDependents('a');
		expect(removed.ok).toBe(true);
		expect(s.atelier.names).toEqual([]);
	});
});
