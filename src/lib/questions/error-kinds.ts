/**
 * Types d'erreur d'une réponse, case par case (chantier `type-erreur`, PR 2 et 3)
 * ================================================================================
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
 *   réponse attendue d'une case n'y est pas connue ;
 * - la case n'est pas jugée par ses règles seules (`rulesSuffice`) : son
 *   attendu n'est qu'un exemple de réponse juste.
 *
 * Erreur prévue (chantier `idees-format`, idée 3) : une case fausse qui fait
 * une erreur prévue par l'auteur (`expectedErrorOf`) compte sous le nom de
 * cette erreur (son nom court, sinon le message de l'élève, Q2), à la place du
 * type deviné, même quand la case a déjà une remarque : c'est son message que
 * l'élève lit en tête.
 *
 * Le prof lit le type en étiquette (`errorGuessLabel`, panneaux d'erreurs) ;
 * l'élève le lit en phrase sous sa réponse, à la correction
 * (`errorGuessSentence`, remarque de case du résultat attendu). Q3 : la phrase
 * dit la relation, puis invite à vérifier.
 *
 * @module questions/error-kinds
 */

import { guessErrorKind, type ErrorGuess, type ErrorKind } from '#lib/mathAST/error-kind.ts';
import type { CorrectedDetail } from '#lib/types/evaluation-attempt.ts';
import type { BlankVerdict } from '#lib/utils/answer-validator.ts';
import { expectedErrorOf } from './expected-errors';
import { rulesDecide } from './rules-suffice';
import type {
	InstanceBlank,
	InstanceExpectedError,
	QuestionInstance,
	ValidationStatus
} from './types';

// Types

/**
 * Type d'erreur d'une case, numérotée à partir de 1 : deviné (`guess`), ou
 * erreur prévue par l'auteur (`expected` : son nom, cf. `expectedErrorName`)
 */
export type BlankErrorKind =
	{ blank: number; guess: ErrorGuess } | { blank: number; expected: string };

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

/**
 * Phrase à l'élève, sous sa réponse fausse (Q3 : la relation, puis une
 * invitation à vérifier). La puissance de 10 a sa phrase à part, avec son facteur.
 */
const ERROR_KIND_SENTENCES: Record<Exclude<ErrorKind, 'power-of-ten'>, string> = {
	sign: "Ta réponse est l'opposé du résultat : vérifie le signe.",
	inverse: "Ta réponse est l'inverse du résultat : vérifie le sens de la division.",
	double: "Ta réponse est le double du résultat : vérifie s'il ne fallait pas diviser par 2.",
	half: "Ta réponse est la moitié du résultat : vérifie s'il ne fallait pas multiplier par 2.",
	'square-missing':
		"Le carré de ta réponse donne le résultat : vérifie si tu n'as pas oublié un carré.",
	'square-extra':
		"Ta réponse est le carré du résultat : vérifie si tu n'as pas mis un carré en trop."
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

/**
 * Longueur au-delà de laquelle une réponse n'est pas lue : un nombre d'école
 * tient en bien moins, et la lecture d'une saisie arbitraire reste bornée
 */
const MAX_GUESSED_LENGTH = 64;

// Functions

/** Étiquette d'un type deviné : la puissance de 10 dit son facteur (« × 100 ») */
export function errorGuessLabel(guess: ErrorGuess): string {
	if (guess.kind !== 'power-of-ten') return ERROR_KIND_LABELS[guess.kind];
	const factor = powerOfTenFactor(guess.exponent);
	return `${ERROR_KIND_LABELS['power-of-ten']} (${guess.exponent > 0 ? '×' : '÷'} ${factor})`;
}

/** Nom d'une erreur prévue pour le prof : son nom court, sinon le message de l'élève (Q2) */
export function expectedErrorName(error: InstanceExpectedError): string {
	return error.label ?? error.message;
}

/** Étiquette du type d'une case : type deviné (« × 100 » compris) ou nom de l'erreur prévue */
export function blankErrorKindLabel(kind: BlankErrorKind): string {
	return 'guess' in kind ? errorGuessLabel(kind.guess) : kind.expected;
}

/** Facteur d'une puissance de 10, écrit à la française (« 1 000 ») */
function powerOfTenFactor(exponent: number): string {
	return (10 ** Math.abs(exponent)).toLocaleString('fr-FR');
}

/** Phrase à l'élève pour un type deviné (« Ta réponse est 10 fois trop grande… ») */
export function errorGuessSentence(guess: ErrorGuess): string {
	if (guess.kind !== 'power-of-ten') return ERROR_KIND_SENTENCES[guess.kind];
	const size = guess.exponent > 0 ? 'grande' : 'petite';
	return `Ta réponse est ${powerOfTenFactor(guess.exponent)} fois trop ${size} : vérifie la place de la virgule.`;
}

/** Case dont la réponse attendue est une écriture mathématique ordinaire */
function isPlainMathBlank(blank: InstanceBlank | undefined): blank is InstanceBlank {
	return (
		blank !== undefined &&
		blank.type === 'math' &&
		blank.construire === undefined &&
		blank.cellule === undefined &&
		typeof blank.expectedAnswerLatex === 'string' &&
		// Case jugée par ses règles (`rulesSuffice`) : l'attendu n'est qu'un exemple
		// (« un diviseur de 12 » : 3, mais 2, 4, 6 aussi), pas « le résultat »
		!rulesDecide(blank)
	);
}

/** Le type d'une case fausse, `null` si non reconnu (ou si un moteur lève) */
function guessOf(answer: string, blank: InstanceBlank): ErrorGuess | null {
	if (answer.length > MAX_GUESSED_LENGTH) return null;
	try {
		return guessErrorKind(answer, blank.expectedAnswerLatex ?? '');
	} catch {
		return null;
	}
}

/**
 * Le type d'erreur d'une case jugée, `null` s'il n'y en a pas : case juste,
 * vide ou non notée, déjà nommée par une remarque, case qui n'est pas une
 * écriture mathématique ordinaire, cases appariées librement, type non reconnu.
 */
export function blankErrorGuess(
	instance: QuestionInstance,
	verdict: BlankVerdict
): ErrorGuess | null {
	if (verdict.ungraded || verdict.status !== 'incorrect' || verdict.remarks.length > 0) return null;
	if (instance.options?.orderIndependent === true) return null;
	const blank = instance.blanks?.[verdict.index];
	return isPlainMathBlank(blank) ? guessOf(verdict.answer, blank) : null;
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
	// Détail indisponible : une seule case, fausse selon le statut de la question
	const judged: BlankVerdict[] =
		'unavailable' in detail
			? (instance.blanks ?? []).length === 1 && status === 'incorrect'
				? [{ index: 0, status, remarks: [], answer: values[0] ?? '' }]
				: []
			: detail.blanks.filter(
					(b) =>
						!b.ungraded &&
						(b.status === 'incorrect' ||
							// Mauvaise forme qui fait une erreur prévue (n° 75) : comptée comme l'élève la lit
							(b.status === 'bad_form' && expectedErrorOf(instance, b) !== null))
				);

	const kinds: BlankErrorKind[] = [];
	let unrecognized = 0;
	for (const verdict of judged) {
		const blank = verdict.index + 1;
		// L'erreur prévue prime sur le type deviné, comme pour l'élève
		const expected = expectedErrorOf(instance, verdict);
		if (expected) {
			kinds.push({ blank, expected: expectedErrorName(expected) });
			continue;
		}
		const guess = blankErrorGuess(instance, verdict);
		if (guess) kinds.push({ blank, guess });
		else unrecognized += 1;
	}
	return { kinds, unrecognized };
}
