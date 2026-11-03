/**
 * Variation Table Parser - Parse Variation/Sign Tables
 * =====================================================
 *
 * This module parses markdown variation table blocks with support for:
 * - Sign rows with +/- and special markers (zero, asymptote, forbidden, discontinuity)
 * - Variation rows with position indicators
 * - Open/closed bounds for domain intervals
 * - Complex math expressions
 *
 * Syntax:
 * ```variation
 * variable: x
 * domain: -inf, -1, 0, 1, +inf
 *
 * sign: f'(x)
 *   -inf,-1: +
 *   -1: z
 *   -1,0: -
 *
 * variation: f(x)
 *   -inf: -inf, bottom
 *   -1: 3, top
 * ```
 *
 * @module ubumark/parser/variation-table-parser
 */

import type {
	VariationTableNode,
	DomainPoint,
	SignRow,
	VariationRow,
	SignValue,
	VariationValue,
	VariationPosition,
	VariationMarker,
	VariationTableParseError,
	VariationTableParseResult,
	TableRow,
	LimitValue,
	LimitSide,
	HiddenCell,
	HiddenCellKind
} from '../types/variation-table';
import { specialBlockEnd } from './unclosed-block';
import { unnestedLine } from './nested-line';

/** Les clés du bloc : une ligne qui commence par l'une d'elles n'est jamais du texte (Q66) */
const BLOCK_KEYS = [
	'variable',
	'domain',
	'sign',
	'variation',
	'top',
	'bottom',
	'limit-top',
	'limit-bottom',
	'asymptote',
	'forbidden',
	'case'
];

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Regex to identify variation block start: ```variation
 */
const VARIATION_BLOCK_START_REGEX = /^```variation\s*$/;

/**
 * Regex to identify block end: ```
 */
const BLOCK_END_REGEX = /^```\s*$/;

/**
 * Regex to parse variable line: variable: x
 */
const VARIABLE_REGEX = /^\s*variable\s*:\s*(.+?)\s*$/;

/**
 * Regex to parse domain line with potential bounds
 * Supports: domain: -inf, 0, +inf OR domain: ]-inf, 0[, ]0, +inf[
 */
const DOMAIN_REGEX = /^\s*domain\s*:\s*(.+?)\s*$/;

/**
 * Regex to parse sign row header: sign: f'(x)
 */
const SIGN_HEADER_REGEX = /^\s*sign\s*:\s*(.+?)\s*$/;

/**
 * Regex to parse variation row header: variation: f(x)
 */
const VARIATION_HEADER_REGEX = /^\s*variation\s*:\s*(.+?)\s*$/;

/**
 * Regex to parse row entry: key: value
 * The key can contain commas for intervals, value can have multiple parts
 */
const ROW_ENTRY_REGEX = /^\s{2,}(.+?)\s*:\s*(.+?)\s*$/;

/**
 * Symbol mappings for sign markers
 */
const SIGN_SYMBOL_MAP: Record<string, SignValue> = {
	'+': { type: 'sign', value: '+' },
	'-': { type: 'sign', value: '-' },
	z: { type: 'marker', marker: 'zero' },
	'0': { type: 'marker', marker: 'zero' },
	'||': { type: 'marker', marker: 'asymptote' },
	'|h|': { type: 'marker', marker: 'forbidden' },
	d: { type: 'marker', marker: 'discontinuity' }
};

/** `case: N` : numéro de la case de la question, posé par le générateur de questions */
const CASE_LINE_REGEX = /^\s*case\s*:\s*(.*?)\s*$/;
const CASE_INDEX_REGEX = /^\d{1,3}$/;

/** Valeur de x d'un tableau d'évaluation : jeton de rang `??1`, `??2`… */
const MASK_TOKEN_REGEX = /^\?\d{1,3}$/;
/** Le même jeton écrit en clé d'une ligne (`??1: 0, bottom`) */
const MASKED_KEY_REGEX = /^\?\?\d{1,3}$/;

/** Les infinis ne se cachent pas : ce ne sont pas des valeurs à calculer */
const INFINITY_EXPRESSIONS = ['-inf', '+inf', 'inf', '-∞', '+∞', '∞'];

/**
 * Déclare un refus lié à un `?` : erreur située, en français. Le bloc entier est
 * alors invalide (nœud nul) plutôt que rendu avec une case en moins.
 */
type Refuse = (line: number, content: string, message: string) => void;

/** Case cachée lue dans une ligne `sign:`, validée une fois le domaine connu */
interface PendingCell {
	key: string;
	kind: HiddenCellKind;
	answer: string;
	line: number;
	content: string;
}

/**
 * Valid positions for variation values
 */
const VALID_POSITIONS: VariationPosition[] = [
	'top',
	'bottom',
	'center',
	'limit-top',
	'limit-bottom'
];

/**
 * Valid sides for single-limit asymptotes
 */
const VALID_SIDES: LimitSide[] = ['left', 'right'];

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

/**
 * Check if a line starts a variation block
 *
 * @param line - Line to check
 * @returns true if line is ```variation
 *
 * @example
 * ```typescript
 * isVariationBlockStart('```variation');  // true
 * isVariationBlockStart('```typescript'); // false
 * isVariationBlockStart('```');           // false
 * ```
 */
export function isVariationBlockStart(line: string): boolean {
	return VARIATION_BLOCK_START_REGEX.test(line);
}

/**
 * Check if a line ends a code/variation block
 *
 * @param line - Line to check
 * @returns true if line is closing ```
 */
export function isBlockEnd(line: string): boolean {
	return BLOCK_END_REGEX.test(line);
}

// ============================================================================
// DOMAIN PARSING
// ============================================================================

/**
 * Parse a single domain point expression
 *
 * Handles open/closed bounds notation:
 * - ]-inf means open at -inf
 * - 0[ means open at 0
 * - [0 or 0] means closed (default)
 *
 * @param expr - Expression to parse (may include [ ] bounds)
 * @returns DomainPoint with expression and open status
 */
function parseDomainPoint(expr: string, refuse: Refuse, line: number): DomainPoint {
	let expression = expr.trim();
	let open = false;

	// Check for opening bracket/parenthesis at start
	if (expression.startsWith(']') || expression.startsWith('(')) {
		open = true;
		expression = expression.slice(1).trim();
	} else if (expression.startsWith('[')) {
		expression = expression.slice(1).trim();
	}

	// Check for closing bracket/parenthesis at end
	if (expression.endsWith('[') || expression.endsWith(')')) {
		open = true;
		expression = expression.slice(0, -1).trim();
	} else if (expression.endsWith(']')) {
		expression = expression.slice(0, -1).trim();
	}

	const point: DomainPoint = open ? { expression, open: true } : { expression };

	// `?` devant la valeur : case à compléter
	if (expression.startsWith('?')) {
		const rest = expression.slice(1).trim();
		if (rest.startsWith('?')) {
			// Jeton de masquage `??1` : l'expression est inconnue
			if (MASK_TOKEN_REGEX.test(rest)) {
				point.expression = `?${rest}`;
				point.hidden = true;
			} else {
				refuse(line, expr, `jeton de masquage « ?${rest} » invalide : attendu ??1, ??2…`);
			}
		} else if (rest === '') {
			refuse(line, expr, 'le ? doit précéder une valeur de x (par exemple ?-3)');
		} else if (INFINITY_EXPRESSIONS.includes(rest)) {
			refuse(
				line,
				expr,
				`on ne peut pas cacher ${rest} : un infini n'est pas une valeur à calculer`
			);
		} else {
			point.expression = rest;
			point.hidden = true;
		}
	}

	return point;
}

/**
 * Parse the domain line content
 *
 * Supports two formats:
 * 1. Simple: -inf, -1, 0, 1, +inf
 * 2. With bounds: ]-inf, 0[, ]0, +inf[
 *
 * @param content - Domain content after "domain:"
 * @returns Array of DomainPoint
 */
function parseDomainContent(content: string, refuse: Refuse, line: number): DomainPoint[] {
	const points: DomainPoint[] = [];

	// Try to detect bound-style notation (contains [ or ])
	if (content.includes('[') || content.includes(']')) {
		// Split by comma but be careful with bounds notation
		// The pattern ], [ indicates a boundary between intervals
		const segments = content.split(/,\s*(?=[[\]])/);

		for (const segment of segments) {
			const trimmed = segment.trim();
			if (!trimmed) continue;

			// Each segment may contain bounds at start/end
			// e.g., ]-inf or 0[ or ]0
			const point = parseDomainPoint(trimmed, refuse, line);
			if (point.expression) {
				points.push(point);
			}
		}
	} else {
		// Simple comma-separated format
		const parts = content.split(',');
		for (const part of parts) {
			const trimmed = part.trim();
			if (trimmed) {
				points.push(parseDomainPoint(trimmed, refuse, line));
			}
		}
	}

	return points;
}

// ============================================================================
// SIGN VALUE PARSING
// ============================================================================

/**
 * Parse a sign value from string
 *
 * @param value - Value string ("+", "-", "z", "||", "|h|", "d")
 * @returns SignValue or null if not recognized
 */
function parseSignValue(value: string): SignValue | null {
	const trimmed = value.trim();
	return SIGN_SYMBOL_MAP[trimmed] || null;
}

/**
 * Parse a sign row entry (key: value)
 *
 * @param key - The key (point or interval like "-inf,-1")
 * @param value - The value ("+", "-", "z", etc.)
 * @returns Tuple [normalizedKey, SignValue] or null if invalid
 */
function parseSignEntry(key: string, value: string): [string, SignValue] | null {
	const signValue = parseSignValue(value);
	if (!signValue) return null;

	// Normalize the key (remove extra spaces)
	const normalizedKey = key
		.split(',')
		.map((p) => p.trim())
		.join(',');

	return [normalizedKey, signValue];
}

// ============================================================================
// VARIATION VALUE PARSING
// ============================================================================

/**
 * Parse position string to VariationPosition
 *
 * @param pos - Position string
 * @returns VariationPosition or null if invalid
 */
function parsePosition(pos: string): VariationPosition | null {
	const trimmed = pos.trim().toLowerCase();
	if (VALID_POSITIONS.includes(trimmed as VariationPosition)) {
		return trimmed as VariationPosition;
	}
	return null;
}

/**
 * Parse side string to LimitSide
 *
 * @param side - Side string
 * @returns LimitSide or null if invalid
 */
function parseSide(side: string): LimitSide | null {
	const trimmed = side.trim().toLowerCase();
	if (VALID_SIDES.includes(trimmed as LimitSide)) {
		return trimmed as LimitSide;
	}
	return null;
}

/**
 * Auto-deduce position from expression value
 *
 * @param expr - Math expression
 * @returns Deduced position: bottom for -inf, top for +inf, center otherwise
 */
function deducePositionFromExpression(expr: string): VariationPosition {
	const trimmed = expr.trim().toLowerCase();
	if (trimmed === '-inf' || trimmed === '-∞' || trimmed.includes('-inf')) {
		return 'bottom';
	}
	if (
		trimmed === '+inf' ||
		trimmed === 'inf' ||
		trimmed === '∞' ||
		trimmed === '+∞' ||
		trimmed.includes('+inf')
	) {
		return 'top';
	}
	return 'center';
}

/**
 * Parse a variation value from parts
 *
 * Formats:
 * - "3, top" -> expression=3, position=top
 * - "||, left, -inf, bottom" -> single limit on left side
 * - "||, right, +inf, top" -> single limit on right side
 * - "||, -inf, bottom, +inf, top" -> two limits with explicit positions
 * - "||, -inf, +inf" -> two limits with auto-deduced positions (legacy)
 * - "-inf, bottom" -> expression=-inf, position=bottom
 *
 * @param parts - Array of value parts split by comma
 * @returns VariationValue or null if invalid
 */
function parseVariationValue(parts: string[]): VariationValue | null {
	if (parts.length < 2) return null;

	const expression = parts[0].trim();
	const secondPart = parts[1].trim();

	// Check if it's an asymptote/forbidden/discontinuity marker
	if (expression === '||' || expression === '|h|' || expression === 'd') {
		const marker: VariationMarker =
			expression === '||' ? 'asymptote' : expression === '|h|' ? 'forbidden' : 'discontinuity';

		// Check for single-limit syntax: ||, left/right, value, position
		const side = parseSide(secondPart);
		if (side !== null) {
			// If we have a side keyword, we MUST have 4 parts (||, side, value, position)
			if (parts.length < 4) {
				return null; // Invalid: missing position
			}

			const limitExpression = parts[2].trim();
			const limitPosition = parsePosition(parts[3].trim());

			if (!limitPosition) return null;

			return {
				expression: limitExpression,
				position: limitPosition,
				marker,
				limitSide: side
			};
		}

		// Check for two limits with explicit positions: ||, val1, pos1, val2, pos2
		if (parts.length >= 5) {
			const leftExpr = secondPart;
			const leftPos = parsePosition(parts[2].trim());
			const rightExpr = parts[3].trim();
			const rightPos = parsePosition(parts[4].trim());

			if (leftPos && rightPos) {
				const leftLimit: LimitValue = { expression: leftExpr, position: leftPos };
				const rightLimit: LimitValue = { expression: rightExpr, position: rightPos };

				return {
					expression: '',
					position: 'center',
					marker,
					limits: [leftLimit, rightLimit]
				};
			}
		}

		// Legacy syntax with auto-deduced positions: ||, val1, val2
		if (parts.length >= 3) {
			const leftExpr = secondPart;
			const rightExpr = parts[2].trim();

			// Check if parts[2] is a position (then it's NOT legacy syntax, it's an error)
			if (parsePosition(rightExpr) !== null) {
				// This is likely ||, value, position which is invalid for marker
				return null;
			}

			const leftLimit: LimitValue = {
				expression: leftExpr,
				position: deducePositionFromExpression(leftExpr)
			};
			const rightLimit: LimitValue = {
				expression: rightExpr,
				position: deducePositionFromExpression(rightExpr)
			};

			return {
				expression: '',
				position: 'center',
				marker,
				limits: [leftLimit, rightLimit]
			};
		}

		// Invalid syntax for marker
		return null;
	}

	// Regular value: expression, position
	const position = parsePosition(secondPart);
	if (!position) return null;

	return {
		expression,
		position
	};
}

/**
 * Parse a variation row entry (key: value1, value2, ...)
 *
 * @param key - The key (domain point expression)
 * @param value - The comma-separated values
 * @returns Tuple [normalizedKey, VariationValue] or null if invalid
 */
function parseVariationEntry(key: string, value: string): [string, VariationValue] | null {
	// Split value by comma, but be careful with math expressions
	// Simple split for now - math expressions shouldn't have commas at top level
	const parts = value.split(',').map((p) => p.trim());

	const variationValue = parseVariationValue(parts);
	if (!variationValue) return null;

	// Normalize the key
	const normalizedKey = key.trim();

	return [normalizedKey, variationValue];
}

// ============================================================================
// ROW PARSING
// ============================================================================

/**
 * Lit la valeur d'une cellule cachée (`?-`, `?z`, `?||`, `?rien`, `?`).
 *
 * @returns la valeur à ranger dans `values` (absente pour `rien` et `?`) et la
 *          réponse attendue ; null si refusée (le refus est déjà déclaré)
 */
function parseHiddenSignValue(
	rest: string,
	isInterval: boolean,
	refuse: (message: string) => void
): { value?: SignValue; kind: HiddenCellKind; answer: string } | null {
	const kind: HiddenCellKind = isInterval ? 'signe' : 'marque';

	if (rest === '') return { kind, answer: '' };

	if (rest === '+' || rest === '-') {
		if (!isInterval) {
			refuse(`un signe ne se cache que sur un intervalle, pas sur un point (?${rest})`);
			return null;
		}
		return { value: { type: 'sign', value: rest }, kind, answer: rest };
	}

	if (rest === '|h|' || rest === 'd') {
		refuse(`on ne peut pas cacher la marque « ${rest} » : seuls ?z, ?||, ?rien se cachent`);
		return null;
	}

	if (rest === 'z' || rest === '0' || rest === '||' || rest === 'rien') {
		if (isInterval) {
			refuse(`une marque ne se cache que sur un point, pas sur un intervalle (?${rest})`);
			return null;
		}
		if (rest === 'rien') return { kind, answer: 'rien' };
		if (rest === '||') {
			return { value: { type: 'marker', marker: 'asymptote' }, kind, answer: '||' };
		}
		return { value: { type: 'marker', marker: 'zero' }, kind, answer: 'z' };
	}

	refuse(`valeur cachée inconnue : « ?${rest} ». Attendu ?+, ?-, ?z, ?||, ?rien ou ?`);
	return null;
}

/**
 * Parse entries for a sign row
 *
 * @param lines - Lines of entries (indented with 2+ spaces)
 * @param startLine - Line number for error reporting
 * @param errors - Error array to append to
 * @param refuse - Déclare un refus lié à un `?`
 * @returns les valeurs (key -> SignValue) et les cases cachées à valider
 */
function parseSignRowEntries(
	lines: string[],
	startLine: number,
	errors: VariationTableParseError[],
	refuse: Refuse
): { values: Map<string, SignValue>; hidden: PendingCell[] } {
	const values = new Map<string, SignValue>();
	const hidden = new Map<string, PendingCell>();

	for (let i = 0; i < lines.length; i++) {
		const match = lines[i].match(ROW_ENTRY_REGEX);
		if (!match) {
			errors.push({
				message: `Invalid sign entry format`,
				line: startLine + i,
				content: lines[i]
			});
			continue;
		}

		const [, key, value] = match;
		const lineNumber = startLine + i;

		if (value.trim().startsWith('?')) {
			const normalizedKey = key
				.split(',')
				.map((p) => p.trim())
				.join(',');
			const read = parseHiddenSignValue(
				value.trim().slice(1).trim(),
				normalizedKey.includes(','),
				(m) => refuse(lineNumber, lines[i], m)
			);
			if (!read) continue;
			if (read.value) values.set(normalizedKey, read.value);
			else values.delete(normalizedKey);
			hidden.set(normalizedKey, {
				key: normalizedKey,
				kind: read.kind,
				answer: read.answer,
				line: lineNumber,
				content: lines[i]
			});
			continue;
		}

		const parsed = parseSignEntry(key, value);

		if (!parsed) {
			errors.push({
				message: `Unknown sign value: "${value}". Expected +, -, z, ||, |h|, or d`,
				line: lineNumber,
				content: lines[i]
			});
			continue;
		}

		values.set(parsed[0], parsed[1]);
		// Une écriture ordinaire plus loin remplace la case cachée de la même clé
		hidden.delete(parsed[0]);
	}

	return { values, hidden: [...hidden.values()] };
}

/**
 * Parse entries for a variation row
 *
 * @param lines - Lines of entries (indented with 2+ spaces)
 * @param startLine - Line number for error reporting
 * @param errors - Error array to append to
 * @returns Map of key -> VariationValue
 */
function parseVariationRowEntries(
	lines: string[],
	startLine: number,
	errors: VariationTableParseError[],
	refuse: Refuse
): Map<string, VariationValue> {
	const values = new Map<string, VariationValue>();

	for (let i = 0; i < lines.length; i++) {
		// `?` en tête de clé ou de valeur = cellule cachée ; ailleurs, simple texte. Une
		// clé `??1` est une valeur de x masquée (énoncé d'évaluation), pas une cellule
		const entry = lines[i].match(ROW_ENTRY_REGEX);
		const entryKey = entry?.[1].trim() ?? '';
		const maskedKey = MASKED_KEY_REGEX.test(entryKey);
		if (entry && ((entryKey.startsWith('?') && !maskedKey) || entry[2].trim().startsWith('?'))) {
			refuse(
				startLine + i,
				lines[i],
				'on ne peut pas cacher une cellule d’une ligne variation: (seul le tableau de signes a des cases)'
			);
			continue;
		}
		const match = lines[i].match(ROW_ENTRY_REGEX);
		if (!match) {
			errors.push({
				message: `Invalid variation entry format`,
				line: startLine + i,
				content: lines[i]
			});
			continue;
		}

		const [, key, value] = match;
		const parsed = parseVariationEntry(key, value);

		if (!parsed) {
			errors.push({
				message: `Invalid variation value format: "${value}". Expected format: "expression, position"`,
				line: startLine + i,
				content: lines[i]
			});
			continue;
		}

		values.set(parsed[0], parsed[1]);
	}

	return values;
}

// ============================================================================
// CASES CACHÉES
// ============================================================================

/**
 * Numérote les cases cachées dans l'ORDRE DE LECTURE : le domaine de gauche à
 * droite, puis chaque ligne `sign:` dans son ordre, ses cellules par colonne
 * (point, intervalle, point…). L'ordre d'écriture de l'auteur ne compte pas.
 *
 * Refuse (via `refuse`) une clé cachée qui n'est pas une cellule du domaine.
 */
function buildHiddenCells(
	domain: DomainPoint[],
	hiddenByRow: Map<number, PendingCell[]>,
	refuse: Refuse,
	domainLine: number
): HiddenCell[] {
	const cells: HiddenCell[] = [];
	// Une valeur de x répétée rendrait deux cellules indiscernables (clés identiques)
	const seen = new Set<string>();
	for (const point of domain) {
		if (seen.has(point.expression)) {
			refuse(
				domainLine,
				`domain: … ${point.expression} …`,
				`la valeur de x « ${point.expression} » est répétée dans le domaine`
			);
			return [];
		}
		seen.add(point.expression);
	}
	const push = (cell: Omit<HiddenCell, 'index'>) => cells.push({ index: cells.length, ...cell });

	for (const point of domain) {
		if (point.hidden) {
			push({
				row: 'domain',
				key: point.expression,
				kind: 'valeur',
				// Un jeton `??n` ne porte pas la réponse
				answer: point.expression.startsWith('??') ? '' : point.expression
			});
		}
	}

	// Cellules d'une ligne de signes, en colonnes : point, intervalle, point…
	const columnKeys: string[] = [];
	domain.forEach((point, j) => {
		columnKeys.push(point.expression);
		if (j < domain.length - 1) columnKeys.push(`${point.expression},${domain[j + 1].expression}`);
	});

	for (const rowIndex of [...hiddenByRow.keys()].sort((a, b) => a - b)) {
		const pending = hiddenByRow.get(rowIndex) ?? [];
		for (const cell of pending) {
			if (!columnKeys.includes(cell.key)) {
				refuse(
					cell.line,
					cell.content,
					`la cellule « ${cell.key} » n'est pas dans le domaine du tableau`
				);
			}
		}
		for (const key of columnKeys) {
			const cell = pending.find((p) => p.key === key);
			if (cell) push({ row: rowIndex, key, kind: cell.kind, answer: cell.answer });
		}
	}

	return cells;
}

// ============================================================================
// MAIN PARSER
// ============================================================================

/**
 * Parse a variation table block content
 *
 * @param lines - Lines between ```variation and ``` (exclusive)
 * @returns VariationTableParseResult with node and errors
 *
 * @example
 * ```typescript
 * const content = [
 *   'variable: x',
 *   'domain: -inf, 0, +inf',
 *   '',
 *   'sign: f(x)',
 *   '  -inf,0: +',
 *   '  0: z',
 *   '  0,+inf: -'
 * ];
 * const result = parseVariationTableContent(content);
 * ```
 */
export function parseVariationTableContent(lines: string[]): VariationTableParseResult {
	const errors: VariationTableParseError[] = [];
	let variable: string | null = null;
	let domain: DomainPoint[] = [];
	const rows: TableRow[] = [];
	const hiddenByRow = new Map<number, PendingCell[]>();
	let caseIndex: number | undefined;
	let domainLine = 0;
	let refused = false;

	const refuse: Refuse = (line, content, message) => {
		refused = true;
		errors.push({ message: `Ligne ${line} : ${message}`, line, content });
	};

	let i = 0;

	// Helper to collect entry lines for a row
	function collectEntryLines(): string[] {
		const entryLines: string[] = [];
		while (i < lines.length) {
			const line = lines[i];
			// Entry lines start with 2+ spaces
			if (/^\s{2,}/.test(line)) {
				entryLines.push(line);
				i++;
			} else if (line.trim() === '') {
				// Empty line ends the row
				i++;
				break;
			} else {
				// New section/row header
				break;
			}
		}
		return entryLines;
	}

	while (i < lines.length) {
		const line = lines[i];
		const lineNum = i + 1; // 1-based for error reporting

		// Skip empty lines at top level
		if (line.trim() === '') {
			i++;
			continue;
		}

		// Try to match variable
		const varMatch = line.match(VARIABLE_REGEX);
		if (varMatch) {
			if (variable !== null) {
				errors.push({
					message: 'Duplicate variable declaration',
					line: lineNum,
					content: line
				});
			}
			variable = varMatch[1];
			i++;
			continue;
		}

		// Try to match domain
		const domainMatch = line.match(DOMAIN_REGEX);
		if (domainMatch) {
			if (domain.length > 0) {
				errors.push({
					message: 'Duplicate domain declaration',
					line: lineNum,
					content: line
				});
			}
			domain = parseDomainContent(domainMatch[1], refuse, lineNum);
			domainLine = lineNum;
			i++;
			continue;
		}

		// Try to match sign row header
		const signMatch = line.match(SIGN_HEADER_REGEX);
		if (signMatch) {
			const label = signMatch[1];
			if (label.trimStart().startsWith('?')) {
				refuse(lineNum, line, 'on ne peut pas cacher une étiquette de ligne (sign: …)');
			}
			i++;
			const entryStartLine = i + 1;
			const entryLines = collectEntryLines();
			const { values, hidden } = parseSignRowEntries(entryLines, entryStartLine, errors, refuse);
			if (hidden.length > 0) hiddenByRow.set(rows.length, hidden);

			const signRow: SignRow = {
				type: 'sign',
				label,
				values
			};
			rows.push(signRow);
			continue;
		}

		// Try to match variation row header
		const variationMatch = line.match(VARIATION_HEADER_REGEX);
		if (variationMatch) {
			const label = variationMatch[1];
			if (label.trimStart().startsWith('?')) {
				refuse(lineNum, line, 'on ne peut pas cacher une étiquette de ligne (variation: …)');
			}
			i++;
			const entryStartLine = i + 1;
			const entryLines = collectEntryLines();
			const values = parseVariationRowEntries(entryLines, entryStartLine, errors, refuse);

			const variationRow: VariationRow = {
				type: 'variation',
				label,
				values
			};
			rows.push(variationRow);
			continue;
		}

		// Numéro de case posé par le générateur de questions
		const caseMatch = line.match(CASE_LINE_REGEX);
		if (caseMatch) {
			if (!CASE_INDEX_REGEX.test(caseMatch[1])) {
				errors.push({
					message: `Ligne ${lineNum} : case: attend un numéro de case (0, 1, 2…)`,
					line: lineNum,
					content: line
				});
			} else {
				caseIndex = Number(caseMatch[1]);
			}
			i++;
			continue;
		}

		// Unrecognized line
		errors.push({
			message: `Unrecognized line format`,
			line: lineNum,
			content: line
		});
		i++;
	}

	// Validate required fields
	if (!variable) {
		errors.push({ message: 'Missing required "variable:" declaration' });
	}

	if (domain.length === 0) {
		errors.push({ message: 'Missing required "domain:" declaration' });
	}

	if (rows.length === 0) {
		errors.push({ message: 'No sign or variation rows defined' });
	}

	const hasHidden = hiddenByRow.size > 0 || domain.some((point) => point.hidden);
	const cases =
		refused || !hasHidden ? [] : buildHiddenCells(domain, hiddenByRow, refuse, domainLine);

	// If we have critical errors, return null node
	if (!variable || domain.length === 0 || refused) {
		return { node: null, errors };
	}

	const node: VariationTableNode = {
		type: 'variation-table',
		variable,
		domain,
		rows
	};
	if (cases.length > 0) {
		node.cases = cases;
		node.source = lines.join('\n');
	}
	if (caseIndex !== undefined) node.caseIndex = caseIndex;

	return { node, errors };
}

/**
 * Parse a complete variation table block from markdown lines
 *
 * Expects lines including the ```variation and ``` delimiters.
 *
 * @param lines - All lines including delimiters
 * @param startIndex - Index of the ```variation line
 * @param endIndex - Index of the closing ``` line
 * @returns VariationTableParseResult
 */
export function parseVariationTable(
	lines: string[],
	startIndex: number,
	endIndex: number
): VariationTableParseResult {
	// Extract content lines (between delimiters, exclusive)
	const contentLines = lines.slice(startIndex + 1, endIndex);
	return parseVariationTableContent(contentLines);
}

// ============================================================================
// BLOCK FINDING
// ============================================================================

/**
 * Range information for a variation table block
 */
export interface VariationBlockRange {
	startIndex: number;
	endIndex: number;
}

/**
 * Find all variation table blocks in markdown lines
 *
 * @param lines - Array of markdown lines
 * @returns Array of block ranges
 *
 * @example
 * ```typescript
 * const lines = [
 *   'Some text',
 *   '```variation',
 *   'variable: x',
 *   '...',
 *   '```',
 *   'More text'
 * ];
 * const blocks = findVariationBlocks(lines);
 * // Returns: [{ startIndex: 1, endIndex: 4 }]
 * ```
 */
export function findVariationBlocks(lines: string[]): VariationBlockRange[] {
	const blocks: VariationBlockRange[] = [];
	let i = 0;

	while (i < lines.length) {
		if (isVariationBlockStart(lines[i])) {
			const startIndex = i;
			// Fermé par un ``` qui ne fait pas lire du texte comme contenu (Q66),
			// sinon jusqu'à la première ligne vide (Q63)
			const { endIndex } = specialBlockEnd(lines, startIndex, isBlockEnd, BLOCK_KEYS);
			blocks.push({ startIndex, endIndex });
			i = endIndex + 1;
		} else {
			i++;
		}
	}

	return blocks;
}

/** Un `?` en tête d'une valeur (`domain: -inf, ?-3`, `  -3: ?z`, `sign: ?f`) */
const LEADING_MARK_REGEX = /[:,]\s*[[\]]?\s*\?/;

/** Tableau à compléter d'un énoncé : délimité comme le parseur, et ce qu'il en lit */
export interface VariationToFill {
	startIndex: number;
	/** Corps sans clôtures (lignes sans ce qui les imbrique) */
	body: string[];
	closed: boolean;
	/** Bloc en retrait ou cité : l'élève ne pourrait pas y répondre */
	nested: boolean;
	/** Le nœud lu, null si le parseur refuse le bloc (`errors` dit pourquoi) */
	node: VariationTableNode | null;
	errors: VariationTableParseError[];
}

/**
 * Les tableaux à compléter d'un énoncé : ceux qui ont au moins une case cachée
 * (`?`), ou que le parseur refuse à cause d'un `?` en tête de valeur (le
 * générateur dira pourquoi, plutôt que de rendre le bloc en source).
 */
export function findVariationsToFill(markdown: string): VariationToFill[] {
	const lines = markdown.split('\n');
	const found: VariationToFill[] = [];
	let i = 0;
	while (i < lines.length) {
		const fence = unnestedLine(lines[i]);
		if (isVariationBlockStart(fence)) {
			// Le retrait des lignes du corps compte (`  -3: z`) : seul ce qui imbrique la
			// fence (citation, retrait de liste) est retiré, sur toutes les lignes
			const nesting = lines[i].length - fence.length;
			const plain = lines.map((line, k) =>
				k < i ? line : line.slice(Math.min(nesting, /^[\s>]*/.exec(line)![0].length))
			);
			const { endIndex, closed } = specialBlockEnd(plain, i, isBlockEnd, BLOCK_KEYS);
			const body = plain.slice(i + 1, closed ? endIndex : endIndex + 1);
			const { node, errors } = parseVariationTableContent(body);
			const refusedMark = node === null && body.some((line) => LEADING_MARK_REGEX.test(line));
			if ((node?.cases?.length ?? 0) > 0 || refusedMark) {
				found.push({ startIndex: i, body, closed, nested: nesting > 0, node, errors });
			}
			i = endIndex;
		}
		i++;
	}
	return found;
}

/** L'énoncé a-t-il un tableau à compléter ? */
export function hasVariationToFill(markdown: string): boolean {
	return findVariationsToFill(markdown).length > 0;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a variation table node has sign rows
 *
 * @param node - VariationTableNode to check
 * @returns true if table contains at least one sign row
 */
export function hasSignRows(node: VariationTableNode): boolean {
	return node.rows.some((row) => row.type === 'sign');
}

/**
 * Check if a variation table node has variation rows
 *
 * @param node - VariationTableNode to check
 * @returns true if table contains at least one variation row
 */
export function hasVariationRows(node: VariationTableNode): boolean {
	return node.rows.some((row) => row.type === 'variation');
}

/**
 * Get all sign rows from a variation table
 *
 * @param node - VariationTableNode to query
 * @returns Array of SignRow
 */
export function getSignRows(node: VariationTableNode): SignRow[] {
	return node.rows.filter((row): row is SignRow => row.type === 'sign');
}

/**
 * Get all variation rows from a variation table
 *
 * @param node - VariationTableNode to query
 * @returns Array of VariationRow
 */
export function getVariationRows(node: VariationTableNode): VariationRow[] {
	return node.rows.filter((row): row is VariationRow => row.type === 'variation');
}

/**
 * Get domain point count
 *
 * @param node - VariationTableNode to query
 * @returns Number of domain points
 */
export function getDomainPointCount(node: VariationTableNode): number {
	return node.domain.length;
}

/**
 * Complète les bornes (premier et dernier point du domaine) laissées sans valeur
 * par une position seule, sans expression, opposée à celle de la valeur voisine :
 * autour d'un minimum les bornes sont en haut, autour d'un maximum en bas.
 *
 * C'est le tableau de variations d'un trinôme en 1re, sans limites en ±∞. Sans
 * ce complément, le PDF plantait (vartable : colonne vide), l'écran ne dessinait
 * pas de flèche et l'export LaTeX sautait la colonne.
 *
 * Appliqué au RENDU seulement : l'arbre (et donc le Markdown de l'auteur, que
 * l'éditeur peut réécrire) reste tel qu'il a été écrit. Rien n'est deviné à côté
 * d'une valeur centrée ou d'une asymptote.
 *
 * @returns une nouvelle ligne ; la ligne d'origine n'est pas modifiée
 */
export function withImplicitEndpoints(row: VariationRow, domain: DomainPoint[]): VariationRow {
	if (domain.length < 2) return row;

	const values = new Map(row.values);
	const fill = (endpoint: DomainPoint, neighbours: DomainPoint[]) => {
		if (values.has(endpoint.expression)) return;
		const neighbour = neighbours.map((p) => values.get(p.expression)).find((v) => v !== undefined);
		const position = neighbour && !neighbour.marker ? oppositePosition(neighbour.position) : null;
		if (position) values.set(endpoint.expression, { expression: '', position });
	};

	fill(domain[0], domain.slice(1));
	fill(domain[domain.length - 1], domain.slice(0, -1).reverse());

	return { ...row, values };
}

/** Position opposée (haut ↔ bas), ou null pour une valeur centrée */
function oppositePosition(position: VariationPosition): VariationPosition | null {
	switch (position) {
		case 'top':
		case 'limit-top':
			return 'bottom';
		case 'bottom':
		case 'limit-bottom':
			return 'top';
		default:
			return null;
	}
}
