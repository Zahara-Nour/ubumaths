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

/** Reprises du focus après la fermeture au doigt : 10 × 50 ms couvrent l'animation */
const RETRIES = 10;
const RETRY_MS = 50;

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
			const target = outsideTarget;
			outsideTarget = null;
			if (!target) return;
			event.preventDefault();
			if (target === document.body) return;
			target.focus();
			// Au doigt, la fiche se ferme au `click`, son piège à focus encore en place jusqu'à
			// la fin de l'animation : il peut reprendre le focus, même après une reprise réussie
			// (écart E38, la case de réponse ne s'ouvrait qu'au second toucher). On surveille donc
			// pendant toute l'animation, et on revient au champ tant que le focus est sur la fiche
			// qui se ferme ou nulle part, sans le voler à ce que l'élève touche entre-temps
			let tries = 0;
			const retry = () => {
				if (!target.isConnected || tries++ >= RETRIES) return;
				const active = document.activeElement;
				if (active !== target) {
					// La fiche qui se ferme porte `data-state="closed"` le temps de son animation
					const stranded =
						active === null ||
						active === document.body ||
						active.closest('[data-slot="popover-content"][data-state="closed"]') !== null;
					if (!stranded) return;
					target.focus();
				}
				setTimeout(retry, RETRY_MS);
			};
			setTimeout(retry, RETRY_MS);
		}
	};
}
