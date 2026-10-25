/**
 * Une courbe restreinte à un ensemble — lot 3 de
 * `docs/archive/wip/atelier-intervalle-phase0.md` (I5).
 *
 * Le grapheur reçoit l'ensemble sous forme NUMÉRIQUE (des morceaux aux bornes
 * réelles, ±∞ compris) : il ne trace que sur ces morceaux, marque chaque borne
 * finie d'un point plein (fermée) ou creux (ouverte), et rien là où la
 * fonction n'est pas définie (asymptote).
 */

import { describe, expect, it } from 'vitest';
import {
	endpointMarkers,
	isInsideRestriction,
	pieceViewports,
	restrictAnalysis,
	sameRestriction,
	type Restriction
} from '../restriction';
import { findAllIntersections } from '../intersections';
import { toAnalysisInputs, tangentAt, derivativeCurve } from '../analysis';
import { parseFunction } from '../evaluator';
import type { ExplicitFunction, FunctionAnalysis, Viewport } from '../types';

const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

const halfLine: Restriction = [{ from: 0, to: Infinity, fromClosed: true, toClosed: false }];
const openClosed: Restriction = [{ from: 0, to: 5, fromClosed: false, toClosed: true }];
const twoPieces: Restriction = [
	{ from: -1, to: 1, fromClosed: true, toClosed: true },
	{ from: 2, to: 3, fromClosed: true, toClosed: true }
];

function curve(latex: string, restriction?: Restriction, id = latex): ExplicitFunction {
	const parsed = parseFunction(latex);
	return {
		id,
		type: 'explicit',
		latex,
		ast: parsed.ast ?? undefined,
		parseError: parsed.error ?? undefined,
		variable: 'x',
		showDerivative: false,
		tangentAt: null,
		integral: null,
		showOsculating: false,
		showArcLength: false,
		color: 'curve-1',
		visible: true,
		lineWidth: 2,
		lineStyle: 'solid',
		...(restriction && { restriction })
	};
}

const square = (x: number): number | null => x * x;
const inverse = (x: number): number | null => {
	const y = 1 / x;
	return Number.isFinite(y) ? y : null;
};

describe('les morceaux à échantillonner', () => {
	it('sans restriction : la fenêtre entière, un seul morceau', () => {
		expect(pieceViewports(undefined, viewport)).toEqual([viewport]);
	});

	it('[0;+∞[ : de 0 au bord droit de la fenêtre', () => {
		expect(pieceViewports(halfLine, viewport)).toEqual([{ ...viewport, xMin: 0 }]);
	});

	it('[−1;1] ∪ [2;3] : deux morceaux', () => {
		expect(pieceViewports(twoPieces, viewport)).toEqual([
			{ ...viewport, xMin: -1, xMax: 1 },
			{ ...viewport, xMin: 2, xMax: 3 }
		]);
	});

	it('un morceau hors de la fenêtre ne donne rien', () => {
		expect(
			pieceViewports([{ from: 20, to: 30, fromClosed: true, toClosed: true }], viewport)
		).toEqual([]);
	});
});

describe('les points de bord', () => {
	it('x² sur [0;+∞[ : un point plein en (0;0), rien à l’infini', () => {
		expect(endpointMarkers(halfLine, square, viewport)).toEqual([{ x: 0, y: 0, filled: true }]);
	});

	it('x+1 sur ]0;5] : creux en (0;1), plein en (5;6)', () => {
		expect(endpointMarkers(openClosed, (x) => x + 1, viewport)).toEqual([
			{ x: 0, y: 1, filled: false },
			{ x: 5, y: 6, filled: true }
		]);
	});

	it('1/x sur ]0;5] : plein en (5;0,2), rien en 0 (asymptote)', () => {
		expect(endpointMarkers(openClosed, inverse, viewport)).toEqual([
			{ x: 5, y: 0.2, filled: true }
		]);
	});

	it('x sur [−1;1] ∪ [2;3] : quatre points pleins', () => {
		expect(endpointMarkers(twoPieces, (x) => x, viewport)).toEqual([
			{ x: -1, y: -1, filled: true },
			{ x: 1, y: 1, filled: true },
			{ x: 2, y: 2, filled: true },
			{ x: 3, y: 3, filled: true }
		]);
	});

	it('une borne hors de la fenêtre n’est pas marquée', () => {
		expect(endpointMarkers(openClosed, (x) => x + 1, { ...viewport, yMax: 3 })).toEqual([
			{ x: 0, y: 1, filled: false }
		]);
	});

	it('ℝ \\ {0} : un seul point creux là où les deux morceaux se touchent', () => {
		const punctured: Restriction = [
			{ from: -Infinity, to: 0, fromClosed: false, toClosed: false },
			{ from: 0, to: Infinity, fromClosed: false, toClosed: false }
		];
		expect(endpointMarkers(punctured, (x) => x + 1, viewport)).toEqual([
			{ x: 0, y: 1, filled: false }
		]);
	});

	it('sans restriction : aucun point', () => {
		expect(endpointMarkers(undefined, square, viewport)).toEqual([]);
	});
});

describe('appartenance', () => {
	it('suit le type des bornes', () => {
		expect(isInsideRestriction(openClosed, 0)).toBe(false);
		expect(isInsideRestriction(openClosed, 5)).toBe(true);
		expect(isInsideRestriction(twoPieces, 1.5)).toBe(false);
		expect(isInsideRestriction(undefined, -100)).toBe(true);
	});

	it('compare deux restrictions par leur contenu', () => {
		expect(sameRestriction(undefined, undefined)).toBe(true);
		expect(sameRestriction(halfLine, [...halfLine])).toBe(true);
		expect(sameRestriction(halfLine, undefined)).toBe(false);
		expect(sameRestriction(halfLine, openClosed)).toBe(false);
	});
});

describe('les analyses restent sur l’ensemble', () => {
	const analysis: FunctionAnalysis = {
		functionId: 'f',
		roots: [
			{ x: -2, functionId: 'f', confidence: 1 },
			{ x: 2, functionId: 'f', confidence: 1 }
		],
		extrema: [
			{ x: -1, y: 0, type: 'min', functionId: 'f', confidence: 1 },
			{ x: 1, y: 0, type: 'max', functionId: 'f', confidence: 1 }
		],
		verticalAsymptotes: [
			{ x: 0, functionId: 'f', behavior: 'both' },
			{ x: -3, functionId: 'f', behavior: 'both' }
		],
		horizontalAsymptotes: [{ y: 0, functionId: 'f', direction: 'both' }],
		obliqueAsymptotes: [],
		polynomialAsymptotes: []
	};

	it('zéros, extremums dedans ; asymptote verticale au bord gardée ; horizontale côté +∞', () => {
		const restricted = restrictAnalysis(analysis, [
			{ from: 0, to: Infinity, fromClosed: false, toClosed: false }
		]);
		expect(restricted.roots.map((r) => r.x)).toEqual([2]);
		expect(restricted.extrema.map((e) => e.x)).toEqual([1]);
		expect(restricted.verticalAsymptotes.map((a) => a.x)).toEqual([0]);
		expect(restricted.horizontalAsymptotes).toEqual([
			{ y: 0, functionId: 'f', direction: 'right' }
		]);
	});

	it('ensemble borné : plus d’asymptote horizontale', () => {
		expect(restrictAnalysis(analysis, openClosed).horizontalAsymptotes).toEqual([]);
	});

	it('les intersections hors de l’ensemble disparaissent', () => {
		// x² et 1 se coupent en −1 et 1 ; x² n'est tracée que sur [0;+∞[
		const inputs = toAnalysisInputs([curve('x^2', halfLine, 'f'), curve('1', undefined, 'g')]);
		const xs = findAllIntersections(inputs, viewport).map((i) => Math.round(i.point.x));
		expect(xs).toEqual([1]);
	});
});

describe('ce qui hérite, ce qui n’hérite pas', () => {
	it('la dérivée tracée par le grapheur garde l’ensemble', () => {
		expect(derivativeCurve(curve('x^2', halfLine))?.restriction).toEqual(halfLine);
	});

	it('la tangente, droite entière, ne le garde pas', () => {
		expect(tangentAt(curve('x^2', halfLine), 1)?.line.restriction).toBeUndefined();
	});
});
