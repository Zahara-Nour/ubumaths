/**
 * Géométrie, lot 2, PR 3 : `intersection(a, b, k)` et `point_sur(objet, position)`
 * dans le modèle de l'atelier (L5 de `docs/archive/wip/atelier-geometrie-lot2-phase0.md`,
 * validée le 2026-10-18 ; L1 : l'atelier calcule EXACTEMENT, avec les fonctions
 * pures de `geometry-core`).
 *
 * Ce qui est asserté est ce que l'élève voit : la ligne de Calcul (coordonnées
 * exactes, ou « ≈ »), la ligne grise de la carte, l'état de l'objet et sa raison,
 * le refus et son aide.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { promote, runInput, type CalcResult, type CalcSession } from '../calcul';
import { constructionSummaryOf } from '../construction';
import { encodeAtelier, decodeAtelier } from '../url';
import { readConstruction } from '../construction-read';

// =============================================================================
// Outils
// =============================================================================

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine(), seed: () => 1 };
}

/**
 * A(0 ; 1), B(1 ; 3) : (AB) a pour équation y = 2x + 1. O(0 ; 0), C(2 ; 0),
 * D(1 ; 1), Q(1 ; 0). u = (OC) est l'axe des abscisses, c le cercle de centre O
 * de rayon 1.
 */
function plane(...more: string[]): CalcSession {
	const s = session();
	const lines = [
		'A = (0 ; 1)',
		'B = (1 ; 3)',
		'O = (0 ; 0)',
		'C = (2 ; 0)',
		'D = (1 ; 1)',
		'Q = (1 ; 0)',
		'd = (AB)',
		'u = (OC)',
		'c = cercle(O ; 1)',
		...more
	];
	for (const line of lines) {
		const done = runInput(s, line);
		if (done.kind !== 'definition') throw new Error(`${line} : ${JSON.stringify(done)}`);
	}
	return s;
}

function refusal(result: CalcResult): string {
	if (result.kind !== 'refus') throw new Error(`attendu un refus, reçu ${JSON.stringify(result)}`);
	return result.message;
}

function answer(result: CalcResult): string {
	if (result.kind !== 'calcul')
		throw new Error(`attendu un calcul, reçu ${JSON.stringify(result)}`);
	return result.output;
}

function define(s: CalcSession, line: string) {
	const result = runInput(s, line);
	if (result.kind !== 'definition') throw new Error(`${line} : ${JSON.stringify(result)}`);
	const object = s.atelier.get(result.name);
	if (object === undefined) throw new Error(`${result.name} absent`);
	return object;
}

/** Ce que dit la ligne grise de la carte, en clair. */
function card(s: CalcSession, name: string): string | undefined {
	return constructionSummaryOf(s.atelier, name)?.text;
}

function state(s: CalcSession, name: string): [string | undefined, string | undefined] {
	const o = s.atelier.get(name);
	return [o?.status, o?.message];
}

// =============================================================================
// intersection : les couples du catalogue
// =============================================================================

describe('intersection(a, b, k) : droite et droite', () => {
	it('E = intersection(d, u) : un seul point, k facultatif, exact', () => {
		const s = plane();
		define(s, 'E = intersection(d, u)');
		expect(card(s, 'E')).toBe('E(-1/2 ; 0)');
		expect(answer(runInput(s, 'E'))).toBe('E(-1/2 ; 0)');
	});

	it('intersection(d, u, 1) : le même point', () => {
		const s = plane();
		define(s, 'E = intersection(d ; u ; 1)');
		expect(card(s, 'E')).toBe('E(-1/2 ; 0)');
	});

	it('les raccourcis écrits dans l’intersection : intersection((AB), (OC))', () => {
		const s = plane();
		expect(answer(runInput(s, 'intersection((AB), (OC))'))).toBe('(-1/2 ; 0)');
	});

	it('deux droites parallèles : le point attend, avec la raison', () => {
		const s = plane('f = parallele(O, d)');
		define(s, 'E = intersection(d, f)');
		expect(state(s, 'E')).toEqual(['pending', 'd et f ne se coupent pas.']);
	});

	it('deux droites confondues : refus, une infinité de points communs', () => {
		const s = plane('g = (BA)');
		expect(refusal(runInput(s, 'E = intersection(d, g)'))).toBe(
			'd et g ont une infinité de points communs.'
		);
		expect(s.atelier.get('E')).toBeUndefined();
	});

	it('k = 2 pour deux droites : en erreur, deux droites ont un point commun au plus', () => {
		const s = plane();
		define(s, 'E = intersection(d, u, 2)');
		expect(state(s, 'E')).toEqual([
			'error',
			'Deux droites ont au plus un point commun : écris intersection(d, u).'
		]);
	});
});

describe('intersection(a, b, k) : droite et cercle', () => {
	it('deux points sans k : refus, avec l’aide des deux écritures', () => {
		const s = plane();
		expect(refusal(runInput(s, 'E = intersection(u, c)'))).toBe(
			'u et c se coupent en deux points : écris intersection(u, c, 1) ou intersection(u, c, 2).'
		);
		expect(s.atelier.get('E')).toBeUndefined();
	});

	it('k = 1, k = 2 : la numérotation de geometry-core (sens de la droite)', () => {
		const s = plane();
		define(s, 'E = intersection(u, c, 1)');
		define(s, 'F = intersection(u, c, 2)');
		expect(card(s, 'E')).toBe('E(-1 ; 0)');
		expect(card(s, 'F')).toBe('F(1 ; 0)');
	});

	it('exact avec des racines : (OD) et c', () => {
		const s = plane('h = (OD)');
		define(s, 'E = intersection(h, c, 2)');
		expect(card(s, 'E')).toBe('E((1/2)√2 ; (1/2)√2)');
	});

	it('le cercle d’abord : intersection(c, u, 2) numérote comme intersection(u, c, 2)', () => {
		const s = plane();
		define(s, 'F = intersection(c ; u ; 2)');
		expect(card(s, 'F')).toBe('F(1 ; 0)');
	});

	it('une tangente : un seul point, k facultatif', () => {
		const s = plane('t = parallele(A, u)');
		define(s, 'T = intersection(t, c)');
		expect(card(s, 'T')).toBe('T(0 ; 1)');
	});

	it('une tangente et k = 2 : il n’y a pas de second point (en attente)', () => {
		const s = plane('t = parallele(A, u)');
		define(s, 'T = intersection(t, c, 2)');
		expect(state(s, 'T')).toEqual(['pending', 't et c n’ont qu’un point commun.']);
	});

	it('aucun point : en attente, la raison ; un curseur les fait se couper, le point revient', () => {
		const s = plane('a = 2', 'P = (0 ; a)', 'h = parallele(P, u)');
		define(s, 'E = intersection(h, c, 1)');
		expect(state(s, 'E')).toEqual(['pending', 'h et c ne se coupent pas.']);
		s.atelier.slideTo('a', 0.5);
		expect(state(s, 'E')[0]).toBe('ok');
		expect(card(s, 'E')).toBe('E(-(1/2)√3 ; 1/2)');
	});

	it('ce qui cite un point en attente attend aussi (pas une erreur)', () => {
		const s = plane('a = 2', 'P = (0 ; a)', 'h = parallele(P, u)');
		define(s, 'E = intersection(h, c, 1)');
		define(s, 'I = milieu(E, O)');
		define(s, 'L = OE');
		expect(state(s, 'I')[0]).toBe('pending');
		expect(state(s, 'L')[0]).toBe('pending');
		s.atelier.slideTo('a', 0);
		expect(card(s, 'I')).toBe('I(-1/2 ; 0)');
		expect(answer(runInput(s, 'L'))).toBe('1');
	});
});

describe('intersection(a, b, k) : cercle et cercle', () => {
	it('k = 1 à gauche de (centre 1 → centre 2), k = 2 à droite', () => {
		const s = plane('k = cercle(Q ; 1)');
		define(s, 'E = intersection(c, k, 1)');
		define(s, 'F = intersection(c, k, 2)');
		expect(card(s, 'E')).toBe('E(1/2 ; (1/2)√3)');
		expect(card(s, 'F')).toBe('F(1/2 ; -(1/2)√3)');
	});

	it('deux cercles égaux : refus, une infinité de points communs', () => {
		const s = plane('k = cercle(O ; 1)');
		expect(refusal(runInput(s, 'E = intersection(c, k, 1)'))).toBe(
			'c et k ont une infinité de points communs.'
		);
	});

	it('deux cercles qui deviennent égaux en glissant un curseur : en ATTENTE, pas en erreur', () => {
		const s = plane('a = 1', 'P = (a ; 0)', 'k = cercle(P ; 1)');
		define(s, 'E = intersection(c, k, 1)');
		s.atelier.slideTo('a', 0);
		expect(state(s, 'E')).toEqual(['pending', 'c et k ont une infinité de points communs.']);
		s.atelier.slideTo('a', 1);
		expect(state(s, 'E')[0]).toBe('ok');
	});

	it('deux cercles concentriques : en attente', () => {
		const s = plane('k = cercle(O ; 2)');
		define(s, 'E = intersection(c, k, 1)');
		expect(state(s, 'E')).toEqual(['pending', 'c et k ne se coupent pas.']);
	});
});

describe('intersection(a, b, k) : courbes par équation et fonctions', () => {
	it('droite et conique (x² + y² = 4) : exact', () => {
		const s = plane('h = (OD)', 'K : x^2 + y^2 = 4');
		define(s, 'E = intersection(h, K, 2)');
		expect(card(s, 'E')).toBe('E(√2 ; √2)');
	});

	it('conique et conique : approché (≈), quatre points numérotés', () => {
		const s = plane('K : x^2 + y^2 = 4', 'H : x^2 - y^2 = 1');
		expect(refusal(runInput(s, 'E = intersection(K, H)'))).toBe(
			'K et H se coupent en 4 points : écris intersection(K, H, 1), intersection(K, H, 2), intersection(K, H, 3) ou intersection(K, H, 4).'
		);
		define(s, 'E = intersection(K, H, 1)');
		expect(card(s, 'E')).toMatch(/^E ≈ \(-?1,5811 ; -?1,2247\)$/);
	});

	it('droite et fonction : exact (racines du second degré), abscisses croissantes', () => {
		const s = plane('f(x) = x^2');
		define(s, 'E = intersection(d, f, 1)');
		define(s, 'F = intersection(f ; d ; 2)');
		expect(card(s, 'E')).toBe('E(1 - √2 ; 3 - 2√2)');
		expect(card(s, 'F')).toBe('F(1 + √2 ; 3 + 2√2)');
	});

	it('droite et fonction sans forme exacte : approché, numéroté de gauche à droite', () => {
		const s = plane('f(x) = cos(x)');
		expect(refusal(runInput(s, 'E = intersection(u, f)'))).toContain(
			'u et f se coupent en 6 points'
		);
		define(s, 'E = intersection(u, f, 4)');
		expect(card(s, 'E')).toBe('E ≈ (1,5708 ; 0)');
	});

	it('une racine exacte avec dénominateur s’écrit en fraction, comme Calcul', () => {
		const s = plane('f(x) = 2x^2 - 1');
		define(s, 'E = intersection(u, f, 2)');
		expect(card(s, 'E')).toBe('E(√2/2 ; 0)');
		expect(constructionSummaryOf(s.atelier, 'E')?.latex).toContain('\\dfrac{\\sqrt{2}}{2}');
	});

	it('une racine 1/2 avec curseur, en fraction, qui suit le curseur', () => {
		const s = plane('a = 1', 'f(x) = 4x^2 - a');
		define(s, 'E = intersection(u, f, 2)');
		expect(card(s, 'E')).toBe('E(1/2 ; 0)');
		expect(constructionSummaryOf(s.atelier, 'E')?.latex).toContain('\\dfrac{1}{2}');
		s.atelier.slideTo('a', 4);
		expect(card(s, 'E')).toBe('E(1 ; 0)');
	});

	it('fonction et fonction', () => {
		const s = plane('f(x) = x^2', 'g(x) = x + 2');
		define(s, 'E = intersection(f, g, 1)');
		define(s, 'F = intersection(f, g, 2)');
		expect(card(s, 'E')).toBe('E(-1 ; 1)');
		expect(card(s, 'F')).toBe('F(2 ; 4)');
	});

	it('une courbe y = f(x) écrite en équation : comme une fonction', () => {
		const s = plane('K : y = x^2');
		define(s, 'E = intersection(d, K, 2)');
		expect(card(s, 'E')).toBe('E(1 + √2 ; 3 + 2√2)');
	});

	it('une racine hors de l’ensemble de f ne compte pas', () => {
		const s = plane('f(x) = x^2 sur [0 ; 5]');
		define(s, 'E = intersection(d, f)');
		expect(card(s, 'E')).toBe('E(1 + √2 ; 3 + 2√2)');
	});

	it('fonction et cercle : pas encore dans l’atelier (refus, comme le DSL)', () => {
		const s = plane('f(x) = x^2');
		expect(refusal(runInput(s, 'E = intersection(f, c, 1)'))).toBe(
			'L’intersection d’une fonction et d’un cercle n’est pas encore dans l’atelier.'
		);
	});

	it('une courbe implicite : refus', () => {
		const s = plane('K : x^3 + y^3 = 1');
		expect(refusal(runInput(s, 'E = intersection(d, K, 1)'))).toBe(
			'K est une courbe implicite : ses intersections ne sont pas encore dans l’atelier.'
		);
	});

	it('un point ou une valeur n’est pas une ligne', () => {
		const s = plane('a = 2');
		expect(refusal(runInput(s, 'E = intersection(A, c, 1)'))).toBe(
			'« A » n’est pas une ligne, un cercle ou une courbe.'
		);
		expect(refusal(runInput(s, 'E = intersection(a, c, 1)'))).toBe(
			'« a » n’est pas une ligne, un cercle ou une courbe.'
		);
	});

	it('k doit être un entier à partir de 1', () => {
		const s = plane();
		expect(refusal(runInput(s, 'E = intersection(u ; c ; 0)'))).toBe(
			'Dans intersection(…), le numéro du point est un entier à partir de 1 (1, 2…).'
		);
		expect(refusal(runInput(s, 'E = intersection(u ; c ; 1,5)'))).toBe(
			'Dans intersection(…), le numéro du point est un entier à partir de 1 (1, 2…).'
		);
	});
});

describe('intersection : segments et demi-droites', () => {
	it('sans k : le seul point sur le segment', () => {
		const s = plane('s = [OC]');
		define(s, 'E = intersection(s, c)');
		expect(card(s, 'E')).toBe('E(1 ; 0)');
	});

	it('avec k : un point hors du segment n’existe pas (en attente)', () => {
		const s = plane('s = [OC]');
		define(s, 'E = intersection(s, c, 1)');
		expect(state(s, 'E')).toEqual(['pending', 'Le point 1 de s et c n’est pas sur s.']);
	});

	it('une demi-droite : seul ce qui est du côté de son origine compte', () => {
		const s = plane('r = [OC)');
		define(s, 'E = intersection(r, c)');
		expect(card(s, 'E')).toBe('E(1 ; 0)');
	});

	it('deux segments qui ne se touchent pas : en attente', () => {
		const s = plane('s = [OQ]', 'u = [AB]');
		define(s, 'E = intersection(s, u)');
		expect(state(s, 'E')).toEqual(['pending', 's et u ne se coupent pas.']);
	});
});

// =============================================================================
// point_sur
// =============================================================================

describe('point_sur(objet, position)', () => {
	it('sur un segment : 0 = A, 1 = B ; position 0,3', () => {
		const s = plane('s = [AB]');
		define(s, 'M = point_sur(s ; 0,3)');
		expect(card(s, 'M')).toBe('M(3/10 ; 8/5)');
		expect(answer(runInput(s, 'M'))).toBe('M(3/10 ; 8/5)');
	});

	it('point_sur(s) sans position : le milieu (0,5, comme le DSL)', () => {
		const s = plane('s = [AB]');
		define(s, 'M = point_sur(s)');
		expect(card(s, 'M')).toBe('M(1/2 ; 2)');
	});

	it('sur un segment, une position hors de [0 ; 1] : en attente, avec la raison', () => {
		const s = plane('s = [AB]');
		define(s, 'M = point_sur(s ; 1,5)');
		expect(state(s, 'M')).toEqual([
			'pending',
			'Sur le segment s, la position va de 0 à 1 : 1,5 en sort.'
		]);
	});

	it('sur une droite : l’abscisse le long de (AB) (0 en A, 1 en B)', () => {
		const s = plane();
		define(s, 'M = point_sur(d ; 2)');
		expect(card(s, 'M')).toBe('M(2 ; 5)');
	});

	it('sur un cercle : l’angle en degrés (réglage par défaut)', () => {
		const s = plane('k = cercle(O ; 2)');
		define(s, 'M = point_sur(k ; 90)');
		define(s, 'N = point_sur(k ; 30)');
		expect(card(s, 'M')).toBe('M(0 ; 2)');
		expect(card(s, 'N')).toBe('N(√3 ; 1)');
	});

	it('sur un cercle, angle non remarquable : approché', () => {
		const s = plane('k = cercle(O ; 2)');
		define(s, 'M = point_sur(k ; 20)');
		expect(card(s, 'M')).toBe('M ≈ (1,8794 ; 0,684)');
	});

	it('sur un cercle, réglage « Angles : radians » : la position reste en DEGRÉS (L5, comme le DSL)', () => {
		const s = plane('k = cercle(O ; 2)');
		s.atelier.setAngleUnit('rad');
		define(s, 'M = point_sur(k ; 90)');
		expect(card(s, 'M')).toBe('M(0 ; 2)');
		expect(s.atelier.positionSliderOf('M')).toEqual({ min: 0, max: 360, step: 1 });
	});

	it('un lien relu dans un atelier réglé en radians donne la même figure', async () => {
		const s = plane('k = cercle(O ; 2)');
		define(s, 'M = point_sur(k ; 30)');
		const encoded = await encodeAtelier(s.atelier.serialize());
		const decoded = await decodeAtelier(encoded.payload);
		const back = new Atelier();
		back.setAngleUnit('rad');
		if (decoded.ok) back.restore(decoded.state);
		expect(constructionSummaryOf(back, 'M')?.text).toBe('M(√3 ; 1)');
	});

	it('sur la courbe d’une fonction : point_sur(f ; 3) = (3 ; f(3))', () => {
		const s = plane('f(x) = x^2');
		define(s, 'M = point_sur(f ; 3)');
		expect(card(s, 'M')).toBe('M(3 ; 9)');
	});

	it('hors de l’ensemble de définition de f : en attente', () => {
		const s = plane('f(x) = 1/x');
		define(s, 'M = point_sur(f ; 0)');
		expect(state(s, 'M')).toEqual(['pending', 'f n’est pas définie en 0.']);
	});

	it('la position est le nom d’une valeur : M suit son curseur', () => {
		const s = plane('s = [AB]', 't = 0,3');
		define(s, 'M = point_sur(s ; t)');
		expect(card(s, 'M')).toBe('M(3/10 ; 8/5)');
		s.atelier.slideTo('t', 0.5);
		expect(card(s, 'M')).toBe('M(1/2 ; 2)');
		// La valeur porte le curseur : M n'en a pas un second
		expect(s.atelier.positionSliderOf('M')).toBeNull();
	});

	it('un point ou une valeur n’est pas un objet où poser un point', () => {
		const s = plane();
		expect(refusal(runInput(s, 'M = point_sur(A ; 0,5)'))).toBe(
			'« A » n’est pas une ligne, un cercle ou une courbe.'
		);
	});
});

describe('point_sur : le curseur de position', () => {
	it('une position écrite 1/3 : le premier cran réécrit le nombre (0,33)', () => {
		const s = plane('s = [AB]');
		define(s, 'M = point_sur(s ; 1/3)');
		expect(s.atelier.positionSliderOf('M')).toEqual({ min: 0, max: 1, step: 0.01 });
		s.atelier.slidePosition('M', 0.33);
		expect(s.atelier.get('M')?.definition).toBe('point_sur(s ; 0,33)');
		expect(card(s, 'M')).toBe('M(33/100 ; 83/50)');
	});

	it('une position écrite en LaTeX (\\frac{1}{2}) n’a pas de curseur (voulu)', () => {
		const s = plane('s = [AB]');
		s.atelier.create(
			{ kind: 'point', name: 'M', definition: 'point_sur(s ; \\frac{1}{2})' },
			'text'
		);
		expect(card(s, 'M')).toBe('M(1/2 ; 2)');
		expect(s.atelier.positionSliderOf('M')).toBeNull();
	});

	it('un nombre écrit : un curseur, aux bornes de l’objet', () => {
		const s = plane('s = [AB]', 'k = cercle(O ; 2)');
		define(s, 'M = point_sur(s ; 0,3)');
		define(s, 'N = point_sur(k ; 90)');
		define(s, 'P = point_sur(d ; 2)');
		expect(s.atelier.positionSliderOf('M')).toEqual({ min: 0, max: 1, step: 0.01 });
		expect(s.atelier.positionSliderOf('N')).toEqual({ min: 0, max: 360, step: 1 });
		expect(s.atelier.positionSliderOf('P')).toEqual({ min: -10, max: 10, step: 0.1 });
	});

	it('point_sur(s) sans position : pas de curseur', () => {
		const s = plane('s = [AB]');
		define(s, 'M = point_sur(s)');
		expect(s.atelier.positionSliderOf('M')).toBeNull();
	});

	it('glisser la position réécrit le nombre, et M suit (avec ce qui le cite)', () => {
		const s = plane('s = [AB]');
		define(s, 'M = point_sur(s ; 0,3)');
		define(s, 'L = AM');
		const moved = s.atelier.slidePosition('M', 0.5);
		expect(moved.ok).toBe(true);
		expect(s.atelier.positionOf('M')).toBe(0.5);
		expect(card(s, 'M')).toBe('M(1/2 ; 2)');
		expect(answer(runInput(s, 'L'))).toBe('sqrt(5)/2');
	});

	it('la position glissée reste dans les bornes', () => {
		const s = plane('s = [AB]');
		define(s, 'M = point_sur(s ; 0,3)');
		s.atelier.slidePosition('M', 7);
		expect(s.atelier.positionOf('M')).toBe(1);
	});

	it('le curseur de position ne change pas la forme rangée : sauvegarde et lien relisent M', async () => {
		const s = plane('s = [AB]');
		define(s, 'M = point_sur(s ; 0,3)');
		s.atelier.slidePosition('M', 0.6);
		const stored = s.atelier.serialize();
		expect(stored.objects.find((o) => o.name === 'M')).toEqual({
			name: 'M',
			kind: 'point',
			definition: 'point_sur(s ; 0,6)'
		});
		const encoded = await encodeAtelier(stored);
		const decoded = await decodeAtelier(encoded.payload);
		expect(decoded.ok).toBe(true);
		const back = new Atelier();
		if (decoded.ok) back.restore(decoded.state);
		expect(constructionSummaryOf(back, 'M')?.text).toBe('M(3/5 ; 11/5)');
	});
});

// =============================================================================
// Tapé seul, dépendances
// =============================================================================

describe('tapé seul = calcul ; « Garder » en fait un objet', () => {
	it('intersection(u, c, 1) tapé seul : ses coordonnées, rien de créé', () => {
		const s = plane();
		const result = runInput(s, 'intersection(u, c, 1)');
		expect(answer(result)).toBe('(-1 ; 0)');
		expect(s.atelier.objects.some((o) => o.definition.startsWith('intersection'))).toBe(false);
		const kept = promote(s, result);
		expect(kept.ok).toBe(true);
		const created = s.atelier.objects.find((o) => o.definition === 'intersection(u, c, 1)');
		expect(created?.kind).toBe('point');
	});

	it('tapé seul sans point commun : la raison', () => {
		const s = plane('k = cercle(O ; 2)');
		expect(refusal(runInput(s, 'intersection(c, k, 1)'))).toBe('c et k ne se coupent pas.');
	});

	it('point_sur tapé seul : ses coordonnées', () => {
		const s = plane('s = [AB]');
		expect(answer(runInput(s, 'point_sur(s ; 0,3)'))).toBe('(3/10 ; 8/5)');
	});
});

describe('dépendances : attente, cascade, renommage, circularité', () => {
	it('supprimer le cercle : E attend ; la cascade propose E et ce qui le cite', () => {
		const s = plane();
		define(s, 'E = intersection(u, c, 1)');
		define(s, 'L = AE');
		expect(s.atelier.removalOf('c')).toEqual(expect.arrayContaining(['E', 'L']));
		s.atelier.remove('c');
		expect(state(s, 'E')[0]).toBe('pending');
	});

	it('renommer le cercle réécrit l’intersection (texte)', () => {
		const s = plane();
		define(s, 'E = intersection(u, c, 1)');
		s.atelier.rename('c', 'w');
		expect(s.atelier.get('E')?.definition).toBe('intersection(u, w, 1)');
		expect(card(s, 'E')).toBe('E(-1 ; 0)');
	});

	it('renommer le support réécrit le LaTeX de la carte (point\\_sur)', () => {
		const s = session();
		for (const line of ['A = (0 ; 1)', 'B = (1 ; 3)', 's = [AB]']) runInput(s, line);
		s.atelier.create(
			{
				kind: 'point',
				name: 'M',
				definition: '\\operatorname{point\\_sur}\\left(s,\\,0.3\\right)'
			},
			'mathfield'
		);
		expect(constructionSummaryOf(s.atelier, 'M')?.text).toBe('M(3/10 ; 8/5)');
		s.atelier.rename('s', 'u');
		expect(s.atelier.get('M')?.definition).toBe(
			'\\operatorname{point\\_sur}\\left(u,\\,0.3\\right)'
		);
		expect(constructionSummaryOf(s.atelier, 'M')?.text).toBe('M(3/10 ; 8/5)');
	});

	it('une construction circulaire est refusée', () => {
		const s = plane();
		define(s, 'E = intersection(u, c, 1)');
		expect(refusal(runInput(s, 'u = (EA)'))).toContain('circulaire');
	});

	it('une mesure qui cite un point d’intersection suit son curseur', () => {
		const s = plane('a = 0', 'P = (0 ; a)', 'h = parallele(P, u)');
		define(s, 'E = intersection(h, c, 2)');
		define(s, 'L = AE');
		expect(answer(runInput(s, 'L'))).toBe('sqrt(2)');
		s.atelier.slideTo('a', 0.5);
		expect(answer(runInput(s, 'L'))).toBe('1');
	});

	it('une mesure qui cite un point APPROCHÉ se dit « ≈ »', () => {
		const s = plane('f(x) = cos(x)');
		define(s, 'E = intersection(u, f, 4)');
		define(s, 'L = OE');
		expect(answer(runInput(s, 'L'))).toBe('≈ 1,5708');
	});
});

// =============================================================================
// Lecture : le DSL tel quel, texte et LaTeX de MathLive
// =============================================================================

describe('lecture : intersection et point_sur sont des mots du catalogue', () => {
	it('intersection(d, c, 1) et point_sur(s, 0.3) se lisent (écriture du DSL)', () => {
		const inter = readConstruction('intersection(d, c, 1)', 'text');
		expect(inter?.ok && inter.call.word).toBe('intersection');
		const on = readConstruction('point_sur(s, 0.3)', 'text');
		expect(on?.ok && on.call.word).toBe('point_sur');
	});

	it('le LaTeX de la carte et de MathLive : \\operatorname{point\\_sur}, point_{sur}', () => {
		for (const latex of [
			'\\operatorname{point\\_sur}\\left(s,\\,0.3\\right)',
			'point\\_sur\\left(s;0{,}3\\right)',
			'point_{sur}\\left(s;0{,}3\\right)'
		]) {
			const read = readConstruction(latex, 'mathfield');
			expect(read?.ok && read.call.word, latex).toBe('point_sur');
		}
	});
});

describe('le LaTeX des réponses est intact (aucun antislash perdu)', () => {
	const hasControl = (text: string) => [...text].some((char) => char.charCodeAt(0) < 32);
	const latexOf = (result: CalcResult) => (result.kind === 'calcul' ? (result.latex ?? '') : '');

	it('intersection tapée seule, point approché, point_sur, carte', () => {
		const s = plane('K : x^2 + y^2 = 4', 'H : x^2 - y^2 = 1', 's = [AB]');
		define(s, 'E = intersection(K, H, 1)');
		define(s, 'M = point_sur(s ; 0,3)');
		const lines = [
			latexOf(runInput(s, 'intersection(u, c, 1)')),
			latexOf(runInput(s, 'E')),
			latexOf(runInput(s, 'M')),
			constructionSummaryOf(s.atelier, 'E')?.latex ?? '',
			constructionSummaryOf(s.atelier, 'M')?.latex ?? ''
		];
		for (const latex of lines) {
			expect(latex).not.toBe('');
			expect(hasControl(latex), latex).toBe(false);
		}
		expect(lines[1]).toContain('\\approx');
	});
});

describe('séparateurs : le refus cite le nombre de l’élève', () => {
	it('point_sur([AB], 0,3) : « 0,3 », pas l’exemple 1,5', () => {
		const s = plane();
		expect(refusal(runInput(s, 'M = point_sur([AB], 0,3)'))).toBe(
			'Sépare les arguments de point_sur avec « ; » : une virgule entre deux chiffres est décimale (0,3).'
		);
	});
});
