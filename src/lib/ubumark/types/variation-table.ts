/**
 * Variation Table Types - Type Definitions
 * =========================================
 *
 * Types for representing sign and variation tables in the custom markdown AST.
 *
 * Features:
 * - Sign rows with +/- values and markers (zero, asymptote, forbidden, discontinuity)
 * - Variation rows with position indicators (top, bottom, center, limit-top, limit-bottom)
 * - Support for open/closed bounds
 * - Complex math expressions in domain points
 *
 * @module ubumark/types/variation-table
 */

import type { BaseNode } from './ast';

// ============================================================================
// VALUE POSITION & MARKERS
// ============================================================================

/**
 * Position of a value in a variation row
 *
 * - 'top': Maximum/highest position
 * - 'bottom': Minimum/lowest position
 * - 'center': Middle position (neutral)
 * - 'limit-top': Approaching from above (for limits)
 * - 'limit-bottom': Approaching from below (for limits)
 */
export type VariationPosition = 'top' | 'bottom' | 'center' | 'limit-top' | 'limit-bottom';

/**
 * Special markers for table cells
 *
 * - 'zero': Zero crossing (where function equals zero)
 * - 'asymptote': Vertical asymptote (||)
 * - 'forbidden': Forbidden value, function undefined (|h|)
 * - 'discontinuity': Point of discontinuity (d)
 */
export type VariationMarker = 'zero' | 'asymptote' | 'forbidden' | 'discontinuity';

// ============================================================================
// SIGN ROW TYPES
// ============================================================================

/**
 * Sign value: a + or - sign
 */
export interface SignValueSign {
	type: 'sign';
	value: '+' | '-';
}

/**
 * Marker value: a special symbol (zero, asymptote, etc.)
 */
export interface SignValueMarker {
	type: 'marker';
	marker: VariationMarker;
}

/**
 * Value in a sign row
 *
 * Discriminated union: either a sign (+/-) or a special marker.
 * Use type guard to narrow the type:
 * ```typescript
 * if (signValue.type === 'sign') {
 *   console.log(signValue.value); // '+' | '-'
 * } else {
 *   console.log(signValue.marker); // VariationMarker
 * }
 * ```
 */
export type SignValue = SignValueSign | SignValueMarker;

/**
 * Sign row in a variation table
 *
 * Represents the sign of a function (or derivative) across intervals.
 * Keys in the values Map can be:
 * - A single point: "0", "-1", "+inf"
 * - An interval: "-inf,-1" or "0,1"
 *
 * **Note**: `values.get(key)` may return `undefined` if the key is not present.
 * Always check for undefined before using the value.
 *
 * @example
 * ```
 * sign: f'(x)
 *   -inf,-1: +
 *   -1: z
 *   -1,0: -
 * ```
 */
export interface SignRow {
	type: 'sign';
	/** Label for this row (e.g., "f'(x)", "f''(x)") */
	label: string;
	/** Values for each point or interval. Use .get(key) - may return undefined. */
	values: Map<string, SignValue>;
}

// ============================================================================
// VARIATION ROW TYPES
// ============================================================================

/**
 * Limit value with expression and position
 *
 * Used for asymptote limits in variation rows.
 */
export interface LimitValue {
	/** Math expression for the limit (e.g., "-inf", "+inf", "3") */
	expression: string;
	/** Vertical position of this limit */
	position: VariationPosition;
}

/**
 * Side indicator for single-limit asymptotes
 *
 * - 'left': limit is displayed to the left of the asymptote bar
 * - 'right': limit is displayed to the right of the asymptote bar
 */
export type LimitSide = 'left' | 'right';

/**
 * Value in a variation row
 *
 * Represents a function value at a specific point with positioning information.
 *
 * For asymptotes, there are three possible configurations:
 * 1. Single limit (left): `limitSide: 'left'` with expression/position for the limit
 * 2. Single limit (right): `limitSide: 'right'` with expression/position for the limit
 * 3. Two limits: `limits: [leftLimit, rightLimit]` array with both limits
 */
export interface VariationValue {
	/** Math expression for the value (e.g., "3", "-inf", "\frac{1}{2}") */
	expression: string;
	/** Vertical position in the cell */
	position: VariationPosition;
	/** Optional marker (for asymptotes, discontinuities) */
	marker?: VariationMarker;
	/**
	 * Limits for asymptotes with two sides: [left limit, right limit]
	 * Each limit has its own expression and position.
	 */
	limits?: [LimitValue, LimitValue];
	/**
	 * Side indicator for single-limit asymptotes.
	 * When set, the expression/position fields represent the single limit value.
	 * - 'left': limit is to the left of ||
	 * - 'right': limit is to the right of ||
	 */
	limitSide?: LimitSide;
}

/**
 * Variation row in a variation table
 *
 * Represents the variations (increase/decrease) of a function.
 *
 * **Note**: `values.get(key)` may return `undefined` if the key is not present.
 * Always check for undefined before using the value.
 *
 * @example
 * ```
 * variation: f(x)
 *   -inf: -inf, bottom
 *   -1: 3, top
 *   0: ||, -inf, +inf
 * ```
 */
export interface VariationRow {
	type: 'variation';
	/** Label for this row (e.g., "f(x)", "g(x)") */
	label: string;
	/** Values at each domain point. Use .get(key) - may return undefined. */
	values: Map<string, VariationValue>;
}

// ============================================================================
// DOMAIN TYPES
// ============================================================================

/**
 * A point in the domain definition
 *
 * Supports math expressions and open/closed bound indicators.
 */
export interface DomainPoint {
	/** Math expression for the point (e.g., "-inf", "0", "\frac{\pi}{2}") */
	expression: string;
	/** True if this is an open bound (parenthesis), false if closed (bracket) */
	open?: boolean;
	/**
	 * Valeur de x cachée (`?` devant, dans `domain:`) : case à compléter par l'élève.
	 * `expression` garde la vraie valeur, rangée sans le `?` ; un jeton `??n`
	 * (évaluation notée) la remplace quand la réponse ne doit pas partir.
	 */
	hidden?: boolean;
}

/**
 * Nature d'une case cachée : `valeur` (valeur de x du domaine ou valeur d'une ligne
 * `variation:`, case math), `signe` / `marque` (ligne `sign:`), `fleche` (flèche d'une
 * ligne `variation:` sur un intervalle, choix ↗ / ↘)
 */
export type HiddenCellKind = 'valeur' | 'signe' | 'marque' | 'fleche';

/**
 * Case cachée d'un tableau (`?` devant la cellule dans le bloc).
 *
 * Numérotées 0..n-1 dans l'ORDRE DE LECTURE : le domaine de gauche à droite, puis
 * chaque ligne (`sign:` ou `variation:`) dans son ordre, ses cellules par position de
 * colonne (point, intervalle, point…) — jamais l'ordre d'écriture de l'auteur.
 */
export interface HiddenCell {
	/** Numéro de la case (0..n-1), dans l'ordre de lecture */
	index: number;
	/** `'domain'` ou l'indice de la ligne dans `rows` */
	row: 'domain' | number;
	/** Clé de la cellule : valeur du domaine, point (`-3`) ou intervalle (`-inf,-3`) */
	key: string;
	kind: HiddenCellKind;
	/**
	 * Réponse attendue : expression | '+' | '-' | 'z' | '||' | 'rien' | '↗' | '↘' ;
	 * '' si masquée (évaluation)
	 */
	answer: string;
}

// ============================================================================
// VARIATION TABLE NODE
// ============================================================================

/**
 * Variation Table AST Node
 *
 * Represents a complete sign/variation table with:
 * - Variable name
 * - Domain points (with optional open/closed bounds)
 * - Multiple sign and/or variation rows
 *
 * @example Basic structure
 * ```
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
 * ```
 */
export interface VariationTableNode extends BaseNode {
	type: 'variation-table';
	/** The variable name (e.g., "x", "t") */
	variable: string;
	/** Domain points in order */
	domain: DomainPoint[];
	/** Rows of the table (sign and/or variation rows) */
	rows: (SignRow | VariationRow)[];
	/** Cases cachées (`?`), dans l'ordre de lecture. Absent si le bloc n'a aucun `?`. */
	cases?: HiddenCell[];
	/** Numéro de la case de la question (`case: N`), posé par le générateur de questions */
	caseIndex?: number;
	/** Texte source du bloc, gardé quand il a des `?` (l'éditeur riche le réaffiche tel quel) */
	source?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Union type for all row types
 */
export type TableRow = SignRow | VariationRow;

/**
 * Parser error information
 */
export interface VariationTableParseError {
	/** Error message */
	message: string;
	/** Line number where error occurred (1-based) */
	line?: number;
	/** The problematic line content */
	content?: string;
}

/**
 * Result of parsing a variation table block
 */
export interface VariationTableParseResult {
	/** Parsed node, null if parsing failed */
	node: VariationTableNode | null;
	/** Errors encountered during parsing */
	errors: VariationTableParseError[];
}
