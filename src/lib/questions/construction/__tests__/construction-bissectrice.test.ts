/**
 * Juge d'une case « figure » : construire la bissectrice d'un angle
 * (`verifier: droite d = bissectrice(A, O, B)`, chantier `controles-figure`, lot 9,
 * PR A, phase 0 validée par David le 2026-11-06, `docs/archive/wip/controles-figure-progress.md` § 25).
 *
 * Au compas : arc piqué en O (ouvert à l'œil) qui coupe [OA) en A' et [OB) en B'
 * (exception 4), deux arcs égaux en A' et B' qui se coupent en P, droite (OP). Au
 * rapporteur si le prof l'ajoute à `outils:`, à 1° près. Figures écrites comme le
 * prof les écrit, positions par le vrai registre.
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { ConstructionAuthorError, assertConstructionChecks, judgeConstruction } from '../judge';
import {
	BISSECTRICE_EYEBALLED_FEEDBACK,
	bissectriceMissingFeedback,
	bissectriceNotFromVertexFeedback,
	neighbourAngleFeedback,
	notBissectriceFeedback
} from '../line';
import { constructionOf, intersectTraits, repereAt, traitOf, type Trait } from '../instruments';
import { solutionBissectrices } from '../drawing';
import { serializeConstructionAnswer, type DrawnObject, type DrawnRepere } from '../answer';
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

type P = { x: number; y: number };

const droite = (p: P, q: P): DrawnObject => ({
	kind: 'droite',
	x1: p.x,
	y1: p.y,
	x2: q.x,
	y2: q.y
});
const cercle = (c: P, through: P): DrawnObject => ({
	kind: 'cercle',
	cx: c.x,
	cy: c.y,
	x: through.x,
	y: through.y
});
const report = (c: P, a: P, b: P): DrawnObject => ({
	kind: 'report',
	cx: c.x,
	cy: c.y,
	ax: a.x,
	ay: a.y,
	bx: b.x,
	by: b.y
});
const crossings = (p: DrawnObject, q: DrawnObject) =>
	intersectTraits(traitOf(p) as Trait, traitOf(q) as Trait);

// L'angle de la phase 0 : O(2 ; 2), A(8 ; 3), B(4 ; 7), côtés [OA) et [OB)
const BODY = [
	'O = point(2, 2)',
	'A = point(8, 3)',
	'B = point(4, 7)',
	'x = demidroite(O, A)',
	'y = demidroite(O, B)'
];
function figure(header: string[] = [], body: string[] = BODY, verifier = 'bissectrice(A, O, B)') {
	return [
		'fenetre: 0 ; 10 ; 0 ; 8',
		...header,
		`verifier: droite d = ${verifier}`,
		'---',
		...body
	].join('\n');
}
const BISSECTRICE = figure();

const O = { x: 2, y: 2 };
const A = { x: 8, y: 3 };
const B = { x: 4, y: 7 };
const unit = (p: P) => {
	const d = Math.hypot(p.x - O.x, p.y - O.y);
	return { x: (p.x - O.x) / d, y: (p.y - O.y) / d };
};
const U = unit(A);
const V = unit(B);
const at = (d: P, r: number) => ({ x: O.x + r * d.x, y: O.y + r * d.y });

// Arc en O ouvert à l'œil (rayon 3, toucher libre arrondi) : A' sur [OA), B' sur [OB)
const ARC_O = cercle(O, { x: 5, y: 2 });
const A1 = at(U, 3);
const B1 = at(V, 3);
// Deux arcs de rayon A'B', piqués en A' et B' (compas centre puis point de passage)
const ARC_A1 = cercle(A1, B1);
const ARC_B1 = cercle(B1, A1);
const [P1, P2] = crossings(ARC_A1, ARC_B1);
// P du côté de l'angle (le plus loin de O)
const far = (p: P, q: P) =>
	Math.hypot(p.x - O.x, p.y - O.y) > Math.hypot(q.x - O.x, q.y - O.y) ? p : q;
const P = far(P1, P2);
const BEHIND = P === P1 ? P2 : P1;
const COMPASS = [ARC_O, ARC_A1, ARC_B1];

describe('vérification droite = bissectrice : lecture et erreurs d’auteur', () => {
	it('lit la vérification ; palette déduite celle d’une droite (Règle · Équerre · Compas · Report)', () => {
		const { spec, errors } = readConstructionHeader(BISSECTRICE);
		expect(errors).toEqual([]);
		expect(spec.checks).toEqual([
			{ kind: 'droite', name: 'd', expression: 'bissectrice(A, O, B)', line: 2 }
		]);
		expect(spec.tools).toEqual(['droite', 'equerre', 'compas', 'report']);
		expect(() => assertChecks(BISSECTRICE)).not.toThrow();
	});

	it('le rapporteur est admis dans outils: pour une bissectrice (décision 1)', () => {
		const source = figure(['outils: droite, compas, rapporteur']);
		expect(readConstructionHeader(source).errors).toEqual([]);
		expect(() => assertChecks(source)).not.toThrow();
	});

	it('le rapporteur reste refusé pour une médiatrice', () => {
		const source = [
			'fenetre: 0 ; 10 ; 0 ; 8',
			'outils: droite, compas, rapporteur',
			'verifier: droite m = mediatrice(A, B)',
			'---',
			'A = point(2, 4)',
			'B = point(6, 4)'
		].join('\n');
		expect(readConstructionHeader(source).errors).not.toEqual([]);
	});

	it('quadrillage : refusé', () => {
		expect(() => assertChecks(figure(['grille: 1']))).toThrow(ConstructionAuthorError);
		expect(() => assertChecks(figure(['grille: 1']))).toThrow(/bissectrice.*quadrillage/);
	});

	it('O invisible : refusé', () => {
		const source = figure([], ['O = point(2, 2, visible=faux)', ...BODY.slice(1)]);
		expect(() => assertChecks(source)).toThrow(/O n’est pas visible/);
	});

	it('côtés de l’angle non tracés : refusé, le côté manquant nommé (revue M5)', () => {
		const bare = figure([], ['O = point(2, 2)', 'A = point(8, 3)', 'B = point(4, 7)']);
		expect(() => assertChecks(bare)).toThrow(
			/l’angle AOB doit être tracé : ajouter le côté \[OA\) \(demidroite\(O, A\)\)/
		);
		const onlyA = figure([], [...BODY.slice(0, 3), 'x = demidroite(O, A)']);
		expect(() => assertChecks(onlyA)).toThrow(/ajouter le côté \[OB\) \(demidroite\(O, B\)\)/);
		const onlyB = figure([], [...BODY.slice(0, 3), 'y = demidroite(O, B)']);
		expect(() => assertChecks(onlyB)).toThrow(/ajouter le côté \[OA\) \(demidroite\(O, A\)\)/);
	});

	it('côtés tracés en segments, en droites, par un triangle, ou plus courts que OA : admis', () => {
		const bodies = [
			['segment(O, A)', 'segment(O, B)'],
			['droite(O, A)', 'droite(B, O)'],
			['triangle(O, A, B)'],
			// [OC] avec C entre O et A : l'arc en O, assez petit, le coupe encore
			['C = point(5, 2.5)', 'segment(O, C)', 'segment(O, B)'],
			// Droite portée par d'autres points, alignés avec O et A
			['E = point(14, 4)', 'F = point(-4, 1)', 'droite(E, F)', 'segment(O, B)']
		];
		for (const extra of bodies) {
			expect(() => assertChecks(figure([], [...BODY.slice(0, 3), ...extra]))).not.toThrow();
		}
	});

	it('un trait par O qui part de l’autre côté de A ne compte pas comme le côté [OA)', () => {
		const behind = figure(
			[],
			[...BODY.slice(0, 3), 'C = point(-4, 1)', 'segment(O, C)', 'segment(O, B)']
		);
		expect(() => assertChecks(behind)).toThrow(/ajouter le côté \[OA\)/);
	});

	it('ordre des erreurs : alignés avant côtés non tracés', () => {
		const source = figure([], ['O = point(2, 2)', 'A = point(8, 2)', 'B = point(0, 2)']);
		expect(() => assertChecks(source)).toThrow(/alignés/);
	});

	it('A, O, B alignés : refusé (pas un angle saillant)', () => {
		const source = figure(
			[],
			[
				'O = point(2, 2)',
				'A = point(8, 2)',
				'B = point(0, 2)',
				'x = demidroite(O, A)',
				'y = demidroite(O, B)'
			]
		);
		expect(() => assertChecks(source)).toThrow(/alignés/);
	});

	it('bissectrice qui sort de la fenêtre au bout de moins de 2 unités : refusé', () => {
		// O dans le coin haut-droit, angle ouvert vers l'extérieur
		const source = figure(
			[],
			[
				'O = point(9.5, 7.5)',
				'A = point(9.5, 0)',
				'B = point(0, 7.5)',
				'x = demidroite(O, A)',
				'y = demidroite(O, B)'
			]
		);
		expect(() => assertChecks(source)).not.toThrow();
		const out = figure(
			[],
			[
				'O = point(9, 7)',
				'A = point(10, 8)',
				'B = point(9, 8)',
				'x = demidroite(O, A)',
				'y = demidroite(O, B)'
			]
		);
		expect(() => assertChecks(out)).toThrow(/2 unités dans la fenêtre/);
	});
});

describe('bissectrice au compas : juste', () => {
	it('nominal : arc en O à l’œil, deux arcs égaux en A’ et B’, droite (OP)', () => {
		expect(judge(BISSECTRICE, [...COMPASS, droite(O, P)])).toEqual({ status: 'correct' });
	});

	it('la droite tracée de P vers O (autre sens) → juste', () => {
		expect(judge(BISSECTRICE, [...COMPASS, droite(P, O)])).toEqual({ status: 'correct' });
	});

	it('P de l’autre côté de O (croisement derrière) → juste', () => {
		expect(judge(BISSECTRICE, [...COMPASS, droite(O, BEHIND)])).toEqual({ status: 'correct' });
	});

	it('la droite entière, par les deux croisements → juste', () => {
		expect(judge(BISSECTRICE, [...COMPASS, droite(BEHIND, P)])).toEqual({ status: 'correct' });
	});

	it('arcs pris au Report (écartement OA’), piqués en A’ et B’ → juste (losange)', () => {
		const left = report(A1, O, A1);
		const right = report(B1, O, A1);
		const q = far(...(crossings(left, right) as [P, P]));
		expect(judge(BISSECTRICE, [ARC_O, left, right, droite(O, q)])).toEqual({ status: 'correct' });
	});

	it('traits en trop ignorés (un cercle et une droite de plus)', () => {
		const extra = [cercle(A, { x: 9, y: 3 }), droite(A, B)];
		expect(judge(BISSECTRICE, [...COMPASS, ...extra, droite(O, P)])).toEqual({ status: 'correct' });
	});
});

describe('bissectrice : faux, première cause', () => {
	it('rien de droit → « Trace la bissectrice… »', () => {
		expect(judge(BISSECTRICE, COMPASS)).toEqual({
			status: 'incorrect',
			feedback: bissectriceMissingFeedback('A', 'O', 'B')
		});
		expect(bissectriceMissingFeedback('A', 'O', 'B')).toBe(
			'Trace la bissectrice de l’angle AOB, depuis son sommet O.'
		);
	});

	it('droite hors de l’angle, pas par O → « Trace la bissectrice… »', () => {
		const line = droite({ x: 0, y: 6 }, { x: 1, y: 8 });
		expect(judge(BISSECTRICE, [...COMPASS, line])).toEqual({
			status: 'incorrect',
			feedback: bissectriceMissingFeedback('A', 'O', 'B')
		});
	});

	it('un côté repassé ou prolongé seul → « Trace la bissectrice… » (revue M1)', () => {
		for (const objects of [[droite(O, B)], [ARC_O, droite(O, A)]]) {
			expect(judge(BISSECTRICE, objects)).toEqual({
				status: 'incorrect',
				feedback: bissectriceMissingFeedback('A', 'O', 'B')
			});
		}
	});

	it('droite (A’B’), dans l’angle mais pas par O → « doit partir du sommet O »', () => {
		expect(judge(BISSECTRICE, [...COMPASS, droite(A1, B1)])).toEqual({
			status: 'incorrect',
			feedback: bissectriceNotFromVertexFeedback('O')
		});
		expect(bissectriceNotFromVertexFeedback('O')).toBe('Ta bissectrice doit partir du sommet O.');
	});

	it('droite par O tracée à l’œil (point libre presque sur la bissectrice) → tracée à l’œil', () => {
		const free = { x: Math.round(P.x * 100) / 100, y: Math.round(P.y * 100) / 100 };
		expect(judge(BISSECTRICE, [droite(O, free)])).toEqual({
			status: 'incorrect',
			feedback: BISSECTRICE_EYEBALLED_FEEDBACK
		});
		expect(BISSECTRICE_EYEBALLED_FEEDBACK).toBe(
			'Ta bissectrice est tracée à l’œil : construis-la avec tes instruments.'
		);
	});

	it('arcs piqués sur [OA) et sur le prolongement de [OB) → l’angle voisin', () => {
		// La droite (OB) tracée, l'arc en O la coupe derrière O en B''
		const lineOB = droite(O, B);
		const B2 = at(V, -3);
		const left = report(A1, O, A1);
		const right = report(B2, O, A1);
		const q = far(...(crossings(left, right) as [P, P]));
		expect(judge(BISSECTRICE, [lineOB, ARC_O, left, right, droite(O, q)])).toEqual({
			status: 'incorrect',
			feedback: neighbourAngleFeedback('A', 'O', 'B')
		});
		expect(neighbourAngleFeedback('A', 'O', 'B')).toBe(
			'Ta droite partage l’angle voisin, pas l’angle AOB : pique le compas sur [OA) et [OB).'
		);
	});

	it('droite construite par O, ni bissectrice ni perpendiculaire → les angles ne sont pas égaux', () => {
		// Deux arcs égaux en A' et en un point de [OB) plus loin que B' : croisement hors bissectrice
		const B3 = at(V, 4);
		const left = report(A1, O, A1);
		const right = report(B3, O, A1);
		const arcFar = cercle(O, { x: 6, y: 2 });
		const q = far(...(crossings(left, right) as [P, P]));
		expect(judge(BISSECTRICE, [ARC_O, arcFar, left, right, droite(O, q)])).toEqual({
			status: 'incorrect',
			feedback: notBissectriceFeedback('A', 'O', 'B')
		});
		expect(notBissectriceFeedback('A', 'O', 'B')).toBe(
			'Les deux angles ne sont pas égaux : ce n’est pas la bissectrice de l’angle AOB.'
		);
	});
});

describe('exception 4 : bornée à la bissectrice (constructionOf)', () => {
	const base = [O, A, B];
	const sides: Trait[] = [
		{ kind: 'ray', a: O, b: A },
		{ kind: 'ray', a: O, b: B }
	];
	const near = (p: P, q: P) => Math.hypot(p.x - q.x, p.y - q.y) < 1e-9;

	it('arc à l’œil en O : ses points sur les côtés sont construits, l’arc lui-même non', () => {
		const c = constructionOf([ARC_O], base, sides, { arcsOnSides: true });
		expect(c.isBuilt(A1)).toBe(true);
		expect(c.isBuilt(B1)).toBe(true);
		expect(c.built.has(0)).toBe(false);
	});

	it('sans l’option (autres vérifications) : rien de construit', () => {
		const c = constructionOf([ARC_O], base, sides);
		expect(c.isBuilt(A1)).toBe(false);
	});

	it('seulement sur les traits droits qui passent par le centre', () => {
		// Un trait droit qui ne passe pas par O : ses croisements avec l'arc restent libres
		const other: Trait = { kind: 'line', a: { x: 0, y: 3 }, b: { x: 10, y: 3 } };
		const c = constructionOf([ARC_O], base, [...sides, other], { arcsOnSides: true });
		const [q] = intersectTraits(traitOf(ARC_O) as Trait, other);
		expect(c.isBuilt(q)).toBe(false);
		expect(near(q, A1)).toBe(false);
	});

	it('un cercle piqué en O qui repasse par A’ ne devient pas un trait (rayon pris à l’œil)', () => {
		// Sinon : rayon à l'œil → A' construit → cercle « construit » de ce rayon
		const c = constructionOf([ARC_O, cercle(O, A1)], base, sides, { arcsOnSides: true });
		expect(c.built.has(1)).toBe(false);
		const piqued = constructionOf([ARC_O, report(O, O, A1)], base, sides, { arcsOnSides: true });
		expect(piqued.built.has(1)).toBe(false);
	});

	it('un cercle centré sur un côté, par un point construit plus tard, est construit (ordre libre, revue I1)', () => {
		const c = constructionOf([ARC_O, cercle(A, B1)], base, sides, { arcsOnSides: true });
		expect(c.built.has(1)).toBe(true);
		const late = constructionOf([ARC_O, ARC_A1, ARC_B1, cercle(O, P)], base, sides, {
			arcsOnSides: true
		});
		expect(late.built.has(3)).toBe(true);
	});

	it('l’écartement OA’ reporté ailleurs (en A’) reste un trait construit (le losange)', () => {
		const c = constructionOf([ARC_O, report(A1, O, A1)], base, sides, { arcsOnSides: true });
		expect(c.built.has(1)).toBe(true);
	});
});

describe('bissectrice au rapporteur (outils: droite, compas, rapporteur)', () => {
	const SOURCE = figure(['outils: droite, compas, rapporteur']);
	// Mesure de AOB, en degrés
	const measure = (Math.acos(U.x * V.x + U.y * V.y) * 180) / Math.PI;
	const mark = (deg: number): DrawnRepere => ({
		kind: 'repere',
		vx: O.x,
		vy: O.y,
		ax: A.x,
		ay: A.y,
		r: 2.5,
		deg,
		sens: 1
	});

	it('la mesure de AOB n’est pas entière (le test tient)', () => {
		expect(Math.abs(measure - Math.round(measure))).toBeGreaterThan(0.1);
	});

	it('repère à la moitié arrondie au degré, droite du sommet au repère → juste (1° près)', () => {
		const m = mark(Math.round(measure / 2));
		expect(judge(SOURCE, [m, droite(O, repereAt(m))])).toEqual({ status: 'correct' });
	});

	it('repère 2° plus loin → les angles ne sont pas égaux', () => {
		const m = mark(Math.round(measure / 2) + 2);
		expect(judge(SOURCE, [m, droite(O, repereAt(m))])).toEqual({
			status: 'incorrect',
			feedback: notBissectriceFeedback('A', 'O', 'B')
		});
	});

	it('droite construite au compas, toujours admise à côté du rapporteur', () => {
		expect(judge(SOURCE, [...COMPASS, droite(O, P)])).toEqual({ status: 'correct' });
	});
});

describe('correction de la bissectrice', () => {
	it('les deux demi-angles égaux, l’arc en O et les deux arcs égaux', () => {
		const positions = constructionPositions(BISSECTRICE);
		const [solution] = solutionBissectrices(checksOf(BISSECTRICE), positions);
		expect(solution.center).toEqual(O);
		// Demi-angles : de [OA) à la bissectrice, de la bissectrice à [OB)
		const angle = (p: P, q: P) =>
			Math.acos(
				((p.x - O.x) * (q.x - O.x) + (p.y - O.y) * (q.y - O.y)) /
					(Math.hypot(p.x - O.x, p.y - O.y) * Math.hypot(q.x - O.x, q.y - O.y))
			);
		expect(angle(solution.from, solution.middle)).toBeCloseTo(
			angle(solution.middle, solution.to),
			9
		);
		expect(solution.arcs).toHaveLength(3);
		expect(solution.arcs[0].center).toEqual(O);
		expect(solution.arcs[1].radius).toBeCloseTo(solution.arcs[2].radius, 9);
	});
});
