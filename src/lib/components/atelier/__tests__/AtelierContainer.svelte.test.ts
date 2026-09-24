/**
 * Le conteneur — l'atelier vu comme un tout.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

describe('conteneur', () => {
	it('monte le panneau et les trois vues du v1', async () => {
		const { container } = await render(AtelierContainer, { ephemeral: true });

		expect(container.textContent).toContain('Mes objets');
		for (const label of ['Calcul', 'Graphe', 'Données']) {
			expect(container.textContent).toContain(label);
		}
	});

	it('ouvre sur la vue demandée', async () => {
		const { container } = await render(AtelierContainer, { ephemeral: true, view: 'graphe' });

		const courant = container.querySelector('[aria-current="page"]');
		expect(courant?.textContent?.trim()).toBe('Graphe');
	});

	it('change de vue au clic', async () => {
		const { container } = await render(AtelierContainer, { ephemeral: true });

		const onglets = [...container.querySelectorAll('.onglet')] as HTMLButtonElement[];
		onglets.find((b) => b.textContent?.trim() === 'Données')?.click();
		await new Promise((r) => setTimeout(r, 0));

		expect(container.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Données');
	});

	// ⚠️ §7 N2 — un atelier éphémère ne touche à RIEN de ce qui est rangé
	it('n’écrit rien en mode éphémère', async () => {
		const sentinel = 'sentinelle-atelier';
		localStorage.setItem('chiphre-atelier', sentinel);

		const atelier = new Atelier();
		await render(AtelierContainer, { atelier, ephemeral: true });
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		await new Promise((r) => setTimeout(r, 700));

		expect(localStorage.getItem('chiphre-atelier')).toBe(sentinel);
		localStorage.removeItem('chiphre-atelier');
	});

	it('pilote l’instance qu’on lui donne', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });

		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		expect(container.textContent).toContain('x^2');
	});
});

// =============================================================================
// Ce que la revue de la PR #336 a trouvé : la création n'était pas enregistrée
// =============================================================================

describe('tout changement est enregistré', () => {
	const KEY = 'chiphre-atelier';

	afterEach(() => localStorage.removeItem(KEY));

	// ⚠️ Le trou : `sessionTouch` n'était appelé que pour « Supprimer ». Créer un
	// objet depuis le panneau ne rangeait rien — l'élève rechargeait et avait
	// tout perdu. Un seul endroit oublié suffisait.
	it('enregistre une création faite depuis le panneau', async () => {
		localStorage.removeItem(KEY);
		const { container } = await render(AtelierContainer, {});

		const bouton = [...container.querySelectorAll('.creer button')].find(
			(b) => b.textContent?.trim() === '+ Fonction'
		) as HTMLButtonElement;
		bouton.click();

		await new Promise((r) => setTimeout(r, 700));
		expect(localStorage.getItem(KEY)).toContain('"f"');
	});

	it('enregistre une modification du modèle, d’où qu’elle vienne', async () => {
		localStorage.removeItem(KEY);
		const atelier = new Atelier();
		await render(AtelierContainer, { atelier });

		// Personne n'a prévenu la session : c'est le compteur de révision qui
		// couvre ce cas, et il couvrira aussi les actions qui n'existent pas encore.
		atelier.create({ kind: 'function', name: 'h', definition: 'x^3' });

		await new Promise((r) => setTimeout(r, 700));
		expect(localStorage.getItem(KEY)).toContain('x^3');
	});

	it('relit ce qui a été rangé au montage suivant', async () => {
		localStorage.removeItem(KEY);
		const first = new Atelier();
		const { unmount } = await render(AtelierContainer, { atelier: first });
		first.create({ kind: 'function', name: 'f', definition: 'x^2' });
		await new Promise((r) => setTimeout(r, 700));
		unmount();

		const second = new Atelier();
		await render(AtelierContainer, { atelier: second });
		await new Promise((r) => setTimeout(r, 50));

		expect(second.names).toEqual(['f']);
	});
});

// =============================================================================
// La vue Graphe — option B : la courbe suit l'objet
// =============================================================================

describe('vue Graphe', () => {
	/** Clique l'action nommée sur l'objet sélectionné. */
	function clickAction(container: HTMLElement, label: string) {
		const bouton = [...container.querySelectorAll('.action')].find(
			(b) => b.textContent?.trim() === label
		) as HTMLButtonElement | undefined;
		bouton?.click();
	}

	function selectCard(container: HTMLElement, name: string) {
		const carte = [...container.querySelectorAll('.objet')].find(
			(el) => el.querySelector('.nom')?.textContent?.trim() === name
		);
		(carte?.querySelector('button') as HTMLButtonElement | undefined)?.click();
	}

	it('bascule sur le graphe quand on trace', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });

		selectCard(container, 'f');
		await new Promise((r) => setTimeout(r, 0));
		clickAction(container, 'Tracer');
		await new Promise((r) => setTimeout(r, 0));

		expect(atelier.get('f')?.plotted).toBe(true);
		expect(container.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Graphe');
	});

	it('propose ensuite de retirer du graphe', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		atelier.setPlotted('f', true);
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });

		selectCard(container, 'f');
		await new Promise((r) => setTimeout(r, 0));

		const labels = [...container.querySelectorAll('.action')].map((b) => b.textContent?.trim());
		expect(labels).toContain('Retirer du graphe');
	});

	// ⚠️ Le grapheur de l'atelier ne range RIEN : sans clé propre, il chargerait
	// les courbes de /grapheur puis les écraserait (revue #334).
	it('ne touche pas au rangement de /grapheur', async () => {
		localStorage.setItem('chiphre-grapheur-state', 'sentinelle-grapheur');

		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^{777}' });
		atelier.setPlotted('f', true);
		await render(AtelierContainer, { atelier, ephemeral: true });
		await new Promise((r) => setTimeout(r, 700));

		expect(localStorage.getItem('chiphre-grapheur-state')).toBe('sentinelle-grapheur');
		localStorage.removeItem('chiphre-grapheur-state');
	});
});
