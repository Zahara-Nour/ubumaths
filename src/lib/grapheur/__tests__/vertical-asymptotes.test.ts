/**
 * Détection des asymptotes verticales.
 *
 * Une absence de valeur n'est PAS une asymptote : hors du domaine, il n'y a
 * rien à signaler, et un bord de domaine à limite finie (√x en 0) non plus.
 * Sans ce garde, ln(x) faisait dessiner une asymptote par échantillon sur
 * tout le demi-plan x < 0.
 */

import { describe, it, expect } from 'vitest';
import {
	analyzeFunction,
	buildAnalysisAST,
	cachedEvaluator,
	findVerticalAsymptotes
} from '../analysis';
import { parseFunction } from '../evaluator';
import type { Viewport } from '../types';

const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

describe('findVerticalAsymptotes', () => {
	it("ne signale qu'une asymptote pour ln(x), en x = 0", () => {
		const ln = (x: number): number | null => (x <= 0 ? null : Math.log(x));
		const found = findVerticalAsymptotes(ln, viewport, 'f');

		expect(found.length).toBe(1);
		expect(found[0].x).toBeCloseTo(0, 3);
	});

	it('ne signale rien pour √x : le bord du domaine a une limite finie', () => {
		const root = (x: number): number | null => (x < 0 ? null : Math.sqrt(x));
		expect(findVerticalAsymptotes(root, viewport, 'f')).toEqual([]);
	});

	it('ne signale rien quand la fonction est vide sur toute la fenêtre', () => {
		const nowhere = (): number | null => null;
		expect(findVerticalAsymptotes(nowhere, viewport, 'f')).toEqual([]);
	});

	it('trouve les deux pôles de 1/(x(x+1))', () => {
		const rational = (x: number): number | null => {
			const d = x * (x + 1);
			return d === 0 ? null : 1 / d;
		};
		const found = findVerticalAsymptotes(rational, viewport, 'f')
			.map((a) => a.x)
			.sort((a, b) => a - b);

		expect(found.length).toBe(2);
		expect(found[0]).toBeCloseTo(-1, 3);
		expect(found[1]).toBeCloseTo(0, 3);
	});

	it('trouve les quatre pôles de tan(x) sur [-5 ; 5]', () => {
		const found = findVerticalAsymptotes(
			(x) => Math.tan(x),
			{ xMin: -5, xMax: 5, yMin: -10, yMax: 10 },
			'f'
		);
		expect(found.length).toBe(4);
	});

	it('ne signale rien pour une fonction continue', () => {
		expect(findVerticalAsymptotes((x) => x * x, viewport, 'f')).toEqual([]);
	});
	it("place l'asymptote à l'abscisse exacte du pôle", () => {
		// L'étiquette affichée à l'élève est un `toPrecision(4)` : une montée de
		// colline qui s'arrête du mauvais côté du pôle donne « x = 2,719 ».
		const pole = 2.718281828;
		const found = findVerticalAsymptotes(
			(x) => (x === pole ? null : 1 / (x - pole)),
			viewport,
			'f'
		);

		expect(found.length).toBe(1);
		expect(found[0].x).toBeCloseTo(pole, 6);
	});

	it('trouve ln(x) quelle que soit la hauteur de la fenêtre', () => {
		const ln = (x: number): number | null => (x <= 0 ? null : Math.log(x));
		for (const half of [10, 40, 100]) {
			const found = findVerticalAsymptotes(ln, { xMin: -5, xMax: 5, yMin: -half, yMax: half }, 'f');
			expect(found.length, `hauteur ${2 * half}`).toBe(1);
		}
	});

	it('trouve un bord de domaine divergent', () => {
		const g = (x: number): number | null => (x <= 0.3 ? null : 1 / Math.sqrt(x - 0.3));
		const found = findVerticalAsymptotes(g, { xMin: -2, xMax: 5, yMin: -10, yMax: 10 }, 'f');

		expect(found.length).toBe(1);
		expect(found[0].x).toBeCloseTo(0.3, 6);
	});
	it('examine les candidats sur toute la fenêtre, pas seulement à gauche', () => {
		// Des trous de domaine denses à gauche ne doivent pas épuiser le budget
		// d'examen et masquer un pôle situé à droite.
		const noisyThenPole = (x: number): number | null => {
			if (x < 5) return Math.sin(1000 * x) < 0 ? null : 1;
			return x === 8 ? null : 1 / (x - 8);
		};
		const found = findVerticalAsymptotes(
			noisyThenPole,
			{ xMin: 0, xMax: 10, yMin: -10, yMax: 10 },
			'f'
		);

		expect(found.some((a) => Math.abs(a.x - 8) < 1e-3)).toBe(true);
	});

	it("ne signale rien pour eˣ + 45, même loin de l'origine", () => {
		// Au-delà de x ≈ 139, la sonde la plus large (1 % de |x|) suffisait à
		// faire croître eˣ d'un facteur 4 : une fausse asymptote par échantillon.
		const exp = (x: number): number | null => Math.exp(x) + 45;
		const found = findVerticalAsymptotes(
			exp,
			{ xMin: -580, xMax: 600, yMin: -130, yMax: 480 },
			'f'
		);
		expect(found).toEqual([]);
	});

	it('ne signale rien là où eˣ dépasse les flottants (x ≈ 709,8)', () => {
		const found = findVerticalAsymptotes(
			(x) => Math.exp(x),
			{ xMin: 0, xMax: 1000, yMin: -10, yMax: 10 },
			'f'
		);
		expect(found).toEqual([]);
	});

	it("trouve encore un pôle loin de l'origine", () => {
		const found = findVerticalAsymptotes(
			(x) => (x === 500 ? null : 1 / (x - 500)),
			{ xMin: 0, xMax: 1000, yMin: -10, yMax: 10 },
			'f'
		);
		expect(found.length).toBe(1);
		expect(found[0].x).toBeCloseTo(500, 6);
	});

	it('trouve ln(x − a) quel que soit a', () => {
		// La première sonde est à 1 % de |a| : pour a = 100 elle tombe sur
		// ln(1) = 0, pour a = 10 000 sur ln(100), plus grand que la suivante.
		for (const a of [100, 10000]) {
			const found = findVerticalAsymptotes(
				(x) => (x <= a ? null : Math.log(x - a)),
				{ xMin: a - 500, xMax: a + 680, yMin: -130, yMax: 480 },
				'f'
			);
			expect(
				found.map((v) => Math.round(v.x)),
				`a = ${a}`
			).toEqual([a]);
		}
	});

	it('trouve les pôles de tan(x) loin de l’origine', () => {
		// La sonde à 1 % de x = 10 000 enjambe une trentaine de pôles voisins.
		const found = findVerticalAsymptotes(
			(x) => Math.tan(x),
			{ xMin: 10000, xMax: 10010, yMin: -10, yMax: 10 },
			'f'
		);
		const expected = [3183, 3184, 3185].map((k) => ((k + 0.5) * Math.PI).toFixed(3));
		expect(found.map((v) => v.x.toFixed(3))).toEqual(expected);
	});

	it("trouve encore l'asymptote de ln(x − 300)", () => {
		const found = findVerticalAsymptotes(
			(x) => (x <= 300 ? null : Math.log(x - 300)),
			{ xMin: 0, xMax: 1000, yMin: -10, yMax: 10 },
			'f'
		);
		expect(found.length).toBe(1);
		expect(found[0].x).toBeCloseTo(300, 6);
	});
});

describe('asymptotes verticales quand on dézoome', () => {
	// Fenêtre de 1 180 unités : les échantillons tombent à ±3 du pôle de 1/x,
	// où la courbe vaut ±0,3 — aucun saut, rien à examiner. L'expression, elle,
	// dit où sont ses pôles.
	const wide: Viewport = { xMin: -580, xMax: 600, yMin: -130, yMax: 480 };

	const poles = (latex: string): number[] => {
		const parsed = parseFunction(latex);
		if (!parsed.ast) throw new Error(`illisible : ${latex}`);
		const analysis = analyzeFunction(
			cachedEvaluator(parsed.ast),
			wide,
			'f',
			buildAnalysisAST(parsed.ast)
		);
		return analysis.verticalAsymptotes.map((a) => a.x).sort((a, b) => a - b);
	};

	it.each([
		['\\frac{1}{x}', 0],
		['\\frac{1}{x^{2}}', 0],
		['\\frac{1}{x-300}', 300],
		['\\frac{x^{2}+1}{x-1}', 1],
		['\\frac{1}{\\ln(x)}', 1],
		['\\frac{e^{x}}{x}', 0],
		// e^(1/x) dépasse les flottants avant la sonde fine : seule l'analyse
		// symbolique (limite +∞ à droite) peut trancher.
		['e^{\\frac{1}{x}}', 0]
	])('trouve le pôle de %s', (latex, pole) => {
		const found = poles(latex);
		expect(found.length).toBe(1);
		expect(found[0]).toBeCloseTo(pole, 9);
	});

	it('ne signale pas le trou de sin(x)/x en 0', () => {
		expect(poles('\\frac{\\sin(x)}{x}')).toEqual([]);
	});
});

describe('pôles périodiques (tan, 1/cos)', () => {
	const polesIn = (latex: string, window: Viewport): number[] => {
		const parsed = parseFunction(latex);
		if (!parsed.ast) throw new Error(`illisible : ${latex}`);
		const analysis = analyzeFunction(
			cachedEvaluator(parsed.ast),
			window,
			'f',
			buildAnalysisAST(parsed.ast)
		);
		return analysis.verticalAsymptotes.map((a) => a.x).sort((a, b) => a - b);
	};
	const lattice = (base: number, period: number, xMin: number, xMax: number): number[] => {
		const out: number[] = [];
		for (let k = Math.ceil((xMin - base) / period); base + k * period <= xMax; k++) {
			out.push(base + k * period);
		}
		return out;
	};

	it('trouve tous les pôles de tan sur [−100 ; 100], à leur abscisse exacte', () => {
		// L'analyse symbolique ne les énumère que sur [−2π ; 2π] : le balayage
		// n'en trouvait que 2 sur 64.
		const found = polesIn('\\tan(x)', { xMin: -100, xMax: 100, yMin: -100, yMax: 100 });
		const expected = lattice(Math.PI / 2, Math.PI, -100, 100);
		expect(found.length).toBe(64);
		found.forEach((x, k) => expect(x).toBeCloseTo(expected[k], 9));
	});

	it('trouve les pôles de tan(2x), de période π/2', () => {
		const found = polesIn('\\tan(2x)', { xMin: -5, xMax: 5, yMin: -10, yMax: 10 });
		const expected = lattice(Math.PI / 4, Math.PI / 2, -5, 5);
		expect(found.length).toBe(expected.length);
		found.forEach((x, k) => expect(x).toBeCloseTo(expected[k], 9));
	});

	it('ne dessine aucun pôle quand ils sont trop serrés, pas même un isolé', () => {
		// Sur [−580 ; 600], ~375 pôles : le balayage en gardait un seul, en 45,5π.
		const wide: Viewport = { xMin: -580, xMax: 600, yMin: -130, yMax: 480 };
		expect(polesIn('\\tan(x)', wide)).toEqual([]);
		expect(polesIn('\\frac{1}{\\cos(x)}', wide)).toEqual([]);
	});

	it('garde un pôle non périodique mêlé à ceux de tan', () => {
		// mathAST ne rend que la famille de tan pour cette somme : 3 vient du
		// balayage, qui ne doit pas le confondre avec un pôle de tan.
		const found = polesIn('\\tan(x)+\\frac{1}{x-3}', {
			xMin: -10,
			xMax: 10,
			yMin: -10,
			yMax: 10
		});
		const expected = [...lattice(Math.PI / 2, Math.PI, -10, 10), 3].sort((a, b) => a - b);
		expect(found.length).toBe(expected.length);
		found.forEach((x, k) => expect(x).toBeCloseTo(expected[k], 6));
	});
});
