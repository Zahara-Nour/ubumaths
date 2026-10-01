/**
 * Réponse « intervalles » : jugement d'un ensemble de réels écrit par l'élève
 * ===========================================================================
 *
 * Case marquée `answerKind: 'intervalles'` (ensemble de solutions d'une
 * inéquation). La lecture et la comparaison sont celles de mathAST
 * (`domain/validation` : `parseStudentDomainPieces`, `domainsAreEqual`,
 * `detectDomainMistakes`) ; ce module les traduit dans le barème commun
 * (spécification validée par David le 2026-10-01) :
 *
 * - `correct` : même ensemble, écrit comme il faut (ordre des intervalles indifférent) ;
 * - `unoptimal_form` (½) SEULEMENT pour une écriture à reprendre : intervalles
 *   contigus ou chevauchants non réunis, `[a ; a]` au lieu de `{a}`, borne non
 *   simplifiée. Réglage par modèle : contrainte `intervalForm` (`warn` par défaut,
 *   `strict` → mauvaise forme, `off` → juste) ;
 * - `incorrect` : tout le reste, avec le message de l'erreur reconnue ;
 * - `empty` : rien d'écrit (un « S = » seul compris).
 *
 * Le score 0-100 de mathAST (`calculateDomainSimilarity`) n'est PAS utilisé.
 *
 * @module questions/intervals/interval-answer
 */

import type { ConstraintMode, ValidationStatus } from '$lib/questions/types';
import type { Domain } from '$lib/mathAST/domain/types';
import type { StudentDomainPiece } from '$lib/mathAST/domain/validation';
import {
	parseStudentDomainPieces,
	domainsAreEqual,
	compareDomains,
	detectDomainMistakes,
	MISTAKE_DESCRIPTIONS
} from '$lib/mathAST/domain/validation';
import { expandExcludedPoints } from '$lib/mathAST/domain/validation/compare-domains';
import { intervalDomain } from '$lib/mathAST/domain/factory';
import { variable } from '$lib/mathAST/factory';
import { isInfinity } from '$lib/mathAST/guards';
import { compareNumericNodes } from '$lib/mathAST/eval/compare-numeric';
import { checkReducedFractions } from '$lib/questions/constraint-validators';

// Types
export interface IntervalVerdict {
	status: ValidationStatus;
	/** Message montré à l'élève (erreur reconnue ou écriture à reprendre) */
	feedback?: string;
}

export type ExpectedIntervals = { ok: true; domain: Domain } | { ok: false; error: string };

// Constantes

/** Messages figés (français, tutoiement) */
export const INTERVAL_FEEDBACK = {
	separator: 'Sépare les bornes par un point-virgule : ]2 ; 3[.',
	closedInfinity: "L'infini est toujours exclu : écris ]-∞ ou +∞[.",
	boundsOrder: "Écris les bornes dans l'ordre croissant : la plus petite à gauche.",
	notASet: "Écris un ensemble (un intervalle ou une réunion d'intervalles), pas une inégalité.",
	unreadable: "Réponse illisible : écris un intervalle comme ]2 ; 5] ou une réunion d'intervalles.",
	singleton:
		"Un ensemble réduit à un seul nombre s'écrit entre accolades : {3} plutôt que [3 ; 3].",
	contiguous: 'Réunis en un seul intervalle ceux qui se touchent ou se chevauchent.',
	unsimplified: 'Simplifie les bornes (par exemple 2 plutôt que 4/2).'
} as const;

/** Mode par défaut de `intervalForm` : écriture à reprendre = ½ */
export const DEFAULT_INTERVAL_FORM_MODE: ConstraintMode = 'warn';

/** « S = » (ou « \mathcal{S} = ») en tête de la réponse : ignoré */
const LEADING_SET_NAME = /^\s*(?:S|\\mathcal\s*\{\s*S\s*\}|\\mathscr\s*\{\s*S\s*\})\s*=\s*/;

/** Erreurs de `detectDomainMistakes` dont le message vaut pour une inéquation */
const BOUNDARY_MISTAKES = new Set([
	'included_instead_excluded',
	'excluded_instead_included',
	'wrong_bound_value'
]);

/** Expression neutre pour `detectDomainMistakes` (aucune contrainte de définition) */
const NO_EXPRESSION = variable('x');

// Functions

/** Réponse sans « S = » en tête */
function withoutSetName(answer: string): string {
	return answer.replace(LEADING_SET_NAME, '').trim();
}

/**
 * Virgule employée comme séparateur de bornes (`]2,3[`) : un morceau entre
 * crochets sans point-virgule mais avec une virgule. La virgule décimale de
 * MathLive (`{,}`) n'en est pas une ; avec un point-virgule, la virgule est
 * décimale (`]0,5;1[`).
 */
function usesCommaSeparator(answer: string): boolean {
	const text = answer.replace(/\{,\}/g, '');
	return text
		.split(/\\cup|∪|U/)
		.some(
			(piece) => /[[\]]|\\[lr]brack/.test(piece) && !piece.includes(';') && piece.includes(',')
		);
}

/** Nombre de composantes connexes d'un ensemble */
function componentCount(domain: Domain): number {
	const expanded = expandExcludedPoints(domain);
	if (expanded.kind === 'empty') return 0;
	if (expanded.kind === 'interval_set') return expanded.intervals.length;
	return 1;
}

/** Écriture interdite d'un intervalle : crochet fermé sur l'infini, bornes inversées */
function pieceError(piece: StudentDomainPiece): string | undefined {
	const interval = piece.interval;
	if (!interval) return undefined;
	const { lower, upper } = interval;
	if (
		(lower.type === 'closed' && isInfinity(lower.value)) ||
		(upper.type === 'closed' && isInfinity(upper.value))
	) {
		return INTERVAL_FEEDBACK.closedInfinity;
	}
	if (compareNumericNodes(lower.value, upper.value) === 1) return INTERVAL_FEEDBACK.boundsOrder;
	return undefined;
}

/** Écriture à reprendre d'un ensemble JUSTE (½ par défaut), ou undefined */
function writingIssue(pieces: readonly StudentDomainPiece[], domain: Domain): string | undefined {
	const singleton = pieces.some(
		(piece) =>
			piece.interval?.lower.type === 'closed' &&
			piece.interval.upper.type === 'closed' &&
			compareNumericNodes(piece.interval.lower.value, piece.interval.upper.value) === 0
	);
	if (singleton) return INTERVAL_FEEDBACK.singleton;

	const written = pieces.reduce((count, piece) => count + componentCount(piece.domain), 0);
	if (componentCount(domain) < written) return INTERVAL_FEEDBACK.contiguous;

	const bounds = pieces.flatMap((piece) => piece.bounds ?? []);
	if (checkReducedFractions(bounds).length > 0) return INTERVAL_FEEDBACK.unsimplified;

	return undefined;
}

/** Message de l'erreur reconnue entre deux ensembles différents, s'il y en a un */
function mistakeFeedback(student: Domain, expected: Domain): string | undefined {
	const studentSet = expandExcludedPoints(student);
	const expectedSet = expandExcludedPoints(expected);

	if (
		compareDomains(studentSet, expectedSet).studentIsSubset &&
		componentCount(expectedSet) > componentCount(studentSet)
	) {
		return MISTAKE_DESCRIPTIONS.missing_union_part.description;
	}

	// Intervalle par intervalle (rangés dans l'ordre) : crochet ou borne
	if (
		studentSet.kind === 'interval_set' &&
		expectedSet.kind === 'interval_set' &&
		studentSet.intervals.length === expectedSet.intervals.length
	) {
		for (let i = 0; i < studentSet.intervals.length; i++) {
			const mistake = detectDomainMistakes(
				intervalDomain([studentSet.intervals[i]]),
				intervalDomain([expectedSet.intervals[i]]),
				NO_EXPRESSION
			).find((candidate) => BOUNDARY_MISTAKES.has(candidate.type));
			if (mistake) return mistake.description;
		}
	}
	return undefined;
}

function incorrect(feedback?: string): IntervalVerdict {
	return feedback ? { status: 'incorrect', feedback } : { status: 'incorrect' };
}

/**
 * Lecture de la réponse attendue d'un modèle (bornes en syntaxe maison ou LaTeX).
 * Une réponse illisible est une erreur du MODÈLE : `test-spec-runner` la signale.
 */
export function readExpectedIntervals(expected: string): ExpectedIntervals {
	const parsed = parseStudentDomainPieces(withoutSetName(expected));
	if (!parsed.success) return { ok: false, error: parsed.error };
	if (parsed.format === 'condition') {
		return { ok: false, error: 'La réponse attendue doit être un ensemble, pas une inégalité' };
	}
	const invalid = parsed.pieces.map(pieceError).find((error) => error !== undefined);
	if (invalid) return { ok: false, error: invalid };
	return { ok: true, domain: parsed.domain };
}

/**
 * Juge une réponse « intervalles ».
 *
 * @param answer - réponse de l'élève (LaTeX de MathLive)
 * @param expected - réponse attendue du modèle, résolue
 * @param mode - réglage `intervalForm` du modèle (défaut `warn` = ½)
 */
export function judgeIntervalAnswer(
	answer: string,
	expected: string,
	mode: ConstraintMode = DEFAULT_INTERVAL_FORM_MODE
): IntervalVerdict {
	const written = withoutSetName(answer);
	if (!written) return { status: 'empty' };

	// Modèle fautif : jamais une exception devant l'élève
	const target = readExpectedIntervals(expected);
	if (!target.ok) return incorrect();

	if (usesCommaSeparator(written)) return incorrect(INTERVAL_FEEDBACK.separator);

	const parsed = parseStudentDomainPieces(written);
	if (!parsed.success) return incorrect(INTERVAL_FEEDBACK.unreadable);
	if (parsed.format === 'condition') return incorrect(INTERVAL_FEEDBACK.notASet);

	const invalid = parsed.pieces.map(pieceError).find((error) => error !== undefined);
	if (invalid) return incorrect(invalid);

	if (!domainsAreEqual(parsed.domain, target.domain)) {
		return incorrect(mistakeFeedback(parsed.domain, target.domain));
	}

	const issue = writingIssue(parsed.pieces, parsed.domain);
	if (!issue || mode === 'off') return { status: 'correct' };
	return { status: mode === 'strict' ? 'bad_form' : 'unoptimal_form', feedback: issue };
}
