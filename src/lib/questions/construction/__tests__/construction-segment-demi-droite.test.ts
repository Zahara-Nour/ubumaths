/**
 * Case « figure » : segment de longueur donnée le long d'une demi-droite donnée
 * (`verifier: segment AB = 6 cm sur [Ax)`, chantier `regle-graduee`, PR 2 ;
 * comportements validés par David le 2026-11-08, `docs/wip/regle-graduee-progress.md` § 4).
 *
 * `x` est le nom d'une demi-droite d'origine A de la figure (`x = demidroite(A, X)`).
 * Juste : le segment de la PR 1 (bout sur une graduation d'une règle posée en A,
 * longueur exacte), et son bout sur la demi-droite [Ax).
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { assertConstructionChecks, judgeConstruction } from '../judge';
import {
	missingSegmentFeedback,
	offRayFeedback,
	segmentEyeballedFeedback,
	severalSegmentsFeedback
} from '../segment-length';
import { rulerGraduation } from '../instruments';
import { solutionLines, solutionRuler } from '../drawing';
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

// Fenêtre 0..10 × 0..8 (règle de 10 cm) ; [Ax) de A(4 ; 4) vers X(8 ; 7) : direction (0,8 ; 0,6)
const BODY = ['A = point(4, 4)', 'X = point(8, 7, visible=faux)', 'x = demidroite(A, X)'];
const A = { x: 4, y: 4 };

function figure(verifier: string, body: string[] = BODY): string {
	return ['fenetre: 0 ; 10 ; 0 ; 8', `verifier: ${verifier}`, '---', ...body].join('\n');
}

const SIX = figure('segment AB = 6 cm sur [Ax)');

/** Règle posée : le 0 en A, vers `toward` */
const regle = (toward: Position, sens: 1 | -1 = 1) =>
	({ kind: 'regle', ox: A.x, oy: A.y, bx: toward.x, by: toward.y, sens }) satisfies DrawnRegle;
const segment = (p: Position, q: Position): DrawnObject => ({
	kind: 'segment',
	x1: p.x,
	y1: p.y,
	x2: q.x,
	y2: q.y
});
const along = (ruler: DrawnRegle, mm: number) => segment(A, rulerGraduation(ruler, mm));

/** La règle le long de [Ax) (2e toucher aimanté à la demi-droite) */
const ON_RAY = regle({ x: 8, y: 7 });

describe('verifier: segment AB = 6 cm sur [Ax) — lecture', () => {
	it('la demi-droite est lue avec la longueur ; palette Règle graduée · Segment', () => {
		const { spec, errors } = readConstructionHeader(SIX);
		expect(errors).toEqual([]);
		expect(spec.checks).toEqual([
			{ kind: 'segment', point: 'A', end: 'B', length: 60, unit: 'cm', ray: 'x', line: 2 }
		]);
		expect(spec.tools).toEqual(['regle', 'segment']);
	});

	it('5 cm 3 mm sur [Ad1) : nom de demi-droite de plusieurs caractères', () => {
		const [check] = checksOf(figure('segment AB = 5 cm 3 mm sur [Ad1)'));
		expect(check).toMatchObject({ length: 53, unit: 'cm-mm', ray: 'd1' });
	});

	it.each([
		['segment AB = 6 cm sur [Bx)', 'part de A'],
		['segment AB = 6 cm sur [Ax', 'sur [Ax)'],
		['segment AB = 6 cm sur Ax', 'sur [Ax)'],
		['segment AB = 6 cm sur [A)', 'sur [Ax)']
	])('« %s » refusé', (verifier, message) => {
		const { errors } = readConstructionHeader(figure(verifier));
		expect(errors.map((e) => e.message).join(' ; ')).toContain(message);
	});
});

describe('juge : segment AB = 6 cm sur [Ax)', () => {
	it('nominal : règle le long de [Ax), segment de A à la graduation 6 → juste', () => {
		expect(judge(SIX, [ON_RAY, along(ON_RAY, 60)])).toEqual({ status: 'correct' });
	});

	it('règle retournée, ou posée vers un autre point de la demi-droite → juste', () => {
		const flipped = regle({ x: 8, y: 7 }, -1);
		expect(judge(SIX, [flipped, along(flipped, 60)])).toEqual({ status: 'correct' });
		const farther = regle({ x: 6, y: 5.5 });
		expect(judge(SIX, [farther, along(farther, 60)])).toEqual({ status: 'correct' });
	});

	it('6 cm exacts dans une autre direction → « Trace ton segment sur la demi-droite [Ax). »', () => {
		const feedback = offRayFeedback('A', 'x');
		expect(feedback).toBe('Trace ton segment sur la demi-droite [Ax).');
		const horizontal = regle({ x: 9, y: 4 });
		expect(judge(SIX, [horizontal, along(horizontal, 60)])).toEqual({
			status: 'incorrect',
			feedback
		});
	});

	it('du mauvais côté de A (le prolongement de [Ax) au-delà de A) → même message', () => {
		const three = figure('segment AB = 3 cm sur [Ax)');
		const behind = regle({ x: 0, y: 1 });
		expect(judge(three, [behind, along(behind, 30)])).toEqual({
			status: 'incorrect',
			feedback: offRayFeedback('A', 'x')
		});
	});

	it('règle posée à l’œil, 1° à côté de la demi-droite → même message', () => {
		const angle = Math.atan2(3, 4) + Math.PI / 180;
		const tilted = regle({ x: 4 + Math.cos(angle), y: 4 + Math.sin(angle) });
		expect(judge(SIX, [tilted, along(tilted, 60)])).toEqual({
			status: 'incorrect',
			feedback: offRayFeedback('A', 'x')
		});
	});

	it('sur [Ax) mais sans règle : tracé à l’œil', () => {
		expect(judge(SIX, [segment(A, { x: 8.8, y: 7.6 })])).toEqual({
			status: 'incorrect',
			feedback: segmentEyeballedFeedback()
		});
	});

	it('sur [Ax), mauvaise graduation → la longueur mesurée', () => {
		expect(judge(SIX, [ON_RAY, along(ON_RAY, 58)])).toEqual({
			status: 'incorrect',
			feedback: 'Ton segment mesure 5,8 cm au lieu de 6 cm.'
		});
	});

	it('rien depuis A ; deux segments depuis A : messages de la PR 1', () => {
		expect(judge(SIX, [ON_RAY])).toEqual({
			status: 'incorrect',
			feedback: missingSegmentFeedback('A', 'B')
		});
		const horizontal = regle({ x: 9, y: 4 });
		expect(judge(SIX, [horizontal, along(horizontal, 40), ON_RAY, along(ON_RAY, 60)])).toEqual({
			status: 'incorrect',
			feedback: severalSegmentsFeedback('A', 'B')
		});
	});
});

describe('erreurs de l’auteur', () => {
	it('demi-droite absente de la figure', () => {
		expect(() => assertChecks(figure('segment AB = 6 cm sur [Ay)'))).toThrow(
			/demi-droite \[Ay\) n’existe pas/
		);
	});

	it('x n’est pas une demi-droite d’origine A (droite, ou autre origine)', () => {
		const line = ['A = point(4, 4)', 'X = point(8, 7)', 'x = droite(A, X)'];
		expect(() => assertChecks(figure('segment AB = 6 cm sur [Ax)', line))).toThrow(
			/x n’est pas une demi-droite d’origine A/
		);
		const elsewhere = ['A = point(4, 4)', 'X = point(8, 7)', 'x = demidroite(X, A)'];
		expect(() => assertChecks(figure('segment AB = 6 cm sur [Ax)', elsewhere))).toThrow(
			/x n’est pas une demi-droite d’origine A/
		);
	});

	it('demi-droite invisible', () => {
		const hidden = [...BODY.slice(0, 2), 'x = demidroite(A, X, visible=faux)'];
		expect(() => assertChecks(figure('segment AB = 6 cm sur [Ax)', hidden))).toThrow(
			/\[Ax\) n’est pas tracée/
		);
	});

	it('le segment ne tient pas sur la demi-droite dans la fenêtre', () => {
		// [Ax) sort de la fenêtre en y = 8, à 6,67 cm de A
		expect(() => assertChecks(figure('segment AB = 7 cm sur [Ax)'))).toThrow(
			/ne tient pas sur la demi-droite \[Ax\)/
		);
		expect(() => assertChecks(figure('segment AB = 6 cm 6 mm sur [Ax)'))).not.toThrow();
	});
});

describe('correction : la règle le long de [Ax) et le segment juste', () => {
	it('le long de [Ax), quelle que soit la règle de l’élève', () => {
		const checks = checksOf(SIX);
		const points = constructionPositions(SIX);
		const shapes = constructionShapes(SIX);
		const horizontal = regle({ x: 9, y: 4 });
		for (const drawn of [[], [horizontal, along(horizontal, 60)]]) {
			const ruler = solutionRuler(checks, points, shapes, drawn);
			expect(ruler).toMatchObject({ ox: 4, oy: 4, sens: 1 });
			expect(ruler?.bx).toBeCloseTo(4.8, 12);
			expect(ruler?.by).toBeCloseTo(4.6, 12);
			const [line] = solutionLines(checks, points, drawn, shapes);
			expect(line.x1).toBe(4);
			expect(line.y1).toBe(4);
			expect(line.x2).toBeCloseTo(8.8, 12);
			expect(line.y2).toBeCloseTo(7.6, 12);
		}
	});
});
