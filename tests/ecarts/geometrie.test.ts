/**
 * Tests de preuve du registre des écarts (docs/ecarts/registre.md), domaines
 * géométrie et grapheur.
 *
 * Chaque test affirme le comportement ATTENDU d'un écart encore ouvert : il est
 * rouge tant que l'écart est vrai. Le nom de chaque `describe` porte l'identifiant
 * de l'écart, que le registre retient par `› L57`.
 *
 * Sonde : le langage des figures (`runDsl`) pour la géométrie, l'analyse d'une
 * fonction (`analyzeFunction`) pour le grapheur. Aucune erreur n'est avalée : un
 * refus du langage fait échouer le test par son message.
 */

import { describe, it, expect } from 'vitest';
import { runDsl } from '#lib/geometry-core/dsl/index.ts';
import type { InterpretResult } from '#lib/geometry-core/dsl/index.ts';
import { geoToNumber } from '#lib/geometry-core/compute/to-number.ts';
import type { GeoElement } from '#lib/geometry-core/types/elements.ts';
import { analyzeFunction, buildAnalysisAST, cachedEvaluator } from '#lib/grapheur/analysis.ts';
import { parseFunction } from '#lib/grapheur/evaluator.ts';
import type { FunctionAnalysis, Viewport } from '#lib/grapheur/types.ts';

/** L'identifiant, dans la figure, de l'objet nommé `name` par le script. */
function figureIdOf(result: InterpretResult, name: string): string {
	const id = result.symbols.get(name)?.figureId;
	if (!id) throw new Error(`aucun objet de la figure ne s'appelle ${name}`);
	return id;
}

/** L'objet de la figure nommé `name` par le script. */
function elementOf(result: InterpretResult, name: string): GeoElement {
	const element = result.figure.getElementById(figureIdOf(result, name));
	if (!element) throw new Error(`${name} est nommé mais absent de la figure`);
	return element;
}

/** La position d'un point de la figure, en nombres, par son identifiant. */
function positionOf(result: InterpretResult, id: string): { x: number; y: number } {
	const position = result.figure.getPosition(id);
	if (!position) throw new Error(`pas de position pour ${id}`);
	return { x: geoToNumber(position.x), y: geoToNumber(position.y) };
}

/** Fenêtre dézoomée (1 180 unités), celle de `vertical-asymptotes.test.ts`. */
const WIDE: Viewport = { xMin: -580, xMax: 600, yMin: -130, yMax: 480 };

/** L'analyse d'une fonction écrite en LaTeX, comme le grapheur la demande. */
function analyze(latex: string, viewport: Viewport): FunctionAnalysis {
	const parsed = parseFunction(latex);
	if (!parsed.ast) throw new Error(`illisible : ${latex}`);
	return analyzeFunction(cachedEvaluator(parsed.ast), viewport, 'f', buildAnalysisAST(parsed.ast));
}

describe('L57 : mediatrice(s) sur un segment déjà nommé', () => {
	it('trace la médiatrice du segment, comme mediatrice(A, B)', () => {
		const result = runDsl(
			['A = point(0, 0)', 'B = point(4, 2)', 's = segment(A, B)', 'd = mediatrice(s)'].join('\n')
		);

		const line = elementOf(result, 'd');
		expect(line.type).toBe('line');
		if (line.type !== 'line') return;

		// Les deux points qui portent la droite sont à égale distance de A et de B.
		const a = positionOf(result, figureIdOf(result, 'A'));
		const b = positionOf(result, figureIdOf(result, 'B'));
		const carriers = [line.point1Id, line.point2Id].map((id) => positionOf(result, id));
		expect(
			Math.hypot(carriers[0].x - carriers[1].x, carriers[0].y - carriers[1].y)
		).toBeGreaterThan(0.1);
		for (const p of carriers) {
			expect(Math.hypot(p.x - a.x, p.y - a.y)).toBeCloseTo(Math.hypot(p.x - b.x, p.y - b.y), 9);
		}
	});
});

describe("L58 : nommer M' l'image de M", () => {
	it("crée un point d'étiquette M'", () => {
		const result = runDsl("M' = point(1, 1)");

		const point = elementOf(result, "M'");
		expect(point.label).toBe("M'");
		expect(positionOf(result, point.id)).toEqual({ x: 1, y: 1 });
	});
});

describe('V77 : cercle dont le rayon suit un curseur', () => {
	const script = ['a = slider(0, 5, 2)', 'c = courbe("x^2 + y^2 = a^2")'].join('\n');

	it('dessine le cercle de rayon a', () => {
		const result = runDsl(script);

		const curve = elementOf(result, 'c');
		expect(curve.type).toBe('quadraticCurve');
		if (curve.type !== 'quadraticCurve') return;
		expect(curve.conic.type).toBe('circle');
		expect(curve.conic.a).toBeCloseTo(2, 9);
	});

	it('change de rayon quand le curseur bouge', () => {
		const result = runDsl(script);
		result.figure.moveSlider(figureIdOf(result, 'a'), 3);
		result.figure.recompute();

		const curve = elementOf(result, 'c');
		expect(curve.type).toBe('quadraticCurve');
		if (curve.type !== 'quadraticCurve') return;
		expect(curve.conic.type).toBe('circle');
		expect(curve.conic.a).toBeCloseTo(3, 9);
	});
});

describe('L59 : courbe("x^2 = 4")', () => {
	it('est acceptée et pose un objet visible dans la figure', () => {
		// La forme de l'objet (deux droites, conique dégénérée) est laissée à la
		// correction : la preuve tient au refus d'aujourd'hui (« la variable y est
		// absente de l'expression »).
		const result = runDsl('c = courbe("x^2 = 4")');

		expect(elementOf(result, 'c').visible).toBe(true);
	});
});

describe('L60 : tan(x) + 1/(x − 3) dézoomé', () => {
	it("garde l'asymptote verticale x = 3", () => {
		const poles = analyze('\\tan(x)+\\frac{1}{x-3}', WIDE).verticalAsymptotes.map((a) => a.x);

		expect(poles.some((x) => Math.abs(x - 3) < 1e-6)).toBe(true);
	});
});

describe('L61 : (ln x)²/√x', () => {
	it("affiche l'asymptote horizontale y = 0 à droite", () => {
		const found = analyze('\\frac{\\ln(x)^{2}}{\\sqrt{x}}', WIDE).horizontalAsymptotes;

		expect(found.map((a) => a.direction)).toEqual(['right']);
		expect(found[0].y).toBeCloseTo(0, 6);
	});
});
