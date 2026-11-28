/**
 * Le titre d'un tableau de variations (ou de signes), pour sa légende lue par
 * les lecteurs d'écran : il nomme la FONCTION, pas la variable. E15
 * (2026-11-23) : « Tableau de variations de la fonction x » pour f.
 *
 * @module ubumark/utils/variation-table-title
 */

import type { VariationTableNode } from '#lib/ubumark/types/variation-table.ts';

/** `f(x)` → `f` quand l'argument est la variable du tableau ; sinon l'étiquette telle quelle. */
function functionName(label: string, variable: string): string {
	const suffix = `(${variable})`;
	const trimmed = label.trim();
	return trimmed.endsWith(suffix) && trimmed.length > suffix.length
		? trimmed.slice(0, -suffix.length)
		: trimmed;
}

export function variationTableTitle(node: VariationTableNode): string {
	const variation = node.rows.find((row) => row.type === 'variation');
	if (variation !== undefined) {
		return `Tableau de variations de ${functionName(variation.label, node.variable)}`;
	}
	const sign = node.rows.at(-1);
	return sign === undefined
		? 'Tableau de signes'
		: `Tableau de signes de ${functionName(sign.label, node.variable)}`;
}
