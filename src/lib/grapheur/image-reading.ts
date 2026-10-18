/**
 * Grapheur — la lecture graphique de l'image
 *
 * Des pointillés de `a` sur l'axe des abscisses jusqu'à la courbe, puis
 * jusqu'à `f(a)` sur l'axe des ordonnées : le geste qu'on attend de l'élève
 * quand il lit une image sur un graphique. Deux sources pour `a` : les calculs
 * `f(a)` de la console de l'atelier, et un point qu'on fait glisser sur l'axe
 * (lot 3 bis de `docs/wip/atelier-refonte-interface-phase0.md`).
 *
 * Module pur : la couche SVG (`ImageReadings.svelte`) et le point glissant
 * (`ReadingSliders.svelte`) n'y ajoutent que le dessin.
 *
 * @module grapheur/image-reading
 */

import type { CoordinateTransformer } from './viewport';
import type { ExplicitFunction } from './types';
import { evaluateAt, type VariableBindings } from './evaluator';
import { isInsideRestriction } from './restriction';

// =============================================================================
// Types
// =============================================================================

/** Un point lu : l'abscisse `a` et son image. */
export interface ReadingPoint {
	readonly at: number;
	readonly y: number;
}

/** Un nombre écrit : exact s'il tient en deux décimales, sinon arrondi au centième. */
export interface ReadingNumber {
	readonly text: string;
	readonly approx: boolean;
}

interface Segment {
	readonly x1: number;
	readonly y1: number;
	readonly x2: number;
	readonly y2: number;
}

/** Ce qu'on dessine, en coordonnées SVG. */
export interface ReadingGeometry {
	/** De (a ; 0) au point de la courbe. */
	readonly vertical: Segment;
	/** Du point de la courbe à (0 ; f(a)). */
	readonly horizontal: Segment;
	readonly point: { readonly x: number; readonly y: number };
}

// =============================================================================
// Constantes
// =============================================================================

/** Tolérance sur « tient en deux décimales » (calcul en flottants). */
const EXACT_TOLERANCE = 1e-9;

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Le point de la courbe en `at`, ou `null` hors de l'ensemble de définition
 * (calcul impossible) ou de l'ensemble choisi pour la fonction (`sur [0;2]`).
 */
export function readingAt(
	func: ExplicitFunction,
	at: number,
	bindings: VariableBindings = {}
): ReadingPoint | null {
	if (!func.ast || !Number.isFinite(at) || !isInsideRestriction(func.restriction, at)) return null;
	const y = evaluateAt(func.ast, at, bindings);
	return y === null ? null : { at, y };
}

/** Au-delà, les centièmes d'un flottant ne sont plus des chiffres sûrs. */
const LARGEST_EXACT = 1e15;

const SUPERSCRIPTS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** `1,23 × 10²¹` : un très grand nombre, toujours dit approché. */
function scientific(value: number): ReadingNumber {
	const [mantissa, exponent] = value.toExponential(2).split('e');
	const power = String(Number(exponent))
		.replace('-', '⁻')
		.replace(/\d/g, (digit) => SUPERSCRIPTS[Number(digit)]);
	const digits = String(Number(mantissa)).replace('.', ',');
	return { text: `${digits} × 10${power}`, approx: true };
}

/** Écrire un nombre comme la console : `2,25` exact, `≈ 1,41` sinon. */
export function readingNumber(value: number): ReadingNumber {
	// Revue de #1497 : 1e21 s'écrivait « 999999999999999900000 », dit exact
	if (Math.abs(value) >= LARGEST_EXACT) return scientific(value);
	const hundredths = Math.round(value * 100);
	const approx =
		Math.abs(value * 100 - hundredths) > EXACT_TOLERANCE * Math.max(1, Math.abs(value));
	// `+ 0` : jamais « -0 », ni pour -0 ni pour un arrondi qui tombe à zéro
	const rounded = hundredths / 100 + 0;
	return { text: String(rounded).replace('.', ','), approx };
}

/** Le point glissant s'aimante aux entiers et aux demis. */
export function snapReading(x: number): number {
	return Math.round(x * 2) / 2 + 0;
}

/** « Lecture de f en x = 2 : f(2) = 4 » — ce que dit un lecteur d'écran. */
export function readingSentence(name: string, point: ReadingPoint): string {
	const a = readingNumber(point.at);
	const y = readingNumber(point.y);
	return `Lecture de ${name} en x ${a.approx ? '≈' : '='} ${a.text} : ${name}(${a.text}) ${
		y.approx ? '≈' : '='
	} ${y.text}`;
}

/** Une coordonnée ramenée dans le cadre : un axe hors fenêtre se lit sur le bord. */
function clamp(value: number, max: number): number {
	return Math.min(Math.max(value, 0), max);
}

/** Les pointillés et le point, en coordonnées SVG. */
export function readingGeometry(
	point: ReadingPoint,
	transformer: CoordinateTransformer,
	width: number,
	height: number
): ReadingGeometry {
	const origin = transformer.mathToSvg(0, 0);
	const xAxisY = clamp(origin.y, height);
	const yAxisX = clamp(origin.x, width);
	const onCurve = transformer.mathToSvg(point.at, point.y);
	return {
		vertical: { x1: onCurve.x, y1: xAxisY, x2: onCurve.x, y2: onCurve.y },
		horizontal: { x1: onCurve.x, y1: onCurve.y, x2: yAxisX, y2: onCurve.y },
		point: { x: onCurve.x, y: onCurve.y }
	};
}
