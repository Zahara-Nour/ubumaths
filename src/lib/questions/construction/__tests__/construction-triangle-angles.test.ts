/**
 * Juge d'une case « figure » : construire un triangle par un côté et deux angles
 * (`verifier: triangle ABC : CAB = 40 ; ABC = 65`), ou par deux côtés et l'angle
 * compris (`AC = u ; CAB = 40`) — chantier `controles-figure`, lot 7, phase 0
 * validée par David le 2026-11-03 (`docs/wip/controles-figure-progress.md` § 21).
 *
 * [AB] est tracé. L'élève pose le rapporteur en A (et en B), place un repère,
 * trace à la règle la droite du sommet au repère (« côté d'angle », construit),
 * puis les côtés [AC] et [BC] au segment ; C = leur extrémité commune, au
 * croisement de deux traits construits.
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { ConstructionAuthorError, assertConstructionChecks, judgeConstruction } from '../judge';
import {
	missingSideFeedback,
	missingSidesFeedback,
	notJoinedFeedback,
	oppositeAnglesFeedback,
	vertexEyeballedAnglesFeedback,
	wrongAngleTriangleFeedback,
	wrongLengthFeedback,
	wrongScaleAngleFeedback
} from '../triangle';
import { constructionOf, intersectTraits, repereAt, traitOf, type Trait } from '../instruments';
import { solutionLines, solutionTriangle } from '../drawing';
import { serializeConstructionAnswer, type DrawnObject, type DrawnRepere } from '../answer';
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
const droite = (p: Position, q: Position): DrawnObject => ({
	kind: 'droite',
	x1: p.x,
	y1: p.y,
	x2: q.x,
	y2: q.y
});
const report = (center: Position, a: Position, b: Position): DrawnObject => ({
	kind: 'report',
	cx: center.x,
	cy: center.y,
	ax: a.x,
	ay: a.y,
	bx: b.x,
	by: b.y
});

// A(3 ; 3), B(9 ; 3) : le rapporteur (rayon 0,35 × 8 = 2,8) tient en A et en B des deux côtés
const A = { x: 3, y: 3 };
const B = { x: 9, y: 3 };
const RADIUS = 2.8;
const BODY = ['A = point(3, 3)', 'B = point(9, 3)', 's = segment(A, B)'];
const ANGLES = figure('triangle ABC : CAB = 40 ; ABC = 65');

/** Repère du rapporteur centré en `center`, base vers `base`, à `deg` dans le sens `sens` */
const repere = (center: Position, base: Position, deg: number, sens: 1 | -1): DrawnRepere => ({
	kind: 'repere',
	vx: center.x,
	vy: center.y,
	ax: base.x,
	ay: base.y,
	r: RADIUS,
	deg,
	sens
});

/** Intersection de deux objets tracés, comme l'aimantation la donne */
function cross(p: DrawnObject, q: DrawnObject): Position[] {
	return intersectTraits(traitOf(p) as Trait, traitOf(q) as Trait).sort((u, v) => u.y - v.y);
}

// Au-dessus de (AB) : 40° en A (sens trigonométrique depuis [AB)), 65° en B (horaire depuis [BA))
const MARK_A = repere(A, B, 40, 1);
const MARK_B = repere(B, A, 65, -1);
const LINE_A = droite(A, repereAt(MARK_A));
const LINE_B = droite(B, repereAt(MARK_B));
const [C] = cross(LINE_A, LINE_B);
const NOMINAL: DrawnObject[] = [MARK_A, LINE_A, MARK_B, LINE_B, segment(A, C), segment(B, C)];

/** Le triangle construit avec ces repères : droites, puis côtés jusqu'à leur croisement */
function built(markA: DrawnRepere, markB: DrawnRepere): DrawnObject[] {
	const lineA = droite(A, repereAt(markA));
	const lineB = droite(B, repereAt(markB));
	const [c] = cross(lineA, lineB);
	return [markA, lineA, markB, lineB, segment(A, c), segment(B, c)];
}

describe('triangle par un côté et deux angles : lecture de l’en-tête', () => {
	it('lit les deux angles ; palette Rapporteur · Règle · Segment', () => {
		const { spec, errors } = readConstructionHeader(ANGLES);
		expect(errors).toEqual([]);
		expect(spec.checks).toEqual([
			{
				kind: 'triangle',
				points: ['A', 'B', 'C'],
				lengths: [],
				angles: [
					{ vertex: 'A', base: 'B', measure: 40 },
					{ vertex: 'B', base: 'A', measure: 65 }
				],
				line: 2
			}
		]);
		expect(spec.tools).toEqual(['rapporteur', 'droite', 'segment']);
	});

	it('admet BAC pour CAB, « ° », et les angles dans l’autre ordre', () => {
		const { spec, errors } = readConstructionHeader(figure('triangle ABC : CBA = 65° ; BAC = 40'));
		expect(errors).toEqual([]);
		expect(spec.checks[0]).toMatchObject({
			angles: [
				{ vertex: 'A', measure: 40 },
				{ vertex: 'B', measure: 65 }
			]
		});
	});

	it('deux côtés et l’angle compris : palette avec Report et Compas', () => {
		const { spec, errors } = readConstructionHeader(
			figure('triangle ABC : AC = u ; CAB = 40', [...BODY, 'u = segment(point(1, 7), point(5, 7))'])
		);
		expect(errors).toEqual([]);
		expect(spec.checks[0]).toMatchObject({
			lengths: [{ side: ['A', 'C'], source: ['u'] }],
			angles: [{ vertex: 'A', base: 'B', measure: 40 }]
		});
		expect(spec.tools).toEqual(['rapporteur', 'droite', 'segment', 'report', 'compas']);
	});

	it('refuse deux angles dont la somme atteint 180°', () => {
		expect(errorOf(figure('triangle ABC : CAB = 100 ; ABC = 80'))).toMatch(
			/ne font pas un triangle .*180°/
		);
	});

	it('refuse un angle en C, un angle hors 1..179, deux angles au même sommet', () => {
		expect(errorOf(figure('triangle ABC : ACB = 40 ; ABC = 65'))).toMatch(/pour sommet A ou B/);
		expect(errorOf(figure('triangle ABC : CAB = 0 ; ABC = 65'))).toMatch(/de 1 à 179/);
		expect(errorOf(figure('triangle ABC : CAB = 180 ; ABC = 65'))).toMatch(/de 1 à 179/);
		expect(errorOf(figure('triangle ABC : CAB = 40 ; BAC = 65'))).toMatch(
			/un angle en A et un angle en B/
		);
	});

	it('refuse un angle qui n’est pas compris entre [AB] et le côté donné', () => {
		expect(
			errorOf(
				figure('triangle ABC : AC = u ; ABC = 40', [
					...BODY,
					'u = segment(point(1, 7), point(5, 7))'
				])
			)
		).toMatch(/compris entre \[AB\] et le côté \[AC\]/);
	});

	it('refuse une palette sans rapporteur, et le rapporteur sans angle donné', () => {
		expect(
			errorOf(figure('triangle ABC : CAB = 40 ; ABC = 65', BODY, ['outils: droite, segment']))
		).toMatch(/au rapporteur/);
		expect(
			errorOf(
				figure('triangle ABC : AC = AB ; BC = AB', BODY, [
					'outils: segment, compas, report, droite, rapporteur'
				])
			)
		).toMatch(/rapporteur/);
	});
});

describe('triangle par un côté et deux angles : erreurs d’auteur', () => {
	it('le triangle nominal se publie', () => {
		expect(() => assertChecks(ANGLES)).not.toThrow();
	});

	it('refuse un rapporteur qui sort de la figure en A, des deux côtés', () => {
		const source = figure('triangle ABC : CAB = 40 ; ABC = 65', [
			'A = point(1, 4)',
			'B = point(9, 4)',
			's = segment(A, B)'
		]);
		expect(() => assertChecks(source)).toThrow(ConstructionAuthorError);
		expect(() => assertChecks(source)).toThrow(/rapporteur posé en A sort de la figure/);
	});

	it('refuse les deux sommets C hors de la fenêtre', () => {
		expect(() => assertChecks(figure('triangle ABC : CAB = 80 ; ABC = 80'))).toThrow(
			/sommets C possibles sont hors de la fenêtre/
		);
	});

	it('refuse une fenêtre trop allongée pour le rapporteur', () => {
		const source = figure('triangle ABC : CAB = 40 ; ABC = 65', BODY, [], '0 ; 20 ; 0 ; 8');
		expect(() => assertChecks(source)).toThrow(/fenêtre trop allongée/);
	});

	it('refuse le quadrillage', () => {
		expect(errorOf(figure('triangle ABC : CAB = 40 ; ABC = 65', BODY, ['grille: 1']))).toMatch(
			/papier uni/
		);
	});
});

describe('triangle par un côté et deux angles : verdict', () => {
	it('juste : repères à 40° en A et 65° en B, droites, côtés', () => {
		expect(judge(ANGLES, NOMINAL)).toEqual({ status: 'correct' });
	});

	it('juste : de l’autre côté de (AB)', () => {
		expect(judge(ANGLES, built(repere(A, B, 40, -1), repere(B, A, 65, 1)))).toEqual({
			status: 'correct'
		});
	});

	it('juste : base du rapporteur posée n’importe où sur [AB]', () => {
		expect(judge(ANGLES, built(repere(A, { x: 5, y: 3 }, 40, 1), MARK_B))).toEqual({
			status: 'correct'
		});
	});

	it('juste : le côté [AC] tracé directement à travers le repère, sans la règle', () => {
		expect(judge(ANGLES, [MARK_A, MARK_B, LINE_B, segment(A, C), segment(B, C)])).toEqual({
			status: 'correct'
		});
	});

	it('juste : traits et repères en trop ignorés', () => {
		const extra = repere(A, B, 70, 1);
		expect(
			judge(ANGLES, [
				extra,
				droite(A, repereAt(extra)),
				droite({ x: 1, y: 1 }, { x: 11, y: 6 }),
				...NOMINAL
			])
		).toEqual({
			status: 'correct'
		});
	});

	it('faux : aucun côté, un seul, côtés qui ne se rejoignent pas', () => {
		expect(judge(ANGLES, [MARK_A, LINE_A])).toEqual({
			status: 'incorrect',
			feedback: missingSidesFeedback('A', 'B', 'C')
		});
		expect(judge(ANGLES, [MARK_A, LINE_A, segment(A, C)])).toEqual({
			status: 'incorrect',
			feedback: missingSideFeedback('B', 'C')
		});
		expect(judge(ANGLES, [segment(A, C), segment(B, { x: C.x + 1, y: C.y })])).toEqual({
			status: 'incorrect',
			feedback: notJoinedFeedback('A', 'B', 'C')
		});
	});

	it('faux : sommet placé à l’œil (droites sans repère)', () => {
		const lineA = droite(A, { x: 6, y: 6 });
		const lineB = droite(B, { x: 7, y: 6 });
		const [c] = cross(lineA, lineB);
		expect(judge(ANGLES, [lineA, lineB, segment(A, c), segment(B, c)])).toEqual({
			status: 'incorrect',
			feedback: vertexEyeballedAnglesFeedback('C')
		});
	});

	it('faux : un repère seul ne construit pas le sommet (côtés tirés jusqu’à lui)', () => {
		const m = repereAt(MARK_A);
		expect(judge(ANGLES, [MARK_A, segment(A, m), segment(B, m)])).toEqual({
			status: 'incorrect',
			feedback: vertexEyeballedAnglesFeedback('C')
		});
	});

	it('faux : un repère d’un rapporteur posé à l’œil (centre libre) ne porte rien', () => {
		const loose = repere({ x: 3.5, y: 3 }, B, 40, 1);
		expect(judge(ANGLES, built(loose, MARK_B))).toEqual({
			status: 'incorrect',
			feedback: vertexEyeballedAnglesFeedback('C')
		});
	});

	it('faux : un rapporteur centré en A mais à la base posée à l’œil ne porte rien', () => {
		const tilted = repere(A, { x: 5, y: 3.4 }, 35, 1);
		expect(judge(ANGLES, built(tilted, MARK_B))).toEqual({
			status: 'incorrect',
			feedback: vertexEyeballedAnglesFeedback('C')
		});
	});

	it('faux : angles de part et d’autre de [AB]', () => {
		expect(judge(ANGLES, built(MARK_A, repere(B, A, 65, 1)))).toEqual({
			status: 'incorrect',
			feedback: oppositeAnglesFeedback('A', 'B')
		});
	});

	it('faux : mauvaise graduation en B (115° au lieu de 65°)', () => {
		expect(judge(ANGLES, built(MARK_A, repere(B, A, 115, -1)))).toEqual({
			status: 'incorrect',
			feedback: wrongScaleAngleFeedback('ABC', 115, 65)
		});
	});

	it('faux : autre mesure en A', () => {
		expect(judge(ANGLES, built(repere(A, B, 45, 1), MARK_B))).toEqual({
			status: 'incorrect',
			feedback: wrongAngleTriangleFeedback('CAB', 45, 40)
		});
	});

	it('faux sans message : un point placé (réponse forgée)', () => {
		expect(judge(ANGLES, [...NOMINAL, { kind: 'point', x: C.x, y: C.y }])).toEqual({
			status: 'incorrect'
		});
	});
});

describe('deux côtés et l’angle compris', () => {
	const U1 = { x: 1, y: 7 };
	const U2 = { x: 5, y: 7 };
	const SAS = figure('triangle ABC : AC = u ; CAB = 40', [
		...BODY,
		'u = segment(point(1, 7), point(5, 7))'
	]);
	const REPORT = report(A, U1, U2);
	const [C_BELOW, C_ABOVE] = cross(LINE_A, REPORT);

	it('se publie', () => {
		expect(() => assertChecks(SAS)).not.toThrow();
	});

	it('juste : repère, droite, report de u, côtés', () => {
		expect(judge(SAS, [MARK_A, LINE_A, REPORT, segment(A, C_ABOVE), segment(B, C_ABOVE)])).toEqual({
			status: 'correct'
		});
	});

	it('faux : l’autre intersection, à l’opposé du repère', () => {
		expect(judge(SAS, [MARK_A, LINE_A, REPORT, segment(A, C_BELOW), segment(B, C_BELOW)])).toEqual({
			status: 'incorrect',
			feedback: wrongAngleTriangleFeedback('CAB', 140, 40)
		});
	});

	it('faux : mauvaise longueur reportée', () => {
		const wrong = report(A, A, B);
		const [, c] = cross(LINE_A, wrong);
		expect(judge(SAS, [MARK_A, LINE_A, wrong, segment(A, c), segment(B, c)])).toEqual({
			status: 'incorrect',
			feedback: wrongLengthFeedback('A', 'C')
		});
	});

	it('faux : C pris à l’œil sur le côté d’angle', () => {
		const m = repereAt(MARK_A);
		const c = { x: A.x + (m.x - A.x) * 1.5, y: A.y + (m.y - A.y) * 1.5 };
		expect(judge(SAS, [MARK_A, LINE_A, segment(A, c), segment(B, c)])).toEqual({
			status: 'incorrect',
			feedback: vertexEyeballedAnglesFeedback('C')
		});
	});
});

describe('côté d’angle (constructionOf)', () => {
	it('une droite du centre au repère construit sa direction ; le repère seul, rien', () => {
		const base = [A, B];
		const traits: Trait[] = [{ kind: 'segment', a: A, b: B }];
		expect(constructionOf([MARK_A, LINE_A], base, traits).built.has(1)).toBe(true);
		expect(constructionOf([MARK_A], base, traits).isBuilt(repereAt(MARK_A))).toBe(false);
		// Une droite par le repère qui ne part pas du centre : rien
		const off = droite({ x: 4, y: 2 }, repereAt(MARK_A));
		expect(constructionOf([MARK_A, off], base, traits).built.has(1)).toBe(false);
	});
});

describe('triangle par les angles : correction', () => {
	it('côtés vers le C de l’élève, angles codés 40° et 65°', () => {
		const checks = checksOf(ANGLES);
		const points = constructionPositions(ANGLES);
		const shapes = constructionShapes(ANGLES);
		const sides = solutionLines(checks, points, [], shapes);
		expect(sides).toHaveLength(2);
		expect(sides[0].x2).toBeCloseTo(C.x, 9);
		expect(sides[0].y2).toBeCloseTo(C.y, 9);
		const correction = solutionTriangle(checks, points, shapes, []);
		expect(correction?.arcs).toEqual([]);
		expect(correction?.angles.map((g) => [g.center, g.measure, g.sens])).toEqual([
			[A, 40, 1],
			[B, 65, -1]
		]);
	});
});

describe('aide à l’écriture : les exemples du lot 7 se construisent', () => {
	it.each([
		'Construire un triangle par un côté et deux angles (rapporteur)',
		'Construire un triangle par deux côtés et l’angle compris'
	])('%s', async (title) => {
		const { figureACompleterEntry } = await import('$lib/block-catalog/figure-a-completer');
		const example = figureACompleterEntry.examples.find((e) => e.title === title);
		expect(example).toBeDefined();
		const lines = (example?.source ?? '').split('\n');
		const source = lines.slice(1, -1).join('\n');
		expect(() => assertChecks(source)).not.toThrow();
	});
});
