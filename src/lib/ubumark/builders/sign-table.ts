/**
 * Du tableau de signes de mathAST au nœud que l'application sait dessiner.
 *
 * ⚠️ **Ce module ne calcule AUCUN signe.** Il traduit la grille que
 * `pedagogical-solve` construit — celle-là même qui sert à écrire le
 * `\begin{array}` — vers le `VariationTableNode` de `VariationTable.svelte`.
 * Recalculer ici les ferait diverger un jour, et le tableau affiché
 * contredirait la conclusion affichée juste en dessous.
 *
 * @module ubumark/builders/sign-table
 */

import type { SignTableGrid } from '$lib/mathAST/pedagogical-solve/sign-table-grid';
import type {
	DomainPoint,
	SignRow,
	SignValue,
	VariationTableNode
} from '$lib/ubumark/types/variation-table';

/**
 * Le nœud de tableau de signes correspondant à une grille.
 *
 * Les clés de `values` suivent la convention de `VariationTable.svelte` :
 * `"borne1,borne2"` pour un intervalle, `"borne"` pour un point.
 */
export function signTableNode(grid: SignTableGrid): VariationTableNode {
	const domain: DomainPoint[] = grid.points.map((expression) => ({ expression }));

	const rows: SignRow[] = grid.rows.map((row) => {
		const values = new Map<string, SignValue>();

		row.intervals.forEach((sign, index) => {
			values.set(`${grid.points[index]},${grid.points[index + 1]}`, { type: 'sign', value: sign });
		});

		row.marks.forEach((mark, index) => {
			if (mark === null) return;
			// Un zéro du dénominateur n'est pas un zéro du quotient : c'est une
			// valeur interdite, que le composant dessine en double barre.
			values.set(grid.points[index], {
				type: 'marker',
				marker: mark === 'bar' ? 'asymptote' : 'zero'
			});
		});

		return { type: 'sign', label: row.label, values };
	});

	return { type: 'variation-table', variable: grid.variable, domain, rows };
}
