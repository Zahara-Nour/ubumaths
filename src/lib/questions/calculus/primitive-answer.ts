/**
 * Réponse « primitive » : une primitive de f dans UNE case
 * ========================================================
 *
 * Case marquée `answerKind: 'primitive'`, champs `integrand` (f), `variable`
 * (défaut `x`), `interval` (facultatif). Spécification validée par David le
 * 2026-10-04 :
 *
 * - juste si la DÉRIVÉE de la réponse (mathAST `differentiate`) est équivalente
 *   à f (`areEquivalent`) : toute primitive l'est, à une constante près ; une
 *   lettre libre ≠ variable (`C`, `K`, `k`, `\lambda`…) est une constante ;
 * - intervalle déclaré : la réponse doit en plus être DÉFINIE en quelques points
 *   de l'intervalle (`\ln(-x)` pour 1/x sur ]0;+∞[ est faux) ;
 * - la dérivée de f au lieu d'une primitive : faux, avec un message ;
 * - rien d'écrit → `empty` ; illisible → `incorrect`, jamais d'exception.
 *
 * L'écriture (fraction simplifiable…) est jugée par le validateur, comme pour
 * une case ordinaire (cf. `calculusBlankResult` dans answer-validator.ts).
 *
 * @module questions/calculus/primitive-answer
 */

import type { MathNode } from '$lib/mathAST/types';
import type { CalculusBlankFields } from '$lib/questions/types';
import {
	type CalculusVerdict,
	type ExpectedCheck,
	DEFAULT_VARIABLE,
	constantNames,
	derivative,
	equivalent,
	numericValue,
	readExpression,
	readIntervalPoints
} from './calculus-reading';

// Types
type PrimitiveSpec = Pick<CalculusBlankFields, 'integrand' | 'variable' | 'interval'>;

/** Question lue : f, sa variable, les points d'essai de l'intervalle */
type ReadSpec =
	| { ok: true; integrand: MathNode; variable: string; points: number[] | null }
	| { ok: false; error: string };

// Constantes

/** Messages figés (français, tutoiement) */
export const PRIMITIVE_FEEDBACK = {
	derivative: "C'est la dérivée de f, pas une primitive."
} as const;

/** Valeur donnée aux constantes pour l'essai sur l'intervalle */
const CONSTANT_TRIAL_VALUE = 0.7;

// Functions

function readSpec(spec: PrimitiveSpec): ReadSpec {
	if (!spec.integrand?.trim()) return { ok: false, error: 'fonction à intégrer absente' };
	const integrand = readExpression(spec.integrand);
	if (!integrand) {
		return { ok: false, error: `fonction à intégrer illisible « ${spec.integrand} »` };
	}
	const variable = spec.variable ?? DEFAULT_VARIABLE;
	if (!spec.interval?.trim()) return { ok: true, integrand, variable, points: null };
	const interval = readIntervalPoints(spec.interval);
	if (!interval.ok) return { ok: false, error: interval.error };
	return { ok: true, integrand, variable, points: interval.points };
}

/** La réponse est définie (valeur réelle finie) en chaque point d'essai */
function isDefinedAt(answer: MathNode, variable: string, points: readonly number[]): boolean {
	const constants = Object.fromEntries(
		constantNames(answer, variable).map((name) => [name, CONSTANT_TRIAL_VALUE])
	);
	return points.every(
		(point) => numericValue(answer, { ...constants, [variable]: point }) !== null
	);
}

function judge(answer: string, read: Extract<ReadSpec, { ok: true }>): CalculusVerdict {
	const node = readExpression(answer);
	if (!node) return { status: 'incorrect' };
	if (read.points && !isDefinedAt(node, read.variable, read.points)) {
		return { status: 'incorrect' };
	}
	const answerDerivative = derivative(node, read.variable);
	if (answerDerivative && equivalent(answerDerivative, read.integrand)) {
		return { status: 'correct' };
	}
	const integrandDerivative = derivative(read.integrand, read.variable);
	if (integrandDerivative && equivalent(node, integrandDerivative)) {
		return { status: 'incorrect', feedback: PRIMITIVE_FEEDBACK.derivative };
	}
	return { status: 'incorrect' };
}

/**
 * Verdict d'une case « primitive ».
 *
 * @param answer - réponse de l'élève (LaTeX de MathLive)
 * @param spec - champs de la case : `integrand`, `variable`, `interval`
 */
export function judgePrimitiveAnswer(answer: string, spec: PrimitiveSpec): CalculusVerdict {
	if (!answer.trim()) return { status: 'empty' };
	const read = readSpec(spec);
	return read.ok ? judge(answer, read) : { status: 'incorrect' };
}

/**
 * Réponse attendue écrite par l'auteur : une primitive de f (lisible, définie
 * sur l'intervalle). Sert aux specs de test (une attendue fausse est une erreur
 * du MODÈLE, pas de l'élève).
 */
export function readExpectedPrimitive(expected: string, spec: PrimitiveSpec): ExpectedCheck {
	const read = readSpec(spec);
	if (!read.ok) return read;
	if (!readExpression(expected)) return { ok: false, error: 'réponse attendue illisible' };
	return judge(expected, read).status === 'correct'
		? { ok: true }
		: { ok: false, error: `ce n'est pas une primitive de ${spec.integrand}` };
}
