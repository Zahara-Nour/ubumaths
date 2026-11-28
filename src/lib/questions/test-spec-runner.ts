/**
 * Test Spec Runner
 * ================
 *
 * Runs deterministic test specifications against question templates.
 * Each spec fixes variables and provides expected validation outcomes.
 *
 * @module questions/test-spec-runner
 */

import type {
	QuestionInstance,
	QuestionTemplate,
	TestSpec,
	ValidationStatus,
	ConstraintId
} from './types';
import type { ValidationResult } from '#lib/types/question-display.ts';
import { generateInstanceWithFixedVariables } from './generator/test-instance-builder';
import { validateAnswer, validateAnswerDetailed } from '#lib/utils/answer-validator.ts';
import { expectedErrorOf } from './expected-errors';
// Case « figure » : positions des points (registre, cf. construction/positions) — éditeur,
// relecture de migration et publication côté serveur
import './construction/positions-setup';
import { getQuestionType, isCourseCard } from './types';
import { readExpectedSet } from './intervals/interval-answer';
import { readExpectedEquation } from './equations/equation-answer';
import { readExpectedVector } from './vectors/vector-answer';
import { readExpectedMatrix } from './matrices/matrix-answer';
import { readExpectedPrimitive } from './calculus/primitive-answer';
import { readExpectedResolution } from './resolution/resolution-answer';
import { readExpectedParametricLine } from './parametric/parametric-line-answer';
import { readExpectedSolution } from './calculus/differential-equation-answer';
import { writePythonAnswer } from './python/python-answer';

export interface TestSpecResult {
	spec: TestSpec;
	passed: boolean;
	actual: {
		status: ValidationStatus;
		constraintViolations: ConstraintId[];
		/** Messages des erreurs prévues que la réponse déclenche (idée 3), case par case */
		expectedErrorMessages: string[];
	};
	error?: string;
}

/**
 * Run a single test spec against a template.
 */
/** Réponse d'une case Python vide dans une spec : un verdict « juste » (aucun code) */
const PYTHON_CASE_JUDGED = writePythonAnswer({ code: '', verdict: { juste: true } });

/** Les réponses d'une spec, cases Python laissées vides remplies d'un verdict « juste » */
function withPythonCasesJudged(
	answers: string[] | undefined,
	instance: QuestionInstance
): string[] | undefined {
	if (!answers) return answers;
	const blanks = instance.blanks ?? [];
	return answers.map((answer, index) =>
		blanks[index]?.construire === 'python' && answer.trim() === '' ? PYTHON_CASE_JUDGED : answer
	);
}

export function runTestSpec(template: QuestionTemplate, spec: TestSpec): TestSpecResult {
	const makeError = (msg: string): TestSpecResult => ({
		spec,
		passed: false,
		actual: { status: 'incorrect', constraintViolations: [], expectedErrorMessages: [] },
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

	// Case « intervalles », « équation », « vecteur » ou « matrice » : une réponse attendue illisible est une erreur du MODÈLE
	// (côté élève, elle rendrait toute réponse fausse sans le dire). Case « primitive » ou
	// « solution-ed » : de même pour une attendue qui ne vérifie pas elle-même la règle ; case
	// « resolution » : pour une attendue qui n'est pas la solution de l'équation de l'énoncé.
	for (const [index, blank] of (instance.blanks ?? []).entries()) {
		if (blank.answerKind === undefined) continue;
		if (blank.answerKind === 'primitive' || blank.answerKind === 'solution-ed') {
			const checked =
				blank.answerKind === 'primitive'
					? readExpectedPrimitive(blank.expectedAnswer, blank)
					: readExpectedSolution(blank.expectedAnswer, blank);
			if (!checked.ok) {
				return makeError(
					`Réponse attendue invalide (case ${index + 1}) : ${blank.expectedAnswer} — ${checked.error}`
				);
			}
			continue;
		}
		// Case « résolution » : l'attendue (`x=4`) doit être la solution de `equation`
		if (blank.answerKind === 'resolution') {
			const checked = readExpectedResolution(blank.expectedAnswer, blank);
			if (!checked.ok) {
				return makeError(
					`Réponse attendue invalide (case ${index + 1}) : ${blank.expectedAnswer} — ${checked.error}`
				);
			}
			continue;
		}
		// Case « droite paramétrique » : trois lignes affines en un seul paramètre, vecteur non nul
		if (blank.answerKind === 'droite-parametrique') {
			const checked = readExpectedParametricLine(blank.expectedAnswer);
			if (!checked.ok) {
				return makeError(
					`Réponse attendue invalide (case ${index + 1}) : ${blank.expectedAnswer} — ${checked.error}`
				);
			}
			continue;
		}
		const expected =
			blank.answerKind === 'intervalles'
				? readExpectedSet(blank.expectedAnswer)
				: blank.answerKind === 'vecteur'
					? readExpectedVector(blank.expectedAnswer, blank.vectorMode)
					: blank.answerKind === 'matrice'
						? readExpectedMatrix(blank.expectedAnswer)
						: readExpectedEquation(blank.expectedAnswer);
		if (!expected.ok) {
			return makeError(
				`Réponse attendue illisible (case ${index + 1}) : ${blank.expectedAnswer} — ${expected.error}`
			);
		}
	}

	// 2. Validate answer
	// Case Python laissée vide : comptée juste d'office (le programme ne tourne que dans le
	// navigateur) ; la spec vérifie les autres cases. Une réponse écrite est gardée telle quelle
	const answers = withPythonCasesJudged(spec.answers, instance);
	let validationResult: ValidationResult;
	try {
		if (questionType === 'fill_in_blanks') {
			if (!answers) {
				return makeError('Test spec for fill-in-blanks must provide answers[]');
			}
			// answers are LaTeX (same value for text and LaTeX, like the real MathField flow)
			validationResult = validateAnswer(answers, instance, answers);
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

	// Erreurs prévues déclenchées : même chemin que le résultat attendu de l'élève
	const expectedErrorMessages = validateAnswerDetailed(instance, {
		values: answers,
		latex: answers
	}).blanks.flatMap((verdict) => expectedErrorOf(instance, verdict)?.message ?? []);

	// 4. Compare with expected
	const statusMatch = actualStatus === spec.expected.status;
	const expectedViolations = spec.expected.constraintViolations ?? [];
	const violationsMatch =
		expectedViolations.length === actualViolations.length &&
		expectedViolations.every((v) => actualViolations.includes(v)) &&
		actualViolations.every((v) => expectedViolations.includes(v));

	const wantedMessage = spec.expected.expectedErrorMessage;
	const messageMatch =
		wantedMessage === undefined || expectedErrorMessages.includes(wantedMessage.trim());

	return {
		spec,
		passed: statusMatch && violationsMatch && messageMatch,
		actual: {
			status: actualStatus,
			constraintViolations: actualViolations,
			expectedErrorMessages
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
