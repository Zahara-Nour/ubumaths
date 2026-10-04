/**
 * Une action ne change pas de vue — lot 3b du passage de `/grapheur` par
 * l'atelier.
 *
 * Phase 0 `docs/wip/atelier-grapheur-phase0.md` §3 (A1 à A5) et §2 L1.
 * Décision G7 de David : toute action écrit une ligne dans Calcul, SANS changer
 * de vue — on va dans Calcul seulement si on le décide. Un repère sur l'onglet
 * dit qu'un résultat attend.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

// =============================================================================
// Décor
// =============================================================================

function cardFor(container: HTMLElement, name: string): HTMLElement {
	const card = [...container.querySelectorAll('.objet')].find(
		(el) => el.querySelector('.nom')?.textContent?.trim() === name
	);
	if (!card) throw new Error(`pas de carte ${name}`);
	return card as HTMLElement;
}

function tab(container: HTMLElement, label: string): HTMLButtonElement {
	const found = [...container.querySelectorAll('.onglet')].find((t) =>
		t.textContent?.trim().startsWith(label)
	);
	if (!found) throw new Error(`pas d'onglet ${label}`);
	return found as HTMLButtonElement;
}

function currentView(container: HTMLElement): string {
	return container.querySelector('.onglet[aria-current="page"]')?.textContent?.trim() ?? '';
}

/** `f` dans un atelier ouvert sur la vue Graphe, sa carte ouverte. */
async function onGraph(definition = 'x^2') {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name: 'f', definition }, 'text');
	const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
	tab(container, 'Graphe').click();
	await vi.waitFor(() => expect(currentView(container)).toBe('Graphe'));
	(cardFor(container, 'f').querySelector('.entete') as HTMLButtonElement).click();
	await vi.waitFor(() => expect(cardFor(container, 'f').querySelector('.action')).toBeTruthy());
	return { atelier, container };
}

async function clickAction(container: HTMLElement, name: string, label: string) {
	const button = await vi.waitFor(() => {
		const found = [...cardFor(container, name).querySelectorAll('.action')].find(
			(b) => b.textContent?.trim() === label
		) as HTMLButtonElement | undefined;
		expect(found).toBeTruthy();
		return found!;
	});
	button.click();
}

function hasMarker(container: HTMLElement): boolean {
	return tab(container, 'Calcul').querySelector('.nouveau') !== null;
}

// =============================================================================
// A1, A2, A3
// =============================================================================

describe('une action ne change pas de vue', () => {
	// A1 + D1
	it('« Dériver » depuis le Graphe : la carte f′ apparaît, on reste sur le Graphe', async () => {
		const { atelier, container } = await onGraph();

		await clickAction(container, 'f', 'Dériver');

		await vi.waitFor(() => expect(atelier.names).toContain("f'"));
		expect(currentView(container)).toBe('Graphe');
	});

	// A2
	it('« Variations » depuis le Graphe : on reste sur le Graphe', async () => {
		const { container } = await onGraph();

		await clickAction(container, 'f', 'Variations');

		await vi.waitFor(() => expect(hasMarker(container)).toBe(true));
		expect(currentView(container)).toBe('Graphe');
	});

	// A3
	it('l’onglet Calcul signale le nouveau résultat, et l’annonce', async () => {
		const { container } = await onGraph();
		expect(hasMarker(container)).toBe(false);

		await clickAction(container, 'f', 'Dériver');

		await vi.waitFor(() => expect(hasMarker(container)).toBe(true));
		// L'annonce est écrite au tour suivant (`announce` vide puis réécrit)
		await vi.waitFor(() =>
			expect(container.querySelector('[data-annonce]')?.textContent ?? '').toContain('Calcul')
		);
	});

	it('le repère s’efface quand on va dans Calcul', async () => {
		const { container } = await onGraph();
		await clickAction(container, 'f', 'Dériver');
		await vi.waitFor(() => expect(hasMarker(container)).toBe(true));

		tab(container, 'Calcul').click();

		await vi.waitFor(() => expect(hasMarker(container)).toBe(false));
		expect(container.querySelectorAll('.historique li').length).toBeGreaterThan(0);
	});

	// Ce qu'on tape dans Calcul, on le voit : pas de repère pour ça
	it('pas de repère pour ce qui a été calculé sous les yeux de l’élève', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		const input = container.querySelector(
			'input[aria-label="Calcul, définition ou commande"]'
		) as HTMLInputElement;
		await userEvent.click(input);
		await userEvent.keyboard('f(3){Enter}');
		await vi.waitFor(() => expect(container.querySelectorAll('.historique li').length).toBe(1));

		tab(container, 'Graphe').click();

		await vi.waitFor(() => expect(currentView(container)).toBe('Graphe'));
		expect(hasMarker(container)).toBe(false);
	});

	// A5 : « Tracer » montre ce qu'il trace
	it('« Tracer » depuis Calcul bascule toujours vers le Graphe', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		(cardFor(container, 'f').querySelector('.entete') as HTMLButtonElement).click();

		await clickAction(container, 'f', 'Tracer');

		await vi.waitFor(() => expect(currentView(container)).toBe('Graphe'));
		expect(hasMarker(container)).toBe(false);
	});
});

// =============================================================================
// L1 : la carte existante est sélectionnée
// =============================================================================

describe('dériver une seconde fois', () => {
	it('sélectionne la carte f′ qui existe déjà', async () => {
		const { atelier, container } = await onGraph();
		atelier.createDerivative('f');

		await clickAction(container, 'f', 'Dériver');

		await vi.waitFor(() =>
			expect(cardFor(container, 'f′').classList.contains('selected')).toBe(true)
		);
		expect(atelier.names.filter((n) => n === "f'")).toHaveLength(1);
	});
});

// =============================================================================
// A4 : l'image d'un nombre, dans la carte
// =============================================================================

describe('l’image d’un nombre', () => {
	function imageField(container: HTMLElement): HTMLInputElement {
		const input = cardFor(container, 'f').querySelector(
			'input[aria-label="Image par f : valeur de x"]'
		) as HTMLInputElement | null;
		if (!input) throw new Error('pas de champ image');
		return input;
	}

	it('se calcule dans la carte, et la ligne va aussi dans Calcul', async () => {
		const { container } = await onGraph('x^2');

		await userEvent.click(imageField(container));
		await userEvent.keyboard('3{Enter}');

		await vi.waitFor(() =>
			expect(cardFor(container, 'f').querySelector('.image-resultat')?.textContent).toContain('9')
		);
		expect(currentView(container)).toBe('Graphe');
		expect(hasMarker(container)).toBe(true);
	});

	it('ne touche pas à ce que l’élève tapait dans Calcul', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		const calc = container.querySelector(
			'input[aria-label="Calcul, définition ou commande"]'
		) as HTMLInputElement;
		await userEvent.click(calc);
		await userEvent.keyboard('2+');
		(cardFor(container, 'f').querySelector('.entete') as HTMLButtonElement).click();

		await vi.waitFor(() => expect(imageField(container)).toBeTruthy());
		await userEvent.click(imageField(container));
		await userEvent.keyboard('3{Enter}');

		await vi.waitFor(() =>
			expect(cardFor(container, 'f').querySelector('.image-resultat')?.textContent).toContain('9')
		);
		expect(calc.value).toBe('2+');
	});

	it('n’est plus un bouton qui envoie dans Calcul', async () => {
		const { container } = await onGraph();

		const labels = [...cardFor(container, 'f').querySelectorAll('.action')].map((b) =>
			b.textContent?.trim()
		);

		expect(labels).not.toContain('Image d’un nombre');
	});
});
