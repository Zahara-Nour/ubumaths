/**
 * Budget de temps TOTAL de la correction d'un envoi (décision Q59 = a de David)
 * ============================================================================
 *
 * Des écritures courtes passent la garde de complexité mais coûtent cher à
 * corriger (`(x+y+z+1)^{30}` ~0,7 s, `1.0001^{9999}` ~1,2 s par case) : une
 * copie de 20 questions hostiles occuperait le serveur ~10 s. Une copie normale
 * se corrige en quelques dizaines de ms.
 *
 * Règle : le temps de correction est mesuré à l'horloge monotone
 * (`performance.now()`). Une fois le budget épuisé, chaque question RESTANTE
 * qui a une réponse n'est plus corrigée : `incorrect`, 0 point, avec un message.
 * La question en cours finit sa correction (aucune interruption). Une question
 * sans réponse reste `empty` (0 point aussi) : elle n'a rien à corriger, et le
 * message « trop complexe » serait faux. La copie est close et notée normalement
 * par l'appelant.
 */

import { gradeQuestion, type QuestionVerdict, type SubmittedAnswer } from '$lib/questions/grading';
import type { QuestionInstance } from '$lib/questions/types';

// Types
export interface GradingItem {
	instance: QuestionInstance;
	/** null : question laissée sans réponse (ou envoi tardif) */
	answer: SubmittedAnswer | null;
}

/** Réglages injectables (tests) ; par défaut, 5 s à l'horloge monotone */
export interface GradingBudget {
	budgetMs?: number;
	/** Horloge monotone en millisecondes */
	clock?: () => number;
	/** Correcteur d'une question */
	grade?: (instance: QuestionInstance, answer: SubmittedAnswer) => QuestionVerdict;
}

// Constantes
export const SUBMISSION_GRADING_BUDGET_MS = 5_000;
/**
 * Budget du recalcul des statuts par case d'une copie DÉJÀ notée relue (renvoi
 * → 409, Q173). Mesure : une copie normale se recalcule en 0,1-0,3 ms, une
 * copie hostile en ~2 s. 1 s laisse plus de 3 000 fois la marge d'une copie
 * normale et coupe une copie hostile de moitié ; au-delà, détail indisponible.
 */
export const SUBMITTED_COPY_DETAIL_BUDGET_MS = 1_000;
export const GRADING_BUDGET_EXCEEDED_FEEDBACK =
	'Réponse trop complexe pour être corrigée : simplifie ton écriture.';

// Functions
function emptyVerdict(): QuestionVerdict {
	return { status: 'empty', points: 0, isCorrect: false, partial: false };
}

function budgetExceededVerdict(): QuestionVerdict {
	return {
		status: 'incorrect',
		points: 0,
		isCorrect: false,
		partial: false,
		feedback: GRADING_BUDGET_EXCEEDED_FEEDBACK
	};
}

/**
 * Corrige les questions dans l'ordre, dans la limite du budget.
 *
 * @returns un verdict par question (même ordre), le nombre de questions
 *   répondues laissées sans correction faute de budget, et le temps RESTANT du
 *   budget (≥ 0) : le travail qui suit dans la même requête (verdicts détaillés
 *   de la copie servie) s'y tient, au lieu d'ouvrir un nouveau budget
 */
export function gradeWithinBudget(
	items: readonly GradingItem[],
	budget: GradingBudget = {}
): { verdicts: QuestionVerdict[]; skipped: number; remainingMs: number } {
	const budgetMs = budget.budgetMs ?? SUBMISSION_GRADING_BUDGET_MS;
	const clock = budget.clock ?? (() => performance.now());
	const grade = budget.grade ?? gradeQuestion;

	const startedAt = clock();
	let skipped = 0;
	const verdicts = items.map(({ instance, answer }) => {
		if (!answer) return emptyVerdict();
		if (clock() - startedAt >= budgetMs) {
			skipped++;
			return budgetExceededVerdict();
		}
		return grade(instance, answer);
	});
	const remainingMs = Math.max(0, budgetMs - (clock() - startedAt));
	return { verdicts, skipped, remainingMs };
}
