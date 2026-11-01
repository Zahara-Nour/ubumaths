/**
 * Bloc ```courbe — points à placer dans un repère (`placer:`) et titres d'axes
 * (`axes:`) : analyse et calcul pur
 *
 * Spécification validée par David le 2026-11-01 :
 * `docs/wip/points-repere-progress.md` § 3 (lot 1, table des cas).
 */
import { describe, it, expect } from 'vitest';
import { parseCourbeContent } from '../../parser/courbe-parser';
import { buildCourbeScene } from '../../utils/courbe-scene';
import {
	courbeGridSteps,
	gridNodeValues,
	isGridNode,
	isPlacedPointCorrect,
	moveByStep,
	nearestNode,
	placedPointMistake,
	pointAnswer,
	pointText,
	readPointAnswer,
	startNode
} from '../../utils/courbe-placer';
import type { CourbeNode } from '../../types/courbe';

const WINDOW = ['x: -5 ; 5', 'y: -4 ; 4', 'grille: 1'];
const block = (...lines: string[]) => parseCourbeContent(lines.join('\n'));

function spec(node: CourbeNode) {
	expect(node.errors).toEqual([]);
	expect(node.spec).not.toBeNull();
	return node.spec!;
}

function errorsOf(node: CourbeNode): string {
	expect(node.spec).toBeNull();
	return node.errors.map((e) => e.message).join(' | ');
}

describe('placer: — lecture des points', () => {
	it('un point nommé', () => {
		const s = spec(block(...WINDOW, 'placer: A=(2 ; 3)'));
		expect(s.placer).toEqual([{ name: 'A', x: 2, y: 3, line: 4 }]);
	});

	it('plusieurs points, dans l’ordre écrit', () => {
		const s = spec(block(...WINDOW, 'placer: A=(2 ; 3) ; B=(-1 ; 2) ; C=(0 ; -3)'));
		expect(s.placer?.map((t) => [t.name, t.x, t.y])).toEqual([
			['A', 2, 3],
			['B', -1, 2],
			['C', 0, -3]
		]);
	});

	it('un point seul peut rester sans nom', () => {
		const s = spec(block(...WINDOW, 'placer: (2 ; 3)'));
		expect(s.placer).toEqual([{ name: '', x: 2, y: 3, line: 4 }]);
	});

	it('virgule ou point décimal, sur une grille de pas 0,5', () => {
		const comma = spec(block('x: -5 ; 5', 'y: -4 ; 4', 'grille: 0,5', 'placer: A=(1,5 ; -0,5)'));
		expect(comma.placer?.[0]).toMatchObject({ x: 1.5, y: -0.5 });
		const dot = spec(block('x: -5 ; 5', 'y: -4 ; 4', 'grille: 0.5', 'placer: A=(1.5 ; -0.5)'));
		expect(dot.placer?.[0]).toMatchObject({ x: 1.5, y: -0.5 });
	});

	it('variable de template déjà remplacée (`--`, `+-` normalisés)', () => {
		const s = spec(block(...WINDOW, 'placer: A=(0--2 ; 0+-3)'));
		expect(s.placer?.[0]).toMatchObject({ x: 2, y: -3 });
	});

	it('avec une courbe, des points donnés et des asymptotes', () => {
		const s = spec(
			block(...WINDOW, 'f(x) = x/2', 'points: B(2 ; 1)', 'asymptotes: y=0', 'placer: A=(2 ; 3)')
		);
		expect(s.points.map((p) => p.name)).toEqual(['B']);
		expect(s.placer?.map((t) => t.name)).toEqual(['A']);
	});

	it('`case: N` (posée par le générateur) : lue sur le nœud', () => {
		const node = block('case: 4', ...WINDOW, 'placer: A=(2 ; 3)');
		spec(node);
		expect(node.caseIndex).toBe(4);
	});

	it('un repère sans placer: n’a ni cibles ni case', () => {
		const node = block(...WINDOW);
		expect(spec(node).placer).toBeUndefined();
		expect(node.caseIndex).toBeUndefined();
	});
});

describe('placer: — refus au prof', () => {
	it('point hors d’un nœud de la grille', () => {
		expect(errorsOf(block(...WINDOW, 'placer: A=(1,3 ; 2)'))).toMatch(
			/A n['’]est pas sur un nœud de la grille/
		);
	});

	it('pas automatique (sans grille:) : une cible hors nœud est refusée aussi', () => {
		// x: 0 ; 100 en taille moyenne : pas automatique bien plus grand que 1
		const node = block('x: 0 ; 100', 'y: 0 ; 100', 'placer: A=(3 ; 7)');
		expect(errorsOf(node)).toMatch(/A n['’]est pas sur un nœud de la grille/);
	});

	it('cible hors de la fenêtre', () => {
		expect(errorsOf(block(...WINDOW, 'placer: A=(6 ; 2)'))).toMatch(/A.*hors de la fenêtre/);
		expect(errorsOf(block(...WINDOW, 'placer: A=(2 ; -5)'))).toMatch(/A.*hors de la fenêtre/);
	});

	it('sept points : 6 au plus', () => {
		const seven = 'placer: A=(0;0) ; B=(1;0) ; C=(2;0) ; D=(3;0) ; E=(4;0) ; F=(0;1) ; G=(0;2)';
		expect(errorsOf(block(...WINDOW, seven))).toMatch(/6 points au plus/);
	});

	it('nom en double', () => {
		expect(errorsOf(block(...WINDOW, 'placer: A=(1 ; 1) ; A=(2 ; 2)'))).toMatch(
			/A est nommé deux fois/
		);
	});

	it('nom en minuscule, ou de plus d’une lettre', () => {
		expect(errorsOf(block(...WINDOW, 'placer: a=(1 ; 1)'))).toMatch(/une lettre majuscule/);
		expect(errorsOf(block(...WINDOW, 'placer: AB=(1 ; 1)'))).toMatch(/une lettre majuscule/);
	});

	it('point sans nom parmi plusieurs', () => {
		expect(errorsOf(block(...WINDOW, 'placer: A=(1 ; 1) ; (2 ; 2)'))).toMatch(
			/chaque point porte un nom/
		);
	});

	it('nom déjà pris par un point donné', () => {
		expect(errorsOf(block(...WINDOW, 'points: A(1 ; 1)', 'placer: A=(2 ; 3)'))).toMatch(
			/A est déjà un point donné/
		);
	});

	it('point mal écrit, coordonnée illisible, point vide', () => {
		expect(errorsOf(block(...WINDOW, 'placer: A=2 ; 3'))).toMatch(/placer/);
		expect(errorsOf(block(...WINDOW, 'placer: A=(2)'))).toMatch(/deux coordonnées/);
		expect(errorsOf(block(...WINDOW, 'placer: A=(z ; 1)'))).toMatch(/placer/);
		expect(errorsOf(block(...WINDOW, 'placer: A=(1 ; 1) ;'))).toMatch(/point vide/);
		expect(errorsOf(block(...WINDOW, 'placer:'))).toMatch(/placer/);
	});

	it('case: sans placer: est refusée', () => {
		expect(errorsOf(block('case: 0', ...WINDOW))).toMatch(/case: sans objet sans placer:/);
	});

	it('case: illisible', () => {
		expect(errorsOf(block('case: x', ...WINDOW, 'placer: A=(1 ; 1)'))).toMatch(/case/);
	});
});

describe('axes: — titres des axes', () => {
	it('les deux titres', () => {
		const s = spec(block(...WINDOW, 'axes: x = Durée (min) ; y = Température (°C)'));
		expect(s.axisTitles).toEqual({ x: 'Durée (min)', y: 'Température (°C)' });
	});

	it('un seul titre', () => {
		expect(spec(block(...WINDOW, 'axes: y = Masse (kg)')).axisTitles).toEqual({
			x: null,
			y: 'Masse (kg)'
		});
	});

	it('sans axes: : pas de titres', () => {
		expect(spec(block(...WINDOW)).axisTitles).toBeUndefined();
	});

	it('mal écrit : refusé', () => {
		expect(errorsOf(block(...WINDOW, 'axes: Durée'))).toMatch(/axes/);
		expect(errorsOf(block(...WINDOW, 'axes: x = A ; x = B'))).toMatch(/axes/);
		expect(errorsOf(block(...WINDOW, 'axes: z = A'))).toMatch(/axes/);
		expect(errorsOf(block(...WINDOW, 'axes: x ='))).toMatch(/axes/);
	});
});

describe('nœuds de la grille et aimant', () => {
	const s = spec(block('x: -5 ; 5', 'y: -4 ; 4', 'grille: 0,5 ; 2'));

	it('pas de la grille : grille: donnée, sinon le pas automatique de la scène', () => {
		expect(courbeGridSteps(s)).toEqual({ x: 0.5, y: 2 });
		const auto = spec(block('x: -5 ; 5', 'y: -4 ; 4'));
		const scene = buildCourbeScene(auto);
		expect(courbeGridSteps(auto)).toEqual({ x: scene.grid.xStep, y: scene.grid.yStep });
	});

	it('nœuds : multiples du pas dans la fenêtre, comme les lignes de la grille', () => {
		const nodes = gridNodeValues(s);
		expect(nodes.ys).toEqual([-4, -2, 0, 2, 4]);
		expect(nodes.xs).toHaveLength(21);
		expect(nodes).toEqual({ xs: buildCourbeScene(s).grid.xs, ys: buildCourbeScene(s).grid.ys });
	});

	it('isGridNode', () => {
		expect(isGridNode(s, 1.5, -2)).toBe(true);
		expect(isGridNode(s, 1.5, -1)).toBe(false);
		expect(isGridNode(s, 1.3, 2)).toBe(false);
		expect(isGridNode(s, 5.5, 2)).toBe(false);
	});

	it('aimant : le nœud le plus proche, ramené dans la fenêtre', () => {
		expect(nearestNode(s, 1.3, 0.9)).toEqual({ x: 1.5, y: 0 });
		expect(nearestNode(s, 1.2, 1.1)).toEqual({ x: 1, y: 2 });
		expect(nearestNode(s, 9, -9)).toEqual({ x: 5, y: -4 });
		// Pas de -0 : la réponse s'écrirait « -0 »
		expect(Object.is(nearestNode(s, -0.1, -0.2).x, -0)).toBe(false);
	});

	it('fenêtre qui ne part pas d’un multiple du pas : nœuds sur les lignes de la grille', () => {
		const odd = spec(block('x: 0.3 ; 4.7', 'y: -1.5 ; 2.5', 'grille: 1'));
		expect(gridNodeValues(odd)).toEqual({ xs: [1, 2, 3, 4], ys: [-1, 0, 1, 2] });
		expect(nearestNode(odd, 0.3, 2.5)).toEqual({ x: 1, y: 2 });
	});

	it('clavier : un cran de grille sur chaque axe, sans sortir de la fenêtre', () => {
		expect(moveByStep(s, { x: 1.5, y: 0 }, 1, 0)).toEqual({ x: 2, y: 0 });
		expect(moveByStep(s, { x: 1.5, y: 0 }, 0, -1)).toEqual({ x: 1.5, y: -2 });
		expect(moveByStep(s, { x: 5, y: 4 }, 1, 1)).toEqual({ x: 5, y: 4 });
	});

	it('Début : l’origine, ou le coin bas-gauche quand elle est hors de la fenêtre', () => {
		expect(startNode(s)).toEqual({ x: 0, y: 0 });
		const odd = spec(block('x: 0.3 ; 4.7', 'y: -1.5 ; 2.5', 'grille: 1'));
		expect(startNode(odd)).toEqual({ x: 1, y: -1 });
		const far = spec(block('x: 2 ; 8', 'y: 3 ; 9', 'grille: 1'));
		expect(startNode(far)).toEqual({ x: 2, y: 3 });
	});
});

describe('réponse de la case et juge', () => {
	it('réponse : les deux nombres en point décimal, séparés par « ; »', () => {
		expect(pointAnswer(2, 3)).toBe('2;3');
		expect(pointAnswer(1.5, -0.5)).toBe('1.5;-0.5');
		expect(pointAnswer(0.1 + 0.2, -0)).toBe('0.3;0');
	});

	it('lecture de la réponse de l’élève', () => {
		expect(readPointAnswer('1.5;-0.5')).toEqual({ x: 1.5, y: -0.5 });
		expect(readPointAnswer(' 2 ; 3 ')).toEqual({ x: 2, y: 3 });
		expect(readPointAnswer('')).toBeNull();
		expect(readPointAnswer('2')).toBeNull();
		expect(readPointAnswer('2;3;4')).toBeNull();
		expect(readPointAnswer('a;3')).toBeNull();
		expect(readPointAnswer('1e3;2')).toBeNull();
	});

	it('juste sur les nombres exacts', () => {
		expect(isPlacedPointCorrect('2;3', '2;3')).toBe(true);
		expect(isPlacedPointCorrect('3;2', '2;3')).toBe(false);
		expect(isPlacedPointCorrect('1.5;-0.5', '1.5;-0.5')).toBe(true);
		expect(isPlacedPointCorrect('1.50;-0.5', '1.5;-0.5')).toBe(true);
		expect(isPlacedPointCorrect('1.5;-1', '1.5;-0.5')).toBe(false);
		expect(isPlacedPointCorrect('', '2;3')).toBe(false);
		expect(isPlacedPointCorrect('n’importe quoi', '2;3')).toBe(false);
	});

	it('écriture pour l’élève : virgule décimale', () => {
		expect(pointText(3, 2)).toBe('(3 ; 2)');
		expect(pointText(1.5, -0.5)).toBe('(1,5 ; -0,5)');
	});
});

describe('phrases de la correction', () => {
	it('juste : aucune phrase', () => {
		expect(placedPointMistake('A', '2;3', '2;3')).toBeNull();
	});

	it('placé ailleurs', () => {
		expect(placedPointMistake('A', '3;1', '2;3')).toBe('Tu as placé A en (3 ; 1).');
	});

	it('abscisse et ordonnée échangées', () => {
		expect(placedPointMistake('A', '3;2', '2;3')).toBe(
			'Tu as placé A en (3 ; 2) : tu as échangé l’abscisse et l’ordonnée.'
		);
	});

	it('pas placé', () => {
		expect(placedPointMistake('C', '', '0;-3')).toBe('Tu n’as pas placé C.');
	});

	it('point seul sans nom', () => {
		expect(placedPointMistake('', '1;1', '2;3')).toBe('Tu as placé le point en (1 ; 1).');
		expect(placedPointMistake('', '', '2;3')).toBe('Tu n’as rien placé.');
		expect(placedPointMistake('', '3;2', '2;3')).toBe(
			'Tu as placé le point en (3 ; 2) : tu as échangé l’abscisse et l’ordonnée.'
		);
	});

	it('décimaux écrits à la française', () => {
		expect(placedPointMistake('A', '-0.5;1.5', '1.5;-0.5')).toBe(
			'Tu as placé A en (-0,5 ; 1,5) : tu as échangé l’abscisse et l’ordonnée.'
		);
	});
});
