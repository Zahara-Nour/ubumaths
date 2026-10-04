/**
 * Atelier — la valeur d'une constante
 *
 * Module à part : l'atelier (curseurs) ET le moteur (premier terme d'une suite)
 * s'en servent, et le loger dans l'un ferait un import circulaire.
 *
 * @module atelier/constant
 */

import type { Provenance } from './parse';
import { astOf, readNumber, referencesOf } from './parse';
import { evaluate } from '$lib/mathAST/eval/evaluate';

/**
 * La valeur d'une CONSTANTE, ou `null` si la définition cite d'autres objets.
 *
 * ⚠️ Pas seulement un nombre écrit : MathLive écrit `2{,}5`, `\frac{1}{2}`,
 * `\pi`, et `readNumber` les prenait pour des formules — la carte disait
 * « calculée » et retirait le curseur (revue du lot 4, A1). Une définition
 * qui ne cite rien s'ÉVALUE ; seule une définition qui cite un objet est
 * calculée, et le curseur effacerait sa formule.
 */
export function constantOf(
	definition: string,
	provenance: Provenance | undefined,
	functionNames: readonly string[]
): number | null {
	const plain = readNumber(definition.replace(/\{,\}/g, ','));
	if (plain !== null) return plain;
	if (referencesOf(definition, provenance, functionNames).length > 0) return null;
	const ast = astOf(definition, provenance, functionNames);
	if (ast === null) return null;
	const result = evaluate(ast, { mode: 'decimal' });
	return result.status === 'value' &&
		typeof result.value === 'number' &&
		Number.isFinite(result.value)
		? result.value
		: null;
}
