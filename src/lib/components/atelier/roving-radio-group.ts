/**
 * Le motif ARIA « groupe de boutons radio » pour les réglages d'une courbe
 * (couleur, épaisseur, style du trait — revue de #1488) : UN SEUL arrêt de
 * tabulation par groupe, posé sur le choix coché (le premier sinon), et les
 * flèches pour passer au choix voisin, qui est coché en même temps (WAI-ARIA
 * APG, « Radio Group »). Début et Fin vont au premier et au dernier choix.
 *
 * Les choix sont des `button[role="radio"]` qui portent `aria-checked` : le
 * groupe relit le DOM à chaque changement (un choix coché déplace l'arrêt).
 *
 * @module components/atelier/roving-radio-group
 */

import type { Attachment } from 'svelte/attachments';

const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown']);
const PREVIOUS_KEYS = new Set(['ArrowLeft', 'ArrowUp']);

export const rovingRadioGroup: Attachment<HTMLElement> = (node) => {
	const radios = () => [...node.querySelectorAll<HTMLButtonElement>('button[role="radio"]')];

	function sync() {
		const list = radios();
		const checked = list.find((radio) => radio.getAttribute('aria-checked') === 'true');
		const stop = checked ?? list[0];
		for (const radio of list) radio.tabIndex = radio === stop ? 0 : -1;
	}

	function handleKeyDown(event: KeyboardEvent) {
		const list = radios();
		const at = list.indexOf(document.activeElement as HTMLButtonElement);
		if (at === -1 || list.length === 0) return;
		const last = list.length - 1;
		let next: number;
		if (NEXT_KEYS.has(event.key)) next = at === last ? 0 : at + 1;
		else if (PREVIOUS_KEYS.has(event.key)) next = at === 0 ? last : at - 1;
		else if (event.key === 'Home') next = 0;
		else if (event.key === 'End') next = last;
		else return;
		event.preventDefault();
		list[next].focus();
		// Dans un groupe radio, aller sur un choix, c'est le choisir
		list[next].click();
	}

	// `aria-checked` change quand un choix est fait : l'arrêt de tabulation suit
	const observer = new MutationObserver(sync);
	observer.observe(node, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['aria-checked']
	});
	node.addEventListener('keydown', handleKeyDown);
	sync();

	return () => {
		observer.disconnect();
		node.removeEventListener('keydown', handleKeyDown);
	};
};
