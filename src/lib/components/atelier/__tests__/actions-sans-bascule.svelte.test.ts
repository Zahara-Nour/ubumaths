/**
 * Une action ne change pas de vue — lot 3b du passage de `/grapheur` par
 * l'atelier.
 *
 * Phase 0 `docs/archive/wip/atelier-grapheur-phase0.md` §3 (A1 à A5) et §2 L1.
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

// =============================================================================
// Revue d'accessibilité du lot 3b
// =============================================================================

describe('revue a11y du lot 3b', () => {
	function imageField(container: HTMLElement): HTMLInputElement {
		return cardFor(container, 'f').querySelector(
			'input[aria-label="Image par f : valeur de x"]'
		) as HTMLInputElement;
	}

	// Bloquant : sur tablette, le clavier décimal n'a pas de touche Entrée
	it('l’image se calcule avec un bouton, sans touche Entrée', async () => {
		const { container } = await onGraph('x^2');
		await userEvent.click(imageField(container));
		await userEvent.keyboard('-2');

		(
			cardFor(container, 'f').querySelector(
				'button[aria-label="Calculer l’image par f"]'
			) as HTMLButtonElement
		).click();

		await vi.waitFor(() =>
			expect(cardFor(container, 'f').querySelector('.image-resultat')?.textContent).toContain('4')
		);
		expect(imageField(container).getAttribute('inputmode')).toBeNull();
	});

	// Le résultat se lit AVEC son contexte : « f(3) = 9 », pas « 9 »
	it('le résultat annoncé dit de quoi il est le résultat', async () => {
		const { container } = await onGraph('x^2');
		await userEvent.click(imageField(container));
		await userEvent.keyboard('3{Enter}');

		await vi.waitFor(() => {
			const status = cardFor(container, 'f').querySelector('[role="status"]');
			expect(status?.textContent?.replace(/\s+/g, '')).toContain('f(3)=9');
		});
	});

	// Un résultat ne doit pas rester à côté d'une autre valeur de x
	it('le résultat s’efface quand on change x', async () => {
		const { container } = await onGraph('x^2');
		await userEvent.click(imageField(container));
		await userEvent.keyboard('3{Enter}');
		await vi.waitFor(() =>
			expect(cardFor(container, 'f').querySelector('.image-resultat')?.textContent).toContain('9')
		);

		await userEvent.keyboard('{Backspace}5');

		await vi.waitFor(() =>
			expect(
				cardFor(container, 'f').querySelector('.image-resultat')?.textContent ?? ''
			).not.toContain('9')
		);
	});

	it('une erreur se dit en toutes lettres, pas seulement en couleur', async () => {
		const { container } = await onGraph('x^2');
		await userEvent.click(imageField(container));
		await userEvent.keyboard('bonjour{Enter}');

		await vi.waitFor(() =>
			expect(cardFor(container, 'f').querySelector('.image-resultat')?.textContent).toContain(
				'Erreur'
			)
		);
	});

	// Contraste : le repère porte un NOMBRE lisible, pas seulement un point orange
	it('le repère de l’onglet Calcul montre le nombre de résultats', async () => {
		const { container } = await onGraph();

		await clickAction(container, 'f', 'Dériver');

		await vi.waitFor(() =>
			expect(tab(container, 'Calcul').querySelector('.nouveau')?.textContent?.trim()).toBe('1')
		);
	});
});

// =============================================================================
// Revue de code du lot 3b
// =============================================================================

describe('revue de code du lot 3b', () => {
	// C1 : le résultat de l'image ne survit pas à un changement de définition
	it('le résultat de l’image s’efface quand f change', async () => {
		const { atelier, container } = await onGraph('x^2');
		const field = cardFor(container, 'f').querySelector(
			'input[aria-label="Image par f : valeur de x"]'
		) as HTMLInputElement;
		await userEvent.click(field);
		await userEvent.keyboard('2{Enter}');
		await vi.waitFor(() =>
			expect(cardFor(container, 'f').querySelector('.image-resultat')?.textContent).toContain('4')
		);

		atelier.update('f', 'x^3', 'text');

		await vi.waitFor(() =>
			expect(
				cardFor(container, 'f').querySelector('.image-resultat')?.textContent ?? ''
			).not.toContain('4')
		);
	});

	// C3 / A5 : « Nuage » se VOIT dans le Graphe, il n'écrit pas dans Calcul
	it('« Nuage » n’écrit pas dans Calcul quand il n’a rien à dire', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1 ; 2 ; 3' });
		atelier.create({ kind: 'list', name: 'M', definition: '4 ; 5 ; 6' });
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		tab(container, 'Données').click();
		(cardFor(container, 'L').querySelector('.entete') as HTMLButtonElement).click();

		await clickAction(container, 'L', 'Nuage avec M');

		await vi.waitFor(() => expect(currentView(container)).toBe('Graphe'));
		expect(hasMarker(container)).toBe(false);
	});

	// M2 : f devenue |x| — « Dériver » reste actif, mais la dérivée échoue ;
	// on ne sélectionne pas une carte f′ en erreur
	it('ne sélectionne pas f′ quand la dérivation échoue', async () => {
		const { atelier, container } = await onGraph('x^2');
		atelier.createDerivative('f');
		atelier.update('f', 'abs(x)', 'text');

		await clickAction(container, 'f', 'Dériver');

		await vi.waitFor(() => expect(hasMarker(container)).toBe(true));
		expect(cardFor(container, 'f′').classList.contains('selected')).toBe(false);
	});
});
