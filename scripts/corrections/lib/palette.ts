/**
 * Convention de couleurs des corrections rédigées (mode A)
 * ========================================================
 *
 * Trois rôles, pas plus (cf. docs/ref/corrections-redaction.md) :
 * - `transformed`  (primary.0, orange) : ce que l'on transforme — le nombre qu'on
 *   décompose, les signes « − » que l'on regarde ;
 * - `intermediate` (primary.1, bleu)   : l'étape intermédiaire — la dizaine atteinte,
 *   le nombre de facteurs négatifs, « même signe / signes contraires » ;
 * - `conclusion`   (primary.2, vert)   : ce que la règle permet de conclure — le signe
 *   du résultat. La réponse finale `{{solution}}` reste en noir (usage des 176
 *   corrections existantes).
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export const COLOR_ROLES = {
	transformed: 'primary.0',
	intermediate: 'primary.1',
	conclusion: 'primary.2'
} as const;

export type ColorRole = keyof typeof COLOR_ROLES;

// ============================================================================
// FUNCTIONS
// ============================================================================

/** `\textcolor{{{color:primary.0}}}{…}` : la couleur est résolue à la génération */
export function colored(role: ColorRole, latex: string): string {
	return `\\textcolor{{{color:${COLOR_ROLES[role]}}}}{${latex}}`;
}

/** Math en ligne : `$…$` */
export function inline(latex: string): string {
	return `$${latex}$`;
}

/** Calcul aligné sur `&=`, une ligne par égalité (style maison) */
export function alignBlock(lines: string[]): string {
	return `$$\\begin{align} ${lines.join(' \\\\ ')} \\end{align}$$`;
}
