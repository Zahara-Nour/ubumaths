/**
 * Géométrie, lot 3, PR 3 : les outils de construction de la vue Géométrie
 * (Milieu, Intersection, Point sur un objet, Parallèle, Perpendiculaire) et le
 * M5 complet de `docs/archive/wip/atelier-geometrie-lot3-phase0.md` : un clic sur un
 * objet crée un `point_sur`, un clic à la rencontre de deux objets crée leur
 * `intersection`.
 *
 * Comme pour les outils de base : on asserte les lignes ÉCRITES dans la console
 * et les objets qu'elles créent, par le chemin complet (pupitre, moteur réel).
 * `near` est ce que la toile dirait : les objets proches du clic, le plus proche
 * d'abord, et la tolérance en unités du repère.
 */
import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { constructionOf } from '../construction';
import { FIGURE_TOOLS, FigureToolbox } from '../figure-tools.svelte';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';

// =============================================================================
// Décor
// =============================================================================

function bench(lines: readonly string[] = []) {
	const atelier = new Atelier();
	const desk = new CalcDesk(atelier);
	for (const line of lines) desk.submit(line);
	const toolbox = new FigureToolbox(atelier, (line) => desk.write(line)?.failed === false);
	const written = () => desk.entries.slice(lines.length).map((e) => e.label);
	return { atelier, desk, toolbox, written };
}

/** Ce que dit la toile : ces objets sont à moins de 0,2 unité du clic. */
const near = (...objects: string[]) => ({ objects, radius: 0.2 });

/** La position calculée du point construit `name`, en nombres. */
function positionOf(atelier: Atelier, name: string): [number, number] | null {
	const outcome = constructionOf(atelier, name);
	if (!outcome.ok || outcome.built.shape !== 'point') return null;
	const { at } = outcome.built;
	return [geoToNumber(at.x), geoToNumber(at.y)];
}

/** Un segment horizontal [AB] et un cercle de centre O de rayon 2. */
const FIGURE = ['A = (-4 ; 0)', 'B = (4 ; 0)', 'd = [AB]', 'O = (0 ; 0)', 'c = cercle(O ; 2)'];

// =============================================================================
// Tests
// =============================================================================

describe('M3 : la barre complète, dans l’ordre', () => {
	it('onze outils : Déplacer, les outils de base, puis ceux de construction', () => {
		expect(FIGURE_TOOLS.map((t) => t.label)).toEqual([
			'Déplacer',
			'Point',
			'Segment',
			'Droite',
			'Demi-droite',
			'Cercle',
			'Milieu',
			'Intersection',
			'Point sur un objet',
			'Parallèle',
			'Perpendiculaire'
		]);
	});
});

describe('M5 : un clic sur un objet, avec un outil qui attend un point', () => {
	it('Point sur un segment : un point_sur à la position du clic, au centième', () => {
		const { atelier, toolbox, written } = bench(FIGURE);
		toolbox.select('point');

		// x = 1,03 sur [AB] de −4 à 4 : t = 5,03 / 8 = 0,62875
		toolbox.click(1.03, 0.05, null, 0, near('d'));

		expect(written()).toEqual(['C = point_sur(d ; 0,63)']);
		expect(positionOf(atelier, 'C')?.[0]).toBeCloseTo(1.04);
	});

	it('Point sur un cercle : l’angle en degrés, à l’unité', () => {
		const { toolbox, written } = bench(FIGURE);
		toolbox.select('point');

		toolbox.click(0.05, 2.02, null, 0, near('c'));

		expect(written()).toEqual(['C = point_sur(c ; 89)']);
	});

	it('Point sur une fonction : l’abscisse, au dixième', () => {
		const { toolbox, written } = bench(['f(x) = x^2']);
		toolbox.select('point');

		toolbox.click(1.52, 2.3, null, 0, near('f'));

		expect(written()).toEqual(['A = point_sur(f ; 1,5)']);
	});

	it('Point près d’une demi-droite, derrière son origine : ramené à l’origine (position 0)', () => {
		const { toolbox, written } = bench(['A = (0 ; 0)', 'B = (2 ; 0)', 'd = [AB)']);
		toolbox.select('point');

		toolbox.click(-0.1, 0.05, null, 0, near('d'));

		expect(written()).toEqual(['C = point_sur(d ; 0)']);
	});

	it('un point près du clic l’emporte sur l’objet (il est réutilisé)', () => {
		const { toolbox, written } = bench(FIGURE);
		toolbox.select('point');

		toolbox.click(4, 0, 'B', 0, near('d'));

		expect(written()).toEqual([]);
	});

	it('à la rencontre de deux objets : leur intersection, avec le numéro du point visé', () => {
		const { atelier, toolbox, written } = bench(FIGURE);
		toolbox.select('point');

		// [AB] coupe le cercle en (−2 ; 0) et (2 ; 0)
		toolbox.click(1.95, 0.05, null, 0, near('d', 'c'));

		expect(written()).toHaveLength(1);
		const [line] = written();
		expect(line).toMatch(/^C = intersection\(d ; c ; [12]\)$/);
		expect(positionOf(atelier, 'C')).toEqual([2, 0]);
	});

	it('l’autre point de rencontre : l’autre numéro', () => {
		const { atelier, toolbox } = bench(FIGURE);
		toolbox.select('point');

		toolbox.click(-1.95, 0.05, null, 0, near('d', 'c'));

		expect(positionOf(atelier, 'C')).toEqual([-2, 0]);
	});

	it('deux droites : intersection sans numéro', () => {
		const { toolbox, written } = bench([
			'A = (0 ; 0)',
			'B = (2 ; 2)',
			'C = (0 ; 2)',
			'D = (2 ; 0)',
			'd = (AB)',
			'd_1 = (CD)'
		]);
		toolbox.select('point');

		toolbox.click(1.05, 1, null, 0, near('d', 'd_1'));

		expect(written()).toEqual(['E = intersection(d ; d_1)']);
	});

	it('deux objets proches mais leur rencontre est loin du clic : un point_sur du plus proche', () => {
		const { toolbox, written } = bench(FIGURE);
		toolbox.select('point');

		// Près du cercle en (0 ; 2), le segment est censé être proche aussi (tolérance large)
		toolbox.click(0, 1.9, null, 0, { objects: ['c', 'd'], radius: 2 });

		expect(written()).toEqual(['C = point_sur(c ; 90)']);
	});

	it('Segment : une extrémité sur le cercle, l’autre dans le vide', () => {
		const { toolbox, written } = bench(FIGURE);
		toolbox.select('segment');

		toolbox.click(2, 0.02, null, 0, near('c'));
		toolbox.click(5, 3, null);

		expect(written()).toEqual(['C = point_sur(c ; 1)', 'D = (5 ; 3)', 'd_1 = [CD]']);
	});
});

describe('Milieu', () => {
	it('deux points existants : I = milieu(A ; B) — le nom suit M4 (première majuscule libre)', () => {
		const { atelier, toolbox, written } = bench(['A = (0 ; 0)', 'B = (4 ; 2)']);
		toolbox.select('milieu');

		toolbox.click(0, 0, 'A');
		toolbox.click(4, 2, 'B');

		expect(written()).toEqual(['C = milieu(A ; B)']);
		expect(positionOf(atelier, 'C')).toEqual([2, 1]);
	});

	it('un clic sur un segment : son milieu, d’un seul clic', () => {
		const { atelier, toolbox, written } = bench(FIGURE);
		toolbox.select('milieu');

		toolbox.click(1, 0.05, null, 0, near('d'));

		expect(written()).toEqual(['C = milieu(d)']);
		expect(positionOf(atelier, 'C')).toEqual([0, 0]);
	});

	it('dans le vide : les deux points se posent, puis le milieu', () => {
		const { toolbox, written } = bench();
		toolbox.select('milieu');

		toolbox.click(0, 0, null);
		toolbox.click(2, 0, null);

		expect(written()).toEqual(['A = (0 ; 0)', 'B = (2 ; 0)', 'C = milieu(A ; B)']);
	});

	it('la consigne, puis le même point deux fois refusé', () => {
		const { toolbox, written } = bench(['A = (0 ; 0)']);
		toolbox.select('milieu');
		expect(toolbox.instruction).toBe('Clique sur un premier point, ou sur un segment.');

		toolbox.click(0, 0, 'A');
		expect(toolbox.instruction).toBe('Clique sur un deuxième point.');
		toolbox.click(0, 0, 'A');

		expect(written()).toEqual([]);
		expect(toolbox.notice).toBe('Choisis un autre point que A.');
	});
});

describe('Intersection', () => {
	it('un clic là où deux objets se coupent : l’intersection, d’un seul clic', () => {
		const { atelier, toolbox, written } = bench(FIGURE);
		toolbox.select('intersection');

		toolbox.click(2, 0.05, null, 0, near('c', 'd'));

		expect(written()).toHaveLength(1);
		expect(written()[0]).toMatch(/^C = intersection\(c ; d ; [12]\)$/);
		expect(positionOf(atelier, 'C')).toEqual([2, 0]);
	});

	it('deux clics, un objet chacun : le point de rencontre le plus proche du second clic', () => {
		const { atelier, toolbox, written } = bench(FIGURE);
		toolbox.select('intersection');

		toolbox.click(0, 2, null, 0, near('c'));
		expect(toolbox.instruction).toBe('Clique sur un deuxième objet.');
		toolbox.click(-3, 0, null, 0, near('d'));

		expect(written()).toHaveLength(1);
		expect(positionOf(atelier, 'C')).toEqual([-2, 0]);
	});

	it('deux objets qui ne se coupent pas : rien ne s’écrit, la boîte le dit', () => {
		const { toolbox, written } = bench([...FIGURE, 'E = (0 ; 5)', 'F = (1 ; 5)', 'd_1 = (EF)']);
		toolbox.select('intersection');

		toolbox.click(0, 2, null, 0, near('c'));
		toolbox.click(0, 5, null, 0, near('d_1'));

		expect(written()).toEqual([]);
		expect(toolbox.notice).toBe('c et d_1 ne se coupent pas.');
	});

	it('un clic dans le vide ou sur un point : rien, la consigne reste', () => {
		const { toolbox, written } = bench(FIGURE);
		toolbox.select('intersection');

		toolbox.click(5, 5, null);
		toolbox.click(4, 0, 'B');

		expect(written()).toEqual([]);
		expect(toolbox.chosen).toEqual([]);
		expect(toolbox.notice).toBe('Clique sur une droite, un segment, un cercle ou une courbe.');
	});

	it('le même objet deux fois : refusé', () => {
		const { toolbox, written } = bench(FIGURE);
		toolbox.select('intersection');

		toolbox.click(0, 2, null, 0, near('c'));
		toolbox.click(0, -2, null, 0, near('c'));

		expect(written()).toEqual([]);
		expect(toolbox.notice).toBe('Choisis un autre objet que c.');
	});
});

describe('Point sur un objet', () => {
	it('un clic sur l’objet : le point_sur, à la position du clic', () => {
		const { toolbox, written } = bench(FIGURE);
		toolbox.select('point-sur');

		toolbox.click(-2, 0.05, null, 0, near('d'));

		expect(written()).toEqual(['C = point_sur(d ; 0,25)']);
	});

	it('à la rencontre de deux objets : un point_sur du plus proche, pas une intersection', () => {
		const { toolbox, written } = bench(FIGURE);
		toolbox.select('point-sur');

		toolbox.click(2, 0.05, null, 0, near('d', 'c'));

		expect(written()).toEqual(['C = point_sur(d ; 0,75)']);
	});

	it('dans le vide : rien, la boîte dit quoi viser', () => {
		const { toolbox, written } = bench(FIGURE);
		toolbox.select('point-sur');

		toolbox.click(5, 5, null);

		expect(written()).toEqual([]);
		expect(toolbox.notice).toBe('Clique sur une droite, un segment, un cercle ou une courbe.');
	});
});

describe('Parallèle et Perpendiculaire', () => {
	const LINE = ['A = (0 ; 0)', 'B = (4 ; 0)', 'd = (AB)', 'C = (1 ; 3)'];

	it('la droite, puis le point : d_1 = parallele(C ; d)', () => {
		const { atelier, toolbox, written } = bench(LINE);
		toolbox.select('parallele');

		expect(toolbox.instruction).toBe('Clique sur une droite, un segment ou une demi-droite.');
		toolbox.click(2, 0.05, null, 0, near('d'));
		expect(toolbox.instruction).toBe('Clique sur le point par lequel passe la parallèle.');
		toolbox.click(1, 3, 'C');

		expect(written()).toEqual(['d_1 = parallele(C ; d)']);
		expect(atelier.get('d_1')?.status).toBe('ok');
	});

	it('le point d’abord, puis la droite : même ligne', () => {
		const { toolbox, written } = bench(LINE);
		toolbox.select('perpendiculaire');

		toolbox.click(1, 3, 'C');
		expect(toolbox.instruction).toBe('Clique sur la droite à laquelle elle est perpendiculaire.');
		toolbox.click(3, 0.05, null, 0, near('d'));

		expect(written()).toEqual(['d_1 = perpendiculaire(C ; d)']);
	});

	it('un segment sert de direction ; le point se pose dans le vide', () => {
		const { toolbox, written } = bench(['A = (0 ; 0)', 'B = (4 ; 0)', 'd = [AB]']);
		toolbox.select('perpendiculaire');

		toolbox.click(2, 0.05, null, 0, near('d'));
		toolbox.click(1, 2, null);

		expect(written()).toEqual(['C = (1 ; 2)', 'd_1 = perpendiculaire(C ; d)']);
	});

	it('une droite par équation sert aussi de direction', () => {
		const { atelier, toolbox, written } = bench(['d : y = 2x + 1', 'A = (3 ; 0)']);
		toolbox.select('parallele');

		toolbox.click(0, 1.05, null, 0, near('d'));
		toolbox.click(3, 0, 'A');

		expect(written()).toEqual(['d_1 = parallele(A ; d)']);
		expect(atelier.get('d_1')?.status).toBe('ok');
	});

	it('un cercle ne donne pas de direction : refusé, la boîte le dit', () => {
		const { toolbox, written } = bench([...FIGURE]);
		toolbox.select('parallele');

		toolbox.click(0, 2, null, 0, near('c'));

		expect(written()).toEqual([]);
		expect(toolbox.chosen).toEqual([]);
		expect(toolbox.notice).toBe('Clique sur une droite, un segment ou une demi-droite.');
	});
});

describe('M7 : la construction en cours, quand son objet disparaît', () => {
	it('l’objet choisi d’une intersection annulé : la construction tombe', () => {
		const { atelier, toolbox } = bench(FIGURE);
		toolbox.select('intersection');
		toolbox.click(0, 2, null, 0, near('c'));

		atelier.removeWithDependents('c');
		toolbox.forgetVanished();

		expect(atelier.get('c')).toBeUndefined();
		expect(toolbox.chosen).toEqual([]);
	});
});

describe('Revue de la PR 3', () => {
	it('Intersection, un couple que l’atelier ne sait pas couper : sa raison, pas « ne se coupent pas »', () => {
		const { toolbox, written } = bench(['f(x) = x', 'O = (0 ; 0)', 'c = cercle(O ; 2)']);
		toolbox.select('intersection');

		toolbox.click(0.5, 0.5, null, 0, near('f'));
		toolbox.click(1.41, 1.41, null, 0, near('c'));

		expect(written()).toEqual([]);
		expect(toolbox.notice).toBe(
			'L’intersection d’une fonction et d’un cercle n’est pas encore dans l’atelier.'
		);
	});

	it('Intersection, deux droites confondues : une infinité de points communs', () => {
		const { toolbox } = bench([
			'A = (0 ; 0)',
			'B = (1 ; 1)',
			'C = (2 ; 2)',
			'd = (AB)',
			'd_1 = (BC)'
		]);
		toolbox.select('intersection');

		toolbox.click(3, 3, null, 0, near('d'));
		toolbox.click(-1, -1, null, 0, near('d_1'));

		expect(toolbox.notice).toBe('d et d_1 ont une infinité de points communs.');
	});

	it('point_sur d’une droite longue : assez de décimales pour retomber sous le clic', () => {
		const { atelier, toolbox, written } = bench(['A = (0 ; 0)', 'B = (10 ; 0)', 'd = (AB)']);
		toolbox.select('point');

		toolbox.click(3.4, 0.02, null, 0, near('d'));

		expect(written()).toEqual(['C = point_sur(d ; 0,34)']);
		expect(positionOf(atelier, 'C')?.[0]).toBeCloseTo(3.4);
	});

	it('point_sur d’une courbe raide : l’abscisse au centième, le point sous le clic', () => {
		const { toolbox, written } = bench(['f(x) = x^3']);
		toolbox.select('point');

		toolbox.click(3.04, 28.09, null, 0, near('f'));

		expect(written()).toEqual(['A = point_sur(f ; 3,04)']);
	});

	it('Parallèle : la droite choisie devenue un cercle — la construction tombe', () => {
		const { atelier, toolbox, written } = bench(['A = (0 ; 0)', 'B = (4 ; 0)', 'd = (AB)']);
		toolbox.select('parallele');
		toolbox.click(2, 0.05, null, 0, near('d'));

		atelier.update('d', 'cercle(A ; 2)', 'text');
		toolbox.forgetVanished();

		expect(toolbox.chosen).toEqual([]);
		toolbox.click(5, 5, null);
		expect(written()).toEqual([]);
	});

	it('Milieu : un clic sur un cercle tout près d’un segment vise le cercle, pas le segment', () => {
		const { toolbox, written } = bench(FIGURE);
		toolbox.select('milieu');

		toolbox.click(0, 2, null, 0, { objects: ['c', 'd'], radius: 2.5 });

		expect(written()).toEqual(['C = point_sur(c ; 90)']);
	});
});
