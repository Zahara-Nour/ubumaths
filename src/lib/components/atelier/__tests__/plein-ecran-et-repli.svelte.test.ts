/**
 * L'atelier en plein écran, et « Mes objets » replié sur bureau
 * (chantier `atelier-plein-ecran`, validé par David le 2026-11-15).
 *
 * Plein écran : l'atelier recouvre la fenêtre — ni en-tête ni menu du site —,
 * sans le plein écran du navigateur. Échap en sort, après la console.
 * Repli sur bureau : « Mes objets » devient une bande étroite, la vue prend la place.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '#lib/atelier/atelier.svelte.ts';
import { onDesktopScreen } from './harness/desktop-screen';

onDesktopScreen();

// =============================================================================
// Outils
// =============================================================================

function atelierWithPoint(): Atelier {
	const atelier = new Atelier();
	atelier.create({ kind: 'point', name: 'A', definition: '(1 ; 2)' }, 'text');
	return atelier;
}

function buttonNamed(container: HTMLElement, name: string): HTMLButtonElement | null {
	const found = container.querySelector(`button[aria-label="${name}"]`);
	return found instanceof HTMLButtonElement ? found : null;
}

function root(container: HTMLElement): HTMLElement {
	const found = container.querySelector('.atelier');
	if (!(found instanceof HTMLElement)) throw new Error('pas d’atelier');
	return found;
}

function escape(target: Element = document.body) {
	target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

const tick = () => new Promise((r) => setTimeout(r, 0));

// =============================================================================
// Plein écran
// =============================================================================

describe('plein écran de l’atelier', () => {
	it('recouvre toute la fenêtre, et le même bouton en sort', async () => {
		const { container } = await render(AtelierContainer, {
			ephemeral: true,
			consoleAtStart: false
		});

		expect(getComputedStyle(root(container)).position).not.toBe('fixed');
		buttonNamed(container, 'Plein écran')?.click();
		await tick();

		const box = root(container).getBoundingClientRect();
		expect(getComputedStyle(root(container)).position).toBe('fixed');
		expect(box.top).toBe(0);
		expect(box.left).toBe(0);
		expect(box.width).toBe(window.innerWidth);
		expect(box.height).toBe(window.innerHeight);
		// La barre d'outils et « Mes objets » restent : c'est tout l'atelier
		expect(getComputedStyle(container.querySelector('.barre')!).display).not.toBe('none');
		expect(getComputedStyle(container.querySelector('.panneau')!).display).not.toBe('none');

		buttonNamed(container, 'Quitter le plein écran')?.click();
		await tick();
		expect(getComputedStyle(root(container)).position).not.toBe('fixed');
		expect(buttonNamed(container, 'Plein écran')).toBeTruthy();
	});

	it('Échap en sort', async () => {
		const { container } = await render(AtelierContainer, {
			ephemeral: true,
			consoleAtStart: false
		});
		buttonNamed(container, 'Plein écran')?.click();
		await tick();

		escape();
		await tick();

		expect(getComputedStyle(root(container)).position).not.toBe('fixed');
	});

	it('Échap ferme d’abord la console ouverte, sans quitter le plein écran', async () => {
		const { container } = await render(AtelierContainer, {
			ephemeral: true,
			consoleAtStart: true
		});
		buttonNamed(container, 'Plein écran')?.click();
		await tick();
		const console = container.querySelector('[role="region"][aria-label="Console"]');
		expect(console).toBeTruthy();
		expect(buttonNamed(container, 'Console')?.getAttribute('aria-expanded')).toBe('true');

		escape(console!);
		await tick();

		expect(buttonNamed(container, 'Console')?.getAttribute('aria-expanded')).toBe('false');
		expect(getComputedStyle(root(container)).position).toBe('fixed');
	});

	it('console ouverte, focus ailleurs : Échap ferme la console, puis le plein écran', async () => {
		const { container } = await render(AtelierContainer, {
			ephemeral: true,
			consoleAtStart: true
		});
		buttonNamed(container, 'Plein écran')?.click();
		await tick();

		escape();
		await tick();
		expect(buttonNamed(container, 'Console')?.getAttribute('aria-expanded')).toBe('false');
		expect(getComputedStyle(root(container)).position).toBe('fixed');

		escape();
		await tick();
		expect(getComputedStyle(root(container)).position).not.toBe('fixed');
	});
});

// =============================================================================
// « Mes objets » replié sur bureau
// =============================================================================

describe('« Mes objets » se replie sur bureau', () => {
	it('en une bande étroite, et la vue prend la largeur', async () => {
		const { container } = await render(AtelierContainer, {
			atelier: atelierWithPoint(),
			ephemeral: true,
			view: 'figure',
			consoleAtStart: false
		});
		const panel = container.querySelector('.panneau') as HTMLElement;
		const zone = container.querySelector('.zone') as HTMLElement;
		const zoneBefore = zone.getBoundingClientRect().width;
		expect(panel.getBoundingClientRect().width).toBeGreaterThan(200);

		buttonNamed(container, 'Replier « Mes objets »')?.click();
		await tick();

		expect(getComputedStyle(container.querySelector('.panneau .corps')!).display).toBe('none');
		expect(panel.getBoundingClientRect().width).toBeLessThan(64);
		expect(zone.getBoundingClientRect().width).toBeGreaterThan(zoneBefore + 150);
		// Le compte d'objets reste lisible sur la bande
		expect(panel.textContent).toContain('1');

		buttonNamed(container, 'Déplier « Mes objets »')?.click();
		await tick();
		await vi.waitFor(() =>
			expect(getComputedStyle(container.querySelector('.panneau .corps')!).display).not.toBe('none')
		);
		expect(panel.getBoundingClientRect().width).toBeGreaterThan(200);
	});

	it('vide, il n’a pas de bouton de repli : ses « + » sont la seule entrée', async () => {
		const { container } = await render(AtelierContainer, {
			ephemeral: true,
			consoleAtStart: false
		});

		expect(buttonNamed(container, 'Replier « Mes objets »')).toBeNull();
	});
});
