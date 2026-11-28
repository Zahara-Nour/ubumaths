/**
 * Figure composée : plusieurs constructions vérifiées dans une même figure (outil n° 45,
 * chantier `outil-equerre-uni`, phase 0 validée par David le 2026-11-28,
 * `docs/wip/outil-equerre-uni-progress.md` § 3).
 *
 * Plusieurs `verifier:` de familles différentes = un programme de construction : chaque
 * ligne est une étape, jugée dans l'ordre par son juge ; une étape juste ajoute ses points
 * (le bout du segment, les sommets du carré, le point placé) à la figure de l'étape
 * suivante, aux positions de l'élève. Verdict de la première étape fausse, « Étape n : … ».
 * Les traits d'une autre étape ne sont ni « de trop » ni « forgés » ; un objet dont
 * l'outil n'est pas dans `outils:` reste une réponse forgée.
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { ConstructionAuthorError, assertConstructionChecks, judgeConstruction } from '../judge';
import { midpointEyeballedFeedback } from '../line';
import { wrongLengthFeedback } from '../segment-length';
import { centeredMissingFeedback, goodCenterThroughFeedback } from '../circle';
import { POINT_MISSING_FEEDBACK } from '../point';
import { sideEyeballedFeedback } from '../triangle';
import { perpendicularThrough, type StraightTrait } from '../instruments';
import {
	serializeConstructionAnswer,
	type DrawnObject,
	type DrawnPoint,
	type DrawnRegle
} from '../answer';
import type { Position } from '../judge';
import { readConstructionHeader } from '#lib/ubumark/parser/construction-parser.ts';

function checksOf(source: string) {
	const { spec, errors } = readConstructionHeader(source);
	expect(errors).toEqual([]);
	return spec.checks;
}

function errorsOf(source: string): string[] {
	return readConstructionHeader(source).errors.map((e) => e.message);
}

function judge(source: string, objects: DrawnObject[]) {
	return judgeConstruction(
		checksOf(source),
		constructionPositions(source),
		serializeConstructionAnswer(objects),
		constructionShapes(source),
		constructionExpected(source),
		source
	);
}

function assertChecks(source: string) {
	assertConstructionChecks(
		checksOf(source),
		constructionPositions(source),
		constructionShapes(source),
		constructionExpected(source),
		source
	);
}

const segment = (p: Position, q: Position): DrawnObject => ({
	kind: 'segment',
	x1: p.x,
	y1: p.y,
	x2: q.x,
	y2: q.y
});
const regle = (origin: Position, toward: Position): DrawnRegle => ({
	kind: 'regle',
	ox: origin.x,
	oy: origin.y,
	bx: toward.x,
	by: toward.y,
	sens: 1
});
const cercle = (center: Position, through: Position): DrawnObject => ({
	kind: 'cercle',
	cx: center.x,
	cy: center.y,
	x: through.x,
	y: through.y
});
const point = (p: Position): DrawnPoint => ({ kind: 'point', x: p.x, y: p.y });
const along = (o: Position, u: Position, t: number): Position => ({
	x: o.x + u.x * t,
	y: o.y + u.y * t
});

// ─── Exemple A : « Trace [AB] de 6 cm, le cercle de centre A de rayon 2 cm, puis le cercle
// de diamètre [AB] » (I, milieu marqué à la règle, puis le cercle de centre I par A)

const A_TOOLS = 'outils: segment, regle, compas, point';
const A_STEPS = [
	'verifier: segment AB = 6 cm',
	'verifier: cercle c = cercle(A, rayon=2 cm)',
	'verifier: point I = milieu(A, B)',
	'verifier: cercle k = cercle(I, passant=A)'
];
function figureA(steps = A_STEPS, header = [A_TOOLS]): string {
	return ['fenetre: 0 ; 12 ; 0 ; 10', ...header, ...steps, '---', 'A = point(4, 4)'].join('\n');
}
const FIGURE_A = figureA();
const PA = { x: 4, y: 4 };

/** Le programme A tracé dans la direction u (unitaire) depuis A */
function drawA(u: Position, { length = 6, radius = 2, middle = 3 } = {}): DrawnObject[] {
	const b = along(PA, u, length);
	const i = along(PA, u, middle);
	return [regle(PA, b), segment(PA, b), cercle(PA, along(PA, u, radius)), point(i), cercle(i, PA)];
}
const RIGHT = { x: 1, y: 0 };
const OBLIQUE = { x: 0.6, y: 0.8 };

// ─── Exemple B : « Construis le carré ABCD de 5 cm de côté ; trace ses diagonales, elles se
// coupent en O ; trace le cercle de centre O passant par A »

const B_TOOLS = 'outils: segment, equerre, regle, point, compas';
const B_STEPS = [
	'verifier: carre A ; B ; C ; D',
	'verifier: segment [AC]',
	'verifier: segment [BD]',
	'verifier: point O = intersection(segment(A, C), segment(B, D))',
	'verifier: cercle k = cercle(O, passant=A)'
];
function figureB(steps = B_STEPS, header = [B_TOOLS]): string {
	return [
		'fenetre: 0 ; 12 ; -6 ; 10',
		...header,
		...steps,
		'---',
		'A = point(2, 2)',
		'B = point(7, 2)',
		's = segment(A, B)'
	].join('\n');
}
const FIGURE_B = figureB();
const SA = { x: 2, y: 2 };
const SB = { x: 7, y: 2 };
const AB: StraightTrait = { kind: 'segment', a: SA, b: SB };

/** Le programme B, le carré au-dessus (sens 1) ou au-dessous (sens -1) de (AB) */
function drawB(sens: 1 | -1, { diagonals = true, o = true, circle = true } = {}): DrawnObject[] {
	const c = { x: 7, y: 2 + 5 * sens };
	const d = { x: 2, y: 2 + 5 * sens };
	const center = { x: 4.5, y: 2 + 2.5 * sens };
	return [
		perpendicularThrough(AB, SB),
		regle(SB, c),
		segment(SB, c),
		perpendicularThrough(AB, SA),
		regle(SA, d),
		segment(SA, d),
		segment(c, d),
		...(diagonals ? [segment(SA, c), segment(SB, d)] : []),
		...(o ? [point(center)] : []),
		...(circle ? [cercle(center, SA)] : [])
	];
}

describe('figure composée : lecture de l’en-tête', () => {
	it('exemples A et B : une étape par ligne, dans l’ordre', () => {
		expect(checksOf(FIGURE_A).map((c) => c.kind)).toEqual(['segment', 'cercle', 'point', 'cercle']);
		expect(checksOf(FIGURE_B).map((c) => c.kind)).toEqual([
			'carre',
			'segment_par',
			'segment_par',
			'point',
			'cercle'
		]);
		expect(checksOf(FIGURE_B)[1]).toEqual({ kind: 'segment_par', points: ['A', 'C'], line: 4 });
	});

	it('segment [AC] seul : il ne sert que dans une figure composée', () => {
		expect(errorsOf(figureB(['verifier: segment [AC]']))[0]).toMatch(/figure composée/);
	});

	it('sur quadrillage : refusée', () => {
		expect(errorsOf(figureA(A_STEPS, [A_TOOLS, 'grille: 1'])).join('\n')).toMatch(
			/figure composée se construit sur papier uni/
		);
	});

	it('une droite à construire avec un segment : refusée (pas une figure composée en V1)', () => {
		const steps = ['verifier: segment AB = 6 cm', 'verifier: droite m = mediatrice(A, B)'];
		expect(
			errorsOf(figureA(steps, ['outils: segment, regle, droite, equerre, point'])).join('\n')
		).toMatch(/ne se mêle pas/);
	});

	it('un outil qui ne sert à aucune étape : refusé', () => {
		expect(
			errorsOf(figureA(A_STEPS, ['outils: segment, regle, compas, point, rapporteur'])).join('\n')
		).toMatch(/rapporteur ne sert à aucune étape/);
	});

	it('un outil d’une étape manque : refusé', () => {
		expect(errorsOf(figureA(A_STEPS, ['outils: segment, regle, point'])).join('\n')).toMatch(
			/compas/
		);
	});
});

describe('figure composée : garde de l’auteur', () => {
	it('exemples A et B : acceptés', () => {
		expect(() => assertChecks(FIGURE_A)).not.toThrow();
		expect(() => assertChecks(FIGURE_B)).not.toThrow();
	});

	it('une étape cite un point que rien ne construit : refusée', () => {
		const steps = [...A_STEPS.slice(0, 2), 'verifier: cercle k = cercle(J, passant=A)'];
		const source = figureA(steps, ['outils: segment, regle, compas']);
		expect(() => assertChecks(source)).toThrow(ConstructionAuthorError);
	});
});

describe('figure composée : exemple A (segment, puis cercles)', () => {
	it('le programme suivi : juste', () => {
		expect(judge(FIGURE_A, drawA(RIGHT))).toEqual({ status: 'correct' });
	});

	it('[AB] oblique : les étapes suivantes partent du B de l’élève', () => {
		expect(judge(FIGURE_A, drawA(OBLIQUE))).toEqual({ status: 'correct' });
	});

	it('un cercle de construction en plus, ailleurs : ignoré', () => {
		const extra = cercle({ x: 10, y: 4 }, { x: 11, y: 4 });
		expect(judge(FIGURE_A, [...drawA(RIGHT), extra])).toEqual({ status: 'correct' });
	});

	it('[AB] de 5 cm : le message de l’étape 1, et seulement lui', () => {
		const verdict = judge(FIGURE_A, drawA(RIGHT, { length: 5 }));
		expect(verdict).toEqual({
			status: 'incorrect',
			feedback: `Étape 1 : ${wrongLengthFeedback(50, { length: 60, unit: 'cm' })}`
		});
	});

	it('le cercle de rayon 2 cm manque : étape 2', () => {
		const objects = drawA(RIGHT).filter((_, i) => i !== 2);
		expect(judge(FIGURE_A, objects)).toEqual({
			status: 'incorrect',
			feedback: `Étape 2 : ${centeredMissingFeedback('A', 'longueur', '2 cm')}`
		});
	});

	it('le milieu marqué hors graduation : étape 3', () => {
		const objects = drawA(RIGHT, { middle: 3.05 });
		expect(judge(FIGURE_A, objects)).toEqual({
			status: 'incorrect',
			feedback: `Étape 3 : ${midpointEyeballedFeedback('A', 'B')}`
		});
	});

	it('le dernier cercle ne passe pas par A : étape 4', () => {
		const objects = [...drawA(RIGHT).slice(0, 4), cercle({ x: 7, y: 4 }, { x: 8, y: 4 })];
		expect(judge(FIGURE_A, objects)).toEqual({
			status: 'incorrect',
			feedback: `Étape 4 : ${goodCenterThroughFeedback('I', 'A')}`
		});
	});

	it('un objet dont l’outil n’est pas dans outils: : réponse forgée', () => {
		const forged: DrawnObject = { kind: 'droite', x1: 0, y1: 0, x2: 1, y2: 1 };
		expect(judge(FIGURE_A, [...drawA(RIGHT), forged])).toEqual({ status: 'incorrect' });
	});

	it('rien de tracé : vide', () => {
		expect(judge(FIGURE_A, [])).toEqual({ status: 'empty' });
	});
});

describe('figure composée : exemple B (carré, diagonales, cercle)', () => {
	it('le programme suivi : juste', () => {
		expect(judge(FIGURE_B, drawB(1))).toEqual({ status: 'correct' });
	});

	it('le carré au-dessous de (AB) : juste aussi (C et D de l’élève)', () => {
		expect(judge(FIGURE_B, drawB(-1))).toEqual({ status: 'correct' });
	});

	it('[BC] tracé sans l’équerre : le message de l’étape 1', () => {
		const objects = drawB(1).filter((_, i) => i !== 0);
		expect(judge(FIGURE_B, objects)).toEqual({
			status: 'incorrect',
			feedback: `Étape 1 : ${sideEyeballedFeedback('B', 'C')}`
		});
	});

	it('les diagonales manquent : étape 2', () => {
		expect(judge(FIGURE_B, drawB(1, { diagonals: false }))).toEqual({
			status: 'incorrect',
			feedback: 'Étape 2 : Trace le segment [AC].'
		});
	});

	it('O n’est pas placé : étape 4', () => {
		expect(judge(FIGURE_B, drawB(1, { o: false }))).toEqual({
			status: 'incorrect',
			feedback: `Étape 4 : ${POINT_MISSING_FEEDBACK}`
		});
	});
});
