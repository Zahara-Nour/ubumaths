/**
 * Trigonometric Circle Parser - Parse Trig Circle Blocks
 * =======================================================
 *
 * This module parses markdown trigonometric circle blocks with support for:
 * - Preset angle collections (quarters, sixths, thirds, all, custom)
 * - Custom angle expressions (pi/5, 7*pi/6, etc.)
 * - Trigonometric equations and inequations (cos(x) > 1/2)
 * - Multiple display modes (points, arc, interactive)
 *
 * Syntax:
 * ```trig
 * preset: quarters
 * angles: pi/5, 7*pi/6
 * equation: cos(x) > 1/2
 * mode: arc
 * display: circle+table
 * projections: true
 * color: blue
 * grid: false
 * axes: true
 * ```
 *
 * @module ubumark/parser/trig-circle-parser
 */

import type {
	TrigCircleNode,
	TrigCircleConfig,
	TrigAngle,
	TrigEquation,
	TrigSolution,
	TrigArc,
	TrigPreset,
	TrigDisplayMode,
	TrigDisplayType,
	TrigFunction,
	TrigOperator,
	TrigCircleParseError,
	TrigCircleParseWarning,
	TrigCircleParseResult,
	TrigCircleBlockRange
} from '../types/trig-circle';
import {
	DEFAULT_TRIG_CIRCLE_CONFIG,
	getPresetAngles,
	REMARKABLE_ANGLES
} from '../types/trig-circle';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Regex to identify trig circle block start: ```trig
 */
const TRIG_BLOCK_START_REGEX = /^```trig\s*$/;

/**
 * Regex to identify block end: ```
 */
const BLOCK_END_REGEX = /^```\s*$/;

/**
 * Valid preset values
 */
const VALID_PRESETS: TrigPreset[] = ['all', 'quarters', 'sixths', 'thirds', 'custom'];

/**
 * Valid display modes
 */
const VALID_MODES: TrigDisplayMode[] = ['points', 'arc', 'interactive'];

/**
 * Valid display types
 */
const VALID_DISPLAY_TYPES: TrigDisplayType[] = ['circle', 'table', 'circle+table'];

/**
 * Valid trig functions
 */
const VALID_TRIG_FUNCTIONS: TrigFunction[] = ['cos', 'sin', 'tan'];

/**
 * Valid operators
 */
const VALID_OPERATORS: TrigOperator[] = ['=', '<', '>', '<=', '>='];

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

/**
 * Check if a line is the start of a trig circle block
 */
export function isTrigCircleBlockStart(line: string): boolean {
	return TRIG_BLOCK_START_REGEX.test(line);
}

/**
 * Check if a line is the end of a code block
 */
export function isBlockEnd(line: string): boolean {
	return BLOCK_END_REGEX.test(line) && !TRIG_BLOCK_START_REGEX.test(line);
}

/**
 * Find all trig circle blocks in a list of lines
 */
export function findTrigCircleBlocks(lines: string[]): TrigCircleBlockRange[] {
	const blocks: TrigCircleBlockRange[] = [];
	let i = 0;

	while (i < lines.length) {
		if (isTrigCircleBlockStart(lines[i])) {
			const startIndex = i;
			i++;

			// Find the end of the block
			while (i < lines.length && !isBlockEnd(lines[i])) {
				i++;
			}

			const endIndex = i < lines.length ? i : lines.length - 1;
			blocks.push({ startIndex, endIndex });
		}
		i++;
	}

	return blocks;
}

// ============================================================================
// ANGLE PARSING
// ============================================================================

/**
 * Normalize an angle to [0, 2π) range
 */
export function normalizeAngle(radians: number): number {
	const twoPi = 2 * Math.PI;
	let normalized = radians % twoPi;
	if (normalized < 0) {
		normalized += twoPi;
	}
	// Handle floating point precision issues near 2π
	if (Math.abs(normalized - twoPi) < 1e-10) {
		normalized = 0;
	}
	return normalized;
}

/**
 * Parse an angle expression like "pi/3", "2*pi/3", "7*pi/6", "3pi/4", "90°"
 *
 * Supports formats:
 * - pi/n (π/n)
 * - n*pi/m or npi/m (nπ/m)
 * - n*pi or npi (nπ)
 * - pi (π)
 * - degrees: n° or ndeg (converted to radians)
 * - decimal numbers (interpreted as radians)
 *
 * @param expr - Angle expression string
 * @returns TrigAngle or null if parsing fails
 */
export function parseAngleExpression(expr: string): TrigAngle | null {
	const trimmed = expr.trim().toLowerCase();

	// Replace π with pi for parsing
	const normalized = trimmed.replace(/π/g, 'pi');

	// Pattern: degrees (e.g., "90°", "90deg", "45°")
	const degreesMatch = normalized.match(/^(-?\d+(?:\.\d+)?)\s*(?:°|deg)$/);
	if (degreesMatch) {
		const degrees = parseFloat(degreesMatch[1]);
		const radians = normalizeAngle((degrees * Math.PI) / 180);
		return {
			expression: `${degrees}°`,
			radians,
			latex: `${degrees}^\\circ`
		};
	}

	// Pattern: n*pi/m or npi/m (e.g., "2*pi/3", "7*pi/6", "3pi/4")
	const nPiOverM = normalized.match(/^(-?\d+)\s*\*?\s*pi\s*\/\s*(\d+)$/);
	if (nPiOverM) {
		const n = parseInt(nPiOverM[1], 10);
		const m = parseInt(nPiOverM[2], 10);
		if (m === 0) return null;
		const radians = normalizeAngle((n * Math.PI) / m);
		return {
			expression: `${n}π/${m}`,
			radians,
			latex: n === 1 ? `\\frac{\\pi}{${m}}` : `\\frac{${n}\\pi}{${m}}`
		};
	}

	// Pattern: pi/n (e.g., "pi/3", "pi/6")
	const piOverN = normalized.match(/^pi\s*\/\s*(\d+)$/);
	if (piOverN) {
		const n = parseInt(piOverN[1], 10);
		if (n === 0) return null;
		const radians = normalizeAngle(Math.PI / n);
		return {
			expression: `π/${n}`,
			radians,
			latex: `\\frac{\\pi}{${n}}`
		};
	}

	// Pattern: n*pi or npi (e.g., "2*pi", "2pi") - must have a digit before pi
	const nPi = normalized.match(/^(-?\d+)\s*\*?\s*pi$/);
	if (nPi) {
		const n = parseInt(nPi[1], 10);
		const radians = normalizeAngle(n * Math.PI);
		return {
			expression: `${n}π`,
			radians,
			latex: n === 1 ? '\\pi' : `${n}\\pi`
		};
	}

	// Pattern: just "pi"
	if (normalized === 'pi') {
		return {
			expression: 'π',
			radians: Math.PI,
			latex: '\\pi'
		};
	}

	// Pattern: decimal number (radians)
	const decimal = parseFloat(normalized);
	if (!isNaN(decimal)) {
		const radians = normalizeAngle(decimal);
		return {
			expression: trimmed,
			radians,
			latex: trimmed
		};
	}

	return null;
}

/**
 * Parse a comma-separated list of angle expressions
 */
export function parseAngleList(list: string): TrigAngle[] {
	if (!list.trim()) return [];

	const expressions = list.split(',').map((s) => s.trim());
	const angles: TrigAngle[] = [];

	for (const expr of expressions) {
		const angle = parseAngleExpression(expr);
		if (angle) {
			angles.push(angle);
		}
	}

	return angles;
}

// ============================================================================
// EQUATION PARSING
// ============================================================================

/**
 * Known values for cos/sin with their numeric equivalents
 */
const KNOWN_VALUES: Record<string, number> = {
	'0': 0,
	'1': 1,
	'-1': -1,
	'1/2': 0.5,
	'-1/2': -0.5,
	'√2/2': Math.SQRT2 / 2,
	'sqrt(2)/2': Math.SQRT2 / 2,
	'\\frac{\\sqrt{2}}{2}': Math.SQRT2 / 2,
	'-√2/2': -Math.SQRT2 / 2,
	'-sqrt(2)/2': -Math.SQRT2 / 2,
	'-\\frac{\\sqrt{2}}{2}': -Math.SQRT2 / 2,
	'√3/2': Math.sqrt(3) / 2,
	'sqrt(3)/2': Math.sqrt(3) / 2,
	'\\frac{\\sqrt{3}}{2}': Math.sqrt(3) / 2,
	'-√3/2': -Math.sqrt(3) / 2,
	'-sqrt(3)/2': -Math.sqrt(3) / 2,
	'-\\frac{\\sqrt{3}}{2}': -Math.sqrt(3) / 2,
	'√3': Math.sqrt(3),
	'-√3': -Math.sqrt(3),
	'1/√3': 1 / Math.sqrt(3),
	'-1/√3': -1 / Math.sqrt(3)
};

/**
 * Parse a value expression (e.g., "1/2", "√2/2", "-√3/2")
 */
function parseValueExpression(expr: string): { value: string; numeric: number } | null {
	const trimmed = expr.trim();

	// Check known values first
	const knownKey = Object.keys(KNOWN_VALUES).find(
		(k) => k.toLowerCase() === trimmed.toLowerCase() || k === trimmed
	);
	if (knownKey) {
		return { value: trimmed, numeric: KNOWN_VALUES[knownKey] };
	}

	// Try to parse as fraction a/b
	const fractionMatch = trimmed.match(/^(-?\d+)\s*\/\s*(\d+)$/);
	if (fractionMatch) {
		const num = parseInt(fractionMatch[1], 10);
		const denom = parseInt(fractionMatch[2], 10);
		if (denom !== 0) {
			return { value: trimmed, numeric: num / denom };
		}
	}

	// Try to parse as decimal
	const decimal = parseFloat(trimmed);
	if (!isNaN(decimal)) {
		return { value: trimmed, numeric: decimal };
	}

	return null;
}

/**
 * Parse a trigonometric equation or inequation
 *
 * Supports formats:
 * - cos(x) = 1/2
 * - sin(x) > √2/2
 * - tan(x) <= 1
 *
 * @param expr - Equation expression string
 * @returns TrigEquation or null if parsing fails
 */
export function parseEquation(expr: string): TrigEquation | null {
	const trimmed = expr.trim();

	// Pattern: func(x) operator value
	// func: cos, sin, tan
	// operator: =, <, >, <=, >=
	const match = trimmed.match(/^(cos|sin|tan)\s*\(\s*x\s*\)\s*(<=|>=|=|<|>)\s*(.+)$/i);
	if (!match) return null;

	const func = match[1].toLowerCase() as TrigFunction;
	const operator = match[2] as TrigOperator;
	const valueStr = match[3].trim();

	if (!VALID_TRIG_FUNCTIONS.includes(func)) return null;
	if (!VALID_OPERATORS.includes(operator)) return null;

	const parsed = parseValueExpression(valueStr);
	if (!parsed) return null;

	return {
		func,
		operator,
		value: parsed.value,
		numericValue: parsed.numeric
	};
}

// ============================================================================
// EQUATION SOLVING
// ============================================================================

/**
 * Solve a trigonometric equation or inequation
 *
 * @param equation - The equation to solve
 * @returns TrigSolution with angles and/or arcs
 */
export function solveEquation(equation: TrigEquation): TrigSolution {
	const { func, operator, numericValue } = equation;

	// Check for no solution cases
	if (func === 'cos' || func === 'sin') {
		if (Math.abs(numericValue) > 1) {
			return {
				type: operator === '=' ? 'equation' : 'inequation',
				angles: [],
				arcs: [],
				noSolution: true,
				allReals: false,
				error: `|${numericValue}| > 1, no solution for ${func}`
			};
		}
	}

	// Handle equations (=)
	if (operator === '=') {
		return solveEquality(func, numericValue);
	}

	// Handle inequations (<, >, <=, >=)
	return solveInequality(func, operator, numericValue);
}

/**
 * Solve cos(x) = k, sin(x) = k, or tan(x) = k
 */
function solveEquality(func: TrigFunction, k: number): TrigSolution {
	const angles: TrigAngle[] = [];

	if (func === 'cos') {
		// cos(x) = k has solutions at x = ±arccos(k)
		const baseAngle = Math.acos(k);
		// Principal solution
		angles.push(createAngleFromRadians(baseAngle));
		// Second solution (if not 0 or π)
		const secondAngle = normalizeAngle(-baseAngle);
		if (Math.abs(secondAngle - baseAngle) > 1e-10 && Math.abs(secondAngle) > 1e-10) {
			angles.push(createAngleFromRadians(secondAngle));
		}
	} else if (func === 'sin') {
		// sin(x) = k has solutions at x = arcsin(k) and x = π - arcsin(k)
		const baseAngle = Math.asin(k);
		angles.push(createAngleFromRadians(normalizeAngle(baseAngle)));
		const secondAngle = normalizeAngle(Math.PI - baseAngle);
		if (Math.abs(secondAngle - normalizeAngle(baseAngle)) > 1e-10) {
			angles.push(createAngleFromRadians(secondAngle));
		}
	} else if (func === 'tan') {
		// tan(x) = k has solution at x = arctan(k) (+ π periodicity)
		const baseAngle = Math.atan(k);
		angles.push(createAngleFromRadians(normalizeAngle(baseAngle)));
		const secondAngle = normalizeAngle(baseAngle + Math.PI);
		angles.push(createAngleFromRadians(secondAngle));
	}

	// Sort angles by radians
	angles.sort((a, b) => a.radians - b.radians);

	return {
		type: 'equation',
		angles,
		arcs: [],
		noSolution: false,
		allReals: false
	};
}

/**
 * Solve cos(x) < k, sin(x) > k, etc.
 */
function solveInequality(func: TrigFunction, operator: TrigOperator, k: number): TrigSolution {
	const arcs: TrigArc[] = [];
	const includeEndpoints = operator === '<=' || operator === '>=';

	if (func === 'cos') {
		const baseAngle = Math.acos(Math.min(1, Math.max(-1, k)));

		if (operator === '>' || operator === '>=') {
			// cos(x) > k: x ∈ (-arccos(k), arccos(k))
			// In [0, 2π): (0, arccos(k)) ∪ (2π - arccos(k), 2π)
			if (k < 1) {
				arcs.push({
					startAngle: normalizeAngle(-baseAngle),
					endAngle: baseAngle,
					includeStart: includeEndpoints,
					includeEnd: includeEndpoints
				});
			}
		} else {
			// cos(x) < k: x ∈ (arccos(k), 2π - arccos(k))
			if (k > -1) {
				arcs.push({
					startAngle: baseAngle,
					endAngle: normalizeAngle(-baseAngle),
					includeStart: includeEndpoints,
					includeEnd: includeEndpoints
				});
			}
		}
	} else if (func === 'sin') {
		const baseAngle = Math.asin(Math.min(1, Math.max(-1, k)));

		if (operator === '>' || operator === '>=') {
			// sin(x) > k: x ∈ (arcsin(k), π - arcsin(k))
			if (k < 1) {
				arcs.push({
					startAngle: normalizeAngle(baseAngle),
					endAngle: normalizeAngle(Math.PI - baseAngle),
					includeStart: includeEndpoints,
					includeEnd: includeEndpoints
				});
			}
		} else {
			// sin(x) < k: x ∈ (π - arcsin(k), 2π + arcsin(k))
			// In [0, 2π): (π - arcsin(k), 2π) ∪ (0, arcsin(k)) if k > 0
			if (k > -1) {
				arcs.push({
					startAngle: normalizeAngle(Math.PI - baseAngle),
					endAngle: normalizeAngle(baseAngle + 2 * Math.PI),
					includeStart: includeEndpoints,
					includeEnd: includeEndpoints
				});
			}
		}
	} else if (func === 'tan') {
		const baseAngle = Math.atan(k);

		if (operator === '>' || operator === '>=') {
			// tan(x) > k: x ∈ (arctan(k), π/2) ∪ (arctan(k) + π, 3π/2)
			arcs.push({
				startAngle: normalizeAngle(baseAngle),
				endAngle: Math.PI / 2,
				includeStart: includeEndpoints,
				includeEnd: false // Asymptote
			});
			arcs.push({
				startAngle: normalizeAngle(baseAngle + Math.PI),
				endAngle: (3 * Math.PI) / 2,
				includeStart: includeEndpoints,
				includeEnd: false // Asymptote
			});
		} else {
			// tan(x) < k: x ∈ (-π/2, arctan(k)) ∪ (π/2, arctan(k) + π)
			arcs.push({
				startAngle: normalizeAngle(-Math.PI / 2),
				endAngle: normalizeAngle(baseAngle),
				includeStart: false, // Asymptote
				includeEnd: includeEndpoints
			});
			arcs.push({
				startAngle: Math.PI / 2,
				endAngle: normalizeAngle(baseAngle + Math.PI),
				includeStart: false, // Asymptote
				includeEnd: includeEndpoints
			});
		}
	}

	return {
		type: 'inequation',
		angles: [],
		arcs,
		noSolution: arcs.length === 0,
		allReals: false
	};
}

/**
 * Create a TrigAngle from a radian value, trying to match remarkable angles
 */
function createAngleFromRadians(radians: number): TrigAngle {
	const normalized = normalizeAngle(radians);

	// Try to match a remarkable angle
	for (const [_key, value] of Object.entries(REMARKABLE_ANGLES)) {
		if (Math.abs(normalized - value.radians) < 1e-10) {
			return {
				expression: value.latex
					.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
					.replace(/\\pi/g, 'π'),
				radians: normalized,
				latex: value.latex
			};
		}
	}

	// No match found, return numeric representation
	const degrees = (normalized * 180) / Math.PI;
	return {
		expression: `${degrees.toFixed(2)}°`,
		radians: normalized,
		latex: `${degrees.toFixed(2)}^\\circ`
	};
}

// ============================================================================
// CONTENT PARSING
// ============================================================================

/**
 * Parse the content of a trig circle block (without the ``` markers)
 *
 * @param content - Either a string (will be split by newlines) or an array of lines
 */
export function parseTrigCircleContent(content: string | string[]): TrigCircleParseResult {
	const errors: TrigCircleParseError[] = [];
	const warnings: TrigCircleParseWarning[] = [];

	// Normalize input to array of lines
	const lines = typeof content === 'string' ? content.split('\n') : content;

	// Check for empty content
	if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === '')) {
		// Empty block - use defaults
		const config = { ...DEFAULT_TRIG_CIRCLE_CONFIG };
		const angles = getPresetAngles(config.preset);

		return {
			node: {
				type: 'trig-circle',
				config,
				angles
			},
			errors: [],
			warnings: []
		};
	}

	// Parse configuration
	const config: TrigCircleConfig = { ...DEFAULT_TRIG_CIRCLE_CONFIG };
	let equation: TrigEquation | undefined;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		const lineNum = i + 1;

		// Skip empty lines and comments
		if (line === '' || line.startsWith('#')) {
			continue;
		}

		// Parse key: value pairs
		const colonIndex = line.indexOf(':');
		if (colonIndex === -1) {
			warnings.push({
				message: `Invalid line format, expected "key: value"`,
				line: lineNum,
				context: line
			});
			continue;
		}

		const rawKey = line.slice(0, colonIndex).trim();
		const key = rawKey.toLowerCase();
		const value = line.slice(colonIndex + 1).trim();

		switch (key) {
			case 'preset':
				if (VALID_PRESETS.includes(value.toLowerCase() as TrigPreset)) {
					config.preset = value.toLowerCase() as TrigPreset;
				} else {
					errors.push({
						message: `Invalid preset "${value}", expected: ${VALID_PRESETS.join(', ')}`,
						line: lineNum,
						content: line
					});
				}
				break;

			case 'angles':
				config.customAngles = parseAngleList(value);
				if (config.customAngles.length === 0 && value.trim() !== '') {
					warnings.push({
						message: `Could not parse any angles from "${value}"`,
						line: lineNum,
						context: line
					});
				}
				break;

			case 'equation':
				equation = parseEquation(value);
				if (!equation) {
					errors.push({
						message: `Invalid equation format "${value}", expected: cos(x) = 1/2, sin(x) > √2/2, etc.`,
						line: lineNum,
						content: line
					});
				}
				break;

			case 'mode':
				if (VALID_MODES.includes(value.toLowerCase() as TrigDisplayMode)) {
					config.mode = value.toLowerCase() as TrigDisplayMode;
				} else {
					errors.push({
						message: `Invalid mode "${value}", expected: ${VALID_MODES.join(', ')}`,
						line: lineNum,
						content: line
					});
				}
				break;

			case 'display':
				if (VALID_DISPLAY_TYPES.includes(value.toLowerCase() as TrigDisplayType)) {
					config.display = value.toLowerCase() as TrigDisplayType;
				} else {
					errors.push({
						message: `Invalid display "${value}", expected: ${VALID_DISPLAY_TYPES.join(', ')}`,
						line: lineNum,
						content: line
					});
				}
				break;

			case 'projections':
				config.showProjections = value.toLowerCase() === 'true';
				break;

			case 'color':
				config.color = value;
				break;

			case 'grid':
				config.showGrid = value.toLowerCase() === 'true';
				break;

			case 'axes':
				config.showAxes = value.toLowerCase() !== 'false';
				break;

			case 'labels':
				config.showLabels = value.toLowerCase() !== 'false';
				break;

			case 'values':
			case 'axisvalues':
				config.showAxisValues = value.toLowerCase() !== 'false';
				break;

			default:
				warnings.push({
					message: `Unknown configuration key "${rawKey}"`,
					line: lineNum,
					context: line
				});
		}
	}

	// If we have errors, return early
	if (errors.length > 0) {
		return { node: null, errors, warnings };
	}

	// Validate custom preset requires angles
	if (config.preset === 'custom' && config.customAngles.length === 0 && !equation) {
		errors.push({
			message: 'Preset "custom" requires at least one angle in "angles:" or an "equation:"',
			content: 'preset: custom'
		});
		return { node: null, errors, warnings };
	}

	// Store equation in config
	config.equation = equation;

	// Combine preset angles with custom angles
	const presetAngles = getPresetAngles(config.preset);
	const allAngles = [...presetAngles, ...config.customAngles];

	// Remove duplicates (by radians, with tolerance)
	const uniqueAngles: TrigAngle[] = [];
	for (const angle of allAngles) {
		const exists = uniqueAngles.some((a) => Math.abs(a.radians - angle.radians) < 1e-10);
		if (!exists) {
			uniqueAngles.push(angle);
		}
	}

	// Sort by radians
	uniqueAngles.sort((a, b) => a.radians - b.radians);

	// Solve equation if present
	let solution: TrigSolution | undefined;
	if (equation) {
		solution = solveEquation(equation);
	}

	const node: TrigCircleNode = {
		type: 'trig-circle',
		config,
		angles: uniqueAngles,
		solution
	};

	return { node, errors: [], warnings };
}

// ============================================================================
// BLOCK PARSING
// ============================================================================

/**
 * Parse a trig circle block from lines array with start/end indices
 */
export function parseTrigCircle(
	lines: string[],
	startIndex: number,
	endIndex: number
): TrigCircleParseResult {
	// Extract content lines (skip ``` markers)
	const contentLines = lines.slice(startIndex + 1, endIndex);

	return parseTrigCircleContent(contentLines);
}
