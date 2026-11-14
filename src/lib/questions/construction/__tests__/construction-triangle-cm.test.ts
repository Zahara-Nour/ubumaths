/**
 * Juge d'une case « figure » : triangle quelconque coté en cm — chantier
 * `triangle-cote-cm` (n° 29 d'`outils-manquants`, phase 0 validée par David le
 * 2026-11-14, `docs/wip/triangle-cote-cm-progress.md`).
 *
 * [AB] est tracé, papier uni. Trois longueurs (`AC = 4 cm ; BC = 5 cm`) : règle
 * posée en A, compas piqué en A et ouvert sur la graduation de 4 cm, de même en
 * B à 5 cm, C au croisement, puis [AC] et [BC]. Deux côtés et l'angle compris
 * (`CAB = 50 ; AC = 4 cm`) : rapporteur en A, puis C à 4 cm de A sur le côté
 * d'angle, sur la graduation d'une règle posée en A OU à l'arc du compas ouvert
 * à 4 cm sur la règle. Les deux C (de part et d'autre de (AB)) sont justes ;
 * plusieurs C distincts : faux.
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { ConstructionAuthorError, assertConstructionChecks, judgeConstruction } from '../judge';
import {
	missingSideFeedback,
	severalTrianglesFeedback,
	vertexEyeballedAnglesFeedback,
	vertexEyeballedFeedback,
	vertexOffGraduationFeedback,
	wrongAngleTriangleFeedback,
	wrongRuledLengthFeedback
} from '../triangle';
import { centeredRulerEyeballedFeedback } from '../circle';
import { intersectTraits, repereAt, rulerGraduation, traitOf, type Trait } from '../instruments';
import { solutionRulers, solutionTriangle } from '../drawing';
import {
	serializeConstructionAnswer,
	type DrawnObject,
	type DrawnRegle,
	type DrawnRepere
} from '../answer';
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

function figure(
	verifier: string,
	header: string[] = [],
	window = '0 ; 12 ; 0 ; 9',
	body: string[] = BODY
): string {
	return [`fenetre: ${window}`, ...header, `verifier: ${verifier}`, '---', ...body].join('\n');
}

function errorOf(source: string): string | undefined {
	return readConstructionHeader(source).errors[0]?.message;
}

const segment = (p: Position, q: Position): DrawnObject => ({
	kind: 'segment',
	x1: p.x,
	y1: p.y,
	x2: q.x,
	y2: q.y
});
/** Règle posée : le 0 en `origin`, vers `toward` */
const regle = (origin: Position, toward: Position): DrawnRegle => ({
	kind: 'regle',
	ox: origin.x,
	oy: origin.y,
	bx: toward.x,
	by: toward.y,
	sens: 1
});
/** Compas piqué en `center`, ouvert jusqu'à `through` */
const cercle = (center: Position, through: Position): DrawnObject => ({
	kind: 'cercle',
	cx: center.x,
	cy: center.y,
	x: through.x,
	y: through.y
});
/** Compas piqué au 0 de la règle, ouvert sur sa graduation `mm` */
const opened = (ruler: DrawnRegle, mm: number): DrawnObject =>
	cercle({ x: ruler.ox, y: ruler.oy }, rulerGraduation(ruler, mm));

/** Intersections de deux objets tracés (comme l'aimantation les donne), de bas en haut */
function cross(p: DrawnObject, q: DrawnObject): Position[] {
	return intersectTraits(traitOf(p) as Trait, traitOf(q) as Trait).sort((u, v) => u.y - v.y);
}

// Papier uni, fenêtre 12 × 9 (règle de 12 cm) : A(3 ; 4), B(9 ; 4), [AB] = 6 cm
const A = { x: 3, y: 4 };
const B = { x: 9, y: 4 };
const BODY = ['A = point(3, 4)', 'B = point(9, 4)', 's = segment(A, B)'];

describe('triangle coté en cm, trois longueurs', () => {
	const SIDES = figure('triangle ABC : AC = 4 cm ; BC = 5 cm');
	/** Règle en A vers le haut, en B vers la gauche (le long de [AB]) */
	const RULER_A = regle(A, { x: 3, y: 8 });
	const RULER_B = regle(B, { x: 5, y: 4 });
	const ARC_A = opened(RULER_A, 40);
	const ARC_B = opened(RULER_B, 50);
	const [C_BELOW, C] = cross(ARC_A, ARC_B);
	const NOMINAL: DrawnObject[] = [RULER_A, ARC_A, RULER_B, ARC_B, segment(A, C), segment(B, C)];

	describe('lecture de l’en-tête', () => {
		it('lit les deux longueurs en mm ; palette Segment · Compas · Règle graduée', () => {
			const { spec, errors } = readConstructionHeader(SIDES);
			expect(errors).toEqual([]);
			expect(spec.checks).toEqual([
				{
					kind: 'triangle',
					points: ['A', 'B', 'C'],
					lengths: [
						{ side: ['A', 'C'], length: 40, unit: 'cm' },
						{ side: ['B', 'C'], length: 50, unit: 'cm' }
					],
					angles: [],
					line: 2
				}
			]);
			expect(spec.tools).toEqual(['segment', 'compas', 'regle']);
		});

		it('lit 3,5 cm, 3 cm 5 mm, 35 mm', () => {
			const { spec, errors } = readConstructionHeader(
				figure('triangle ABC : BC = 3 cm 5 mm ; AC = 45 mm')
			);
			expect(errors).toEqual([]);
			expect(spec.checks[0]).toMatchObject({
				lengths: [
					{ side: ['A', 'C'], length: 45, unit: 'mm' },
					{ side: ['B', 'C'], length: 35, unit: 'cm-mm' }
				]
			});
		});

		it('refuse cm et segment à reporter mêlés', () => {
			const mixed = [
				'fenetre: 0 ; 12 ; 0 ; 9',
				'verifier: triangle ABC : AC = 4 cm ; BC = u',
				'---',
				...BODY,
				'u = segment(point(1, 8), point(6, 8))'
			].join('\n');
			expect(errorOf(mixed)).toMatch(/toutes en cm/);
		});

		it('refuse le quadrillage', () => {
			expect(errorOf(figure('triangle ABC : AC = 4 cm ; BC = 5 cm', ['grille: 1']))).toMatch(
				/papier uni/
			);
		});

		it('refuse une palette sans compas, ou avec le Report', () => {
			expect(
				errorOf(figure('triangle ABC : AC = 4 cm ; BC = 5 cm', ['outils: segment, regle']))
			).toMatch(/compas/);
			expect(
				errorOf(
					figure('triangle ABC : AC = 4 cm ; BC = 5 cm', ['outils: segment, compas, regle, report'])
				)
			).toMatch(/report hors de la palette/);
		});
	});

	describe('refus de l’auteur', () => {
		it('accepte la figure nominale', () => {
			expect(() => assertChecks(SIDES)).not.toThrow();
		});

		it('refuse un triangle impossible', () => {
			const flat = figure('triangle ABC : AC = 2 cm ; BC = 3 cm');
			expect(() => assertChecks(flat)).toThrow(ConstructionAuthorError);
			expect(() => assertChecks(flat)).toThrow(/ne font pas un triangle/);
		});

		it('refuse un côté plus long que la règle', () => {
			expect(() => assertChecks(figure('triangle ABC : AC = 13 cm ; BC = 9 cm'))).toThrow(
				/plus long que la règle/
			);
		});

		it('refuse les deux sommets C hors de la fenêtre', () => {
			expect(() => assertChecks(figure('triangle ABC : AC = 8 cm ; BC = 8 cm'))).toThrow(
				/hors de la fenêtre/
			);
		});
	});

	describe('verdict', () => {
		it('juste : compas ouverts à 4 cm en A et 5 cm en B sur la règle, [AC] et [BC]', () => {
			expect(judge(SIDES, NOMINAL)).toEqual({ status: 'correct' });
		});

		it('juste de l’autre côté de (AB)', () => {
			const below = [RULER_A, ARC_A, RULER_B, ARC_B, segment(A, C_BELOW), segment(B, C_BELOW)];
			expect(judge(SIDES, below)).toEqual({ status: 'correct' });
		});

		it('côté manquant : le message actuel du triangle', () => {
			expect(judge(SIDES, [RULER_A, ARC_A, RULER_B, ARC_B, segment(A, C)])).toMatchObject({
				status: 'incorrect',
				feedback: missingSideFeedback('B', 'C')
			});
		});

		it('C placé à l’œil, hors des arcs', () => {
			const free = { x: 5.5, y: 7 };
			expect(
				judge(SIDES, [RULER_A, ARC_A, RULER_B, ARC_B, segment(A, free), segment(B, free)])
			).toMatchObject({ status: 'incorrect', feedback: vertexEyeballedFeedback('C') });
		});

		it('compas ouvert sans règle : ouvert à l’œil', () => {
			const eyeballed = cercle(A, { x: 7, y: 4 });
			const [, c] = cross(eyeballed, ARC_B);
			expect(judge(SIDES, [eyeballed, RULER_B, ARC_B, segment(A, c), segment(B, c)])).toMatchObject(
				{ status: 'incorrect', feedback: centeredRulerEyeballedFeedback() }
			);
		});

		it('règle posée APRÈS le compas : ouvert à l’œil', () => {
			const objects = [ARC_A, RULER_A, RULER_B, ARC_B, segment(A, C), segment(B, C)];
			expect(judge(SIDES, objects)).toMatchObject({
				status: 'incorrect',
				feedback: centeredRulerEyeballedFeedback()
			});
		});

		it('règle dont le 0 n’est pas en A : ouvert à l’œil', () => {
			// 0 en (3 ; 3) : l'ouverture est sur la graduation 5 cm de cette règle, à 4 cm de A
			const shifted = regle({ x: 3, y: 3 }, { x: 3, y: 8 });
			const arc = cercle(A, rulerGraduation(shifted, 50));
			const [, c] = cross(arc, ARC_B);
			expect(
				judge(SIDES, [shifted, arc, RULER_B, ARC_B, segment(A, c), segment(B, c)])
			).toMatchObject({ status: 'incorrect', feedback: centeredRulerEyeballedFeedback() });
		});

		it('mauvaise graduation : « Ton côté [AC] mesure 3,8 cm au lieu de 4 cm. »', () => {
			const arc = opened(RULER_A, 38);
			const [, c] = cross(arc, ARC_B);
			expect(
				judge(SIDES, [RULER_A, arc, RULER_B, ARC_B, segment(A, c), segment(B, c)])
			).toMatchObject({
				status: 'incorrect',
				feedback: 'Ton côté [AC] mesure 3,8 cm au lieu de 4 cm.'
			});
			expect(wrongRuledLengthFeedback('A', 'C', 38, { length: 40, unit: 'cm' })).toBe(
				'Ton côté [AC] mesure 3,8 cm au lieu de 4 cm.'
			);
		});

		it('plusieurs C distincts : « Trace un seul triangle ABC. »', () => {
			const objects = [...NOMINAL, segment(A, C_BELOW), segment(B, C_BELOW)];
			expect(judge(SIDES, objects)).toMatchObject({
				status: 'incorrect',
				feedback: severalTrianglesFeedback('A', 'B', 'C')
			});
		});

		it('un même C atteint deux fois compte pour un : juste', () => {
			expect(judge(SIDES, [...NOMINAL, segment(C, A)])).toEqual({ status: 'correct' });
		});

		it('[AC] prolongé au-delà de C : la longueur du trait vu (Q18)', () => {
			const beyond = { x: A.x + (C.x - A.x) * 1.1, y: A.y + (C.y - A.y) * 1.1 };
			expect(judge(SIDES, [...NOMINAL, segment(A, beyond)])).toMatchObject({
				status: 'incorrect',
				feedback: 'Ton côté [AC] mesure 4,4 cm au lieu de 4 cm.'
			});
		});

		it('un Report (hors palette) : réponse forgée', () => {
			const forged: DrawnObject = {
				kind: 'report',
				cx: A.x,
				cy: A.y,
				ax: 3,
				ay: 4,
				bx: 7,
				by: 4
			};
			expect(judge(SIDES, [...NOMINAL, forged])).toEqual({ status: 'incorrect' });
		});
	});

	describe('correction', () => {
		it('une règle posée en A et une en B, vers C ; les arcs de 4 cm et 5 cm, sans codage', () => {
			const checks = checksOf(SIDES);
			const points = constructionPositions(SIDES);
			const shapes = constructionShapes(SIDES);
			const rulers = solutionRulers(checks, points, shapes, []);
			expect(rulers).toHaveLength(2);
			expect(rulers[0]).toMatchObject({ ox: 3, oy: 4 });
			expect(rulers[1]).toMatchObject({ ox: 9, oy: 4 });
			const correction = solutionTriangle(checks, points, shapes, []);
			expect(correction?.arcs.map((arc) => arc.radius)).toEqual([4, 5]);
			expect(correction?.marks).toEqual([]);
		});
	});
});

describe('triangle coté en cm, deux côtés et l’angle compris', () => {
	// Fenêtre 13 × 9 (règle de 13 cm, rapporteur de rayon 3,15) : A(4 ; 4), B(9 ; 4), [AB] = 5 cm
	const A = { x: 4, y: 4 };
	const B = { x: 9, y: 4 };
	const figure = (verifier: string, header: string[] = []) =>
		[
			'fenetre: 0 ; 13 ; 0 ; 9',
			...header,
			`verifier: ${verifier}`,
			'---',
			'A = point(4, 4)',
			'B = point(9, 4)',
			's = segment(A, B)'
		].join('\n');
	const ANGLE = figure('triangle ABC : CAB = 50 ; AC = 4 cm');
	/** Repère du rapporteur en A, base vers B, à 50° du côté `sens` */
	const repere = (deg: number, sens: 1 | -1 = 1): DrawnRepere => ({
		kind: 'repere',
		vx: A.x,
		vy: A.y,
		ax: B.x,
		ay: B.y,
		r: 3.15,
		deg,
		sens
	});
	const MARK = repere(50);
	/** La règle posée en A, le long du côté d'angle (vers le repère) */
	const ALONG = regle(A, repereAt(MARK));
	const C = rulerGraduation(ALONG, 40);
	const NOMINAL: DrawnObject[] = [MARK, ALONG, segment(A, C), segment(B, C)];

	describe('lecture de l’en-tête', () => {
		it('lit l’angle et la longueur ; palette Segment · Rapporteur · Règle graduée · Compas', () => {
			const { spec, errors } = readConstructionHeader(ANGLE);
			expect(errors).toEqual([]);
			expect(spec.checks).toEqual([
				{
					kind: 'triangle',
					points: ['A', 'B', 'C'],
					lengths: [{ side: ['A', 'C'], length: 40, unit: 'cm' }],
					angles: [{ vertex: 'A', base: 'B', measure: 50 }],
					line: 2
				}
			]);
			expect(spec.tools).toEqual(['segment', 'rapporteur', 'regle', 'compas']);
		});

		it('refuse une palette sans règle graduée, ou avec le Report', () => {
			expect(
				errorOf(
					figure('triangle ABC : CAB = 50 ; AC = 4 cm', ['outils: segment, rapporteur, compas'])
				)
			).toMatch(/règle/);
			expect(
				errorOf(
					figure('triangle ABC : CAB = 50 ; AC = 4 cm', [
						'outils: segment, rapporteur, regle, compas, report'
					])
				)
			).toMatch(/report hors de la palette/);
		});

		it('refuse une palette sans compas (revue de #2658 : la palette validée l’a)', () => {
			expect(
				errorOf(
					figure('triangle ABC : CAB = 50 ; AC = 4 cm', ['outils: segment, rapporteur, regle'])
				)
			).toMatch(/compas/);
		});

		it('refuse un angle qui n’est pas compris entre [AB] et le côté coté', () => {
			expect(errorOf(figure('triangle ABC : CAB = 50 ; BC = 4 cm'))).toMatch(/compris/);
		});
	});

	describe('refus de l’auteur', () => {
		it('accepte la figure nominale', () => {
			expect(() => assertChecks(ANGLE)).not.toThrow();
		});

		it('refuse un côté plus long que la règle', () => {
			expect(() => assertChecks(figure('triangle ABC : CAB = 50 ; AC = 14 cm'))).toThrow(
				/plus long que la règle/
			);
		});

		it('refuse les deux sommets C hors de la fenêtre', () => {
			expect(() => assertChecks(figure('triangle ABC : CAB = 50 ; AC = 10 cm'))).toThrow(
				/hors de la fenêtre/
			);
		});
	});

	describe('verdict', () => {
		it('juste : règle posée en A le long du côté d’angle, C sur la graduation de 4 cm', () => {
			expect(judge(ANGLE, NOMINAL)).toEqual({ status: 'correct' });
		});

		// Option A (David, 2026-11-14, après la revue de #2658) : le côté d'angle (le segment qui
		// porte le repère, parti de A) peut dépasser C ; C se lit sur lui
		it('S1 : côté [A, repère] de 3,15 cm, coupé par l’arc de 3 cm ouvert sur la règle → juste', () => {
			const source = figure('triangle ABC : CAB = 50 ; AC = 3 cm');
			const side = segment(A, repereAt(MARK));
			const ruler = regle(A, { x: 4, y: 8 });
			const arc = opened(ruler, 30);
			const [c] = cross(side, arc);
			const objects = [MARK, side, ruler, arc, segment(A, c), segment(B, c)];
			expect(judge(source, objects)).toEqual({ status: 'correct' });
		});

		it('S2 : côté d’angle de 6 cm le long de la règle, compas ouvert à 40 mm sur elle → juste', () => {
			const side = segment(A, rulerGraduation(ALONG, 60));
			const arc = opened(ALONG, 40);
			const [c] = cross(side, arc);
			const objects = [MARK, ALONG, side, arc, segment(A, c), segment(B, c)];
			expect(judge(ANGLE, objects)).toEqual({ status: 'correct' });
		});

		it('S3 : côté d’angle de 6 cm, compas ouvert sur une autre règle posée en A, verticale → juste', () => {
			const side = segment(A, rulerGraduation(ALONG, 60));
			const vertical = regle(A, { x: 4, y: 8 });
			const arc = opened(vertical, 40);
			const [c] = cross(side, arc);
			const objects = [MARK, ALONG, side, vertical, arc, segment(A, c), segment(B, c)];
			expect(judge(ANGLE, objects)).toEqual({ status: 'correct' });
		});

		it('juste de l’autre côté de (AB)', () => {
			const mark = repere(50, -1);
			const along = regle(A, repereAt(mark));
			const below = rulerGraduation(along, 40);
			expect(judge(ANGLE, [mark, along, segment(A, below), segment(B, below)])).toEqual({
				status: 'correct'
			});
		});

		it('sans rapporteur : C placé à l’œil (côtés au rapporteur)', () => {
			const ruler = regle(A, C);
			expect(judge(ANGLE, [ruler, segment(A, C), segment(B, C)])).toMatchObject({
				status: 'incorrect',
				feedback: vertexEyeballedAnglesFeedback('C')
			});
		});

		it('ni règle ni compas : C placé à l’œil sur le côté d’angle', () => {
			expect(judge(ANGLE, [MARK, segment(A, C), segment(B, C)])).toMatchObject({
				status: 'incorrect',
				feedback: vertexOffGraduationFeedback('A', 'C')
			});
		});

		it('règle posée APRÈS le côté : C placé à l’œil', () => {
			expect(judge(ANGLE, [MARK, segment(A, C), ALONG, segment(B, C)])).toMatchObject({
				status: 'incorrect',
				feedback: vertexOffGraduationFeedback('A', 'C')
			});
		});

		it('compas ouvert sans règle : ouvert à l’œil', () => {
			const objects = [MARK, cercle(A, { x: 4, y: 8 }), segment(A, C), segment(B, C)];
			expect(judge(ANGLE, objects)).toMatchObject({
				status: 'incorrect',
				feedback: centeredRulerEyeballedFeedback()
			});
		});

		it('mauvaise graduation : « Ton côté [AC] mesure 3,8 cm au lieu de 4 cm. »', () => {
			const short = rulerGraduation(ALONG, 38);
			expect(judge(ANGLE, [MARK, ALONG, segment(A, short), segment(B, short)])).toMatchObject({
				status: 'incorrect',
				feedback: 'Ton côté [AC] mesure 3,8 cm au lieu de 4 cm.'
			});
		});

		it('angle faux, longueur juste : le message actuel de l’angle', () => {
			const mark = repere(40);
			const along = regle(A, repereAt(mark));
			const c = rulerGraduation(along, 40);
			const verdict = judge(ANGLE, [mark, along, segment(A, c), segment(B, c)]);
			expect(verdict).toMatchObject({ status: 'incorrect' });
			expect(verdict.status === 'incorrect' && verdict.feedback).toBe(
				wrongAngleTriangleFeedback('CAB', 40, 50)
			);
		});

		it('plusieurs C distincts (un éventail) : « Trace un seul triangle ABC. »', () => {
			const far = rulerGraduation(ALONG, 45);
			const objects = [...NOMINAL, segment(A, far), segment(B, far)];
			expect(judge(ANGLE, objects)).toMatchObject({
				status: 'incorrect',
				feedback: severalTrianglesFeedback('A', 'B', 'C')
			});
		});

		it('[AC] tracé à part, prolongé au-delà de C : jugé sur le trait vu (Q18)', () => {
			const beyond = rulerGraduation(ALONG, 55);
			expect(judge(ANGLE, [...NOMINAL, segment(C, beyond)])).toMatchObject({
				status: 'incorrect',
				feedback: 'Ton côté [AC] mesure 5,5 cm au lieu de 4 cm.'
			});
		});

		it('un Report (hors palette) : réponse forgée', () => {
			const forged: DrawnObject = {
				kind: 'report',
				cx: A.x,
				cy: A.y,
				ax: 3,
				ay: 4,
				bx: 7,
				by: 4
			};
			expect(judge(ANGLE, [...NOMINAL, forged])).toEqual({ status: 'incorrect' });
		});
	});

	describe('correction', () => {
		it('la règle posée en A le long du côté d’angle ; l’angle codé, ni arc ni codage', () => {
			const checks = checksOf(ANGLE);
			const points = constructionPositions(ANGLE);
			const shapes = constructionShapes(ANGLE);
			const rulers = solutionRulers(checks, points, shapes, []);
			expect(rulers).toHaveLength(1);
			const [ruler] = rulers;
			expect(ruler).toMatchObject({ ox: 4, oy: 4 });
			const angle = (Math.atan2(ruler.by - ruler.oy, ruler.bx - ruler.ox) * 180) / Math.PI;
			expect(Math.abs(Math.abs(angle) - 50)).toBeLessThan(1e-6);
			const correction = solutionTriangle(checks, points, shapes, []);
			expect(correction).toMatchObject({ arcs: [], marks: [] });
			expect(correction?.angles).toHaveLength(1);
		});
	});
});
