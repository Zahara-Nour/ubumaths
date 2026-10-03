/**
 * Test Spec Runner
 * ================
 *
 * Runs deterministic test specifications against question templates.
 * Each spec fixes variables and provides expected validation outcomes.
 *
 * @module questions/test-spec-runner
 */

import type { QuestionTemplate, TestSpec, ValidationStatus, ConstraintId } from './types';
import type { ValidationResult } from '$lib/types/question-display';
import { generateInstanceWithFixedVariables } from './generator/test-instance-builder';
import { validateAnswer } from '$lib/utils/answer-validator';
import { getQuestionType, isCourseCard } from './types';
import { readExpectedIntervals } from './intervals/interval-answer';
import { readExpectedEquation } from './equations/equation-answer';
import { readExpectedVector } from './vectors/vector-answer';

export interface TestSpecResult {
	spec: TestSpec;
	passed: boolean;
	actual: {
		status: ValidationStatus;
		constraintViolations: ConstraintId[];
	};
	error?: string;
}

/**
 * Run a single test spec against a template.
 */
export function runTestSpec(template: QuestionTemplate, spec: TestSpec): TestSpecResult {
	const makeError = (msg: string): TestSpecResult => ({
		spec,
		passed: false,
		actual: { status: 'incorrect', constraintViolations: [] },
		error: msg
	});

	// Carte de cours : aucune réponse à valider, donc rien à spécifier
	if (isCourseCard(template)) {
		return makeError('Une carte de cours n’a pas de réponse à tester : retirer cette spec');
	}

	// 1. Generate instance with fixed variables
	const genResult = generateInstanceWithFixedVariables(
		template,
		spec.variables,
		spec.variationIndex ?? 0
	);

	if (!genResult.success) {
		return makeError(`Generation failed: ${genResult.errors.join('; ')}`);
	}

	const instance = genResult.instance;
	const questionType = getQuestionType(instance);

	// Case « intervalles », « équation » ou « vecteur » : une réponse attendue illisible est une erreur du MODÈLE
	// (côté élève, elle rendrait toute réponse fausse sans le dire)
	for (const [index, blank] of (instance.blanks ?? []).entries()) {
		if (blank.answerKind === undefined) continue;
		const expected =
			blank.answerKind === 'intervalles'
				? readExpectedIntervals(blank.expectedAnswer)
				: blank.answerKind === 'vecteur'
					? readExpectedVector(blank.expectedAnswer, blank.vectorMode)
					: readExpectedEquation(blank.expectedAnswer);
		if (!expected.ok) {
			return makeError(
				`Réponse attendue illisible (case ${index + 1}) : ${blank.expectedAnswer} — ${expected.error}`
			);
		}
	}

	// 2. Validate answer
	let validationResult: ValidationResult;
	try {
		if (questionType === 'fill_in_blanks') {
			if (!spec.answers) {
				return makeError('Test spec for fill-in-blanks must provide answers[]');
			}
			// answers are LaTeX (same value for text and LaTeX, like the real MathField flow)
			validationResult = validateAnswer(spec.answers, instance, spec.answers);
		} else if (questionType === 'multiple_choice') {
			if (!spec.selectedChoices || spec.selectedChoices.length === 0) {
				return makeError('Test spec for multiple choice must provide selectedChoices[]');
			}

			// selectedChoices are original indices (not shuffled display indices)
			// validateAnswer expects original indices directly
			validationResult = validateAnswer(
				spec.selectedChoices.length === 1 ? spec.selectedChoices[0] : spec.selectedChoices,
				instance
			);
		} else {
			return makeError(`Type de question sans réponse à tester : ${questionType}`);
		}
	} catch (err) {
		return makeError(`Validation error: ${err instanceof Error ? err.message : String(err)}`);
	}

	// 3. Extract actual status and violations
	const actualStatus: ValidationStatus =
		validationResult.status ?? (validationResult.isCorrect ? 'correct' : 'incorrect');
	const actualViolations: ConstraintId[] = (validationResult.constraintViolations ?? []).map(
		(v) => v.constraint
	);

	// 4. Compare with expected
	const statusMatch = actualStatus === spec.expected.status;
	const expectedViolations = spec.expected.constraintViolations ?? [];
	const violationsMatch =
		expectedViolations.length === actualViolations.length &&
		expectedViolations.every((v) => actualViolations.includes(v)) &&
		actualViolations.every((v) => expectedViolations.includes(v));

	return {
		spec,
		passed: statusMatch && violationsMatch,
		actual: {
			status: actualStatus,
			constraintViolations: actualViolations
		}
	};
}

/**
 * Run all test specs for a template.
 */
export function runAllTestSpecs(template: QuestionTemplate): TestSpecResult[] {
	if (!template.testSpecs || template.testSpecs.length === 0) {
		return [];
	}

	return template.testSpecs.map((spec) => runTestSpec(template, spec));
}
