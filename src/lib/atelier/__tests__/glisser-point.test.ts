/**
 * Géométrie, lot 3, PR 1 : glisser un point à la souris (M1, M2, M7 de
 * `docs/wip/atelier-geometrie-lot3-phase0.md`).
 *
 * L'atelier tient la position pendant le geste (M1 a) : chaque mouvement
 * réécrit la définition du point, tout un glisser fait UNE étape. Ce qui se
 * glisse (M2) : un point par coordonnées, un `point_sur` à position écrite ;
 * le reste est refusé, avec une phrase qui dit quoi déplacer.
 */
import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { AtelierFigure, syncFigure } from '../figure-sync';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';

type Entry = [kind: 'value' | 'point' | 'curve' | 'function', name: string, definition: string];

function atelierOf(entries: Entry[]): Atelier {
	const atelier = new Atelier();
	for (const [kind, name, definition] of entries) {
		const done = atelier.create({ kind, name, definition }, 'text');
		if (!done.ok) throw new Error(`${name} refusé : ${done.message}`);
	}
	return atelier;
}

/** Les coordonnées DESSINÉES du point `name` dans la vue Géométrie. */
function at(atelier: Atelier, name: string): [number, number] {
	const target = new AtelierFigure();
	syncFigure(atelier, target);
	const id = target.elementOf(name);
	const p = id === undefined ? undefined : target.figure.getPosition(id);
	if (!p) throw new Error(`${name} pas dessiné`);
	return [geoToNumber(p.x), geoToNumber(p.y)];
}

describe('M2 : un point par coordonnées se glisse, ses coordonnées sont réécrites', () => {
	it('A = (1 ; 2) glissé en (2,34 ; −0,71) : arrondi au dixième, virgule décimale', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);

		const done = atelier.dragPoint('A', 2.34, -0.71);

		expect(done.ok).toBe(true);
		expect(atelier.get('A')?.definition).toBe('(2,3 ; -0,7)');
	});

	it('aimantation : près d’un entier, la coordonnée s’y pose', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);

		atelier.dragPoint('A', 2.96, 1.07, 0.1);

		expect(atelier.get('A')?.definition).toBe('(3 ; 1)');
	});

	it('aimantation : loin d’un entier, rien ne s’aimante (arrondi au dixième)', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);

		atelier.dragPoint('A', 2.84, 1.46, 0.1);

		expect(atelier.get('A')?.definition).toBe('(2,8 ; 1,5)');
	});

	it('−0,04 s’écrit 0, jamais « -0 »', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);

		atelier.dragPoint('A', -0.04, 3);

		expect(atelier.get('A')?.definition).toBe('(0 ; 3)');
	});

	it('ce qui cite le point suit : le milieu est recalculé pendant le geste', () => {
		const atelier = atelierOf([
			['point', 'A', '(0 ; 0)'],
			['point', 'B', '(4 ; 0)'],
			['point', 'I', 'milieu(A, B)']
		]);

		atelier.dragPoint('B', 6, 0);

		expect(at(atelier, 'I')).toEqual([3, 0]);
	});
});

describe('M2 : un point_sur à position écrite se glisse le long de son objet', () => {
	it('sur un segment : la position est le paramètre projeté, au centième', () => {
		const atelier = atelierOf([
			['point', 'A', '(0 ; 0)'],
			['point', 'B', '(4 ; 0)'],
			['curve', 's', '[AB]'],
			['point', 'M', 'point_sur(s ; 0,3)']
		]);

		atelier.dragPoint('M', 1, 2.5);

		expect(atelier.get('M')?.definition).toBe('point_sur(s ; 0,25)');
	});

	it('sur un segment : au-delà d’une extrémité, la position reste dans [0 ; 1]', () => {
		const atelier = atelierOf([
			['point', 'A', '(0 ; 0)'],
			['point', 'B', '(4 ; 0)'],
			['curve', 's', '[AB]'],
			['point', 'M', 'point_sur(s ; 0,3)']
		]);

		atelier.dragPoint('M', 9, 0);

		expect(atelier.get('M')?.definition).toBe('point_sur(s ; 1)');
	});

	it('sur un cercle : la position est l’angle en degrés, dans [0 ; 360[', () => {
		const atelier = atelierOf([
			['point', 'O', '(1 ; 1)'],
			['curve', 'c', 'cercle(O ; 2)'],
			['point', 'M', 'point_sur(c ; 0)']
		]);

		atelier.dragPoint('M', 1, -5);

		expect(atelier.get('M')?.definition).toBe('point_sur(c ; 270)');
	});

	it('sur la courbe d’une fonction : la position est l’abscisse', () => {
		const atelier = atelierOf([
			['function', 'f', 'x^2'],
			['point', 'M', 'point_sur(f ; 1)']
		]);

		atelier.dragPoint('M', 2.03, 0);

		expect(atelier.get('M')?.definition).toBe('point_sur(f ; 2)');
	});
});

describe('M2 : ce qui ne se glisse pas est refusé, et la phrase dit quoi déplacer', () => {
	it('un point construit (milieu) : refusé, rien ne change', () => {
		const atelier = atelierOf([
			['point', 'A', '(0 ; 0)'],
			['point', 'B', '(4 ; 0)'],
			['point', 'I', 'milieu(A, B)']
		]);
		const steps = atelier.history.steps;

		const done = atelier.dragPoint('I', 1, 1);

		expect(done.ok).toBe(false);
		expect(done.ok ? '' : done.message).toContain('déplace les points dont il dépend');
		expect(atelier.dragRefusal('I')).not.toBeNull();
		expect(atelier.get('I')?.definition).toBe('milieu(A, B)');
		expect(atelier.history.steps).toBe(steps);
	});

	it('un point dont les coordonnées citent une valeur : refusé, on glisse le curseur', () => {
		const atelier = atelierOf([
			['value', 'a', '1'],
			['point', 'M', '(a ; 2a)']
		]);

		const done = atelier.dragPoint('M', 3, 3);

		expect(done.ok).toBe(false);
		expect(done.ok ? '' : done.message).toContain('curseur');
		expect(atelier.get('M')?.definition).toBe('(a ; 2a)');
	});

	it('un point_sur dont la position cite une valeur : refusé', () => {
		const atelier = atelierOf([
			['point', 'A', '(0 ; 0)'],
			['point', 'B', '(4 ; 0)'],
			['curve', 's', '[AB]'],
			['value', 't', '0,5'],
			['point', 'M', 'point_sur(s ; t)']
		]);

		expect(atelier.dragPoint('M', 1, 0).ok).toBe(false);
		expect(atelier.get('M')?.definition).toBe('point_sur(s ; t)');
	});

	it('ce qui se glisse n’a pas de refus', () => {
		const atelier = atelierOf([
			['point', 'A', '(0 ; 0)'],
			['point', 'B', '(4 ; 0)'],
			['curve', 's', '[AB]'],
			['point', 'M', 'point_sur(s ; 0,3)']
		]);

		expect(atelier.dragRefusal('A')).toBeNull();
		expect(atelier.dragRefusal('M')).toBeNull();
		expect(atelier.dragRefusal('s')).not.toBeNull();
		expect(atelier.dragRefusal('Z')).not.toBeNull();
	});
});

describe('M7 : tout un glisser = une étape', () => {
	it('30 mouvements puis le relâcher : une étape « déplacer A », Ctrl+Z rend (1 ; 2)', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const steps = atelier.history.steps;

		for (let i = 1; i <= 30; i++) atelier.dragPoint('A', 1 + i / 10, 2);
		atelier.endGesture();

		expect(atelier.history.steps).toBe(steps + 1);
		expect(atelier.history.undo).toBe('déplacer A');
		atelier.undo();
		expect(atelier.get('A')?.definition).toBe('(1 ; 2)');
		atelier.redo();
		expect(atelier.get('A')?.definition).toBe('(4 ; 2)');
	});

	it('deux glissers séparés par un relâcher : deux étapes', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const steps = atelier.history.steps;

		atelier.dragPoint('A', 2, 2);
		atelier.endGesture();
		atelier.dragPoint('A', 3, 2);
		atelier.endGesture();

		expect(atelier.history.steps).toBe(steps + 2);
	});

	it('un glisser ramené à son point de départ ne laisse aucune étape', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const steps = atelier.history.steps;

		atelier.dragPoint('A', 2, 2);
		atelier.dragPoint('A', 1, 2);
		atelier.endGesture();

		expect(atelier.history.steps).toBe(steps);
	});

	it('un mouvement qui ne change pas le nombre écrit ne réécrit rien', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const revision = atelier.revision;

		atelier.dragPoint('A', 1.02, 1.98);

		expect(atelier.revision).toBe(revision);
	});
});

describe('M2 : un point_sur glissé sur une droite, une demi-droite (revue)', () => {
	it('sur une droite : la position sort de [0 ; 1], des deux côtés', () => {
		const atelier = atelierOf([
			['point', 'A', '(0 ; 0)'],
			['point', 'B', '(4 ; 0)'],
			['curve', 'd', '(AB)'],
			['point', 'M', 'point_sur(d ; 0,5)']
		]);

		atelier.dragPoint('M', -2, 1);
		expect(atelier.get('M')?.definition).toBe('point_sur(d ; -0,5)');

		atelier.dragPoint('M', 6, -1);
		expect(atelier.get('M')?.definition).toBe('point_sur(d ; 1,5)');
	});

	it('sur une demi-droite [AB) : au-delà de B oui, avant A la position reste 0', () => {
		const atelier = atelierOf([
			['point', 'A', '(0 ; 0)'],
			['point', 'B', '(4 ; 0)'],
			['curve', 'r', '[AB)'],
			['point', 'M', 'point_sur(r ; 0,5)']
		]);

		atelier.dragPoint('M', 6, 0);
		expect(atelier.get('M')?.definition).toBe('point_sur(r ; 1,5)');

		atelier.dragPoint('M', -2, 0);
		expect(atelier.get('M')?.definition).toBe('point_sur(r ; 0)');
	});

	it('glisser A quand M est sur [AB] : la position de M ne change pas, M suit le segment', () => {
		const atelier = atelierOf([
			['point', 'A', '(0 ; 0)'],
			['point', 'B', '(4 ; 0)'],
			['curve', 's', '[AB]'],
			['point', 'M', 'point_sur(s ; 0,25)']
		]);

		atelier.dragPoint('A', -4, 0);
		atelier.endGesture();

		expect(atelier.get('A')?.definition).toBe('(-4 ; 0)');
		expect(atelier.get('M')?.definition).toBe('point_sur(s ; 0,25)');
		expect(at(atelier, 'M')).toEqual([-2, 0]);
	});
});

describe('M7 : Annuler attend le relâcher (revue)', () => {
	it('draggingPoint : vrai du premier mouvement au relâcher, faux après', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		expect(atelier.draggingPoint).toBe(false);

		atelier.dragPoint('A', 3, 2);
		expect(atelier.draggingPoint).toBe(true);

		atelier.endGesture();
		expect(atelier.draggingPoint).toBe(false);
	});

	it('un glisser refusé (point construit) n’ouvre pas de geste', () => {
		const atelier = atelierOf([
			['point', 'A', '(0 ; 0)'],
			['point', 'B', '(4 ; 0)'],
			['point', 'I', 'milieu(A, B)']
		]);

		atelier.dragPoint('I', 3, 2);

		expect(atelier.draggingPoint).toBe(false);
	});
});
