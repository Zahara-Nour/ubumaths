/**
 * Answer Validation Utilities
 * ============================
 *
 * Provides validation functions for different question types,
 * integrating with MathLive's Compute Engine for mathematical evaluation.
 *
 * @module utils/answer-validator
 */

import type {
	QuestionInstance,
	InstanceBlank,
	PrecisionType,
	ValidationStatus,
	ConfigurableConstraintId,
	ConstraintId,
	ConstraintMode,
	ConstraintOptions,
	ValidationRule
} from '$lib/questions/types';
import {
	DEFAULT_CONSTRAINT_MODE,
	DEFAULT_FORM_CONSTRAINT_MODE,
	getQuestionType
} from '$lib/questions/types';
import type { ValidationResult } from '$lib/types/question-display';
import { evaluateExpression, areEquivalent, type AnswerAssumptions } from '$lib/math';
import { checkUnit } from '$lib/questions/constraint-validators';
import {
	checkForm as checkFormUnified,
	cosmeticViolations,
	isSimpleNumberLatex,
	isQuantityValueLatex,
	forgotPercentSign,
	type ConstraintSeverity
} from '$lib/mathAST/cosmetic-transforms';
import { extractUnitFromLatex } from '$lib/questions/units/parser';
import { normalizeStudentQuantity, studentNumericLatex } from '$lib/questions/units/student-input';
import {
	CONSTRAINT_FEEDBACK,
	FORGOTTEN_PERCENT_SIGN,
	MISSING_CHOICES_FEEDBACK
} from '$lib/questions/feedback';
import { evaluateRule, type EvaluationContext } from '$lib/questions/validation-rule-evaluator';
import { templateGenericFunctions } from '$lib/questions/generic-functions';
import { choiceLetter, statusFromChoices, toDisplayedChoicePosition } from '$lib/questions/choices';
import {
	getRequiredFormFeedback,
	REQUIRED_FORM_FEEDBACK,
	requiredFormVerdict
} from '$lib/questions/required-form-validator';
import { validateQuantityAnswer } from '$lib/questions/units/validator';
import type { DurationFormIssue } from '$lib/questions/units/composite-duration';
import { rulesDecide } from '$lib/questions/rules-suffice';
import {
	judgeIntervalAnswer,
	DEFAULT_INTERVAL_FORM_MODE
} from '$lib/questions/intervals/interval-answer';
import { judgeEquationAnswer } from '$lib/questions/equations/equation-answer';
import { judgeRounding, roundingFeedback, roundToPrecision } from '$lib/questions/rounding';
import { ANSWER_TOO_COMPLEX_FEEDBACK, isAnswerTooComplex } from '$lib/questions/answer-complexity';
import { expectsValue, withoutVariablePrefix } from '$lib/questions/answer-variable-prefix';
import { expectsUnitlessValue, withoutDegreeSuffix } from '$lib/questions/answer-degree-suffix';

// ============================================================================
// CONSTRAINT CHECKING
// ============================================================================

/**
 * Build constraint severity map from ConstraintOptions for the unified checkForm.
 */
function buildConstraintSeverities(
	constraints: ConstraintOptions
): Record<string, ConstraintSeverity> {
	const severities: Record<string, ConstraintSeverity> = {};

	const constraintIds: ConfigurableConstraintId[] = [
		'spaces',
		'products',
		'brackets',
		'zeros',
		'nullTerms',
		'factorOne',
		'factorZero',
		'signs',
		'reducedFractions',
		'percent'
	];

	for (const id of constraintIds) {
		const mode = (constraints[id] as ConstraintMode | undefined) ?? DEFAULT_CONSTRAINT_MODE;
		severities[id] = mode;
	}

	return severities;
}

/**
 * Map raw cosmetic violations (from `cosmeticViolations`) into the
 * `ValidationResult.constraintViolations` shape, computing the worst status.
 *
 * Mirrors the violation-handling loop in `applyConstraints` but without any
 * form-vs-expected comparison — used by blanks whose form is validated by
 * another stage (requiredForm / precision / unit).
 */
function mapCosmeticViolations(
	rawViolations: Array<{ id: string; severity: 'strict' | 'warn' }>,
	isMultiple: boolean
): { status: ValidationStatus; violations: NonNullable<ValidationResult['constraintViolations']> } {
	const violations: NonNullable<ValidationResult['constraintViolations']> = [];
	let worstStatus: ValidationStatus = 'correct';

	for (const v of rawViolations) {
		const constraintId = v.id as ConstraintId;
		if (!CONSTRAINT_FEEDBACK[constraintId]) continue;
		const feedback = CONSTRAINT_FEEDBACK[constraintId][isMultiple ? 'multiple' : 'single'];

		if (v.severity === 'strict') {
			violations.push({ constraint: constraintId, severity: 'error', feedback });
			worstStatus = 'bad_form';
		} else {
			violations.push({ constraint: constraintId, severity: 'warning', feedback });
			if (worstStatus === 'correct') {
				worstStatus = 'unoptimal_form';
			}
		}
	}

	return { status: worstStatus, violations };
}

/**
 * Extract the numeric (value) part of a quantity LaTeX string by stripping the
 * `\unit{...}` wrapper. Returns the trimmed remainder, or the original trimmed
 * string when no unit wrapper is present.
 *
 * Used so the cosmetic pipeline never has to parse `\unit{}` (the LaTeX parser
 * chokes on it) — we feed it only the numeric part.
 */
function extractNumericLatexPart(latex: string): string {
	const unit = extractUnitFromLatex(latex);
	if (unit === null) return latex.trim();
	// Remove the \unit{...} wrapper (only the unit we found) and trim.
	// Accolades imbriquées admises : `3\unit{m.s^{-1}}` → `3`.
	return latex.replace(/\\unit\{(?:[^{}]|\{[^{}]*\})*\}/, '').trim();
}

/**
 * Apply constraint checks to a mathematically correct answer
 *
 * Uses the unified checkForm pipeline for cosmetic constraints,
 * plus separate unit matching.
 *
 * @param answers - Plain text answers
 * @param answersLatex - LaTeX versions of answers (from MathLive)
 * @param expectedAnswers - Expected answers for form comparison
 * @param constraints - Constraint configuration from question
 * @returns Status and list of violations
 */
function applyConstraints(
	answers: string[],
	answersLatex: string[],
	expectedAnswers: string[],
	constraints: ConstraintOptions
): { status: ValidationStatus; violations: NonNullable<ValidationResult['constraintViolations']> } {
	const violations: NonNullable<ValidationResult['constraintViolations']> = [];
	let worstStatus: ValidationStatus = 'correct';
	const isMultiple = answers.length > 1;
	const severities = buildConstraintSeverities(constraints);
	const formMode = (constraints.form as ConstraintMode | undefined) ?? DEFAULT_FORM_CONSTRAINT_MODE;
	const formOptions = {
		allowFirstNegative: constraints.allowBracketsInFirstNegativeTerm === true
	};

	// Apply unified checkForm for each answer/expected pair
	for (let i = 0; i < answersLatex.length; i++) {
		const expected = expectedAnswers[i];
		if (!expected) continue;

		const formResult = checkFormUnified(answersLatex[i], expected, severities, formOptions);

		// Collect violations from checkForm
		for (const v of formResult.violations) {
			const constraintId = v.id as ConstraintId;
			if (CONSTRAINT_FEEDBACK[constraintId]) {
				const feedback = CONSTRAINT_FEEDBACK[constraintId][isMultiple ? 'multiple' : 'single'];

				if (v.severity === 'strict') {
					violations.push({ constraint: constraintId, severity: 'error', feedback });
					worstStatus = 'bad_form';
				} else {
					violations.push({ constraint: constraintId, severity: 'warning', feedback });
					if (worstStatus === 'correct') {
						worstStatus = 'unoptimal_form';
					}
				}
			}
		}

		// Comparaison de fin de pipeline : la réponse retouchée n'est pas l'attendue
		// retouchée (400+80 contre 480). Gouvernée par `form`, `strict` par défaut
		// (ADR 0013) : `warn` → juste avec avertissement, `off` → juste sans remarque.
		if (!formResult.valid && formResult.status === 'bad_form' && formMode !== 'off') {
			const feedback = CONSTRAINT_FEEDBACK['form'][isMultiple ? 'multiple' : 'single'];
			if (formMode === 'strict') {
				violations.push({ constraint: 'form', severity: 'error', feedback });
				worstStatus = 'bad_form';
			} else {
				violations.push({ constraint: 'form', severity: 'warning', feedback });
				if (worstStatus === 'correct') worstStatus = 'unoptimal_form';
			}
		}
	}

	// Unit matching (separate — not part of cosmetic transforms)
	const unitMode = (constraints['unit'] as ConstraintMode | undefined) ?? DEFAULT_CONSTRAINT_MODE;
	if (unitMode !== 'off') {
		const unitProblematic = checkUnit(answersLatex, expectedAnswers);
		if (unitProblematic.length > 0) {
			const feedback = CONSTRAINT_FEEDBACK['unit'][isMultiple ? 'multiple' : 'single'];
			if (unitMode === 'strict') {
				violations.push({ constraint: 'unit', severity: 'error', feedback });
				worstStatus = 'bad_form';
			} else {
				violations.push({ constraint: 'unit', severity: 'warning', feedback });
				if (worstStatus === 'correct') {
					worstStatus = 'unoptimal_form';
				}
			}
		}
	}

	return { status: worstStatus, violations };
}

// ============================================================================
// VALIDATION RULES EVALUATION
// ============================================================================

/**
 * Valeur numérique de la réponse pour les règles : `12/2` vaut 6 (la forme
 * est jugée ailleurs). NaN si la réponse n'est pas un nombre calculable.
 */
function toNumericAnswer(userAnswer: string): number {
	const direct = Number(userAnswer);
	if (userAnswer.trim() !== '' && !isNaN(direct)) return direct;
	try {
		const evaluated = evaluateExpression(userAnswer);
		return typeof evaluated === 'number' ? evaluated : NaN;
	} catch {
		return NaN;
	}
}

/**
 * Evaluate custom validation rules (testAnswers-style)
 *
 * Used for questions where the correct answer depends on generated variables
 * (e.g., "find a divisor of n other than 1 and n itself")
 *
 * @param rules - Array of validation rules
 * @param userAnswer - User's answer as string
 * @param instance - Question instance with resolved variables
 * @returns Validation result or undefined if all rules pass
 */
function evaluateValidationRules(
	rules: ValidationRule[],
	userAnswer: string,
	instance: QuestionInstance
): ValidationResult | undefined {
	// Build context from resolved variables
	const variables: Record<string, number | string> = {};
	if (instance.resolvedVariables) {
		for (const v of instance.resolvedVariables) {
			// Try to parse as number, otherwise keep as string
			const numValue = Number(v.value);
			variables[v.name] = isNaN(numValue) ? v.value : numValue;
		}
	}

	const ctx: EvaluationContext = {
		variables,
		answer: userAnswer,
		// Valeur du LaTeX tapé : `12/2` vaut 6, `2{,}5` vaut 2,5, `12\,000` vaut
		// 12000 pour les règles (la forme est jugée ensuite). `Number()` seul
		// rendait NaN pour toute saisie MathLive non triviale.
		numericAnswer: toNumericAnswer(userAnswer),
		// Hypothèses de l'énoncé (ADR 0012), pour la règle `equivalent`
		assumptions: instance.options?.answerAssumptions,
		// Fonctions déclarées par le modèle (`P'(2)`), pour la règle `equivalent`
		genericFunctions: templateGenericFunctions(instance.genericFunctions)
	};

	// Evaluate each rule
	for (const rule of rules) {
		const result = evaluateRule(rule, ctx);
		if (!result.valid) {
			return {
				isCorrect: false,
				feedback: result.reason || 'La réponse ne satisfait pas les critères demandés.'
			};
		}
	}

	// All rules passed
	return undefined;
}

// ============================================================================
// FUZZY TEXT MATCHING
// ============================================================================

/**
 * Compute Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	const dp: number[][] = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));

	for (let i = 0; i <= m; i++) dp[i][0] = i;
	for (let j = 0; j <= n; j++) dp[0][j] = j;

	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (a[i - 1] === b[j - 1]) {
				dp[i][j] = dp[i - 1][j - 1];
			} else {
				dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
			}
		}
	}

	return dp[m][n];
}

/**
 * Normalize string for fuzzy comparison: lowercase + strip accents.
 * Le bruit de saisie n'est pas une faute : espaces supprimés, ponctuation finale
 * retirée, virgule décimale lue comme un point (« 3cm » = « 3 cm », « oui. » = « Oui »).
 */
function normalizeForFuzzy(s: string): string {
	return s
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[.!?;:]+$/u, '')
		.replace(/\s+/gu, '')
		.replace(/,/g, '.');
}

/**
 * Nombre minimal de lettres du mot attendu pour tolérer une faute de frappe.
 * En dessous, une faute change le mot (« A » / « B », « pair » / « paire »).
 */
const FUZZY_MIN_LETTERS = 5;

/**
 * Fuzzy text matching: case insensitive, accents ignored ; Levenshtein distance
 * <= 1 only when the expected word has at least FUZZY_MIN_LETTERS letters.
 */
function isFuzzyTextMatch(userAnswer: string, expected: string): boolean {
	const normalizedUser = normalizeForFuzzy(userAnswer);
	const normalizedExpected = normalizeForFuzzy(expected);

	// Empty answers must match exactly (prevent "" fuzzy-matching "a")
	if (!normalizedUser || !normalizedExpected) {
		return normalizedUser === normalizedExpected;
	}

	if (normalizedUser === normalizedExpected) return true;
	// Mot court : égalité exigée (casse et accents mis à part)
	const letterCount = normalizedExpected.match(/\p{L}/gu)?.length ?? 0;
	if (letterCount < FUZZY_MIN_LETTERS) return false;
	return levenshteinDistance(normalizedUser, normalizedExpected) <= 1;
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

/**
 * Validate user answer against correct answer based on question type
 *
 * @param userAnswer - User's submitted answer
 * @param instance - Question instance with correct answer
 * @param userAnswerLatex - Optional LaTeX version of user answer (for constraint checking)
 * @returns Validation result with correctness and feedback
 */
export function validateAnswer(
	userAnswer: string | string[] | number | number[],
	instance: QuestionInstance,
	userAnswerLatex?: string | string[]
): ValidationResult {
	const questionType = getQuestionType(instance);

	// ---- COURSE_CARD : aucune réponse à valider (auto-évaluation de l'élève) ----
	// Sans cette garde, la carte tomberait dans la branche QCM ci-dessous.
	if (questionType === 'course_card') {
		return {
			isCorrect: false,
			message: 'Carte de cours : pas de réponse à valider (auto-évaluation)'
		};
	}

	try {
		// ---- FILL_IN_BLANKS: per-blank pipeline (return early) ----
		// Global validationRules and requiredForm are NOT used here;
		// each blank carries its own validation config.
		if (questionType === 'fill_in_blanks') {
			const answers = Array.isArray(userAnswer) ? userAnswer.map(String) : [String(userAnswer)];
			const latex = userAnswerLatex
				? Array.isArray(userAnswerLatex)
					? userAnswerLatex
					: [userAnswerLatex]
				: undefined;

			if (!instance.blanks || instance.blanks.length === 0) {
				return answers.length === 0
					? { isCorrect: true }
					: { isCorrect: false, message: 'Pas de blanks[] définis' };
			}

			return validateBlanks(answers, instance, latex);
		}

		// ---- MULTIPLE_CHOICE ----
		const { correctChoiceIndex } = instance;

		// Check custom validation rules first (testAnswers-style)
		if (instance.validationRules && instance.validationRules.length > 0) {
			const userAnswerStr = Array.isArray(userAnswer) ? String(userAnswer[0]) : String(userAnswer);
			const ruleResult = evaluateValidationRules(instance.validationRules, userAnswerStr, instance);

			if (ruleResult) return ruleResult;
			return { isCorrect: true };
		}

		// `userAnswer` : indices d'ORIGINE (cf. `toOriginalChoiceIndexes`). La lettre du
		// message, elle, désigne la position AFFICHÉE : c'est celle que l'élève voit.
		const result: ValidationResult = validateChoice(
			userAnswer as number | number[],
			correctChoiceIndex as string | string[],
			instance.multipleAnswers,
			(originalIndex) => choiceLetter(toDisplayedChoicePosition(instance, originalIndex))
		);

		// Apply required form check (multiple_choice only; fill_in_blanks uses per-blank)
		let acceptableForm = false;
		if (result.isCorrect && instance.requiredForm && userAnswerLatex) {
			const latex = Array.isArray(userAnswerLatex) ? userAnswerLatex : [userAnswerLatex];
			const verdicts = latex.map((l) => requiredFormVerdict(l, instance.requiredForm!));
			acceptableForm = verdicts.includes('acceptable');

			if (verdicts.includes('violated')) {
				const feedback = getRequiredFormFeedback(instance.requiredForm, latex.length > 1);
				return {
					isCorrect: false,
					status: 'bad_form',
					feedback,
					constraintViolations: [{ constraint: 'form', severity: 'error', feedback }]
				};
			}
		}

		// Apply constraint checks (multiple_choice only)
		if (result.isCorrect && userAnswerLatex) {
			const answers = Array.isArray(userAnswer) ? userAnswer.map(String) : [String(userAnswer)];
			const latex = Array.isArray(userAnswerLatex) ? userAnswerLatex : [userAnswerLatex];
			const expected = Array.isArray(correctChoiceIndex)
				? correctChoiceIndex
				: correctChoiceIndex
					? [correctChoiceIndex]
					: [];

			const { status, violations } = applyConstraints(
				answers,
				latex,
				expected,
				instance.options?.constraints ?? {}
			);

			const form = acceptableForm ? withAcceptableForm(status, violations) : { status, violations };
			result.status = form.status;
			result.constraintViolations = form.violations;

			if (form.status === 'bad_form') {
				result.isCorrect = false;
				result.feedback = form.violations[0]?.feedback;
			} else if (form.status === 'unoptimal_form') {
				result.feedback = form.violations[0]?.feedback;
			}
		}

		return result;
	} catch (error) {
		return {
			isCorrect: false,
			message: error instanceof Error ? error.message : 'Erreur de validation'
		};
	}
}

// ============================================================================
// NUMERICAL VALIDATION
// ============================================================================

/**
 * Validate numerical answer with precision tolerance
 *
 * @param userAnswer - User's answer (string or number)
 * @param correctAnswer - Correct answer from instance
 * @param precision - Precision specification
 * @param studentLatex - Écriture tapée (LaTeX MathLive), pour compter les
 *   décimales d'un arrondi ; `userAnswer` à défaut
 * @returns Validation result
 */
export function validateNumerical(
	userAnswer: string | number,
	correctAnswer: string,
	precision?: PrecisionType,
	studentLatex?: string
): ValidationResult {
	return numericalVerdict(userAnswer, correctAnswer, precision, studentLatex).result;
}

/**
 * Verdict numérique, avec l'indication qu'un ARRONDI est en cause (trop de
 * décimales ou de chiffres significatifs) : son message est alors destiné à
 * l'élève (« Arrondis au centième. »). `onlyRoundingMissing` : la réponse,
 * arrondie, redonne l'attendu → mauvaise forme (cf. questions/rounding).
 */
function numericalVerdict(
	userAnswer: string | number,
	correctAnswer: string,
	precision?: PrecisionType,
	studentLatex?: string
): { result: ValidationResult; roundingAtFault: boolean; onlyRoundingMissing: boolean } {
	const { onlyRoundingMissing = false, ...result } = numericalResult(
		userAnswer,
		correctAnswer,
		precision,
		studentLatex
	);
	const roundingAtFault =
		!result.isCorrect &&
		(precision?.type === 'decimal' || precision?.type === 'significant') &&
		result.feedback === roundingFeedback(precision);
	return { result, roundingAtFault, onlyRoundingMissing };
}

function numericalResult(
	userAnswer: string | number,
	correctAnswer: string,
	precision?: PrecisionType,
	studentLatex?: string
): ValidationResult & { onlyRoundingMissing?: boolean } {
	// Convert to string if number
	const userStr = typeof userAnswer === 'number' ? String(userAnswer) : userAnswer;

	// Evaluate both answers
	const userNum = evaluateExpression(userStr);
	const correctNum = evaluateExpression(correctAnswer);

	// Check if evaluation succeeded
	if (typeof userNum !== 'number') {
		return {
			isCorrect: false,
			message: 'Réponse invalide (non numérique)',
			feedback: 'Vérifiez que vous avez entré un nombre valide'
		};
	}

	if (typeof correctNum !== 'number') {
		return {
			isCorrect: false,
			message: 'Erreur: réponse correcte invalide'
		};
	}

	// Exact match (no precision specified)
	if (!precision || precision.type === 'none') {
		const isCorrect = userNum === correctNum;
		return {
			isCorrect,
			message: isCorrect ? 'Correct !' : 'Incorrect',
			feedback: isCorrect ? undefined : `La réponse exacte est ${correctNum}`
		};
	}

	// Arrondi (décimales ou chiffres significatifs) : la réponse de l'élève n'est
	// PAS arrondie — trop de chiffres est faux (cf. questions/rounding)
	if (precision.type === 'decimal' || precision.type === 'significant') {
		const verdict = judgeRounding(studentLatex ?? userStr, userNum, correctNum, precision);
		if (verdict.feedback) {
			// Trop de chiffres : message destiné à l'élève (cf. numericalVerdict)
			return {
				isCorrect: false,
				message: 'Incorrect',
				feedback: verdict.feedback,
				...(verdict.onlyRoundingMissing ? { onlyRoundingMissing: true } : {})
			};
		}
		const correctRounded = roundToPrecision(correctNum, precision);
		return {
			isCorrect: verdict.isCorrect,
			message: verdict.isCorrect ? 'Correct !' : 'Incorrect',
			feedback: verdict.isCorrect
				? undefined
				: precision.type === 'decimal'
					? `La réponse arrondie à ${precision.digits} décimales est ${correctRounded}`
					: `La réponse avec ${precision.digits} chiffres significatifs est ${correctRounded}`
		};
	}

	// Magnitude (order of magnitude)
	if (precision.type === 'magnitude') {
		const userMag = roundToMagnitude(userNum, precision.digits);
		const correctMag = roundToMagnitude(correctNum, precision.digits);
		const isCorrect = userMag === correctMag;

		return {
			isCorrect,
			message: isCorrect ? 'Correct !' : 'Incorrect',
			feedback: isCorrect
				? undefined
				: `La réponse arrondie à l'ordre de grandeur 10^${precision.digits} est ${correctMag}`
		};
	}

	// Tolerance (absolute or relative)
	if (precision.type === 'tolerance') {
		const { tolerance, mode } = precision;
		const diff = Math.abs(userNum - correctNum);

		const isCorrect =
			mode === 'absolute' ? diff <= tolerance : diff <= Math.abs(correctNum * tolerance);

		return {
			isCorrect,
			message: isCorrect ? 'Correct !' : 'Incorrect',
			feedback: isCorrect
				? undefined
				: mode === 'absolute'
					? `La réponse correcte est ${correctNum} (tolérance ±${tolerance})`
					: `La réponse correcte est ${correctNum} (tolérance ±${tolerance * 100}%)`
		};
	}

	// Fallback: exact match
	const isCorrect = userNum === correctNum;
	return {
		isCorrect,
		message: isCorrect ? 'Correct !' : 'Incorrect'
	};
}

/**
 * Round number to order of magnitude
 *
 * @param num - Number to round
 * @param magnitude - Power of 10 (e.g., 1 = nearest 10, 2 = nearest 100)
 * @returns Rounded number
 */
function roundToMagnitude(num: number, magnitude: number): number {
	const scale = Math.pow(10, magnitude);
	return Math.round(num / scale) * scale;
}

// ============================================================================
// ALGEBRAIC VALIDATION
// ============================================================================

/**
 * Validate algebraic expression using equivalence checking
 *
 * @param userAnswer - User's algebraic expression (LaTeX)
 * @param correctAnswer - Correct expression (LaTeX)
 * @returns Validation result
 */
export function validateAlgebraic(
	userAnswer: string,
	correctAnswer: string,
	assumptions?: AnswerAssumptions
): ValidationResult {
	// Bound wall-clock time so a pathological learner input cannot freeze the UI.
	// On timeout, areEquivalent returns false → answer treated as incorrect.
	const isCorrect = areEquivalent(userAnswer, correctAnswer, { timeoutMs: 500, assumptions });

	return {
		isCorrect,
		message: isCorrect ? 'Correct !' : 'Incorrect',
		feedback: isCorrect ? undefined : `Une forme correcte est: $$${correctAnswer}$$`
	};
}

// ============================================================================
// FILL-IN-BLANKS VALIDATION (PER-BLANK PIPELINE)
// ============================================================================

/**
 * Case à forme exigée : le motif a déjà jugé la forme, seules restent les contraintes
 * cosmétiques (parenthèses inutiles, facteur 1…). L'attendu n'est pas un modèle de forme.
 */
function requiredFormCosmetics(
	latex: string,
	constraints: ConstraintOptions
): { status: ValidationStatus; violations: NonNullable<ValidationResult['constraintViolations']> } {
	const severities = buildConstraintSeverities(constraints);
	const formOptions = {
		allowFirstNegative: constraints.allowBracketsInFirstNegativeTerm === true
	};
	return mapCosmeticViolations(cosmeticViolations(latex, severities, formOptions), false);
}

/**
 * Contrôle de forme d'une réponse qui doit être un nombre simple (éventuellement
 * négatif) : cases à précision, et cases `rulesSuffice` — dont `expectedAnswer`
 * n'est qu'un exemple et ne peut pas servir de modèle de forme.
 */
function checkSimpleNumberForm(
	latex: string,
	constraints: ConstraintOptions
): { status: ValidationStatus; violations: NonNullable<ValidationResult['constraintViolations']> } {
	const severities = buildConstraintSeverities(constraints);
	const formOptions = {
		allowFirstNegative: constraints.allowBracketsInFirstNegativeTerm === true
	};
	const raw = cosmeticViolations(latex, severities, formOptions);
	const { status, violations } = mapCosmeticViolations(raw, false);

	if (!isSimpleNumberLatex(latex)) {
		const feedback = CONSTRAINT_FEEDBACK['form'].single;
		return {
			status: 'bad_form',
			violations: [{ constraint: 'form', severity: 'error', feedback }, ...violations]
		};
	}

	return { status, violations };
}

/**
 * Case `acceptDecimal` dont la réponse est un décimal (écriture décimale finie,
 * signe compris) : la valeur, vérifiée avant, suffit — l'écriture attendue
 * (`\frac{1}{2}`) n'est pas un modèle de forme. Un décimal arrondi n'arrive
 * jamais ici : sa valeur diffère, il est refusé dès le contrôle de valeur.
 */
function acceptsExactDecimal(blank: InstanceBlank, latex: string): boolean {
	return blank.acceptDecimal === true && isSimpleNumberLatex(latex);
}

/**
 * Verdict d'une seule case sur la VALEUR (sans contrôle de forme), avec le même
 * pipeline que la correction : règles, `rulesSuffice`, mode inféré.
 * Sert à colorer chaque case après soumission.
 */
export function isBlankValueCorrect(
	userAnswer: string,
	blank: InstanceBlank,
	instance: QuestionInstance
): boolean {
	if (!userAnswer.trim()) return false;
	return validateBlankValue(userAnswer, blank, instance);
}

/**
 * Check if a single answer matches a blank's expected value (value only, no form/constraints).
 * Uses inferred validation mode based on blank configuration.
 * Used for order-independent matching.
 */
function validateBlankValue(
	userAnswer: string,
	blank: InstanceBlank,
	instance: QuestionInstance
): boolean {
	// Ensemble en notation intervalle : jugé sur l'ensemble (ni règles ni expression)
	if (blank.answerKind === 'intervalles') {
		const { status } = judgeIntervalAnswer(userAnswer, blank.expectedAnswer);
		return status !== 'incorrect' && status !== 'empty';
	}

	// Réponse hostile ou démesurée : fausse, sans être lue (garde Q58)
	if (isAnswerTooComplex(userAnswer)) return false;

	// Équation (droite, cercle) : jugée sur l'ensemble de points, une écriture à
	// simplifier ou une forme exigée non respectée garde une valeur juste
	if (blank.answerKind === 'equation') {
		const { status } = judgeEquationAnswer(userAnswer, blank.expectedAnswer);
		return status === 'correct' || status === 'unoptimal_form';
	}

	// Check validation rules first (pre-condition)
	if (blank.validationRules && blank.validationRules.length > 0) {
		const ruleResult = evaluateValidationRules(blank.validationRules, userAnswer, instance);
		if (ruleResult) return false;
	}

	// Plusieurs bonnes réponses : les règles, déjà passées, suffisent
	if (rulesDecide(blank)) return true;

	// Inferred mode
	if (blank.type === 'text') {
		return isFuzzyTextMatch(userAnswer, blank.expectedAnswer);
	}

	if (blank.unit?.expected) {
		const result = validateQuantityAnswer(
			userAnswer,
			blank.expectedAnswer,
			blank.precision,
			blank.unit.required
		);
		return result.isCorrect;
	}

	if (blank.precision) {
		const result = validateNumerical(userAnswer, blank.expectedAnswer, blank.precision);
		return result.isCorrect;
	}

	return isAnswerMatch(userAnswer, blank.expectedAnswer, instance);
}

/**
 * Réponse juste à l'arrondi près pour cette case (trop de chiffres, mais la
 * réponse arrondie redonne l'attendu : 1,136 pour 1,14) : le message d'arrondi
 * (« Arrondis au centième. »), sinon `undefined`. Sert à l'appariement
 * `orderIndependent`, APRÈS les réponses exactes (cf. questions/rounding).
 */
function roundingOnlyFeedback(
	userAnswer: string,
	blank: InstanceBlank,
	instance: QuestionInstance
): string | undefined {
	if (!blank.precision || blank.answerKind === 'intervalles' || blank.type === 'text') {
		return undefined;
	}
	if (isAnswerTooComplex(userAnswer) || rulesDecide(blank)) return undefined;
	if (blank.validationRules && blank.validationRules.length > 0) {
		if (evaluateValidationRules(blank.validationRules, userAnswer, instance)) return undefined;
	}
	if (blank.unit?.expected) {
		const result = validateQuantityAnswer(
			userAnswer,
			blank.expectedAnswer,
			blank.precision,
			blank.unit.required
		);
		return result.onlyRoundingMissing ? (result.feedback ?? undefined) : undefined;
	}
	const { result, onlyRoundingMissing } = numericalVerdict(
		userAnswer,
		blank.expectedAnswer,
		blank.precision
	);
	return onlyRoundingMissing ? result.feedback : undefined;
}

/**
 * Forme juste mais pas celle demandée (motif `acceptable`) : perfectible. S'ajoute au
 * résultat des contraintes cosmétiques, sans jamais rendre juste un refus.
 */
function withAcceptableForm(
	status: ValidationStatus,
	violations: NonNullable<ValidationResult['constraintViolations']>
): { status: ValidationStatus; violations: NonNullable<ValidationResult['constraintViolations']> } {
	// Refusée pour une autre raison : l'avertissement « juste » n'a rien à dire
	if (status === 'bad_form') return { status, violations };
	const feedback = REQUIRED_FORM_FEEDBACK.acceptable;
	return {
		status: 'unoptimal_form',
		violations: [...violations, { constraint: 'form', severity: 'warning', feedback }]
	};
}

/**
 * Durée composée de valeur juste mais mal écrite : `warning` = perfectible
 * (« 2 h 75 min »), `error` = mauvaise forme (« 2 h 15 mn »). Le message de la
 * durée passe en tête : c'est lui que l'élève lit.
 */
function withDurationFormIssue(
	status: ValidationStatus,
	violations: NonNullable<ValidationResult['constraintViolations']>,
	issue: DurationFormIssue
): { status: ValidationStatus; violations: NonNullable<ValidationResult['constraintViolations']> } {
	const violation = {
		constraint: 'form' as const,
		severity: issue.severity,
		feedback: issue.feedback
	};
	const worse: ValidationStatus =
		issue.severity === 'error' ? 'bad_form' : status === 'correct' ? 'unoptimal_form' : status;
	return { status: worse, violations: [violation, ...violations] };
}

/** Message d'un résultat : celui d'une ERREUR s'il est refusé, jamais un avertissement */
function feedbackOf(
	status: ValidationStatus,
	violations: NonNullable<ValidationResult['constraintViolations']>
): string | undefined {
	const first =
		status === 'bad_form' ? violations.find((v) => v.severity === 'error') : violations[0];
	return (first ?? violations[0])?.feedback;
}

/**
 * Case « intervalles » : verdict de `judgeIntervalAnswer` dans la forme de
 * `validateSingleBlank`. Une écriture à reprendre (juste) porte la contrainte
 * `intervalForm`, avec la sévérité de son réglage.
 */
function intervalBlankResult(
	answer: string,
	blank: InstanceBlank,
	instance: QuestionInstance
): ReturnType<typeof validateSingleBlank> {
	const mode = instance.options?.constraints?.intervalForm ?? DEFAULT_INTERVAL_FORM_MODE;
	const { status, feedback } = judgeIntervalAnswer(answer, blank.expectedAnswer, mode);
	switch (status) {
		case 'correct':
			return { isCorrect: true, status: 'correct' };
		case 'empty':
			return { isCorrect: false, status: 'empty' };
		case 'unoptimal_form':
		case 'bad_form': {
			const severity = status === 'bad_form' ? 'error' : 'warning';
			const message = feedback ?? CONSTRAINT_FEEDBACK.intervalForm.single;
			return {
				isCorrect: status === 'unoptimal_form',
				status,
				feedback: message,
				constraintViolations: [{ constraint: 'intervalForm', severity, feedback: message }]
			};
		}
		default:
			return feedback ? { isCorrect: false, feedback } : { isCorrect: false };
	}
}

/**
 * Case « équation » : verdict de `judgeEquationAnswer` dans la forme de
 * `validateSingleBlank`. Forme exigée non respectée (`bad_form`) et équation de
 * cercle à simplifier (`unoptimal_form`) portent la contrainte `form`.
 */
function equationBlankResult(
	answer: string,
	blank: InstanceBlank
): ReturnType<typeof validateSingleBlank> {
	const { status, feedback } = judgeEquationAnswer(
		answer,
		blank.expectedAnswer,
		blank.requiredForm
	);
	switch (status) {
		case 'correct':
			return { isCorrect: true, status: 'correct' };
		case 'empty':
			return { isCorrect: false, status: 'empty' };
		case 'unoptimal_form':
		case 'bad_form': {
			const severity = status === 'bad_form' ? 'error' : 'warning';
			const message = feedback ?? REQUIRED_FORM_FEEDBACK.pattern;
			return {
				isCorrect: status === 'unoptimal_form',
				status,
				feedback: message,
				constraintViolations: [{ constraint: 'form', severity, feedback: message }]
			};
		}
		default:
			return feedback ? { isCorrect: false, feedback } : { isCorrect: false };
	}
}

/** Garde Q58 sur la réponse ET sur son LaTeX (celui qui juge la forme) */
function isBlankAnswerTooComplex(answer: string, latex: string | undefined): boolean {
	return isAnswerTooComplex(answer) || (latex !== undefined && isAnswerTooComplex(latex));
}

/**
 * Full per-blank pipeline: validationRules -> inferred mode -> requiredForm -> constraints.
 */
function validateSingleBlank(
	userAnswer: string,
	blank: InstanceBlank,
	userAnswerLatex: string | undefined,
	instance: QuestionInstance
): {
	isCorrect: boolean;
	status?: ValidationStatus;
	feedback?: string;
	constraintViolations?: NonNullable<ValidationResult['constraintViolations']>;
} {
	// 0. Empty answer — skip all checks
	if (!userAnswer.trim()) {
		return { isCorrect: false, status: 'empty' };
	}

	// Ensemble en notation intervalle (inéquation) : chaîne à part, cf. interval-answer.ts
	if (blank.answerKind === 'intervalles') {
		return intervalBlankResult(userAnswerLatex || userAnswer, blank, instance);
	}

	// Réponse hostile ou démesurée : fausse AVANT toute lecture (garde Q58, cf.
	// answer-complexity.ts). Le LaTeX sert aussi à juger la forme : il est mesuré.
	if (isBlankAnswerTooComplex(userAnswer, userAnswerLatex)) {
		return { isCorrect: false, feedback: ANSWER_TOO_COMPLEX_FEEDBACK };
	}

	// Équation de droite ou de cercle : chaîne à part, cf. equations/equation-answer.ts
	if (blank.answerKind === 'equation') {
		return equationBlankResult(userAnswerLatex || userAnswer, blank);
	}

	// 1. Validation rules (pre-condition)
	if (blank.validationRules && blank.validationRules.length > 0) {
		const ruleResult = evaluateValidationRules(blank.validationRules, userAnswer, instance);
		if (ruleResult) {
			// rulesSuffice : la règle EST le verdict ; son message (« 5 n'est pas un
			// diviseur de 12 ») répéterait la consigne → retour ordinaire d'une
			// réponse fausse.
			if (rulesDecide(blank)) return { isCorrect: false };
			return { isCorrect: false, feedback: ruleResult.feedback };
		}
	}

	// 2. Inferred mode (value correctness)
	let isCorrect: boolean;
	// Durée composée juste mais mal écrite (« 2 h 75 min », « 2 h 15 mn ») : jugée à l'étape 4
	let durationFormIssue: DurationFormIssue | undefined;

	if (rulesDecide(blank)) {
		// Plusieurs bonnes réponses : les règles, déjà passées, suffisent.
		isCorrect = true;
	} else if (blank.type === 'text') {
		isCorrect = isFuzzyTextMatch(userAnswer, blank.expectedAnswer);
	} else if (blank.unit?.expected) {
		const result = validateQuantityAnswer(
			userAnswer,
			blank.expectedAnswer,
			blank.precision,
			blank.unit.required
		);
		// L'unité, l'écriture d'une durée composée ou l'arrondi est en cause :
		// l'élève doit lire pourquoi (message figé, cf. units/feedback,
		// units/composite-duration et questions/rounding)
		// Trop de chiffres mais bon arrondi : mauvaise forme (cf. questions/rounding)
		if (!result.isCorrect && result.onlyRoundingMissing && result.feedback) {
			return roundingBadForm(result.feedback);
		}
		if (
			!result.isCorrect &&
			(result.unitAtFault || result.durationWritingAtFault || result.roundingAtFault) &&
			result.feedback
		) {
			return { isCorrect: false, feedback: result.feedback };
		}
		isCorrect = result.isCorrect;
		durationFormIssue = result.durationFormIssue;
	} else if (blank.precision) {
		const { result, roundingAtFault, onlyRoundingMissing } = numericalVerdict(
			userAnswer,
			blank.expectedAnswer,
			blank.precision,
			userAnswerLatex || userAnswer
		);
		// Trop de chiffres mais bon arrondi : mauvaise forme (cf. questions/rounding)
		if (onlyRoundingMissing && result.feedback) {
			return roundingBadForm(result.feedback);
		}
		// Trop de décimales / de chiffres significatifs : l'élève doit lire pourquoi
		if (roundingAtFault && result.feedback) {
			return { isCorrect: false, feedback: result.feedback };
		}
		isCorrect = result.isCorrect;
	} else {
		isCorrect = isAnswerMatch(userAnswer, blank.expectedAnswer, instance);
	}

	if (!isCorrect) {
		// Pourcentage attendu, symbole oublié (`20` pour `20 %`) : faux, mais on dit pourquoi
		if (
			blank.type !== 'text' &&
			forgotPercentSign(userAnswerLatex || userAnswer, blank.expectedAnswer)
		) {
			return { isCorrect: false, feedback: FORGOTTEN_PERCENT_SIGN };
		}
		return { isCorrect: false };
	}

	// 3. Required form check (per-blank)
	const formVerdict =
		blank.requiredForm && userAnswerLatex
			? requiredFormVerdict(userAnswerLatex, blank.requiredForm)
			: 'ok';
	if (blank.requiredForm && formVerdict === 'violated') {
		const feedback = getRequiredFormFeedback(blank.requiredForm, false);
		return {
			isCorrect: false,
			status: 'bad_form',
			feedback,
			constraintViolations: [{ constraint: 'form', severity: 'error', feedback }]
		};
	}

	// 4. Form check (mode-aware) + cosmetic violations.
	//
	// The form a blank must satisfy depends on its mode:
	//   - text       → no form constraint at all (value already validated step 2)
	//   - requiredForm → form already checked at step 3; here we only surface
	//                    cosmetic violations (e.g. (2)×3 with brackets:'strict')
	//   - unit       → numeric part must be a simple number; the unit (conversion
	//                  + required symbol) is already handled at step 2 by
	//                  validateQuantityAnswer. We never feed \unit{} to checkForm.
	//   - precision / rulesSuffice → the answer must be a simple (possibly negative) number
	//   - exact      → compare normalised form against the expected answer
	//
	// Use userAnswer as fallback when userAnswerLatex is empty (e.g., prefilled
	// blanks where MathLive never fired an input event).
	const constraints = instance.options?.constraints ?? {};
	const effectiveLatex = userAnswerLatex || userAnswer;

	// text: no form check — value was already validated at step 2.
	if (blank.type === 'text') {
		return { isCorrect: true, status: 'correct' };
	}

	const severities = buildConstraintSeverities(constraints);
	const formOptions = {
		allowFirstNegative: constraints.allowBracketsInFirstNegativeTerm === true
	};

	// requiredForm: form handled at step 3 → only cosmetic violations here.
	if (blank.requiredForm) {
		const cosmetic = requiredFormCosmetics(effectiveLatex, constraints);
		const { status, violations } =
			formVerdict === 'acceptable'
				? withAcceptableForm(cosmetic.status, cosmetic.violations)
				: cosmetic;
		return {
			isCorrect: status !== 'bad_form',
			status,
			feedback: status !== 'correct' ? violations[0]?.feedback : undefined,
			constraintViolations: violations
		};
	}

	// unit: numeric part must be a simple number; cosmetic checks on numeric part.
	if (blank.unit?.expected) {
		// Saisie MathLive (`5\operatorname{\mathrm{km}}`…) ramenée à `valeur\unit{…}`
		// avant d'isoler la partie numérique, comme à l'étape 2.
		// Partie numérique telle que tapée (`2{,}5`, `12\\,500`) : la forme normalisée
		// (`2,5`, `12500`) serait refusée ou jugée mal espacée par le contrôle de forme
		const numericLatex =
			studentNumericLatex(effectiveLatex) ??
			extractNumericLatexPart(normalizeStudentQuantity(effectiveLatex));
		const raw = cosmeticViolations(numericLatex, severities, formOptions);
		const cosmetic = mapCosmeticViolations(raw, false);
		const { status, violations } = durationFormIssue
			? withDurationFormIssue(cosmetic.status, cosmetic.violations, durationFormIssue)
			: cosmetic;

		// Nombre, fraction de nombres ou notation scientifique (cf. isQuantityValueLatex)
		if (!isQuantityValueLatex(numericLatex)) {
			const feedback = CONSTRAINT_FEEDBACK['form'].single;
			return {
				isCorrect: false,
				status: 'bad_form',
				feedback,
				constraintViolations: [{ constraint: 'form', severity: 'error', feedback }, ...violations]
			};
		}

		return {
			isCorrect: status !== 'bad_form',
			status,
			feedback: status !== 'correct' ? violations[0]?.feedback : undefined,
			constraintViolations: violations
		};
	}

	// precision: the answer must be a simple (possibly negative) number.
	// rulesSuffice : même exigence — `expectedAnswer` n'est qu'un exemple, il
	// ne peut pas servir de modèle au contrôle « exact » ci-dessous, qui exige
	// l'identité (3 contre 2 y serait jugé de mauvaise forme).
	if (blank.precision || rulesDecide(blank)) {
		const { status, violations } = checkSimpleNumberForm(effectiveLatex, constraints);
		return {
			isCorrect: status !== 'bad_form',
			status,
			feedback: status !== 'correct' ? violations[0]?.feedback : undefined,
			constraintViolations: violations
		};
	}

	// acceptDecimal : un décimal exact (valeur déjà vérifiée à l'étape 2) n'a pas à
	// reproduire l'écriture attendue (`0{,}5` pour `\frac{1}{2}`) ; seules restent
	// les contraintes cosmétiques d'un nombre simple (zéros inutiles, espaces).
	if (acceptsExactDecimal(blank, effectiveLatex)) {
		const { status, violations } = checkSimpleNumberForm(effectiveLatex, constraints);
		return {
			isCorrect: status !== 'bad_form',
			status,
			feedback: status !== 'correct' ? violations[0]?.feedback : undefined,
			constraintViolations: violations
		};
	}

	// exact: compare normalised form against expected answer (unchanged).
	const { status, violations } = applyConstraints(
		[userAnswer],
		[effectiveLatex],
		[blank.expectedAnswer],
		constraints
	);

	return {
		isCorrect: status !== 'bad_form',
		status,
		feedback: status !== 'correct' ? violations[0]?.feedback : undefined,
		constraintViolations: violations
	};
}

/**
 * Arrondi demandé non fait, réponse arrondie juste (1,136 pour « au centième »
 * de 1,136) : mauvaise forme, violation `rounding` (décision de David, 2026-10-03).
 */
function roundingBadForm(feedback: string): {
	isCorrect: false;
	status: 'bad_form';
	feedback: string;
	constraintViolations: NonNullable<ValidationResult['constraintViolations']>;
} {
	return {
		isCorrect: false,
		status: 'bad_form',
		feedback,
		constraintViolations: [{ constraint: 'rounding', severity: 'error', feedback }]
	};
}

/** Une case où un « x = » recopié devant la valeur est ignoré (cf. answer-variable-prefix) */
function acceptsVariablePrefix(blank: InstanceBlank): boolean {
	return (
		blank.type !== 'text' && blank.answerKind === undefined && expectsValue(blank.expectedAnswer)
	);
}

/**
 * Une case où un « ° » recopié derrière la valeur est ignoré (cf.
 * answer-degree-suffix) : comme le préfixe, mais jamais pour une case à unité,
 * qui garde le traitement des unités (° y est une unité).
 */
function acceptsDegreeSuffix(blank: InstanceBlank): boolean {
	return (
		acceptsVariablePrefix(blank) &&
		!blank.unit?.expected &&
		expectsUnitlessValue(blank.expectedAnswer)
	);
}

/**
 * Réponses (et leur LaTeX) passées par `transform` dans les cases qui l'admettent.
 * Case par case en mode positionnel ; en `orderIndependent`, seulement si TOUTES
 * les cases l'admettent (la case d'une réponse n'est pas encore connue).
 */
function transformAcceptedAnswers(
	userAnswers: string[],
	instance: QuestionInstance,
	userAnswersLatex: string[] | undefined,
	accepts: (blank: InstanceBlank) => boolean,
	transform: (answer: string, expected: string) => string
): { answers: string[]; latex: string[] | undefined } {
	const blanks = instance.blanks ?? [];
	// Ordre libre : la case d'une réponse n'est pas connue → toutes doivent l'admettre
	const orderFree = instance.options?.orderIndependent === true;
	const allAccept = blanks.every(accepts);
	const strip = (answer: string, i: number): string => {
		const blank = blanks[i];
		const accepted = orderFree ? allAccept : blank !== undefined && accepts(blank);
		return accepted && blank ? transform(answer, blank.expectedAnswer) : answer;
	};
	return {
		answers: userAnswers.map(strip),
		latex: userAnswersLatex?.map(strip)
	};
}

/** Réponses sans « variable = » recopié en tête ni « ° » recopié en fin */
function withoutCopiedDecorations(
	userAnswers: string[],
	instance: QuestionInstance,
	userAnswersLatex: string[] | undefined
): { answers: string[]; latex: string[] | undefined } {
	const prefixFree = transformAcceptedAnswers(
		userAnswers,
		instance,
		userAnswersLatex,
		acceptsVariablePrefix,
		withoutVariablePrefix
	);
	return transformAcceptedAnswers(
		prefixFree.answers,
		instance,
		prefixFree.latex,
		acceptsDegreeSuffix,
		withoutDegreeSuffix
	);
}

/**
 * Validate fill-in-blanks answers using per-blank pipeline
 */
export function validateBlanks(
	rawUserAnswers: string[],
	instance: QuestionInstance,
	rawUserAnswersLatex?: string[]
): ValidationResult {
	const blanks = instance.blanks!;

	if (rawUserAnswers.length !== blanks.length) {
		return { isCorrect: false, message: 'Nombre de réponses incorrect' };
	}

	// « x = » recopié devant la valeur, « ° » recopié derrière : ignorés (2026-10-02)
	const { answers: userAnswers, latex: userAnswersLatex } = withoutCopiedDecorations(
		rawUserAnswers,
		instance,
		rawUserAnswersLatex
	);

	if (instance.options?.orderIndependent) {
		return validateBlanksOrderIndependent(userAnswers, instance, userAnswersLatex);
	}

	return aggregateOrderedBlanks(
		blanks.map((blank, i) =>
			validateSingleBlank(userAnswers[i], blank, userAnswersLatex?.[i], instance)
		)
	);
}

type SingleBlankResult = ReturnType<typeof validateSingleBlank>;

/** Verdict global d'une question à cases ordonnées, depuis le verdict de chaque case */
function aggregateOrderedBlanks(results: readonly SingleBlankResult[]): ValidationResult {
	// Seul le nombre de cases sert ici
	const blanks = results;
	// Ordered: per-blank pipeline
	let worstStatus: ValidationStatus | undefined;
	const allViolations: NonNullable<ValidationResult['constraintViolations']> = [];
	const incorrectIndexes: number[] = [];
	// Message propre au trou unique, s'il en a un (unité en cause, règle de validation…)
	let singleBlankFeedback: string | undefined;
	// Message propre à chaque trou incorrect (index = index du trou), affiché près du trou
	const blankFeedback: (string | undefined)[] = new Array(blanks.length).fill(undefined);
	let hasConstraintResults = false;
	let emptyCount = 0;
	let anyIncorrectValue = false;

	for (let i = 0; i < results.length; i++) {
		const result = results[i];

		if (result.status === 'empty') {
			emptyCount++;
		}

		if (!result.isCorrect) {
			incorrectIndexes.push(i + 1);
			if (blanks.length === 1) singleBlankFeedback = result.feedback;
			blankFeedback[i] = result.feedback;
			// Case fausse (valeur) : sans statut propre, le statut global restait celui
			// des cases justes (« correct ») alors que isCorrect valait false
			if (result.status === undefined) anyIncorrectValue = true;
		}

		// Aggregate worst status (priority: bad_form > unoptimal_form > correct)
		// Skip 'empty' — handled separately below
		if (result.status !== undefined && result.status !== 'empty') {
			if (worstStatus === undefined) {
				worstStatus = result.status;
			} else if (result.status === 'bad_form') {
				worstStatus = 'bad_form';
			} else if (result.status === 'unoptimal_form' && worstStatus !== 'bad_form') {
				worstStatus = 'unoptimal_form';
			}
		}

		if (result.constraintViolations) {
			hasConstraintResults = true;
			allViolations.push(...result.constraintViolations);
		}
	}

	// All blanks empty → early return
	if (emptyCount === blanks.length) {
		return { isCorrect: false, status: 'empty', feedback: "Tu n'as rien répondu." };
	}

	// Some blanks empty among multiple: apply old system's ratio logic
	if (emptyCount > 0) {
		if (emptyCount <= blanks.length / 2) {
			// ≤ half empty → unoptimal_form (unless already worse)
			if (worstStatus !== 'bad_form') {
				worstStatus = 'unoptimal_form';
			}
		}
		// > half empty → stays incorrect via incorrectIndexes
	}

	const allCorrect = incorrectIndexes.length === 0;
	const result: ValidationResult = { isCorrect: allCorrect };
	if (blankFeedback.some((message) => message !== undefined)) {
		result.blankFeedback = blankFeedback;
	}

	// Include constraint results when constraint checking occurred
	if (hasConstraintResults || worstStatus !== undefined) {
		if (worstStatus === 'bad_form') {
			result.isCorrect = false;
		}
		result.status = worstStatus;
		result.constraintViolations = allViolations;
	}
	if (anyIncorrectValue && result.status !== undefined) result.status = 'incorrect';

	if (!allCorrect) {
		if (emptyCount > 0 && blanks.length > 1) {
			result.feedback = "Tu n'as pas tout complété.";
		} else if (worstStatus === 'bad_form') {
			result.feedback = feedbackOf('bad_form', allViolations);
		} else if (singleBlankFeedback) {
			result.feedback = singleBlankFeedback;
		} else {
			result.feedback = `Les blancs suivants sont incorrects: ${incorrectIndexes.join(', ')}`;
		}
	} else if (worstStatus === 'unoptimal_form') {
		result.feedback = allViolations[0]?.feedback;
	}

	return result;
}

/**
 * Match a single answer against expected (algebraic equivalence or case-insensitive string).
 * L'instance fournit les hypothèses de l'énoncé (ADR 0012), qui restreignent le domaine
 * de comparaison, et les fonctions déclarées par le modèle (`P'(2)`).
 */
function isAnswerMatch(userAns: string, correctAns: string, instance: QuestionInstance): boolean {
	// Same UI-protection rationale as validateAlgebraic: bound the equivalence
	// check so a malicious or accidental pathological input cannot freeze the UI.
	const options = {
		timeoutMs: 500,
		assumptions: instance.options?.answerAssumptions,
		genericFunctions: templateGenericFunctions(instance.genericFunctions)
	};
	if (areEquivalent(userAns, correctAns, options)) return true;
	return userAns.trim().toLowerCase() === correctAns.trim().toLowerCase();
}

/**
 * Appariement maximal réponses → cases (chemins augmentants de Kuhn) : exact,
 * et largement assez rapide pour le nombre de cases d'une question.
 *
 * @param accepts - `accepts[a][b]` : la case `b` accepte la réponse `a`
 * @param initial - appariement de départ (même forme que le résultat), complété
 * @returns `matching[a]` = case attribuée à la réponse `a`, `-1` si aucune
 */
function maximumMatching(accepts: boolean[][], blankCount: number, initial?: number[]): number[] {
	const answerOfBlank: number[] = Array.from({ length: blankCount }, () => -1);
	// Appariement de départ : ses réponses restent appariées (un chemin augmentant
	// peut les déplacer, jamais les détacher)
	initial?.forEach((b, a) => {
		if (b !== -1) answerOfBlank[b] = a;
	});

	const tryAssign = (a: number, visited: boolean[]): boolean => {
		for (let b = 0; b < blankCount; b++) {
			if (!accepts[a][b] || visited[b]) continue;
			visited[b] = true;
			// Case libre, ou sa réponse actuelle peut se reloger ailleurs
			if (answerOfBlank[b] === -1 || tryAssign(answerOfBlank[b], visited)) {
				answerOfBlank[b] = a;
				return true;
			}
		}
		return false;
	};

	for (let a = 0; a < accepts.length; a++) {
		if (initial && initial[a] !== -1) continue;
		tryAssign(
			a,
			Array.from({ length: blankCount }, () => false)
		);
	}

	const matching: number[] = Array.from({ length: accepts.length }, () => -1);
	answerOfBlank.forEach((a, b) => {
		if (a !== -1) matching[a] = b;
	});
	return matching;
}

/**
 * Appariement réponses → cases (`orderIndependent`), en deux temps : d'abord les
 * réponses justes, puis — sans en détacher aucune — celles qui ne sont justes
 * qu'à l'arrondi près (trop de chiffres, cf. questions/rounding). Une réponse
 * exacte passe donc avant une trop précise pour la même case.
 *
 * @returns `matching[a]` = case de la réponse `a` (`-1` si aucune) ;
 *   `roundingFeedback[a]` = message d'arrondi si elle n'y est juste qu'à l'arrondi près
 */
function matchAnswersToBlanks(
	userAnswers: string[],
	instance: QuestionInstance
): { matching: number[]; roundingFeedback: (string | undefined)[] } {
	const blanks = instance.blanks ?? [];
	const accepts = userAnswers.map((answer) =>
		blanks.map((blank) => answer.trim() !== '' && validateBlankValue(answer, blank, instance))
	);
	const exactMatching = maximumMatching(accepts, blanks.length);
	if (exactMatching.every((b, a) => b !== -1 || !userAnswers[a].trim())) {
		return { matching: exactMatching, roundingFeedback: userAnswers.map(() => undefined) };
	}

	const roundingFeedbacks = userAnswers.map((answer, a) =>
		blanks.map((blank, b) =>
			answer.trim() !== '' && !accepts[a][b]
				? roundingOnlyFeedback(answer, blank, instance)
				: undefined
		)
	);
	const looseAccepts = accepts.map((row, a) =>
		row.map((ok, b) => ok || roundingFeedbacks[a][b] !== undefined)
	);
	const matching = maximumMatching(looseAccepts, blanks.length, exactMatching);
	return {
		matching,
		roundingFeedback: matching.map((b, a) =>
			b !== -1 && !accepts[a][b] ? roundingFeedbacks[a][b] : undefined
		)
	};
}

/**
 * Forme d'une réponse appariée à sa case (`orderIndependent`) : forme exigée,
 * puis contraintes cosmétiques. La valeur est déjà jugée juste.
 */
function matchedAnswerForm(
	userAnswer: string,
	blankLatex: string | undefined,
	blank: InstanceBlank,
	instance: QuestionInstance,
	roundingFeedback?: string
): { status: ValidationStatus; violations: NonNullable<ValidationResult['constraintViolations']> } {
	// Appariée à l'arrondi près : mauvaise forme, violation `rounding` (cf. questions/rounding)
	if (roundingFeedback) {
		return {
			status: 'bad_form',
			violations: roundingBadForm(roundingFeedback).constraintViolations
		};
	}

	// Case « intervalles » appariée (valeur déjà juste) : écriture jugée par son propre module,
	// jamais par la comparaison d'expressions (qui la dirait de mauvaise forme)
	if (blank.answerKind === 'intervalles') {
		const result = intervalBlankResult(blankLatex || userAnswer, blank, instance);
		return { status: result.status ?? 'incorrect', violations: result.constraintViolations ?? [] };
	}
	// Case « équation » appariée : même jugement que seule (forme exigée, cercle à simplifier)
	if (blank.answerKind === 'equation') {
		const result = equationBlankResult(blankLatex || userAnswer, blank);
		return { status: result.status ?? 'incorrect', violations: result.constraintViolations ?? [] };
	}

	// Grandeur appariée (valeur déjà juste) : même jugement qu'en mode positionnel
	// (partie numérique + unité), jamais la comparaison à l'écriture de l'attendu
	if (blank.unit?.expected) {
		const result = validateSingleBlank(userAnswer, blank, blankLatex, instance);
		return { status: singleBlankStatus(result), violations: result.constraintViolations ?? [] };
	}

	let worstStatus: ValidationStatus = 'correct';
	const allViolations: NonNullable<ValidationResult['constraintViolations']> = [];

	if (blank.requiredForm && blankLatex) {
		const verdict = requiredFormVerdict(blankLatex, blank.requiredForm);
		if (verdict === 'violated') {
			const feedback = getRequiredFormFeedback(blank.requiredForm, false);
			allViolations.push({ constraint: 'form', severity: 'error', feedback });
			worstStatus = 'bad_form';
		} else if (verdict === 'acceptable') {
			const feedback = REQUIRED_FORM_FEEDBACK.acceptable;
			allViolations.push({ constraint: 'form', severity: 'warning', feedback });
			worstStatus = 'unoptimal_form';
		}
	}

	if (blankLatex) {
		// rulesSuffice : pas de modèle de forme, cf. checkSimpleNumberForm
		// Forme exigée : déjà jugée par le motif ; ici seules les contraintes cosmétiques,
		// comme pour une case seule (l'attendu n'est pas LA forme à reproduire)
		const { status, violations } = blank.requiredForm
			? requiredFormCosmetics(blankLatex, instance.options?.constraints ?? {})
			: blank.precision || rulesDecide(blank) || acceptsExactDecimal(blank, blankLatex)
				? checkSimpleNumberForm(blankLatex, instance.options?.constraints ?? {})
				: applyConstraints(
						[userAnswer],
						[blankLatex],
						[blank.expectedAnswer],
						instance.options?.constraints ?? {}
					);
		if (status === 'bad_form') worstStatus = 'bad_form';
		else if (status === 'unoptimal_form' && worstStatus === 'correct')
			worstStatus = 'unoptimal_form';
		allViolations.push(...violations);
	}

	return { status: worstStatus, violations: allViolations };
}

/** Order-independent matching: answers matched to blanks by maximum bipartite matching */
function validateBlanksOrderIndependent(
	userAnswers: string[],
	instance: QuestionInstance,
	userAnswersLatex?: string[]
): ValidationResult {
	const blanks = instance.blanks!;

	// Count empty answers first
	let emptyCount = 0;
	for (const ans of userAnswers) {
		if (!ans.trim()) emptyCount++;
	}

	// All empty → early return
	if (emptyCount === blanks.length) {
		return { isCorrect: false, status: 'empty', feedback: "Tu n'as rien répondu." };
	}

	// Réponse hostile ou démesurée (garde Q58) : fausse, avec son message. Les cases
	// « intervalles » ont leur propre garde (dans `validateBlankValue`).
	const ordinaryBlanks = blanks.every((blank) => blank.answerKind !== 'intervalles');
	if (
		ordinaryBlanks &&
		userAnswers.some((answer, i) => isBlankAnswerTooComplex(answer, userAnswersLatex?.[i]))
	) {
		return { isCorrect: false, feedback: ANSWER_TOO_COMPLEX_FEEDBACK };
	}

	// Compatibilités réponse × case (valeur seule), puis appariement MAXIMAL.
	// Un appariement glouton (première case libre qui accepte) pouvait prendre
	// la seule case d'une autre réponse et refuser une copie juste.
	const { matching, roundingFeedback } = matchAnswersToBlanks(userAnswers, instance);
	const used = new Set(matching.filter((b) => b !== -1));

	// Count unmatched non-empty answers
	const unmatchedNonEmpty = userAnswers.filter((a, i) => a.trim() && matching[i] === -1).length;
	if (unmatchedNonEmpty > 0) {
		if (emptyCount > 0 && blanks.length > 1) {
			return { isCorrect: false, feedback: "Tu n'as pas tout complété." };
		}
		// Pourcentage attendu, symbole oublié sur une réponse non appariée : même
		// rappel qu'en mode positionnel
		const forgotPercent = userAnswers.some(
			(answer, i) =>
				answer.trim() &&
				matching[i] === -1 &&
				blanks.some(
					(blank, b) =>
						!used.has(b) &&
						blank.type !== 'text' &&
						forgotPercentSign(userAnswersLatex?.[i] || answer, blank.expectedAnswer)
				)
		);
		if (forgotPercent) return { isCorrect: false, feedback: FORGOTTEN_PERCENT_SIGN };
		return { isCorrect: false, message: 'Incorrect' };
	}

	// Some blanks empty among multiple: apply ratio logic
	if (emptyCount > 0) {
		if (emptyCount > blanks.length / 2) {
			return { isCorrect: false, feedback: "Tu n'as pas tout complété." };
		}
		// ≤ half empty: matched answers are correct but form is suboptimal
		return {
			isCorrect: false,
			status: 'unoptimal_form',
			feedback: "Tu n'as pas tout complété."
		};
	}

	// All matched, no empty. Apply form/constraints on matched pairs.
	let worstStatus: ValidationStatus = 'correct';
	const allViolations: NonNullable<ValidationResult['constraintViolations']> = [];

	for (let a = 0; a < userAnswers.length; a++) {
		const form = matchedAnswerForm(
			userAnswers[a],
			userAnswersLatex?.[a],
			blanks[matching[a]],
			instance,
			roundingFeedback[a]
		);
		if (form.status === 'bad_form') worstStatus = 'bad_form';
		else if (form.status === 'unoptimal_form' && worstStatus === 'correct')
			worstStatus = 'unoptimal_form';
		allViolations.push(...form.violations);
	}

	if (worstStatus === 'correct') {
		return { isCorrect: true, message: 'Correct !' };
	}

	return {
		isCorrect: worstStatus !== 'bad_form',
		status: worstStatus,
		feedback: feedbackOf(worstStatus, allViolations),
		constraintViolations: allViolations
	};
}

// ============================================================================
// STATUT PAR CASE (évaluation notée, barème du chantier 5)
// ============================================================================

/** Verdict d'une case → son statut (une valeur fausse n'a pas de statut propre) */
function singleBlankStatus(result: {
	isCorrect: boolean;
	status?: ValidationStatus;
}): ValidationStatus {
	if (result.status === 'empty') return 'empty';
	if (result.isCorrect) return result.status === 'unoptimal_form' ? 'unoptimal_form' : 'correct';
	return result.status === 'bad_form' ? 'bad_form' : 'incorrect';
}

/**
 * Statut de CHAQUE case d'une question à trous, par la même chaîne que
 * `validateAnswer` (validateSingleBlank ; appariement maximal si
 * `orderIndependent`). Le barème d'une évaluation en a besoin : l'agrégat de
 * `validateAnswer` ne dit pas combien de cases sont vides ni lesquelles sont
 * fausses. N'altère aucun verdict existant.
 *
 * `orderIndependent` : un statut par RÉPONSE (rang de saisie), la case qui
 * l'accepte étant trouvée par appariement.
 *
 * @returns un statut par case ; `[]` si la question n'a pas de case. Nombre de
 *   réponses différent du nombre de cases : toutes `incorrect`.
 */
export function blankStatuses(
	userAnswers: string[],
	instance: QuestionInstance,
	userAnswersLatex?: string[]
): ValidationStatus[] {
	return validateBlanksDetailed(userAnswers, instance, userAnswersLatex).statuses;
}

/**
 * Verdict global (celui de `validateAnswer`) ET statut de chaque case, en UNE
 * validation par case (le barème d'une évaluation a besoin des deux).
 * `orderIndependent` : l'appariement est refait pour les statuts (cas rare).
 */
export function validateBlanksDetailed(
	rawUserAnswers: string[],
	instance: QuestionInstance,
	rawUserAnswersLatex?: string[]
): { result: ValidationResult; statuses: ValidationStatus[] } {
	const { result, statuses } = detailBlanks(rawUserAnswers, instance, rawUserAnswersLatex);
	return { result, statuses };
}

/** Remarques d'une case : messages de forme puis message propre, sans doublon */
function remarksOf(
	feedback: string | undefined,
	violations: NonNullable<ValidationResult['constraintViolations']> | undefined
): string[] {
	const messages = [...(violations ?? []).map((v) => v.feedback), ...(feedback ? [feedback] : [])];
	return [...new Set(messages)];
}

/**
 * Verdict global + statut ET remarques de chaque case, en une validation par
 * case (cœur de `validateBlanksDetailed` et de `validateAnswerDetailed`).
 */
function detailBlanks(
	rawUserAnswers: string[],
	instance: QuestionInstance,
	rawUserAnswersLatex?: string[]
): {
	result: ValidationResult;
	statuses: ValidationStatus[];
	remarks: string[][];
	/** Réponses retenues (sans « x = » ni « ° » recopiés), LaTeX de préférence */
	answers: string[];
} {
	const blanks = instance.blanks ?? [];
	if (blanks.length === 0) {
		return {
			result: { isCorrect: rawUserAnswers.length === 0 },
			statuses: [],
			remarks: [],
			answers: []
		};
	}
	if (rawUserAnswers.length !== blanks.length) {
		return {
			result: { isCorrect: false, message: 'Nombre de réponses incorrect' },
			statuses: blanks.map(() => 'incorrect'),
			remarks: blanks.map(() => []),
			answers: blanks.map((_, i) => rawUserAnswersLatex?.[i] || rawUserAnswers[i] || '')
		};
	}

	// « x = » et « ° » recopiés : ignorés, comme dans validateBlanks
	const { answers: userAnswers, latex: userAnswersLatex } = withoutCopiedDecorations(
		rawUserAnswers,
		instance,
		rawUserAnswersLatex
	);
	const answers = userAnswers.map((answer, i) => userAnswersLatex?.[i] || answer);

	if (!instance.options?.orderIndependent) {
		const results = blanks.map((blank, i) =>
			validateSingleBlank(userAnswers[i], blank, userAnswersLatex?.[i], instance)
		);
		return {
			result: aggregateOrderedBlanks(results),
			statuses: results.map(singleBlankStatus),
			remarks: results.map((r) => remarksOf(r.feedback, r.constraintViolations)),
			answers
		};
	}

	const perAnswer = orderIndependentDetails(userAnswers, instance, userAnswersLatex);
	return {
		result: validateBlanksOrderIndependent(userAnswers, instance, userAnswersLatex),
		statuses: perAnswer.map((d) => d.status),
		remarks: perAnswer.map((d) => d.remarks),
		answers
	};
}

/** Statut et remarques de chaque RÉPONSE (rang de saisie), case trouvée par appariement */
function orderIndependentDetails(
	userAnswers: string[],
	instance: QuestionInstance,
	userAnswersLatex?: string[]
): { status: ValidationStatus; remarks: string[] }[] {
	const blanks = instance.blanks ?? [];

	const { matching, roundingFeedback } = matchAnswersToBlanks(userAnswers, instance);
	const used = new Set(matching.filter((b) => b !== -1));
	const freeBlanks = blanks.filter((_, b) => !used.has(b));
	return userAnswers.map((answer, a) => {
		if (!answer.trim()) return { status: 'empty', remarks: [] };
		if (matching[a] === -1) {
			return {
				status: 'incorrect',
				remarks: unmatchedRemarks(answer, userAnswersLatex?.[a], freeBlanks, instance)
			};
		}
		const form = matchedAnswerForm(
			answer,
			userAnswersLatex?.[a],
			blanks[matching[a]],
			instance,
			roundingFeedback[a]
		);
		return { status: form.status, remarks: remarksOf(undefined, form.violations) };
	});
}

/**
 * Message propre d'une réponse non appariée (`orderIndependent`) : le message
 * (% oublié, unité, réponse démesurée…) que lui donnent les cases libres, s'il
 * est le seul. Messages différents selon la case : aucun, la case visée n'étant
 * pas connue.
 */
function unmatchedRemarks(
	answer: string,
	latex: string | undefined,
	freeBlanks: readonly InstanceBlank[],
	instance: QuestionInstance
): string[] {
	if (freeBlanks.length === 0) return [];
	const messages = new Set(
		freeBlanks.flatMap(
			(blank) => validateSingleBlank(answer, blank, latex, instance).feedback ?? []
		)
	);
	return messages.size === 1 ? [...messages] : [];
}

// ============================================================================
// VERDICT DÉTAILLÉ (résultat attendu, R11)
// ============================================================================

/** Réponse d'un élève, telle que la correction la relit */
export interface StudentAnswer {
	/** Une valeur par case (chaîne vide = case vide) ; absent → valeurs préremplies */
	values?: string[];
	/** LaTeX tapé (MathLive), une entrée par case ; sert à juger la forme */
	latex?: string[];
	/** QCM : choix cochés, en indices d'ORIGINE (`choices[]`) */
	choiceIndexes?: number[];
}

export interface BlankVerdict {
	index: number;
	status: ValidationStatus;
	/** Remarques propres à CETTE case (forme, unité…), en français */
	remarks: string[];
	/** Réponse retenue (LaTeX saisi, sans « x = » ni « ° » recopiés) ; brute, non neutralisée */
	answer: string;
}

/** Issue d'un choix de QCM : bon coché, faux coché, bon oublié, faux laissé */
export type ChoiceOutcome = 'checked-correct' | 'checked-wrong' | 'missed' | 'unchecked';

export interface ChoiceVerdict {
	/** Indice d'origine (`choices[]`) */
	originalIndex: number;
	isCorrect: boolean;
	checked: boolean;
	outcome: ChoiceOutcome;
}

export interface DetailedVerdict {
	/** Statut global : celui de `validateAnswer` (`status`, sinon juste / faux) */
	status: ValidationStatus;
	/** Une entrée par case (`orderIndependent` : par rang de saisie) ; `[]` pour un QCM */
	blanks: BlankVerdict[];
	/** QCM seulement : une entrée par choix, dans l'ordre d'origine */
	choices?: ChoiceVerdict[];
	/** Message global de `validateAnswer`, s'il y en a un */
	feedback?: string;
}

/** Statut global d'un `ValidationResult` (même lecture que le lanceur de specs) */
function statusOfResult(result: ValidationResult): ValidationStatus {
	return result.status ?? (result.isCorrect ? 'correct' : 'incorrect');
}

/** Indices d'origine des bons choix */
function correctChoices(instance: QuestionInstance): Set<number> {
	if (instance.choices && instance.choices.length > 0) {
		return new Set(instance.choices.flatMap((c, i) => (c.isCorrect ? [i] : [])));
	}
	const raw = instance.correctChoiceIndex;
	const list = Array.isArray(raw) ? raw : raw !== undefined ? [raw] : [];
	return new Set(list.map(Number).filter((n) => Number.isInteger(n)));
}

/**
 * Bons choix d'un QCM à règles (`validationRules`) : ce sont les règles qui
 * jugent, choix par choix (même évaluation que `validateAnswer` sur un choix).
 */
function choicesAcceptedByRules(instance: QuestionInstance, count: number): Set<number> {
	const accepted = new Set<number>();
	for (let i = 0; i < count; i++) {
		if (validateAnswer(i, instance).isCorrect) accepted.add(i);
	}
	return accepted;
}

function detailChoices(instance: QuestionInstance, answer: StudentAnswer): DetailedVerdict {
	const checked = answer.choiceIndexes ?? [];
	const result = validateAnswer(
		instance.multipleAnswers ? checked : (checked[0] ?? []),
		instance,
		answer.latex
	);
	const byRules = (instance.validationRules?.length ?? 0) > 0;
	const declared = correctChoices(instance);
	const count = Math.max(instance.choices?.length ?? 0, ...[...declared].map((i) => i + 1));
	const good = byRules ? choicesAcceptedByRules(instance, count) : declared;
	const chosen = new Set(checked);
	const choices = Array.from({ length: count }, (_, i): ChoiceVerdict => {
		const isCorrect = good.has(i);
		const isChecked = chosen.has(i);
		const outcome: ChoiceOutcome = isChecked
			? isCorrect
				? 'checked-correct'
				: 'checked-wrong'
			: isCorrect
				? 'missed'
				: 'unchecked';
		return { originalIndex: i, isCorrect, checked: isChecked, outcome };
	});
	return {
		status: statusOfResult(result),
		blanks: [],
		choices,
		...(result.feedback && { feedback: result.feedback })
	};
}

/**
 * Verdict d'une réponse avec le statut et les remarques de CHAQUE case (R11) :
 * même chaîne que `validateAnswer` (statut global identique), sans rien changer
 * à la notation. QCM : issue de chaque choix. Ne lève jamais.
 */
export function validateAnswerDetailed(
	instance: QuestionInstance,
	answer: StudentAnswer
): DetailedVerdict {
	try {
		const type = getQuestionType(instance);
		if (type === 'course_card') return { status: 'incorrect', blanks: [] };
		if (type === 'multiple_choice') return detailChoices(instance, answer);

		const blanks = instance.blanks ?? [];
		const values = answer.values ?? blanks.map((b) => b.prefilled ?? '');
		const { result, statuses, remarks, answers } = detailBlanks(values, instance, answer.latex);
		return {
			status: statusOfResult(result),
			blanks: statuses.map((status, index) => ({
				index,
				status,
				remarks: remarks[index] ?? [],
				answer: answers[index] ?? ''
			})),
			...(result.feedback && { feedback: result.feedback })
		};
	} catch {
		const blanks = instance?.blanks ?? [];
		return {
			status: 'incorrect',
			blanks: blanks.map((_, index) => ({
				index,
				status: 'incorrect' as const,
				remarks: [],
				answer: answer.latex?.[index] || answer.values?.[index] || ''
			}))
		};
	}
}

// ============================================================================
// MULTIPLE CHOICE VALIDATION
// ============================================================================

/**
 * Valide un QCM : même statut que la note du serveur (`statusFromChoices`, V4).
 * - toutes les bonnes, aucune mauvaise → correct ;
 * - une partie des bonnes, aucune mauvaise → unoptimal_form (½), « Il manque
 *   des réponses. », `isCorrect` faux (SRS : à revoir, Q40) ;
 * - une mauvaise cochée → incorrect ; rien coché → empty.
 *
 * @param userAnswer - Choix cochés (indices d'origine)
 * @param correctAnswer - Bons choix (indices d'origine) de l'instance
 * @param multipleAnswers - Plusieurs réponses attendues
 * @param letterOf - Lettre d'un indice d'origine dans le message (défaut : sans mélange)
 */
export function validateChoice(
	userAnswer: number | number[],
	correctAnswer: string | string[],
	multipleAnswers?: boolean,
	letterOf: (originalIndex: number) => string = choiceLetter
): ValidationResult {
	// Indice illisible (aucun choix coché en réponse unique) : il ne désigne rien
	const userIndexes = (Array.isArray(userAnswer) ? userAnswer : [userAnswer]).filter((index) =>
		Number.isInteger(index)
	);
	const correctIndexes = (Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer]).map(
		Number
	);

	const status = statusFromChoices(userIndexes, correctIndexes);
	if (status === 'correct') return { isCorrect: true, status, message: 'Correct !' };
	if (status === 'unoptimal_form') {
		return { isCorrect: false, status, message: 'Incomplet', feedback: MISSING_CHOICES_FEEDBACK };
	}
	return {
		isCorrect: false,
		status,
		message: 'Incorrect',
		feedback: multipleAnswers
			? `Les choix corrects sont: ${correctIndexes.map(letterOf).sort().join(', ')}`
			: `Le choix correct est: ${letterOf(correctIndexes[0])}`
	};
}
