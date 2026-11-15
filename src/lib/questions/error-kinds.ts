/**
 * Types d'erreur d'une réponse, case par case (chantier `type-erreur`, PR 2)
 * ==========================================================================
 *
 * Branche le moteur `guessErrorKind` (mathAST) sur une question corrigée :
 * pour chaque case FAUSSE, compare la réponse de l'élève à la réponse attendue
 * du même tirage. Calculé à la lecture, jamais stocké (Q5) ; la note ne change
 * jamais.
 *
 * Une case reçoit un type seulement si :
 * - c'est une case `math` ordinaire (ni choix, ni figure, ni geste, ni case de
 *   tableau de signes) ;
 * - son statut est « faux » (une mauvaise forme a la bonne valeur) ;
 * - aucun message ne la nomme déjà (remarque de la case : %, unité, arrondi…)
 *   — ce message prime, pas de type en plus. Le message global n'est pas lu :
 *   il reprend la remarque d'une case, ou dit seulement « Les blancs suivants
 *   sont incorrects » sur toute réponse fausse ;
 * - la question n'apparie pas ses cases librement (`orderIndependent`) : la
 *   réponse attendue d'une case n'y est pas connue.
 *
 * @module questions/error-kinds
 */

import { guessErrorKind, type ErrorGuess, type ErrorKind } from '$lib/mathAST/error-kind';
import type { CorrectedDetail } from '$lib/types/evaluation-attempt';
import type { InstanceBlank, QuestionInstance, ValidationStatus } from './types';

// Types

/** Type d'erreur d'une case, numérotée à partir de 1 */
export interface BlankErrorKind {
	blank: number;
	guess: ErrorGuess;
}

/** Cases fausses d'une réponse : celles typées, et le nombre des autres */
export interface AnswerErrorKinds {
	kinds: BlankErrorKind[];
	/** Cases fausses sans type reconnu */
	unrecognized: number;
}

// Constantes

/** Nom d'un type, pour le prof (compte par type, étiquette d'une réponse) */
export const ERROR_KIND_LABELS: Record<ErrorKind, string> = {
	sign: 'Erreur de signe',
	'power-of-ten': 'Puissance de 10',
	inverse: 'Inverse',
	double: 'Double',
	half: 'Moitié',
	'square-missing': 'Carré oublié',
	'square-extra': 'Carré en trop'
};

/** Ordre d'affichage des comptes, à égalité */
export const ERROR_KIND_ORDER: readonly ErrorKind[] = [
	'sign',
	'power-of-ten',
	'inverse',
	'double',
	'half',
	'square-missing',
	'square-extra'
];

// Functions

/** Étiquette d'un type deviné : la puissance de 10 dit son facteur (« × 100 ») */
export function errorGuessLabel(guess: ErrorGuess): string {
	if (guess.kind !== 'power-of-ten') return ERROR_KIND_LABELS[guess.kind];
	const factor = (10 ** Math.abs(guess.exponent)).toLocaleString('fr-FR');
	return `${ERROR_KIND_LABELS['power-of-ten']} (${guess.exponent > 0 ? '×' : '÷'} ${factor})`;
}

/** Case dont la réponse attendue est une écriture mathématique ordinaire */
function isPlainMathBlank(blank: InstanceBlank | undefined): blank is InstanceBlank {
	return (
		blank !== undefined &&
		blank.type === 'math' &&
		blank.construire === undefined &&
		blank.cellule === undefined &&
		typeof blank.expectedAnswerLatex === 'string'
	);
}

/** Le type d'une case fausse, `null` si non reconnu (ou si un moteur lève) */
function guessOf(answer: string, blank: InstanceBlank): ErrorGuess | null {
	try {
		return guessErrorKind(answer, blank.expectedAnswerLatex ?? '');
	} catch {
		return null;
	}
}

/**
 * Types d'erreur des cases fausses d'une réponse.
 *
 * @param detail - verdict case par case ; indisponible : seule une question à
 *   une case se lit encore, d'après le statut de la question et la valeur saisie
 * @param values - réponse enregistrée, une valeur par case
 * @param status - statut enregistré de la question
 */
export function answerErrorKinds(
	instance: QuestionInstance,
	detail: CorrectedDetail,
	values: readonly string[],
	status: ValidationStatus
): AnswerErrorKinds {
	const blanks = instance.blanks ?? [];
	const orderFree = instance.options?.orderIndependent === true;

	// Détail indisponible : une seule case, fausse selon le statut de la question
	const judged: { index: number; answer: string; named: boolean }[] =
		'unavailable' in detail
			? blanks.length === 1 && status === 'incorrect'
				? [{ index: 0, answer: values[0] ?? '', named: false }]
				: []
			: detail.blanks
					.filter((b) => !b.ungraded && b.status === 'incorrect')
					.map((b) => ({
						index: b.index,
						answer: b.answer,
						named: b.remarks.length > 0
					}));

	const kinds: BlankErrorKind[] = [];
	let unrecognized = 0;
	for (const { index, answer, named } of judged) {
		const blank = blanks[index];
		const guess = !named && !orderFree && isPlainMathBlank(blank) ? guessOf(answer, blank) : null;
		if (guess) kinds.push({ blank: index + 1, guess });
		else unrecognized += 1;
	}
	return { kinds, unrecognized };
}
