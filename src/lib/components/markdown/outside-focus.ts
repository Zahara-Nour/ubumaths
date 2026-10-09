/**
 * Popover fermé par un clic à côté : le focus reste là où l'élève a cliqué
 * =========================================================================
 *
 * Par défaut, bits-ui rend le focus au bouton du popover à la fermeture. Si
 * l'élève ferme une fiche en touchant le champ de réponse, le curseur quitte
 * le champ (revue d'accessibilité du 2026-10-09, WCAG 3.2.1 / 2.4.3). Avec
 * Échap, le focus revient bien au bouton : ce cas n'est pas touché.
 *
 * Un simple `preventDefault()` ne suffit pas : le piège à focus encore actif
 * le renverrait sur `body`. On retient la cible du clic et on la refocalise.
 *
 * @module components/markdown/outside-focus
 */

const FOCUSABLE =
	'input, textarea, select, math-field, button, a[href], [tabindex], [contenteditable]';

/**
 * Gestionnaires à passer à `Popover.Content` (`onInteractOutside`,
 * `onCloseAutoFocus`), et `reset` à appeler à chaque ouverture : un clic
 * retenu sans fermeture (bouton pressé puis glissé) ne doit pas compter pour
 * la fermeture suivante.
 */
export function keepOutsideFocus(): {
	onInteractOutside: (event: PointerEvent) => void;
	onCloseAutoFocus: (event: Event) => void;
	reset: () => void;
} {
	let outsideTarget: HTMLElement | null = null;
	return {
		reset() {
			outsideTarget = null;
		},
		onInteractOutside(event) {
			const target = event.target instanceof Element ? event.target : null;
			outsideTarget = target?.closest<HTMLElement>(FOCUSABLE) ?? document.body;
		},
		onCloseAutoFocus(event) {
			if (outsideTarget) {
				event.preventDefault();
				if (outsideTarget !== document.body) outsideTarget.focus();
			}
			outsideTarget = null;
		}
	};
}
