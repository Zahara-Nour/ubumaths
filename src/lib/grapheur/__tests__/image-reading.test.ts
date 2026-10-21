/**
 * Lecture graphique de l'image : nombres écrits, aimantation, tracé des
 * pointillés (lot 3 bis de la refonte de l'Atelier).
 */
import { describe, expect, it } from 'vitest';
import { createTransformer } from '$lib/grapheur/viewport';
import { parseFunction } from '$lib/grapheur/evaluator';
import {
	readingAt,
	readingGeometry,
	readingNumber,
	readingSentence,
	snapReading
} from '$lib/grapheur/image-reading';
import type { ExplicitFunction } from '$lib/grapheur/types';

/** Une courbe minimale, comme le grapheur la tient. */
function curve(latex: string, restriction?: ExplicitFunction['restriction']): ExplicitFunction {
	const parsed = parseFunction(latex);
	return {
		id: 'c1',
		type: 'explicit',
		latex,
		ast: parsed.ast ?? undefined,
		parseError: undefined,
		variable: 'x',
		color: 'blue',
		visible: true,
		lineWidth: 2,
		lineStyle: 'solid',
		showDerivative: false,
		tangentAt: null,
		integral: null,
		showOsculating: false,
		showArcLength: false,
		...(restriction && { restriction })
	} as ExplicitFunction;
}

describe('readingNumber : un nombre écrit comme la console', () => {
	it('exact quand il est court', () => {
		expect(readingNumber(4)).toEqual({ text: '4', approx: false });
		expect(readingNumber(-0.5)).toEqual({ text: '-0,5', approx: false });
		expect(readingNumber(2.25)).toEqual({ text: '2,25', approx: false });
	});

	it('arrondi au centième sinon, et dit approché', () => {
		expect(readingNumber(Math.SQRT2)).toEqual({ text: '1,41', approx: true });
		expect(readingNumber(1 / 3)).toEqual({ text: '0,33', approx: true });
	});

	it('un très grand nombre n’est jamais annoncé exact à tort (revue de #1497)', () => {
		const huge = readingNumber(1e21);
		expect(huge.approx).toBe(true);
		expect(huge.text).not.toContain('99999');
		expect(readingNumber(-3e17).approx).toBe(true);
	});

	it('jamais « -0 »', () => {
		expect(readingNumber(-0)).toEqual({ text: '0', approx: false });
		expect(readingNumber(-0.001)).toEqual({ text: '0', approx: true });
	});
});

describe('snapReading : le point glissant s’aimante aux entiers et aux demis', () => {
	it.each([
		[1.2, 1],
		[1.3, 1.5],
		[-0.74, -0.5],
		[-0.76, -1],
		[2, 2]
	])('%s → %s', (x, snapped) => {
		expect(snapReading(x)).toBe(snapped);
	});
});

describe('readingAt : le point de la courbe', () => {
	it('f(2) = 4 sur x²', () => {
		expect(readingAt(curve('x^2'), 2)).toEqual({ at: 2, y: 4 });
	});

	it('rien hors de l’ensemble de définition', () => {
		expect(readingAt(curve('\\sqrt{x}'), -1)).toBeNull();
		expect(readingAt(curve('\\frac{1}{x}'), 0)).toBeNull();
	});

	it('rien hors de l’ensemble choisi pour la fonction (sur [0 ; 2])', () => {
		const restricted = curve('x^2', [{ from: 0, to: 2, fromClosed: true, toClosed: true }]);
		expect(readingAt(restricted, 3)).toBeNull();
		expect(readingAt(restricted, 1)).toEqual({ at: 1, y: 1 });
	});
});

describe('readingSentence : ce que lit un lecteur d’écran', () => {
	it('valeur exacte', () => {
		expect(readingSentence('f', { at: 2, y: 4 })).toBe('Lecture de f en x = 2 : f(2) = 4');
	});

	it('valeur approchée', () => {
		expect(readingSentence('f', { at: 2, y: Math.SQRT2 })).toBe(
			'Lecture de f en x = 2 : f(2) ≈ 1,41'
		);
	});
});

describe('readingGeometry : les pointillés vont des axes à la courbe', () => {
	// Fenêtre [-5 ; 5] × [-5 ; 5] sur 100 × 100 px : 10 px par unité, origine au centre
	const transformer = createTransformer({ xMin: -5, xMax: 5, yMin: -5, yMax: 5 }, 100, 100);

	it('de (a ; 0) au point, puis du point à (0 ; f(a))', () => {
		const geometry = readingGeometry({ at: 2, y: 3 }, transformer, 100, 100);
		expect(geometry.point).toEqual({ x: 70, y: 20 });
		expect(geometry.vertical).toEqual({ x1: 70, y1: 50, x2: 70, y2: 20 });
		expect(geometry.horizontal).toEqual({ x1: 70, y1: 20, x2: 50, y2: 20 });
	});

	it('axes hors de la fenêtre : les pointillés partent du bord', () => {
		const shifted = createTransformer({ xMin: 1, xMax: 11, yMin: 1, yMax: 11 }, 100, 100);
		const geometry = readingGeometry({ at: 2, y: 3 }, shifted, 100, 100);
		// L'axe des abscisses est sous la fenêtre (bord bas), celui des ordonnées à gauche
		expect(geometry.vertical.y1).toBe(100);
		expect(geometry.horizontal.x2).toBe(0);
	});
});
