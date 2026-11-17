/**
 * Case « figure » : construire un angle de mesure donnée au rapporteur
 * (`verifier: angle AOy = 50`, chantier `controles-figure`, lot 5, phase 0
 * validée par David le 2026-11-03, `docs/archive/wip/controles-figure-progress.md` § 16).
 *
 * Le côté [OA) est donné ; l'élève pose le rapporteur (centre O, base sur [OA)),
 * place un repère à la graduation voulue, puis trace au segment le côté [Oy) de
 * O au repère. Les deux côtés de (OA) sont justes ; le côté doit être construit
 * (repère du rapporteur ou point construit) ; 180 − a = « mauvaise graduation ».
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { ConstructionAuthorError, assertConstructionChecks, judgeConstruction } from '../judge';
import {
	angleEyeballedFeedback,
	missingAngleSideFeedback,
	wrongAngleFeedback,
	wrongScaleFeedback
} from '../angle';
import { constructionOf, isBuiltMark, repereAt } from '../instruments';
import {
	addTap,
	canErase,
	cancelPending,
	eraseLast,
	flipProtractor,
	nudgeMark,
	solutionAngle,
	solutionLines,
	type Drawing
} from '../drawing';
import {
	parseConstructionAnswer,
	serializeConstructionAnswer,
	type DrawnObject,
	type DrawnRepere
} from '../answer';
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
	verifier: string,
	body: string[],
	header: string[] = [],
	window = '0 ; 10 ; 0 ; 8'
): string {
	return [`fenetre: ${window}`, ...header, `verifier: ${verifier}`, '---', ...body].join('\n');
}

const O = { x: 4, y: 3 };
const A = { x: 10, y: 3 };
// Rapporteur de rayon 2,8 (0,35 de 8) : il tient en O des deux côtés de (OA)
const BODY = ['O = point(4, 3)', 'A = point(10, 3)', 'x = demidroite(O, A)'];
const ANGLE_50 = figure('angle AOy = 50', BODY);

const repere = (deg: number, sens: 1 | -1 = 1, base: Position = A, r = 3): DrawnRepere => ({
	kind: 'repere',
	vx: O.x,
	vy: O.y,
	ax: base.x,
	ay: base.y,
	r,
	deg,
	sens
});
const segment = (p: Position, q: Position): DrawnObject => ({
	kind: 'segment',
	x1: p.x,
	y1: p.y,
	x2: q.x,
	y2: q.y
});
/** Le côté tracé de O au repère */
const side = (mark: DrawnRepere): DrawnObject => segment(O, repereAt(mark));

describe('verifier: angle AOy = 50 — lecture', () => {
	it('sommet, point du côté, nom du côté, mesure ; palette Rapporteur · Segment', () => {
		const { spec, errors } = readConstructionHeader(ANGLE_50);
		expect(errors).toEqual([]);
		expect(spec.checks).toEqual([
			{ kind: 'angle', points: ['A', 'O'], side: 'y', measure: 50, line: 2 }
		]);
		expect(spec.tools).toEqual(['rapporteur', 'segment']);
	});

	it.each([
		['angle AOy = 0', 'de 1 à 179'],
		['angle AOy = 180', 'de 1 à 179'],
		['angle AOy = 47.5', 'angle AOy = 50'],
		['angle AAy = 50', 'différents'],
		['angle AO = 50', 'angle AOy = 50']
	])('« %s » refusé', (verifier, message) => {
		const { errors } = readConstructionHeader(figure(verifier, BODY));
		expect(errors.map((e) => e.message).join(' ; ')).toContain(message);
	});

	it('quadrillage refusé : l’angle se construit sur papier uni', () => {
		const { errors } = readConstructionHeader(figure('angle AOy = 50', BODY, ['grille: 1']));
		expect(errors.map((e) => e.message).join(' ; ')).toContain('papier uni');
	});

	it('outil hors de la palette refusé ; rapporteur ailleurs que pour un angle refusé', () => {
		const withCompass = readConstructionHeader(
			figure('angle AOy = 50', BODY, ['outils: rapporteur, segment, compas'])
		);
		expect(withCompass.errors.map((e) => e.message).join(' ; ')).toContain('compas');
		const elsewhere = readConstructionHeader(
			figure("point A' = symetrie(A, axe=x)", BODY, ['outils: point, compas, rapporteur'])
		);
		expect(elsewhere.errors.map((e) => e.message).join(' ; ')).toContain('rapporteur');
	});
});

describe('réponse : repere(vx;vy;ax;ay;r;deg;sens)', () => {
	it('se lit et s’écrit', () => {
		const text = serializeConstructionAnswer([repere(50)]);
		expect(text).toBe('repere(4;3;10;3;3;50;1)');
		expect(parseConstructionAnswer(text)).toEqual([repere(50)]);
	});

	it.each([
		'repere(2;2;8;2;3;50.5;1)',
		'repere(2;2;8;2;3;181;1)',
		'repere(2;2;8;2;3;50;2)',
		'repere(2;2;8;2;0;50;1)',
		'repere(2;2;2;2;3;50;1)'
	])('%s : illisible', (text) => {
		expect(parseConstructionAnswer(text)).toBeNull();
	});

	it('le repère est à r du centre, à deg degrés de la base, du côté de sens', () => {
		const up = repereAt(repere(90));
		expect(up.x).toBeCloseTo(4, 12);
		expect(up.y).toBeCloseTo(6, 12);
		const down = repereAt(repere(90, -1));
		expect(down.y).toBeCloseTo(0, 12);
	});

	it('un repère est construit si le centre et le point de la base le sont, ou la base sur un trait par le centre', () => {
		const base = [O, A];
		const traits = constructionShapes(ANGLE_50).traits;
		const of = (mark: DrawnRepere) => isBuiltMark(mark, constructionOf([mark], base, traits));
		expect(of(repere(50))).toBe(true);
		// Base touchée n'importe où sur [OA) : construite (choix libre sur un trait par le centre)
		expect(of(repere(50, 1, { x: 7, y: 3 }))).toBe(true);
		// Centre libre : rien
		expect(of({ ...repere(50), vx: 3.1, vy: 4.2 })).toBe(false);
		// Jamais un point construit : sa distance au centre est libre (revue)
		expect(constructionOf([repere(50)], base, traits).isBuilt(repereAt(repere(50)))).toBe(false);
	});
});

describe('juge : angle AOy = 50', () => {
	it('nominal : repère à 50, côté de O au repère → juste', () => {
		expect(judge(ANGLE_50, [repere(50), side(repere(50))])).toEqual({ status: 'correct' });
	});

	it('de l’autre côté de (OA) (rapporteur retourné) → juste', () => {
		expect(judge(ANGLE_50, [repere(50, -1), side(repere(50, -1))])).toEqual({
			status: 'correct'
		});
	});

	it('côté tracé du repère vers O, repères et traits en trop → juste', () => {
		const mark = repere(50);
		expect(
			judge(ANGLE_50, [
				repere(30),
				mark,
				segment(repereAt(mark), O),
				segment(O, repereAt(repere(30)))
			])
		).toEqual({ status: 'correct' });
	});

	it('aucun côté depuis O', () => {
		expect(judge(ANGLE_50, [repere(50)])).toEqual({
			status: 'incorrect',
			feedback: missingAngleSideFeedback('O', 'y')
		});
		// Le côté donné repassé n'est pas un second côté
		expect(judge(ANGLE_50, [segment(O, A)])).toEqual({
			status: 'incorrect',
			feedback: missingAngleSideFeedback('O', 'y')
		});
	});

	it('côté à l’œil, même pile à 50°', () => {
		const end = repereAt(repere(50));
		expect(judge(ANGLE_50, [segment(O, end)])).toEqual({
			status: 'incorrect',
			feedback: angleEyeballedFeedback()
		});
	});

	it('180 − 50 : mauvaise graduation', () => {
		expect(judge(ANGLE_50, [repere(130), side(repere(130))])).toEqual({
			status: 'incorrect',
			feedback: wrongScaleFeedback(130, 50)
		});
	});

	it('autre mesure', () => {
		expect(judge(ANGLE_50, [repere(45), side(repere(45))])).toEqual({
			status: 'incorrect',
			feedback: wrongAngleFeedback(45, 50)
		});
	});

	it('un point ou une droite sans leur outil : réponse forgée', () => {
		expect(judge(ANGLE_50, [repere(50), side(repere(50)), { kind: 'point', x: 1, y: 1 }])).toEqual({
			status: 'incorrect'
		});
		const end = repereAt(repere(50));
		expect(
			judge(ANGLE_50, [repere(50), { kind: 'droite', x1: O.x, y1: O.y, x2: end.x, y2: end.y }])
		).toEqual({ status: 'incorrect' });
	});

	it('repère d’un rapporteur centré ailleurs qu’en O : sa distance est à l’œil, pas un côté (revue)', () => {
		// O(4 ; 3), A(10 ; 4) : rapporteur en A, base vers O, 80°, r = AO → triangle isocèle, 50° pile en O
		const oblique = figure('angle AOy = 50', [
			'O = point(4, 3)',
			'A = point(10, 4)',
			'x = demidroite(O, A)'
		]);
		for (const sens of [1, -1] as const) {
			const forged: DrawnRepere = {
				kind: 'repere',
				vx: 10,
				vy: 4,
				ax: 4,
				ay: 3,
				r: Math.hypot(6, 1),
				deg: 80,
				sens
			};
			expect(judge(oblique, [forged, segment(O, repereAt(forged))])).toEqual({
				status: 'incorrect',
				feedback: angleEyeballedFeedback()
			});
		}
	});

	it('côté [OA) oblique, base touchée loin de A, retourné ou non → juste', () => {
		const oblique = figure('angle AOy = 50', [
			'O = point(4, 3)',
			'A = point(10, 4)',
			'x = demidroite(O, A)'
		]);
		const base = { x: 4 + 6 * 0.4, y: 3 + 1 * 0.4 };
		for (const sens of [1, -1] as const) {
			const mark = repere(50, sens, base, 3.4);
			expect(judge(oblique, [mark, side(mark)])).toEqual({ status: 'correct' });
		}
	});

	it('un repère dans une autre case : réponse forgée', () => {
		// B = (2 ; 4) : le repère à 180° de [OA), à 3 de O, tombe pile dessus
		const symmetric = figure('point B = symetrie(A, centre=O)', [
			'O = point(5, 4)',
			'A = point(8, 4)'
		]);
		const mark: DrawnRepere = {
			kind: 'repere',
			vx: 5,
			vy: 4,
			ax: 8,
			ay: 4,
			r: 3,
			deg: 180,
			sens: 1
		};
		expect(judge(symmetric, [mark, { kind: 'point', ...repereAt(mark) }])).toEqual({
			status: 'incorrect'
		});
	});
});

describe('erreurs d’auteur', () => {
	it('figure correcte : rien', () => {
		expect(() => assertChecks(ANGLE_50)).not.toThrow();
	});

	it('O ou A invisible', () => {
		const hidden = figure('angle AOy = 50', [
			'O = point(4, 3, visible=faux)',
			'A = point(10, 3)',
			'x = demidroite(O, A)'
		]);
		expect(() => assertChecks(hidden)).toThrow(ConstructionAuthorError);
	});

	it('M1 (§ 18) : fenêtre plus de deux fois plus large que haute, refusée', () => {
		const wide = figure('angle AOy = 50', BODY, [], '0 ; 17 ; 0 ; 8');
		expect(() => assertChecks(wide)).toThrow(/fenêtre trop allongée/);
		const tall = figure('angle AOy = 50', BODY, [], '0 ; 10 ; 0 ; 21');
		expect(() => assertChecks(tall)).toThrow(/fenêtre trop allongée/);
		expect(() => assertChecks(figure('angle AOy = 50', BODY, [], '0 ; 16 ; 0 ; 8'))).not.toThrow();
	});

	it('O et A confondus', () => {
		const same = figure('angle AOy = 50', ['O = point(2, 2)', 'A = point(2, 2)']);
		expect(() => assertChecks(same)).toThrow(/même endroit/);
	});

	it('le nom du côté est déjà un point de la figure', () => {
		const taken = figure('angle AOB = 50', [...BODY, 'B = point(5, 6)']);
		expect(() => assertChecks(taken)).toThrow(/existe déjà/);
	});

	it('le rapporteur posé en O sort de la figure des deux côtés de (OA) (décision de David)', () => {
		// Rayon 2,8 : O à 2 du bord gauche, le demi-rapporteur dépasse au-dessus comme au-dessous
		const corner = figure('angle AOy = 50', [
			'O = point(2, 2)',
			'A = point(8, 2)',
			'x = demidroite(O, A)'
		]);
		expect(() => assertChecks(corner)).toThrow(/sort de la figure/);
	});

	it('il ne tient que d’un côté : publiable, la correction de ce côté-là', () => {
		// O(5 ; 2,5) : au-dessus, le demi-rapporteur tient ; au-dessous, il sort par le bas
		const low = figure('angle AOy = 50', [
			'O = point(5, 2.5)',
			'A = point(9, 3)',
			'x = demidroite(O, A)'
		]);
		expect(() => assertChecks(low)).not.toThrow();
		const [line] = solutionLines(
			checksOf(low),
			constructionPositions(low),
			[],
			constructionShapes(low)
		);
		expect(line.y2).toBeGreaterThan(2.5);
		// L'élève a tracé dessous (le rapporteur n'y tient pas, son côté peut y être) : la
		// correction suit son tracé (revue de #2305)
		const base = Math.atan2(0.5, 4);
		const below = {
			x: 5 + Math.cos(base - (50 * Math.PI) / 180),
			y: 2.5 + Math.sin(base - (50 * Math.PI) / 180)
		};
		const [under] = solutionLines(
			checksOf(low),
			constructionPositions(low),
			[segment({ x: 5, y: 2.5 }, below)],
			constructionShapes(low)
		);
		expect(under.y2).toBeLessThan(2.5);
		expect(under.y2).toBeGreaterThanOrEqual(0);
	});
});

describe('correction', () => {
	it('le côté [Oy) du côté où l’élève a tracé, et l’arc codé', () => {
		const below = [repere(45, -1), side(repere(45, -1))];
		const [line] = solutionLines(
			checksOf(ANGLE_50),
			constructionPositions(ANGLE_50),
			below,
			constructionShapes(ANGLE_50)
		);
		expect(line.kind).toBe('segment');
		expect([line.x1, line.y1]).toEqual([O.x, O.y]);
		// Sous (OA) : l'élève a tracé dessous
		expect(line.y2).toBeLessThan(O.y);
		const angleTo = (Math.atan2(O.y - line.y2, line.x2 - O.x) * 180) / Math.PI;
		expect(angleTo).toBeCloseTo(50, 9);
		const arc = solutionAngle(
			checksOf(ANGLE_50),
			constructionPositions(ANGLE_50),
			constructionShapes(ANGLE_50),
			below
		);
		expect(arc).toMatchObject({ center: O, measure: 50 });
	});

	it('sans tracé : au-dessus de (OA)', () => {
		const [line] = solutionLines(
			checksOf(ANGLE_50),
			constructionPositions(ANGLE_50),
			[],
			constructionShapes(ANGLE_50)
		);
		expect(line.y2).toBeGreaterThan(O.y);
	});
});

describe('geste : rapporteur', () => {
	const EMPTY: Drawing = { objects: [], start: null };
	const R = { protractorRadius: 3 };
	const posed = () => addTap(addTap(EMPTY, O, 'rapporteur', R), A, 'rapporteur', R);

	it('centre, puis la base : le rapporteur est posé, rien dans la réponse', () => {
		const drawing = posed();
		expect(drawing.objects).toEqual([]);
		expect(drawing.protractor).toEqual({ center: O, base: A, sens: 1, radius: 3 });
	});

	it('toucher : un repère au degré entier le plus proche, le rapporteur reste', () => {
		const tap = { x: O.x + 4 * Math.cos(0.87), y: O.y + 4 * Math.sin(0.87) }; // ≈ 49,85°
		const drawing = addTap(posed(), tap, 'rapporteur', R);
		expect(drawing.objects).toEqual([repere(50)]);
		expect(drawing.protractor).toBeTruthy();
	});

	it('toucher de l’autre côté de la base : rien ; Retourner : le repère y va', () => {
		const below = { x: 6, y: 1 };
		expect(addTap(posed(), below, 'rapporteur', R).objects).toEqual([]);
		const flipped = flipProtractor(posed());
		expect(flipped.protractor?.sens).toBe(-1);
		expect(addTap(flipped, below, 'rapporteur', R).objects).toEqual([repere(45, -1)]);
	});

	it('‹ › : décalent le dernier repère d’un degré, bornés à 0 et 180 ; sans repère, en posent un', () => {
		const first = nudgeMark(posed(), 1);
		expect(first.objects).toEqual([repere(1)]);
		const placed = addTap(posed(), { x: 4, y: 10 }, 'rapporteur', R);
		expect(nudgeMark(placed, -1).objects).toEqual([repere(89)]);
		expect(nudgeMark(nudgeMark(posed(), -1), -1).objects).toEqual([repere(0)]);
		const end = { ...posed(), objects: [repere(180)] };
		expect(nudgeMark(end, 10).objects).toEqual([repere(180)]);
	});

	it('après Retourner, ‹ › posent un repère du nouveau côté (revue)', () => {
		const placed = addTap(posed(), { x: 4, y: 10 }, 'rapporteur', R);
		const next = nudgeMark(flipProtractor(placed), 1);
		expect(next.objects).toEqual([repere(90), repere(1, -1)]);
	});

	it('Effacer : le dernier repère, puis le rapporteur ; changer d’outil le lève', () => {
		const placed = addTap(posed(), { x: 4, y: 10 }, 'rapporteur', R);
		const once = eraseLast(placed);
		expect(once.objects).toEqual([]);
		expect(once.protractor).toBeTruthy();
		const twice = eraseLast(once);
		expect(twice.protractor ?? null).toBeNull();
		expect(canErase(twice)).toBe(false);
		expect(cancelPending(placed).protractor ?? null).toBeNull();
		expect(cancelPending(placed).objects).toEqual([repere(90)]);
	});
});
