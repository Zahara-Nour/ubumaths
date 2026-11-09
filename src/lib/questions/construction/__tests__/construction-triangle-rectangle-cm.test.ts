/**
 * Juge d'une case « figure » : triangle rectangle coté en cm
 * (`verifier: triangle ABC : CAB = 90 ; AC = 3 cm`) — chantier `regle-graduee`,
 * PR 4 (`docs/wip/regle-graduee-progress.md` § 4, décisions de David du
 * 2026-11-08). [AB] est tracé ; l'élève trace la perpendiculaire à l'équerre en
 * A, pose la règle graduée avec son 0 en A, arrête [AC] sur la graduation, puis
 * trace [BC]. Les deux côtés de (AB) sont justes.
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { ConstructionAuthorError, assertConstructionChecks, judgeConstruction } from '../judge';
import {
	sideEyeballedFeedback,
	vertexOffGraduationFeedback,
	wrongRuledLengthFeedback
} from '../triangle';
import { isStraight, perpendicularThrough, type StraightTrait } from '../instruments';
import { solutionRulers, solutionTriangle } from '../drawing';
import { serializeConstructionAnswer, type DrawnObject, type DrawnRegle } from '../answer';
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
	body: string[] = BODY,
	header: string[] = [],
	window = '0 ; 12 ; 0 ; 8'
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
const regle = (toward: Position, origin: Position = A): DrawnRegle => ({
	kind: 'regle',
	ox: origin.x,
	oy: origin.y,
	bx: toward.x,
	by: toward.y,
	sens: 1
});

/** Le trait droit de la figure qui joint p et q (ce que l'équerre longe) */
function figureTrait(source: string, p: Position, q: Position): StraightTrait {
	const near = (u: Position, v: Position) => Math.hypot(u.x - v.x, u.y - v.y) < 1e-9;
	const trait = constructionShapes(source)
		?.traits.filter(isStraight)
		.find((t) => (near(t.a, p) && near(t.b, q)) || (near(t.a, q) && near(t.b, p)));
	if (!trait) throw new Error('trait introuvable');
	return trait;
}

// Papier uni, fenêtre 12 × 8 (règle de 12 cm) : A(3 ; 3), B(9 ; 3), [AB] = 6 cm
const A = { x: 3, y: 3 };
const B = { x: 9, y: 3 };
const BODY = ['A = point(3, 3)', 'B = point(9, 3)', 's = segment(A, B)'];
const RIGHT = figure('triangle ABC : CAB = 90 ; AC = 3 cm');
/** L'équerre le long de [AB], en A */
const SQUARE_A = perpendicularThrough(figureTrait(RIGHT, A, B), A);
const C = { x: 3, y: 6 };
const C_BELOW = { x: 3, y: 0 };
const UP = { x: 3, y: 4 };
const NOMINAL: DrawnObject[] = [SQUARE_A, regle(UP), segment(A, C), segment(B, C)];

describe('triangle rectangle coté en cm : lecture de l’en-tête', () => {
	it('lit la longueur en mm ; palette Segment · Équerre · Règle graduée', () => {
		const { spec, errors } = readConstructionHeader(RIGHT);
		expect(errors).toEqual([]);
		expect(spec.checks).toEqual([
			{
				kind: 'triangle',
				points: ['A', 'B', 'C'],
				lengths: [{ side: ['A', 'C'], length: 30, unit: 'cm' }],
				angles: [{ vertex: 'A', base: 'B', measure: 90 }],
				line: 2
			}
		]);
		expect(spec.tools).toEqual(['segment', 'equerre', 'regle']);
	});

	it('lit 3 cm 5 mm, 35 mm, 3,5 cm ; l’angle droit en B', () => {
		for (const [text, unit] of [
			['3 cm 5 mm', 'cm-mm'],
			['35 mm', 'mm'],
			['3,5 cm', 'cm']
		] as const) {
			const { spec, errors } = readConstructionHeader(
				figure(`triangle ABC : CAB = 90 ; AC = ${text}`)
			);
			expect(errors).toEqual([]);
			expect(spec.checks[0]).toMatchObject({
				lengths: [{ side: ['A', 'C'], length: 35, unit }]
			});
		}
		const atB = readConstructionHeader(figure('triangle ABC : BC = 4 cm ; ABC = 90'));
		expect(atB.errors).toEqual([]);
		expect(atB.spec.checks[0]).toMatchObject({
			lengths: [{ side: ['B', 'C'], length: 40, unit: 'cm' }]
		});
	});

	it('refuse une longueur qui n’est pas au millimètre près', () => {
		expect(errorOf(figure('triangle ABC : CAB = 90 ; AC = 3,25 cm'))).toMatch(/millimètre/);
	});

	it('refuse une longueur en cm sans l’angle droit', () => {
		expect(errorOf(figure('triangle ABC : AC = 4 cm ; BC = 3 cm'))).toMatch(/cm.*angle droit/);
		expect(errorOf(figure('triangle ABC : AC = 4 cm ; CAB = 40'))).toMatch(/cm.*angle droit/);
	});

	it('refuse une longueur en cm sur quadrillage', () => {
		expect(errorOf(figure('triangle ABC : CAB = 90 ; AC = 3 cm', BODY, ['grille: 1']))).toMatch(
			/papier uni/
		);
	});

	it('refuse une palette sans la règle graduée', () => {
		expect(
			errorOf(figure('triangle ABC : CAB = 90 ; AC = 3 cm', BODY, ['outils: segment, equerre']))
		).toMatch(/règle/);
	});
});

describe('triangle rectangle coté en cm : refus de l’auteur', () => {
	it('accepte la figure nominale', () => {
		expect(() => assertChecks(RIGHT)).not.toThrow();
	});

	it('refuse un côté plus long que la règle', () => {
		// Fenêtre 8 × 30 : règle de 20 cm au plus, C à 25 cm de A tient dans la fenêtre
		const long = figure('triangle ABC : CAB = 90 ; AC = 25 cm', BODY, [], '0 ; 12 ; 0 ; 30');
		expect(() => assertChecks(long)).toThrow(ConstructionAuthorError);
		expect(() => assertChecks(long)).toThrow(/règle/);
	});

	it('refuse un sommet C hors de la fenêtre des deux côtés', () => {
		const out = figure('triangle ABC : CAB = 90 ; AC = 6 cm');
		expect(() => assertChecks(out)).toThrow(/hors de la fenêtre/);
	});
});

describe('triangle rectangle coté en cm : verdict', () => {
	it('juste : équerre en A, règle posée en A, [AC] arrêté sur 3 cm, [BC]', () => {
		expect(judge(RIGHT, NOMINAL)).toMatchObject({ status: 'correct' });
	});

	it('juste de l’autre côté de (AB)', () => {
		const below = [SQUARE_A, regle({ x: 3, y: 2 }), segment(A, C_BELOW), segment(B, C_BELOW)];
		expect(judge(RIGHT, below)).toMatchObject({ status: 'correct' });
	});

	it('[BC] tracé avant [AC] : juste', () => {
		expect(judge(RIGHT, [SQUARE_A, regle(UP), segment(B, C), segment(A, C)])).toMatchObject({
			status: 'correct'
		});
	});

	it('sans l’équerre : côté tracé à l’œil', () => {
		expect(judge(RIGHT, [regle(UP), segment(A, C), segment(B, C)])).toMatchObject({
			status: 'incorrect',
			feedback: sideEyeballedFeedback('A', 'C')
		});
	});

	it('sans règle : point C placé à l’œil', () => {
		expect(judge(RIGHT, [SQUARE_A, segment(A, C), segment(B, C)])).toMatchObject({
			status: 'incorrect',
			feedback: vertexOffGraduationFeedback('A', 'C')
		});
	});

	it('règle posée APRÈS les côtés : point C placé à l’œil', () => {
		expect(judge(RIGHT, [SQUARE_A, segment(A, C), segment(B, C), regle(UP)])).toMatchObject({
			status: 'incorrect',
			feedback: vertexOffGraduationFeedback('A', 'C')
		});
	});

	it('règle dont le 0 n’est pas en A : point C placé à l’œil', () => {
		// 0 en (3 ; 2) : C est sur la graduation 4 cm de cette règle, pas sur celle de 3 cm depuis A
		expect(
			judge(RIGHT, [SQUARE_A, regle(UP, { x: 3, y: 2 }), segment(A, C), segment(B, C)])
		).toMatchObject({ status: 'incorrect', feedback: vertexOffGraduationFeedback('A', 'C') });
	});

	it('C entre deux graduations : placé à l’œil', () => {
		const between = { x: 3, y: 6.05 };
		expect(
			judge(RIGHT, [SQUARE_A, regle(UP), segment(A, between), segment(B, between)])
		).toMatchObject({ status: 'incorrect', feedback: vertexOffGraduationFeedback('A', 'C') });
	});

	it('mauvaise graduation : la longueur lue, dans l’unité de l’auteur', () => {
		const short = { x: 3, y: 5.8 };
		const objects = [SQUARE_A, regle(UP), segment(A, short), segment(B, short)];
		expect(judge(RIGHT, objects)).toMatchObject({
			status: 'incorrect',
			feedback: wrongRuledLengthFeedback('A', 'C', 28, { length: 30, unit: 'cm' })
		});
		expect(wrongRuledLengthFeedback('A', 'C', 28, { length: 30, unit: 'cm' })).toBe(
			'Ton côté [AC] mesure 2,8 cm au lieu de 3 cm.'
		);
		const mixed = figure('triangle ABC : CAB = 90 ; AC = 3 cm 5 mm');
		expect(judge(mixed, objects)).toMatchObject({
			feedback: 'Ton côté [AC] mesure 2 cm 8 mm au lieu de 3 cm 5 mm.'
		});
	});

	it('un Report (hors palette) : réponse forgée', () => {
		const forged: DrawnObject = {
			kind: 'report',
			cx: A.x,
			cy: A.y,
			ax: 0,
			ay: 7,
			bx: 3,
			by: 7
		};
		expect(judge(RIGHT, [...NOMINAL, forged])).toEqual({ status: 'incorrect' });
	});
});

describe('triangle rectangle coté en cm : correction', () => {
	it('la règle posée en A le long de la perpendiculaire, vers C', () => {
		const source = RIGHT;
		const rulers = solutionRulers(
			checksOf(source),
			constructionPositions(source),
			constructionShapes(source),
			[]
		);
		expect(rulers).toHaveLength(1);
		const [ruler] = rulers;
		expect(ruler).toMatchObject({ ox: 3, oy: 3, sens: 1 });
		const u = { x: ruler.bx - ruler.ox, y: ruler.by - ruler.oy };
		expect(Math.abs(u.x)).toBeLessThan(1e-9);
		expect(u.y).toBeGreaterThan(0);
	});

	it('du côté où l’élève a tracé', () => {
		const source = RIGHT;
		const [ruler] = solutionRulers(
			checksOf(source),
			constructionPositions(source),
			constructionShapes(source),
			[segment(A, { x: 3, y: 1 })]
		);
		expect(ruler.by - ruler.oy).toBeLessThan(0);
	});

	it('la perpendiculaire à l’équerre et l’angle droit ; ni arc de report ni codage', () => {
		const source = RIGHT;
		const correction = solutionTriangle(
			checksOf(source),
			constructionPositions(source),
			constructionShapes(source),
			[]
		);
		expect(correction).toMatchObject({ arcs: [], marks: [] });
		expect(correction?.guides).toHaveLength(1);
		expect(correction?.rightAngles).toHaveLength(1);
	});
});
