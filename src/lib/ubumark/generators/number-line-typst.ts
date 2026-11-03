/**
 * Number Line Typst Generator - Convert NumberLineNode to CeTZ
 * =============================================================
 *
 * Generates Typst code using CeTZ for number line (droite graduée) visualizations.
 *
 * Features:
 * - Horizontal axis with optional arrows
 * - Minor/major graduations with labels
 * - Hidden labels shown as "?" for exercises
 * - Named points with colors
 * - Segments (intervals, demi-droites comprises) with bracket endpoints
 * - Linear and logarithmic scales
 * - LaTeX → Typst math conversion for labels
 *
 * @module ubumark/generators/number-line-typst
 */

import type { NumberLineNode, NumberLinePoint, NumberLineSegment } from '../types/number-line';
import {
	numVal,
	computeGraduations,
	mapValueToRange,
	NL_DEFAULT_POINT_COLOR,
	NL_DEFAULT_SEGMENT_COLOR,
	bracketDirection,
	bracketPoints,
	segmentLevels
} from '../utils/number-line-render';
import { authorColorTypst, resolveAuthorColor } from '$lib/theme/author-color';
import { convertLatexToTypstMath } from './typst-generator';
import { toLocaleDecimal } from '$lib/utils/french-math';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface NumberLineTypstOptions {
	/** Total width of the line in cm (default: 12) */
	lineWidth?: number;
	/** Height of major ticks in cm (default: 0.3) */
	majorTickHeight?: number;
	/** Height of minor ticks in cm (default: 0.15) */
	minorTickHeight?: number;
	/** Y offset for labels below the line (default: -0.5) */
	labelOffset?: number;
	/** Y offset for points above the line (default: 0.4) */
	pointOffset?: number;
	/** Y offset for point labels (default: 0.7) */
	pointLabelOffset?: number;
	/** Écart entre deux étages de segments qui se chevauchent, au-dessus de l'axe (défaut : 0.3) */
	segmentLevelGap?: number;
	/** Point radius (default: 0.08) */
	pointRadius?: number;
	/** Demi-hauteur d'un crochet d'extrémité (défaut : 0.2) */
	bracketHeight?: number;
	/** Longueur des becs d'un crochet (défaut : 0.1) */
	bracketBeak?: number;
	/** Langue du document : virgule décimale en français (défaut), point en anglais */
	language?: string;
}

const DEFAULT_OPTIONS: Required<NumberLineTypstOptions> = {
	lineWidth: 12,
	majorTickHeight: 0.3,
	minorTickHeight: 0.15,
	labelOffset: -0.5,
	pointOffset: 0.4,
	pointLabelOffset: 0.7,
	segmentLevelGap: 0.3,
	pointRadius: 0.08,
	bracketHeight: 0.2,
	bracketBeak: 0.1,
	language: 'fr'
};

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Generate Typst code for a number line using CeTZ.
 */
export function generateNumberLineTypst(
	node: NumberLineNode,
	options: NumberLineTypstOptions = {}
): string {
	const opts = { ...DEFAULT_OPTIONS, ...options };

	try {
		const startNum = numVal(node.config.start);
		const endNum = numVal(node.config.end);

		const parts: string[] = [];
		parts.push('  import cetz.draw: *');
		parts.push('');

		// Main axis
		parts.push(generateAxis(startNum, endNum, node.config.arrows, opts));

		// Graduations + labels
		parts.push(generateGraduations(node, startNum, endNum, opts));

		const scale = node.config.scale ?? 'linear';

		// Segments (sur l'axe, avant les points)
		if (node.segments.length > 0) {
			parts.push(
				generateSegments(node.segments, startNum, endNum, scale, node.config.arrows, opts)
			);
		}

		// Points
		if (node.points.length > 0) {
			parts.push(generatePoints(node.points, startNum, endNum, scale, opts));
		}

		const body = parts.join('\n');
		return `#import "@preview/cetz:0.3.0"\n\n#cetz.canvas({\n${body}\n})`;
	} catch (error) {
		return `// Error: ${error instanceof Error ? error.message : 'Failed to generate number line'}`;
	}
}

// ============================================================================
// COORDINATE MAPPING
// ============================================================================

function fmt(n: number, decimals: number = 3): string {
	return n.toFixed(decimals).replace(/\.?0+$/, '') || '0';
}

// ============================================================================
// AXIS
// ============================================================================

/** Dépassement (cm) de l'axe de chaque côté quand il a des flèches */
const AXIS_ARROW_EXTENSION = 0.3;
/** Longueur (cm) de la pointe de flèche de cetz (`mark: ">"`), mesurée sur le PDF */
const AXIS_ARROW_LENGTH = 0.25;

function generateAxis(
	startNum: number,
	endNum: number,
	arrows: boolean,
	opts: Required<NumberLineTypstOptions>
): string {
	const lines: string[] = [];
	lines.push('  // Main axis');

	const extension = arrows ? AXIS_ARROW_EXTENSION : 0;
	const x0 = -extension;
	const x1 = opts.lineWidth + extension;

	if (arrows) {
		lines.push(`  line((${fmt(x0)}, 0), (${fmt(x1)}, 0), mark: (start: ">", end: ">"))`);
	} else {
		lines.push(`  line((${fmt(x0)}, 0), (${fmt(x1)}, 0))`);
	}
	lines.push('');
	return lines.join('\n');
}

// ============================================================================
// GRADUATIONS
// ============================================================================

function generateGraduations(
	node: NumberLineNode,
	startNum: number,
	endNum: number,
	opts: Required<NumberLineTypstOptions>
): string {
	const lines: string[] = [];
	lines.push('  // Graduations');

	const grads = computeGraduations(node.config);
	const scale = node.config.scale ?? 'linear';

	for (const grad of grads) {
		const x = mapValueToRange(grad.value, startNum, endNum, opts.lineWidth, scale);
		const tickH = grad.isMajor ? opts.majorTickHeight : opts.minorTickHeight;
		const halfH = tickH / 2;

		// Tick mark
		lines.push(`  line((${fmt(x)}, ${fmt(-halfH)}), (${fmt(x)}, ${fmt(halfH)}))`);

		// Label
		if (grad.label !== null) {
			const displayLabel = grad.hidden ? '?' : labelToTypst(grad.label, opts.language);
			lines.push(`  content((${fmt(x)}, ${fmt(opts.labelOffset)}), [$${displayLabel}$])`);
		}
	}

	lines.push('');
	return lines.join('\n');
}

/**
 * Convert a LaTeX label string to Typst math.
 */
function labelToTypst(label: string, language: string): string {
	// Comme à l'écran : 1.4 → 1{,}4 en français (le convertisseur en fait `1","4`), 1.4 en
	// anglais ; 10000 → 10\,000 (`10 thin 000`) dans les deux langues
	return convertLatexToTypstMath(toLocaleDecimal(label, language));
}

// ============================================================================
// POINTS
// ============================================================================

function generatePoints(
	points: NumberLinePoint[],
	startNum: number,
	endNum: number,
	scale: 'linear' | 'log',
	opts: Required<NumberLineTypstOptions>
): string {
	const lines: string[] = [];
	lines.push('  // Points');

	for (const p of points) {
		const x = mapValueToRange(numVal(p.value), startNum, endNum, opts.lineWidth, scale);
		const color = authorColorTypst(resolveAuthorColor(p.color, NL_DEFAULT_POINT_COLOR));

		// Circle
		lines.push(
			`  circle((${fmt(x)}, ${fmt(opts.pointOffset)}), radius: ${fmt(opts.pointRadius)}, fill: ${color}, stroke: ${color})`
		);

		// Label above
		lines.push(
			`  content((${fmt(x)}, ${fmt(opts.pointLabelOffset)}), text(fill: ${color})[${p.label}])`
		);
	}

	lines.push('');
	return lines.join('\n');
}

// ============================================================================
// SEGMENTS
// ============================================================================

function generateSegments(
	segments: NumberLineSegment[],
	startNum: number,
	endNum: number,
	scale: 'linear' | 'log',
	arrows: boolean,
	opts: Required<NumberLineTypstOptions>
): string {
	const lines: string[] = [];
	lines.push('  // Segments');

	// Une borne infinie s'arrête à la base de la flèche (la flèche, creuse, reste visible)
	const extension = arrows ? AXIS_ARROW_EXTENSION - AXIS_ARROW_LENGTH : 0;

	// Sur l'axe, plus haut si le segment en chevauche un autre (même règle qu'à l'écran)
	const levels = segmentLevels(segments);

	for (let i = 0; i < segments.length; i++) {
		const seg = segments[i];
		const x1 = seg.startInfinite
			? -extension
			: mapValueToRange(numVal(seg.start), startNum, endNum, opts.lineWidth, scale);
		const x2 = seg.endInfinite
			? opts.lineWidth + extension
			: mapValueToRange(numVal(seg.end), startNum, endNum, opts.lineWidth, scale);
		const y = levels[i] * opts.segmentLevelGap;
		const color = authorColorTypst(resolveAuthorColor(seg.color, NL_DEFAULT_SEGMENT_COLOR));

		// Segment line
		lines.push(
			`  line((${fmt(x1)}, ${fmt(y)}), (${fmt(x2)}, ${fmt(y)}), stroke: (paint: ${color}, thickness: 2.5pt))`
		);

		// Extrémités : crochets (notation française), aucun sur une borne infinie
		const bracket = (x: number, side: 'start' | 'end', open: boolean) => {
			const points = bracketPoints(
				x,
				y,
				bracketDirection(side, open),
				opts.bracketHeight,
				opts.bracketBeak
			)
				.map(([px, py]) => `(${fmt(px)}, ${fmt(py)})`)
				.join(', ');
			return `  line(${points}, stroke: (paint: ${color}, thickness: 1.5pt)) // crochet`;
		};
		if (!seg.startInfinite) lines.push(bracket(x1, 'start', seg.startOpen));
		if (!seg.endInfinite) lines.push(bracket(x2, 'end', seg.endOpen));
	}

	lines.push('');
	return lines.join('\n');
}
