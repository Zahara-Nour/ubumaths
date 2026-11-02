/**
 * Juge d'une case « figure » : construire une droite (`verifier: droite m = mediatrice(A, B)`,
 * chantier `controles-figure`, lot 3, phase 0 validée par David le 2026-11-02,
 * `docs/wip/controles-figure-progress.md` § 9).
 *
 * L'élève trace avec la règle, l'équerre et le compas ; une des droites tracées doit
 * être la droite attendue (les autres traits sont de construction). Sur papier uni,
 * la droite doit être construite (par deux points construits, ou à l'équerre par un
 * point construit). Figures écrites comme le prof les écrit, positions par le vrai
 * registre.
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { ConstructionAuthorError, assertConstructionChecks, judgeConstruction } from '../judge';
import {
	LINE_EYEBALLED_FEEDBACK,
	LINE_NOT_IN_PLACE_FEEDBACK,
	mediatriceMissingFeedback,
	lineMissingFeedback,
	notMediatriceFeedback,
	notMidpointFeedback,
	notPerpendicularToSegmentFeedback
} from '../line';
import { POINT_EYEBALLED_FEEDBACK } from '../point';
import { perpendicularThrough } from '../instruments';
import { solutionLines, solutionCodages } from '../drawing';
import { serializeConstructionAnswer, type DrawnObject } from '../answer';
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

function figure(verifier: string | string[], body: string[], header: string[] = []): string {
	const checks = Array.isArray(verifier) ? verifier : [verifier];
	return [
		'fenetre: 0 ; 10 ; 0 ; 8',
		...header,
		...checks.map((c) => `verifier: ${c}`),
		'---',
		...body
	].join('\n');
}

const droite = (x1: number, y1: number, x2: number, y2: number): DrawnObject => ({
	kind: 'droite',
	x1,
	y1,
	x2,
	y2
});
const cercle = (cx: number, cy: number, x: number, y: number): DrawnObject => ({
	kind: 'cercle',
	cx,
	cy,
	x,
	y
});
const point = (x: number, y: number): DrawnObject => ({ kind: 'point', x, y });

// [AB] horizontal, A(2 ; 4), B(6 ; 4) : médiatrice x = 4, milieu (4 ; 4)
const AB_BODY = ['A = point(2, 4)', 'B = point(6, 4)', 's = segment(A, B)'];
const MEDIATRICE = figure('droite m = mediatrice(A, B)', AB_BODY);
const MEDIATRICE_GRID = figure('droite m = mediatrice(A, B)', AB_BODY, ['grille: 1']);

// Cercles de rayon AB centrés en A et B : intersections (4 ; 4 ± √12), dans la fenêtre
const H = Math.sqrt(12);
const TOP = { x: 4, y: 4 + H };
const BOTTOM = { x: 4, y: 4 - H };
const COMPASS = [cercle(2, 4, 6, 4), cercle(6, 4, 2, 4)];

describe('vérification droite : lecture de l’en-tête', () => {
	it('lit le nom et l’expression ; palette déduite Règle · Équerre · Compas', () => {
		const { spec, errors } = readConstructionHeader(MEDIATRICE);
		expect(errors).toEqual([]);
		expect(spec.checks).toEqual([
			{ kind: 'droite', name: 'm', expression: 'mediatrice(A, B)', line: 2 }
		]);
		expect(spec.tools).toEqual(['droite', 'equerre', 'compas']);
	});

	it('sur quadrillage aussi, la même palette (équerre gardée, décision 2)', () => {
		expect(readConstructionHeader(MEDIATRICE_GRID).spec.tools).toEqual([
			'droite',
			'equerre',
			'compas'
		]);
	});

	it('outils: restreint la palette', () => {
		const source = figure('droite m = mediatrice(A, B)', AB_BODY, ['outils: droite, compas']);
		expect(readConstructionHeader(source).spec.tools).toEqual(['droite', 'compas']);
	});

	it('refuse une écriture sans nom ni expression', () => {
		const { errors } = readConstructionHeader(figure('droite mediatrice(A, B)', AB_BODY));
		expect(errors[0]?.message).toMatch(/droite attend un nom et une expression/);
	});

	it('refuse de mêler une droite à d’autres vérifications', () => {
		const source = figure(['droite m = mediatrice(A, B)', 'point I = milieu(A, B)'], AB_BODY, [
			'outils: droite, equerre, compas, point'
		]);
		expect(readConstructionHeader(source).errors[0]?.message).toMatch(/droite .* ne se mêle pas/);
	});

	it('refuse un point ou un segment dans la palette (réponse jugée forgée, revue)', () => {
		for (const tools of ['droite, equerre, compas, point', 'droite, segment']) {
			const source = figure('droite m = mediatrice(A, B)', AB_BODY, [`outils: ${tools}`]);
			expect(readConstructionHeader(source).errors[0]?.message).toMatch(/hors de la palette/);
		}
	});

	it('refuse deux droites du même nom', () => {
		const source = figure(['droite m = mediatrice(A, B)', 'droite m = mediatrice(A, B)'], AB_BODY);
		expect(readConstructionHeader(source).errors[0]?.message).toMatch(/deux droites nommées m/);
	});
});

describe('vérification droite : médiatrice sur papier uni', () => {
	it('nominal : deux cercles de même rayon, droite par leurs intersections → juste', () => {
		expect(judge(MEDIATRICE, [...COMPASS, droite(TOP.x, TOP.y, BOTTOM.x, BOTTOM.y)])).toEqual({
			status: 'correct'
		});
	});

	it('deux paires de cercles de rayons différents → juste', () => {
		// Rayon 5 : intersections (4 ; 4 ± √21) ; rayon 3 : (4 ; 4 ± √5)
		const big = [cercle(2, 4, 7, 4), cercle(6, 4, 1, 4)];
		const small = [cercle(2, 4, 5, 4), cercle(6, 4, 3, 4)];
		const answer = [...big, ...small, droite(4, 4 + Math.sqrt(21), 4, 4 + Math.sqrt(5))];
		expect(judge(MEDIATRICE, answer)).toEqual({ status: 'correct' });
	});

	it('à l’équerre, perpendiculaire à [AB] par une intersection des cercles → juste', () => {
		const ab = { kind: 'segment' as const, a: { x: 2, y: 4 }, b: { x: 6, y: 4 } };
		expect(judge(MEDIATRICE, [...COMPASS, perpendicularThrough(ab, TOP)])).toEqual({
			status: 'correct'
		});
	});

	it('traits de construction en trop ignorés (décision 1), droite repassée sans effet', () => {
		const answer = [
			...COMPASS,
			droite(2, 4, TOP.x, TOP.y),
			droite(TOP.x, TOP.y, BOTTOM.x, BOTTOM.y),
			droite(BOTTOM.x, BOTTOM.y, TOP.x, TOP.y)
		];
		expect(judge(MEDIATRICE, answer)).toEqual({ status: 'correct' });
	});

	it('droite tracée à l’œil, même pile sur la médiatrice → faux', () => {
		expect(judge(MEDIATRICE, [droite(4, 1, 4, 7)])).toEqual({
			status: 'incorrect',
			feedback: LINE_EYEBALLED_FEEDBACK
		});
	});

	it('à la règle, d’une intersection vers un toucher libre, même perpendiculaire → à l’œil (revue)', () => {
		// Le toucher libre (4 ; 1), arrondi au centième, tombe pile sur la médiatrice
		expect(judge(MEDIATRICE, [...COMPASS, droite(TOP.x, TOP.y, 4, 1)])).toEqual({
			status: 'incorrect',
			feedback: LINE_EYEBALLED_FEEDBACK
		});
	});

	it('une extrémité construite, l’autre libre, pas perpendiculaire → à l’œil', () => {
		expect(judge(MEDIATRICE, [...COMPASS, droite(TOP.x, TOP.y, 5, 1)])).toEqual({
			status: 'incorrect',
			feedback: LINE_EYEBALLED_FEEDBACK
		});
	});

	it('des extrémités « sur un trait » ne la rendent pas construite', () => {
		// (4 ; 4) est sur [AB], pas à l'intersection de deux autres traits
		expect(judge(MEDIATRICE, [cercle(2, 4, 6, 4), droite(TOP.x, TOP.y, 4, 4)])).toEqual({
			status: 'incorrect',
			feedback: LINE_EYEBALLED_FEEDBACK
		});
	});

	it('seulement des cercles → il manque la médiatrice', () => {
		expect(judge(MEDIATRICE, COMPASS)).toEqual({
			status: 'incorrect',
			feedback: mediatriceMissingFeedback('A', 'B')
		});
	});

	it('rien tracé → vide', () => {
		expect(judge(MEDIATRICE, '')).toEqual({ status: 'empty' });
	});

	it('un point ou un segment dans la réponse (sans leur outil) → faux', () => {
		expect(judge(MEDIATRICE, [...COMPASS, point(4, 4)]).status).toBe('incorrect');
		expect(judge(MEDIATRICE, 'segment(4;0;4;8)').status).toBe('incorrect');
	});
});

describe('vérification droite : message de la droite essayée', () => {
	it('(AB) repassée n’est pas l’essai de médiatrice (revue)', () => {
		// À l'œil en x = 4,5, plus (AB) repassée par A et B
		expect(judge(MEDIATRICE_GRID, [droite(2, 4, 6, 4), droite(4.5, 0, 4.5, 8)])).toEqual({
			status: 'incorrect',
			feedback: notMidpointFeedback('A', 'B')
		});
	});
});

describe('vérification droite : médiatrice sur quadrillage (pas de « à l’œil »)', () => {
	it('droite par deux nœuds de la médiatrice → juste', () => {
		expect(judge(MEDIATRICE_GRID, [droite(4, 1, 4, 7)])).toEqual({ status: 'correct' });
	});

	it('perpendiculaire à [AB] hors du milieu', () => {
		expect(judge(MEDIATRICE_GRID, [droite(5, 0, 5, 8)])).toEqual({
			status: 'incorrect',
			feedback: notMidpointFeedback('A', 'B')
		});
	});

	it('par le milieu, pas perpendiculaire', () => {
		expect(judge(MEDIATRICE_GRID, [droite(4, 4, 5, 7)])).toEqual({
			status: 'incorrect',
			feedback: notPerpendicularToSegmentFeedback('A', 'B')
		});
	});

	it('ni l’un ni l’autre', () => {
		expect(judge(MEDIATRICE_GRID, [droite(0, 0, 1, 7)])).toEqual({
			status: 'incorrect',
			feedback: notMediatriceFeedback('A', 'B')
		});
	});

	it('parmi plusieurs droites fausses, celle qui touche au but est expliquée', () => {
		expect(judge(MEDIATRICE_GRID, [droite(0, 0, 1, 7), droite(5, 0, 5, 8)])).toEqual({
			status: 'incorrect',
			feedback: notMidpointFeedback('A', 'B')
		});
	});
});

describe('vérification droite : deux médiatrices, autre expression', () => {
	// Triangle A(2 ; 3), B(6 ; 3), C(2 ; 7) : médiatrices x = 4 et y = 5
	const TRIANGLE = figure(
		['droite m = mediatrice(A, B)', 'droite n = mediatrice(A, C)'],
		['A = point(2, 3)', 'B = point(6, 3)', 'C = point(2, 7)', 'p = polygone(A, B, C)'],
		['grille: 1']
	);

	it('les deux tracées → juste ; une seule → il manque l’autre', () => {
		expect(judge(TRIANGLE, [droite(4, 0, 4, 8), droite(0, 5, 10, 5)])).toEqual({
			status: 'correct'
		});
		expect(judge(TRIANGLE, [droite(4, 0, 4, 8)])).toEqual({
			status: 'incorrect',
			feedback: mediatriceMissingFeedback('A', 'C')
		});
		expect(judge(TRIANGLE, [droite(4, 0, 4, 8), droite(0, 0, 1, 7)])).toEqual({
			status: 'incorrect',
			feedback: notMediatriceFeedback('A', 'C')
		});
	});

	it('une expression autre que la médiatrice : messages génériques', () => {
		// Par C(2 ; 6), perpendiculaire à [AB] : x = 2
		const source = figure(
			'droite p = perpendiculaire(C, s)',
			[...AB_BODY, 'C = point(2, 6)'],
			['grille: 1']
		);
		expect(judge(source, [droite(2, 0, 2, 8)])).toEqual({ status: 'correct' });
		expect(judge(source, [droite(3, 0, 3, 8)])).toEqual({
			status: 'incorrect',
			feedback: LINE_NOT_IN_PLACE_FEEDBACK
		});
		expect(judge(source, [cercle(2, 3, 6, 3)])).toEqual({
			status: 'incorrect',
			feedback: lineMissingFeedback('p')
		});
	});
});

describe('vérification droite : erreurs d’auteur', () => {
	it('figure faisable : rien à signaler', () => {
		expect(() => assertChecks(MEDIATRICE)).not.toThrow();
		expect(() => assertChecks(MEDIATRICE_GRID)).not.toThrow();
	});

	it('expression qui n’est pas une droite', () => {
		const source = figure('droite m = milieu(A, B)', AB_BODY);
		expect(() => assertChecks(source)).toThrow(ConstructionAuthorError);
		expect(() => assertChecks(source)).toThrow(/ne donne pas une droite/);
	});

	it('expression qui ne se calcule pas', () => {
		expect(() => assertChecks(figure('droite m = mediatrice(A, Z)', AB_BODY))).toThrow(
			/ne se calcule pas/
		);
	});

	it('droite hors de la fenêtre', () => {
		const source = figure('droite m = mediatrice(A, B)', [
			'A = point(20, 3)',
			'B = point(24, 3)',
			's = segment(A, B)'
		]);
		expect(() => assertChecks(source)).toThrow(/hors de la fenêtre/);
	});

	it('A invisible (médiatrice) : l’élève ne peut pas y piquer le compas', () => {
		const source = figure('droite m = mediatrice(A, B)', [
			'A = point(2, 3, visible=faux)',
			'B = point(6, 3)'
		]);
		expect(() => assertChecks(source)).toThrow(/A n’est pas visible/);
	});

	it('papier uni : cercles de rayon AB qui se coupent hors de la fenêtre (revue)', () => {
		// A(2 ; 3), B(7 ; 5) dans 0..10 × 0..8 : intersections (2,77 ; 8,33) et (6,23 ; −0,33)
		const source = figure('droite m = mediatrice(A, B)', [
			'A = point(2, 3)',
			'B = point(7, 5)',
			's = segment(A, B)'
		]);
		expect(() => assertChecks(source)).toThrow(/se coupent hors de la fenêtre/);
	});

	it('papier uni : seulement une médiatrice (revue : point de passage invisible)', () => {
		const source = figure('droite p = perpendiculaire(C, s)', [
			...AB_BODY,
			'C = point(3, 6, visible=faux)'
		]);
		expect(() => assertChecks(source)).toThrow(/sans quadrillage, seulement une médiatrice/);
	});

	it('deux vérifications pour la même droite (revue)', () => {
		const source = figure(['droite m = mediatrice(A, B)', 'droite n = mediatrice(B, A)'], AB_BODY);
		expect(() => assertChecks(source)).toThrow(/m et n sont la même droite/);
	});

	it('quadrillage : droite qui ne passe pas par deux nœuds de la fenêtre', () => {
		const source = figure(
			'droite m = mediatrice(A, B)',
			['A = point(2, 3)', 'B = point(3, 3)', 's = segment(A, B)'],
			['grille: 1']
		);
		expect(() => assertChecks(source)).toThrow(/deux nœuds du quadrillage/);
	});
});

describe('milieu construit sur papier uni (décision 3)', () => {
	const MILIEU = figure('point I = milieu(A, B)', AB_BODY);

	it('n’est plus refusé sans quadrillage', () => {
		expect(() => assertChecks(MILIEU)).not.toThrow();
	});

	it('médiatrice construite, point à son intersection avec [AB] → juste', () => {
		const answer = [...COMPASS, droite(TOP.x, TOP.y, BOTTOM.x, BOTTOM.y), point(4, 4)];
		expect(judge(MILIEU, answer)).toEqual({ status: 'correct' });
	});

	it('cercles de rayon AB hors de la fenêtre : refusé', () => {
		const source = figure('point I = milieu(A, B)', ['A = point(2, 3)', 'B = point(7, 5)']);
		expect(() => assertChecks(source)).toThrow(/se coupent hors de la fenêtre/);
	});

	it('point posé à l’œil pile au milieu → faux', () => {
		expect(judge(MILIEU, [point(4, 4)])).toEqual({
			status: 'incorrect',
			feedback: POINT_EYEBALLED_FEEDBACK
		});
	});
});

describe('correction de la médiatrice', () => {
	it('la droite en pointillés et le codage (angle droit au milieu, moitiés égales)', () => {
		const checks = checksOf(MEDIATRICE);
		const lines = solutionLines(
			checks,
			constructionPositions(MEDIATRICE),
			[],
			constructionShapes(MEDIATRICE),
			constructionExpected(MEDIATRICE)
		);
		expect(lines).toHaveLength(1);
		const [line] = lines;
		expect(line.kind).toBe('droite');
		expect(line.x1).toBeCloseTo(4);
		expect(line.x2).toBeCloseTo(4);
		expect(solutionCodages(checks, constructionPositions(MEDIATRICE))).toEqual([
			{ from: { x: 2, y: 4 }, foot: { x: 4, y: 4 }, to: { x: 6, y: 4 } }
		]);
	});
});
