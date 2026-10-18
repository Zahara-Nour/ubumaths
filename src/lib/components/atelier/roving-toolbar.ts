/**
 * Le motif ARIA « barre d'outils » pour la barre d'icônes de l'atelier
 * (revue de #1479) : UN SEUL arrêt de tabulation pour toute la barre, et les
 * flèches gauche / droite, Début et Fin pour aller d'un bouton à l'autre.
 *
 * Tabindex itinérant : le bouton qui a eu le focus en dernier garde `0`, les
 * autres `-1`. Les boutons viennent de composants enfants (`ToolButton`, le
 * déclencheur des réglages) et apparaissent ou disparaissent (atelier reçu par
 * lien) : la barre les relit dans le DOM à chaque changement.
 *
 * @module components/atelier/roving-toolbar
 */

import type { Attachment } from 'svelte/attachments';

export const rovingToolbar: Attachment<HTMLElement> = (node) => {
	const buttons = () => [...node.querySelectorAll<HTMLButtonElement>('button')];
	/** Le bouton qui porte l'arrêt de tabulation, ou le premier par défaut. */
	let current: HTMLButtonElement | null = null;

	function sync() {
		const list = buttons();
		if (current === null || !list.includes(current)) current = list[0] ?? null;
		for (const button of list) button.tabIndex = button === current ? 0 : -1;
	}

	function handleFocusIn(event: FocusEvent) {
		if (!(event.target instanceof HTMLButtonElement)) return;
		if (!buttons().includes(event.target)) return;
		current = event.target;
		sync();
	}

	function handleKeyDown(event: KeyboardEvent) {
		const list = buttons();
		const at = list.indexOf(document.activeElement as HTMLButtonElement);
		if (at === -1 || list.length === 0) return;
		const last = list.length - 1;
		let next: number;
		if (event.key === 'ArrowRight') next = at === last ? 0 : at + 1;
		else if (event.key === 'ArrowLeft') next = at === 0 ? last : at - 1;
		else if (event.key === 'Home') next = 0;
		else if (event.key === 'End') next = last;
		else return;
		event.preventDefault();
		list[next].focus();
	}

	// Seuls les ajouts et retraits d'éléments comptent : poser `tabIndex` ne relance rien
	const observer = new MutationObserver(sync);
	observer.observe(node, { childList: true, subtree: true });
	node.addEventListener('focusin', handleFocusIn);
	node.addEventListener('keydown', handleKeyDown);
	sync();

	return () => {
		observer.disconnect();
		node.removeEventListener('focusin', handleFocusIn);
		node.removeEventListener('keydown', handleKeyDown);
	};
};
