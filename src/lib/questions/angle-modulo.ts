/**
 * Angle « à 2π près » (option de case `angleModulo: '2pi'`, décision de David du 2026-10-05)
 * =========================================================================================
 *
 * « Donne UN argument de z » : une réponse qui diffère de l'attendue d'un multiple
 * entier NON NUL de 2π (`-\frac{7\pi}{4}` pour `\frac{\pi}{4}`) est juste. Le multiple
 * est estimé numériquement, puis l'égalité `réponse = attendue + 2kπ` est PROUVÉE par
 * l'équivalence exacte : aucun faux positif par arrondi (`\frac{\pi}{4}+10^{-12}` reste
 * faux). k = 0 n'est pas son affaire : c'est la comparaison ordinaire.
 *
 * @module questions/angle-modulo
 */

import { evaluateExpression } from '$lib/math';

/** Au-delà, la réponse n'est pas « un argument » mais un nombre démesuré */
const MAX_TURNS = 1000;

/**
 * La réponse vaut-elle l'attendue plus 2kπ, k entier non nul ?
 *
 * @param equivalent - comparaison exacte de deux écritures (celle du validateur)
 */
export function matchesAngleModulo2Pi(
	answer: string,
	expected: string,
	equivalent: (answer: string, expected: string) => boolean
): boolean {
	const answerValue = evaluateExpression(answer);
	const expectedValue = evaluateExpression(expected);
	if (typeof answerValue !== 'number' || typeof expectedValue !== 'number') return false;
	if (!Number.isFinite(answerValue) || !Number.isFinite(expectedValue)) return false;
	const turns = (answerValue - expectedValue) / (2 * Math.PI);
	const k = Math.round(turns);
	if (k === 0 || Math.abs(k) > MAX_TURNS || Math.abs(turns - k) > 1e-6) return false;
	const shift = k > 0 ? `+${2 * k}\\pi` : `-${-2 * k}\\pi`;
	return equivalent(answer, `\\left(${expected}\\right)${shift}`);
}
