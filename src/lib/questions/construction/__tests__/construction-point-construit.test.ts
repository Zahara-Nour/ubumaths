/**
 * Point construit, de proche en proche (chantier `controles-figure`, décision de
 * David du 2026-11-03, `docs/wip/controles-figure-progress.md` § 14 et § 15).
 *
 * Sur papier uni, un point ne compte que s'il est un point de la figure ou
 * l'intersection de deux traits EUX-MÊMES construits : droite par deux points
 * construits (ou à l'équerre le long d'un trait construit), cercle de centre et
 * de point de passage construits, report de centre et d'écartement construits.
 * Deux droites tracées à l'œil ne construisent plus rien, pour tous les juges.
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { judgeConstruction, type Position } from '../judge';
import { POINT_EYEBALLED_FEEDBACK } from '../point';
import { LINE_EYEBALLED_FEEDBACK } from '../line';
import { CIRCLE_EYEBALLED_FEEDBACK } from '../circle';
import { constructionOf, intersectTraits, traitOf, type Trait } from '../instruments';
import { serializeConstructionAnswer, type DrawnObject } from '../answer';
import { readConstructionHeader } from '$lib/ubumark/parser/construction-parser';

function judge(source: string, objects: DrawnObject[]) {
	const { spec, errors } = readConstructionHeader(source);
	expect(errors).toEqual([]);
	return judgeConstruction(
		spec.checks,
		constructionPositions(source),
		serializeConstructionAnswer(objects),
		constructionShapes(source),
		constructionExpected(source)
	);
}

const figure = (verifier: string, body: string[]) =>
	['fenetre: 0 ; 10 ; 0 ; 8', `verifier: ${verifier}`, '---', ...body].join('\n');

const droite = (p: Position, q: Position): DrawnObject => ({
	kind: 'droite',
	x1: p.x,
	y1: p.y,
	x2: q.x,
	y2: q.y
});
const cercle = (center: Position, through: Position): DrawnObject => ({
	kind: 'cercle',
	cx: center.x,
	cy: center.y,
	x: through.x,
	y: through.y
});
const point = (p: Position): DrawnObject => ({ kind: 'point', x: p.x, y: p.y });

const cross = (p: DrawnObject, q: DrawnObject) =>
	intersectTraits(traitOf(p) as Trait, traitOf(q) as Trait).sort((u, v) => u.y - v.y);

// [AB] horizontal, A(2 ; 4), B(6 ; 4) : médiatrice x = 4, milieu (4 ; 4)
const A = { x: 2, y: 4 };
const B = { x: 6, y: 4 };
const AB_BODY = ['A = point(2, 4)', 'B = point(6, 4)', 's = segment(A, B)'];

// Compas ouvert à l'œil (rayon 3, sur un toucher libre), même rayon en A et en B
const LOOSE_ARCS = [cercle(A, { x: 2, y: 7 }), cercle(B, { x: 6, y: 7 })];
const [LOOSE_LOW, LOOSE_HIGH] = cross(LOOSE_ARCS[0], LOOSE_ARCS[1]);

describe('point construit : des traits à l’œil ne construisent rien', () => {
	it('4e sommet forgé avec deux droites libres → à l’œil (revue du lot 4)', () => {
		const source = figure('point D = sommet(parallelogramme(A, B, C), 4)', [
			'A = point(2, 2)',
			'B = point(7, 2)',
			'C = point(8, 6)'
		]);
		const lines = [droite({ x: 0, y: 6 }, { x: 10, y: 6 }), droite({ x: 3, y: 0 }, { x: 3, y: 8 })];
		expect(judge(source, [...lines, point({ x: 3, y: 6 })])).toEqual({
			status: 'incorrect',
			feedback: POINT_EYEBALLED_FEEDBACK
		});
	});

	it('milieu à l’intersection de [AB] et d’une droite libre → à l’œil', () => {
		const source = figure('point I = milieu(A, B)', AB_BODY);
		const objects = [droite({ x: 4, y: 1 }, { x: 4, y: 7 }), point({ x: 4, y: 4 })];
		expect(judge(source, objects)).toEqual({
			status: 'incorrect',
			feedback: POINT_EYEBALLED_FEEDBACK
		});
	});

	it('médiatrice par deux intersections de droites libres → à l’œil', () => {
		const source = figure('droite m = mediatrice(A, B)', AB_BODY);
		// (4 ; 1) et (4 ; 7), chacun au croisement de deux droites libres
		const loose = [
			droite({ x: 0, y: 1 }, { x: 10, y: 1 }),
			droite({ x: 3, y: 0 }, { x: 5, y: 2 }),
			droite({ x: 0, y: 7 }, { x: 10, y: 7 }),
			droite({ x: 3, y: 8 }, { x: 5, y: 6 })
		];
		expect(judge(source, [...loose, droite({ x: 4, y: 1 }, { x: 4, y: 7 })])).toEqual({
			status: 'incorrect',
			feedback: LINE_EYEBALLED_FEEDBACK
		});
	});

	it('cercle circonscrit centré à l’intersection de deux droites libres → à l’œil', () => {
		// A(3 ; 4), B(7 ; 4), C(4 ; 7) : centre (5 ; 5)
		const source = figure('cercle c = cercle_circonscrit(A, B, C)', [
			'A = point(3, 4)',
			'B = point(7, 4)',
			'C = point(4, 7)',
			't = triangle(A, B, C)'
		]);
		const lines = [droite({ x: 5, y: 0 }, { x: 5, y: 8 }), droite({ x: 0, y: 5 }, { x: 10, y: 5 })];
		expect(judge(source, [...lines, cercle({ x: 5, y: 5 }, { x: 3, y: 4 })])).toEqual({
			status: 'incorrect',
			feedback: CIRCLE_EYEBALLED_FEEDBACK
		});
	});
});

describe('point construit : de proche en proche', () => {
	// Médiatrice construite (rayon AB), puis un cercle centré au milieu par A
	const ARCS = [cercle(A, B), cercle(B, A)];
	const [LOW, HIGH] = cross(ARCS[0], ARCS[1]);
	const MEDIATRICE = droite(LOW, HIGH);
	const MIDDLE = { x: 4, y: 4 };
	const ON_MEDIATRICE = { x: 4, y: 6 };
	const STAGE_2 = cercle(MIDDLE, A);

	it('point à l’intersection d’un trait de 2e étage et de la médiatrice → construit', () => {
		const objects = [...ARCS, MEDIATRICE, STAGE_2];
		const construction = constructionOf(objects, [A, B], [{ kind: 'segment', a: A, b: B }]);
		expect(construction.built).toEqual(new Set([0, 1, 2, 3]));
		expect(construction.isBuilt(ON_MEDIATRICE)).toBe(true);
	});

	it('l’ordre des tracés ne compte pas', () => {
		const objects = [STAGE_2, MEDIATRICE, ...ARCS];
		const construction = constructionOf(objects, [A, B], [{ kind: 'segment', a: A, b: B }]);
		expect(construction.built).toEqual(new Set([0, 1, 2, 3]));
	});

	it('deux traits libres et un cercle centré à leur intersection : rien de construit', () => {
		// Deux droites libres et un cercle centré à leur intersection : aucun n'est construit
		const lines = [droite({ x: 0, y: 1 }, { x: 10, y: 1 }), droite({ x: 1, y: 0 }, { x: 1, y: 8 })];
		const objects = [...lines, cercle({ x: 1, y: 1 }, A)];
		const construction = constructionOf(objects, [A, B], []);
		expect(construction.built).toEqual(new Set());
		expect(construction.isBuilt({ x: 1, y: 1 })).toBe(false);
		expect(construction.isBuilt(A)).toBe(true);
	});
});

describe('point construit : les deux choix libres admis (décision de David, § 15)', () => {
	const SEGMENT: Trait = { kind: 'segment', a: A, b: B };

	it('compas piqué n’importe où sur un trait construit, ouvert sur un point construit → construit', () => {
		// Centre (3,5 ; 4) sur [AB], par A
		const construction = constructionOf([cercle({ x: 3.5, y: 4 }, A)], [A, B], [SEGMENT]);
		expect(construction.built).toEqual(new Set([0]));
	});

	it('compas piqué sur un trait NON construit → rien', () => {
		const loose = droite({ x: 0, y: 1 }, { x: 10, y: 1 });
		const construction = constructionOf([loose, cercle({ x: 3, y: 1 }, A)], [A, B], [SEGMENT]);
		expect(construction.built).toEqual(new Set());
	});

	it('compas piqué sur un trait construit, ouvert sur un toucher libre → rien', () => {
		const construction = constructionOf(
			[cercle({ x: 3.5, y: 4 }, { x: 3.5, y: 7 })],
			[A, B],
			[SEGMENT]
		);
		expect(construction.built).toEqual(new Set());
	});

	it('même rayon libre en A et en B : leurs deux intersections, pas leurs traits', () => {
		const construction = constructionOf(LOOSE_ARCS, [A, B], [SEGMENT]);
		expect(construction.built).toEqual(new Set());
		expect(construction.isBuilt(LOOSE_LOW)).toBe(true);
		expect(construction.isBuilt(LOOSE_HIGH)).toBe(true);
		// Le cercle de centre A et de rayon 3 coupe [AB] en (5 ; 4) : pas construit
		expect(construction.isBuilt({ x: 5, y: 4 })).toBe(false);
	});

	it('même rayon libre, centres libres → rien', () => {
		const arcs = [cercle({ x: 2, y: 1 }, { x: 2, y: 4 }), cercle({ x: 6, y: 1 }, { x: 6, y: 4 })];
		const [low] = cross(arcs[0], arcs[1]);
		expect(constructionOf(arcs, [A, B], [SEGMENT]).isBuilt(low)).toBe(false);
	});

	it('rayons différents, ouverts à l’œil → rien', () => {
		const arcs = [cercle(A, { x: 2, y: 7 }), cercle(B, { x: 6, y: 7.5 })];
		const [low] = cross(arcs[0], arcs[1]);
		expect(constructionOf(arcs, [A, B], [SEGMENT]).isBuilt(low)).toBe(false);
	});
});
