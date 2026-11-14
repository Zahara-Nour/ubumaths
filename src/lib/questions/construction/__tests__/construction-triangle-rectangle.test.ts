/**
 * Juge d'une case « figure » : construire un triangle rectangle
 * (`verifier: triangle ABC : CAB = 90 ; AC = u`, `CAB = 90` seul, et sur
 * quadrillage `AC = 3 carreaux` ou `AC = AB`) — chantier
 * `cercle-triangle-rectangle`, n° 20, phase 0 validée par David le 2026-11-08
 * (`docs/wip/cercle-triangle-rectangle-progress.md` § 1 et § 3).
 *
 * Papier uni : l'angle droit se construit à l'équerre le long de (AB) en A ; la
 * longueur au Report piqué en A ; C au croisement. Quadrillage : sans
 * instrument, de nœud en nœud.
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { ConstructionAuthorError, assertConstructionChecks, judgeConstruction } from '../judge';
import {
	missingSideFeedback,
	missingSidesFeedback,
	notRightFeedback,
	sideEyeballedFeedback,
	vertexEyeballedFeedback,
	wrongLengthFeedback,
	wrongSquaresFeedback,
	notJoinedFeedback
} from '../triangle';
import { isStraight, perpendicularThrough, type StraightTrait } from '../instruments';
import { solutionLines, solutionTriangle } from '../drawing';
import { serializeConstructionAnswer, type DrawnObject } from '../answer';
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
const report = (center: Position, a: Position, b: Position): DrawnObject => ({
	kind: 'report',
	cx: center.x,
	cy: center.y,
	ax: a.x,
	ay: a.y,
	bx: b.x,
	by: b.y
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

// Papier uni : A(3 ; 3), B(9 ; 3), u de longueur 3, v de longueur 2
const A = { x: 3, y: 3 };
const B = { x: 9, y: 3 };
const U = [
	{ x: 1, y: 7 },
	{ x: 4, y: 7 }
] as const;
const V = [
	{ x: 6, y: 7 },
	{ x: 8, y: 7 }
] as const;
const BODY = [
	'A = point(3, 3)',
	'B = point(9, 3)',
	's = segment(A, B)',
	'u = segment(point(1, 7), point(4, 7))',
	'v = segment(point(6, 7), point(8, 7))'
];
const RIGHT = figure('triangle ABC : CAB = 90 ; AC = u');
const ALONE = figure('triangle ABC : CAB = 90');
/** L'équerre le long de [AB], en A */
const SQUARE_A = perpendicularThrough(figureTrait(RIGHT, A, B), A);
const C = { x: 3, y: 6 };
const C_BELOW = { x: 3, y: 0 };
const NOMINAL: DrawnObject[] = [SQUARE_A, report(A, U[0], U[1]), segment(A, C), segment(B, C)];

// Quadrillage : A(2 ; 2), B(7 ; 2) sur une ligne ; D(5 ; 3) pour une oblique
const GRID_BODY = ['A = point(2, 2)', 'B = point(7, 2)', 's = segment(A, B)'];
const GRID = ['grille: 1'];
const GRID_WINDOW = '0 ; 10 ; 0 ; 8';
const GA = { x: 2, y: 2 };
const GB = { x: 7, y: 2 };
const SQUARES = figure('triangle ABC : CAB = 90 ; AC = 3 carreaux', GRID_BODY, GRID, GRID_WINDOW);
const OBLIQUE_BODY = ['A = point(2, 2)', 'B = point(5, 3)', 's = segment(A, B)'];
const OB = { x: 5, y: 3 };
const OBLIQUE = figure('triangle ABC : CAB = 90 ; AC = AB', OBLIQUE_BODY, GRID, GRID_WINDOW);

describe('triangle rectangle : lecture de l’en-tête', () => {
	it('lit l’angle droit et la longueur ; palette Segment · Équerre · Report', () => {
		const { spec, errors } = readConstructionHeader(RIGHT);
		expect(errors).toEqual([]);
		expect(spec.checks).toEqual([
			{
				kind: 'triangle',
				points: ['A', 'B', 'C'],
				lengths: [{ side: ['A', 'C'], source: ['u'] }],
				angles: [{ vertex: 'A', base: 'B', measure: 90 }],
				line: 2
			}
		]);
		expect(spec.tools).toEqual(['segment', 'equerre', 'report']);
	});

	it('l’angle droit seul : palette Segment · Équerre', () => {
		const { spec, errors } = readConstructionHeader(ALONE);
		expect(errors).toEqual([]);
		expect(spec.checks[0]).toMatchObject({
			lengths: [],
			angles: [{ vertex: 'A', base: 'B', measure: 90 }]
		});
		expect(spec.tools).toEqual(['segment', 'equerre']);
	});

	it('l’angle droit en B, « ° » permis, données dans l’autre ordre', () => {
		const { spec, errors } = readConstructionHeader(figure('triangle ABC : BC = u ; ABC = 90°'));
		expect(errors).toEqual([]);
		expect(spec.checks[0]).toMatchObject({
			lengths: [{ side: ['B', 'C'], source: ['u'] }],
			angles: [{ vertex: 'B', base: 'A', measure: 90 }]
		});
	});

	it('quadrillage : une longueur en carreaux ; palette Segment seul', () => {
		const { spec, errors } = readConstructionHeader(SQUARES);
		expect(errors).toEqual([]);
		expect(spec.checks[0]).toMatchObject({ lengths: [{ side: ['A', 'C'], squares: 3 }] });
		expect(spec.tools).toEqual(['segment']);
		const one = readConstructionHeader(
			figure('triangle ABC : CAB = 90 ; AC = 1 carreau', GRID_BODY, GRID, GRID_WINDOW)
		);
		expect(one.errors).toEqual([]);
		expect(one.spec.checks[0]).toMatchObject({ lengths: [{ side: ['A', 'C'], squares: 1 }] });
	});

	it('quadrillage : AC = AB et l’angle droit seul', () => {
		expect(readConstructionHeader(OBLIQUE).errors).toEqual([]);
		const alone = readConstructionHeader(
			figure('triangle ABC : CAB = 90', OBLIQUE_BODY, GRID, GRID_WINDOW)
		);
		expect(alone.errors).toEqual([]);
		expect(alone.spec.tools).toEqual(['segment']);
	});

	it('refuse le report d’un segment sur quadrillage', () => {
		expect(
			errorOf(
				figure(
					'triangle ABC : CAB = 90 ; AC = u',
					[...GRID_BODY, 'u = segment(point(1, 7), point(4, 7))'],
					GRID,
					GRID_WINDOW
				)
			)
		).toMatch(/quadrillage.*carreaux/);
	});

	it('refuse les carreaux sans quadrillage', () => {
		expect(errorOf(figure('triangle ABC : CAB = 90 ; AC = 3 carreaux'))).toMatch(/quadrillage/);
	});

	it('refuse les carreaux hors du triangle rectangle', () => {
		expect(
			errorOf(
				figure('triangle ABC : AC = 3 carreaux ; BC = 4 carreaux', GRID_BODY, GRID, GRID_WINDOW)
			)
		).toMatch(/carreaux/);
	});

	it('refuse 0 carreau', () => {
		expect(
			errorOf(figure('triangle ABC : CAB = 90 ; AC = 0 carreau', GRID_BODY, GRID, GRID_WINDOW))
		).toMatch(/carreau/);
	});

	it('refuse l’hypoténuse donnée', () => {
		expect(errorOf(figure('triangle ABC : CAB = 90 ; BC = u'))).toMatch(/angle droit en A/);
	});

	it('refuse l’angle droit avec un autre angle', () => {
		expect(errorOf(figure('triangle ABC : CAB = 90 ; ABC = 40'))).toMatch(/angle droit/);
	});

	it('refuse un angle seul qui n’est pas droit', () => {
		expect(errorOf(figure('triangle ABC : CAB = 40'))).toMatch(/deux données/);
	});

	it('refuse le rapporteur, et une palette sans équerre', () => {
		expect(
			errorOf(
				figure('triangle ABC : CAB = 90 ; AC = u', BODY, [
					'outils: segment, equerre, report, rapporteur'
				])
			)
		).toMatch(/rapporteur/);
		expect(
			errorOf(figure('triangle ABC : CAB = 90 ; AC = u', BODY, ['outils: segment, report']))
		).toMatch(/équerre/);
	});
});

describe('triangle rectangle : erreurs d’auteur', () => {
	it('papier uni et quadrillage se publient', () => {
		expect(() => assertChecks(RIGHT)).not.toThrow();
		expect(() => assertChecks(ALONE)).not.toThrow();
		expect(() => assertChecks(SQUARES)).not.toThrow();
		expect(() => assertChecks(OBLIQUE)).not.toThrow();
	});

	it('refuse des carreaux quand [AB] ne suit pas le quadrillage', () => {
		const source = figure(
			'triangle ABC : CAB = 90 ; AC = 3 carreaux',
			OBLIQUE_BODY,
			GRID,
			GRID_WINDOW
		);
		expect(() => assertChecks(source)).toThrow(ConstructionAuthorError);
		expect(() => assertChecks(source)).toThrow(/ne suit pas le quadrillage/);
	});

	it('refuse A hors d’un nœud sur quadrillage', () => {
		const source = figure(
			'triangle ABC : CAB = 90 ; AC = AB',
			['A = point(2.5, 2)', 'B = point(7, 2)', 's = segment(A, B)'],
			GRID,
			GRID_WINDOW
		);
		expect(() => assertChecks(source)).toThrow(/nœud/);
	});

	it('refuse les deux sommets C hors de la fenêtre', () => {
		const source = figure('triangle ABC : CAB = 90 ; AC = AB');
		expect(() => assertChecks(source)).toThrow(/hors de la fenêtre/);
	});
});

describe('triangle rectangle sur papier uni : verdict', () => {
	it('juste : équerre en A, report de u en A, côtés', () => {
		expect(judge(RIGHT, NOMINAL)).toEqual({ status: 'correct' });
	});

	it('juste : de l’autre côté de (AB)', () => {
		const objects = [SQUARE_A, report(A, U[0], U[1]), segment(A, C_BELOW), segment(B, C_BELOW)];
		expect(judge(RIGHT, objects)).toEqual({ status: 'correct' });
	});

	it('juste : l’angle droit en B', () => {
		const source = figure('triangle ABC : ABC = 90 ; BC = u');
		const square = perpendicularThrough(figureTrait(source, A, B), B);
		const c = { x: 9, y: 6 };
		const objects = [square, report(B, U[0], U[1]), segment(A, c), segment(B, c)];
		expect(judge(source, objects)).toEqual({ status: 'correct' });
	});

	it('juste : l’angle droit seul, C n’importe où sur la perpendiculaire', () => {
		const c = { x: 3, y: 5.25 };
		expect(judge(ALONE, [SQUARE_A, segment(A, c), segment(B, c)])).toEqual({
			status: 'correct'
		});
	});

	it('faux : côtés manquants (messages du triangle)', () => {
		expect(judge(RIGHT, [SQUARE_A, report(A, U[0], U[1])])).toEqual({
			status: 'incorrect',
			feedback: missingSidesFeedback('A', 'B', 'C')
		});
		expect(judge(RIGHT, [SQUARE_A, report(A, U[0], U[1]), segment(A, C)])).toEqual({
			status: 'incorrect',
			feedback: missingSideFeedback('B', 'C')
		});
	});

	it('faux : côté [AC] tracé à l’œil, sans équerre', () => {
		const objects = [report(A, U[0], U[1]), segment(A, C), segment(B, C)];
		expect(judge(RIGHT, objects)).toEqual({
			status: 'incorrect',
			feedback: sideEyeballedFeedback('A', 'C')
		});
		expect(judge(ALONE, [segment(A, C), segment(B, C)])).toEqual({
			status: 'incorrect',
			feedback: sideEyeballedFeedback('A', 'C')
		});
	});

	it('faux : l’équerre le long d’un autre trait, l’angle n’est pas droit', () => {
		const body = [...BODY, 't = segment(point(0, 0), point(2, 1))'];
		const source = figure('triangle ABC : CAB = 90', body);
		const square = perpendicularThrough(figureTrait(source, { x: 0, y: 0 }, { x: 2, y: 1 }), A);
		// Sur cette droite (direction (−1 ; 2)), au-dessus de A
		const c = { x: 2, y: 5 };
		expect(judge(source, [square, segment(A, c), segment(B, c)])).toEqual({
			status: 'incorrect',
			feedback: notRightFeedback('A', 'B', false)
		});
	});

	it('faux : C sur la perpendiculaire, hors du croisement du report', () => {
		const c = { x: 3, y: 5 };
		const objects = [SQUARE_A, report(A, U[0], U[1]), segment(A, c), segment(B, c)];
		expect(judge(RIGHT, objects)).toEqual({
			status: 'incorrect',
			feedback: vertexEyeballedFeedback('C')
		});
	});

	it('faux : report d’une autre longueur', () => {
		const c = { x: 3, y: 5 };
		const objects = [SQUARE_A, report(A, V[0], V[1]), segment(A, c), segment(B, c)];
		expect(judge(RIGHT, objects)).toEqual({
			status: 'incorrect',
			feedback: wrongLengthFeedback('A', 'C')
		});
	});

	it('faux sans message : un point placé (réponse forgée)', () => {
		const objects: DrawnObject[] = [...NOMINAL, { kind: 'point', x: C.x, y: C.y }];
		expect(judge(RIGHT, objects)).toEqual({ status: 'incorrect' });
	});
});

describe('triangle rectangle sur quadrillage : verdict', () => {
	it('juste : AC de 3 carreaux sur la ligne', () => {
		const c = { x: 2, y: 5 };
		expect(judge(SQUARES, [segment(GA, c), segment(GB, c)])).toEqual({ status: 'correct' });
	});

	it('faux : 4 carreaux au lieu de 3', () => {
		const c = { x: 2, y: 6 };
		expect(judge(SQUARES, [segment(GA, c), segment(GB, c)])).toEqual({
			status: 'incorrect',
			feedback: wrongSquaresFeedback('A', 'C', 4, 3)
		});
	});

	it('faux : l’angle en A n’est pas droit', () => {
		const c = { x: 3, y: 5 };
		expect(judge(SQUARES, [segment(GA, c), segment(GB, c)])).toEqual({
			status: 'incorrect',
			feedback: notRightFeedback('A', 'B', true)
		});
	});

	it('juste : oblique, AC = AB (pas (3 ; 1) → (−1 ; 3))', () => {
		const c = { x: 1, y: 5 };
		expect(judge(OBLIQUE, [segment(GA, c), segment(OB, c)])).toEqual({ status: 'correct' });
	});

	it('faux : oblique, AC trop long', () => {
		const c = { x: 0, y: 8 };
		expect(judge(OBLIQUE, [segment(GA, c), segment(OB, c)])).toEqual({
			status: 'incorrect',
			feedback: wrongLengthFeedback('A', 'C')
		});
	});

	it('juste : l’angle droit seul, C sur un nœud de la perpendiculaire', () => {
		const source = figure('triangle ABC : CAB = 90', OBLIQUE_BODY, GRID, GRID_WINDOW);
		const c = { x: 0, y: 8 };
		expect(judge(source, [segment(GA, c), segment(OB, c)])).toEqual({ status: 'correct' });
	});
});

describe('triangle rectangle : correction', () => {
	it('papier uni : côtés, angle droit codé, perpendiculaire et arc en traits fins', () => {
		const checks = checksOf(RIGHT);
		const points = constructionPositions(RIGHT);
		const shapes = constructionShapes(RIGHT);
		const sides = solutionLines(checks, points, [], shapes);
		expect(sides).toHaveLength(2);
		expect(sides[0].x2).toBeCloseTo(C.x, 9);
		expect(sides[0].y2).toBeCloseTo(C.y, 9);
		const correction = solutionTriangle(checks, points, shapes, []);
		expect(correction?.arcs).toEqual([{ center: A, radius: 3 }]);
		expect(correction?.angles).toEqual([]);
		expect(correction?.rightAngles).toHaveLength(1);
		expect(correction?.rightAngles[0].center).toEqual(A);
		expect(correction?.guides).toHaveLength(1);
		const [guide] = correction?.guides ?? [];
		expect(guide.x1).toBeCloseTo(A.x, 9);
		expect(guide.x2).toBeCloseTo(A.x, 9);
	});

	it('angle droit seul : vers le C de l’élève', () => {
		const checks = checksOf(ALONE);
		const points = constructionPositions(ALONE);
		const shapes = constructionShapes(ALONE);
		const c = { x: 3, y: 5.25 };
		const sides = solutionLines(checks, points, [segment(A, c)], shapes);
		expect(sides[0].x2).toBeCloseTo(c.x, 9);
		expect(sides[0].y2).toBeCloseTo(c.y, 9);
	});

	it('quadrillage : côtés et angle droit codé, sans arc ni perpendiculaire', () => {
		const checks = checksOf(SQUARES);
		const points = constructionPositions(SQUARES);
		const shapes = constructionShapes(SQUARES);
		const sides = solutionLines(checks, points, [], shapes);
		expect(sides[0].x2).toBeCloseTo(2, 9);
		expect(sides[0].y2).toBeCloseTo(5, 9);
		const correction = solutionTriangle(checks, points, shapes, []);
		expect(correction?.arcs).toEqual([]);
		expect(correction?.marks).toEqual([]);
		expect(correction?.guides).toEqual([]);
		expect(correction?.rightAngles).toHaveLength(1);
	});
});

describe('aide à l’écriture : les exemples du n° 20 se construisent', () => {
	it.each([
		'Construire un triangle rectangle à l’équerre',
		'Construire un triangle rectangle sur quadrillage'
	])('%s', async (title) => {
		const { figureACompleterEntry } = await import('$lib/block-catalog/figure-a-completer');
		const example = figureACompleterEntry.examples.find((e) => e.title === title);
		expect(example).toBeDefined();
		const lines = (example?.source ?? '').split('\n');
		const source = lines.slice(1, -1).join('\n');
		expect(() => assertChecks(source)).not.toThrow();
	});
});

describe('triangle rectangle : génération d’une question', () => {
	it('une longueur en carreaux n’a aucun point à nommer', async () => {
		const { generateInstance } = await import('$lib/questions/generator/instance-generator');
		const { templateMarkdown } = await import('$lib/ubumark');
		const block = ['```figure-a-completer', SQUARES, '```'].join('\n');
		const template = {
			id: 'test-triangle-rectangle',
			title: 'Triangle rectangle',
			status: 'draft',
			type: 'fill_in_blanks',
			variations: [{ statement: templateMarkdown(`Construis le triangle.\n\n${block}`) }],
			grades: ['CE2'],
			level: 1
		} as unknown as import('$lib/questions/types').QuestionTemplate;
		const result = generateInstance(template, 42);
		expect(result.success ? [] : result.errors).toEqual([]);
	});
});

describe('triangle rectangle : revue', () => {
	it('quadrillage, angle droit seul : la correction va vers le nœud proche du C de l’élève, pas collé à A', () => {
		const source = figure('triangle ABC : CAB = 90', GRID_BODY, GRID, GRID_WINDOW);
		const c = { x: 4, y: 6 };
		const sides = solutionLines(
			checksOf(source),
			constructionPositions(source),
			[segment(GA, c), segment(GB, c)],
			constructionShapes(source)
		);
		expect(sides[0].x2).toBeCloseTo(2, 9);
		expect(sides[0].y2).toBeCloseTo(6, 9);
	});

	it('papier uni, angle droit seul : refuse une perpendiculaire qui sort de la fenêtre', () => {
		const source = figure('triangle ABC : CAB = 90', [
			'A = point(0, 0)',
			'B = point(5, 5)',
			's = segment(A, B)'
		]);
		expect(() => assertChecks(source)).toThrow(/perpendiculaire.*sort de la fenêtre/);
	});
});

describe('revue de #2665 : côtés qui ne se rejoignent pas, sans rapporteur', () => {
	it('papier uni : [AC] au-delà de C sur la perpendiculaire, [BC] arrêté en C → « doivent se rejoindre »', () => {
		expect(judge(RIGHT, [SQUARE_A, segment(A, { x: 3, y: 7 }), segment(B, C)])).toEqual({
			status: 'incorrect',
			feedback: notJoinedFeedback('A', 'B', 'C')
		});
	});

	it('quadrillage : même message, pas le rapporteur', () => {
		expect(judge(SQUARES, [segment(GA, { x: 2, y: 6 }), segment(GB, { x: 2, y: 5 })])).toEqual({
			status: 'incorrect',
			feedback: notJoinedFeedback('A', 'B', 'C')
		});
	});
});
