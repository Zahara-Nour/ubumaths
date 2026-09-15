/**
 * Placement des étiquettes d'asymptotes.
 *
 * Extrait du composant pour être testable. Le défaut qui a motivé cette
 * extraction — **aucune étiquette visible dans le viewport par défaut** —
 * échappait à la fois aux tests et à la vérification à l'œil, parce que les
 * cadrages que j'avais choisis pour vérifier étaient justement ceux où
 * l'ancrage tombait dans le cadre.
 *
 * @module grapheur/asymptote-labels
 */

import type { CoordinateTransformer } from '$lib/geometry-core/viewport';
import type { FunctionAnalysis } from './types';

// =============================================================================
// Constants
// =============================================================================

/** Marge entre l'étiquette et le bord du cadre, en pixels. */
const LABEL_MARGIN = 8;

/** Hauteur d'une bande d'empilement, en pixels. */
const LABEL_STACK = 22;

/** Largeur en deçà de laquelle deux étiquettes d'une même bande se gênent. */
const LABEL_WIDTH = 120;

/** Nombre de positions testées le long d'une branche pour y poser l'étiquette. */
const ANCHOR_PROBES = 24;

// =============================================================================
// Types
// =============================================================================

export interface AsymptoteLabel {
	readonly x: number;
	readonly y: number;
	readonly text: string;
	readonly latex: string;
	/** La courbe dont vient l'asymptote, pour lui emprunter sa couleur. */
	readonly functionId: string;
}

interface CanvasSize {
	readonly width: number;
	readonly height: number;
}

// =============================================================================
// Functions
// =============================================================================

/**
 * Bornes en abscisse SVG du tracé d'une asymptote, selon sa direction.
 *
 * Une asymptote qui n'existe que d'un côté ne doit être ni tracée ni étiquetée
 * de l'autre : arctan a `y = π/2` en +∞ et `y = -π/2` en -∞, et les afficher
 * toutes deux sur toute la largeur montre deux droites dont chacune est fausse
 * sur la moitié du repère.
 */
export function branchBounds(
	direction: 'left' | 'right' | 'both',
	transformer: CoordinateTransformer,
	width: number
): [number, number] {
	if (direction === 'both') return [0, width];
	const origin = transformer.mathToSvg(0, 0).x;
	const cut = Math.min(Math.max(origin, 0), width);
	return direction === 'right' ? [cut, width] : [0, cut];
}

/**
 * Point d'accroche d'une étiquette sur une asymptote non horizontale.
 *
 * ⚠️ On BALAIE la branche au lieu de viser une fraction fixe de sa longueur.
 * Un ancrage figé aux deux tiers tombait hors cadre pour toutes les asymptotes
 * courbes du viewport par défaut — `y = x²` y sort du cadre dès x = 3,2 — et
 * la fonctionnalité échouait précisément sur les cas pour lesquels elle avait
 * été écrite.
 */
function anchorOnBranch(
	coefficients: readonly number[],
	direction: 'left' | 'right' | 'both',
	transformer: CoordinateTransformer,
	size: CanvasSize
): { x: number; y: number } | null {
	const [from, to] = branchBounds(direction, transformer, size.width);
	if (to - from < 1) return null;

	const valueAt = (x: number): number =>
		coefficients.reduce((sum, coefficient, k) => sum + coefficient * x ** k, 0);

	// On part du milieu et on s'écarte : au bord, l'étiquette est à l'étroit ;
	// au milieu exact, elle se pose souvent sur la courbe, qui y est collée à
	// son asymptote.
	for (let step = 0; step <= ANCHOR_PROBES; step++) {
		const offset = (step / ANCHOR_PROBES) * 0.45;
		for (const position of [0.5 + offset, 0.5 - offset]) {
			const svgX = from + (to - from) * position;
			if (svgX < from || svgX > to) continue;

			const mathX = transformer.svgToMath(svgX, 0).x;
			const svgY = transformer.mathToSvg(0, valueAt(mathX)).y;
			if (svgY < LABEL_STACK || svgY > size.height - LABEL_MARGIN) continue;

			return { x: svgX, y: svgY - LABEL_MARGIN };
		}
	}
	return null;
}

/**
 * Version lisible d'un libellé LaTeX, pour la mesure de la boîte.
 *
 * ⚠️ `GraphLabel` déduit la largeur du fond de `content.text.length * 7` alors
 * qu'il AFFICHE `content.latex`. Passer le LaTeX brut aux deux fait compter
 * `\dfrac{1}{3}` pour 13 caractères au lieu des 3 qu'il occupe : un rectangle
 * sombre de 217 px derrière une formule de 70, et la bascule à gauche qui se
 * déclenche 100 px trop tôt.
 */
export function plainTextOf(latex: string): string {
	return latex
		.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2')
		.replace(/\\(left|right|,|;|!)/g, '')
		.replace(/\\([a-zA-Z]+)/g, '$1')
		.replace(/[{}]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Un coefficient entier s'écrit sans décimale : `3`, pas `3.00`. */
function formatCoefficient(value: number): string {
	return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(3)));
}

/**
 * Part en deçà de laquelle un coefficient est tenu pour nul dans le libellé.
 *
 * ⚠️ RELATIVE au plus grand coefficient, et non absolue. L'estimation numérique
 * rend `-1,4e-5` là où la valeur est zéro : affiché tel quel, l'élève lit
 * `y = x² − 0,000014`. Le chantier symbolique donnera le zéro exact ; en
 * attendant, on ne montre pas le bruit.
 */
const LABEL_RELATIVE_EPSILON = 1e-4;

/** Forme LaTeX d'un polynôme, du plus haut degré au plus bas. */
export function polynomialLatex(coefficients: readonly number[]): string {
	const terms: string[] = [];
	const scale = Math.max(...coefficients.map((c) => Math.abs(c)), 1);
	const negligible = LABEL_RELATIVE_EPSILON * scale;

	for (let degree = coefficients.length - 1; degree >= 0; degree--) {
		const coefficient = coefficients[degree];
		if (Math.abs(coefficient) < negligible) continue;

		const power = degree === 0 ? '' : degree === 1 ? 'x' : `x^{${degree}}`;
		const unit = degree > 0 && Math.abs(Math.abs(coefficient) - 1) < negligible;
		const magnitude = unit ? '' : formatCoefficient(Math.abs(coefficient));
		const sign = coefficient < 0 ? '-' : terms.length === 0 ? '' : '+';
		terms.push(`${sign}${magnitude}${power}`);
	}

	return `y = ${terms.join('') || '0'}`;
}

/**
 * Étiquettes à poser, pour une ou plusieurs analyses.
 *
 * L'anti-chevauchement est **partagé entre les analyses** : deux courbes qui
 * ont la même asymptote — `1/x` et `2/x`, toutes deux `y = 0` — posaient sinon
 * deux boîtes exactement au même endroit.
 */
export function placeAsymptoteLabels(
	analyses: FunctionAnalysis | readonly FunctionAnalysis[],
	transformer: CoordinateTransformer,
	size: CanvasSize
): AsymptoteLabel[] {
	const list = Array.isArray(analyses) ? analyses : [analyses as FunctionAnalysis];
	const placed: AsymptoteLabel[] = [];

	/**
	 * Pose une étiquette en évitant celles déjà posées.
	 *
	 * Deux boîtes ne se gênent que si elles partagent une bande horizontale ET
	 * se recouvrent en abscisse : une ordonnée d'ancrage constante faisait
	 * descendre en escalier les six pôles de tan(x), pourtant répartis sur
	 * toute la largeur.
	 */
	const place = (
		anchorX: number,
		anchorY: number,
		text: string,
		latex: string,
		functionId: string
	): void => {
		let y = anchorY;

		for (let attempt = 0; attempt < 8; attempt++) {
			const collides = placed.some(
				(other) => Math.abs(other.y - y) < LABEL_STACK && Math.abs(other.x - anchorX) < LABEL_WIDTH
			);
			if (!collides) break;
			y += LABEL_STACK;
		}

		// Rester dans le cadre : `GraphLabel` replaque sinon la boîte lui-même,
		// ce qui défait l'empilement calculé ici.
		const bounded = Math.min(Math.max(y, LABEL_STACK), size.height - LABEL_MARGIN);
		placed.push({ x: anchorX, y: bounded, text, latex, functionId });
	};

	for (const analysis of list) {
		for (const asymptote of analysis.verticalAsymptotes) {
			const svgX = transformer.mathToSvg(asymptote.x, 0).x;
			if (svgX < 0 || svgX > size.width) continue;
			// Idem pour l'abscisse : une valeur négligeable devant la largeur du
			// cadre est un zéro, pas `x = -4,441e-17`.
			const span = Math.abs(transformer.svgToMath(size.width, 0).x - transformer.svgToMath(0, 0).x);
			const rounded = Math.abs(asymptote.x) < LABEL_RELATIVE_EPSILON * span ? 0 : asymptote.x;
			const label = `x = ${Number(rounded.toPrecision(4))}`;
			place(svgX + LABEL_MARGIN, LABEL_STACK + LABEL_MARGIN, label, label, analysis.functionId);
		}

		for (const asymptote of analysis.horizontalAsymptotes) {
			const svgY = transformer.mathToSvg(0, asymptote.y).y;
			if (svgY < 0 || svgY > size.height) continue;
			const [from, to] = branchBounds(asymptote.direction, transformer, size.width);
			if (to - from < 1) continue;
			const height = Math.abs(
				transformer.svgToMath(0, 0).y - transformer.svgToMath(0, size.height).y
			);
			const level = Math.abs(asymptote.y) < LABEL_RELATIVE_EPSILON * height ? 0 : asymptote.y;
			const label = asymptote.exactLatex ?? `y = ${Number(level.toPrecision(4))}`;
			place(
				from + LABEL_MARGIN,
				svgY - LABEL_MARGIN,
				plainTextOf(label),
				label,
				analysis.functionId
			);
		}

		for (const asymptote of analysis.obliqueAsymptotes) {
			const coefficients = [asymptote.b, asymptote.m];
			const anchor = anchorOnBranch(coefficients, asymptote.direction, transformer, size);
			if (anchor === null) continue;
			const latex = asymptote.exactLatex ?? polynomialLatex(coefficients);
			place(anchor.x, anchor.y, plainTextOf(latex), latex, analysis.functionId);
		}

		for (const asymptote of analysis.polynomialAsymptotes) {
			const anchor = anchorOnBranch(asymptote.coefficients, asymptote.direction, transformer, size);
			if (anchor === null) continue;
			const latex = asymptote.exactLatex ?? polynomialLatex(asymptote.coefficients);
			place(anchor.x, anchor.y, plainTextOf(latex), latex, analysis.functionId);
		}
	}

	return placed;
}
