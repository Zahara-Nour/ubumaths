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
 * Droite à placer (une question) : `placer: 7` — la graduation où l'élève pose
 * son point ; plusieurs points nommés : `placer: A=3 ; B=7` (6 au plus) ;
 * `case: N` est posée par le générateur.
 *
 * @module ubumark/parser/number-line-parser
 */

import type {
	NumberLineNode,
	NumberLineConfig,
	NumberLineValue,
	NumberLinePoint,
	NumberLineTarget,
	NumberLineSegment,
	NumberLineScale,
	NumberLineParseError,
	NumberLineParseWarning,
	NumberLineParseResult,
	NumberLineBlockRange
} from '../types/number-line';
import { parseCustom } from '$lib/mathAST/parser/custom';
import { evaluateNodeToApproximatedNumber } from '$lib/mathAST/eval/evaluate';
import { specialBlockEnd } from './unclosed-block';

/** Les clés du bloc : une ligne qui commence par l'une d'elles n'est jamais du texte (Q66) */
const BLOCK_KEYS = [
	'start',
	'end',
	'step',
	'major',
	'scale',
	'labels',
	'points',
	'segments',
	'arrows',
	'hidden'
];

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
			// Fermé par un ``` qui ne fait pas lire du texte comme contenu (Q66),
			// sinon jusqu'à la première ligne vide (Q63)
			const { endIndex } = specialBlockEnd(
				lines,
				startIndex,
				(line) => BLOCK_END_REGEX.test(line),
				BLOCK_KEYS
			);
			blocks.push({ startIndex, endIndex });
			i = endIndex;
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
// DROITE À PLACER
// ============================================================================

/** `2.5` → `2,5`, pour les messages à l'auteur */
function frenchNumber(value: number): string {
	return String(Math.round(value * 1e9) / 1e9).replace('.', ',');
}

/** Points d'une droite à placer, au plus */
const MAX_TARGETS = 6;

/** `A=3` : un nom, une valeur */
const NAMED_TARGET = /^([^=\s]+)\s*=\s*(.+)$/;

/**
 * Les points de `placer:` (`7`, ou `A=3 ; B=7`) ; null si l'écriture est refusée
 * (messages ajoutés à `errors`)
 */
function parseTargets(expr: string, errors: NumberLineParseError[]): NumberLineTarget[] | null {
	const parts = expr.split(';').map((part) => part.trim());
	if (parts.some((part) => part === '')) {
		errors.push({ message: `placer : ${expr} — point vide (un « ; » en trop ?)` });
		return null;
	}
	if (parts.length > MAX_TARGETS) {
		errors.push({ message: `placer : ${MAX_TARGETS} points au plus sur une droite` });
		return null;
	}
	const targets: NumberLineTarget[] = [];
	for (const part of parts) {
		const named = NAMED_TARGET.exec(part);
		const name = named ? named[1] : '';
		if (named && !/^[A-Z]$/.test(name)) {
			errors.push({ message: `placer : nom « ${name} » — une lettre majuscule (A, B, C…)` });
			return null;
		}
		if (!named && parts.length > 1) {
			errors.push({ message: `placer : ${part} — chaque point porte un nom (A=3 ; B=7)` });
			return null;
		}
		if (targets.some((t) => t.name === name && name !== '')) {
			errors.push({ message: `placer : le point ${name} est nommé deux fois` });
			return null;
		}
		const value = resolveExpression(named ? named[2] : part, errors);
		if (!value) return null;
		targets.push({ name, value });
	}
	return targets;
}

/** Ce qui rend un point de `placer:` impossible : hors de la droite, entre deux graduations… */
function placerErrors(
	target: NumberLineTarget,
	startNum: number,
	endNum: number,
	stepNum: number,
	scale: NumberLineScale,
	hasPoints: boolean
): NumberLineParseError[] {
	const placer = target.value;
	const shown = `placer : ${target.name === '' ? '' : `${target.name}=`}${placer.expression}`;
	if (scale === 'log') return [{ message: `${shown} — impossible sur une échelle log` }];
	if (hasPoints) {
		return [
			{
				message: `${shown} — sans points: (sur la droite, seuls les points de l’élève)`
			}
		];
	}
	let value: number;
	try {
		value = numericValue(placer);
	} catch {
		value = Number.NaN;
	}
	if (!Number.isFinite(value)) return [{ message: `${shown} — valeur illisible` }];
	const tolerance = 1e-9 * Math.max(1, Math.abs(stepNum));
	if (value < startNum - tolerance || value > endNum + tolerance) {
		return [
			{
				message: `${shown} est hors de la droite (de ${frenchNumber(startNum)} à ${frenchNumber(endNum)})`
			}
		];
	}
	const steps = (value - startNum) / stepNum;
	if (Math.abs(steps - Math.round(steps)) * stepNum > tolerance) {
		return [
			{
				message: `${shown} n’est pas sur une graduation (de ${frenchNumber(stepNum)} en ${frenchNumber(stepNum)} depuis ${frenchNumber(startNum)})`
			}
		];
	}
	return [];
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
	let placerExpr: string | undefined;
	let caseIndex: number | undefined;

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
			case 'placer':
				placerExpr = value;
				break;
			case 'case':
				if (!/^\d+$/.test(value)) {
					errors.push({
						message: `case « ${value} » : numéro de case entier`,
						line: lineNum,
						content: line
					});
				} else {
					caseIndex = Number(value);
				}
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

	// Droite à placer : chaque point sur une graduation de la droite, seuls points dessinés
	const placer = placerExpr !== undefined ? parseTargets(placerExpr, errors) : null;
	for (const target of placer ?? []) {
		const targetErrors = placerErrors(target, startNum, endNum, stepNum, scale, points.length > 0);
		errors.push(...targetErrors);
		if (targetErrors.length > 0) break;
	}
	if (caseIndex !== undefined && placerExpr === undefined) {
		errors.push({ message: 'case: sans objet sans placer:' });
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
		segments,
		...(placer && { placer }),
		...(caseIndex !== undefined && { caseIndex })
	};

	return { node, errors: [], warnings };
}

// ============================================================================
// DROITES À PLACER D'UN ÉNONCÉ
// ============================================================================

/** Ligne vue sans retrait ni marque de citation */
const unquoted = (line: string) => line.replace(/^[\s>]*/, '');

/**
 * Les droites à placer (`placer:`) d'un énoncé, délimitées comme le parseur :
 * corps sans clôtures, fermeture, et `nested` pour un bloc en retrait ou cité
 * (l'élève ne pourrait pas y répondre : sa case n'est pas créée)
 */
export function findLinesToPlace(markdown: string): {
	startIndex: number;
	body: string[];
	closed: boolean;
	nested: boolean;
}[] {
	const lines = markdown.split('\n');
	const plain = lines.map(unquoted);
	const found: { startIndex: number; body: string[]; closed: boolean; nested: boolean }[] = [];
	let i = 0;
	while (i < plain.length) {
		if (isNumberLineBlockStart(plain[i])) {
			const { endIndex, closed } = specialBlockEnd(
				plain,
				i,
				(line) => BLOCK_END_REGEX.test(line),
				BLOCK_KEYS
			);
			const body = plain.slice(i + 1, closed ? endIndex : endIndex + 1);
			if (body.some((line) => /^placer\s*:/i.test(line))) {
				found.push({ startIndex: i, body, closed, nested: lines[i] !== plain[i] });
			}
			i = endIndex;
		}
		i++;
	}
	return found;
}

/** L'énoncé a-t-il une droite à placer ? */
export function hasLineToPlace(markdown: string): boolean {
	return findLinesToPlace(markdown).length > 0;
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
	const result = parseNumberLineContent(contentLines);
	// Conserver le texte d'origine : c'est lui, et non la structure, que
	// l'éditeur riche sait réafficher.
	if (result.node) result.node.source = contentLines.join('\n');
	return result;
}
