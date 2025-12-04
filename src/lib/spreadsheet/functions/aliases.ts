/**
 * Function Aliases - Mapping between French and English function names
 *
 * This module provides alias mapping for spreadsheet functions, allowing
 * users to write formulas in French while the system normalizes to
 * canonical English function names internally.
 *
 * @module spreadsheet/functions/aliases
 */

// =============================================================================
// Function Alias Mappings
// =============================================================================

/**
 * Map of French function names to canonical English names
 *
 * All keys and values are uppercase. The parser will normalize
 * function names to uppercase before looking up in this map.
 */
export const FUNCTION_ALIASES: Readonly<Record<string, string>> = {
	// Math functions
	SOMME: 'SUM',
	MOYENNE: 'AVERAGE',
	COMPTE: 'COUNT',
	COMPTERA: 'COUNTA',
	COMPTEVIDE: 'COUNTBLANK',
	ARRONDI: 'ROUND',
	RACINE: 'SQRT',
	PUISSANCE: 'POWER',
	RESTE: 'MOD',
	ENT: 'INT',
	PLAFOND: 'CEILING',
	PLANCHER: 'FLOOR',
	PRODUIT: 'PRODUCT',
	ALEA: 'RAND',
	ALEA_ENTRE_BORNES: 'RANDBETWEEN',
	SIGNE: 'SIGN',
	TRONQUE: 'TRUNC',
	LOG: 'LOG',
	LOG10: 'LOG10',
	EXP: 'EXP',
	LN: 'LN',
	PI: 'PI',

	// Trigonometric functions
	SIN: 'SIN',
	COS: 'COS',
	TAN: 'TAN',
	ASIN: 'ASIN',
	ACOS: 'ACOS',
	ATAN: 'ATAN',

	// Statistical functions
	ECARTTYPE: 'STDEV',
	VAR: 'VAR',
	MEDIANE: 'MEDIAN',
	MODE: 'MODE',

	// Logic functions
	SI: 'IF',
	ET: 'AND',
	OU: 'OR',
	NON: 'NOT',
	VRAI: 'TRUE',
	FAUX: 'FALSE',
	SIERREUR: 'IFERROR',
	ESTVIDE: 'ISBLANK',
	ESTNUM: 'ISNUMBER',
	ESTTEXTE: 'ISTEXT',
	ESTERREUR: 'ISERROR',

	// Text functions
	CONCATENER: 'CONCATENATE',
	CONCAT: 'CONCAT',
	GAUCHE: 'LEFT',
	DROITE: 'RIGHT',
	NBCAR: 'LEN',
	MAJUSCULE: 'UPPER',
	MINUSCULE: 'LOWER',
	NOMPROPRE: 'PROPER',
	SUPPRESPACE: 'TRIM',
	TEXTE: 'TEXT',
	CHERCHE: 'SEARCH',
	TROUVE: 'FIND',
	SUBSTITUE: 'SUBSTITUTE',
	REMPLACER: 'REPLACE',
	STXT: 'MID',

	// Date functions (basic)
	AUJOURDHUI: 'TODAY',
	MAINTENANT: 'NOW',
	ANNEE: 'YEAR',
	MOIS: 'MONTH',
	JOUR: 'DAY',

	// Lookup functions (basic)
	RECHERCHEV: 'VLOOKUP',
	RECHERCHEH: 'HLOOKUP',
	INDEX: 'INDEX',
	EQUIV: 'MATCH'
};

/**
 * Set of all canonical (English) function names
 *
 * This includes both direct English names and any English names
 * that are targets of French aliases.
 */
export const CANONICAL_FUNCTIONS: ReadonlySet<string> = new Set([
	// Math
	'SUM',
	'AVERAGE',
	'COUNT',
	'COUNTA',
	'COUNTBLANK',
	'ROUND',
	'SQRT',
	'POWER',
	'MOD',
	'INT',
	'CEILING',
	'FLOOR',
	'ABS',
	'MIN',
	'MAX',
	'PRODUCT',
	'RAND',
	'RANDBETWEEN',
	'SIGN',
	'TRUNC',
	'LOG',
	'LOG10',
	'EXP',
	'LN',
	'PI',

	// Trigonometric
	'SIN',
	'COS',
	'TAN',
	'ASIN',
	'ACOS',
	'ATAN',

	// Statistical
	'STDEV',
	'VAR',
	'MEDIAN',
	'MODE',

	// Logic
	'IF',
	'AND',
	'OR',
	'NOT',
	'TRUE',
	'FALSE',
	'IFERROR',
	'ISBLANK',
	'ISNUMBER',
	'ISTEXT',
	'ISERROR',

	// Text
	'CONCATENATE',
	'CONCAT',
	'LEFT',
	'RIGHT',
	'LEN',
	'UPPER',
	'LOWER',
	'PROPER',
	'TRIM',
	'TEXT',
	'SEARCH',
	'FIND',
	'SUBSTITUTE',
	'REPLACE',
	'MID',

	// Date
	'TODAY',
	'NOW',
	'YEAR',
	'MONTH',
	'DAY',

	// Lookup
	'VLOOKUP',
	'HLOOKUP',
	'INDEX',
	'MATCH'
]);

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Normalize a function name to its canonical English form
 *
 * This function:
 * 1. Converts to uppercase
 * 2. Looks up French alias if it exists
 * 3. Returns the canonical name or the original (uppercased) if no alias
 *
 * @param name - The function name to normalize
 * @returns The canonical English function name (uppercase)
 *
 * @example
 * normalizeFunction('somme')  // Returns 'SUM'
 * normalizeFunction('SUM')    // Returns 'SUM'
 * normalizeFunction('sum')    // Returns 'SUM'
 * normalizeFunction('MOYENNE') // Returns 'AVERAGE'
 */
export function normalizeFunction(name: string): string {
	const upper = name.toUpperCase();
	return FUNCTION_ALIASES[upper] ?? upper;
}

/**
 * Check if a name is a known function (either alias or canonical)
 *
 * @param name - The function name to check (case-insensitive)
 * @returns true if the function is known, false otherwise
 *
 * @example
 * isFunctionName('SUM')     // Returns true
 * isFunctionName('somme')   // Returns true
 * isFunctionName('UNKNOWN') // Returns false
 */
export function isFunctionName(name: string): boolean {
	const upper = name.toUpperCase();
	// Check if it's a French alias
	if (upper in FUNCTION_ALIASES) {
		return true;
	}
	// Check if it's a canonical English name
	return CANONICAL_FUNCTIONS.has(upper);
}

/**
 * Get all supported function names (canonical English names only)
 *
 * @returns Array of all canonical function names, sorted alphabetically
 *
 * @example
 * getSupportedFunctions() // Returns ['ABS', 'ACOS', 'AND', ...]
 */
export function getSupportedFunctions(): string[] {
	return Array.from(CANONICAL_FUNCTIONS).sort();
}

/**
 * Get all French aliases for functions
 *
 * @returns Array of all French function aliases, sorted alphabetically
 *
 * @example
 * getFrenchAliases() // Returns ['ALEA', 'ARRONDI', 'CHERCHE', ...]
 */
export function getFrenchAliases(): string[] {
	return Object.keys(FUNCTION_ALIASES).sort();
}

/**
 * Get the French alias for an English function name, if one exists
 *
 * @param englishName - The canonical English function name
 * @returns The French alias if one exists, undefined otherwise
 *
 * @example
 * getFrenchAlias('SUM')     // Returns 'SOMME'
 * getFrenchAlias('ABS')     // Returns undefined (no French alias)
 */
export function getFrenchAlias(englishName: string): string | undefined {
	const upper = englishName.toUpperCase();
	for (const [french, english] of Object.entries(FUNCTION_ALIASES)) {
		if (english === upper) {
			return french;
		}
	}
	return undefined;
}
