/**
 * Unit System - Parser
 * ====================
 *
 * Parser for extracting quantities (value + unit) from LaTeX expressions.
 *
 * Features:
 * - Extract value and unit from LaTeX using \unit{} wrapper
 * - Parse composite unit expressions (km/h, m.s^-2)
 * - Read the value as a tree (mathAST): fractions, decimals, scientific notation
 *
 * @module questions/units/parser
 */

import type { Unit, Quantity } from './types';
import { dimensionlessUnit } from './operations';
import { parse as parseUnit } from '$lib/mathAST/units/parser';
import { parseLatex } from '$lib/mathAST/parser';
import { tidy } from '$lib/mathAST/tidy';
import { rationalOf } from '$lib/mathAST/eval/evaluate-with-modifiers';
import { evaluateExpression, stripLatexSpacing } from '$lib/math';
import type { Rational } from '$lib/mathAST/normal/types';

// ============================================================================
// LATEX PATTERNS
// ============================================================================

/**
 * Pattern for extracting units from \unit{} wrapper
 *
 * This is the ONLY supported format for units in LaTeX input.
 * MathLive is configured to output units using this macro.
 *
 * Supports nested braces for exponents like s^{-2}.
 *
 * @example
 * \unit{km} → 'km'
 * \unit{m/s} → 'm/s'
 * \unit{kg.m^{-2}} → 'kg.m^{-2}'
 */
const UNIT_PATTERN = /\\unit\{((?:[^{}]|\{[^{}]*\})+)\}/;

// ============================================================================
// UNICODE SUPERSCRIPT CONVERSION
// ============================================================================

/**
 * Unicode superscript to ASCII digit mapping
 */
const SUPERSCRIPT_TO_DIGIT: Record<string, string> = {
	'\u2070': '0',
	'\u00b9': '1',
	'\u00b2': '2',
	'\u00b3': '3',
	'\u2074': '4',
	'\u2075': '5',
	'\u2076': '6',
	'\u2077': '7',
	'\u2078': '8',
	'\u2079': '9',
	'\u207b': '-'
};

/**
 * Convert Unicode superscripts to ASCII exponent notation
 *
 * @param str - String potentially containing Unicode superscripts
 * @returns String with superscripts converted to ^number format
 *
 * @example
 * normalizeSuperscripts('m\u00b2') // 'm^2'
 * normalizeSuperscripts('s\u207b\u00b2') // 's^-2'
 */
function normalizeSuperscripts(str: string): string {
	// Replace middle dot with standard multiplication dot
	let result = str.replace(/\u00b7/g, '*');

	// Replace superscript sequences with ^number
	const superscriptRegex = /([\u2070\u00b9\u00b2\u00b3\u2074-\u2079\u207b]+)/g;

	result = result.replace(superscriptRegex, (match) => {
		const digits = [...match].map((c) => SUPERSCRIPT_TO_DIGIT[c] ?? c).join('');
		return `^${digits}`;
	});

	return result;
}

// ============================================================================
// LECTURE DE LA VALEUR
// ============================================================================

/**
 * Valeur exacte de la partie numérique d'une grandeur, lue en arbre par mathAST
 * (`parseLatex` → `tidy` → `rationalOf`) : nombre, fraction, notation scientifique,
 * calcul de nombres (`3+2`). `null` si ce n'est pas un nombre rationnel :
 * `2\sqrt{2}`, `\pi`, `5x` — jamais leur premier nombre — ou une division par zéro.
 *
 * Virgule décimale : `{,}` (écriture de l'application) ou `,` entre chiffres ;
 * espace fine de groupement entre chiffres (`12\,500`) retirée.
 */
function readExactValue(latex: string): Rational | null {
	try {
		return rationalOf(tidy(parseLatex(treeLatex(latex))));
	} catch {
		return null;
	}
}

/**
 * Écriture lisible par mathAST : habillages sans sens retirés (`\num{5}`, `\text{ }`, `~`),
 * espacements, groupement (`12\,500`) et virgule décimale ramenés par `stripLatexSpacing`
 */
function treeLatex(latex: string): string {
	return stripLatexSpacing(
		latex
			.replace(/\\num\{([^{}]*)\}/g, '$1')
			.replace(/\\text\{\s*\}/g, '')
			.replace(/~/g, ' ')
			.trim()
	);
}

/** Valeur numérique de la partie numérique d'une grandeur ; `null` si illisible */
function readValue(latex: string): number | null {
	const exact = readExactValue(latex);
	return exact === null ? null : Number(exact.n) / Number(exact.d);
}

/**
 * Écriture d'un nombre réel, même non rationnel (`\sqrt{2}`, `\pi`) : mathAST
 * l'évalue en un nombre fini. `abc`, `5x`, `\infty` : non.
 */
export function readsAsNumber(latex: string): boolean {
	try {
		const value = evaluateExpression(treeLatex(latex));
		return typeof value === 'number' && Number.isFinite(value);
	} catch {
		return false;
	}
}

// ============================================================================
// UNIT EXPRESSION PARSING
// ============================================================================

/**
 * Parse a unit expression string into a Unit type
 *
 * Une seule règle pour toute l'application : la lecture est déléguée à
 * `mathAST/units/parser.ts` (référence : `docs/pratiques/notation-unites.md`). Seuls
 * les exposants Unicode (`m²`, `s⁻¹`), que MathLive ou un clavier peuvent
 * produire, sont d'abord convertis en `^n`, ainsi que `·` et `×` en `*`.
 *
 * Portée du `/` : il porte sur le symbole qui le suit ou sur un groupe entre
 * parenthèses. `kg/m.s` est ambigu et REFUSÉ (`null`) : écrire `kg/(m.s)`.
 *
 * @param unitStr - Unit expression string (e.g., "km/h", "m.s^-2", "kg.m^2.s^-2")
 * @returns Parsed Unit or null if parsing fails
 *
 * @example Simple units
 * parseUnitExpression('m') // { components: Map{'m' => 1}, coefficient: 1 }
 * parseUnitExpression('km') // { components: Map{'m' => 1}, coefficient: 1000 }
 *
 * @example Composite units
 * parseUnitExpression('km/h') // km.h^-1
 * parseUnitExpression('m.s^-2') // m.s^-2
 * parseUnitExpression('m²') // m^2
 * parseUnitExpression('kg/m.s') // null (ambigu)
 */
export function parseUnitExpression(unitStr: string): Unit | null {
	if (!unitStr || unitStr.trim() === '') {
		return null;
	}

	// Exposants Unicode → ^n, `·` → `*` ; `×` → `*` (inconnu de mathAST)
	const normalized = normalizeSuperscripts(unitStr.trim()).replace(/\u00d7/g, '*');

	return parseUnit(normalized);
}

// ============================================================================
// LATEX UNIT EXTRACTION
// ============================================================================

/**
 * Extract unit string from \unit{} wrapper
 *
 * This is the ONLY supported format for units.
 *
 * @param latex - LaTeX string containing \unit{...}
 * @returns Extracted unit string or null
 *
 * @example
 * extractUnitFromLatex('5\\unit{km}') // 'km'
 * extractUnitFromLatex('3.14\\unit{m/s}') // 'm/s'
 * extractUnitFromLatex('42') // null (no unit)
 */
export function extractUnitFromLatex(latex: string): string | null {
	const match = latex.match(UNIT_PATTERN);
	return match?.[1]?.trim() ?? null;
}

// ============================================================================
// MAIN PARSING FUNCTION
// ============================================================================

/**
 * Parse a LaTeX string to extract value and unit
 *
 * This is the main entry point for parsing quantities from LaTeX input.
 * Expects format: <value>\unit{<unit>} or just <value> for dimensionless.
 *
 * @param latex - LaTeX string containing a quantity
 * @returns Quantity object or null if parsing fails
 *
 * @example
 * parseLatexQuantity('5\\unit{km}')
 * // { value: 5, unit: { components: Map{'m' => 1}, coefficient: 1000 } }
 *
 * parseLatexQuantity('\\frac{3}{2}\\unit{kg}')
 * // { value: 1.5, unit: { components: Map{'g' => 1}, coefficient: 1000 } }
 *
 * parseLatexQuantity('42')
 * // { value: 42, unit: dimensionless }
 */
export function parseLatexQuantity(latex: string): Quantity | null {
	if (!latex || typeof latex !== 'string') {
		return null;
	}

	const str = latex.trim();
	if (!str) {
		return null;
	}

	// Extract unit from \unit{} wrapper
	const unitStr = extractUnitFromLatex(str);

	// Remove \unit{...} to get value part
	const valueStr = str.replace(UNIT_PATTERN, '').trim();

	// Extract numeric value
	const value = valueStr ? readValue(valueStr) : null;

	if (value === null) {
		return null;
	}

	// Parse unit or return dimensionless
	if (unitStr) {
		const unit = parseUnitExpression(unitStr);
		if (!unit) {
			return null; // Invalid unit expression
		}
		return { value, unit };
	}

	// No unit = dimensionless quantity
	return { value, unit: dimensionlessUnit() };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Normalize a unit string by converting Unicode to ASCII
 *
 * Useful for comparing units or preparing them for parsing.
 *
 * @param str - Unit string potentially with Unicode
 * @returns Normalized string
 */
export function normalizeUnitString(str: string): string {
	return normalizeSuperscripts(str);
}
