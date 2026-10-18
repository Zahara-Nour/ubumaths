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
import { chooseCardAction } from './harness/function-card';

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

function currentView(container: HTMLElement): string {
	return container.querySelector('.onglet[aria-current="page"]')?.textContent?.trim() ?? '';
}

/** `f` dans un atelier ouvert sur la vue Graphe, console FERMÉE. */
async function onGraph(definition = 'x^2') {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name: 'f', definition }, 'text');
	// Une vue demandée s'ouvre console fermée (lot 2 de la refonte de l'atelier)
	const { container } = await render(AtelierContainer, {
		atelier,
		ephemeral: true,
		view: 'graphe'
	});
	await vi.waitFor(() => expect(currentView(container)).toBe('Graphe'));
	return { atelier, container };
}

/**
 * Une action de carte : par le menu pour une fonction (lot 3 de la refonte),
 * par le bouton de la carte ouverte pour les autres objets.
 */
async function clickAction(container: HTMLElement, name: string, label: string) {
	const card = cardFor(container, name);
	if (card.querySelector(`button[aria-label="Options de ${name}"]`)) {
		await chooseCardAction(container, name, label);
		return;
	}
	const button = await vi.waitFor(() => {
		const found = [...cardFor(container, name).querySelectorAll('.action')].find(
			(b) => b.textContent?.trim() === label
		) as HTMLButtonElement | undefined;
		expect(found).toBeTruthy();
		return found!;
	});
	button.click();
}

/** Le bouton de la console, dans la barre d'icônes (l'onglet Calcul n'existe plus). */
function consoleButton(container: HTMLElement): HTMLButtonElement {
	return container.querySelector('button[aria-label="Console"]') as HTMLButtonElement;
}

/** Le compteur A3, posé sur le bouton de la console. */
function marker(container: HTMLElement): Element | null {
	return consoleButton(container).parentElement?.querySelector('.nouveau') ?? null;
}

function hasMarker(container: HTMLElement): boolean {
	return marker(container) !== null;
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
	it('le bouton de la console signale le nouveau résultat, et l’annonce', async () => {
		const { container } = await onGraph();
		expect(hasMarker(container)).toBe(false);

		await clickAction(container, 'f', 'Dériver');

		await vi.waitFor(() => expect(hasMarker(container)).toBe(true));
		// L'annonce est écrite au tour suivant (`announce` vide puis réécrit)
		await vi.waitFor(() =>
			expect(container.querySelector('[data-annonce]')?.textContent ?? '').toContain('console')
		);
	});

	it('le repère s’efface quand on ouvre la console', async () => {
		const { container } = await onGraph();
		await clickAction(container, 'f', 'Dériver');
		await vi.waitFor(() => expect(hasMarker(container)).toBe(true));

		consoleButton(container).click();

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

		// Refermer la console : ce qu'on y a calculé n'est pas « nouveau »
		consoleButton(container).click();

		await vi.waitFor(() =>
			expect(consoleButton(container).getAttribute('aria-expanded')).toBe('false')
		);
		expect(hasMarker(container)).toBe(false);
	});

	// A5 : « Tracer » montre ce qu'il trace
	it('« Tracer » depuis une autre vue bascule toujours vers le Graphe', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = await render(AtelierContainer, {
			atelier,
			ephemeral: true,
			view: 'donnees'
		});
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
// A4 revu (lot 3 de la refonte) : l'image d'un nombre se calcule dans la console
// =============================================================================

describe('l’image d’un nombre', () => {
	function consoleField(container: HTMLElement): HTMLInputElement {
		return container.querySelector(
			'input[aria-label="Calcul, définition ou commande"]'
		) as HTMLInputElement;
	}

	it('« Image d’un nombre » prépare f( dans la console, et f(3) donne 9', async () => {
		const { container } = await onGraph('x^2');

		await clickAction(container, 'f', 'Image d’un nombre');

		await vi.waitFor(() => expect(consoleField(container).value).toBe('f('));
		await vi.waitFor(() => expect(document.activeElement).toBe(consoleField(container)));
		await userEvent.keyboard('{End}3){Enter}');

		await vi.waitFor(() =>
			expect(container.querySelector('.historique')?.textContent).toContain('9')
		);
		expect(currentView(container)).toBe('Graphe');
	});

	it('la carte n’a plus de petit champ pour l’image', async () => {
		const { container } = await onGraph();

		expect(
			cardFor(container, 'f').querySelector('input[aria-label="Image par f : valeur de x"]')
		).toBeNull();
	});
});

// =============================================================================
// Revue d'accessibilité du lot 3b
// =============================================================================

describe('revue a11y du lot 3b', () => {
	// Contraste : le repère porte un NOMBRE lisible, pas seulement un point orange
	it('le repère du bouton de la console montre le nombre de résultats', async () => {
		const { container } = await onGraph();

		await clickAction(container, 'f', 'Dériver');

		await vi.waitFor(() => expect(marker(container)?.textContent?.trim()).toBe('1'));
		// Le nombre est dit aux lecteurs d'écran, relié au bouton
		const described = consoleButton(container).getAttribute('aria-describedby') ?? '';
		expect(document.getElementById(described)?.textContent).toContain('1 nouveau résultat');
	});
});

// =============================================================================
// Revue de code du lot 3b
// =============================================================================

describe('revue de code du lot 3b', () => {
	// C3 / A5 : « Nuage » se VOIT dans le Graphe, il n'écrit pas dans Calcul
	it('« Nuage » n’écrit pas dans Calcul quand il n’a rien à dire', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1 ; 2 ; 3' });
		atelier.create({ kind: 'list', name: 'M', definition: '4 ; 5 ; 6' });
		// Console fermée : sinon un repère ne pourrait de toute façon pas apparaître
		const { container } = await render(AtelierContainer, {
			atelier,
			ephemeral: true,
			view: 'donnees'
		});
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
