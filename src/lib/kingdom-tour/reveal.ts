/**
 * Apparition au défilement, pour les sections du Tour du Royaume.
 *
 * Un élément encore sous l'écran quand la page s'ouvre se cache (`data-reveal="pending"`),
 * puis se montre en entrant dans la vue (`data-reveal="shown"`). La page fournit le CSS
 * des deux états. Trois garanties :
 * - sans JavaScript (rendu serveur, robots), rien n'est jamais caché : seul ce code cache ;
 * - « moins d'animations » demandé par le système : rien ne se cache ;
 * - un élément déjà visible à l'ouverture ne disparaît pas pour réapparaître.
 *
 * @module kingdom-tour/reveal
 */

import type { Action } from 'svelte/action';

// Constantes

/** Il faut entrer un peu dans la vue : l'apparition se voit au lieu de se faire sous le bord */
const ROOT_MARGIN = '0px 0px -8% 0px';

// Functions

/** L'élément touche-t-il déjà la fenêtre ? */
function isOnScreen(element: HTMLElement): boolean {
	const rect = element.getBoundingClientRect();
	return rect.top < window.innerHeight && rect.bottom > 0;
}

/**
 * Action Svelte (`use:reveal`, ou `use:reveal={120}` pour 120 ms de retard : décale les
 * cartes d'une même grille). Une action plutôt qu'un attachment : le Prettier du dépôt ne
 * sait pas encore écrire `{@attach}`.
 */
export const reveal: Action<HTMLElement, number | undefined> = (element, delayMs = 0) => {
	if (typeof IntersectionObserver === 'undefined') return;
	if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
	if (isOnScreen(element)) return;

	element.dataset.reveal = 'pending';
	if (delayMs > 0) element.style.setProperty('--reveal-delay', `${delayMs}ms`);

	const observer = new IntersectionObserver(
		(entries) => {
			if (!entries.some((entry) => entry.isIntersecting)) return;
			element.dataset.reveal = 'shown';
			observer.disconnect();
		},
		{ rootMargin: ROOT_MARGIN }
	);
	observer.observe(element);
	return { destroy: () => observer.disconnect() };
};
