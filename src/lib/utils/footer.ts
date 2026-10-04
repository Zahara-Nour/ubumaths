/**
 * Où apparaît le pied de page du site.
 *
 * Décision de David (2026-10-04) : **sur la page d'accueil seulement**. Sur les
 * outils, il prenait la place de l'outil (sur le grapheur, il masquait déjà
 * l'affichage des coordonnées ; sur l'atelier, il s'ajoutait sous les vues).
 *
 * ⚠️ Les liens Confidentialité / CGU / Mentions légales ne sont donc
 * atteignables que depuis l'accueil (et la page d'inscription, et par URL
 * directe). Choix explicite de David, préféré à des liens en bas de la barre
 * latérale.
 *
 * @module utils/footer
 */

export function showsFooter(pathname: string): boolean {
	return pathname === '/';
}
