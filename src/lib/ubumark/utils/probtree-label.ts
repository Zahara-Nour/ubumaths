/**
 * Étiquette d'un évènement de l'arbre pondéré (` ```probtree `) écrite en LaTeX,
 * commune à l'écran (`ProbabilityTree.svelte`) et au PDF (`probability-tree-typst.ts`).
 *
 * - déjà en LaTeX (contient `\`) : intacte ;
 * - une lettre, indicée ou non (`A`, `G_1`, `G_{12}`) : variable mathématique ;
 * - un mot, indicé ou non (`Pile`, `Malade_1`) : le mot en texte droit, l'indice en maths.
 */

// ============================================================================
// CONSTANTES
// ============================================================================

/** Radical, puis indice éventuel (`_1`, `_{12}`) */
const SUBSCRIPTED = /^([^_]+)(_(?:\{[^{}]*\}|[^{}]))$/;

// ============================================================================
// FONCTIONS
// ============================================================================

/** L'étiquette `label` (sans `$` autour) en LaTeX */
export function probTreeLabelLatex(label: string): string {
	if (label.includes('\\')) return label;
	const match = SUBSCRIPTED.exec(label);
	const [stem, subscript] = match ? [match[1], match[2]] : [label, ''];
	if (stem.length === 1) return stem + subscript;
	return `\\text{${stem}}${subscript}`;
}
