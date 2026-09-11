/**
 * Tests — popup de suggestions partagée (`[[`, `#hashtag`, `@mention`).
 *
 * Le sujet central est le CLIC. Le survol reconstruisait toute la liste
 * (`innerHTML = ''`), donc le bouton visé était détruit puis recréé sous le
 * curseur entre le `mousedown` et le `mouseup`. Un navigateur n'émet un `click`
 * que si les deux tombent sur le même nœud : cliquer un résultat ne faisait
 * rien, et la popup ne se fermait même pas.
 *
 * Ces tests reproduisent une séquence de souris réaliste — survol, appui,
 * relâchement — que des `element.click()` programmatiques ne pouvaient pas
 * attraper : ils court-circuitent précisément l'étape qui cassait.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSuggestionRenderer, type SuggestionItem } from '../suggestion-renderer';

function ouvre(items: SuggestionItem[], query = 'av') {
	const command = vi.fn();
	const renderer = createSuggestionRenderer({ type: 'resource', prefix: '' });
	renderer.onStart({
		items,
		query,
		command,
		clientRect: () => new DOMRect(0, 0, 0, 0)
	} as never);
	return { renderer, command };
}

function boutons(): HTMLButtonElement[] {
	return [...document.querySelectorAll<HTMLButtonElement>('.suggestion-item')];
}

/**
 * Survol puis clic, en respectant DEUX règles du navigateur que mes premières
 * versions de ce test ignoraient — et qui le faisaient passer alors que
 * l'application était cassée :
 *
 * 1. un nœud remplacé sous le curseur reçoit un nouveau `mouseenter` ;
 * 2. un `click` n'est émis que si `mousedown` et `mouseup` partagent la cible.
 */
function survoleCommeUnNavigateur(index: number): HTMLButtonElement {
	let noeud = boutons()[index];
	for (let attempt = 0; attempt < 10; attempt++) {
		noeud.dispatchEvent(new MouseEvent('mouseenter'));
		const apres = boutons()[index];
		if (apres === noeud) return noeud;
		// Le nœud a été remplacé SOUS LE CURSEUR : un navigateur ré-émet alors
		// `mouseenter` sur le nouveau. Si cela se répète, la liste est reconstruite
		// en boucle et aucun clic ne peut aboutir.
		noeud = apres;
	}
	throw new Error('le survol ne se stabilise pas : la liste est reconstruite en boucle');
}

function cliqueVraiment(index: number): void {
	const noeud = survoleCommeUnNavigateur(index);
	noeud.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

	// Un `click` n'est émis que si `mousedown` et `mouseup` tombent sur le MÊME
	// nœud. Fabriquer le `click` à la main masquerait justement le défaut.
	if (boutons()[index] !== noeud) return;
	noeud.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
	noeud.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

const DEUX: SuggestionItem[] = [
	{ id: 'A', label: 'Un exercice' },
	{ id: 'B', label: 'Une fiche' }
];

describe('popup de suggestions', () => {
	afterEach(() => {
		document.querySelectorAll('.suggestion-popup').forEach((n) => n.remove());
	});

	it('le survol ne détruit PAS le bouton visé', () => {
		const { renderer } = ouvre(DEUX);

		const avant = boutons()[1];
		avant.dispatchEvent(new MouseEvent('mouseenter'));

		// Si ce nœud était remplacé, aucun clic réel ne pourrait jamais aboutir.
		expect(boutons()[1]).toBe(avant);
		expect(document.body.contains(avant)).toBe(true);
		renderer.onExit();
	});

	it('un clic après survol déclenche la commande', () => {
		const { renderer, command } = ouvre(DEUX);

		cliqueVraiment(1);

		expect(command).toHaveBeenCalledTimes(1);
		expect(command).toHaveBeenCalledWith(expect.objectContaining({ id: 'B' }));
		renderer.onExit();
	});

	it('le survol met bien la surbrillance à jour', () => {
		const { renderer } = ouvre(DEUX);

		boutons()[1].dispatchEvent(new MouseEvent('mouseenter'));

		expect(boutons()[0].classList.contains('selected')).toBe(false);
		expect(boutons()[1].classList.contains('selected')).toBe(true);
		expect(boutons()[1].getAttribute('aria-selected')).toBe('true');
		renderer.onExit();
	});

	it('empêche le vol de focus au `mousedown`', () => {
		// Sans ça, l'éditeur perd le curseur avant l'insertion.
		const { renderer } = ouvre(DEUX);

		const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
		boutons()[0].dispatchEvent(event);

		expect(event.defaultPrevented).toBe(true);
		renderer.onExit();
	});

	it('les flèches déplacent la sélection sans reconstruire la liste', () => {
		const { renderer } = ouvre(DEUX);
		const avant = boutons();

		renderer.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'ArrowDown' }) } as never);

		expect(boutons()[0]).toBe(avant[0]);
		expect(boutons()[1].classList.contains('selected')).toBe(true);
		renderer.onExit();
	});

	it('Entrée valide l’élément sélectionné', () => {
		const { renderer, command } = ouvre(DEUX);

		renderer.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'ArrowDown' }) } as never);
		renderer.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'Enter' }) } as never);

		expect(command).toHaveBeenCalledWith(expect.objectContaining({ id: 'B' }));
		renderer.onExit();
	});

	it('affiche un en-tête par groupe, sans fausser les indices', () => {
		const { renderer, command } = ouvre([
			{ id: 'A', label: 'Un exercice', group: 'Exercice' },
			{ id: 'B', label: 'Une fiche', group: 'Fiche d’exercices' }
		]);

		expect(document.querySelectorAll('.suggestion-group')).toHaveLength(2);
		cliqueVraiment(1);

		expect(command).toHaveBeenCalledWith(expect.objectContaining({ id: 'B' }));
		renderer.onExit();
	});
});
