/**
 * Case « figure » : tracer un segment de longueur donnée à la règle graduée
 * (`verifier: segment AB = 6 cm`, chantier `regle-graduee`, CE2-039 ; ADR 0036,
 * comportements validés par David le 2026-11-08, `docs/wip/regle-graduee-progress.md` § 2).
 *
 * 1 unité de la figure = 1 cm. L'élève pose la règle (le 0 en A, puis la
 * direction), puis trace au segment de A jusqu'à une graduation du millimètre.
 * Juste : un segment d'un bout en A, de la longueur exacte, l'autre bout sur une
 * graduation d'une règle posée avec son 0 en A (sinon « tracé à l'œil »).
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { ConstructionAuthorError, assertConstructionChecks, judgeConstruction } from '../judge';
import {
	formatLength,
	missingSegmentFeedback,
	rulerLengthOf,
	segmentEyeballedFeedback,
	wrongLengthFeedback
} from '../segment-length';
import { rulerGraduation, rulerGraduationNear } from '../instruments';
import {
	addTap,
	canErase,
	currentRuler,
	eraseLast,
	flipRuler,
	nudgeRulerEnd,
	solutionLines,
	solutionRuler,
	type Drawing
} from '../drawing';
import {
	parseConstructionAnswer,
	serializeConstructionAnswer,
	type DrawnObject,
	type DrawnRegle
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
	body: string[] = BODY,
	header: string[] = [],
	window = '0 ; 10 ; 0 ; 8'
): string {
	return [`fenetre: ${window}`, ...header, `verifier: ${verifier}`, '---', ...body].join('\n');
}

const A = { x: 2, y: 4 };
// Fenêtre 0..10 × 0..8 : règle de 10 cm (le plus grand côté de la fenêtre)
const BODY = ['A = point(2, 4)'];
const SIX = figure('segment AB = 6 cm');
const WINDOW = { xMin: 0, xMax: 10, yMin: 0, yMax: 8 };

/** Règle posée : le 0 en `origin`, vers `toward` */
const regle = (toward: Position = { x: 9, y: 4 }, origin: Position = A, sens: 1 | -1 = 1) =>
	({
		kind: 'regle',
		ox: origin.x,
		oy: origin.y,
		bx: toward.x,
		by: toward.y,
		sens
	}) satisfies DrawnRegle;
const segment = (p: Position, q: Position): DrawnObject => ({
	kind: 'segment',
	x1: p.x,
	y1: p.y,
	x2: q.x,
	y2: q.y
});
/** Le segment tracé de A à la graduation `mm` de la règle */
const along = (ruler: DrawnRegle, mm: number) => segment(A, rulerGraduation(ruler, mm));

describe('verifier: segment AB = 6 cm — lecture', () => {
	it('le point de départ, le nom du bout, la longueur en mm ; palette Règle graduée · Segment', () => {
		const { spec, errors } = readConstructionHeader(SIX);
		expect(errors).toEqual([]);
		expect(spec.checks).toEqual([
			{ kind: 'segment', point: 'A', end: 'B', length: 60, unit: 'cm', line: 2 }
		]);
		expect(spec.tools).toEqual(['regle', 'segment']);
	});

	it.each([
		['segment AB = 5 cm 3 mm', 53, 'cm-mm'],
		['segment AB = 5,3 cm', 53, 'cm'],
		['segment AB = 5.3 cm', 53, 'cm'],
		['segment AB = 72 mm', 72, 'mm'],
		['segment AB=12cm', 120, 'cm']
	])('« %s » : %i mm', (verifier, length, unit) => {
		const [check] = checksOf(figure(verifier));
		expect(check).toMatchObject({ kind: 'segment', length, unit });
	});

	it.each([
		['segment AB = 5,35 cm', 'millimètre'],
		['segment AB = 0 cm', 'plus grande que 0'],
		['segment AB = 0 mm', 'plus grande que 0'],
		['segment AB = 6', 'segment AB = 6 cm'],
		['segment AB = 6 m', 'segment AB = 6 cm'],
		['segment AB = 5 cm 12 mm', 'segment AB = 6 cm'],
		['segment AA = 6 cm', 'différents'],
		['segment A = 6 cm', 'segment AB = 6 cm']
	])('« %s » refusé', (verifier, message) => {
		const { errors } = readConstructionHeader(figure(verifier));
		expect(errors.map((e) => e.message).join(' ; ')).toContain(message);
	});

	it('quadrillage refusé : la règle graduée sert sur papier uni (ADR 0036 § 3)', () => {
		const { errors } = readConstructionHeader(figure('segment AB = 6 cm', BODY, ['grille: 1']));
		expect(errors.map((e) => e.message).join(' ; ')).toContain('papier uni');
	});

	it('outil hors de la palette refusé ; règle graduée ailleurs refusée ; segment exigé', () => {
		const withCompass = readConstructionHeader(
			figure('segment AB = 6 cm', BODY, ['outils: regle, segment, compas'])
		);
		expect(withCompass.errors.map((e) => e.message).join(' ; ')).toContain('compas');
		const noSegment = readConstructionHeader(figure('segment AB = 6 cm', BODY, ['outils: regle']));
		expect(noSegment.errors.map((e) => e.message).join(' ; ')).toContain('outil segment');
		const elsewhere = readConstructionHeader(
			figure('droite_par A ; C', [...BODY, 'C = point(8, 4)'], ['outils: droite, regle'])
		);
		expect(elsewhere.errors.map((e) => e.message).join(' ; ')).toContain('règle graduée');
	});

	it('un segment de longueur donnée ne se mêle pas à d’autres vérifications', () => {
		const source = [
			'fenetre: 0 ; 10 ; 0 ; 8',
			'outils: regle, segment',
			'verifier: segment AB = 6 cm',
			'verifier: segment AC = 4 cm',
			'---',
			...BODY
		].join('\n');
		const { errors } = readConstructionHeader(source);
		expect(errors.map((e) => e.message).join(' ; ')).toContain('ne se mêle pas');
	});
});

describe('longueurs écrites à l’élève', () => {
	it.each([
		[58, 'cm', '5,8 cm'],
		[60, 'cm', '6 cm'],
		[58, 'cm-mm', '5 cm 8 mm'],
		[60, 'cm-mm', '6 cm'],
		[7, 'cm-mm', '7 mm'],
		[72, 'mm', '72 mm']
	] as const)('%i mm (%s) : « %s »', (mm, unit, text) => {
		expect(formatLength(mm, unit)).toBe(text);
	});
});

describe('règle graduée : longueur et graduations', () => {
	it('la règle mesure le plus grand côté de la fenêtre, en cm entiers, 20 cm au plus', () => {
		expect(rulerLengthOf(WINDOW)).toBe(10);
		expect(rulerLengthOf({ xMin: 0, xMax: 10.7, yMin: 0, yMax: 4 })).toBe(10);
		expect(rulerLengthOf({ xMin: -2, xMax: 30, yMin: 0, yMax: 10 })).toBe(20);
		expect(rulerLengthOf(null)).toBe(20);
	});

	it('la graduation `mm` est à mm/10 unités du 0, dans la direction de la règle', () => {
		expect(rulerGraduation(regle(), 60)).toEqual({ x: 8, y: 4 });
		const oblique = rulerGraduation(regle({ x: 6, y: 7 }), 50);
		expect(oblique.x).toBeCloseTo(6, 12);
		expect(oblique.y).toBeCloseTo(7, 12);
	});

	it('un toucher près du bord s’aimante à la graduation du mm la plus proche', () => {
		expect(rulerGraduationNear({ x: 8.03, y: 4.1 }, regle(), 10, 0.3, WINDOW)).toEqual({
			x: 8,
			y: 4
		});
		expect(rulerGraduationNear({ x: 5.36, y: 3.9 }, regle(), 10, 0.3, WINDOW)).toEqual({
			x: 2 + 3.4,
			y: 4
		});
		// Loin du bord, au-delà de la règle, hors de la fenêtre : rien
		expect(rulerGraduationNear({ x: 8, y: 5 }, regle(), 10, 0.3, WINDOW)).toBeNull();
		expect(rulerGraduationNear({ x: 9.9, y: 4 }, regle(), 5, 0.3, WINDOW)).toBeNull();
		expect(
			rulerGraduationNear({ x: -0.5, y: 4 }, regle({ x: 0, y: 4 }), 10, 0.3, WINDOW)
		).toBeNull();
	});
});

describe('réponse : regle(ox;oy;bx;by;sens)', () => {
	it('se lit et s’écrit', () => {
		const text = serializeConstructionAnswer([regle(), along(regle(), 60)]);
		expect(text).toBe('regle(2;4;9;4;1)|segment(2;4;8;4)');
		expect(parseConstructionAnswer(text)).toEqual([regle(), along(regle(), 60)]);
	});

	it.each(['regle(2;4;9;4;2)', 'regle(2;4;2;4;1)', 'regle(2;4;9;1)'])('%s : illisible', (text) => {
		expect(parseConstructionAnswer(text)).toBeNull();
	});
});

describe('juge : segment AB = 6 cm', () => {
	it('nominal : règle posée en A, segment de A à la graduation 6 → juste', () => {
		expect(judge(SIX, [regle(), along(regle(), 60)])).toEqual({ status: 'correct' });
	});

	it('dans une direction quelconque, tracé du bout vers A, règle retournée → juste', () => {
		const oblique = regle({ x: 6, y: 7 }, A, -1);
		expect(judge(SIX, [oblique, along(oblique, 60)])).toEqual({ status: 'correct' });
		expect(judge(SIX, [regle(), segment(rulerGraduation(regle(), 60), A)])).toEqual({
			status: 'correct'
		});
	});

	it('5 cm 3 mm, 5,3 cm, 72 mm → juste à la graduation du millimètre', () => {
		expect(judge(figure('segment AB = 5 cm 3 mm'), [regle(), along(regle(), 53)])).toEqual({
			status: 'correct'
		});
		expect(judge(figure('segment AB = 5,3 cm'), [regle(), along(regle(), 53)])).toEqual({
			status: 'correct'
		});
		expect(judge(figure('segment AB = 72 mm'), [regle(), along(regle(), 72)])).toEqual({
			status: 'correct'
		});
	});

	it('plusieurs règles et segments : juste si l’un convient', () => {
		const other = regle({ x: 2, y: 8 });
		expect(judge(SIX, [other, along(other, 40), regle(), along(regle(), 60)])).toEqual({
			status: 'correct'
		});
	});

	it('rien de tracé → vide', () => {
		expect(judge(SIX, '')).toEqual({ status: 'empty' });
	});

	it('la règle seule, ou un segment qui ne part pas de A → « Trace le segment [AB] depuis le point A. »', () => {
		const feedback = missingSegmentFeedback('A', 'B');
		expect(feedback).toBe('Trace le segment [AB] depuis le point A.');
		expect(judge(SIX, [regle()])).toEqual({ status: 'incorrect', feedback });
		expect(judge(SIX, [regle(), segment({ x: 3, y: 4 }, { x: 9, y: 4 })])).toEqual({
			status: 'incorrect',
			feedback
		});
	});

	it('sans règle, règle dont le 0 n’est pas en A, bout hors graduation → tracé à l’œil', () => {
		const feedback = segmentEyeballedFeedback();
		expect(feedback).toBe(
			'Ton segment est tracé à l’œil : arrête-le sur une graduation de la règle.'
		);
		expect(judge(SIX, [segment(A, { x: 8, y: 4 })])).toEqual({ status: 'incorrect', feedback });
		const shifted = regle({ x: 9, y: 4 }, { x: 1, y: 4 });
		expect(judge(SIX, [shifted, segment(A, rulerGraduation(shifted, 70))])).toEqual({
			status: 'incorrect',
			feedback
		});
		expect(judge(SIX, [regle(), segment(A, { x: 8.05, y: 4 })])).toEqual({
			status: 'incorrect',
			feedback
		});
		// Hors du bord de la règle
		expect(judge(SIX, [regle(), segment(A, { x: 8, y: 4.5 })])).toEqual({
			status: 'incorrect',
			feedback
		});
	});

	it('au-delà de la règle (11 cm sur une règle de 10 cm) → tracé à l’œil', () => {
		const square = figure('segment AB = 6 cm', ['A = point(0.5, 0.5)'], [], '0 ; 10 ; 0 ; 10');
		const diagonal = regle({ x: 10, y: 10 }, { x: 0.5, y: 0.5 });
		expect(
			judge(square, [diagonal, segment({ x: 0.5, y: 0.5 }, rulerGraduation(diagonal, 110))])
		).toEqual({ status: 'incorrect', feedback: segmentEyeballedFeedback() });
	});

	it('mauvaise longueur → « Ton segment mesure 5,8 cm au lieu de 6 cm. », dans l’unité de l’auteur', () => {
		expect(judge(SIX, [regle(), along(regle(), 58)])).toEqual({
			status: 'incorrect',
			feedback: 'Ton segment mesure 5,8 cm au lieu de 6 cm.'
		});
		expect(judge(figure('segment AB = 72 mm'), [regle(), along(regle(), 70)])).toEqual({
			status: 'incorrect',
			feedback: 'Ton segment mesure 70 mm au lieu de 72 mm.'
		});
		expect(judge(figure('segment AB = 5 cm 3 mm'), [regle(), along(regle(), 58)])).toEqual({
			status: 'incorrect',
			feedback: wrongLengthFeedback(58, { length: 53, unit: 'cm-mm' })
		});
		expect(wrongLengthFeedback(58, { length: 53, unit: 'cm-mm' })).toBe(
			'Ton segment mesure 5 cm 8 mm au lieu de 5 cm 3 mm.'
		);
	});

	it('une droite, un point, un bout hors de la fenêtre : réponse forgée', () => {
		expect(judge(SIX, [regle(), { kind: 'droite', x1: 2, y1: 4, x2: 8, y2: 4 }])).toEqual({
			status: 'incorrect'
		});
		expect(judge(SIX, [regle(), along(regle(), 60), { kind: 'point', x: 8, y: 4 }])).toEqual({
			status: 'incorrect'
		});
		const left = regle({ x: 0, y: 4 });
		expect(judge(figure('segment AB = 3 cm'), [left, along(left, 30)])).toEqual({
			status: 'incorrect'
		});
	});

	it('une règle hors d’un segment de longueur donnée : réponse forgée', () => {
		const angle = figure(
			'angle AOy = 50',
			['O = point(4, 3)', 'A = point(10, 3)', 'x = demidroite(O, A)'],
			[]
		);
		expect(
			judge(angle, [
				{ kind: 'regle', ox: 4, oy: 3, bx: 10, by: 3, sens: 1 },
				segment({ x: 4, y: 3 }, { x: 6, y: 5 })
			])
		).toEqual({ status: 'incorrect' });
	});
});

describe('erreurs de l’auteur', () => {
	it('A absent, B déjà dans la figure', () => {
		expect(() => assertChecks(figure('segment ZB = 6 cm'))).toThrow(ConstructionAuthorError);
		expect(() => assertChecks(figure('segment ZB = 6 cm'))).toThrow(/Z n’existe pas/);
		expect(() => assertChecks(figure('segment AB = 6 cm', [...BODY, 'B = point(8, 4)']))).toThrow(
			/B existe déjà/
		);
	});

	it('plus long que la règle (le plus grand côté de la fenêtre)', () => {
		expect(() => assertChecks(figure('segment AB = 11 cm'))).toThrow(/plus long que la règle/);
	});

	it('qui ne tient dans la fenêtre depuis A dans aucune direction', () => {
		// Coin le plus loin de A(2 ; 4) : à √80 ≈ 8,9 cm
		expect(() => assertChecks(figure('segment AB = 9 cm'))).toThrow(/ne tient pas dans la fenêtre/);
		expect(() => assertChecks(figure('segment AB = 8 cm 9 mm'))).not.toThrow();
	});

	it('sans fenêtre : refusé (la règle et la longueur se règlent sur la fenêtre)', () => {
		const source = ['verifier: segment AB = 6 cm', '---', ...BODY].join('\n');
		expect(() => assertChecks(source)).toThrow(/fenetre:/);
	});

	it('A invisible', () => {
		expect(() =>
			assertChecks(figure('segment AB = 6 cm', ['A = point(2, 4, visible=faux)']))
		).toThrow(/A n’est pas visible/);
	});
});

describe('geste : poser la règle, tracer le long, ‹ ›, Retourner, Effacer', () => {
	const empty: Drawing = { objects: [], start: null };
	const posed = (toward: Position = { x: 9, y: 4 }) =>
		addTap(addTap(empty, A, 'regle'), toward, 'regle');

	it('1er toucher : le 0 ; 2e : la direction → la règle posée, dans la réponse', () => {
		const first = addTap(empty, A, 'regle');
		expect(first).toEqual({ objects: [], start: A });
		expect(posed()).toEqual({ objects: [regle()], start: null });
		expect(currentRuler(posed())).toEqual(regle());
		expect(canErase(posed())).toBe(true);
	});

	it('reposer la règle sans rien tracer la remplace ; après un segment, elle s’ajoute', () => {
		const again = addTap(addTap(posed(), A, 'regle'), { x: 6, y: 7 }, 'regle');
		expect(again.objects).toEqual([regle({ x: 6, y: 7 })]);
		const drawn = { objects: [regle(), along(regle(), 60)], start: null };
		const after = addTap(addTap(drawn, A, 'regle'), { x: 6, y: 7 }, 'regle');
		expect(after.objects).toEqual([regle(), along(regle(), 60), regle({ x: 6, y: 7 })]);
		expect(currentRuler(after)).toEqual(regle({ x: 6, y: 7 }));
	});

	it('Retourner change le bord de la règle posée', () => {
		expect(flipRuler(posed()).objects).toEqual([regle({ x: 9, y: 4 }, A, -1)]);
		expect(flipRuler(flipRuler(posed())).objects).toEqual([regle()]);
		expect(flipRuler(empty)).toBe(empty);
	});

	it('‹ › : sans segment le long de la règle, en trace un depuis le 0 ; sinon décalent son bout d’1 mm', () => {
		const options = { rulerLength: 10, window: WINDOW };
		const one = nudgeRulerEnd(posed(), 1, options);
		expect(one.objects).toEqual([regle(), along(regle(), 1)]);
		// Pas de segment de longueur nulle : au moins 1 mm
		expect(nudgeRulerEnd(posed(), -1, options).objects).toEqual([regle(), along(regle(), 1)]);
		const drawn: Drawing = { objects: [regle(), along(regle(), 60)], start: null };
		expect(nudgeRulerEnd(drawn, -1, options).objects).toEqual([regle(), along(regle(), 59)]);
		expect(nudgeRulerEnd(drawn, 10, options).objects).toEqual([regle(), along(regle(), 70)]);
		// Le bout ne sort ni de la fenêtre (x = 10 : 80 mm) ni de la règle
		expect(nudgeRulerEnd(drawn, 50, options).objects).toEqual([regle(), along(regle(), 80)]);
		const atEdge: Drawing = { objects: [regle(), along(regle(), 80)], start: null };
		expect(nudgeRulerEnd(atEdge, 1, options)).toBe(atEdge);
		expect(nudgeRulerEnd(empty, 1, options)).toBe(empty);
	});

	it('‹ › suivent un segment tracé du bout vers le 0', () => {
		const options = { rulerLength: 10, window: WINDOW };
		const reversed: Drawing = {
			objects: [regle(), segment(rulerGraduation(regle(), 60), A)],
			start: null
		};
		expect(nudgeRulerEnd(reversed, 1, options).objects).toEqual([
			regle(),
			segment(rulerGraduation(regle(), 61), A)
		]);
	});

	it('Effacer : le segment, puis la règle', () => {
		const drawn: Drawing = { objects: [regle(), along(regle(), 60)], start: null };
		const once = eraseLast(drawn);
		expect(once.objects).toEqual([regle()]);
		expect(eraseLast(once).objects).toEqual([]);
		expect(currentRuler(eraseLast(once))).toBeNull();
	});
});

describe('correction : la règle posée depuis A et le segment juste', () => {
	const shapes = () => constructionShapes(SIX);

	it('sans tracé : vers la droite', () => {
		const checks = checksOf(SIX);
		const points = constructionPositions(SIX);
		expect(solutionLines(checks, points, [], shapes())).toEqual([segment(A, { x: 8, y: 4 })]);
		expect(solutionRuler(checks, points, shapes(), [])).toEqual(regle({ x: 3, y: 4 }));
	});

	it('dans la direction de la règle que l’élève a posée en A', () => {
		const checks = checksOf(SIX);
		const points = constructionPositions(SIX);
		const oblique = regle({ x: 6, y: 7 });
		const [line] = solutionLines(checks, points, [oblique, along(oblique, 58)], shapes());
		expect(line.x1).toBe(2);
		expect(line.y1).toBe(4);
		expect(line.x2).toBeCloseTo(2 + 6 * 0.8, 12);
		expect(line.y2).toBeCloseTo(4 + 6 * 0.6, 12);
		expect(solutionRuler(checks, points, shapes(), [oblique])).toEqual(oblique);
	});

	it('vers la droite si le segment n’y tient pas : une autre direction', () => {
		const right = figure('segment AB = 6 cm', ['A = point(7, 4)']);
		const [line] = solutionLines(
			checksOf(right),
			constructionPositions(right),
			[],
			constructionShapes(right)
		);
		expect(line).toEqual(segment({ x: 7, y: 4 }, { x: 1, y: 4 }));
	});
});
