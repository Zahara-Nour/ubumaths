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
import { getQuestionType } from './types';

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

	// 2. Validate answer
	let validationResult: ValidationResult;
	try {
		if (questionType === 'fill_in_blanks') {
			if (!spec.answers) {
				return makeError('Test spec for fill-in-blanks must provide answers[]');
			}
			// answers are LaTeX (same value for text and LaTeX, like the real MathField flow)
			validationResult = validateAnswer(spec.answers, instance, spec.answers);
		} else {
			// Multiple choice
			if (!spec.selectedChoices || spec.selectedChoices.length === 0) {
				return makeError('Test spec for multiple choice must provide selectedChoices[]');
			}

			// selectedChoices are original indices (not shuffled display indices)
			// validateAnswer expects original indices directly
			validationResult = validateAnswer(
				spec.selectedChoices.length === 1 ? spec.selectedChoices[0] : spec.selectedChoices,
				instance
			);
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
