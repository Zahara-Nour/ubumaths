/**
 * Eval Parser - Parse expression evaluation tokens
 * =================================================
 *
 * Parses eval expressions from Markdown syntax: {{eval:a+b*2}}
 * Supports modifiers: {{eval:expression;modifiers}}
 *
 * Modifiers:
 * - d/decimal: écriture décimale développée (sinon résultat exact : fraction, racine)
 * - sci: notation scientifique (`{{eval:320000;sci}}` → 3.2 \times 10^{5})
 * - +/positive: Add + sign for positive results
 * - ()/bracket: Wrap negative results in parentheses
 * - '/derivative: Take derivative before evaluating
 * - [unité]: grandeur exprimée dans cette unité (`{{eval:3[h];[min]}}` → 180[min])
 * - hms: durée écrite en h, min, s (`{{eval:135[min];hms}}` → 2 h 15 min)
 * - dN: au moins N décimales, sans arrondir (`{{eval:1.5;d2}}` → 1,50)
 * - aN: arrondi à N décimales, N décimales écrites (`{{eval:3.704;a2}}` → 3,70)
 * - pN: arrondi à N chiffres significatifs, tous écrits (`{{eval:0.0996;p2}}` → 0,10)
 *
 * @module ubumark/parameterization/parser/eval-parser
 */

import type { EvalModifiers, ParsedEvalExpression } from '../../types';

/**
 * Modifier aliases mapping short/long forms to property names
 */
const MODIFIER_ALIASES: Record<string, FlagModifier> = {
	d: 'decimal',
	decimal: 'decimal',
	'+': 'addPositive',
	positive: 'addPositive',
	'()': 'bracketNegative',
	bracket: 'bracketNegative',
	"'": 'derivative',
	derivative: 'derivative',
	hms: 'hms',
	sci: 'scientific'
};

/** Modificateurs d'écriture des nombres, suivis d'un entier : `;d2`, `;a2`, `;p3` */
type DigitsModifier = 'minDecimals' | 'roundDecimals' | 'significantDigits';

/** Modificateurs booléens (tous sauf l'unité imposée `;[unité]` et les `;dN`, `;aN`, `;pN`) */
type FlagModifier = Exclude<keyof EvalModifiers, 'unit' | DigitsModifier>;

/** `[min]`, `[mm^2]`, `[km/h]` : l'unité dans laquelle exprimer une grandeur */
const UNIT_MODIFIER_REGEX = /^\[([^[\]]+)\]$/;

/** `d2`, `a0`, `p3` : lettre du réglage et nombre de chiffres */
const DIGITS_MODIFIER_REGEX = /^([dap])(\d+)$/;

/** Plus grand N de `;dN`, `;aN`, `;pN` (au-delà, le flottant n'a plus de chiffres vrais) */
const MAX_WRITING_DIGITS = 15;

/** Chaque lettre : sa clé, son plus petit N, et ce que N compte (messages d'erreur) */
const DIGITS_MODIFIERS: Record<string, { key: DigitsModifier; min: number; counts: string }> = {
	d: { key: 'minDecimals', min: 1, counts: 'le nombre de décimales' },
	a: { key: 'roundDecimals', min: 0, counts: 'le nombre de décimales' },
	p: { key: 'significantDigits', min: 1, counts: 'le nombre de chiffres significatifs' }
};

/**
 * Parse an eval expression token (backward compatible)
 *
 * Extracts the mathematical expression from an eval token.
 * The expression can reference variables and use standard operators.
 *
 * @param token - Full token string including delimiters
 * @returns Expression string, or null if token is not a valid eval expression
 *
 * @example Markdown syntax
 * ```typescript
 * parseEvalExpression('{{eval:a+b}}')
 * // -> 'a+b'
 * ```
 *
 * @example With modifiers (modifiers are stripped)
 * ```typescript
 * parseEvalExpression('{{eval:a+b;d,+}}')
 * // -> 'a+b'
 * ```
 *
 * @example Invalid tokens
 * ```typescript
 * parseEvalExpression('{{var}}')  // -> null (variable, not eval)
 * parseEvalExpression('{{random:1..10}}')  // -> null (random, not eval)
 * ```
 */
export function parseEvalExpression(token: string): string | null {
	const parsed = parseEvalExpressionWithModifiers(token);
	return parsed ? parsed.expression : null;
}

/**
 * Parse an eval expression token with modifiers
 *
 * Extracts both the expression and any modifiers from the token.
 * Modifiers are separated from the expression by a semicolon (;).
 *
 * @param token - Full token string including delimiters
 * @returns Parsed expression with modifiers, or null if not a valid eval token
 *
 * @example Basic expression
 * ```typescript
 * parseEvalExpressionWithModifiers('{{eval:a+b}}')
 * // -> { expression: 'a+b', modifiers: {} }
 * ```
 *
 * @example With decimal modifier
 * ```typescript
 * parseEvalExpressionWithModifiers('{{eval:1/3;d}}')
 * // -> { expression: '1/3', modifiers: { decimal: true } }
 * ```
 *
 * @example Combined modifiers
 * ```typescript
 * parseEvalExpressionWithModifiers('{{eval:x;d,+}}')
 * // -> { expression: 'x', modifiers: { decimal: true, addPositive: true } }
 * ```
 *
 * @example LaTeX absolute value (no conflict with semicolon)
 * ```typescript
 * parseEvalExpressionWithModifiers('{{eval:|x|}}')
 * // -> { expression: '|x|', modifiers: {} }
 * ```
 */
export function parseEvalExpressionWithModifiers(token: string): ParsedEvalExpression | null {
	if (!token.startsWith('{{eval:') || !token.endsWith('}}')) {
		return null;
	}

	const inner = token.slice(7, -2); // Remove {{eval: and }}

	// Handle empty expression
	if (inner === '') {
		return { expression: '', modifiers: {} };
	}

	// Les modificateurs suivent le dernier `;`. Un auteur les enchaîne aussi en plusieurs `;`
	// (`;();d`, `;d;()`) : on détache les segments de modificateurs un à un, depuis la fin,
	// sinon `E;()` partait au calcul (« Empty parentheses not allowed »).
	let expression = inner;
	let modifiers: EvalModifiers = {};
	for (;;) {
		const lastSemicolonIndex = expression.lastIndexOf(';');
		if (lastSemicolonIndex === -1) break;
		const potentialModifiers = expression.slice(lastSemicolonIndex + 1);
		if (potentialModifiers.length === 0 || !isValidModifierString(potentialModifiers)) break;
		const segment = parseModifiers(potentialModifiers);
		// Seulement si quelque chose a été lu : sinon c'est la fin de l'expression
		if (Object.keys(segment).length === 0) break;
		modifiers = { ...segment, ...modifiers };
		expression = expression.slice(0, lastSemicolonIndex);
	}

	assertCompatibleWritings(modifiers);
	return { expression, modifiers };
}

/**
 * Check if a string looks like valid modifiers
 *
 * Valid modifier strings contain only:
 * - Modifier characters: d, +, (, ), '
 * - Modifier words: decimal, positive, bracket, derivative
 * - Commas as separators
 *
 * @param str - String to check
 * @returns true if string looks like modifiers
 */
function isValidModifierString(str: string): boolean {
	// Empty string is not valid modifiers
	if (!str || str.trim() === '') {
		return false;
	}

	// Valid: d,+,(),',decimal,positive,bracket,derivative and commas/spaces
	// Must not contain characters that would appear in math expressions
	// like digits, operators (except +), letters beyond modifier names
	// `;[unité]` peut contenir des chiffres (`[mm^2]`) : chaque segment est lu à part
	return str
		.split(',')
		.every(
			(segment) =>
				UNIT_MODIFIER_REGEX.test(segment.trim()) ||
				DIGITS_MODIFIER_REGEX.test(segment.trim()) ||
				(/^[d+(),'a-z\s]+$/i.test(segment) && !/\d/.test(segment))
		);
}

/**
 * Parse a modifier string into EvalModifiers object
 *
 * @param modifierString - Comma-separated modifier string
 * @returns EvalModifiers object with flags set
 */
function parseModifiers(modifierString: string): EvalModifiers {
	const modifiers: EvalModifiers = {};

	for (const mod of modifierString.split(',')) {
		const unit = UNIT_MODIFIER_REGEX.exec(mod.trim());
		if (unit) {
			modifiers.unit = unit[1].trim();
			continue;
		}
		const digits = DIGITS_MODIFIER_REGEX.exec(mod.trim());
		if (digits) {
			const [, letter, count] = digits;
			const { key, min, counts } = DIGITS_MODIFIERS[letter];
			const value = Number(count);
			if (value < min || value > MAX_WRITING_DIGITS) {
				throw new Error(
					`;${letter}${count} : ${counts} doit être entre ${min} et ${MAX_WRITING_DIGITS}`
				);
			}
			modifiers[key] = value;
			continue;
		}
		const trimmed = mod.trim().toLowerCase();
		// `;a`, `;p` sans chiffre : le réglage ne dit pas à quoi arrondir
		if (trimmed === 'a') throw new Error(';a sans chiffre : écrire par exemple ;a2 (2 décimales)');
		if (trimmed === 'p') {
			throw new Error(';p sans chiffre : écrire par exemple ;p3 (3 chiffres significatifs)');
		}
		if (trimmed) {
			const key = MODIFIER_ALIASES[trimmed];
			if (key) {
				modifiers[key] = true;
			}
		}
	}

	return modifiers;
}

/**
 * Réglages d'écriture qui se contredisent : refusés (erreur de tirage), jamais l'un
 * des deux ignoré en silence.
 */
function assertCompatibleWritings(modifiers: EvalModifiers): void {
	const { minDecimals, roundDecimals, significantDigits } = modifiers;
	const rounding =
		roundDecimals !== undefined
			? `;a${roundDecimals}`
			: significantDigits !== undefined
				? `;p${significantDigits}`
				: null;
	if (roundDecimals !== undefined && significantDigits !== undefined) {
		throw new Error(
			`;a${roundDecimals} et ;p${significantDigits} ensemble : choisir un arrondi, en décimales (;aN) ou en chiffres significatifs (;pN)`
		);
	}
	if (minDecimals !== undefined && rounding !== null) {
		throw new Error(
			`;d${minDecimals} avec ${rounding} : l'arrondi fixe déjà les décimales écrites, retirer ;d${minDecimals}`
		);
	}
	const written = rounding ?? (minDecimals !== undefined ? `;d${minDecimals}` : null);
	if (modifiers.hms && written !== null) {
		throw new Error(`;hms avec ${written} : une durée écrite en h, min, s ne s'arrondit pas`);
	}
	if (modifiers.scientific && (roundDecimals !== undefined || minDecimals !== undefined)) {
		throw new Error(
			`;sci avec ${written} : en notation scientifique, arrondir avec ;pN (chiffres significatifs)`
		);
	}
}
