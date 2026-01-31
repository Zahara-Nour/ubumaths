/**
 * Trig Circle Typst Generator - Convert trigonometric circles to CeTZ
 * ====================================================================
 *
 * Generates Typst code using the CeTZ (Canvas Extensions for Typst) package
 * for unit circle visualizations.
 *
 * Features:
 * - Unit circle with axes
 * - Angle points with labels
 * - Projection lines to axes (optional)
 * - Arcs for equation solutions
 * - Value table (optional)
 * - Math expressions converted from LaTeX to Typst
 *
 * @module ubumark/generators/trig-circle-typst
 */

import type { TrigCircleNode, TrigAngle, TrigArc } from '../types/trig-circle';
import { REMARKABLE_ANGLES } from '../types/trig-circle';
import { convertLatexToTypstMath } from './typst-generator';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface TrigCircleTypstOptions {
	/** Circle radius in cm (default: 2.5) */
	radius?: number;
	/** Axis extension beyond circle (default: 0.5) */
	axisExtension?: number;
	/** Point radius (default: 0.06) */
	pointRadius?: number;
	/** Label offset from point (default: 0.4) */
	labelOffset?: number;
}

const DEFAULT_OPTIONS: Required<TrigCircleTypstOptions> = {
	radius: 2.5,
	axisExtension: 0.5,
	pointRadius: 0.06,
	labelOffset: 0.4
};

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

/**
 * Generate Typst code for a trigonometric circle using CeTZ
 *
 * @param node - Trig circle AST node
 * @param options - Generator options
 * @returns Typst code string
 *
 * @example
 * ```typescript
 * const typst = generateTrigCircleTypst(trigNode);
 * // Returns CeTZ code for the trig circle
 * ```
 */
export function generateTrigCircleTypst(
	node: TrigCircleNode,
	options: TrigCircleTypstOptions = {}
): string {
	const opts = { ...DEFAULT_OPTIONS, ...options };

	try {
		const importStatement = '#import "@preview/cetz:0.3.0"\n\n';

		const parts: string[] = [];

		// Import and canvas start
		parts.push('  import cetz.draw: *');
		parts.push('');
		parts.push('  // Set up coordinate system with origin at center');
		parts.push('  set-origin((0, 0))');
		parts.push('');

		// Draw axes if enabled
		if (node.config.showAxes) {
			parts.push(generateAxes(opts));
		}

		// Draw grid if enabled
		if (node.config.showGrid) {
			parts.push(generateGrid(opts));
		}

		// Draw the unit circle
		parts.push(generateCircle(opts));

		// Draw solution arcs if in arc mode
		if (node.config.mode === 'arc' && node.solution?.arcs && node.solution.arcs.length > 0) {
			parts.push(generateArcs(node.solution.arcs, node.config.color, opts));
		}

		// Draw projection lines if enabled
		if (node.config.showProjections) {
			parts.push(generateProjections(node.angles, opts));
		}

		// Draw angle points
		parts.push(generatePoints(node.angles, node.config.color, opts));

		// Draw labels if enabled
		if (node.config.showLabels) {
			parts.push(generateLabels(node.angles, opts));
		}

		// Draw axis values if enabled
		if (node.config.showAxisValues) {
			parts.push(generateAxisValues(opts));
		}

		const circleContent = parts.join('\n');

		// Generate the full output
		let output = `${importStatement}#cetz.canvas({\n${circleContent}\n})`;

		// Add value table if needed
		if (node.config.display === 'table' || node.config.display === 'circle+table') {
			output += '\n\n' + generateValueTable(node.angles);
		}

		return output;
	} catch (error) {
		return `// Error: ${error instanceof Error ? error.message : 'Failed to generate trig circle'}`;
	}
}

// ============================================================================
// DRAWING UTILITIES
// ============================================================================

/**
 * Convert angle in radians to point coordinates
 */
function angleToCoords(radians: number, radius: number): { x: number; y: number } {
	return {
		x: radius * Math.cos(radians),
		y: radius * Math.sin(radians)
	};
}

/**
 * Format a number for Typst output
 */
function formatNumber(n: number, decimals: number = 3): string {
	return n.toFixed(decimals).replace(/\.?0+$/, '') || '0';
}

// ============================================================================
// COMPONENT GENERATORS
// ============================================================================

/**
 * Generate axes (x and y) with arrows
 */
function generateAxes(opts: Required<TrigCircleTypstOptions>): string {
	const { radius, axisExtension } = opts;
	const ext = radius + axisExtension;

	const lines: string[] = [];
	lines.push('  // Axes');
	lines.push(`  line((-${formatNumber(ext)}, 0), (${formatNumber(ext)}, 0), mark: (end: ">"))`);
	lines.push(`  line((0, -${formatNumber(ext)}), (0, ${formatNumber(ext)}), mark: (end: ">"))`);
	lines.push('');

	return lines.join('\n');
}

/**
 * Generate grid lines at ±0.5
 */
function generateGrid(opts: Required<TrigCircleTypstOptions>): string {
	const { radius, axisExtension } = opts;
	const ext = radius + axisExtension;

	const lines: string[] = [];
	lines.push('  // Grid');
	lines.push('  set-style(stroke: (dash: "dashed", paint: gray))');

	// Vertical lines at x = ±0.5 (scaled)
	const halfPoint = radius * 0.5;
	lines.push(
		`  line((-${formatNumber(halfPoint)}, -${formatNumber(ext)}), (-${formatNumber(halfPoint)}, ${formatNumber(ext)}))`
	);
	lines.push(
		`  line((${formatNumber(halfPoint)}, -${formatNumber(ext)}), (${formatNumber(halfPoint)}, ${formatNumber(ext)}))`
	);

	// Horizontal lines at y = ±0.5 (scaled)
	lines.push(
		`  line((-${formatNumber(ext)}, -${formatNumber(halfPoint)}), (${formatNumber(ext)}, -${formatNumber(halfPoint)}))`
	);
	lines.push(
		`  line((-${formatNumber(ext)}, ${formatNumber(halfPoint)}), (${formatNumber(ext)}, ${formatNumber(halfPoint)}))`
	);

	lines.push('  set-style(stroke: black)');
	lines.push('');

	return lines.join('\n');
}

/**
 * Generate the unit circle
 */
function generateCircle(opts: Required<TrigCircleTypstOptions>): string {
	const lines: string[] = [];
	lines.push('  // Unit circle');
	lines.push(`  circle((0, 0), radius: ${formatNumber(opts.radius)})`);
	lines.push('');

	return lines.join('\n');
}

/**
 * Generate solution arcs for inequations
 */
function generateArcs(
	arcs: TrigArc[],
	color: string,
	opts: Required<TrigCircleTypstOptions>
): string {
	const lines: string[] = [];
	lines.push('  // Solution arcs');

	const typstColor = getTypstColor(color);
	lines.push(`  set-style(stroke: (paint: ${typstColor}, thickness: 4pt))`);

	for (let i = 0; i < arcs.length; i++) {
		const arc = arcs[i];
		const startDeg = (arc.startAngle * 180) / Math.PI;
		const endDeg = (arc.endAngle * 180) / Math.PI;

		// Use arc with start and stop angles
		lines.push(
			`  arc((0, 0), radius: ${formatNumber(opts.radius)}, start: ${formatNumber(startDeg)}deg, stop: ${formatNumber(endDeg)}deg)`
		);

		// Draw endpoint markers
		const startPoint = angleToCoords(arc.startAngle, opts.radius);
		const endPoint = angleToCoords(arc.endAngle, opts.radius);

		if (arc.includeStart) {
			lines.push(
				`  circle((${formatNumber(startPoint.x)}, ${formatNumber(startPoint.y)}), radius: ${formatNumber(opts.pointRadius)}, fill: ${typstColor})`
			);
		} else {
			lines.push(
				`  circle((${formatNumber(startPoint.x)}, ${formatNumber(startPoint.y)}), radius: ${formatNumber(opts.pointRadius)}, fill: white, stroke: ${typstColor})`
			);
		}

		if (arc.includeEnd) {
			lines.push(
				`  circle((${formatNumber(endPoint.x)}, ${formatNumber(endPoint.y)}), radius: ${formatNumber(opts.pointRadius)}, fill: ${typstColor})`
			);
		} else {
			lines.push(
				`  circle((${formatNumber(endPoint.x)}, ${formatNumber(endPoint.y)}), radius: ${formatNumber(opts.pointRadius)}, fill: white, stroke: ${typstColor})`
			);
		}
	}

	lines.push('  set-style(stroke: black)');
	lines.push('');

	return lines.join('\n');
}

/**
 * Generate projection lines from points to axes
 */
function generateProjections(angles: TrigAngle[], opts: Required<TrigCircleTypstOptions>): string {
	const lines: string[] = [];
	lines.push('  // Projection lines');
	lines.push('  set-style(stroke: (dash: "dashed", paint: gray))');

	for (const angle of angles) {
		const point = angleToCoords(angle.radians, opts.radius);

		// Vertical projection to x-axis
		lines.push(
			`  line((${formatNumber(point.x)}, ${formatNumber(point.y)}), (${formatNumber(point.x)}, 0))`
		);

		// Horizontal projection to y-axis
		lines.push(
			`  line((${formatNumber(point.x)}, ${formatNumber(point.y)}), (0, ${formatNumber(point.y)}))`
		);
	}

	lines.push('  set-style(stroke: black)');
	lines.push('');

	return lines.join('\n');
}

/**
 * Generate angle points on the circle
 */
function generatePoints(
	angles: TrigAngle[],
	color: string,
	opts: Required<TrigCircleTypstOptions>
): string {
	const lines: string[] = [];
	lines.push('  // Angle points');

	const typstColor = getTypstColor(color);

	for (const angle of angles) {
		const point = angleToCoords(angle.radians, opts.radius);

		// Draw radius line
		lines.push(
			`  line((0, 0), (${formatNumber(point.x)}, ${formatNumber(point.y)}), stroke: gray)`
		);

		// Draw point
		lines.push(
			`  circle((${formatNumber(point.x)}, ${formatNumber(point.y)}), radius: ${formatNumber(opts.pointRadius)}, fill: ${typstColor})`
		);
	}

	lines.push('');

	return lines.join('\n');
}

/**
 * Generate labels for angle points
 */
function generateLabels(angles: TrigAngle[], opts: Required<TrigCircleTypstOptions>): string {
	const lines: string[] = [];
	lines.push('  // Angle labels');

	for (const angle of angles) {
		const point = angleToCoords(angle.radians, opts.radius);
		const cos = Math.cos(angle.radians);
		const sin = Math.sin(angle.radians);

		// Position label outside the circle
		const labelX = point.x + opts.labelOffset * cos;
		const labelY = point.y + opts.labelOffset * sin;

		// Determine anchor based on position
		let anchor = 'center';
		if (cos > 0.3) anchor = 'west';
		else if (cos < -0.3) anchor = 'east';

		const latex = angle.latex || angle.expression;
		const typstMath = convertLatexToTypstMath(latex);

		lines.push(
			`  content((${formatNumber(labelX)}, ${formatNumber(labelY)}), [$${typstMath}$], anchor: "${anchor}")`
		);
	}

	lines.push('');

	return lines.join('\n');
}

/**
 * Generate axis value labels (-1, 1)
 */
function generateAxisValues(opts: Required<TrigCircleTypstOptions>): string {
	const lines: string[] = [];
	lines.push('  // Axis values');

	const { radius } = opts;

	// X-axis values
	lines.push(`  content((${formatNumber(radius)}, -0.3), [$1$])`);
	lines.push(`  content((-${formatNumber(radius)}, -0.3), [$-1$])`);

	// Y-axis values
	lines.push(`  content((-0.3, ${formatNumber(radius)}), [$1$])`);
	lines.push(`  content((-0.3, -${formatNumber(radius)}), [$-1$])`);

	lines.push('');

	return lines.join('\n');
}

/**
 * Generate value table showing cos/sin values
 */
function generateValueTable(angles: TrigAngle[]): string {
	if (angles.length === 0) return '';

	const lines: string[] = [];
	lines.push('#table(');
	lines.push('  columns: 3,');
	lines.push('  align: center,');
	lines.push('  table.header([$theta$], [$cos theta$], [$sin theta$]),');

	for (const angle of angles) {
		const latex = angle.latex || angle.expression;
		const typstMath = convertLatexToTypstMath(latex);
		const cosVal = getCosValue(angle.radians);
		const sinVal = getSinValue(angle.radians);

		lines.push(`  [$${typstMath}$], [$${cosVal}$], [$${sinVal}$],`);
	}

	lines.push(')');

	return lines.join('\n');
}

// ============================================================================
// VALUE UTILITIES
// ============================================================================

/**
 * Get cosine value for display (remarkable values or numeric)
 */
function getCosValue(radians: number): string {
	// Try to find a remarkable angle match
	for (const [_key, value] of Object.entries(REMARKABLE_ANGLES)) {
		if (Math.abs(radians - value.radians) < 1e-10) {
			return convertLatexToTypstMath(value.cos);
		}
	}
	// Fallback to numeric
	const cos = Math.cos(radians);
	return Math.abs(cos) < 1e-10 ? '0' : formatNumber(cos, 4);
}

/**
 * Get sine value for display (remarkable values or numeric)
 */
function getSinValue(radians: number): string {
	// Try to find a remarkable angle match
	for (const [_key, value] of Object.entries(REMARKABLE_ANGLES)) {
		if (Math.abs(radians - value.radians) < 1e-10) {
			return convertLatexToTypstMath(value.sin);
		}
	}
	// Fallback to numeric
	const sin = Math.sin(radians);
	return Math.abs(sin) < 1e-10 ? '0' : formatNumber(sin, 4);
}

/**
 * Convert color name to Typst color
 */
function getTypstColor(color: string): string {
	const colorMap: Record<string, string> = {
		blue: 'blue',
		red: 'red',
		green: 'green',
		orange: 'orange',
		purple: 'purple',
		pink: 'rgb("#ec4899")',
		cyan: 'rgb("#06b6d4")',
		yellow: 'yellow'
	};
	return colorMap[color.toLowerCase()] || 'blue';
}
