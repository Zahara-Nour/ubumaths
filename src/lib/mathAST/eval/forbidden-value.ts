/**
 * Ce qui empêche un calcul SANS LETTRE d'avoir une valeur réelle : un
 * dénominateur nul, une racine carrée d'un négatif, un logarithme d'un nombre
 * négatif ou nul, une puissance négative de 0.
 *
 * Sert `.eval EXPR en x=…` : l'expression, une fois la valeur remplacée, est
 * lue ici AVANT d'être calculée. Mesuré avant (2026-10-14) : `\sqrt{-1}` et
 * `\ln 0` rendaient `sqrt(-1)` et `ln(0)` comme des résultats, et un
 * dénominateur nul finissait en « Je n'ai pas su lire ».
 *
 * ⚠️ **Exact, jamais à une tolérance près** : un nombre est nul quand son
 * rationnel l'est. `getDomainViolations` (domain/validate.ts) compare des
 * flottants à 10⁻¹⁰ près et refuserait `1/x` en `x = 10⁻¹¹`. Le signe d'une
 * valeur irrationnelle se lit sur son flottant (non nul, donc fiable hors
 * compensation exacte, que le calcul exact attrape d'abord).
 *
 * @module mathAST/eval/forbidden-value
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import { isDivision, isFunction, isSuperscript } from '../guards';
import { findNodes } from '../transforms';
import { evaluate, evaluateNodeToRational } from './evaluate';
import { getVariables } from './substitute';

// =============================================================================
// Types
// =============================================================================

/** Pourquoi le calcul n'a pas de valeur. */
export type ForbiddenReason = 'denominator' | 'square-root' | 'logarithm' | 'zero-power';

// =============================================================================
// Constantes
// =============================================================================

/** Les logarithmes : leur argument doit être strictement positif. */
const LOGARITHMS: ReadonlySet<string> = new Set(['ln', 'log', 'log2', 'log10', 'lg']);

/** La raison, en français, telle qu'elle suit « … est une valeur interdite : ». */
export const FORBIDDEN_REASON_TEXT: Readonly<Record<ForbiddenReason, string>> = {
	denominator: "le dénominateur s'annule",
	'square-root': 'le nombre sous la racine carrée est négatif',
	logarithm: 'le logarithme ne s’applique qu’à un nombre strictement positif',
	'zero-power': "0 n'a pas de puissance négative"
};

// =============================================================================
// Fonctions
// =============================================================================

/**
 * La raison pour laquelle `node` (sans lettre) n'a pas de valeur réelle, ou
 * `null`. La cause la plus INTÉRIEURE l'emporte : `1/\sqrt{-1}` parle de la
 * racine, pas du dénominateur.
 *
 * Une expression qui contient encore une lettre, ou une valeur qu'on ne sait
 * pas lire, rend `null` : on ne refuse que ce qu'on a établi.
 */
export function forbiddenValue(node: MathNode): ForbiddenReason | null {
	if (getVariables(node).size > 0) return null;
	const candidates = findNodes(
		node,
		(n) =>
			isDivision(n) ||
			isSuperscript(n) ||
			(isFunction(n) && (n.name === 'sqrt' || LOGARITHMS.has(n.name)))
	);
	// Ordre préfixe : un descendant vient après son ancêtre. À rebours, chaque
	// descendant est examiné avant son ancêtre — le premier refus est intérieur.
	for (const candidate of [...candidates].reverse()) {
		const reason = reasonAt(candidate);
		if (reason !== null) return reason;
	}
	return null;
}

/** Le refus porté par ce nœud même, ses descendants étant supposés valides. */
function reasonAt(node: MathNode): ForbiddenReason | null {
	if (isDivision(node)) return signOf(node.denominator) === 0 ? 'denominator' : null;
	if (isSuperscript(node)) {
		const exponent = signOf(node.superscript);
		return exponent !== null && exponent < 0 && signOf(node.base) === 0 ? 'zero-power' : null;
	}
	if (!isFunction(node) || node.args.length === 0) return null;
	const argument = signOf(node.args[0]);
	if (argument === null) return null;
	if (node.name === 'sqrt') {
		// Indice impair (`\sqrt[3]{-8}`) : défini sur ℝ ; indice illisible : pas de refus
		if (node.base !== undefined && !isEvenIndex(node.base)) return null;
		return argument < 0 ? 'square-root' : null;
	}
	return argument <= 0 ? 'logarithm' : null;
}

/** Un indice de racine pair (2, 4…) ; `false` s'il est impair ou illisible. */
function isEvenIndex(index: MathNode): boolean {
	const rational = exactRational(index);
	return rational !== null && rational.d === 1n && rational.n % 2n === 0n;
}

/** -1, 0 ou 1 ; `null` si la valeur ne se lit pas (non réelle, illisible). */
function signOf(node: MathNode): -1 | 0 | 1 | null {
	const rational = exactRational(node);
	if (rational !== null) return rational.n === 0n ? 0 : rational.n < 0n ? -1 : 1;
	const value = decimalValue(node);
	if (value === null) return null;
	if (!Number.isFinite(value)) return null;
	return value === 0 ? 0 : value < 0 ? -1 : 1;
}

/** La valeur exacte, quand elle est rationnelle ; `null` sinon. */
function exactRational(node: MathNode): Rational | null {
	try {
		const exact = evaluate(node, { mode: 'exact' });
		return exact.status === 'value' ? evaluateNodeToRational(exact.node) : null;
	} catch {
		return null;
	}
}

/** La valeur approchée, quand c'est un réel ; `null` sinon. */
function decimalValue(node: MathNode): number | null {
	try {
		const approximate = evaluate(node, { mode: 'decimal' });
		return approximate.status === 'value' && typeof approximate.value === 'number'
			? approximate.value
			: null;
	} catch {
		return null;
	}
}
