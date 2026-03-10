/**
 * Number Line Parser - Parse Number Line Blocks
 * ===============================================
 *
 * Parses markdown number line blocks (```line) into NumberLineNode AST.
 *
 * All numeric values use custom mathAST syntax (not LaTeX):
 * - "1/3" (not \frac{1}{3}), "sqrt(2)" (not \sqrt{2}), "\pi", "2.5", "-3"
 *
 * Syntax:
 * ```line
 * start: -3
 * end: 5
 * step: 0.5
 * major: 2
 * labels: -2, 0, 1/3, 3, 5
 * hidden: 1/3, 3
 * points: A=sqrt(2) red, B=-1 blue
 * segments: [-1, 3] green, ]3, 5[ orange
 * arrows: true
 * scale: linear
 * ```
 *
 * @module ubumark/parser/number-line-parser
 */

import type {
	NumberLineNode,
	NumberLineConfig,
	NumberLineValue,
	NumberLinePoint,
	NumberLineSegment,
	NumberLineScale,
	NumberLineParseError,
	NumberLineParseWarning,
	NumberLineParseResult,
	NumberLineBlockRange
} from '../types/number-line';
import { parseCustom } from '$lib/mathAST/parser/custom';
import { evaluateNodeToApproximatedNumber } from '$lib/mathAST/eval/evaluate';

// ============================================================================
// CONSTANTS
// ============================================================================

const LINE_BLOCK_START_REGEX = /^```line\s*$/;
const BLOCK_END_REGEX = /^```\s*$/;
const VALID_SCALES: NumberLineScale[] = ['linear', 'log'];

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

/**
 * Check if a line is the start of a number line block
 */
export function isNumberLineBlockStart(line: string): boolean {
	return LINE_BLOCK_START_REGEX.test(line);
}

/**
 * Find all number line blocks in a list of lines
 */
export function findNumberLineBlocks(lines: string[]): NumberLineBlockRange[] {
	const blocks: NumberLineBlockRange[] = [];
	let i = 0;

	while (i < lines.length) {
		if (isNumberLineBlockStart(lines[i])) {
			const startIndex = i;
			i++;

			while (i < lines.length && !BLOCK_END_REGEX.test(lines[i])) {
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
// VALUE PARSING
// ============================================================================

/**
 * Parse a custom mathAST expression into a NumberLineValue
 */
function resolveExpression(
	expr: string,
	errors: NumberLineParseError[],
	lineNum?: number,
	lineContent?: string
): NumberLineValue | null {
	const trimmed = expr.trim();
	if (!trimmed) return null;

	try {
		const ast = parseCustom(trimmed);
		return { expression: trimmed, ast };
	} catch {
		errors.push({
			message: `Invalid expression "${trimmed}"`,
			line: lineNum,
			content: lineContent
		});
		return null;
	}
}

/**
 * Parse a comma-separated list of expressions
 */
function parseValueList(
	list: string,
	errors: NumberLineParseError[],
	lineNum?: number,
	lineContent?: string
): NumberLineValue[] {
	if (!list.trim()) return [];

	const parts = list.split(',').map((s) => s.trim());
	const values: NumberLineValue[] = [];

	for (const part of parts) {
		if (!part) continue;
		const val = resolveExpression(part, errors, lineNum, lineContent);
		if (val) values.push(val);
	}

	return values;
}

/**
 * Get the numeric approximation of a NumberLineValue
 */
function numericValue(val: NumberLineValue): number {
	return evaluateNodeToApproximatedNumber(val.ast);
}

// ============================================================================
// POINT PARSING
// ============================================================================

/**
 * Parse points: "A=sqrt(2) red, B=-1 blue, C=3"
 */
function parsePoints(
	value: string,
	errors: NumberLineParseError[],
	lineNum?: number,
	lineContent?: string
): NumberLinePoint[] {
	if (!value.trim()) return [];

	const points: NumberLinePoint[] = [];
	const parts = value.split(',').map((s) => s.trim());

	for (const part of parts) {
		if (!part) continue;

		// Pattern: LABEL=EXPRESSION [COLOR]
		const match = part.match(/^([A-Za-z]\w*)=(.+?)(?:\s+([\w#]+))?$/);
		if (!match) {
			errors.push({
				message: `Invalid point format "${part}", expected "Label=expression [color]"`,
				line: lineNum,
				content: lineContent
			});
			continue;
		}

		const label = match[1];
		const exprStr = match[2].trim();
		const color = match[3];

		const val = resolveExpression(exprStr, errors, lineNum, lineContent);
		if (!val) continue;

		points.push({ label, value: val, ...(color && { color }) });
	}

	return points;
}

// ============================================================================
// SEGMENT PARSING
// ============================================================================

/**
 * Parse segments: "[-1, 3] green, ]3, 5[ orange"
 *
 * French notation:
 * - [ or ] at start: [ = closed, ] = open
 * - [ or ] at end: ] = closed, [ = open
 */
function parseSegments(
	value: string,
	errors: NumberLineParseError[],
	lineNum?: number,
	lineContent?: string
): NumberLineSegment[] {
	if (!value.trim()) return [];

	const segments: NumberLineSegment[] = [];

	// Split on comma-space followed by [ or ] (segment delimiter)
	// We need to be careful: commas inside segments separate start/end values
	// Pattern: bracket expr, expr bracket [color]
	const segmentRegex = /([[\]])([^,]+),\s*([^[\]]+)([[\]])(?:\s+([\w#]+))?/g;
	let match: RegExpExecArray | null;

	while ((match = segmentRegex.exec(value)) !== null) {
		const startBracket = match[1];
		const startExpr = match[2].trim();
		const endExpr = match[3].trim();
		const endBracket = match[4];
		const color = match[5];

		// French notation: [ at start = closed, ] at start = open
		const startOpen = startBracket === ']';
		// French notation: ] at end = closed, [ at end = open
		const endOpen = endBracket === '[';

		const startVal = resolveExpression(startExpr, errors, lineNum, lineContent);
		const endVal = resolveExpression(endExpr, errors, lineNum, lineContent);

		if (!startVal || !endVal) continue;

		segments.push({
			start: startVal,
			end: endVal,
			startOpen,
			endOpen,
			...(color && { color })
		});
	}

	if (segments.length === 0 && value.trim()) {
		errors.push({
			message: `Could not parse any segments from "${value}", expected format: [-1, 3] or ]0, 5[ [color]`,
			line: lineNum,
			content: lineContent
		});
	}

	return segments;
}

// ============================================================================
// CONTENT PARSING
// ============================================================================

/**
 * Parse the content of a number line block (without ``` markers)
 */
export function parseNumberLineContent(content: string | string[]): NumberLineParseResult {
	const errors: NumberLineParseError[] = [];
	const warnings: NumberLineParseWarning[] = [];

	const lines = typeof content === 'string' ? content.split('\n') : content;

	// Collect raw values from key-value pairs
	let startExpr: string | undefined;
	let endExpr: string | undefined;
	let stepExpr: string | undefined;
	let major = 1;
	let labelsExpr: string | undefined;
	let hiddenExpr: string | undefined;
	let pointsStr: string | undefined;
	let segmentsStr: string | undefined;
	let arrows = false;
	let scale: NumberLineScale = 'linear';

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		const lineNum = i + 1;

		if (line === '' || line.startsWith('#')) continue;

		const colonIndex = line.indexOf(':');
		if (colonIndex === -1) {
			warnings.push({
				message: 'Invalid line format, expected "key: value"',
				line: lineNum,
				context: line
			});
			continue;
		}

		const rawKey = line.slice(0, colonIndex).trim();
		const key = rawKey.toLowerCase();
		const value = line.slice(colonIndex + 1).trim();

		switch (key) {
			case 'start':
				startExpr = value;
				break;
			case 'end':
				endExpr = value;
				break;
			case 'step':
				stepExpr = value;
				break;
			case 'major':
				major = parseInt(value, 10);
				if (isNaN(major) || major < 1) {
					errors.push({
						message: `Invalid major value "${value}", expected positive integer`,
						line: lineNum,
						content: line
					});
					major = 1;
				}
				break;
			case 'labels':
				labelsExpr = value;
				break;
			case 'hidden':
				hiddenExpr = value;
				break;
			case 'points':
				pointsStr = value;
				break;
			case 'segments':
				segmentsStr = value;
				break;
			case 'arrows':
				arrows = value.toLowerCase() === 'true';
				break;
			case 'scale':
				if (VALID_SCALES.includes(value.toLowerCase() as NumberLineScale)) {
					scale = value.toLowerCase() as NumberLineScale;
				} else {
					errors.push({
						message: `Invalid scale "${value}", expected: ${VALID_SCALES.join(', ')}`,
						line: lineNum,
						content: line
					});
				}
				break;
			default:
				warnings.push({
					message: `Unknown configuration key "${rawKey}"`,
					line: lineNum,
					context: line
				});
		}
	}

	// Required fields validation
	if (!startExpr) {
		errors.push({ message: 'Missing required field "start"' });
	}
	if (!endExpr) {
		errors.push({ message: 'Missing required field "end"' });
	}
	if (!stepExpr) {
		errors.push({ message: 'Missing required field "step"' });
	}

	if (errors.length > 0) {
		return { node: null, errors, warnings };
	}

	// Parse expressions
	const startVal = resolveExpression(startExpr!, errors, undefined, `start: ${startExpr}`);
	const endVal = resolveExpression(endExpr!, errors, undefined, `end: ${endExpr}`);
	const stepVal = resolveExpression(stepExpr!, errors, undefined, `step: ${stepExpr}`);

	if (!startVal || !endVal || !stepVal) {
		return { node: null, errors, warnings };
	}

	// Numeric validation
	const startNum = numericValue(startVal);
	const endNum = numericValue(endVal);
	const stepNum = numericValue(stepVal);

	if (startNum >= endNum) {
		errors.push({
			message: `start (${startNum}) must be less than end (${endNum})`
		});
	}

	if (stepNum <= 0) {
		errors.push({ message: `step must be positive, got ${stepNum}` });
	}

	if (stepNum > endNum - startNum) {
		errors.push({
			message: `step (${stepNum}) must be <= range (${endNum - startNum})`
		});
	}

	const MAX_GRADUATIONS = 500;
	if (stepNum > 0) {
		const estimatedTicks = Math.ceil((endNum - startNum) / stepNum) + 1;
		if (estimatedTicks > MAX_GRADUATIONS) {
			errors.push({
				message: `Too many graduations (${estimatedTicks}), max is ${MAX_GRADUATIONS}. Increase the step value.`
			});
		}
	}

	if (scale === 'log') {
		if (startNum <= 0) {
			errors.push({ message: `Log scale requires start > 0, got ${startNum}` });
		}
		if (endNum <= 0) {
			errors.push({ message: `Log scale requires end > 0, got ${endNum}` });
		}
	}

	if (errors.length > 0) {
		return { node: null, errors, warnings };
	}

	// Parse optional lists
	const labels = labelsExpr ? parseValueList(labelsExpr, errors) : [];
	const hidden = hiddenExpr ? parseValueList(hiddenExpr, errors) : [];
	const points = pointsStr ? parsePoints(pointsStr, errors) : [];
	const segments = segmentsStr ? parseSegments(segmentsStr, errors) : [];

	if (errors.length > 0) {
		return { node: null, errors, warnings };
	}

	// Validate segments
	for (const segment of segments) {
		const sNum = numericValue(segment.start);
		const eNum = numericValue(segment.end);
		if (sNum >= eNum) {
			errors.push({
				message: `Segment start (${sNum}) must be less than end (${eNum})`
			});
		}
		if (sNum < startNum - 1e-10 || eNum > endNum + 1e-10) {
			warnings.push({
				message: `Segment [${sNum}, ${eNum}] extends outside bounds [${startNum}, ${endNum}]`
			});
		}
	}

	// Validate points are within bounds
	for (const point of points) {
		const pNum = numericValue(point.value);
		if (pNum < startNum - 1e-10 || pNum > endNum + 1e-10) {
			errors.push({
				message: `Point "${point.label}" at ${pNum} is outside bounds [${startNum}, ${endNum}]`
			});
		}
	}

	if (errors.length > 0) {
		return { node: null, errors, warnings };
	}

	const config: NumberLineConfig = {
		start: startVal,
		end: endVal,
		step: stepVal,
		major,
		labels,
		hidden,
		arrows,
		scale
	};

	const node: NumberLineNode = {
		type: 'number-line',
		config,
		points,
		segments
	};

	return { node, errors: [], warnings };
}

// ============================================================================
// BLOCK PARSING
// ============================================================================

/**
 * Parse a number line block from lines array with start/end indices
 */
export function parseNumberLine(
	lines: string[],
	startIndex: number,
	endIndex: number
): NumberLineParseResult {
	const contentLines = lines.slice(startIndex + 1, endIndex);
	return parseNumberLineContent(contentLines);
}
