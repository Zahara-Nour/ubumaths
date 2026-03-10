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
 * - Segments (intervals) with open/closed endpoints
 * - Linear and logarithmic scales
 * - LaTeX → Typst math conversion for labels
 *
 * @module ubumark/generators/number-line-typst
 */

import type { NumberLineNode, NumberLinePoint, NumberLineSegment } from '../types/number-line';
import { numVal, computeGraduations, mapValueToRange } from '../utils/number-line-render';
import { convertLatexToTypstMath } from './typst-generator';

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
	/** Y offset for segments below labels (default: -0.9) */
	segmentOffset?: number;
	/** Point radius (default: 0.08) */
	pointRadius?: number;
	/** Segment endpoint radius (default: 0.07) */
	endpointRadius?: number;
}

const DEFAULT_OPTIONS: Required<NumberLineTypstOptions> = {
	lineWidth: 12,
	majorTickHeight: 0.3,
	minorTickHeight: 0.15,
	labelOffset: -0.5,
	pointOffset: 0.4,
	pointLabelOffset: 0.7,
	segmentOffset: -0.9,
	pointRadius: 0.08,
	endpointRadius: 0.07
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

		// Segments (rendered below labels, before points)
		if (node.segments.length > 0) {
			parts.push(generateSegments(node.segments, startNum, endNum, scale, opts));
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

function generateAxis(
	startNum: number,
	endNum: number,
	arrows: boolean,
	opts: Required<NumberLineTypstOptions>
): string {
	const lines: string[] = [];
	lines.push('  // Main axis');

	const extension = arrows ? 0.3 : 0;
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
			const displayLabel = grad.hidden ? '?' : labelToTypst(grad.label);
			lines.push(`  content((${fmt(x)}, ${fmt(opts.labelOffset)}), [$${displayLabel}$])`);
		}
	}

	lines.push('');
	return lines.join('\n');
}

/**
 * Convert a LaTeX label string to Typst math.
 */
function labelToTypst(label: string): string {
	// Pure integers/decimals don't need conversion
	if (/^-?\d+(\.\d+)?$/.test(label)) {
		return label;
	}
	return convertLatexToTypstMath(label);
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
		const color = getTypstColor(p.color);

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
	opts: Required<NumberLineTypstOptions>
): string {
	const lines: string[] = [];
	lines.push('  // Segments');

	for (let i = 0; i < segments.length; i++) {
		const seg = segments[i];
		const x1 = mapValueToRange(numVal(seg.start), startNum, endNum, opts.lineWidth, scale);
		const x2 = mapValueToRange(numVal(seg.end), startNum, endNum, opts.lineWidth, scale);
		const y = opts.segmentOffset - i * 0.3;
		const color = getTypstColor(seg.color);

		// Segment line
		lines.push(
			`  line((${fmt(x1)}, ${fmt(y)}), (${fmt(x2)}, ${fmt(y)}), stroke: (paint: ${color}, thickness: 2pt))`
		);

		// Start endpoint
		const startFill = seg.startOpen ? 'white' : color;
		lines.push(
			`  circle((${fmt(x1)}, ${fmt(y)}), radius: ${fmt(opts.endpointRadius)}, fill: ${startFill}, stroke: ${color})`
		);

		// End endpoint
		const endFill = seg.endOpen ? 'white' : color;
		lines.push(
			`  circle((${fmt(x2)}, ${fmt(y)}), radius: ${fmt(opts.endpointRadius)}, fill: ${endFill}, stroke: ${color})`
		);
	}

	lines.push('');
	return lines.join('\n');
}

// ============================================================================
// COLOR MAPPING
// ============================================================================

function getTypstColor(color?: string): string {
	if (!color) return 'red';

	const colorMap: Record<string, string> = {
		red: 'red',
		blue: 'blue',
		green: 'green',
		orange: 'orange',
		purple: 'purple',
		pink: 'rgb("#ec4899")',
		cyan: 'rgb("#06b6d4")',
		yellow: 'yellow',
		black: 'black',
		gray: 'gray'
	};

	// Handle CSS color variables (fallback to the plain color name)
	if (color.startsWith('var(')) {
		return 'red';
	}

	return colorMap[color.toLowerCase()] || color;
}
