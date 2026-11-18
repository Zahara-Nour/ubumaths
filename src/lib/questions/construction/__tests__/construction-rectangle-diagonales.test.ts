/**
 * Juge d'une case « figure » : rectangle sans équerre
 * (`verifier: rectangle A ; B ; C ; D : AB = 4 cm ; AC = 6 cm`) — chantier
 * `rectangle-sans-equerre`, phase 0 validée par David le 2026-11-17
 * (`docs/wip/rectangle-sans-equerre-progress.md` § 3). La diagonale [AC] est
 * tracée ; l'élève construit B et D au compas et à la règle graduée, par les
 * diagonales (même milieu, même longueur). Le juge regarde le résultat : B et D
 * construits, ABCD rectangle avec AB = 4 cm. Les deux côtés de (AC) sont justes.
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import {
	EXTRA_SEGMENT_FEEDBACK,
	NOT_CLOSED_FEEDBACK,
	OVERSHOOT_FEEDBACK,
	assertConstructionChecks,
	judgeConstruction
} from '../judge';
import {
	DIAGONALS_LENGTH_FEEDBACK,
	DIAGONALS_MIDDLE_FEEDBACK,
	diagonalRectangleSidesFeedback,
	notExactSideFeedback,
	rightAngleOnCircleFeedback,
	severalDiagonalRectanglesFeedback,
	vertexEyeballedRulerFeedback
} from '../diagonal-rectangle';
import { wrongRuledLengthFeedback } from '../triangle';
import { intersectTraits, rulerGraduation, traitOf, type Trait } from '../instruments';
import { solutionLines, solutionRulers, solutionTriangle } from '../drawing';
import {
	serializeConstructionAnswer,
	type DrawnCircle,
	type DrawnObject,
	type DrawnRegle
} from '../answer';
import type { Position } from '../judge';
import { readConstructionHeader } from '#lib/ubumark/parser/construction-parser.ts';

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

const BODY = ['A = point(3, 4.5)', 'C = point(9, 4.5)', 'd = segment(A, C)'];
const VERIFIER = 'rectangle A ; B ; C ; D : AB = 4 cm ; AC = 6 cm';

function figure(
	verifier = VERIFIER,
	body: string[] = BODY,
	header: string[] = [],
	window = '0 ; 12 ; 0 ; 9'
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
/** Compas piqué en `center`, passant par `through` */
const cercle = (center: Position, through: Position): DrawnCircle => ({
	kind: 'cercle',
	cx: center.x,
	cy: center.y,
	x: through.x,
	y: through.y
});
/** Compas ouvert sur la graduation `mm` d'une règle posée (son 0 au centre) */
const compasSurRegle = (ruler: DrawnRegle, mm: number): DrawnCircle =>
	cercle({ x: ruler.ox, y: ruler.oy }, rulerGraduation(ruler, mm));

const traitOfObject = (o: DrawnObject): Trait => {
	const t = traitOf(o);
	if (!t) throw new Error('pas un trait');
	return t;
};
/** Le croisement de deux traits que choisit `pick` (ce que fait l'aimantation) */
function crossing(p: Trait, q: Trait, pick: (x: Position) => boolean): Position {
	const found = intersectTraits(p, q).find(pick);
	if (!found) throw new Error('pas de croisement');
	return found;
}

const A = { x: 3, y: 4.5 };
const C = { x: 9, y: 4.5 };
const AC_TRAIT: Trait = { kind: 'segment', a: A, b: C };
const SOURCE = figure();
const above = (p: Position) => p.y > 4.5 + 1e-6;
const below = (p: Position) => p.y < 4.5 - 1e-6;

// M1 : compas ouvert à 3 cm en A → O ; cercle de centre O passant par A ; compas à 4 cm en A → B
const RULER_A = regle(A, C);
const COMPASS_3 = compasSurRegle(RULER_A, 30);
const O = crossing(traitOfObject(COMPASS_3), AC_TRAIT, () => true);
const CIRCLE_O = cercle(O, A);
const COMPASS_4 = compasSurRegle(RULER_A, 40);
const B = crossing(traitOfObject(COMPASS_4), traitOfObject(CIRCLE_O), above);
const B_BELOW = crossing(traitOfObject(COMPASS_4), traitOfObject(CIRCLE_O), below);
const RULER_B = regle(B, O);
const D = rulerGraduation(RULER_B, 60);
const RULER_B_BELOW = regle(B_BELOW, O);
const D_ABOVE = rulerGraduation(RULER_B_BELOW, 60);

const CONSTRUCTION: DrawnObject[] = [RULER_A, COMPASS_3, CIRCLE_O, COMPASS_4];
const NOMINAL: DrawnObject[] = [
	...CONSTRUCTION,
	segment(A, B),
	segment(B, C),
	RULER_B,
	segment(B, D),
	segment(C, D),
	segment(D, A)
];

describe('rectangle sans équerre : lecture de l’en-tête', () => {
	it('le côté [AB] et la diagonale [AC] en mm ; palette Segment · Compas · Règle graduée', () => {
		const { spec, errors } = readConstructionHeader(SOURCE);
		expect(errors).toEqual([]);
		expect(spec.checks).toEqual([
			{
				kind: 'rectangle',
				points: ['A', 'B', 'C', 'D'],
				side: { length: 40, unit: 'cm' },
				diagonal: { length: 60, unit: 'cm' },
				line: 2
			}
		]);
		expect(spec.tools).toEqual(['segment', 'compas', 'regle']);
	});

	it('les deux longueurs dans n’importe quel ordre, CA et BA admis, unités de l’auteur', () => {
		const read = readConstructionHeader(
			figure('rectangle A ; B ; C ; D : CA = 60 mm ; BA = 3 cm 5 mm')
		);
		expect(read.errors).toEqual([]);
		expect(read.spec.checks[0]).toMatchObject({
			side: { length: 35, unit: 'cm-mm' },
			diagonal: { length: 60, unit: 'mm' }
		});
	});

	it('le rectangle à l’équerre (BC = 3 cm) est inchangé', () => {
		const read = readConstructionHeader(
			figure('rectangle A ; B ; C ; D : BC = 3 cm', [
				'A = point(2, 1)',
				'B = point(9, 1)',
				's = segment(A, B)'
			])
		);
		expect(read.errors).toEqual([]);
		expect(read.spec.checks[0]).toMatchObject({ ruled: true, height: { length: 30 } });
	});

	it('refuse une diagonale seule, ou une autre diagonale que [AC]', () => {
		expect(errorOf(figure('rectangle A ; B ; C ; D : AC = 6 cm'))).toMatch(
			/donner le côté \[AB\] et la diagonale \[AC\]/
		);
		expect(errorOf(figure('rectangle A ; B ; C ; D : AB = 4 cm ; BD = 6 cm'))).toMatch(
			/donner le côté \[AB\] et la diagonale \[AC\]/
		);
	});

	it('refuse un autre côté que [AB]', () => {
		expect(errorOf(figure('rectangle A ; B ; C ; D : BC = 4 cm ; AC = 6 cm'))).toMatch(
			/le côté donné est \[AB\]/
		);
	});

	it('refuse un côté aussi long que la diagonale', () => {
		expect(errorOf(figure('rectangle A ; B ; C ; D : AB = 6 cm ; AC = 6 cm'))).toMatch(
			/plus court que la diagonale/
		);
	});

	it('refuse une longueur qui n’est pas au millimètre près', () => {
		expect(errorOf(figure('rectangle A ; B ; C ; D : AB = 4,25 cm ; AC = 6 cm'))).toMatch(
			/millimètre/
		);
	});

	it('refuse le quadrillage', () => {
		expect(errorOf(figure(VERIFIER, BODY, ['grille: 1']))).toMatch(/papier uni/);
	});

	it('refuse l’équerre, le report ou le rapporteur ; exige le compas et la règle', () => {
		for (const tools of [
			'segment, compas, regle, equerre',
			'segment, compas, regle, report',
			'segment, compas, regle, rapporteur'
		]) {
			expect(errorOf(figure(VERIFIER, BODY, [`outils: ${tools}`]))).toMatch(/hors de la palette/);
		}
		expect(errorOf(figure(VERIFIER, BODY, ['outils: segment, regle']))).toMatch(/compas/);
		expect(errorOf(figure(VERIFIER, BODY, ['outils: segment, compas']))).toMatch(/règle/);
	});

	it('refuse d’autres vérifications dans la même figure', () => {
		const source = [
			'fenetre: 0 ; 12 ; 0 ; 9',
			`verifier: ${VERIFIER}`,
			'verifier: droite_par A ; C',
			'---',
			...BODY
		].join('\n');
		expect(errorOf(source)).toMatch(/mêle/);
	});
});

describe('rectangle sans équerre : refus de l’auteur', () => {
	it('accepte la figure nominale', () => {
		expect(() => assertChecks(SOURCE)).not.toThrow();
	});

	it('refuse une diagonale [AC] qui n’est pas tracée', () => {
		const bare = figure(VERIFIER, ['A = point(3, 4.5)', 'C = point(9, 4.5)']);
		expect(() => assertChecks(bare)).toThrow(/la diagonale \[AC\] doit être tracée/);
	});

	it('refuse un [AC] de la figure d’une autre longueur que celle écrite', () => {
		const other = figure(VERIFIER, [
			'A = point(3, 4.5)',
			'C = point(8.8, 4.5)',
			'd = segment(A, C)'
		]);
		expect(() => assertChecks(other)).toThrow(/\[AC\] mesure 5,8 cm dans la figure, pas 6 cm/);
	});

	it('refuse B ou D déjà dans la figure, A ou C absent', () => {
		expect(() => assertChecks(figure(VERIFIER, [...BODY, 'B = point(5, 7)']))).toThrow(
			/B est déjà un point de la figure/
		);
		expect(() => assertChecks(figure(VERIFIER, ['C = point(9, 4.5)']))).toThrow(
			/le point A n’existe pas/
		);
	});

	it('refuse une diagonale plus longue que la règle', () => {
		// Fenêtre 5,5 × 5,5 : règle de 5 cm
		expect(() => assertChecks(figure(VERIFIER, BODY, [], '0 ; 5.5 ; 0 ; 5.5'))).toThrow(
			/plus longue que la règle/
		);
	});

	it('refuse B et D hors de la fenêtre des deux côtés', () => {
		expect(() => assertChecks(figure(VERIFIER, BODY, [], '0 ; 12 ; 3 ; 6'))).toThrow(
			/sortent de la fenêtre/
		);
	});
});

describe('rectangle sans équerre : méthodes justes', () => {
	it('M1 : cercle de diamètre [AC], compas à 4 cm en A, règle de B vers O à 6 cm', () => {
		expect(judge(SOURCE, NOMINAL)).toEqual({ status: 'correct' });
	});

	it('M1 de l’autre côté de (AC)', () => {
		const other = [
			...CONSTRUCTION,
			segment(A, B_BELOW),
			segment(B_BELOW, C),
			RULER_B_BELOW,
			segment(B_BELOW, D_ABOVE),
			segment(C, D_ABOVE),
			segment(D_ABOVE, A)
		];
		expect(judge(SOURCE, other)).toEqual({ status: 'correct' });
	});

	it('M2 : O à la règle (segment de 3 cm sur [AC])', () => {
		const ruler = regle(A, C);
		const oOnRuler = rulerGraduation(ruler, 30);
		const circleO = cercle(oOnRuler, A);
		const compass4 = compasSurRegle(regle(A, C), 40);
		const b = crossing(traitOfObject(compass4), traitOfObject(circleO), above);
		const rulerB = regle(b, oOnRuler);
		const d = rulerGraduation(rulerB, 60);
		const objects: DrawnObject[] = [
			ruler,
			segment(A, oOnRuler),
			circleO,
			regle(A, C),
			compass4,
			segment(A, b),
			segment(b, C),
			rulerB,
			segment(b, d),
			segment(C, d),
			segment(d, A)
		];
		expect(judge(SOURCE, objects)).toEqual({ status: 'correct' });
	});

	it('M3 : D au croisement du cercle de diamètre [AC] et du compas à 4 cm en C', () => {
		const rulerC = regle(C, A);
		const compassC = compasSurRegle(rulerC, 40);
		const d = crossing(traitOfObject(compassC), traitOfObject(CIRCLE_O), below);
		const objects: DrawnObject[] = [
			...CONSTRUCTION,
			segment(A, B),
			segment(B, C),
			rulerC,
			compassC,
			segment(C, d),
			segment(d, A)
		];
		expect(judge(SOURCE, objects)).toEqual({ status: 'correct' });
	});

	it('M4 : O par la médiatrice de [AC] au compas, son segment admis', () => {
		const fromA = cercle(A, C);
		const fromC = cercle(C, A);
		const p = crossing(traitOfObject(fromA), traitOfObject(fromC), above);
		const q = crossing(traitOfObject(fromA), traitOfObject(fromC), below);
		const o = crossing({ kind: 'segment', a: p, b: q }, AC_TRAIT, () => true);
		const circleO = cercle(o, A);
		const compass4 = compasSurRegle(regle(A, C), 40);
		const b = crossing(traitOfObject(compass4), traitOfObject(circleO), above);
		const rulerB = regle(b, o);
		const d = rulerGraduation(rulerB, 60);
		const objects: DrawnObject[] = [
			fromA,
			fromC,
			segment(p, q),
			circleO,
			regle(A, C),
			compass4,
			segment(A, b),
			segment(b, C),
			rulerB,
			segment(b, d),
			segment(C, d),
			segment(d, A)
		];
		expect(judge(SOURCE, objects)).toEqual({ status: 'correct' });
	});

	it('le rectangle tracé sans la diagonale [BD] (D au croisement) : juste', () => {
		const rulerC = regle(C, A);
		const compassC = compasSurRegle(rulerC, 40);
		const d = crossing(traitOfObject(compassC), traitOfObject(CIRCLE_O), below);
		const objects: DrawnObject[] = [
			...CONSTRUCTION,
			rulerC,
			compassC,
			segment(A, B),
			segment(B, C),
			segment(C, d),
			segment(d, A)
		];
		expect(judge(SOURCE, objects)).toEqual({ status: 'correct' });
	});
});

describe('rectangle sans équerre : messages, dans l’ordre', () => {
	it('un point placé (hors palette) : réponse forgée, sans message', () => {
		expect(judge(SOURCE, [...NOMINAL, { kind: 'point', x: 1, y: 1 }])).toEqual({
			status: 'incorrect'
		});
	});

	it('aucun côté tracé : « Trace les côtés »', () => {
		expect(judge(SOURCE, [...CONSTRUCTION, RULER_B, segment(B, D)])).toEqual({
			status: 'incorrect',
			feedback: diagonalRectangleSidesFeedback(['A', 'B', 'C', 'D'])
		});
	});

	it('pas fermée : [CD] manque', () => {
		const objects = NOMINAL.filter((o) => o !== NOMINAL[8]);
		expect(judge(SOURCE, objects)).toEqual({ status: 'incorrect', feedback: NOT_CLOSED_FEEDBACK });
	});

	it('deux rectangles : un seul', () => {
		const objects = [
			...NOMINAL,
			segment(A, B_BELOW),
			segment(B_BELOW, C),
			RULER_B_BELOW,
			segment(B_BELOW, D_ABOVE),
			segment(C, D_ABOVE),
			segment(D_ABOVE, A)
		];
		expect(judge(SOURCE, objects)).toEqual({
			status: 'incorrect',
			feedback: severalDiagonalRectanglesFeedback(['A', 'B', 'C', 'D'])
		});
	});

	it('B à la bonne place, mais à l’œil (aucun compas) : B placé à l’œil', () => {
		const exactB = { x: 3 + 16 / 6, y: 4.5 + Math.sqrt(16 - (16 / 6) ** 2) };
		const objects: DrawnObject[] = [
			segment(A, exactB),
			segment(exactB, C),
			segment(C, D),
			segment(D, A)
		];
		expect(judge(SOURCE, objects)).toEqual({
			status: 'incorrect',
			feedback: vertexEyeballedRulerFeedback('B')
		});
	});

	it('B à 4 cm de A, règle posée à l’œil : B placé à l’œil', () => {
		const ruler = regle(A, { x: 4, y: 7.7 });
		const b = rulerGraduation(ruler, 40);
		const objects: DrawnObject[] = [
			ruler,
			segment(A, b),
			segment(b, C),
			segment(C, D),
			segment(D, A)
		];
		expect(judge(SOURCE, objects)).toEqual({
			status: 'incorrect',
			feedback: vertexEyeballedRulerFeedback('B')
		});
	});

	it('[AB] de 4,5 cm : la longueur lue', () => {
		const compass45 = compasSurRegle(regle(A, C), 45);
		const b = crossing(traitOfObject(compass45), traitOfObject(CIRCLE_O), above);
		const rulerB = regle(b, O);
		const d = rulerGraduation(rulerB, 60);
		const objects: DrawnObject[] = [
			RULER_A,
			COMPASS_3,
			CIRCLE_O,
			regle(A, C),
			compass45,
			segment(A, b),
			segment(b, C),
			rulerB,
			segment(b, d),
			segment(C, d),
			segment(d, A)
		];
		expect(judge(SOURCE, objects)).toEqual({
			status: 'incorrect',
			feedback: wrongRuledLengthFeedback('A', 'B', 45, { length: 40, unit: 'cm' })
		});
	});

	it('[AB] qui s’arrondit à 4 cm sans les mesurer : « ne mesure pas exactement »', () => {
		// B sur le cercle de diamètre [AC] avec BC = 4,5 cm : AB ≈ 3,97 cm
		const rulerC = regle(C, A);
		const compassC = compasSurRegle(rulerC, 45);
		const b = crossing(traitOfObject(compassC), traitOfObject(CIRCLE_O), above);
		const rulerB = regle(b, O);
		const d = rulerGraduation(rulerB, 60);
		const objects: DrawnObject[] = [
			RULER_A,
			COMPASS_3,
			CIRCLE_O,
			rulerC,
			compassC,
			segment(A, b),
			segment(b, C),
			rulerB,
			segment(b, d),
			segment(C, d),
			segment(d, A)
		];
		expect(judge(SOURCE, objects)).toEqual({
			status: 'incorrect',
			feedback: notExactSideFeedback('A', 'B', { length: 40, unit: 'cm' })
		});
	});

	it('AB = 4 cm mais B hors du cercle de diamètre [AC] : l’angle en B', () => {
		const rulerC = regle(C, A);
		const compassC = compasSurRegle(rulerC, 40);
		const b = crossing(traitOfObject(COMPASS_4), traitOfObject(compassC), above);
		const rulerB = regle(b, O);
		const d = rulerGraduation(rulerB, 60);
		const objects: DrawnObject[] = [
			RULER_A,
			COMPASS_3,
			CIRCLE_O,
			COMPASS_4,
			rulerC,
			compassC,
			segment(A, b),
			segment(b, C),
			rulerB,
			segment(b, d),
			segment(C, d),
			segment(d, A)
		];
		expect(judge(SOURCE, objects)).toEqual({
			status: 'incorrect',
			feedback: rightAngleOnCircleFeedback(['A', 'B', 'C', 'D'])
		});
	});

	it('D à la bonne place, mais à l’œil : D placé à l’œil', () => {
		const exactD = { x: A.x + C.x - B.x, y: A.y + C.y - B.y };
		const objects: DrawnObject[] = [
			...CONSTRUCTION,
			segment(A, B),
			segment(B, C),
			segment(C, exactD),
			segment(exactD, A)
		];
		expect(judge(SOURCE, objects)).toEqual({
			status: 'incorrect',
			feedback: vertexEyeballedRulerFeedback('D')
		});
	});

	it('[BD] de 5,5 cm : les diagonales n’ont pas la même longueur', () => {
		const d = rulerGraduation(RULER_B, 55);
		const objects: DrawnObject[] = [
			...CONSTRUCTION,
			segment(A, B),
			segment(B, C),
			RULER_B,
			segment(B, d),
			segment(C, d),
			segment(d, A)
		];
		expect(judge(SOURCE, objects)).toEqual({
			status: 'incorrect',
			feedback: DIAGONALS_LENGTH_FEEDBACK
		});
	});

	it('[BD] de 6 cm, mais pas vers O : les diagonales n’ont pas le même milieu', () => {
		// La règle de B vers l'autre croisement des deux cercles (un point construit)
		const toward = regle(B, B_BELOW);
		const d = rulerGraduation(toward, 60);
		const objects: DrawnObject[] = [
			...CONSTRUCTION,
			segment(A, B),
			segment(B, C),
			toward,
			segment(B, d),
			segment(C, d),
			segment(d, A)
		];
		expect(judge(SOURCE, objects)).toEqual({
			status: 'incorrect',
			feedback: DIAGONALS_MIDDLE_FEEDBACK
		});
	});

	it('un trait de trop (ni côté, ni sur une diagonale, ni sur la médiatrice de [AC])', () => {
		expect(judge(SOURCE, [...NOMINAL, segment(B, B_BELOW)])).toEqual({
			status: 'incorrect',
			feedback: EXTRA_SEGMENT_FEEDBACK
		});
	});

	it('un côté prolongé au-delà de B : un trait qui dépasse', () => {
		const beyond = { x: A.x + 1.2 * (B.x - A.x), y: A.y + 1.2 * (B.y - A.y) };
		const objects = NOMINAL.map((o) => (o === NOMINAL[4] ? segment(A, beyond) : o));
		expect(judge(SOURCE, objects)).toEqual({ status: 'incorrect', feedback: OVERSHOOT_FEEDBACK });
	});

	it('un morceau de [AC] tracé (comme [AO]) : trait de construction admis', () => {
		expect(judge(SOURCE, [...NOMINAL, segment(A, O)])).toEqual({ status: 'correct' });
	});
});

describe('rectangle sans équerre : correction', () => {
	it('les quatre côtés, du côté où l’élève a placé B', () => {
		const lines = solutionLines(
			checksOf(SOURCE),
			constructionPositions(SOURCE),
			[segment(A, B_BELOW)],
			constructionShapes(SOURCE)
		);
		expect(lines).toHaveLength(4);
		const ends = lines.flatMap((l) => [
			{ x: l.x1, y: l.y1 },
			{ x: l.x2, y: l.y2 }
		]);
		expect(ends.some((p) => Math.hypot(p.x - B_BELOW.x, p.y - B_BELOW.y) < 1e-9)).toBe(true);
	});

	it('sans tracé : B au-dessus', () => {
		const lines = solutionLines(
			checksOf(SOURCE),
			constructionPositions(SOURCE),
			[],
			constructionShapes(SOURCE)
		);
		expect(lines).toHaveLength(4);
		expect(Math.max(...lines.flatMap((l) => [l.y1, l.y2]))).toBeCloseTo(B.y, 9);
	});

	it('le cercle de diamètre [AC], l’arc de centre A et la diagonale [BD] ; sans codage ni règle', () => {
		const correction = solutionTriangle(
			checksOf(SOURCE),
			constructionPositions(SOURCE),
			constructionShapes(SOURCE),
			[]
		);
		expect(correction).toMatchObject({ marks: [], angles: [], rightAngles: [] });
		expect(correction?.arcs).toHaveLength(2);
		expect(correction?.arcs[0].center.x).toBeCloseTo(6, 9);
		expect(correction?.arcs[0].radius).toBeCloseTo(3, 9);
		expect(correction?.arcs[1]).toMatchObject({ center: A });
		expect(correction?.arcs[1].radius).toBeCloseTo(4, 9);
		expect(correction?.guides).toHaveLength(1);
		expect(
			solutionRulers(
				checksOf(SOURCE),
				constructionPositions(SOURCE),
				constructionShapes(SOURCE),
				[]
			)
		).toEqual([]);
	});
});

describe('rectangle sans équerre : revue de la PR 1', () => {
	it('D sur la règle de B vers O, atteint par [CD] et non par [BD] : juste', () => {
		const objects: DrawnObject[] = [
			...CONSTRUCTION,
			segment(A, B),
			segment(B, C),
			RULER_B,
			segment(C, D),
			segment(D, A)
		];
		expect(judge(SOURCE, objects)).toEqual({ status: 'correct' });
	});

	it('D sur la règle de B vers O, atteint par [BO] puis [OD] : juste', () => {
		const objects: DrawnObject[] = [
			...CONSTRUCTION,
			segment(A, B),
			segment(B, C),
			RULER_B,
			segment(B, O),
			segment(O, D),
			segment(C, D),
			segment(D, A)
		];
		expect(judge(SOURCE, objects)).toEqual({ status: 'correct' });
	});

	it('AB = 3 cm, B pris par CB = 4 cm, puis [AD] tracé à la règle posée en A : juste', () => {
		const a = { x: 3, y: 4.5 };
		const c = { x: 8, y: 4.5 };
		const source = figure('rectangle A ; B ; C ; D : AB = 3 cm ; AC = 5 cm', [
			'A = point(3, 4.5)',
			'C = point(8, 4.5)',
			'd = segment(A, C)'
		]);
		const rulerA = regle(a, c);
		const compass25 = compasSurRegle(rulerA, 25);
		const ac: Trait = { kind: 'segment', a, b: c };
		const o = crossing(traitOfObject(compass25), ac, () => true);
		const circleO = cercle(o, a);
		const rulerC = regle(c, a);
		const compassC = compasSurRegle(rulerC, 40);
		const b = crossing(traitOfObject(compassC), traitOfObject(circleO), above);
		const rulerB = regle(b, o);
		const d = rulerGraduation(rulerB, 50);
		const objects: DrawnObject[] = [
			rulerA,
			compass25,
			circleO,
			rulerC,
			compassC,
			segment(a, b),
			segment(b, c),
			rulerB,
			segment(b, d),
			segment(c, d),
			regle(a, d),
			segment(a, d)
		];
		expect(judge(source, objects)).toEqual({ status: 'correct' });
	});

	it('une longueur seule autre que [BC] : le message du rectangle sans équerre', () => {
		for (const lengths of ['AB = 4 cm', 'BD = 6 cm', 'CD = 4 cm']) {
			expect(errorOf(figure(`rectangle A ; B ; C ; D : ${lengths}`))).toMatch(
				/donner le côté \[AB\] et la diagonale \[AC\]/
			);
		}
	});

	it('refuse une droite (AC), ou un segment plus long, à la place de la diagonale [AC]', () => {
		const line = figure(VERIFIER, ['A = point(3, 4.5)', 'C = point(9, 4.5)', 'd = droite(A, C)']);
		expect(() => assertChecks(line)).toThrow(/la diagonale \[AC\] doit être tracée/);
		const longer = figure(VERIFIER, [
			'A = point(3, 4.5)',
			'C = point(9, 4.5)',
			'P = point(2, 4.5)',
			'Q = point(10, 4.5)',
			'd = segment(P, Q)'
		]);
		expect(() => assertChecks(longer)).toThrow(/la diagonale \[AC\] doit être tracée/);
	});

	it('médiatrice de [AC] : un segment sans les deux cercles, ou au-delà de leurs croisements, refusé', () => {
		const up = { x: O.x, y: O.y + 1 };
		const down = { x: O.x, y: O.y - 1 };
		expect(judge(SOURCE, [...NOMINAL, segment(up, down)])).toEqual({
			status: 'incorrect',
			feedback: EXTRA_SEGMENT_FEEDBACK
		});
		const fromA = cercle(A, C);
		const fromC = cercle(C, A);
		const p = crossing(traitOfObject(fromA), traitOfObject(fromC), above);
		const q = crossing(traitOfObject(fromA), traitOfObject(fromC), below);
		const beyond = { x: p.x, y: p.y + 0.5 };
		expect(judge(SOURCE, [fromA, fromC, ...NOMINAL, segment(beyond, q)])).toEqual({
			status: 'incorrect',
			feedback: OVERSHOOT_FEEDBACK
		});
		expect(judge(SOURCE, [fromA, fromC, ...NOMINAL, segment(p, q)])).toEqual({
			status: 'correct'
		});
	});
});
