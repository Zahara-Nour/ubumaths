/**
 * « Sur le graphique » — lot 2b du passage de `/grapheur` par l'atelier.
 *
 * Phase 0 `docs/wip/atelier-grapheur-phase0.md` §1 S1 à S5. Les réglages
 * s'écrivent dans l'ATELIER (`setDisplay`) ; les nombres affichés (pente,
 * aire, courbure, longueur) sont calculés sur la courbe dessinée.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { isFunction } from '$lib/atelier/types';

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

/** Un atelier avec `f` tracée, sa carte ouverte. */
async function openPlotted(definition = 'x^2') {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name: 'f', definition }, 'text');
	atelier.setPlotted('f', true);
	const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
	(cardFor(container, 'f').querySelector('.entete') as HTMLButtonElement).click();
	await vi.waitFor(() => expect(cardFor(container, 'f').querySelector('.reglages')).toBeTruthy());
	return { atelier, container, card: () => cardFor(container, 'f') };
}

function displayOf(atelier: Atelier) {
	const f = atelier.get('f');
	if (!f || !isFunction(f)) throw new Error('f');
	return f.display!;
}

function check(card: HTMLElement, label: string) {
	const box = card.querySelector(`[aria-label="${label}"]`) as HTMLElement | null;
	if (!box) throw new Error(`pas de case « ${label} »`);
	box.click();
}

function text(card: HTMLElement, selector: string): string {
	return card.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function setInput(card: HTMLElement, label: string, value: string) {
	const input = card.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement;
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
}

// =============================================================================
// Tests
// =============================================================================

describe('« Sur le graphique »', () => {
	it('n’apparaît que pour une fonction tracée', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x' });
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		(cardFor(container, 'f').querySelector('.entete') as HTMLButtonElement).click();
		await vi.waitFor(() =>
			expect(cardFor(container, 'f').querySelector('math-field')).toBeTruthy()
		);

		expect(cardFor(container, 'f').querySelector('.reglages')).toBeNull();
	});

	// S1
	it('change la couleur de la courbe', async () => {
		const { atelier, card } = await openPlotted();
		const before = displayOf(atelier).color;

		(card().querySelector('.color-trigger') as HTMLButtonElement).click();
		const other = await vi.waitFor(() => {
			const swatch = [...document.querySelectorAll('.color-swatch')].find(
				(s) => s.getAttribute('aria-checked') === 'false'
			) as HTMLButtonElement | undefined;
			expect(swatch).toBeTruthy();
			return swatch!;
		});
		other.click();

		await vi.waitFor(() => expect(displayOf(atelier).color).not.toBe(before));
	});

	// S2
	it('la tangente affiche la pente au point choisi', async () => {
		const { atelier, card } = await openPlotted('x^2');

		check(card(), 'Afficher la tangente');

		// Milieu de la fenêtre par défaut [-10 ; 10] : x₀ = 0, f′(0) = 0
		await vi.waitFor(() => expect(displayOf(atelier).tangentAt).toBe(0));
		await vi.waitFor(() => expect(text(card(), '.pente')).toBe('f′(x₀) = 0'));
	});

	it('le cercle osculateur affiche la courbure', async () => {
		const { atelier, card } = await openPlotted('x^2');
		atelier.setDisplay('f', { tangentAt: 0 });

		await vi.waitFor(() => check(card(), 'Afficher le cercle osculateur'));

		await vi.waitFor(() => expect(displayOf(atelier).showOsculating).toBe(true));
		// x² en 0 : κ = |f″| / (1 + f′²)^(3/2) = 2
		await vi.waitFor(() => expect(text(card(), '.courbure')).toBe('κ = 2'));
	});

	// S3
	it('l’aire se calcule entre les bornes choisies', async () => {
		const { atelier, card } = await openPlotted('x^2');

		check(card(), 'Afficher l’aire sous la courbe');
		await vi.waitFor(() => expect(displayOf(atelier).integral).not.toBeNull());

		setInput(card(), 'de, borne inférieure de l’aire', '0');
		setInput(card(), 'à, borne supérieure de l’aire', '1');

		await vi.waitFor(() => expect(displayOf(atelier).integral).toEqual({ from: 0, to: 1 }));
		await vi.waitFor(() => expect(text(card(), '.aire')).toBe('aire = 0,3333'));
	});

	it('la longueur se lit sur les bornes de l’aire', async () => {
		const { atelier, card } = await openPlotted('x');
		atelier.setDisplay('f', { integral: { from: 0, to: 3 } });

		await vi.waitFor(() => check(card(), 'Afficher la longueur de la courbe'));

		// y = x de 0 à 3 : 3√2 ≈ 4.243
		await vi.waitFor(() => expect(text(card(), '.longueur')).toBe('longueur = 4,243'));
	});

	// S5 : un réglage n'est pas une action, il n'écrit rien dans Calcul
	it('n’écrit rien dans l’historique de Calcul', async () => {
		const { container, card } = await openPlotted('x^2');
		const before = container.querySelectorAll('.historique li').length;

		check(card(), 'Afficher la tangente');
		check(card(), 'Afficher l’aire sous la courbe');
		await new Promise((r) => setTimeout(r, 50));

		expect(container.querySelectorAll('.historique li').length).toBe(before);
	});

	// Phase 0 Q1 : la case « f′ » du grapheur n'est pas reprise
	it('ne propose pas la case f′', async () => {
		const { card } = await openPlotted();

		expect(card().querySelector('[aria-label="Afficher la courbe dérivée"]')).toBeNull();
	});
});

// =============================================================================
// Revues du lot 2b
// =============================================================================

describe('revues du lot 2b', () => {
	// Revue de code 1 : `posted` n'est pas réactif — la carte restait sur
	// « pente non définie » après un retrait puis un nouveau tracé
	it('retrouve la pente après avoir retiré puis retracé la courbe', async () => {
		const { atelier, container, card } = await openPlotted('x^2');
		atelier.setDisplay('f', { tangentAt: 1 });
		await vi.waitFor(() => expect(text(card(), '.pente')).toBe('f′(x₀) = 2'));

		const eye = cardFor(container, 'f').querySelector('.oeil') as HTMLButtonElement;
		eye.click();
		await vi.waitFor(() => expect(card().querySelector('.reglages')).toBeNull());
		eye.click();

		await vi.waitFor(() => expect(text(card(), '.pente')).toBe('f′(x₀) = 2'));
	});

	// Revue de code 2 : une borne refusée laissait le champ contredire l'aire
	it('dit qu’une borne est refusée, puis remet la valeur retenue', async () => {
		const { atelier, card } = await openPlotted('x^2');
		atelier.setDisplay('f', { integral: { from: 0, to: 1 } });
		await vi.waitFor(() => expect(card().querySelector('.aire')).toBeTruthy());

		setInput(card(), 'à, borne supérieure de l’aire', '2e9');

		await vi.waitFor(() => expect(text(card(), '.refus')).not.toBe(''));
		const input = card().querySelector(
			'input[aria-label="à, borne supérieure de l’aire"]'
		) as HTMLInputElement;
		expect(input.getAttribute('aria-invalid')).toBe('true');

		input.dispatchEvent(new Event('change', { bubbles: true }));
		await vi.waitFor(() => expect(input.value).toBe('1'));
		expect(text(card(), '.refus')).toBe('');
	});

	// A11y 1 : le curseur est piloté en crans ; il doit annoncer l'abscisse
	it('le curseur annonce x₀, pas un numéro de cran', async () => {
		const { atelier, card } = await openPlotted('x^2');
		atelier.setDisplay('f', { tangentAt: 1.5 });

		await vi.waitFor(() => {
			const thumb = card().querySelector('[role="slider"]');
			expect(thumb?.getAttribute('aria-valuetext')).toBe('x₀ = 1,5, pente 3');
		});
	});

	it('les bornes forment un groupe nommé', async () => {
		const { atelier, card } = await openPlotted('x^2');
		atelier.setDisplay('f', { integral: { from: 0, to: 1 } });

		await vi.waitFor(() =>
			expect(card().querySelector('[role="group"][aria-label="Bornes de l’aire"]')).toBeTruthy()
		);
	});
});
