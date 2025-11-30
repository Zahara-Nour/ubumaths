/**
 * Symbol and function mappings for ASCIIMath to LaTeX conversion
 *
 * This module provides lookup tables for Greek letters, functions,
 * and special symbols. Symbols are ordered by length (longest first)
 * to prevent conflicts during lexing.
 */

/**
 * Greek letter mappings from ASCIIMath to LaTeX
 */
export const GREEK_LETTERS: Record<string, string> = {
	// Lowercase Greek letters
	alpha: '\\alpha',
	beta: '\\beta',
	gamma: '\\gamma',
	delta: '\\delta',
	epsilon: '\\epsilon',
	varepsilon: '\\varepsilon',
	zeta: '\\zeta',
	eta: '\\eta',
	theta: '\\theta',
	vartheta: '\\vartheta',
	iota: '\\iota',
	kappa: '\\kappa',
	lambda: '\\lambda',
	mu: '\\mu',
	nu: '\\nu',
	xi: '\\xi',
	pi: '\\pi',
	rho: '\\rho',
	sigma: '\\sigma',
	tau: '\\tau',
	upsilon: '\\upsilon',
	phi: '\\phi',
	varphi: '\\varphi',
	chi: '\\chi',
	psi: '\\psi',
	omega: '\\omega',

	// Uppercase Greek letters
	Gamma: '\\Gamma',
	Delta: '\\Delta',
	Theta: '\\Theta',
	Lambda: '\\Lambda',
	Xi: '\\Xi',
	Pi: '\\Pi',
	Sigma: '\\Sigma',
	Upsilon: '\\Upsilon',
	Phi: '\\Phi',
	Psi: '\\Psi',
	Omega: '\\Omega'
};

/**
 * Function names recognized by the parser
 */
export const FUNCTIONS = new Set<string>([
	// Trigonometric functions
	'sin',
	'cos',
	'tan',

	// Logarithmic and exponential
	'log',
	'ln',
	'exp',

	// Special functions
	'sqrt',
	'root',
	'abs'
]);

/**
 * Special symbol mappings from ASCIIMath to LaTeX
 *
 * IMPORTANT: Symbols are ordered by length (longest first) to ensure
 * proper matching during lexing. For example, 'notin' must come before 'in'
 * to prevent 'notin' from being tokenized as 'not' + 'in'.
 */
export const SYMBOLS: Record<string, string> = {
	// Arrows (longer first)
	'<=>': '\\Leftrightarrow',
	'<->': '\\leftrightarrow',
	'=>': '\\Rightarrow',
	'->': '\\to',

	// Relations (longer first)
	'<<': '\\ll',
	'>>': '\\gg',
	'<=': '\\leq',
	'>=': '\\geq',
	'!=': '\\neq',
	'-=': '\\equiv',
	'~~': '\\approx',

	// Infinity and special values
	oo: '\\infty',

	// Plus-minus
	'+-': '\\pm',
	'-+': '\\mp',

	// Multiplication
	times: '\\times',
	cdot: '\\cdot',
	'*': '\\times',

	// Division
	div: '\\div',

	// Other relations
	'~': '\\sim',
	prop: '\\propto'
};

/**
 * Get all symbol keys sorted by length (longest first)
 * This ensures proper matching during lexing
 */
export function getSymbolKeys(): string[] {
	return Object.keys(SYMBOLS).sort((a, b) => b.length - a.length);
}

/**
 * Check if a string is a Greek letter
 */
export function isGreekLetter(str: string): boolean {
	return str in GREEK_LETTERS;
}

/**
 * Check if a string is a recognized function
 */
export function isFunction(str: string): boolean {
	return FUNCTIONS.has(str);
}

/**
 * Check if a string is a special symbol
 */
export function isSymbol(str: string): boolean {
	return str in SYMBOLS;
}

/**
 * Get the LaTeX representation of a Greek letter
 * Returns undefined if not a Greek letter
 */
export function getGreekLatex(str: string): string | undefined {
	return GREEK_LETTERS[str];
}

/**
 * Get the LaTeX representation of a symbol
 * Returns undefined if not a recognized symbol
 */
export function getSymbolLatex(str: string): string | undefined {
	return SYMBOLS[str];
}
