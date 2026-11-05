/**
 * Étiquette d'un évènement de l'arbre pondéré (` ```probtree `) écrite en LaTeX,
 * commune à l'écran (`ProbabilityTree.svelte`) et au PDF (`probability-tree-typst.ts`).
 *
 * - `$` autour retirés (`$A$` → `A`) ;
 * - déjà en LaTeX (contient `\`) : intacte ;
 * - une lettre, indicée ou non (`A`, `G_1`, `G_{12}`, `G_1'`) : variable mathématique ;
 * - un mot, indicé ou non (`Pile`, `Malade_1`) : le mot en texte droit, l'indice (et ce qui
 *   le suit) en maths.
 */

// ============================================================================
// FONCTIONS
// ============================================================================

/** L'étiquette `label` en LaTeX */
export function probTreeLabelLatex(label: string): string {
	const bare = label.trim().replace(/^\$|\$$/g, '');
	if (bare.includes('\\')) return bare;
	// Radical avant le premier `_`, puis l'indice et ce qui le suit (`_1'`), laissés en maths
	const cut = bare.indexOf('_');
	const [stem, rest] = cut > 0 ? [bare.slice(0, cut), bare.slice(cut)] : [bare, ''];
	if (stem.length === 1) return stem + rest;
	return `\\text{${stem}}${rest}`;
}
