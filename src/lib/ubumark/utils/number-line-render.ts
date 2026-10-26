/**
 * Shared number line rendering utilities.
 *
 * Used by both the static NumberLine.svelte and interactive NumberLineInput.svelte
 * to avoid duplicating layout constants, coordinate mapping, and graduation logic.
 *
 * @module ubumark/utils/number-line-render
 */

import type {
	NumberLineValue,
	NumberLineConfig,
	NumberLineNode
} from '$lib/ubumark/types/number-line';
import { resolveAuthorColor, type AuthorColor } from '$lib/theme/author-color';
import { evaluateNodeToApproximatedNumber } from '$lib/mathAST/eval/evaluate';
import { toLatex } from '$lib/mathAST/latex-generator';
import { compareNumericNodes } from '$lib/mathAST/eval/compare-numeric';

// =========================================================================
// LAYOUT CONSTANTS
// =========================================================================

export const NL_LAYOUT = {
	MARGIN_LEFT: 40,
	MARGIN_RIGHT: 40,
	SVG_WIDTH: 600,
	LINE_Y: 50,
	MINOR_TICK_HEIGHT: 6,
	MAJOR_TICK_HEIGHT: 12,
	LABEL_Y_OFFSET: 20,
	POINT_RADIUS: 5,
	POINT_Y_OFFSET: -18,
	POINT_LABEL_Y_OFFSET: -30,
	SEGMENT_Y_OFFSET: 12,
	ARROW_SIZE: 8,
	LINE_WIDTH: 600 - 40 - 40 // SVG_WIDTH - MARGIN_LEFT - MARGIN_RIGHT
} as const;

/*
 * Largeur réelle (téléphone, `docs/wip/reponses-a-placer-progress.md` § 8) :
 * l'écran dessine la droite à la largeur de son conteneur, en px, sans viewBox
 * réduite. Marges, chiffres, points et traits gardent leur taille ; seul
 * l'écart entre graduations se resserre. Sans largeur : `SVG_WIDTH` (PDF, tests).
 */
/** Largeur en dessous de laquelle on ne dessine plus (la ligne resterait sans place) */
export const NL_MIN_WIDTH = 160;
/** Conteneur de référence sur un écran de téléphone (360 px moins les marges de page) */
export const NL_PHONE_WIDTH = 320;
/** En dessous, une graduation est difficile à lire et à viser du doigt */
export const NL_MIN_GRADUATION_GAP = 20;

/** Longueur de la ligne graduée pour une droite dessinée sur `width` px */
function lineWidthFor(width: number): number {
	return width - NL_LAYOUT.MARGIN_LEFT - NL_LAYOUT.MARGIN_RIGHT;
}

// =========================================================================
// VALUE HELPERS
// =========================================================================

export function numVal(v: NumberLineValue): number {
	return evaluateNodeToApproximatedNumber(v.ast);
}

export function valLatex(v: NumberLineValue): string {
	return toLatex(v.ast);
}

// =========================================================================
// COORDINATE MAPPING
// =========================================================================

/**
 * Map a numeric value to a normalized position within a given output width.
 * Used by both SVG rendering and Typst generation.
 */
export function mapValueToRange(
	val: number,
	startNum: number,
	endNum: number,
	outputWidth: number,
	scale: 'linear' | 'log' = 'linear'
): number {
	if (scale === 'log') {
		const logStart = Math.log10(startNum);
		const logEnd = Math.log10(endNum);
		const logVal = Math.log10(val);
		return ((logVal - logStart) / (logEnd - logStart)) * outputWidth;
	}
	return ((val - startNum) / (endNum - startNum)) * outputWidth;
}

/**
 * Map a numeric value to SVG x coordinate.
 * Supports linear and logarithmic scales.
 */
export function valueToX(
	val: number,
	startNum: number,
	endNum: number,
	scale: 'linear' | 'log' = 'linear',
	width: number = NL_LAYOUT.SVG_WIDTH
): number {
	return NL_LAYOUT.MARGIN_LEFT + mapValueToRange(val, startNum, endNum, lineWidthFor(width), scale);
}

/**
 * Map an SVG x coordinate back to a numeric value (linear only).
 */
export function xToValue(
	x: number,
	startNum: number,
	endNum: number,
	width: number = NL_LAYOUT.SVG_WIDTH
): number {
	return startNum + ((x - NL_LAYOUT.MARGIN_LEFT) / lineWidthFor(width)) * (endNum - startNum);
}

/**
 * Snap a value to the nearest graduation step.
 */
export function snapToStep(val: number, startNum: number, stepNum: number): number {
	const steps = Math.round((val - startNum) / stepNum);
	return startNum + steps * stepNum;
}

// =========================================================================
// AUTO LABELS
// =========================================================================

/**
 * Format an auto-generated label for a graduation value.
 * Returns LaTeX string for integers and common fractions, decimal fallback otherwise.
 */
export function formatAutoLabel(val: number): string {
	if (Math.abs(val - Math.round(val)) < 1e-9) {
		return String(Math.round(val));
	}
	for (const denom of [2, 3, 4, 5, 6, 8, 10]) {
		const numer = val * denom;
		if (Math.abs(numer - Math.round(numer)) < 1e-9) {
			return `\\frac{${Math.round(numer)}}{${denom}}`;
		}
	}
	return val.toFixed(2).replace(/\.?0+$/, '');
}

// =========================================================================
// GRADUATIONS
// =========================================================================

export interface Graduation {
	x: number;
	value: number;
	isMajor: boolean;
	label: string | null;
	hidden: boolean;
	lineValue: NumberLineValue | null;
}

/**
 * Compute all graduations for a number line configuration.
 * Pure function — no Svelte reactivity.
 */
export function computeGraduations(
	config: NumberLineConfig,
	width: number = NL_LAYOUT.SVG_WIDTH
): Graduation[] {
	const grads: Graduation[] = [];
	const startNum = numVal(config.start);
	const endNum = numVal(config.end);
	const stepNum = numVal(config.step);
	const { major } = config;
	const hasExplicitLabels = config.labels.length > 0;
	const tolerance = stepNum * 0.001;
	const scale = config.scale ?? 'linear';

	let tickIndex = 0;
	for (let val = startNum; val <= endNum + tolerance; val += stepNum) {
		const isMajor = tickIndex % major === 0;
		const x = valueToX(val, startNum, endNum, scale, width);

		let lineValue: NumberLineValue | null = null;
		let label: string | null = null;
		let hidden = false;

		if (hasExplicitLabels) {
			const matchingLabel = config.labels.find((lv) => Math.abs(numVal(lv) - val) < tolerance);
			if (matchingLabel) {
				lineValue = matchingLabel;
				hidden = config.hidden.some((h) => compareNumericNodes(h.ast, matchingLabel.ast) === 0);
				label = hidden ? '?' : valLatex(matchingLabel);
			}
		} else if (isMajor) {
			label = formatAutoLabel(val);
			const matchingHidden = config.hidden.find((hv) => Math.abs(numVal(hv) - val) < tolerance);
			if (matchingHidden) {
				hidden = true;
				label = '?';
			}
		}

		grads.push({ x, value: val, isMajor, label, hidden, lineValue });
		tickIndex++;
	}

	return grads;
}

// =========================================================================
// ARROW POSITIONS
// =========================================================================

/**
 * Compute the start/end x positions of the main line, accounting for arrows.
 */
export function computeLineExtents(
	arrows: boolean,
	width: number = NL_LAYOUT.SVG_WIDTH
): { lineStartX: number; lineEndX: number } {
	const { MARGIN_LEFT, ARROW_SIZE } = NL_LAYOUT;
	const offset = arrows ? ARROW_SIZE + 2 : 0;
	return {
		lineStartX: MARGIN_LEFT - offset,
		lineEndX: MARGIN_LEFT + lineWidthFor(width) + offset
	};
}

// =========================================================================
// ÉCART ENTRE GRADUATIONS (téléphone)
// =========================================================================

/** Plus petit écart (px) entre deux graduations voisines, droite dessinée sur `width` px */
export function minGraduationGap(config: NumberLineConfig, width: number): number {
	const xs = computeGraduations(config, width).map((g) => g.x);
	let gap = Infinity;
	for (let i = 1; i < xs.length; i++) gap = Math.min(gap, xs[i] - xs[i - 1]);
	return gap;
}

/**
 * Avertissement pour le prof : sur un téléphone, les graduations seraient trop
 * serrées pour être lues et visées. `null` si elles tiennent.
 */
export function phoneGapWarning(config: NumberLineConfig): string | null {
	const gap = minGraduationGap(config, NL_PHONE_WIDTH);
	if (gap >= NL_MIN_GRADUATION_GAP) return null;
	return (
		`sur un téléphone, les graduations ne seraient écartées que de ${Math.round(gap)} px ` +
		`(moins de ${NL_MIN_GRADUATION_GAP} px) : difficiles à lire et à viser du doigt. ` +
		`Moins de graduations, ou une droite plus courte.`
	);
}

// =========================================================================
// COLORS (lot 3 des couleurs thémables)
// =========================================================================

/** Couleur d'un point sans couleur (ou de couleur inconnue) */
export const NL_DEFAULT_POINT_COLOR = 'rouge';
/** Couleur d'un segment sans couleur (ou de couleur inconnue) */
export const NL_DEFAULT_SEGMENT_COLOR = 'bleu';

export interface NumberLineColors {
	points: AuthorColor[];
	segments: AuthorColor[];
	/** Avertissements pour l'auteur, situés (« Point A : … », « Segment 2 : … ») */
	warnings: string[];
}

/**
 * Couleurs des points et segments, communes à l'écran et au PDF : palette
 * nommée (français ou anglais), hex tel quel, sinon le défaut avec un
 * avertissement. Ne lève jamais.
 */
export function resolveNumberLineColors(node: NumberLineNode): NumberLineColors {
	const warnings: string[] = [];
	const points = node.points.map((p) => {
		const color = resolveAuthorColor(p.color, NL_DEFAULT_POINT_COLOR);
		if (color.warning) warnings.push(`Point ${p.label} : ${color.warning}`);
		return color;
	});
	const segments = node.segments.map((s, i) => {
		const color = resolveAuthorColor(s.color, NL_DEFAULT_SEGMENT_COLOR);
		if (color.warning) warnings.push(`Segment ${i + 1} : ${color.warning}`);
		return color;
	});
	return { points, segments, warnings };
}
