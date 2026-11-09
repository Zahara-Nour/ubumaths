/**
 * Juge d'une case « figure » : carré et rectangle cotés sur papier uni
 * (`verifier: carre A ; B ; C ; D`, `rectangle A ; B ; C ; D : BC = 3 cm`) —
 * chantier `regle-graduee`, PR 6 (`docs/wip/regle-graduee-progress.md` § 8,
 * décisions de David Q11, Q13, Q19, Q20). [AB] est tracé ; l'élève trace les
 * perpendiculaires à l'équerre en B et en A, pose la règle graduée avec son 0 en B
 * (puis en A), arrête [BC] (puis [AD]) sur la graduation, et trace [CD]. Les deux
 * côtés de (AB) sont justes. D peut aussi être pris au croisement de la
 * perpendiculaire en A et de la perpendiculaire à (BC) en C (Q20).
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import {
	ConstructionAuthorError,
	EXTRA_SEGMENT_FEEDBACK,
	NOT_CLOSED_FEEDBACK,
	assertConstructionChecks,
	judgeConstruction
} from '../judge';
import {
	missingSideFeedback,
	sideEyeballedFeedback,
	vertexOffGraduationFeedback,
	wrongRuledLengthFeedback
} from '../triangle';
import { severalPolygonsFeedback } from '../ruled-polygon';
import { isStraight, perpendicularThrough, traitOf, type StraightTrait } from '../instruments';
import { solutionLines, solutionRulers, solutionTriangle } from '../drawing';
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
	body: string[] = SQUARE_BODY,
	header: string[] = [],
	window = '0 ; 12 ; -7 ; 9'
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
const straight = (p: Position, q: Position): StraightTrait => ({ kind: 'segment', a: p, b: q });

/** Le trait droit de la figure qui joint p et q (ce que l'équerre longe) */
function figureTrait(source: string, p: Position, q: Position): StraightTrait {
	const near = (u: Position, v: Position) => Math.hypot(u.x - v.x, u.y - v.y) < 1e-9;
	const trait = constructionShapes(source)
		?.traits.filter(isStraight)
		.find((t) => (near(t.a, p) && near(t.b, q)) || (near(t.a, q) && near(t.b, p)));
	if (!trait) throw new Error('trait introuvable');
	return trait;
}

// Papier uni, fenêtre 12 × 16 (règle de 16 cm) : A(3 ; 1), B(9 ; 1), [AB] = 6 cm
const A = { x: 3, y: 1 };
const B = { x: 9, y: 1 };
const SQUARE_BODY = ['A = point(3, 1)', 'B = point(9, 1)', 's = segment(A, B)'];
const SQUARE = figure('carre A ; B ; C ; D');
const AB = figureTrait(SQUARE, A, B);
/** L'équerre le long de [AB], en B et en A */
const SQUARE_B = perpendicularThrough(AB, B);
const SQUARE_A = perpendicularThrough(AB, A);
const C = { x: 9, y: 7 };
const D = { x: 3, y: 7 };
const C_BELOW = { x: 9, y: -5 };
const D_BELOW = { x: 3, y: -5 };
const NOMINAL: DrawnObject[] = [
	SQUARE_B,
	regle(B, { x: 9, y: 2 }),
	segment(B, C),
	SQUARE_A,
	regle(A, { x: 3, y: 2 }),
	segment(A, D),
	segment(C, D)
];

// Rectangle : A(2 ; 1), B(9 ; 1), [AB] = 7 cm, BC = 3 cm
const RA = { x: 2, y: 1 };
const RB = { x: 9, y: 1 };
const RC = { x: 9, y: 4 };
const RD = { x: 2, y: 4 };
const RECT_BODY = ['A = point(2, 1)', 'B = point(9, 1)', 's = segment(A, B)'];
const RECT = figure('rectangle A ; B ; C ; D : BC = 3 cm', RECT_BODY);
const RAB = figureTrait(RECT, RA, RB);
const RECT_NOMINAL: DrawnObject[] = [
	perpendicularThrough(RAB, RB),
	regle(RB, { x: 9, y: 2 }),
	segment(RB, RC),
	perpendicularThrough(RAB, RA),
	regle(RA, { x: 2, y: 2 }),
	segment(RA, RD),
	segment(RC, RD)
];

describe('carré et rectangle cotés : lecture de l’en-tête', () => {
	it('carré : quatre sommets, palette Segment · Équerre · Règle graduée', () => {
		const { spec, errors } = readConstructionHeader(SQUARE);
		expect(errors).toEqual([]);
		expect(spec.checks).toEqual([
			{ kind: 'carre', points: ['A', 'B', 'C', 'D'], ruled: true, line: 2 }
		]);
		expect(spec.tools).toEqual(['segment', 'equerre', 'regle']);
	});

	it('rectangle : la longueur de [BC] en mm, dans l’unité de l’auteur', () => {
		const { spec, errors } = readConstructionHeader(RECT);
		expect(errors).toEqual([]);
		expect(spec.checks).toEqual([
			{
				kind: 'rectangle',
				points: ['A', 'B', 'C', 'D'],
				ruled: true,
				height: { length: 30, unit: 'cm' },
				line: 2
			}
		]);
		for (const [text, length, unit] of [
			['3 cm 5 mm', 35, 'cm-mm'],
			['35 mm', 35, 'mm'],
			['3,5 cm', 35, 'cm']
		] as const) {
			const read = readConstructionHeader(
				figure(`rectangle A ; B ; C ; D : BC = ${text}`, RECT_BODY)
			);
			expect(read.errors).toEqual([]);
			expect(read.spec.checks[0]).toMatchObject({ height: { length, unit } });
		}
	});

	it('les formes du quadrillage sont inchangées', () => {
		const grid = readConstructionHeader(
			['grille: 1', 'outils: segment', 'verifier: carre A ; B', '---', ...SQUARE_BODY].join('\n')
		);
		expect(grid.errors).toEqual([]);
		expect(grid.spec.checks).toEqual([{ kind: 'carre', points: ['A', 'B'], line: 3 }]);
	});

	it('trois sommets et une longueur : le message d’arité, qui cite la forme du papier uni', () => {
		expect(errorOf(figure('rectangle A ; B ; C : BC = 3 cm', RECT_BODY))).toMatch(
			/attend trois points.*rectangle A ; B ; C ; D : BC = 3 cm/
		);
	});

	it('refuse un rectangle à quatre sommets sans la longueur de [BC]', () => {
		expect(errorOf(figure('rectangle A ; B ; C ; D', RECT_BODY))).toMatch(/BC = 3 cm/);
	});

	it('refuse une longueur sur un autre côté que [BC]', () => {
		expect(errorOf(figure('rectangle A ; B ; C ; D : AB = 3 cm', RECT_BODY))).toMatch(/BC/);
	});

	it('refuse une longueur donnée à un carré', () => {
		expect(errorOf(figure('carre A ; B ; C ; D : BC = 3 cm'))).toMatch(/carré/);
	});

	it('refuse une longueur qui n’est pas au millimètre près', () => {
		expect(errorOf(figure('rectangle A ; B ; C ; D : BC = 3,25 cm', RECT_BODY))).toMatch(
			/millimètre/
		);
	});

	it('refuse le quadrillage', () => {
		expect(errorOf(figure('carre A ; B ; C ; D', SQUARE_BODY, ['grille: 1']))).toMatch(
			/papier uni/
		);
	});

	it('refuse une palette sans l’équerre ou sans la règle graduée', () => {
		expect(errorOf(figure('carre A ; B ; C ; D', SQUARE_BODY, ['outils: segment, regle']))).toMatch(
			/équerre/
		);
		expect(
			errorOf(figure('carre A ; B ; C ; D', SQUARE_BODY, ['outils: segment, equerre']))
		).toMatch(/règle/);
		expect(
			errorOf(
				figure('carre A ; B ; C ; D', SQUARE_BODY, ['outils: segment, equerre, regle, compas'])
			)
		).toMatch(/compas/);
	});

	it('refuse d’autres vérifications dans la même figure', () => {
		const source = [
			'fenetre: 0 ; 12 ; -7 ; 9',
			'verifier: carre A ; B ; C ; D',
			'verifier: droite_par A ; B',
			'---',
			...SQUARE_BODY
		].join('\n');
		expect(errorOf(source)).toMatch(/seul|mêle/);
	});
});

describe('carré et rectangle cotés : refus de l’auteur', () => {
	it('accepte les figures nominales', () => {
		expect(() => assertChecks(SQUARE)).not.toThrow();
		expect(() => assertChecks(RECT)).not.toThrow();
	});

	it('refuse un [AB] qui n’est pas tracé dans la figure (revue de #2508)', () => {
		const bare = figure('carre A ; B ; C ; D', ['A = point(3, 1)', 'B = point(9, 1)']);
		expect(() => assertChecks(bare)).toThrow(/\[AB\] doit être tracé/);
	});

	it('refuse C ou D déjà dans la figure', () => {
		const withC = figure('carre A ; B ; C ; D', [...SQUARE_BODY, 'C = point(9, 7)']);
		expect(() => assertChecks(withC)).toThrow(ConstructionAuthorError);
		expect(() => assertChecks(withC)).toThrow(/C/);
	});

	it('refuse un [AB] qui ne mesure pas un nombre entier de millimètres', () => {
		const odd = figure('carre A ; B ; C ; D', [
			'A = point(3, 1)',
			'B = point(9.05, 1)',
			's = segment(A, B)'
		]);
		expect(() => assertChecks(odd)).toThrow(/millimètre/);
	});

	it('refuse un carré qui ne tient dans la fenêtre d’aucun côté', () => {
		const tight = figure('carre A ; B ; C ; D', SQUARE_BODY, [], '0 ; 12 ; -3 ; 5');
		expect(() => assertChecks(tight)).toThrow(/fenêtre/);
	});

	it('refuse un côté plus long que la règle', () => {
		// Fenêtre 30 × 30 : règle de 20 cm au plus, [AB] = 25 cm
		const long = figure(
			'carre A ; B ; C ; D',
			['A = point(2, 1)', 'B = point(27, 1)', 's = segment(A, B)'],
			[],
			'0 ; 30 ; 0 ; 30'
		);
		expect(() => assertChecks(long)).toThrow(/règle/);
	});
});

describe('carré coté : verdict', () => {
	it('juste : perpendiculaires en B et en A, règles en B et en A, [CD]', () => {
		expect(judge(SQUARE, NOMINAL)).toEqual({ status: 'correct' });
	});

	it('juste de l’autre côté de (AB)', () => {
		const below = [
			SQUARE_B,
			regle(B, { x: 9, y: 0 }),
			segment(B, C_BELOW),
			SQUARE_A,
			regle(A, { x: 3, y: 0 }),
			segment(A, D_BELOW),
			segment(C_BELOW, D_BELOW)
		];
		expect(judge(SQUARE, below)).toEqual({ status: 'correct' });
	});

	it('juste : [CD] tracé en deux morceaux', () => {
		const mid = { x: 6, y: 7 };
		const objects = [...NOMINAL.slice(0, -1), segment(C, mid), segment(mid, D)];
		expect(judge(SQUARE, objects)).toEqual({ status: 'correct' });
	});

	it('Q20 : D au croisement de la perpendiculaire en A et de la perpendiculaire à (BC) en C', () => {
		const objects = [
			SQUARE_B,
			regle(B, { x: 9, y: 2 }),
			segment(B, C),
			perpendicularThrough(straight(B, C), C),
			SQUARE_A,
			segment(A, D),
			segment(C, D)
		];
		expect(judge(SQUARE, objects)).toEqual({ status: 'correct' });
	});

	it('Q20 : la perpendiculaire en C prise le long de la droite tracée à l’équerre en B', () => {
		const objects = [
			SQUARE_B,
			regle(B, { x: 9, y: 2 }),
			segment(B, C),
			perpendicularThrough(traitOf(SQUARE_B) as StraightTrait, C),
			SQUARE_A,
			segment(A, D),
			segment(C, D)
		];
		expect(judge(SQUARE, objects)).toEqual({ status: 'correct' });
	});

	it('Q22 : A d’abord, puis C au croisement de la perpendiculaire en B et de la perpendiculaire à (AD) en D', () => {
		const objects = [
			SQUARE_A,
			regle(A, { x: 3, y: 2 }),
			segment(A, D),
			perpendicularThrough(straight(A, D), D),
			SQUARE_B,
			segment(B, C),
			segment(C, D)
		];
		expect(judge(SQUARE, objects)).toEqual({ status: 'correct' });
	});

	it('Q22 : C au croisement, mais [BC] prolongé : la longueur du trait vu', () => {
		const objects = [
			SQUARE_A,
			regle(A, { x: 3, y: 2 }),
			segment(A, D),
			perpendicularThrough(straight(A, D), D),
			SQUARE_B,
			segment(B, { x: 9, y: 8 }),
			segment(C, D)
		];
		expect(judge(SQUARE, objects)).toMatchObject({
			status: 'incorrect',
			feedback: 'Ton côté [BC] mesure 7 cm au lieu de 6 cm.'
		});
	});

	it('Q20 avec [AD] prolongé au-delà de D : la longueur du trait vu, pas « à l’œil »', () => {
		const objects = [
			SQUARE_B,
			regle(B, { x: 9, y: 2 }),
			segment(B, C),
			perpendicularThrough(straight(B, C), C),
			SQUARE_A,
			segment(A, { x: 3, y: 8 }),
			segment(C, D)
		];
		expect(judge(SQUARE, objects)).toMatchObject({
			status: 'incorrect',
			feedback: 'Ton côté [AD] mesure 7 cm au lieu de 6 cm.'
		});
	});

	it('Q20 : la perpendiculaire en C tracée avant que C soit placé ne construit rien', () => {
		// Sans [BC] arrêté sur la règle, C n'est pas construit : D reste placé à l'œil
		const objects = [
			SQUARE_B,
			segment(B, C),
			perpendicularThrough(straight(B, C), C),
			SQUARE_A,
			segment(A, D),
			segment(C, D)
		];
		expect(judge(SQUARE, objects)).toMatchObject({
			status: 'incorrect',
			feedback: vertexOffGraduationFeedback('B', 'C')
		});
	});

	it('il manque [BC] ou [AD]', () => {
		expect(judge(SQUARE, [SQUARE_A, regle(A, { x: 3, y: 2 }), segment(A, D)])).toMatchObject({
			status: 'incorrect',
			feedback: missingSideFeedback('B', 'C')
		});
		expect(judge(SQUARE, [SQUARE_B, regle(B, { x: 9, y: 2 }), segment(B, C)])).toMatchObject({
			status: 'incorrect',
			feedback: missingSideFeedback('A', 'D')
		});
	});

	it('pas fermée : [CD] manque', () => {
		expect(judge(SQUARE, NOMINAL.slice(0, -1))).toMatchObject({
			status: 'incorrect',
			feedback: NOT_CLOSED_FEEDBACK
		});
	});

	it('sans l’équerre en B : côté [BC] tracé à l’œil', () => {
		const objects = NOMINAL.filter((o) => o !== SQUARE_B);
		expect(judge(SQUARE, objects)).toMatchObject({
			status: 'incorrect',
			feedback: sideEyeballedFeedback('B', 'C')
		});
	});

	it('sans l’équerre en A : côté [AD] tracé à l’œil', () => {
		const objects = NOMINAL.filter((o) => o !== SQUARE_A);
		expect(judge(SQUARE, objects)).toMatchObject({
			status: 'incorrect',
			feedback: sideEyeballedFeedback('A', 'D')
		});
	});

	it('sans règle en B : point C placé à l’œil', () => {
		const objects = NOMINAL.filter((o) => !(o.kind === 'regle' && o.ox === B.x));
		expect(judge(SQUARE, objects)).toMatchObject({
			status: 'incorrect',
			feedback: vertexOffGraduationFeedback('B', 'C')
		});
	});

	it('règle posée en B APRÈS [BC] : point C placé à l’œil', () => {
		const objects = [
			SQUARE_B,
			segment(B, C),
			regle(B, { x: 9, y: 2 }),
			SQUARE_A,
			regle(A, { x: 3, y: 2 }),
			segment(A, D),
			segment(C, D)
		];
		expect(judge(SQUARE, objects)).toMatchObject({
			status: 'incorrect',
			feedback: vertexOffGraduationFeedback('B', 'C')
		});
	});

	it('sans règle en A (ni croisement) : point D placé à l’œil', () => {
		const objects = NOMINAL.filter((o) => !(o.kind === 'regle' && o.ox === A.x));
		expect(judge(SQUARE, objects)).toMatchObject({
			status: 'incorrect',
			feedback: vertexOffGraduationFeedback('A', 'D')
		});
	});

	it('mauvaise graduation en B : la longueur lue', () => {
		const shortC = { x: 9, y: 6.8 };
		const shortD = { x: 3, y: 6.8 };
		const objects = [
			SQUARE_B,
			regle(B, { x: 9, y: 2 }),
			segment(B, shortC),
			SQUARE_A,
			regle(A, { x: 3, y: 2 }),
			segment(A, shortD),
			segment(shortC, shortD)
		];
		expect(judge(SQUARE, objects)).toMatchObject({
			status: 'incorrect',
			feedback: wrongRuledLengthFeedback('B', 'C', 58, { length: 60, unit: 'cm' })
		});
		expect(wrongRuledLengthFeedback('B', 'C', 58, { length: 60, unit: 'cm' })).toBe(
			'Ton côté [BC] mesure 5,8 cm au lieu de 6 cm.'
		);
	});

	it('[AD] à la mauvaise graduation (C juste) : la longueur de [AD]', () => {
		const shortD = { x: 3, y: 6.8 };
		const objects = [
			SQUARE_B,
			regle(B, { x: 9, y: 2 }),
			segment(B, C),
			SQUARE_A,
			regle(A, { x: 3, y: 2 }),
			segment(A, shortD),
			segment(C, shortD)
		];
		expect(judge(SQUARE, objects)).toMatchObject({
			status: 'incorrect',
			feedback: wrongRuledLengthFeedback('A', 'D', 58, { length: 60, unit: 'cm' })
		});
	});

	it('[BC] prolongé au-delà de C : la longueur du trait vu', () => {
		const beyond = { x: 9, y: 8 };
		const objects = [...NOMINAL, segment(C, beyond)];
		expect(judge(SQUARE, objects)).toMatchObject({
			status: 'incorrect',
			feedback: 'Ton côté [BC] mesure 7 cm au lieu de 6 cm.'
		});
	});

	it('deux carrés, un de chaque côté : faux, un seul carré', () => {
		const objects = [
			...NOMINAL,
			regle(B, { x: 9, y: 0 }),
			segment(B, C_BELOW),
			regle(A, { x: 3, y: 0 }),
			segment(A, D_BELOW),
			segment(C_BELOW, D_BELOW)
		];
		expect(judge(SQUARE, objects)).toMatchObject({
			status: 'incorrect',
			feedback: severalPolygonsFeedback('carre', ['A', 'B', 'C', 'D'])
		});
		expect(severalPolygonsFeedback('carre', ['A', 'B', 'C', 'D'])).toBe(
			'Trace un seul carré ABCD.'
		);
	});

	it('un trait de trop', () => {
		const objects = [...NOMINAL, segment({ x: 5, y: 3 }, { x: 6, y: 4 })];
		expect(judge(SQUARE, objects)).toMatchObject({
			status: 'incorrect',
			feedback: EXTRA_SEGMENT_FEEDBACK
		});
	});

	it('un compas (hors palette) : réponse forgée', () => {
		const forged: DrawnObject = { kind: 'cercle', cx: B.x, cy: B.y, x: C.x, y: C.y };
		expect(judge(SQUARE, [...NOMINAL, forged])).toEqual({ status: 'incorrect' });
	});
});

describe('rectangle coté : verdict', () => {
	it('juste : 3 cm en B et en A', () => {
		expect(judge(RECT, RECT_NOMINAL)).toEqual({ status: 'correct' });
	});

	it('un carré à la place : [BC] mesure 7 cm au lieu de 3 cm', () => {
		const sc = { x: 9, y: 8 };
		const sd = { x: 2, y: 8 };
		const objects = [
			perpendicularThrough(RAB, RB),
			regle(RB, { x: 9, y: 2 }),
			segment(RB, sc),
			perpendicularThrough(RAB, RA),
			regle(RA, { x: 2, y: 2 }),
			segment(RA, sd),
			segment(sc, sd)
		];
		expect(judge(RECT, objects)).toMatchObject({
			status: 'incorrect',
			feedback: 'Ton côté [BC] mesure 7 cm au lieu de 3 cm.'
		});
	});

	it('deux rectangles : un seul rectangle', () => {
		expect(severalPolygonsFeedback('rectangle', ['A', 'B', 'C', 'D'])).toBe(
			'Trace un seul rectangle ABCD.'
		);
	});
});

describe('carré et rectangle cotés : correction', () => {
	it('les trois côtés qui manquent, du côté où l’élève a tracé', () => {
		const source = SQUARE;
		const lines = solutionLines(
			checksOf(source),
			constructionPositions(source),
			[segment(B, C_BELOW)],
			constructionShapes(source)
		);
		expect(lines).toHaveLength(3);
		expect(lines.every((l) => l.kind === 'segment')).toBe(true);
		expect(lines.every((l) => l.y1 <= 1 + 1e-9 && l.y2 <= 1 + 1e-9)).toBe(true);
	});

	it('sans tracé : au-dessus', () => {
		const source = SQUARE;
		const lines = solutionLines(
			checksOf(source),
			constructionPositions(source),
			[],
			constructionShapes(source)
		);
		expect(lines).toHaveLength(3);
		expect(Math.max(...lines.flatMap((l) => [l.y1, l.y2]))).toBeCloseTo(7, 9);
	});

	it('deux règles : 0 en B vers C, 0 en A vers D', () => {
		const source = RECT;
		const rulers = solutionRulers(
			checksOf(source),
			constructionPositions(source),
			constructionShapes(source),
			[]
		);
		expect(rulers).toEqual([
			{ kind: 'regle', ox: 9, oy: 1, bx: 9, by: 4, sens: 1 },
			{ kind: 'regle', ox: 2, oy: 1, bx: 2, by: 4, sens: 1 }
		]);
	});

	it('les perpendiculaires à l’équerre et les deux angles droits ; ni arc ni codage', () => {
		const source = SQUARE;
		const correction = solutionTriangle(
			checksOf(source),
			constructionPositions(source),
			constructionShapes(source),
			[]
		);
		expect(correction).toMatchObject({ arcs: [], marks: [], angles: [] });
		expect(correction?.guides).toHaveLength(2);
		expect(correction?.rightAngles).toHaveLength(2);
	});
});
