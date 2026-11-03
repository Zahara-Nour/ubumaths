/**
 * Juge d'une case « figure » : placer le 4e sommet d'un parallélogramme sur papier
 * uni (`verifier: point D = sommet(parallelogramme(A, B, C), 4)`, chantier
 * `controles-figure`, lot 4, phase 0 validée par David le 2026-11-03,
 * `docs/wip/controles-figure-progress.md` § 13).
 *
 * Vérification `point` existante ; trois chemins justes (reports, diagonales,
 * parallèles) ; l'autre intersection des deux reports donne un ABCD croisé.
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { assertConstructionChecks, judgeConstruction } from '../judge';
import { POINT_EYEBALLED_FEEDBACK, crossedParallelogramFeedback } from '../point';
import { intersectTraits, perpendicularThrough, traitOf, type Trait } from '../instruments';
import { serializeConstructionAnswer, type DrawnObject } from '../answer';
import { solutionPoints } from '../drawing';
import type { Position } from '../judge';
import { readConstructionHeader } from '$lib/ubumark/parser/construction-parser';

function checksOf(source: string) {
	const { spec, errors } = readConstructionHeader(source);
	expect(errors).toEqual([]);
	return spec.checks;
}

function judge(source: string, objects: DrawnObject[]) {
	return judgeConstruction(
		checksOf(source),
		constructionPositions(source),
		serializeConstructionAnswer(objects),
		constructionShapes(source),
		constructionExpected(source)
	);
}

function assertChecks(source: string) {
	assertConstructionChecks(
		checksOf(source),
		constructionPositions(source),
		constructionShapes(source),
		constructionExpected(source)
	);
}

const figure = (body: string[]) =>
	[
		'fenetre: 0 ; 10 ; 0 ; 8',
		'verifier: point D = sommet(parallelogramme(A, B, C), 4)',
		'---',
		...body
	].join('\n');

const report = (center: Position, a: Position, b: Position): DrawnObject => ({
	kind: 'report',
	cx: center.x,
	cy: center.y,
	ax: a.x,
	ay: a.y,
	bx: b.x,
	by: b.y
});
const cercle = (center: Position, through: Position): DrawnObject => ({
	kind: 'cercle',
	cx: center.x,
	cy: center.y,
	x: through.x,
	y: through.y
});
const droite = (p: Position, q: Position): DrawnObject => ({
	kind: 'droite',
	x1: p.x,
	y1: p.y,
	x2: q.x,
	y2: q.y
});
const point = (p: Position): DrawnObject => ({ kind: 'point', x: p.x, y: p.y });

function cross(p: DrawnObject, q: DrawnObject): Position[] {
	return intersectTraits(traitOf(p) as Trait, traitOf(q) as Trait);
}

const near = (p: Position, q: Position) => Math.hypot(p.x - q.x, p.y - q.y) < 1e-6;

// A(2 ; 2), B(7 ; 2), C(8 ; 6) : D = A + C − B = (3 ; 6)
const A = { x: 2, y: 2 };
const B = { x: 7, y: 2 };
const C = { x: 8, y: 6 };
const D = { x: 3, y: 6 };
const BODY = [
	'A = point(2, 2)',
	'B = point(7, 2)',
	'C = point(8, 6)',
	's1 = segment(A, B)',
	's2 = segment(B, C)'
];
const SOURCE = figure(BODY);

// Report de BC centré en A, de AB centré en C
const FROM_A = report(A, B, C);
const FROM_C = report(C, A, B);
const CROSSINGS = cross(FROM_A, FROM_C);
const GOOD = CROSSINGS.find((p) => near(p, D)) as Position;
const CROSSED = CROSSINGS.find((p) => !near(p, D)) as Position;

describe('4e sommet : lecture et faisabilité', () => {
	it('papier uni : palette avec le Report', () => {
		const { spec, errors } = readConstructionHeader(SOURCE);
		expect(errors).toEqual([]);
		expect(spec.tools).toEqual(['point', 'droite', 'equerre', 'compas', 'report']);
	});

	it('l’expression se calcule et se construit sur papier uni', () => {
		expect(constructionExpected(SOURCE).positions.get('D')).toEqual(D);
		expect(() => assertChecks(SOURCE)).not.toThrow();
	});

	it('un sommet invisible : erreur d’auteur', () => {
		const source = figure(['A = point(2, 2)', 'B = point(7, 2, visible=faux)', 'C = point(8, 6)']);
		expect(() => assertChecks(source)).toThrow(/B n’est pas visible/);
	});
});

describe('4e sommet : juste', () => {
	it('deux reports, point à l’intersection', () => {
		expect(GOOD).toBeDefined();
		expect(judge(SOURCE, [FROM_A, FROM_C, point(GOOD)])).toEqual({ status: 'correct' });
	});

	it('par les diagonales : milieu de [AC], compas centré au milieu par B, droite (BI)', () => {
		const arcs = [cercle(A, C), cercle(C, A)];
		const [p, q] = cross(arcs[0], arcs[1]);
		const mediatrice = droite(p, q);
		const ac = droite(A, C);
		const middle = cross(mediatrice, ac)[0];
		const diagonal = droite(B, middle);
		const circle = cercle(middle, B);
		const far = cross(diagonal, circle).find((x) => !near(x, B)) as Position;
		const objects = [...arcs, mediatrice, ac, diagonal, circle, point(far)];
		expect(judge(SOURCE, objects)).toEqual({ status: 'correct' });
	});

	it('par les parallèles : équerre deux fois', () => {
		const ab = traitOf(droite(A, B)) as Extract<Trait, { a: Position }>;
		const bc = traitOf(droite(B, C)) as Extract<Trait, { a: Position }>;
		// Parallèle à (AB) par C : perpendiculaire à la perpendiculaire
		const perpAB = perpendicularThrough(ab, C);
		const parallelAB = perpendicularThrough(traitOf(perpAB) as Extract<Trait, { a: Position }>, C);
		const perpBC = perpendicularThrough(bc, A);
		const parallelBC = perpendicularThrough(traitOf(perpBC) as Extract<Trait, { a: Position }>, A);
		const at = cross(parallelAB, parallelBC)[0];
		const objects = [droite(A, B), droite(B, C), perpAB, parallelAB, perpBC, parallelBC, point(at)];
		expect(judge(SOURCE, objects)).toEqual({ status: 'correct' });
	});
});

describe('4e sommet : faux', () => {
	it('l’autre intersection des reports : ABCD croisé', () => {
		expect(judge(SOURCE, [FROM_A, FROM_C, point(CROSSED)])).toEqual({
			status: 'incorrect',
			feedback: crossedParallelogramFeedback('ABCD')
		});
		expect(crossedParallelogramFeedback('ABCD')).toBe(
			'Avec ce point, ABCD est croisé : prends l’autre intersection.'
		);
	});

	it('posé à l’œil pile en D', () => {
		expect(judge(SOURCE, [point(D)])).toEqual({
			status: 'incorrect',
			feedback: POINT_EYEBALLED_FEEDBACK
		});
	});
});

describe('4e sommet : revue du lot 4', () => {
	it('reports d’écartement pris à l’œil : le point n’est pas construit', () => {
		const looseA = report({ x: 3, y: 0.5 }, { x: 0, y: 0 }, { x: 0, y: 5.5 });
		const looseB = report({ x: 0.5, y: 6 }, { x: 0, y: 0 }, { x: 2.5, y: 0 });
		expect(judge(SOURCE, [looseA, looseB, point(D)])).toEqual({
			status: 'incorrect',
			feedback: POINT_EYEBALLED_FEEDBACK
		});
	});

	it('losange (AB = BC) : posé en B, pas « croisé »', () => {
		const source = figure(['A = point(2, 2)', 'B = point(5, 2)', 'C = point(5, 5)']);
		const b = { x: 5, y: 2 };
		const objects = [report({ x: 2, y: 2 }, b, { x: 5, y: 5 }), point(b)];
		const verdict = judge(source, objects);
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).not.toBe(crossedParallelogramFeedback('ABCD'));
	});

	it('correction : D, les côtés [CD] et [DA], côtés opposés codés', () => {
		const [solution] = solutionPoints(
			checksOf(SOURCE),
			constructionExpected(SOURCE),
			constructionPositions(SOURCE)
		);
		expect(solution.at).toEqual(D);
		expect(solution.sides).toEqual([
			[C, D],
			[D, A]
		]);
		expect(solution.marks).toEqual([
			{ from: A, to: B, count: 1 },
			{ from: C, to: D, count: 1 },
			{ from: B, to: C, count: 2 },
			{ from: D, to: A, count: 2 }
		]);
	});
});
