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
 * Droite à représenter (une question) : `representer: [2, +inf[` ou `[-1, 3[` —
 * l'intervalle que l'élève dessine (bornes sur des graduations) ; masqué dans
 * l'énoncé envoyé : `representer: ?` (demi-droite), `representer: ? ; ?` (borné).
 *
 * @module ubumark/parser/number-line-parser
 */

import { unnestedLine } from './nested-line';
import type {
	NumberLineNode,
	NumberLineConfig,
	NumberLineValue,
	NumberLinePoint,
	NumberLineTarget,
	NumberLineRepresenter,
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
import { isMaskedValue } from '../utils/masked-value';

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

/** `-inf`, `+inf`, `inf`, `-∞`, `+\\infty`… : borne infinie d'un segment */
const INFINITE_BOUND_REGEX = /^([+-]?)\s*(?:inf|∞|\\infty)$/;

/**
 * Signe d'une borne infinie (`inf` sans signe = `+`), `null` pour une borne finie
 */
function infiniteSign(expr: string): '+' | '-' | null {
	const match = INFINITE_BOUND_REGEX.exec(expr.trim());
	if (!match) return null;
	return match[1] === '-' ? '-' : '+';
}

/**
 * Parse segments: "[-1, 3] green, ]3, 5[ orange", "[2, +inf[" (demi-droite)
 *
 * French notation:
 * - [ or ] at start: [ = closed, ] = open
 * - [ or ] at end: ] = closed, [ = open
 */
function parseSegments(
	value: string,
	window: { start: NumberLineValue; end: NumberLineValue },
	errors: NumberLineParseError[],
	lineNum?: number,
	lineContent?: string
): NumberLineSegment[] {
	if (!value.trim()) return [];

	const segments: NumberLineSegment[] = [];
	// Segments lus mais refusés (infini mal écrit) : leur erreur précise suffit
	let rejected = 0;

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

		const startInf = infiniteSign(startExpr);
		const endInf = infiniteSign(endExpr);
		const written = `${startBracket}${startExpr}, ${endExpr}${endBracket}`;

		// Demi-droite : -inf à gauche, +inf (ou inf) à droite, jamais l'inverse
		if (startInf === '+' || endInf === '-') {
			errors.push({
				message: `${written} : la borne de gauche doit être plus petite que celle de droite (-inf à gauche, +inf à droite)`,
				line: lineNum,
				content: lineContent
			});
			rejected++;
			continue;
		}
		if ((startInf && !startOpen) || (endInf && !endOpen)) {
			errors.push({
				message: `${written} : l'infini est toujours exclu, le crochet s'ouvre vers lui (]-inf, … ou …, +inf[)`,
				line: lineNum,
				content: lineContent
			});
			rejected++;
			continue;
		}

		const startVal = startInf
			? window.start
			: resolveExpression(startExpr, errors, lineNum, lineContent);
		const endVal = endInf ? window.end : resolveExpression(endExpr, errors, lineNum, lineContent);

		if (!startVal || !endVal) continue;

		segments.push({
			start: startVal,
			end: endVal,
			startOpen,
			endOpen,
			...(startInf && { startInfinite: true }),
			...(endInf && { endInfinite: true }),
			...(color && { color })
		});
	}

	if (segments.length === 0 && rejected === 0 && value.trim()) {
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
 * (messages ajoutés à `errors`). Valeur masquée (`A=?`, énoncé d'une évaluation
 * notée) : `masked`, la valeur de remplacement, même objet pour tous (`masked-value.ts`)
 */
function parseTargets(
	expr: string,
	errors: NumberLineParseError[],
	masked: NumberLineValue
): NumberLineTarget[] | null {
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
		const written = named ? named[2] : part;
		if (isMaskedValue(written)) {
			targets.push({ name, value: masked });
			continue;
		}
		const value = resolveExpression(written, errors);
		if (!value) return null;
		targets.push({ name, value });
	}
	return targets;
}

/**
 * Valeur hors de la droite ou entre deux graduations : le message, sinon null
 * (`shown` : ce que l'auteur a écrit, `placer : 7`, `representer : 2,5`)
 */
function graduationError(
	shown: string,
	value: number,
	startNum: number,
	endNum: number,
	stepNum: number
): NumberLineParseError | null {
	if (!Number.isFinite(value)) return { message: `${shown} — valeur illisible` };
	const tolerance = 1e-9 * Math.max(1, Math.abs(stepNum));
	if (value < startNum - tolerance || value > endNum + tolerance) {
		return {
			message: `${shown} est hors de la droite (de ${frenchNumber(startNum)} à ${frenchNumber(endNum)})`
		};
	}
	const steps = (value - startNum) / stepNum;
	if (Math.abs(steps - Math.round(steps)) * stepNum > tolerance) {
		return {
			message: `${shown} n’est pas sur une graduation (de ${frenchNumber(stepNum)} en ${frenchNumber(stepNum)} depuis ${frenchNumber(startNum)})`
		};
	}
	return null;
}

/** Valeur numérique, NaN si illisible */
function safeNumericValue(value: NumberLineValue): number {
	try {
		return numericValue(value);
	} catch {
		return Number.NaN;
	}
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
	const error = graduationError(shown, safeNumericValue(placer), startNum, endNum, stepNum);
	return error ? [error] : [];
}

// ============================================================================
// DROITE À REPRÉSENTER
// ============================================================================

/** `representer: ?` (demi-droite) et `representer: ? ; ?` (borné) : valeurs masquées */
const MASKED_HALF_LINE = /^\?$/;
const MASKED_BOUNDED = /^\?\s*;\s*\?$/;

/**
 * L'intervalle de `representer:` (`[2, +inf[`, `[-1, 3[`) ; null si refusé
 * (messages ajoutés à `errors`). Bornes finies sur une graduation, un seul
 * intervalle, ni toute la droite, ni avec `placer:` ou `segments:`.
 */
function parseRepresenter(
	expr: string,
	window: { start: NumberLineValue; end: NumberLineValue },
	line: { startNum: number; endNum: number; stepNum: number; scale: NumberLineScale },
	others: { placer: boolean; segments: boolean },
	errors: NumberLineParseError[]
): NumberLineRepresenter | null {
	const written = expr.trim();
	const shown = `representer : ${written}`;
	if (line.scale === 'log') {
		errors.push({ message: `${shown} — impossible sur une échelle log` });
		return null;
	}
	if (others.placer) {
		errors.push({ message: `${shown} — pas avec placer: (un seul geste par droite)` });
		return null;
	}
	if (others.segments) {
		errors.push({ message: `${shown} — sans segments: (ils diraient la réponse)` });
		return null;
	}
	if (MASKED_HALF_LINE.test(written)) return { bounded: false, interval: null };
	if (MASKED_BOUNDED.test(written)) return { bounded: true, interval: null };

	const before = errors.length;
	const intervals = parseSegments(written, window, errors);
	if (errors.length > before) return null;
	if (intervals.length !== 1) {
		errors.push({ message: `${shown} — un seul intervalle (exemple : [2, +inf[)` });
		return null;
	}
	const interval = intervals[0];
	if (interval.color) {
		errors.push({ message: `${shown} — sans couleur (celle de l’élève)` });
		return null;
	}
	if (interval.startInfinite && interval.endInfinite) {
		errors.push({ message: `${shown} — toute la droite, rien à représenter` });
		return null;
	}
	const bounds = [
		...(interval.startInfinite ? [] : [interval.start]),
		...(interval.endInfinite ? [] : [interval.end])
	];
	for (const bound of bounds) {
		const error = graduationError(
			`representer : ${bound.expression}`,
			safeNumericValue(bound),
			line.startNum,
			line.endNum,
			line.stepNum
		);
		if (error) {
			errors.push(error);
			return null;
		}
	}
	const bounded = bounds.length === 2;
	if (bounded && safeNumericValue(interval.start) >= safeNumericValue(interval.end)) {
		errors.push({ message: `${shown} — la borne de gauche doit être plus petite` });
		return null;
	}
	return { bounded, interval };
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
	let representerExpr: string | undefined;
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
			case 'representer':
				representerExpr = value;
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
	const segments = segmentsStr
		? parseSegments(segmentsStr, { start: startVal, end: endVal }, errors)
		: [];

	if (errors.length > 0) {
		return { node: null, errors, warnings };
	}

	// Validate segments
	for (const segment of segments) {
		const sNum = numericValue(segment.start);
		const eNum = numericValue(segment.end);
		// Une borne infinie n'a pas de valeur à comparer : `start`/`end` y valent la fenêtre
		const bothFinite = !segment.startInfinite && !segment.endInfinite;
		if (bothFinite && sNum >= eNum) {
			errors.push({
				message: `Segment start (${sNum}) must be less than end (${eNum})`
			});
		}
		const startOutside = !segment.startInfinite && sNum < startNum - 1e-10;
		const endOutside = !segment.endInfinite && eNum > endNum + 1e-10;
		// Borne finie de l'autre côté de la fenêtre (`[12, +inf[` sur [0 ; 10])
		const finiteOutside =
			(segment.startInfinite && !segment.endInfinite && eNum < startNum - 1e-10) ||
			(segment.endInfinite && !segment.startInfinite && sNum > endNum + 1e-10);
		if (startOutside || endOutside || finiteOutside) {
			warnings.push({
				message: `Segment [${segment.startInfinite ? '-inf' : sNum}, ${segment.endInfinite ? '+inf' : eNum}] extends outside bounds [${startNum}, ${endNum}]`
			});
		}
	}

	// Droite à placer : chaque point sur une graduation de la droite, seuls points dessinés
	const placer = placerExpr !== undefined ? parseTargets(placerExpr, errors, startVal) : null;
	for (const target of placer ?? []) {
		// Valeur masquée : rien à vérifier, le modèle d'origine l'a été au générateur
		if (target.value === startVal) continue;
		const targetErrors = placerErrors(target, startNum, endNum, stepNum, scale, points.length > 0);
		errors.push(...targetErrors);
		if (targetErrors.length > 0) break;
	}
	// Droite à représenter : un intervalle, bornes finies sur une graduation
	const representer =
		representerExpr !== undefined
			? parseRepresenter(
					representerExpr,
					{ start: startVal, end: endVal },
					{ startNum, endNum, stepNum, scale },
					{ placer: placerExpr !== undefined, segments: segments.length > 0 },
					errors
				)
			: null;
	if (caseIndex !== undefined && placerExpr === undefined && representerExpr === undefined) {
		errors.push({ message: 'case: sans objet sans placer: ni representer:' });
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
		...(representer && { representer }),
		...(caseIndex !== undefined && { caseIndex })
	};

	return { node, errors: [], warnings };
}

// ============================================================================
// DROITES À PLACER D'UN ÉNONCÉ
// ============================================================================

/**
 * Les droites à placer (`placer:`) ou à représenter (`representer:`) d'un énoncé,
 * délimitées comme le parseur :
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
	const plain = lines.map(unnestedLine);
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
			if (body.some((line) => /^(?:placer|representer)\s*:/i.test(line))) {
				found.push({ startIndex: i, body, closed, nested: lines[i] !== plain[i] });
			}
			i = endIndex;
		}
		i++;
	}
	return found;
}

/** Le texte d'un bloc ```line est-il une droite à représenter (`representer:`) ? */
export function isLineToRepresent(source: string): boolean {
	return source.split('\n').some((line) => /^\s*representer\s*:/i.test(line));
}

/** L'énoncé a-t-il une droite à placer (ou à représenter) ? */
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
