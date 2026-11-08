/**
 * Case « figure » : tracer un cercle de rayon donné en cm, compas ouvert sur la
 * règle graduée (`verifier: cercle c = cercle(O, rayon=4 cm)`, chantier
 * `regle-graduee`, PR 3, CE2-070 ; comportements validés par David le 2026-11-08,
 * `docs/wip/regle-graduee-progress.md` § 4, Q12).
 *
 * 1 unité de la figure = 1 cm (ADR 0036). L'élève pose la règle, le 0 en O ;
 * il pique le compas en O et l'ouvre jusqu'à une graduation (aimantée). Juste :
 * un cercle de centre O dont le point d'ouverture est sur une graduation d'une
 * règle posée avec son 0 en O, à la longueur demandée.
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { ConstructionAuthorError, assertConstructionChecks, judgeConstruction } from '../judge';
import {
	centeredMissingFeedback,
	centeredRulerEyeballedFeedback,
	severalCirclesFeedback,
	wrongCenterFeedback,
	wrongRadiusFeedback
} from '../circle';
import { rulerGraduation } from '../instruments';
import {
	nudgeRulerEnd,
	rulerSegmentMm,
	solutionCircles,
	solutionRuler,
	type Drawing
} from '../drawing';
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

const O = { x: 5, y: 5 };
const BODY = ['O = point(5, 5)'];
const WINDOW = { xMin: 0, xMax: 12, yMin: 0, yMax: 10 };

function figure(
	verifier: string | string[],
	body: string[] = BODY,
	header: string[] = [],
	window = '0 ; 12 ; 0 ; 10'
): string {
	const checks = (Array.isArray(verifier) ? verifier : [verifier]).map((v) => `verifier: ${v}`);
	return [`fenetre: ${window}`, ...header, ...checks, '---', ...body].join('\n');
}

const FOUR = figure('cercle c = cercle(O, rayon=4 cm)');

/** Règle posée : le 0 en `origin`, vers `toward` */
const regle = (toward: Position = { x: 11, y: 5 }, origin: Position = O, sens: 1 | -1 = 1) =>
	({
		kind: 'regle',
		ox: origin.x,
		oy: origin.y,
		bx: toward.x,
		by: toward.y,
		sens
	}) satisfies DrawnRegle;
const cercle = (center: Position, through: Position): DrawnObject => ({
	kind: 'cercle',
	cx: center.x,
	cy: center.y,
	x: through.x,
	y: through.y
});
/** Le compas piqué en O, ouvert jusqu'à la graduation `mm` de la règle */
const opened = (ruler: DrawnRegle, mm: number, center: Position = O) =>
	cercle(center, rulerGraduation(ruler, mm));

describe('verifier: cercle c = cercle(O, rayon=4 cm) — lecture', () => {
	it('palette Règle graduée · Compas', () => {
		const { spec, errors } = readConstructionHeader(FOUR);
		expect(errors).toEqual([]);
		expect(spec.checks).toEqual([
			{ kind: 'cercle', name: 'c', expression: 'cercle(O, rayon=4 cm)', line: 2 }
		]);
		expect(spec.tools).toEqual(['regle', 'compas']);
	});

	it.each([
		'cercle c = cercle(O, rayon=3,5 cm)',
		'cercle c = cercle(O, rayon=3 cm 5 mm)',
		'cercle c = cercle(O, rayon=35 mm)',
		'cercle c = cercle(O,rayon=4cm)'
	])('« %s » se lit', (verifier) => {
		expect(readConstructionHeader(figure(verifier)).errors).toEqual([]);
	});

	it.each([
		['cercle c = cercle(O, rayon=3,55 cm)', 'millimètre'],
		['cercle c = cercle(O, rayon=0 cm)', 'plus grand que 0']
	])('« %s » refusé', (verifier, message) => {
		const { errors } = readConstructionHeader(figure(verifier));
		expect(errors.map((e) => e.message).join(' ; ')).toContain(message);
	});

	it('quadrillage refusé : la règle graduée sert sur papier uni', () => {
		const { errors } = readConstructionHeader(
			figure('cercle c = cercle(O, rayon=4 cm)', BODY, ['grille: 1'])
		);
		expect(errors.map((e) => e.message).join(' ; ')).toContain('papier uni');
	});

	it('la règle graduée exigée ; le Report hors de la palette', () => {
		const noRuler = readConstructionHeader(
			figure('cercle c = cercle(O, rayon=4 cm)', BODY, ['outils: compas'])
		);
		expect(noRuler.errors.map((e) => e.message).join(' ; ')).toContain('règle graduée');
		const report = readConstructionHeader(
			figure('cercle c = cercle(O, rayon=4 cm)', BODY, ['outils: regle, compas, report'])
		);
		expect(report.errors.map((e) => e.message).join(' ; ')).toContain('report');
	});

	it('la règle graduée reste refusée pour un autre cercle', () => {
		const { errors } = readConstructionHeader(
			figure(
				'cercle c = cercle(O, passant=A)',
				[...BODY, 'A = point(8, 5)'],
				['outils: regle, compas']
			)
		);
		expect(errors.map((e) => e.message).join(' ; ')).toContain('règle graduée');
	});
});

describe('juge : cercle de rayon 4 cm', () => {
	it('nominal : règle posée en O, compas ouvert à la graduation 40 → juste', () => {
		expect(judge(FOUR, [regle(), opened(regle(), 40)])).toEqual({ status: 'correct' });
	});

	it('règle oblique ou retournée → juste', () => {
		const oblique = regle({ x: 9, y: 8 }, O, -1);
		expect(judge(FOUR, [oblique, opened(oblique, 40)])).toEqual({ status: 'correct' });
	});

	it('3,5 cm, 3 cm 5 mm, 35 mm → juste à la graduation 35', () => {
		for (const length of ['3,5 cm', '3 cm 5 mm', '35 mm']) {
			const source = figure(`cercle c = cercle(O, rayon=${length})`);
			expect(judge(source, [regle(), opened(regle(), 35)])).toEqual({ status: 'correct' });
		}
	});

	it('rien de tracé, ou la règle seule → « Trace le cercle de centre O et de rayon 4 cm. »', () => {
		const feedback = centeredMissingFeedback('O', 'longueur', '4 cm');
		expect(feedback).toBe('Trace le cercle de centre O et de rayon 4 cm.');
		expect(judge(FOUR, [regle()])).toEqual({ status: 'incorrect', feedback });
	});

	it('compas piqué ailleurs qu’en O → « Pique ton compas en O. »', () => {
		const elsewhere = regle({ x: 10, y: 3 }, { x: 4, y: 3 });
		expect(judge(FOUR, [elsewhere, opened(elsewhere, 40, { x: 4, y: 3 })])).toEqual({
			status: 'incorrect',
			feedback: wrongCenterFeedback('O')
		});
	});

	it('ouvert à l’œil (sans règle, règle ailleurs, hors graduation) → « ouvre-le sur une graduation »', () => {
		const feedback = centeredRulerEyeballedFeedback();
		expect(feedback).toBe(
			'Ton compas est ouvert à l’œil : ouvre-le sur une graduation de la règle.'
		);
		// Le bon rayon, mais sans règle
		expect(judge(FOUR, [cercle(O, { x: 9, y: 5 })])).toEqual({ status: 'incorrect', feedback });
		// Règle dont le 0 n'est pas en O
		const shifted = regle({ x: 11, y: 5 }, { x: 4, y: 5 });
		expect(judge(FOUR, [shifted, cercle(O, { x: 9, y: 5 })])).toEqual({
			status: 'incorrect',
			feedback
		});
		// Entre deux graduations
		expect(judge(FOUR, [regle(), cercle(O, { x: 9.04, y: 5 })])).toEqual({
			status: 'incorrect',
			feedback
		});
		// Loin du bord de la règle
		expect(judge(FOUR, [regle(), cercle(O, { x: 5, y: 9 })])).toEqual({
			status: 'incorrect',
			feedback
		});
	});

	it('mauvais rayon → « Ton cercle a un rayon de 3,8 cm au lieu de 4 cm. », dans l’unité de l’auteur', () => {
		expect(judge(FOUR, [regle(), opened(regle(), 38)])).toEqual({
			status: 'incorrect',
			feedback: 'Ton cercle a un rayon de 3,8 cm au lieu de 4 cm.'
		});
		const mm = figure('cercle c = cercle(O, rayon=35 mm)');
		expect(judge(mm, [regle(), opened(regle(), 38)])).toEqual({
			status: 'incorrect',
			feedback: wrongRadiusFeedback(38, { length: 35, unit: 'mm' })
		});
		expect(wrongRadiusFeedback(38, { length: 35, unit: 'mm' })).toBe(
			'Ton cercle a un rayon de 38 mm au lieu de 35 mm.'
		);
	});

	it('plusieurs cercles de centre O (rayons distincts) → « Trace un seul cercle de centre O. » (comme Q9)', () => {
		expect(severalCirclesFeedback('O')).toBe('Trace un seul cercle de centre O.');
		expect(judge(FOUR, [regle(), opened(regle(), 38), opened(regle(), 40)])).toEqual({
			status: 'incorrect',
			feedback: severalCirclesFeedback('O')
		});
	});

	it('le même cercle tracé deux fois : un seul cercle vu → juste', () => {
		expect(judge(FOUR, [regle(), opened(regle(), 40), opened(regle(), 40)])).toEqual({
			status: 'correct'
		});
	});

	it('un cercle d’un autre centre à côté du bon : trait de construction, ignoré', () => {
		expect(
			judge(FOUR, [regle(), opened(regle(), 40), cercle({ x: 2, y: 2 }, { x: 3, y: 2 })])
		).toEqual({ status: 'correct' });
	});

	it('cercles concentriques de 2 cm et 4 cm : chacun le sien → juste', () => {
		const both = figure(['cercle c = cercle(O, rayon=2 cm)', 'cercle d = cercle(O, rayon=4 cm)']);
		expect(judge(both, [regle(), opened(regle(), 20), opened(regle(), 40)])).toEqual({
			status: 'correct'
		});
		expect(judge(both, [regle(), opened(regle(), 20), opened(regle(), 38)])).toEqual({
			status: 'incorrect',
			feedback: 'Ton cercle a un rayon de 3,8 cm au lieu de 4 cm.'
		});
		// Trois rayons distincts pour deux cercles attendus : un éventail
		expect(
			judge(both, [regle(), opened(regle(), 20), opened(regle(), 38), opened(regle(), 39)])
		).toEqual({ status: 'incorrect', feedback: severalCirclesFeedback('O') });
	});

	it('un segment, un point, une droite, un Report : réponse forgée', () => {
		const forged: DrawnObject[] = [
			{ kind: 'segment', x1: 5, y1: 5, x2: 9, y2: 5 },
			{ kind: 'point', x: 9, y: 5 },
			{ kind: 'droite', x1: 5, y1: 5, x2: 9, y2: 5 },
			{ kind: 'report', cx: 5, cy: 5, ax: 0, ay: 0, bx: 4, by: 0 }
		];
		for (const object of forged) {
			expect(judge(FOUR, [regle(), opened(regle(), 40), object])).toEqual({
				status: 'incorrect'
			});
		}
	});

	it('une règle avec un cercle de centre donné passant par un point : réponse forgée', () => {
		const through = figure('cercle c = cercle(O, passant=A)', [...BODY, 'A = point(8, 5)']);
		expect(judge(through, [regle(), cercle(O, { x: 8, y: 5 })])).toEqual({ status: 'incorrect' });
	});
});

describe('erreurs de l’auteur', () => {
	it('le cercle sort de la fenêtre', () => {
		expect(() => assertChecks(figure('cercle c = cercle(O, rayon=6 cm)'))).toThrow(
			ConstructionAuthorError
		);
		expect(() => assertChecks(figure('cercle c = cercle(O, rayon=6 cm)'))).toThrow(/fenêtre/);
	});

	it('plus long que la règle (20 cm au plus)', () => {
		const tooLong = figure(
			'cercle c = cercle(O, rayon=21 cm)',
			['O = point(25, 25)'],
			[],
			'0 ; 50 ; 0 ; 50'
		);
		expect(() => assertChecks(tooLong)).toThrow(/plus long que la règle/);
	});

	it('sans fenêtre : refusé', () => {
		const source = ['verifier: cercle c = cercle(O, rayon=4 cm)', '---', ...BODY].join('\n');
		expect(() => assertChecks(source)).toThrow(/fenetre:/);
	});

	it('O absent ou invisible', () => {
		expect(() => assertChecks(figure('cercle c = cercle(P, rayon=4 cm)'))).toThrow(
			ConstructionAuthorError
		);
		const hidden = figure('cercle c = cercle(O, rayon=4 cm)', ['O = point(5, 5, visible=faux)']);
		expect(() => assertChecks(hidden)).toThrow(/visible/);
	});

	it('nominal : pas d’erreur', () => {
		expect(() => assertChecks(FOUR)).not.toThrow();
	});
});

describe('geste : ‹ › décalent l’ouverture du compas d’1 mm le long de la règle', () => {
	const options = { rulerLength: 12, window: WINDOW, shape: 'cercle' as const };

	it('le dernier cercle ouvert sur la règle : son ouverture bouge d’1 mm', () => {
		const drawn: Drawing = { objects: [regle(), opened(regle(), 40)], start: null };
		expect(nudgeRulerEnd(drawn, -1, options).objects).toEqual([regle(), opened(regle(), 39)]);
		expect(nudgeRulerEnd(drawn, 2, options).objects).toEqual([regle(), opened(regle(), 42)]);
		expect(rulerSegmentMm(drawn, 12)).toBe(40);
	});

	it('sans cercle sur la règle, au compas : en trace un piqué au 0', () => {
		const posed: Drawing = { objects: [regle()], start: null };
		expect(nudgeRulerEnd(posed, 1, options).objects).toEqual([regle(), opened(regle(), 1)]);
	});
});

describe('correction : la règle posée en O et le cercle', () => {
	it('sans tracé : la règle vers la droite ; le cercle de rayon 4', () => {
		const checks = checksOf(FOUR);
		const points = constructionPositions(FOUR);
		const shapes = constructionShapes(FOUR);
		expect(solutionRuler(checks, points, shapes, [])).toEqual(regle({ x: 6, y: 5 }));
		const [circle] = solutionCircles(checks, constructionExpected(FOUR), points, shapes);
		expect(circle).toMatchObject({ name: 'c', center: O, radius: 4, mediatrices: [] });
	});

	it('dans la direction de la règle que l’élève a posée en O', () => {
		const oblique = regle({ x: 9, y: 8 });
		const checks = checksOf(FOUR);
		expect(
			solutionRuler(checks, constructionPositions(FOUR), constructionShapes(FOUR), [oblique])
		).toEqual(oblique);
	});
});
