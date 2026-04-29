/**
 * Validation tests for trace() demo page DSL scripts.
 * Each test verifies that the DSL parses, runs, creates a trace element,
 * and accumulates points when interactions occur.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import { numeric } from '../../types/geo-value';

function run(script: string) {
	const program = parse(script);
	return interpret(program);
}

function getId(symbols: Map<string, { figureId?: string }>, name: string): string {
	const sym = symbols.get(name);
	if (!sym?.figureId) throw new Error(`Symbol "${name}" not found`);
	return sym.figureId;
}

// ── 1. Dessin libre ──────────────────────────────────────────

describe('demo: dessin libre', () => {
	const dsl = `A = point(0, 0, couleur="rouge")
T = trace(A, couleur="violet")`;

	it('creates trace on free point and accumulates on drag', () => {
		const { figure, symbols } = run(dsl);
		const aId = getId(symbols, 'A');
		const trId = getId(symbols, 'T');

		expect(figure.getTracePoints(trId).length).toBe(1);

		// Simulate freehand drawing
		const path = [
			[1, 0],
			[2, 1],
			[3, 3],
			[2, 4],
			[0, 3],
			[-1, 1]
		];
		for (const [x, y] of path) {
			figure.movePoint(aId, numeric(x), numeric(y));
			figure.recompute();
		}

		expect(figure.getTracePoints(trId).length).toBe(7); // 1 seed + 6 moves
	});
});

// ── 2. Spirale d'Archimede ───────────────────────────────────

describe('demo: spirale Archimede', () => {
	const dsl = `O = point(0, 0, couleur="bleu")
t = slider(min=0, max=1080, valeur=0, pas=2)
A = point(1, 0)
B = rotation(A, centre=O, angle=t)
r = t / 360
C = homothetie(B, centre=O, rapport=r, couleur="orange")
T = trace(C, couleur="violet")`;

	it('creates trace and accumulates as slider moves', () => {
		const { figure, symbols } = run(dsl);
		const sId = getId(symbols, 't');
		const trId = getId(symbols, 'T');

		expect(figure.getTracePoints(trId).length).toBe(1);

		// Sweep slider
		for (let angle = 30; angle <= 720; angle += 30) {
			figure.moveSlider(sId, angle);
			figure.recompute();
		}

		const points = figure.getTracePoints(trId);
		expect(points.length).toBeGreaterThan(10);
		// Check spiral grows outward: later points further from origin
		const firstR = Math.hypot(points[1].x, points[1].y);
		const lastR = Math.hypot(points[points.length - 1].x, points[points.length - 1].y);
		expect(lastR).toBeGreaterThan(firstR);
	});
});

// ── 3. Epicycloide via slider ────────────────────────────────

describe('demo: epicycloide slider', () => {
	const dsl = `O = point(0, 0, couleur="bleu")
t = slider(min=0, max=1080, valeur=0, pas=3)
P = point(4, 0)
A = rotation(P, centre=O, angle=t)
Q = point(5, 0)
B0 = rotation(Q, centre=O, angle=t)
k = -3 * t
B = rotation(B0, centre=A, angle=k, couleur="orange")
T = trace(B, couleur="violet")`;

	it('creates trace and accumulates epicycloid pattern', () => {
		const { figure, symbols } = run(dsl);
		const sId = getId(symbols, 't');
		const trId = getId(symbols, 'T');

		for (let angle = 10; angle <= 360; angle += 10) {
			figure.moveSlider(sId, angle);
			figure.recompute();
		}

		const points = figure.getTracePoints(trId);
		expect(points.length).toBeGreaterThan(20);
	});
});

// ── 4. Rosace progressive ────────────────────────────────────

describe('demo: rosace progressive', () => {
	const dsl = `O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=4, couleur="gris")
t = slider(min=0, max=360, valeur=0, pas=1)
A = point(4, 0)
B = rotation(A, centre=O, angle=t)
theta = angle(O, B)
k = cos(3 * theta)
C = homothetie(B, centre=O, rapport=k, couleur="orange")
T = trace(C, couleur="violet")`;

	it('trace builds rose petals as slider sweeps', () => {
		const { figure, symbols } = run(dsl);
		const sId = getId(symbols, 't');
		const trId = getId(symbols, 'T');

		for (let angle = 5; angle <= 360; angle += 5) {
			figure.moveSlider(sId, angle);
			figure.recompute();
		}

		const points = figure.getTracePoints(trId);
		expect(points.length).toBeGreaterThan(50);
		// Rose should have points in all quadrants
		const hasPositiveX = points.some((p) => p.x > 1);
		const hasNegativeX = points.some((p) => p.x < -1);
		const hasPositiveY = points.some((p) => p.y > 1);
		const hasNegativeY = points.some((p) => p.y < -1);
		expect(hasPositiveX && hasNegativeX && hasPositiveY && hasNegativeY).toBe(true);
	});
});

// ── 5. Exploration 2-parametres ──────────────────────────────

describe('demo: exploration 2 parametres', () => {
	const dsl = `O = point(0, 0, couleur="bleu")
a = slider(min=0, max=360, valeur=0, pas=5)
r = slider(min=1, max=5, valeur=3, pas=0.2)
A = point(1, 0)
B = rotation(A, centre=O, angle=a)
C = homothetie(B, centre=O, rapport=r, couleur="orange")
T = trace(C, couleur="violet")`;

	it('trace accumulates from both slider movements', () => {
		const { figure, symbols } = run(dsl);
		const aId = getId(symbols, 'a');
		const rId = getId(symbols, 'r');
		const trId = getId(symbols, 'T');

		// Sweep angle at fixed radius
		for (let angle = 30; angle <= 180; angle += 30) {
			figure.moveSlider(aId, angle);
			figure.recompute();
		}
		const afterAngle = figure.getTracePoints(trId).length;
		expect(afterAngle).toBeGreaterThan(4);

		// Then sweep radius at fixed angle
		for (let radius = 1; radius <= 5; radius += 0.5) {
			figure.moveSlider(rId, radius);
			figure.recompute();
		}
		const afterBoth = figure.getTracePoints(trId).length;
		expect(afterBoth).toBeGreaterThan(afterAngle);
	});
});

// ── 6. Lieu vs Trace comparaison ─────────────────────────────

describe('demo: lieu vs trace comparaison', () => {
	const dsl = `O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
P = point(5, 0, couleur="vert")
M = milieu(A, P, couleur="orange")
L = lieu(M, A, couleur="cyan")
T = trace(M, couleur="violet")`;

	it('lieu is complete, trace starts with 1 point', () => {
		const { figure, symbols } = run(dsl);
		const lId = getId(symbols, 'L');
		const trId = getId(symbols, 'T');

		// Lieu computes full curve instantly
		const viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
		const locusCurve = figure.computeLocusCurveForElement(lId, viewport);
		expect(locusCurve).not.toBeNull();
		expect(locusCurve!.points.length).toBeGreaterThan(100);

		// Trace starts with just 1 seed point
		expect(figure.getTracePoints(trId).length).toBe(1);
	});
});
