/**
 * Où apparaît le bouton « Infos et confidentialité » (composant `InfoPanel`).
 *
 * Décision de David (2026-10-06) : l'ancien pied de page (copyright, liens
 * Confidentialité / CGU / Mentions légales en ligne) est **remplacé**, sur
 * ordinateur comme sur mobile, par ce bouton discret, qui ouvre un panneau :
 * « Chiphre, c'est quoi ? », données personnelles, CGU, éditeur, copyright et
 * version.
 *
 * Il reste **sur la page d'accueil seulement** (décision du 2026-10-04) : sur
 * les outils, l'ancien pied de page prenait la place de l'outil (sur le
 * grapheur, il masquait l'affichage des coordonnées ; sur l'atelier, il
 * s'ajoutait sous les vues).
 *
 * ⚠️ Les pages légales ne sont donc atteignables que depuis ce panneau (et la
 * page d'inscription, qui a ses propres liens, et par URL directe). Choix
 * explicite de David, préféré à des liens en bas de la barre latérale.
 *
 * @module utils/footer
 */

export function showsInfoButton(pathname: string): boolean {
	return pathname === '/';
}
