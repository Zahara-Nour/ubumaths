/**
 * Puissance d'exposant rationnel de dénominateur IMPAIR écrite en radical,
 * pour l'ANALYSE (décision du 2026-10-08) : x^{p/q} = ᵠ√(x^p), définie pour
 * x < 0 comme ∛x.
 *
 * Les analyses (signe, zéros de f′, variations) savent tout des racines
 * impaires depuis #925 : ∛x, 1/∛(x²), ∛(2x−1). Écrire la puissance en radical
 * leur donne ce savoir, au lieu d'un second chemin pour `x^{\frac{1}{3}}` :
 * la dérivée `\frac{1}{3}x^{\frac{1}{3}-1}` n'était ni simplifiée ni résolue
 * (« points critiques non déterminés »).
 *
 * Seuls les exposants ÉCRITS p/q (q impair, `oddDenominatorExponent`) sont
 * réécrits : dénominateur pair, décimal (`x^{0.2}`) et irrationnel gardent la
 * convention x^a = e^{a ln x}.
 *
 * @module mathAST/common/odd-root-power
 */

import type { MathNode } from '../types';
import { findFirst, mapNode } from '../transforms';
import { isDelimiter, isSuperscript } from '../guards';
import { divide, func, number, superscript } from '../factory';
import { oddDenominatorExponent } from '../eval/real-root';

/** L'expression contient-elle une puissance x^{p/q}, q impair ? */
export function hasOddRootPower(node: MathNode): boolean {
	return (
		findFirst(node, (n) => isSuperscript(n) && oddDenominatorExponent(n.superscript) !== null) !==
		undefined
	);
}

/** x^{p/q} → ᵠ√(x^p), ou ᵠ√(1/x^{|p|}) si p < 0 ; `null` hors du cas q impair. */
function rewriteAt(node: MathNode): MathNode | null {
	if (!isSuperscript(node)) return null;
	const exponent = oddDenominatorExponent(node.superscript);
	if (exponent === null) return null;
	const power = exponent.n < 0n ? -exponent.n : exponent.n;
	const base = isDelimiter(node.base) ? node.base.content : node.base;
	const raised = power === 1n ? base : superscript(node.base, number(power.toString()));
	// p < 0 : ᵠ√(1/x^{|p|}) plutôt que 1/ᵠ√(x^{|p|}) — `solve` ne conclut pas
	// 1/⁵√x = 0, alors que ⁵√(1/x) = 0 se ramène à 1/x = 0 (aucune solution)
	const radicand = exponent.n < 0n ? divide(number('1'), raised, 'fraction') : raised;
	return func('sqrt', [radicand], { base: number(exponent.d.toString()) });
}

/**
 * Réécrit chaque x^{p/q} (q impair) en ᵠ√(x^p), ou ᵠ√(1/x^{|p|}) si p < 0 —
 * la forme ᵠ√(x²) que zéros et signe savent traiter ((∛x)² ne l'était pas :
 * x^{2/3} − 4 rendait un signe inconnu). Sans plafond sur p ni q : tout
 * exposant que le domaine et l'évaluation acceptent est analysé de même.
 * Rend le nœud tel quel s'il n'y en a pas.
 */
export function expandOddRootPowers(node: MathNode): MathNode {
	if (!hasOddRootPower(node)) return node;
	return mapNode(node, (current) => rewriteAt(current) ?? current);
}
