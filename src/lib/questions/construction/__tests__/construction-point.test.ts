/**
 * Juge d'une case « figure » : placer un point (`verifier: point A' = symetrie(A, axe=d)`,
 * chantier `controles-figure`, lot 2a, phase 0 validée par David le 2026-11-02,
 * `docs/wip/controles-figure-progress.md` § 5).
 *
 * L'élève place des points (outil point, un toucher, réponse `point(x;y)`) ; à
 * droite du `=`, une expression du langage des figures calculée à chaque tirage.
 * Points non nommés, jugés comme un ensemble ; sur quadrillage (lot 2a), les
 * touchers vont aux nœuds. Figures écrites comme le prof les écrit, positions par
 * le vrai registre.
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { ConstructionAuthorError, assertConstructionChecks, judgeConstruction } from '../judge';
import {
	POINT_EXTRA_FEEDBACK,
	POINT_MISSING_FEEDBACK,
	POINT_NOT_IN_PLACE_FEEDBACK,
	notImageFeedback,
	notPerpendicularFeedback,
	notSameDistanceFeedback
} from '../point';
import { addTap, eraseLast, solutionPoints, type Drawing } from '../drawing';
import { parseConstructionAnswer, serializeConstructionAnswer } from '../answer';
import { readConstructionHeader } from '$lib/ubumark/parser/construction-parser';

function checksOf(source: string) {
	const { spec, errors } = readConstructionHeader(source);
	expect(errors).toEqual([]);
	return spec.checks;
}

function judge(source: string, answer: string) {
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

const pt = (x: number, y: number) => `point(${x};${y})`;
const seg = (x1: number, y1: number, x2: number, y2: number) => `segment(${x1};${y1};${x2};${y2})`;

function figure(verifier: string | string[], body: string[], header = ['grille: 1']): string {
	const checks = Array.isArray(verifier) ? verifier : [verifier];
	return [
		'fenetre: 0 ; 12 ; 0 ; 8',
		...header,
		...checks.map((c) => `verifier: ${c}`),
		'---',
		...body
	].join('\n');
}

// Axe vertical x = 6 ; A(2 ; 5) → A'(10 ; 5)
// M(6 ; 3) : un point de l'axe, son propre symétrique
const AXIS_BODY = [
	'P = point(6, 0)',
	'Q = point(6, 8)',
	'd = droite(P, Q)',
	'A = point(2, 5)',
	'M = point(6, 3)'
];
const VERTICAL = figure("point A' = symetrie(A, axe=d)", AXIS_BODY);

// Axe oblique y = x ; A(2 ; 5) → A'(5 ; 2)
const OBLIQUE = figure("point A' = symetrie(A, axe=d)", [
	'P = point(0, 0)',
	'Q = point(8, 8)',
	'd = droite(P, Q)',
	'A = point(2, 5)'
]);

// Centre O(6 ; 4) ; A(2 ; 5) → A'(10 ; 3)
const CENTRAL = figure("point A' = symetrie(A, centre=O)", ['O = point(6, 4)', 'A = point(2, 5)']);

// Deux points : A(2 ; 5) → A'(10 ; 5), B(4 ; 1) → B'(8 ; 1)
const TWO = figure(
	["point A' = symetrie(A, axe=d)", "point B' = symetrie(B, axe=d)"],
	[...AXIS_BODY, 'B = point(4, 1)']
);

describe('lecture de `point …`', () => {
	it('le nom, l’expression, l’outil point déduit', () => {
		const { spec, errors } = readConstructionHeader(VERTICAL);
		expect(errors).toEqual([]);
		expect(spec.tools).toEqual(['point']);
		expect(spec.checks).toEqual([
			{ kind: 'point', name: "A'", expression: 'symetrie(A, axe=d)', line: 3 }
		]);
	});

	it('plusieurs points dans la même figure', () => {
		expect(checksOf(TWO).map((c) => (c.kind === 'point' ? c.name : c.kind))).toEqual(["A'", "B'"]);
	});

	it.each([
		['point', 'point attend un nom et une expression'],
		["point A'", 'point attend un nom et une expression'],
		["point A' =", 'point attend un nom et une expression'],
		['point 2A = milieu(A, B)', 'point attend un nom et une expression'],
		[`point A' = ${'x'.repeat(201)}`, 'expression trop longue']
	])('« %s » refusé', (verifier, message) => {
		const { errors } = readConstructionHeader(figure(verifier, AXIS_BODY));
		expect(errors.map((e) => e.message).join(' ')).toContain(message);
	});

	it('deux points du même nom : refusé', () => {
		const { errors } = readConstructionHeader(
			figure(["point A' = symetrie(A, axe=d)", "point A' = milieu(A, P)"], AXIS_BODY)
		);
		expect(errors.map((e) => e.message).join(' ')).toContain('deux points nommés A’');
	});

	it('mêlé à un symétrique de traits : refusé (un outil par figure)', () => {
		const { errors } = readConstructionHeader(
			figure(["point A' = symetrie(A, axe=d)", 'symetrique par d'], AXIS_BODY)
		);
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toContain('outil');
	});
});

describe('réponse `point(x;y)`', () => {
	it('lue et réécrite', () => {
		expect(parseConstructionAnswer('point(10;5)|point(8;1)')).toEqual([
			{ kind: 'point', x: 10, y: 5 },
			{ kind: 'point', x: 8, y: 1 }
		]);
		expect(
			serializeConstructionAnswer([
				{ kind: 'point', x: 10, y: 5 },
				{ kind: 'segment', x1: 0, y1: 0, x2: 1, y2: 1 }
			])
		).toBe('point(10;5)|segment(0;0;1;1)');
	});

	it.each(['point(1)', 'point(1;2;3)', 'point(a;2)', `point(1e7;0)`])(
		'« %s » illisible',
		(answer) => {
			expect(parseConstructionAnswer(answer)).toBeNull();
		}
	);
});

describe('juste', () => {
	it('le symétrique par un axe vertical', () => {
		expect(judge(VERTICAL, pt(10, 5))).toEqual({ status: 'correct' });
	});

	it('par un axe oblique', () => {
		expect(judge(OBLIQUE, pt(5, 2))).toEqual({ status: 'correct' });
	});

	it('par un centre', () => {
		expect(judge(CENTRAL, pt(10, 3))).toEqual({ status: 'correct' });
	});

	it('deux points, placés dans l’autre ordre', () => {
		expect(judge(TWO, [pt(8, 1), pt(10, 5)].join('|'))).toEqual({ status: 'correct' });
	});

	it('traits de construction en plus : ignorés', () => {
		expect(judge(VERTICAL, [seg(2, 5, 10, 5), pt(10, 5)].join('|'))).toEqual({
			status: 'correct'
		});
	});

	it('autre expression du langage des figures (milieu)', () => {
		const source = figure('point I = milieu(A, B)', ['A = point(2, 2)', 'B = point(8, 6)']);
		expect(judge(source, pt(5, 4))).toEqual({ status: 'correct' });
	});
});

describe('faux, message de la première cause', () => {
	it('rien placé : vide', () => {
		expect(judge(VERTICAL, '')).toEqual({ status: 'empty' });
	});

	it('[AA’] pas perpendiculaire à l’axe, mais la bonne distance', () => {
		// Axe y = x, A(2 ; 5) à 3/√2 de l'axe ; (6 ; 3) est aussi à 3/√2, pas sur la perpendiculaire
		expect(judge(OBLIQUE, pt(6, 3))).toEqual({
			status: 'incorrect',
			feedback: notPerpendicularFeedback('A', "A'")
		});
	});

	it('l’erreur classique de l’axe oblique : retourné « en face », à l’horizontale', () => {
		// (8 ; 5) : à l'horizontale de A, à la même distance de y = x (3/√2), pas sur la perpendiculaire
		expect(judge(OBLIQUE, pt(8, 5))).toEqual({
			status: 'incorrect',
			feedback: notPerpendicularFeedback('A', "A'")
		});
	});

	it('axe oblique, ailleurs : message générique', () => {
		expect(judge(OBLIQUE, pt(7, 1))).toEqual({
			status: 'incorrect',
			feedback: notImageFeedback('A')
		});
	});

	it('sur la perpendiculaire, mais pas à la même distance', () => {
		expect(judge(VERTICAL, pt(9, 5))).toEqual({
			status: 'incorrect',
			feedback: notSameDistanceFeedback('A', "A'")
		});
	});

	it('ailleurs', () => {
		expect(judge(VERTICAL, pt(9, 2))).toEqual({
			status: 'incorrect',
			feedback: notImageFeedback('A')
		});
	});

	it('le point A lui-même', () => {
		expect(judge(VERTICAL, pt(2, 5))).toEqual({
			status: 'incorrect',
			feedback: notImageFeedback('A')
		});
	});

	it('centre : message générique (pas d’axe)', () => {
		expect(judge(CENTRAL, pt(10, 4))).toEqual({
			status: 'incorrect',
			feedback: notImageFeedback('A')
		});
	});

	it('autre expression : « pas à sa place »', () => {
		const source = figure('point I = milieu(A, B)', ['A = point(2, 2)', 'B = point(8, 6)']);
		expect(judge(source, pt(5, 3))).toEqual({
			status: 'incorrect',
			feedback: POINT_NOT_IN_PLACE_FEEDBACK
		});
	});

	it('un point de trop', () => {
		expect(judge(VERTICAL, [pt(10, 5), pt(1, 1)].join('|'))).toEqual({
			status: 'incorrect',
			feedback: POINT_EXTRA_FEEDBACK
		});
	});

	it('le même point placé deux fois : un point de trop', () => {
		expect(judge(VERTICAL, [pt(10, 5), pt(10, 5)].join('|'))).toEqual({
			status: 'incorrect',
			feedback: POINT_EXTRA_FEEDBACK
		});
	});

	it('un point manque', () => {
		expect(judge(TWO, pt(10, 5))).toEqual({
			status: 'incorrect',
			feedback: POINT_MISSING_FEEDBACK
		});
	});

	it('seulement des traits : il manque un point', () => {
		expect(judge(VERTICAL, seg(2, 5, 10, 5))).toEqual({
			status: 'incorrect',
			feedback: POINT_MISSING_FEEDBACK
		});
	});

	it('deux points, le second faux : son message à lui', () => {
		expect(judge(TWO, [pt(10, 5), pt(7, 1)].join('|'))).toEqual({
			status: 'incorrect',
			feedback: notSameDistanceFeedback('B', "B'")
		});
	});

	it('un point sur une figure sans outil point : faux', () => {
		const source = figure('symetrique par d', [...AXIS_BODY, 'B = point(2, 1)', 'segment(A, B)']);
		expect(judge(source, [seg(10, 5, 10, 1), pt(3, 3)].join('|')).status).toBe('incorrect');
	});
});

describe('erreurs d’auteur (refus à la publication)', () => {
	it('la figure juste passe', () => {
		expect(() => assertChecks(VERTICAL)).not.toThrow();
		expect(() => assertChecks(TWO)).not.toThrow();
	});

	it.each([
		['expression qui ne se calcule pas', "point A' = symetrie(Z, axe=d)", 'symetrie(Z, axe=d)'],
		['expression qui ne donne pas un point', "point A' = d", 'ne donne pas un point'],
		['point attendu hors de la fenêtre', "point A' = symetrie(A, centre=P)", 'hors de la fenêtre'],
		['point attendu déjà dans la figure', "point A' = symetrie(M, axe=d)", 'déjà dans la figure'],
		['nom déjà pris', 'point A = symetrie(A, axe=d)', 'le point A existe déjà']
	])('%s', (_, verifier, message) => {
		expect(() => assertChecks(figure(verifier, AXIS_BODY))).toThrow(ConstructionAuthorError);
		expect(() => assertChecks(figure(verifier, AXIS_BODY))).toThrow(message);
	});

	it('point attendu hors des nœuds du quadrillage', () => {
		const source = figure("point A' = milieu(A, Q)", AXIS_BODY);
		expect(() => assertChecks(source)).toThrow('nœud');
	});

	it('sans quadrillage : refusé (papier uni = lot suivant)', () => {
		const source = figure("point A' = symetrie(A, axe=d)", AXIS_BODY, []);
		expect(() => assertChecks(source)).toThrow('grille:');
	});

	it('deux points attendus au même endroit', () => {
		const source = figure(
			["point A' = symetrie(A, axe=d)", 'point N = symetrie(A, axe=d)'],
			AXIS_BODY
		);
		expect(() => assertChecks(source)).toThrow('au même endroit');
	});
});

describe('tracé et correction', () => {
	it('outil point : un toucher place un point, « Effacer » le retire', () => {
		const empty: Drawing = { objects: [], start: null };
		const one = addTap(empty, { x: 10, y: 5 }, 'point');
		expect(one).toEqual({ objects: [{ kind: 'point', x: 10, y: 5 }], start: null });
		expect(eraseLast(one)).toEqual(empty);
	});

	it('la correction : chaque point attendu, son nom, et [AA’] pour un symétrique', () => {
		expect(
			solutionPoints(
				checksOf(VERTICAL),
				constructionExpected(VERTICAL),
				constructionPositions(VERTICAL)
			)
		).toEqual([
			{ name: "A'", at: { x: 10, y: 5 }, from: { x: 2, y: 5 }, foot: { x: 6, y: 5 }, axial: true }
		]);
		expect(
			solutionPoints(
				checksOf(CENTRAL),
				constructionExpected(CENTRAL),
				constructionPositions(CENTRAL)
			)
		).toEqual([
			{ name: "A'", at: { x: 10, y: 3 }, from: { x: 2, y: 5 }, foot: { x: 6, y: 4 }, axial: false }
		]);
	});
});
