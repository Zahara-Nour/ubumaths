/**
 * Le grapheur doit pouvoir servir plusieurs ateliers à la fois.
 *
 * Tant que ses composants importaient un singleton, une seconde instance était
 * impossible : ils auraient lu l'état de la première. C'est ce qui bloquait
 * l'atelier (décision figée n° 1 : l'atelier possède l'état).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ProvideStore from './harness/ProvideStore.svelte';
import { GrapheurStore, grapheurStore } from '$lib/stores/grapheur.svelte';

beforeEach(() => {
	grapheurStore.fullReset();
});

describe('instance fournie par contexte', () => {
	it('agit sur l’instance fournie, pas sur le singleton', async () => {
		const own = new GrapheurStore();
		const { container } = render(ProvideStore, { store: own });

		const add = container.querySelector('button');
		expect(add).toBeTruthy();
		add?.click();
		await new Promise((r) => setTimeout(r, 0));

		expect(own.functions.length).toBe(1);
		expect(grapheurStore.functions.length).toBe(0);
	});

	// ⚠️ L'isolation en mémoire ne suffit pas : sans clé propre, une seconde
	// instance chargerait l'état rangé par `/grapheur` puis l'écraserait à sa
	// première modification. L'élève perdrait ses courbes sans un mot.
	//
	// Les marqueurs sont volontairement improbables : chercher « 42 » dans le
	// stockage passait en local sur un fichier isolé, et échouait en CI où
	// soixante-neuf fichiers de tests ont déjà écrit des identifiants et des
	// horodatages qui contiennent n'importe quel petit nombre.
	const MARKER_OWN = '{909091}';
	const MARKER_VOLATILE = '{909092}';

	it('range son état sous SA clé, sans contaminer celle du grapheur', async () => {
		const own = new GrapheurStore('atelier-test');
		own.addFunction(`x^${MARKER_OWN}`);
		await new Promise((r) => setTimeout(r, 700)); // debounce de sauvegarde

		expect(localStorage.getItem('atelier-test') ?? '').toContain('909091');
		expect(localStorage.getItem('chiphre-grapheur-state') ?? '').not.toContain('909091');

		localStorage.removeItem('atelier-test');
	});

	it('ne range rien du tout quand la clé est nulle', async () => {
		// Le `fullReset()` du beforeEach programme une sauvegarde différée du
		// singleton : sans cette attente, SA clé apparaît pendant le test et se
		// fait prendre pour une écriture de l'instance à clé nulle.
		await new Promise((r) => setTimeout(r, 700));
		const before = new Set(Object.keys(localStorage));

		const volatile = new GrapheurStore(null);
		volatile.addFunction(`x^${MARKER_VOLATILE}`);
		await new Promise((r) => setTimeout(r, 700));

		expect(volatile.functions.length).toBe(1);
		// Aucune clé neuve, et le marqueur nulle part.
		expect(Object.keys(localStorage).filter((k) => !before.has(k))).toEqual([]);
		const everything = Object.keys(localStorage)
			.map((k) => localStorage.getItem(k) ?? '')
			.join('');
		expect(everything).not.toContain('909092');
	});
});
