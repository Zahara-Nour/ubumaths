/**
 * Texte coloré dans la prose (ADR 0042)
 * =====================================
 *
 * `[le cône]{.orange}` : la teinte de l'objet orange d'une figure, à l'écran
 * `var(--color-fig-orange)` (thèmes clair et sombre). Le chat des élèves (rendu
 * restreint) n'affiche aucune couleur. Une classe inconnue donne un message au
 * prof, jamais à l'élève.
 *
 * @module components/markdown/inline-color
 */

import { NAMED_COLORS, namedColorScreen, type NamedColor } from '#lib/theme/named-colors.ts';

/**
 * Valeur CSS de la couleur d'un texte, ou `undefined` (pas de couleur, ou rendu
 * restreint). Seul un nom de la palette passe : jamais une chaîne d'auteur.
 */
export function inlineColorValue(
	color: NamedColor | undefined,
	restricted: boolean
): string | undefined {
	if (!color || restricted) return undefined;
	return namedColorScreen(color);
}

/** Message au prof pour les classes inconnues d'un marquage `[texte]{.…}`. */
export function unknownClassesMessage(classes: readonly string[]): string {
	const written = classes.map((name) => `{.${name}}`).join(', ');
	return (
		`« ${written} » : ni une couleur, ni un type de détail, ni une marque du dictionnaire. ` +
		`Couleurs possibles : ${NAMED_COLORS.join(', ')}. ` +
		'Détails : calcul, rappel, méthode, attention.'
	);
}
