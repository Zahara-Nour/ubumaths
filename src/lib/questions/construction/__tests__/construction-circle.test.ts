/**
 * Juge d'une case « figure » : construire un cercle circonscrit
 * (`verifier: cercle c = cercle_circonscrit(A, B, C)`, chantier `controles-figure`,
 * lot 3b, phase 0 validée par David le 2026-11-02,
 * `docs/archive/wip/controles-figure-progress.md` § 11).
 *
 * L'élève trace avec la règle, l'équerre et le compas, sur papier uni ; un des cercles
 * tracés doit être le cercle attendu, son centre et son point de passage construits
 * (les autres traits sont de construction). Figures écrites comme le prof les écrit,
 * positions par le vrai registre ; intersections calculées par les instruments (ce
 * que l'aimantation donne à l'élève).
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { ConstructionAuthorError, assertConstructionChecks, judgeConstruction } from '../judge';
import {
	CIRCLE_EYEBALLED_FEEDBACK,
	CIRCLE_GOOD_CENTER_FEEDBACK,
	CIRCLE_THROUGH_EYEBALLED_FEEDBACK,
	circumcircleMissingFeedback,
	notCircumcircleFeedback,
	twoVerticesFeedback
} from '../circle';
import { POINT_EYEBALLED_FEEDBACK } from '../point';
import { intersectTraits, traitOf, type Trait } from '../instruments';
import { solutionCircles, solutionLines } from '../drawing';
import { serializeConstructionAnswer, type DrawnObject } from '../answer';
import type { Position } from '../judge';
import { readConstructionHeader } from '$lib/ubumark/parser/construction-parser';

function checksOf(source: string) {
	const { spec, errors } = readConstructionHeader(source);
	expect(errors).toEqual([]);
	return spec.checks;
}

function judge(source: string, objects: DrawnObject[] | string) {
	const answer = typeof objects === 'string' ? objects : serializeConstructionAnswer(objects);
	return judgeConstruction(
		checksOf(source),
		constructionPositions(source),
		answer,
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

function figure(
	verifier: string | string[],
	body: string[],
	header: string[] = [],
	window = '0 ; 10 ; 0 ; 8'
): string {
	const checks = Array.isArray(verifier) ? verifier : [verifier];
	return [
		`fenetre: ${window}`,
		...header,
		...checks.map((c) => `verifier: ${c}`),
		'---',
		...body
	].join('\n');
}

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

/** Intersections de deux objets tracés, comme l'aimantation les donne (triées par y) */
function cross(p: DrawnObject, q: DrawnObject): Position[] {
	return intersectTraits(traitOf(p) as Trait, traitOf(q) as Trait).sort((u, v) => u.y - v.y);
}

/** Médiatrice de [PQ] au compas (rayon PQ) et à la règle : les deux arcs et la droite */
function mediatrice(p: Position, q: Position): { arcs: DrawnObject[]; line: DrawnObject } {
	const arcs = [cercle(p, q), cercle(q, p)];
	const [low, high] = cross(arcs[0], arcs[1]);
	return { arcs, line: droite(low, high) };
}

// Triangle A(3 ; 4), B(7 ; 4), C(4 ; 7) : centre (5 ; 5), rayon √5 ; médiatrices de
// [AB] et [AC] constructibles dans 0..10 × 0..8, celle de [BC] non
const A = { x: 3, y: 4 };
const B = { x: 7, y: 4 };
const C = { x: 4, y: 7 };
const CENTER = { x: 5, y: 5 };
const BODY = ['A = point(3, 4)', 'B = point(7, 4)', 'C = point(4, 7)', 't = triangle(A, B, C)'];
const CIRCONSCRIT = figure('cercle c = cercle_circonscrit(A, B, C)', BODY);

const M_AB = mediatrice(A, B);
const M_AC = mediatrice(A, C);
const O = cross(M_AB.line, M_AC.line)[0];
const CONSTRUCTION = [...M_AB.arcs, M_AB.line, ...M_AC.arcs, M_AC.line];

describe('vérification cercle : lecture de l’en-tête', () => {
	it('lit le nom et l’expression ; palette déduite Règle · Équerre · Compas · Report (lot 9)', () => {
		const { spec, errors } = readConstructionHeader(CIRCONSCRIT);
		expect(errors).toEqual([]);
		expect(spec.checks).toEqual([
			{ kind: 'cercle', name: 'c', expression: 'cercle_circonscrit(A, B, C)', line: 2 }
		]);
		expect(spec.tools).toEqual(['droite', 'equerre', 'compas', 'report']);
	});

	it('quadrillage refusé (décision 2)', () => {
		const source = figure('cercle c = cercle_circonscrit(A, B, C)', BODY, ['grille: 1']);
		expect(readConstructionHeader(source).errors[0]?.message).toMatch(/papier uni/);
	});

	it('refuse de mêler un cercle à d’autres vérifications', () => {
		const source = figure(
			['cercle c = cercle_circonscrit(A, B, C)', 'droite m = mediatrice(A, B)'],
			BODY
		);
		expect(readConstructionHeader(source).errors[0]?.message).toMatch(/ne se mêle pas/);
	});

	it('refuse un point ou un segment dans la palette', () => {
		const source = figure('cercle c = cercle_circonscrit(A, B, C)', BODY, [
			'outils: compas, point'
		]);
		expect(readConstructionHeader(source).errors[0]?.message).toMatch(/hors de la palette/);
	});

	it('refuse deux cercles du même nom', () => {
		const source = figure(
			['cercle c = cercle_circonscrit(A, B, C)', 'cercle c = cercle_circonscrit(A, B, C)'],
			BODY
		);
		expect(readConstructionHeader(source).errors[0]?.message).toMatch(/deux cercles nommés c/);
	});
});

describe('vérification cercle : cercle circonscrit construit', () => {
	it('le centre construit est bien (5 ; 5)', () => {
		expect(O.x).toBeCloseTo(CENTER.x);
		expect(O.y).toBeCloseTo(CENTER.y);
	});

	it('nominal : deux médiatrices, compas à leur intersection par A → juste', () => {
		expect(judge(CIRCONSCRIT, [...CONSTRUCTION, cercle(O, A)])).toEqual({ status: 'correct' });
	});

	it('par B ou par C plutôt que par A → juste', () => {
		expect(judge(CIRCONSCRIT, [...CONSTRUCTION, cercle(O, B)])).toEqual({ status: 'correct' });
		expect(judge(CIRCONSCRIT, [...CONSTRUCTION, cercle(O, C)])).toEqual({ status: 'correct' });
	});

	it('traits en trop et cercle repassé ignorés', () => {
		const extra = cercle(A, C);
		expect(judge(CIRCONSCRIT, [...CONSTRUCTION, extra, cercle(O, A), cercle(O, B)])).toEqual({
			status: 'correct'
		});
	});

	it('coordonnées non entières : chaque paire de médiatrices, chaque sommet → juste (revue)', () => {
		const [a, b, c] = [
			{ x: 3.3, y: 4.1 },
			{ x: 6.8, y: 3.9 },
			{ x: 4.4, y: 6.7 }
		];
		const source = figure('cercle c = cercle_circonscrit(A, B, C)', [
			'A = point(3.3, 4.1)',
			'B = point(6.8, 3.9)',
			'C = point(4.4, 6.7)',
			't = triangle(A, B, C)'
		]);
		expect(() => assertChecks(source)).not.toThrow();
		const sides: [Position, Position][] = [
			[a, b],
			[a, c],
			[b, c]
		];
		const built = sides.map(([p, q]) => mediatrice(p, q));
		for (const [i, j] of [
			[0, 1],
			[0, 2],
			[1, 2]
		]) {
			const pair = [built[i], built[j]];
			const [center] = cross(pair[0].line, pair[1].line);
			const traits = pair.flatMap((m) => [...m.arcs, m.line]);
			for (const through of [a, b, c]) {
				expect(judge(source, [...traits, cercle(center, through)])).toEqual({ status: 'correct' });
			}
		}
	});

	it('triangle rectangle : centre = médiatrice ∩ hypoténuse → juste', () => {
		// A(3 ; 4), B(7 ; 4), C(3 ; 7) : rectangle en A, centre (5 ; 5,5), rayon 2,5
		const source = figure('cercle c = cercle_circonscrit(A, B, C)', [
			'A = point(3, 4)',
			'B = point(7, 4)',
			'C = point(3, 7)',
			't = triangle(A, B, C)'
		]);
		const m = mediatrice(A, B);
		const hypotenuse = traitOf(droite(B, { x: 3, y: 7 })) as Trait;
		const [center] = intersectTraits(traitOf(m.line) as Trait, hypotenuse);
		expect(center.y).toBeCloseTo(5.5);
		expect(judge(source, [...m.arcs, m.line, cercle(center, A)])).toEqual({ status: 'correct' });
	});

	it('cercle tracé à l’œil, même pile sur le cercle circonscrit → faux', () => {
		expect(judge(CIRCONSCRIT, [cercle(CENTER, A)])).toEqual({
			status: 'incorrect',
			feedback: CIRCLE_EYEBALLED_FEEDBACK
		});
	});

	it('rien que des traits de construction → il manque le cercle', () => {
		expect(judge(CIRCONSCRIT, CONSTRUCTION)).toEqual({
			status: 'incorrect',
			feedback: circumcircleMissingFeedback(['A', 'B', 'C'])
		});
	});

	it('rien tracé → vide', () => {
		expect(judge(CIRCONSCRIT, '')).toEqual({ status: 'empty' });
	});

	it('un point ou un segment dans la réponse (sans leur outil) → faux', () => {
		expect(judge(CIRCONSCRIT, [...CONSTRUCTION, cercle(O, A), point(O)]).status).toBe('incorrect');
		expect(judge(CIRCONSCRIT, 'segment(4;0;4;8)').status).toBe('incorrect');
	});
});

describe('vérification cercle : message du cercle essayé', () => {
	it('bon centre, rayon faux (par une intersection d’arcs)', () => {
		const [, top] = cross(M_AB.arcs[0], M_AB.arcs[1]);
		expect(judge(CIRCONSCRIT, [...CONSTRUCTION, cercle(O, top)])).toEqual({
			status: 'incorrect',
			feedback: CIRCLE_GOOD_CENTER_FEEDBACK
		});
	});

	it('bon centre construit, compas ouvert à l’œil → bon centre (revue)', () => {
		for (const through of [
			{ x: 3.02, y: 4.01 },
			{ x: 6.3, y: 1.2 }
		]) {
			expect(judge(CIRCONSCRIT, [...CONSTRUCTION, cercle(O, through)])).toEqual({
				status: 'incorrect',
				feedback: CIRCLE_GOOD_CENTER_FEEDBACK
			});
		}
	});

	it('bon centre construit, compas ouvert à l’œil pile au bon rayon → compas à l’œil', () => {
		// (4 ; 3), toucher libre aux coordonnées rondes : à √5 du centre (5 ; 5), sur le cercle
		expect(judge(CIRCONSCRIT, [...CONSTRUCTION, cercle(O, { x: 4, y: 3 })])).toEqual({
			status: 'incorrect',
			feedback: CIRCLE_THROUGH_EYEBALLED_FEEDBACK
		});
	});

	it('centre sur la médiatrice de [AB] seulement : passe par A et B, pas par C', () => {
		const [bottom] = cross(M_AB.arcs[0], M_AB.arcs[1]);
		expect(judge(CIRCONSCRIT, [...CONSTRUCTION, cercle(bottom, A)])).toEqual({
			status: 'incorrect',
			feedback: twoVerticesFeedback(['A', 'B'], 'C')
		});
	});

	it('sinon : ce n’est pas le cercle circonscrit', () => {
		// Centre au milieu de [AB] (médiatrice ∩ côté), par C : un seul sommet
		const side = traitOf(droite(A, B)) as Trait;
		const [middle] = intersectTraits(traitOf(M_AB.line) as Trait, side);
		expect(judge(CIRCONSCRIT, [...CONSTRUCTION, cercle(middle, C)])).toEqual({
			status: 'incorrect',
			feedback: notCircumcircleFeedback(['A', 'B', 'C'])
		});
	});

	it('un arc de construction centré sur un sommet n’est pas l’essai', () => {
		// Seuls les arcs (centrés en A, B, C) : il manque le cercle, pas « passe par… »
		expect(judge(CIRCONSCRIT, [...M_AB.arcs, ...M_AC.arcs])).toEqual({
			status: 'incorrect',
			feedback: circumcircleMissingFeedback(['A', 'B', 'C'])
		});
	});
});

describe('vérification cercle : erreurs d’auteur', () => {
	it('figure faisable : rien à signaler', () => {
		expect(() => assertChecks(CIRCONSCRIT)).not.toThrow();
	});

	it('expression qui n’est pas un cercle', () => {
		const source = figure('cercle c = milieu(A, B)', BODY);
		expect(() => assertChecks(source)).toThrow(ConstructionAuthorError);
		expect(() => assertChecks(source)).toThrow(/ne donne pas un cercle/);
	});

	it('autre cercle qu’un cercle circonscrit', () => {
		const source = figure('cercle c = cercle(A, 2)', BODY);
		expect(() => assertChecks(source)).toThrow(/seulement un cercle circonscrit/);
	});

	it('sommets alignés', () => {
		const source = figure('cercle c = cercle_circonscrit(A, B, C)', [
			'A = point(2, 4)',
			'B = point(5, 4)',
			'C = point(8, 4)'
		]);
		expect(() => assertChecks(source)).toThrow(ConstructionAuthorError);
	});

	it('sommet invisible : l’élève ne peut pas y piquer le compas', () => {
		const source = figure('cercle c = cercle_circonscrit(A, B, C)', [
			'A = point(3, 4, visible=faux)',
			'B = point(7, 4)',
			'C = point(4, 7)'
		]);
		expect(() => assertChecks(source)).toThrow(/A n’est pas visible/);
	});

	it('cercle qui sort de la fenêtre (décision 3)', () => {
		const source = figure('cercle c = cercle_circonscrit(A, B, C)', BODY, [], '0 ; 10 ; 0 ; 7');
		expect(() => assertChecks(source)).toThrow(/sort de la fenêtre/);
	});

	it('centre hors de la fenêtre', () => {
		// Triangle très obtus : centre (5 ; −6)
		const source = figure(
			'cercle c = cercle_circonscrit(A, B, C)',
			['A = point(1, 1)', 'B = point(9, 1)', 'C = point(5, 2)'],
			[],
			'0 ; 10 ; 0 ; 8'
		);
		expect(() => assertChecks(source)).toThrow(/centre du cercle est hors de la fenêtre/);
	});

	it('le cercle lui-même au Report (écartement de O à A, piqué en O) → juste (lot 9, revue)', () => {
		const report: DrawnObject = {
			kind: 'report',
			cx: O.x,
			cy: O.y,
			ax: O.x,
			ay: O.y,
			bx: A.x,
			by: A.y
		};
		expect(judge(CIRCONSCRIT, [...CONSTRUCTION, report])).toEqual({ status: 'correct' });
	});

	it('le cercle au Report, écartement pris à l’œil pile au bon rayon → compas ouvert à l’œil (lot 9)', () => {
		const r = Math.hypot(A.x - O.x, A.y - O.y);
		const report: DrawnObject = {
			kind: 'report',
			cx: O.x,
			cy: O.y,
			ax: 0.5,
			ay: 0.5,
			bx: 0.5 + r,
			by: 0.5
		};
		expect(judge(CIRCONSCRIT, [...CONSTRUCTION, report])).toEqual({
			status: 'incorrect',
			feedback: CIRCLE_THROUGH_EYEBALLED_FEEDBACK
		});
	});

	it('médiatrices au Report (un écartement gardé), puis le cercle au compas → juste (lot 9)', () => {
		// Écartement 3 pris à la main, piqué en A, B puis C : les arcs de [AB] et [AC]
		const report = (center: Position): DrawnObject => ({
			kind: 'report',
			cx: center.x,
			cy: center.y,
			ax: 1,
			ay: 1,
			bx: 4,
			by: 1
		});
		const [rA, rB, rC] = [A, B, C].map(report);
		const [p1, p2] = cross(rA, rB);
		const [q1, q2] = cross(rA, rC);
		const mAB = droite(p1, p2);
		const mAC = droite(q1, q2);
		const center = cross(mAB, mAC)[0];
		expect(judge(CIRCONSCRIT, [rA, rB, rC, mAB, mAC, cercle(center, A)])).toEqual({
			status: 'correct'
		});
	});

	it('arcs de rayon un côté hors de la fenêtre : admis (lot 9, § 25)', () => {
		// Presque équilatéral, rayon 3,9 : les arcs de rayon un côté se coupent hors de la
		// fenêtre, mais des cercles égaux plus petits se coupent dedans (exception 2 du § 15)
		const source = figure('cercle c = cercle_circonscrit(A, B, C)', [
			'A = point(1.623, 2.05)',
			'B = point(8.377, 2.05)',
			'C = point(5, 7.9)'
		]);
		expect(() => assertChecks(source)).not.toThrow();
	});

	it('centre déjà nommé dans la figure : rien à construire (revue)', () => {
		const source = figure('cercle c = cercle_circonscrit(A, B, C)', [...BODY, 'O = point(5, 5)']);
		expect(() => assertChecks(source)).toThrow(ConstructionAuthorError);
		expect(() => assertChecks(source)).toThrow(/déjà dans la figure \(au même endroit que O\)/);
	});

	it('deux vérifications pour le même cercle', () => {
		const source = figure(
			['cercle c = cercle_circonscrit(A, B, C)', 'cercle d = cercle_circonscrit(B, C, A)'],
			BODY
		);
		expect(() => assertChecks(source)).toThrow(/c et d sont le même cercle/);
	});
});

describe('centre du cercle circonscrit seul (décision 1)', () => {
	const CENTRE = figure('point O = centre(cercle_circonscrit(A, B, C))', BODY);

	it('n’est pas refusé sans quadrillage', () => {
		expect(() => assertChecks(CENTRE)).not.toThrow();
	});

	it('deux médiatrices, point à leur intersection → juste', () => {
		expect(judge(CENTRE, [...CONSTRUCTION, point(O)])).toEqual({ status: 'correct' });
	});

	it('point posé à l’œil pile au centre → faux', () => {
		expect(judge(CENTRE, [point(CENTER)])).toEqual({
			status: 'incorrect',
			feedback: POINT_EYEBALLED_FEEDBACK
		});
	});

	it('arcs de rayon un côté hors de la fenêtre : admis (lot 9, § 25)', () => {
		// Même triangle que pour le cercle : les médiatrices passent par le centre, dans la fenêtre
		const source = figure('point O = centre(cercle_circonscrit(A, B, C))', [
			'A = point(1.623, 2.05)',
			'B = point(8.377, 2.05)',
			'C = point(5, 7.9)'
		]);
		expect(() => assertChecks(source)).not.toThrow();
	});
});

describe('correction du cercle circonscrit (décision 4)', () => {
	it('le cercle, son centre et les médiatrices de [AB] et [AC]', () => {
		const checks = checksOf(CIRCONSCRIT);
		const points = constructionPositions(CIRCONSCRIT);
		const expected = constructionExpected(CIRCONSCRIT);
		expect(solutionLines(checks, points, [], constructionShapes(CIRCONSCRIT), expected)).toEqual(
			[]
		);
		const [solution, ...rest] = solutionCircles(
			checks,
			expected,
			points,
			constructionShapes(CIRCONSCRIT)
		);
		expect(rest).toEqual([]);
		expect(solution.name).toBe('c');
		expect(solution.center.x).toBeCloseTo(5);
		expect(solution.center.y).toBeCloseTo(5);
		expect(solution.radius).toBeCloseTo(Math.sqrt(5));
		expect(solution.mediatrices).toHaveLength(2);
		const [ab, ac] = solution.mediatrices;
		// Médiatrice de [AB] : x = 5 ; de [AC] : par (3,5 ; 5,5), direction (−3 ; 1)
		expect(ab.kind === 'droite' && ab.x1).toBeCloseTo(5);
		expect(ab.kind === 'droite' && ab.x2).toBeCloseTo(5);
		expect(ac.kind === 'droite' && [ac.x1, ac.y1]).toEqual([3.5, 5.5]);
	});
});
