/**
 * Constraint Validators
 * =====================
 *
 * Check if mathematically correct answers are written in proper form.
 * These validators check the raw student input (LaTeX from MathLive),
 * not canonical equivalence.
 *
 * Each validator returns an array of indices where violations were found,
 * supporting questions with multiple answers.
 *
 * @module questions/constraint-validators
 */

// ============================================================================
// SPACING VALIDATOR
// ============================================================================

/**
 * Check for incorrect digit spacing in numbers
 *
 * French format uses thin spaces to group digits:
 * - Integer part: groups of 3 from right (1 234 567)
 * - Decimal part: groups of 3 from left after separator (0,123 456)
 *
 * Valid spacing characters: regular space, LaTeX thin space (\,)
 *
 * Violations detected:
 * - 4+ consecutive digits without spacing
 * - Incorrect space positions (not aligned to groups of 3)
 *
 * @param answersLatex - Array of LaTeX strings from MathLive
 * @returns Indices of answers with spacing violations
 *
 * @example
 * checkSpaces(['1234'])      // Returns [] - 4 digits OK without space (French convention)
 * checkSpaces(['12345'])     // Returns [0] - 5+ digits needs spacing
 * checkSpaces(['1 234'])     // Returns [] - correct spacing
 * checkSpaces(['1\\,234'])   // Returns [] - LaTeX thin space is valid
 * checkSpaces(['123'])       // Returns [] - 3 digits OK without space
 * checkSpaces(['0,12345'])   // Returns [0] - decimal part with 5+ digits needs spacing
 */
export function checkSpaces(answersLatex: string[]): number[] {
	const violations: number[] = [];

	for (let i = 0; i < answersLatex.length; i++) {
		const latex = answersLatex[i];

		// Skip empty strings
		if (!latex || latex.trim() === '') {
			continue;
		}

		if (hasSpacingViolation(latex)) {
			violations.push(i);
		}
	}

	return violations;
}

/**
 * Check if a single LaTeX string has spacing violations
 */
function hasSpacingViolation(latex: string): boolean {
	// Normalize LaTeX thin space (\,) to regular space for analysis
	// Also handle {,} which is French decimal separator in LaTeX
	let normalized = latex.replace(/\\,/g, ' ');

	// Replace {,} with a placeholder decimal separator
	// This is the French decimal comma in LaTeX
	normalized = normalized.replace(/\{,\}/g, '.');

	// Also handle simple comma as decimal separator (common in French input)
	// But only when it's clearly a decimal comma (digit,digit pattern)
	// Note: This assumes input is pure numbers, not function calls like f(1,2)
	normalized = normalized.replace(/(\d),(\d)/g, '$1.$2');

	// Extract all number sequences (with potential spaces and decimal points)
	// Pattern matches: optional minus, digits with optional spaces, optional decimal part
	const numberPattern = /-?\d[\d\s]*(?:\.\d[\d\s]*)?/g;
	const matches = normalized.match(numberPattern);

	if (!matches) {
		return false;
	}

	for (const match of matches) {
		// Split by decimal point
		const parts = match.replace(/^-/, '').split('.');
		const integerPart = parts[0] || '';
		const decimalPart = parts[1] || '';

		// Check integer part: should have spaces creating groups of 3 from right
		if (hasIntegerSpacingViolation(integerPart)) {
			return true;
		}

		// Check decimal part: should have spaces creating groups of 3 from left
		if (hasDecimalSpacingViolation(decimalPart)) {
			return true;
		}
	}

	return false;
}

/**
 * Check integer part for spacing violations
 * Groups of 3 from right: 1 234 567
 */
function hasIntegerSpacingViolation(integerPart: string): boolean {
	// Remove existing spaces to get pure digits
	const digits = integerPart.replace(/\s/g, '');

	// 4 or fewer digits: no spacing required
	if (digits.length <= 4) {
		// But if there ARE spaces, they should be correct
		if (integerPart.includes(' ')) {
			// Verify spacing is at correct positions
			return !isCorrectIntegerSpacing(integerPart);
		}
		return false;
	}

	// 5+ digits: spacing is required
	if (!integerPart.includes(' ')) {
		return true; // Missing required spacing
	}

	// Verify spacing is at correct positions
	return !isCorrectIntegerSpacing(integerPart);
}

/**
 * Verify integer spacing is correct (groups of 3 from right)
 */
function isCorrectIntegerSpacing(integerPart: string): boolean {
	const digits = integerPart.replace(/\s/g, '');

	// Build expected format with spaces
	const groups: string[] = [];
	for (let i = digits.length; i > 0; i -= 3) {
		const start = Math.max(0, i - 3);
		groups.unshift(digits.slice(start, i));
	}
	const expected = groups.join(' ');

	// Normalize actual spacing (collapse multiple spaces)
	const actual = integerPart.replace(/\s+/g, ' ').trim();

	return actual === expected;
}

/**
 * Check decimal part for spacing violations
 * Groups of 3 from left: 123 456
 */
function hasDecimalSpacingViolation(decimalPart: string): boolean {
	if (!decimalPart) {
		return false;
	}

	// Remove existing spaces to get pure digits
	const digits = decimalPart.replace(/\s/g, '');

	// 4 or fewer digits: no spacing required
	if (digits.length <= 4) {
		// But if there ARE spaces, they should be correct
		if (decimalPart.includes(' ')) {
			return !isCorrectDecimalSpacing(decimalPart);
		}
		return false;
	}

	// 5+ digits: spacing is required
	if (!decimalPart.includes(' ')) {
		return true;
	}

	return !isCorrectDecimalSpacing(decimalPart);
}

/**
 * Verify decimal spacing is correct (groups of 3 from left)
 */
function isCorrectDecimalSpacing(decimalPart: string): boolean {
	const digits = decimalPart.replace(/\s/g, '');

	// Build expected format with spaces (groups of 3 from left)
	const groups: string[] = [];
	for (let i = 0; i < digits.length; i += 3) {
		groups.push(digits.slice(i, i + 3));
	}
	const expected = groups.join(' ');

	const actual = decimalPart.replace(/\s+/g, ' ').trim();

	return actual === expected;
}

// ============================================================================
// PRODUCTS VALIDATOR
// ============================================================================

/**
 * Check for explicit multiplication symbols that should be implicit
 *
 * In mathematical notation, multiplication before a variable or parenthesis
 * should typically be implicit (2x not 2*x).
 *
 * Violations: \times, \cdot, \ast, * when used before a variable or parenthesis
 * Valid: 2x3 (number x number), or explicit when both operands are numbers
 *
 * @param answersLatex - Array of LaTeX strings
 * @returns Indices of answers with explicit multiplication violations
 *
 * @example
 * checkProducts(['2\\times x'])   // Returns [0] - should be 2x
 * checkProducts(['2x'])           // Returns [] - implicit is correct
 * checkProducts(['2\\times 3'])   // Returns [] - number x number is OK
 * checkProducts(['2\\cdot x'])    // Returns [0] - should be implicit
 * checkProducts(['a\\times b'])   // Returns [0] - variable x variable should be implicit
 * checkProducts(['(x+1)\\times y']) // Returns [0] - should be implicit
 */
export function checkProducts(answersLatex: string[]): number[] {
	const violations: number[] = [];

	for (let i = 0; i < answersLatex.length; i++) {
		const latex = answersLatex[i];

		if (!latex || latex.trim() === '') {
			continue;
		}

		if (hasProductViolation(latex)) {
			violations.push(i);
		}
	}

	return violations;
}

/**
 * Check if a single LaTeX string has product notation violations
 */
function hasProductViolation(latex: string): boolean {
	// Pattern for multiplication symbols
	const multSymbols = /\\times|\\cdot|\\ast|\*/g;

	// Find all multiplication symbols
	let match: RegExpExecArray | null;
	while ((match = multSymbols.exec(latex)) !== null) {
		const pos = match.index;
		const symbolLength = match[0].length;

		// Get what comes after the symbol (skip whitespace)
		const afterSymbol = latex.slice(pos + symbolLength).replace(/^\s*/, '');

		// Check if followed by a letter (variable), opening paren, or LaTeX command for letter
		// Variables: a-z, A-Z, Greek letters (\alpha, \beta, etc.)
		// Parentheses: (, \left(, [, \left[, {
		if (isFollowedByVariableOrParen(afterSymbol)) {
			return true;
		}
	}

	return false;
}

/**
 * Check if string starts with a variable or opening parenthesis
 */
function isFollowedByVariableOrParen(str: string): boolean {
	if (!str) return false;

	// Check for letter (variable)
	if (/^[a-zA-Z]/.test(str)) {
		return true;
	}

	// Check for opening parenthesis/bracket
	// Note: We don't check for { as it's usually LaTeX grouping (\frac{}, etc.)
	if (/^[([]/.test(str)) {
		return true;
	}

	// Check for \left( or \left[
	if (/^\\left[([]/.test(str)) {
		return true;
	}

	// Check for Greek letters
	if (
		/^\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)/i.test(
			str
		)
	) {
		return true;
	}

	return false;
}

// ============================================================================
// BRACKETS VALIDATOR
// ============================================================================

/**
 * Check for unnecessary brackets in student's raw answer
 *
 * NOT using CE canonical form comparison - checking actual student input.
 *
 * Unnecessary brackets detected:
 * - Single number in brackets: (5), (-5) unless allowFirstNegative
 * - Single variable in brackets: (x)
 * - Double brackets: ((x+1))
 * - First negative term in brackets at start: (-5)+3 (unless allowed)
 *
 * @param answersLatex - Array of LaTeX strings
 * @param options.allowFirstNegative - Allow brackets around first negative term
 * @returns Indices of answers with unnecessary brackets
 *
 * @example
 * checkBrackets(['(5)'])                                // Returns [0]
 * checkBrackets(['(-5)+3'], {allowFirstNegative:true})  // Returns []
 * checkBrackets(['(-5)+3'], {allowFirstNegative:false}) // Returns [0]
 * checkBrackets(['(x+1)'])                              // Returns [] - necessary
 * checkBrackets(['((x+1))'])                            // Returns [0] - double brackets
 * checkBrackets(['(x)'])                                // Returns [0] - single variable
 */
export function checkBrackets(
	answersLatex: string[],
	options: { allowFirstNegative?: boolean } = {}
): number[] {
	const { allowFirstNegative = false } = options;
	const violations: number[] = [];

	for (let i = 0; i < answersLatex.length; i++) {
		const latex = answersLatex[i];

		if (!latex || latex.trim() === '') {
			continue;
		}

		if (hasBracketViolation(latex, allowFirstNegative)) {
			violations.push(i);
		}
	}

	return violations;
}

/**
 * Check if a single LaTeX string has unnecessary bracket violations
 */
function hasBracketViolation(latex: string, allowFirstNegative: boolean): boolean {
	// Normalize \left( and \right) to regular parentheses
	let normalized = latex.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
	normalized = normalized.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']');

	// Check for double brackets: ((...))
	if (/\(\s*\([^)]*\)\s*\)/.test(normalized)) {
		return true;
	}

	// Check for single number in brackets: (5), (123), (-5)
	// But NOT expressions like (5+3) or (5x)
	const singleNumberPattern = /\(\s*-?\d+(?:\.\d+)?\s*\)/g;
	let match: RegExpExecArray | null;

	while ((match = singleNumberPattern.exec(normalized)) !== null) {
		const matchedStr = match[0];
		const isNegative = matchedStr.includes('-');
		const isAtStart = match.index === 0;

		// If it's a negative number at the start and allowFirstNegative is true, skip
		if (isNegative && isAtStart && allowFirstNegative) {
			continue;
		}

		// Otherwise, it's a violation
		return true;
	}

	// Check for single variable in brackets: (x), (y), (\alpha)
	// Single letter variable
	if (/\(\s*[a-zA-Z]\s*\)/.test(normalized)) {
		return true;
	}

	// Greek letter variable
	if (
		/\(\s*\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)\s*\)/i.test(
			normalized
		)
	) {
		return true;
	}

	return false;
}

// ============================================================================
// ZEROS VALIDATOR
// ============================================================================

/**
 * Check for unnecessary leading or trailing zeros
 *
 * Violations:
 * - Leading zeros: 01, 007 (but 0, 0.5 are valid)
 * - Trailing decimal zeros: 1.0, 1.20 (but 1.02 is valid)
 *
 * @param answers - Array of answer strings (plain text, not LaTeX)
 * @returns Indices of answers with unnecessary zeros
 *
 * @example
 * checkZeros(['01'])     // Returns [0] - leading zero
 * checkZeros(['0'])      // Returns [] - valid
 * checkZeros(['0.5'])    // Returns [] - valid
 * checkZeros(['0,5'])    // Returns [] - valid (French format)
 * checkZeros(['1.0'])    // Returns [0] - trailing zero
 * checkZeros(['1.02'])   // Returns [] - valid (0 is meaningful)
 * checkZeros(['1.20'])   // Returns [0] - trailing zero
 * checkZeros(['007'])    // Returns [0] - leading zeros
 */
export function checkZeros(answers: string[]): number[] {
	const violations: number[] = [];

	for (let i = 0; i < answers.length; i++) {
		const answer = answers[i];

		if (!answer || answer.trim() === '') {
			continue;
		}

		if (hasZeroViolation(answer)) {
			violations.push(i);
		}
	}

	return violations;
}

/**
 * Check if a single string has unnecessary zero violations
 */
function hasZeroViolation(answer: string): boolean {
	// Normalize French comma to period for analysis
	const normalized = answer.replace(/,/g, '.');

	// Extract numbers from the string (handles expressions like "5+3")
	const numberPattern = /-?\d+(?:\.\d+)?/g;
	const matches = normalized.match(numberPattern);

	if (!matches) {
		return false;
	}

	for (const numStr of matches) {
		const isNegative = numStr.startsWith('-');
		const absNumStr = isNegative ? numStr.slice(1) : numStr;

		// Check for leading zeros: 01, 007, etc.
		// Valid: 0, 0.5 (zero before decimal)
		// Invalid: 01, 007, 00.5
		if (/^0\d/.test(absNumStr)) {
			return true;
		}

		// Check for trailing decimal zeros: 1.0, 1.20
		// Valid: 1.02 (zero in middle), 10, 100 (not decimals)
		if (absNumStr.includes('.')) {
			const decimalPart = absNumStr.split('.')[1];
			if (decimalPart && decimalPart.endsWith('0')) {
				return true;
			}
		}
	}

	return false;
}

// ============================================================================
// FORM VALIDATOR
// ============================================================================

/**
 * Check if answer matches expected form exactly (strict form check)
 *
 * For cases where we need the exact written form, not just mathematical equivalence.
 * Uses string comparison after whitespace normalization.
 *
 * @param answersLatex - Array of user's LaTeX answers
 * @param expectedLatex - Array of expected LaTeX forms
 * @param options.strictForm - If true, require exact match
 * @returns Indices of answers that don't match expected form
 *
 * @example
 * checkForm(['x+1'], ['1+x'], {strictForm: true})   // Returns [0] - different order
 * checkForm(['x+1'], ['x+1'], {strictForm: true})   // Returns [] - exact match
 * checkForm(['x + 1'], ['x+1'], {strictForm: true}) // Returns [] - whitespace normalized
 * checkForm(['x+1'], ['1+x'])                       // Returns [] - strictForm defaults to false
 */
export function checkForm(
	answersLatex: string[],
	expectedLatex: string[],
	options: { strictForm?: boolean } = {}
): number[] {
	const { strictForm = false } = options;

	// If strictForm is not enabled, no violations
	if (!strictForm) {
		return [];
	}

	const violations: number[] = [];

	// Compare each answer with corresponding expected
	const maxLength = Math.max(answersLatex.length, expectedLatex.length);

	for (let i = 0; i < maxLength; i++) {
		const userAnswer = answersLatex[i];
		const expected = expectedLatex[i];

		// Missing answer or expected value
		if (userAnswer === undefined || expected === undefined) {
			violations.push(i);
			continue;
		}

		// Normalize and compare
		const normalizedUser = normalizeForFormComparison(userAnswer);
		const normalizedExpected = normalizeForFormComparison(expected);

		if (normalizedUser !== normalizedExpected) {
			violations.push(i);
		}
	}

	return violations;
}

/**
 * Normalize LaTeX string for form comparison
 *
 * - Remove extra whitespace
 * - Normalize certain LaTeX constructs
 */
function normalizeForFormComparison(latex: string): string {
	return (
		latex
			// Collapse multiple spaces to single space
			.replace(/\s+/g, ' ')
			// Remove spaces around operators for consistent comparison
			.replace(/\s*([+\-*/=<>])\s*/g, '$1')
			// Trim
			.trim()
	);
}

// ============================================================================
// COMPUTE ENGINE BASED VALIDATORS
// ============================================================================

import { ComputeEngine } from '@cortex-js/compute-engine';

/**
 * Shared Compute Engine instance for constraint validation
 */
let ceInstance: ComputeEngine | null = null;

/**
 * Get or create Compute Engine instance
 */
function getCE(): ComputeEngine {
	if (!ceInstance) {
		ceInstance = new ComputeEngine();
	}
	return ceInstance;
}

/**
 * Check if an argument represents zero (either direct 0 or ["Negate", 0])
 * This handles both x+0 and x-0 (parsed as x+["Negate",0])
 */
function isZeroOrNegateZero(arg: unknown): boolean {
	if (arg === 0) return true;
	if (Array.isArray(arg) && arg[0] === 'Negate' && arg[1] === 0) return true;
	return false;
}

/**
 * Recursively check if a MathJSON expression contains an Add with 0
 * Also handles x-0 which CE parses as ["Add", "x", ["Negate", 0]]
 */
function hasAddWithZero(json: unknown): boolean {
	if (!Array.isArray(json)) return false;
	const [head, ...args] = json;

	// Check if this is an Add with 0 or ["Negate", 0] in its arguments
	if (head === 'Add' && args.some(isZeroOrNegateZero)) {
		return true;
	}

	// Recursively check nested expressions
	return args.some((arg) => hasAddWithZero(arg));
}

/**
 * Check for null terms in an expression (x+0, x-0, y+0+z)
 *
 * Parses without canonization to preserve the original form,
 * then inspects the MathJSON for Add/Subtract expressions containing 0.
 *
 * @param answersLatex - Array of LaTeX strings
 * @returns Indices of answers with null term violations
 *
 * @example
 * checkNullTerms(['x+0'])       // Returns [0] - has null term
 * checkNullTerms(['x-0'])       // Returns [0] - subtracting zero
 * checkNullTerms(['x+1'])       // Returns [] - no null term
 * checkNullTerms(['3+0+y'])     // Returns [0] - has null term
 * checkNullTerms(['0'])         // Returns [] - just zero, not a null term
 */
export function checkNullTerms(answersLatex: string[]): number[] {
	const violations: number[] = [];
	const ce = getCE();

	for (let i = 0; i < answersLatex.length; i++) {
		const latex = answersLatex[i];
		if (!latex?.trim()) continue;

		try {
			// Parse without canonization to preserve original form
			const expr = ce.parse(latex, { canonical: false });
			if (hasAddWithZero(expr.json)) {
				violations.push(i);
			}
		} catch {
			// Skip invalid LaTeX
		}
	}

	return violations;
}

/**
 * Recursively check if a MathJSON expression contains a Multiply with 1
 * Also handles InvisibleOperator (implicit multiplication like 1x)
 */
function hasMultiplyWithOne(json: unknown): boolean {
	if (!Array.isArray(json)) return false;
	const [head, ...args] = json;

	// Check if this is a Multiply with 1 in its arguments
	if (head === 'Multiply' && args.some((arg) => arg === 1)) {
		return true;
	}

	// Check if this is an InvisibleOperator (implicit multiplication) with 1
	// e.g., 1x is parsed as ["InvisibleOperator", 1, "x"]
	if (head === 'InvisibleOperator' && args.some((arg) => arg === 1)) {
		return true;
	}

	// Recursively check nested expressions
	return args.some((arg) => hasMultiplyWithOne(arg));
}

/**
 * Check for factor one in an expression (1*x, x*1, 1x)
 *
 * Parses without canonization to preserve the original form,
 * then inspects the MathJSON for Multiply/InvisibleOperator expressions containing 1.
 *
 * @param answersLatex - Array of LaTeX strings
 * @returns Indices of answers with factor one violations
 *
 * @example
 * checkFactorOne(['1\\times x'])  // Returns [0] - has factor one
 * checkFactorOne(['1x'])          // Returns [0] - implicit factor one
 * checkFactorOne(['2x'])          // Returns [] - no factor one
 * checkFactorOne(['x*1*y'])       // Returns [0] - has factor one
 * checkFactorOne(['1'])           // Returns [] - just one, not factor one
 */
export function checkFactorOne(answersLatex: string[]): number[] {
	const violations: number[] = [];
	const ce = getCE();

	for (let i = 0; i < answersLatex.length; i++) {
		const latex = answersLatex[i];
		if (!latex?.trim()) continue;

		try {
			// Parse without canonization to preserve original form
			const expr = ce.parse(latex, { canonical: false });
			if (hasMultiplyWithOne(expr.json)) {
				violations.push(i);
			}
		} catch {
			// Skip invalid LaTeX
		}
	}

	return violations;
}

/**
 * Recursively check if a MathJSON expression contains a Multiply with 0
 */
function hasMultiplyWithZero(json: unknown): boolean {
	if (!Array.isArray(json)) return false;
	const [head, ...args] = json;

	// Check if this is a Multiply with 0 in its arguments
	if (head === 'Multiply' && args.some((arg) => arg === 0)) {
		return true;
	}

	// Recursively check nested expressions
	return args.some((arg) => hasMultiplyWithZero(arg));
}

/**
 * Check for factor zero in an expression (0*x, x*0)
 *
 * Parses without canonization to preserve the original form,
 * then inspects the MathJSON for Multiply expressions containing 0.
 *
 * Note: This is typically an error since 0*x = 0, but checking separately
 * allows more specific feedback.
 *
 * @param answersLatex - Array of LaTeX strings
 * @returns Indices of answers with factor zero violations
 *
 * @example
 * checkFactorZero(['0\\times x'])  // Returns [0] - has factor zero
 * checkFactorZero(['0'])           // Returns [] - just zero
 * checkFactorZero(['x*0*y'])       // Returns [0] - has factor zero
 */
export function checkFactorZero(answersLatex: string[]): number[] {
	const violations: number[] = [];
	const ce = getCE();

	for (let i = 0; i < answersLatex.length; i++) {
		const latex = answersLatex[i];
		if (!latex?.trim()) continue;

		try {
			// Parse without canonization to preserve original form
			const expr = ce.parse(latex, { canonical: false });
			if (hasMultiplyWithZero(expr.json)) {
				violations.push(i);
			}
		} catch {
			// Skip invalid LaTeX
		}
	}

	return violations;
}

/**
 * Check if a MathJSON argument is a Negate (possibly wrapped in Delimiter)
 */
function isNegateArg(arg: unknown): boolean {
	if (!Array.isArray(arg)) return false;
	const [head, inner] = arg;

	// Direct Negate
	if (head === 'Negate') return true;

	// Delimiter wrapping a Negate: ["Delimiter", ["Negate", ...]]
	if (head === 'Delimiter' && Array.isArray(inner) && inner[0] === 'Negate') {
		return true;
	}

	return false;
}

/**
 * Count negatives in a Multiply/InvisibleOperator expression
 * Returns the count of negated factors
 */
function countNegatesInMultiply(json: unknown): number {
	if (!Array.isArray(json)) return 0;
	const [head, ...args] = json;

	if (head === 'Multiply' || head === 'InvisibleOperator') {
		return args.filter(isNegateArg).length;
	}

	return 0;
}

/**
 * Recursively check if any Multiply/InvisibleOperator has 2+ negatives
 * (sign parity issue: (-a)*(-b) can be simplified to a*b)
 */
function hasMultipleNegatesInMultiply(json: unknown): boolean {
	if (!Array.isArray(json)) return false;
	const [head, ...args] = json;

	// Check this level
	if ((head === 'Multiply' || head === 'InvisibleOperator') && countNegatesInMultiply(json) >= 2) {
		return true;
	}

	// Recursively check nested expressions
	return args.some((arg) => hasMultipleNegatesInMultiply(arg));
}

/**
 * Check for extraneous signs in an expression (+x, --x, ++, sign parity)
 *
 * Detects patterns like:
 * - Leading plus sign on variables: +x, +a
 * - Double signs: ++, --, +-, -+
 * - Sign parity in multiplication: (-a)*(-b) can be simplified to a*b
 *
 * Uses both regex (for textual patterns) and CE (for sign parity).
 *
 * @param answersLatex - Array of LaTeX strings
 * @returns Indices of answers with extraneous sign violations
 *
 * @example
 * checkSigns(['+x'])                  // Returns [0] - extraneous +
 * checkSigns(['--5'])                 // Returns [0] - double negative
 * checkSigns(['x+-3'])                // Returns [0] - +- signs
 * checkSigns(['(-2)\\times(-3)'])     // Returns [0] - sign parity
 * checkSigns(['-x'])                  // Returns [] - valid negative
 * checkSigns(['x+3'])                 // Returns [] - normal addition
 */
export function checkSigns(answersLatex: string[]): number[] {
	const violations: number[] = [];
	const ce = getCE();

	for (let i = 0; i < answersLatex.length; i++) {
		const latex = answersLatex[i];
		if (!latex?.trim()) continue;

		// Detect extraneous signs using regex
		// Pattern matches:
		// - Double signs: ++, --, +-, -+
		// - Leading + before letter: +x, +a (but not +5)
		if (/\+\+|--|\+-|-\+|^\s*\+[a-zA-Z]/.test(latex)) {
			violations.push(i);
			continue;
		}

		// Check for sign parity using CE
		// e.g., (-2)*(-3) has 2 negatives that could be simplified
		try {
			const expr = ce.parse(latex, { canonical: false });
			if (hasMultipleNegatesInMultiply(expr.json)) {
				violations.push(i);
			}
		} catch {
			// Skip invalid LaTeX
		}
	}

	return violations;
}

// ============================================================================
// REDUCED FRACTIONS VALIDATOR
// ============================================================================

/**
 * Check if fractions are reduced to their lowest terms
 *
 * Uses Compute Engine's canonical form to detect reducible fractions.
 * CE automatically reduces fractions when canonicalizing, so comparing
 * raw vs canonical LaTeX output reveals non-reduced fractions.
 *
 * Works with:
 * - Simple numeric fractions: 2/4 → 1/2
 * - Negative fractions: -4/6 → -2/3
 * - Fractions with variables: 2x/4 → x/2
 * - Expressions containing fractions: 1 + 2/4
 *
 * @param answersLatex - Array of LaTeX strings
 * @returns Indices of answers with non-reduced fractions
 *
 * @example
 * checkReducedFractions(['\\frac{2}{4}'])    // Returns [0] - can be reduced to 1/2
 * checkReducedFractions(['\\frac{1}{2}'])    // Returns [] - already reduced
 * checkReducedFractions(['\\frac{6}{9}'])    // Returns [0] - can be reduced to 2/3
 * checkReducedFractions(['\\frac{10}{5}'])   // Returns [0] - can be reduced to 2
 * checkReducedFractions(['\\frac{-4}{6}'])   // Returns [0] - can be reduced to -2/3
 * checkReducedFractions(['\\frac{2x}{4}'])   // Returns [0] - can be reduced to x/2
 * checkReducedFractions(['\\frac{3}{7}'])    // Returns [] - already reduced
 * checkReducedFractions(['2'])               // Returns [] - not a fraction
 */
export function checkReducedFractions(answersLatex: string[]): number[] {
	const violations: number[] = [];
	const ce = getCE();

	for (let i = 0; i < answersLatex.length; i++) {
		const latex = answersLatex[i];
		if (!latex?.trim()) continue;

		// Quick check: skip if no fraction in the answer
		if (!latex.includes('\\frac')) continue;

		try {
			// Parse without canonization to preserve original form
			const rawExpr = ce.parse(latex, { canonical: false });
			// Parse with canonization (default) - CE will reduce fractions
			const canonExpr = ce.parse(latex);

			// Compare LaTeX output - if different, fraction was not reduced
			if (rawExpr.latex !== canonExpr.latex) {
				violations.push(i);
			}
		} catch {
			// Skip invalid LaTeX
		}
	}

	return violations;
}
