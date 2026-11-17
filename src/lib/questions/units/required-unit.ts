/**
 * L'attendu d'une case à unité imposée, exprimé dans cette unité
 * ===============================================================
 *
 * `{{eval}}` écrit une grandeur dans une unité TAPÉE, celle où la valeur a le
 * moins de chiffres (règle commune de l'unité du résultat, 2026-11-02) :
 * `{{eval:500[m]+1[km]}}` → `1.5[km]`. Une case qui impose le mètre
 * (`unit.required: 'm'`) attend alors `1500[m]` : l'attendu est réécrit dans
 * l'unité imposée au tirage, pour l'affichage comme pour la correction (David,
 * 2026-11-03).
 *
 * @module questions/units/required-unit
 */

import { parseCustom } from '$lib/mathAST/parser/custom';
import { valueIn } from '$lib/mathAST/eval/evaluate-with-modifiers';
import { decimalString } from '$lib/mathAST/tidy/decimal';
import { singleExpectedDuration } from './composite-duration';

/**
 * `1.5[km]` avec `m` imposé → `1500[m]` ; `{1[h]}{30[min]}` avec `h` → `1.5[h]`.
 * Rendu tel quel : déjà dans l'unité imposée, pas une grandeur, autre grandeur que l'unité imposée, unité
 * illisible, ou valeur sans écriture décimale finie dans cette unité.
 */
export function expectedInRequiredUnit(expected: string, required: string): string {
	// Déjà dans l'unité imposée : l'écriture du modèle est gardée (`;()`, `;+`)
	if (expected.trim().endsWith(`[${required}]`) || expected.trim().endsWith(`[${required}])`)) {
		return expected;
	}
	let value;
	try {
		value = valueIn(parseCustom(singleExpectedDuration(expected)), required);
	} catch {
		return expected;
	}
	if (value === null) return expected;
	const negative = value.n < 0n;
	const text = decimalString(negative ? { n: -value.n, d: value.d } : value);
	if (text === null) return expected;
	// L'écriture de `;()` et de `;+` est gardée : `(-3[km])` → `(-3000[m])`, `+3[km]` → `+3000[m]`
	const trimmed = expected.trim();
	const sign = negative ? '-' : trimmed.startsWith('+') ? '+' : '';
	const quantity = `${sign}${text}[${required}]`;
	return /^\(.*\)$/.test(trimmed) ? `(${quantity})` : quantity;
}
