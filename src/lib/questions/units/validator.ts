/**
 * Unit System - Answer Validation
 * =================================
 *
 * Provides answer validation functionality for quantity answers,
 * comparing user input with expected answers while accounting for:
 * - Unit conversions (e.g., 1 km = 1000 m)
 * - Numeric precision (PrecisionType from question types)
 * - Required unit enforcement (exact symbol match)
 *
 * @module questions/units/validator
 */

import { parseLatexQuantity, extractUnitFromLatex, parseUnitExpression } from './parser';
import { unitWritingProblem } from '$lib/mathAST/units/parser';
import {
	UNIT_FEEDBACK,
	ambiguousUnitMessage,
	requiredUnitMessage,
	unknownUnitMessage
} from './feedback';
import { normalizeStudentQuantity } from './student-input';
import { readCompositeDuration, type DurationFormIssue } from './composite-duration';
import { compareQuantities, type Tolerance } from './ce-integration';
import { isDuration, unitsAreCompatible } from './operations';
import type { PrecisionType } from '$lib/questions/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of answer validation
 */
export interface ValidationResult {
	isCorrect: boolean;
	feedback: string | null;
	errorType?: 'invalid_input' | 'incompatible_units' | 'wrong_unit' | 'wrong_value' | 'wrong_both';
	/**
	 * Vrai quand c'est l'UNITÉ qui est en cause (grandeur différente, unité
	 * oubliée, unité imposée non utilisée, écriture ambiguë ou inconnue) :
	 * `feedback` porte alors un message destiné à l'élève (`./feedback`).
	 */
	unitAtFault?: boolean;
	/**
	 * Vrai quand c'est l'ÉCRITURE de la durée composée qui est en cause, pas
	 * l'unité (« 2,5 h 15 min ») : `feedback` porte un message destiné à l'élève.
	 */
	durationWritingAtFault?: boolean;
	/**
	 * Durée composée lue (« 2 h 15 min ») : défaut de FORME à signaler si la
	 * valeur est juste (perfectible ou mauvaise forme, cf. `./composite-duration`).
	 */
	durationFormIssue?: DurationFormIssue;
	parsed: {
		value: number | null;
		unit: string | null;
	} | null;
	expected: {
		value: number | null;
		unit: string | null;
	} | null;
}

// ============================================================================
// DEFAULT MESSAGES
// ============================================================================

// Les messages où l'UNITÉ est en cause vivent dans `./feedback` (textes figés).
const DEFAULT_MESSAGES = {
	invalidInput: 'Réponse invalide. Vérifiez le format.',
	incorrectValue: 'Valeur incorrecte.',
	wrongBoth: 'Valeur et unité incorrectes.'
};

// ============================================================================
// PRECISION → TOLERANCE CONVERSION
// ============================================================================

/**
 * Convert PrecisionType to Tolerance for compareQuantities.
 * Only 'tolerance' type maps directly. Other precision types (decimal,
 * significant, magnitude) are not supported for unit quantities and
 * fall back to exact comparison.
 */
function precisionToTolerance(precision?: PrecisionType): Tolerance | undefined {
	if (!precision || precision.type === 'none') return undefined;
	if (precision.type === 'tolerance') {
		return precision.mode === 'absolute'
			? { absolute: precision.tolerance }
			: { relative: precision.tolerance };
	}
	// decimal, significant, magnitude: no tolerance, exact comparison
	return undefined;
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

/** Grandeur en syntaxe maison : `28[mm]`, `-5.003[km]`, `35[mm^2]` */
const HOUSE_QUANTITY_REGEX = /^(-?\d+(?:\.\d+)?)\[([^[\]]+)\]$/;

/**
 * Réponse attendue écrite en syntaxe maison (valeur d'une variable `7[mm]`, résultat
 * d'un `{{eval:4*a}}`) → `28\unit{mm}`, la forme que lit `parseLatexQuantity`.
 * Toute autre écriture est rendue telle quelle.
 */
function houseQuantityToLatex(expected: string): string {
	// Écriture de `;()` (`(-3[m])`) et de `;+` (`+3[m]`) : même grandeur
	const bare = expected
		.trim()
		.replace(/^\((.*)\)$/, '$1')
		.replace(/^\+/, '');
	const match = HOUSE_QUANTITY_REGEX.exec(bare);
	return match ? `${match[1]}\\unit{${match[2]}}` : expected;
}

/**
 * Validate a quantity answer against an expected answer
 *
 * @param userAnswer - User's answer in LaTeX format
 * @param expectedAnswer - Expected answer in LaTeX format
 * @param precision - Optional precision for numeric comparison (PrecisionType)
 * @param requiredUnit - Optional required unit symbol (e.g., "m"). Rejects other units.
 * @returns ValidationResult with detailed feedback
 *
 * @example Basic usage (compatible units allowed)
 * validateQuantityAnswer('5000\\unit{m}', '5\\unit{km}')
 *
 * @example With required unit
 * validateQuantityAnswer('5\\unit{km}', '5000\\unit{m}', undefined, 'm')
 * // rejects: user used km, required m
 *
 * @example With precision
 * validateQuantityAnswer('10.3\\unit{m}', '10\\unit{m}', { type: 'tolerance', tolerance: 0.5, mode: 'absolute' })
 */
export function validateQuantityAnswer(
	userAnswer: string,
	expectedAnswer: string,
	precision?: PrecisionType,
	requiredUnit?: string
): ValidationResult {
	const expectedLatex = houseQuantityToLatex(expectedAnswer);
	const expectedQuantity = parseLatexQuantity(expectedLatex);

	// Durée attendue : l'élève peut écrire une durée composée (« 2 h 15 min »),
	// lue ici en valeur dans sa plus petite unité (`135\unit{min}`)
	const duration =
		expectedQuantity && isDuration(expectedQuantity.unit)
			? readCompositeDuration(userAnswer)
			: null;
	const expectedDisplay = expectedQuantity
		? {
				value: typeof expectedQuantity.value === 'number' ? expectedQuantity.value : null,
				unit: formatUnitForDisplay(expectedQuantity.unit.components)
			}
		: null;
	// « 2 h 15 kg » : un terme d'une autre grandeur
	if (duration?.kind === 'foreign-unit') {
		return {
			isCorrect: false,
			feedback: UNIT_FEEDBACK.wrongMagnitude,
			errorType: 'incompatible_units',
			unitAtFault: true,
			parsed: null,
			expected: expectedDisplay
		};
	}
	// « 2,5 h 15 min » : refusé — le défaut est la virgule, pas l'unité
	if (duration?.kind === 'decimal-inside') {
		return {
			isCorrect: false,
			feedback: duration.feedback,
			errorType: 'invalid_input',
			durationWritingAtFault: true,
			parsed: null,
			expected: expectedDisplay
		};
	}
	// Unité imposée : une durée composée n'est pas écrite dans cette unité
	if (duration?.kind === 'duration' && duration.multiPart && requiredUnit) {
		return {
			isCorrect: false,
			feedback: requiredUnitMessage(requiredUnit),
			errorType: 'wrong_unit',
			unitAtFault: true,
			parsed: null,
			expected: expectedDisplay
		};
	}

	// Saisie MathLive de l'élève (`5\operatorname{\mathrm{km}}`, `\frac{90km}{h}`…)
	// ramenée à `valeur\unit{écriture}` ; l'attendue en syntaxe maison (`28[mm]`) aussi.
	const normalizedUser =
		duration?.kind === 'duration' ? duration.latex : normalizeStudentQuantity(userAnswer);
	const userQuantity = parseLatexQuantity(normalizedUser);

	// Check for parse failures
	if (!userQuantity) {
		const unitMessage = unitWritingFeedback(normalizedUser);
		return {
			isCorrect: false,
			feedback: unitMessage ?? DEFAULT_MESSAGES.invalidInput,
			errorType: 'invalid_input',
			...(unitMessage ? { unitAtFault: true } : {}),
			parsed: null,
			expected: expectedQuantity
				? {
						value: typeof expectedQuantity.value === 'number' ? expectedQuantity.value : null,
						unit: formatUnitForDisplay(expectedQuantity.unit.components)
					}
				: null
		};
	}

	if (!expectedQuantity) {
		return {
			isCorrect: false,
			feedback: 'Erreur de configuration : réponse attendue invalide.',
			errorType: 'invalid_input',
			parsed: {
				value: typeof userQuantity.value === 'number' ? userQuantity.value : null,
				unit: formatUnitForDisplay(userQuantity.unit.components)
			},
			expected: null
		};
	}

	// Extract display information
	const userUnitStr = formatUnitForDisplay(userQuantity.unit.components);
	const expectedUnitStr = formatUnitForDisplay(expectedQuantity.unit.components);

	// Check unit compatibility first
	if (!unitsAreCompatible(userQuantity.unit, expectedQuantity.unit)) {
		// Aucune unité tapée alors qu'une grandeur est attendue : l'unité est oubliée
		const missingUnit =
			userQuantity.unit.components.size === 0 && expectedQuantity.unit.components.size > 0;
		return {
			isCorrect: false,
			feedback: missingUnit ? UNIT_FEEDBACK.missingUnit : UNIT_FEEDBACK.wrongMagnitude,
			errorType: 'incompatible_units',
			unitAtFault: true,
			parsed: {
				value: typeof userQuantity.value === 'number' ? userQuantity.value : null,
				unit: userUnitStr
			},
			expected: {
				value: typeof expectedQuantity.value === 'number' ? expectedQuantity.value : null,
				unit: expectedUnitStr
			}
		};
	}

	// Check requiredUnit — user must use exactly this unit (including prefix)
	// Uses checkExactUnitMatch to distinguish km from m (different coefficient)
	if (requiredUnit) {
		const unitsMatch = checkExactUnitMatch(userQuantity.unit, expectedQuantity.unit);
		if (!unitsMatch) {
			return {
				isCorrect: false,
				feedback: requiredUnitMessage(requiredUnit),
				errorType: 'wrong_unit',
				unitAtFault: true,
				parsed: {
					value: typeof userQuantity.value === 'number' ? userQuantity.value : null,
					unit: userUnitStr
				},
				expected: {
					value: typeof expectedQuantity.value === 'number' ? expectedQuantity.value : null,
					unit: expectedUnitStr
				}
			};
		}
	}

	// Convert precision to tolerance for compareQuantities
	const tolerance = precisionToTolerance(precision);

	// Use compareQuantities for value comparison with unit conversion
	const comparisonResult = compareQuantities(normalizedUser, expectedLatex, tolerance);

	// Build parsed details from comparison result
	const parsed = {
		value: comparisonResult.userValue,
		unit: comparisonResult.userUnit
	};

	const expected = {
		value: comparisonResult.expectedValue,
		unit: comparisonResult.expectedUnit
	};

	// Check comparison result
	if (comparisonResult.error === 'evaluation_failed') {
		return {
			isCorrect: false,
			feedback: DEFAULT_MESSAGES.invalidInput,
			errorType: 'invalid_input',
			parsed,
			expected
		};
	}

	if (comparisonResult.isEqual) {
		return {
			isCorrect: true,
			feedback: null,
			...(duration?.kind === 'duration' && duration.issue
				? { durationFormIssue: duration.issue }
				: {}),
			parsed,
			expected
		};
	}

	return {
		isCorrect: false,
		feedback: DEFAULT_MESSAGES.incorrectValue,
		errorType: 'wrong_value',
		parsed,
		expected
	};
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Message élève quand la saisie normalisée porte une écriture d'unité que le
 * parseur refuse : ambiguë (`kg/m.s`) ou inconnue (`xyz`). Null si la saisie
 * n'a pas d'unité ou si l'unité est lisible (l'erreur est alors ailleurs).
 */
function unitWritingFeedback(normalizedUser: string): string | null {
	const writing = extractUnitFromLatex(normalizedUser);
	if (!writing) return null;
	if (unitWritingProblem(writing) !== null) return ambiguousUnitMessage(writing);
	if (parseUnitExpression(writing) === null) return unknownUnitMessage(writing);
	return null;
}

/**
 * Check if two units match exactly (same components and coefficient)
 */
export function checkExactUnitMatch(
	userUnit: { components: ReadonlyMap<string, number>; coefficient: number },
	expectedUnit: { components: ReadonlyMap<string, number>; coefficient: number }
): boolean {
	const epsilon = 1e-9;
	if (Math.abs(userUnit.coefficient - expectedUnit.coefficient) > epsilon) {
		return false;
	}

	if (userUnit.components.size !== expectedUnit.components.size) {
		return false;
	}

	for (const [symbol, exponent] of userUnit.components) {
		if (expectedUnit.components.get(symbol) !== exponent) {
			return false;
		}
	}

	return true;
}

/**
 * Format unit components for display
 */
function formatUnitForDisplay(components: ReadonlyMap<string, number>): string | null {
	if (components.size === 0) {
		return null;
	}

	const parts: string[] = [];
	for (const [symbol, exponent] of components) {
		if (exponent === 1) {
			parts.push(symbol);
		} else {
			parts.push(`${symbol}^${exponent}`);
		}
	}

	return parts.join('·');
}
