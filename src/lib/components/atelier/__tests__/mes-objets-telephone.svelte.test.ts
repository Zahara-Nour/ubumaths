/**
 * « Mes objets » replié par défaut sur téléphone (décision du 2026-10-19).
 *
 * Au-dessus de la vue (une colonne, ≤ 720 px), le panneau grandissait avec les
 * objets et ramenait la toile à son plancher (160 px avec deux points). Replié,
 * il ne garde qu'une barre : titre, compte d'objets, bouton pour le déplier.
 */

import { afterEach, describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

// =============================================================================
// Outils
// =============================================================================

function atelierOf(points: [string, string][] = []): Atelier {
	const atelier = new Atelier();
	for (const [name, definition] of points) {
		atelier.create({ kind: 'point', name, definition }, 'text');
	}
	return atelier;
}

/** L'atelier comme dans la page d'un téléphone (iPhone 13), vue Géométrie. */
async function mountAt(width: number, atelier: Atelier) {
	await page.viewport(width, 664);
	const { container } = await render(AtelierContainer, {
		atelier,
		ephemeral: true,
		view: 'figure',
		consoleAtStart: false
	});
	container.style.height = '600px';
	await vi.waitFor(() => expect(container.querySelector('svg.geometry-canvas')).toBeTruthy());
	return container;
}

function toggleOf(container: HTMLElement): HTMLButtonElement {
	const button = container.querySelector('.panneau button[aria-controls]');
	if (!(button instanceof HTMLButtonElement)) throw new Error('pas de bouton de repli');
	return button;
}

/** Les cartes et les boutons de création sont-ils à l'écran ? */
function bodyShown(container: HTMLElement): boolean {
	const body = container.querySelector('.panneau .corps');
	if (!body) throw new Error('pas de corps de panneau');
	return getComputedStyle(body).display !== 'none';
}

function canvasHeight(container: HTMLElement): number {
	const toile = container.querySelector('.figure .toile');
	if (!toile) throw new Error('pas de toile');
	return toile.getBoundingClientRect().height;
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

afterEach(async () => {
	await page.viewport(1280, 900);
});

// =============================================================================
// Nominal
// =============================================================================

describe('sur téléphone, « Mes objets » s’ouvre replié', () => {
	it('avec deux points : une barre, et la toile garde la place', async () => {
		const container = await mountAt(
			390,
			atelierOf([
				['A', '(1 ; 2)'],
				['B', '(3 ; 1)']
			])
		);
		await nextFrame();

		const toggle = toggleOf(container);
		expect(toggle.getAttribute('aria-expanded')).toBe('false');
		expect(bodyShown(container)).toBe(false);
		// Le panneau ouvert ramenait la toile à 160 px
		expect(canvasHeight(container)).toBeGreaterThan(300);
	});

	it('le bouton déplie puis replie le panneau', async () => {
		const container = await mountAt(390, atelierOf([['A', '(1 ; 2)']]));
		const toggle = toggleOf(container);

		toggle.click();
		await nextFrame();
		expect(toggle.getAttribute('aria-expanded')).toBe('true');
		expect(bodyShown(container)).toBe(true);
		const controlled = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
		expect(controlled?.classList.contains('corps')).toBe(true);

		toggle.click();
		await nextFrame();
		expect(toggle.getAttribute('aria-expanded')).toBe('false');
		expect(bodyShown(container)).toBe(false);
	});

	it('replié, le compte d’objets suit les créations', async () => {
		const atelier = atelierOf([
			['A', '(1 ; 2)'],
			['B', '(3 ; 1)']
		]);
		const container = await mountAt(390, atelier);

		atelier.create({ kind: 'point', name: 'C', definition: '(0 ; 0)' }, 'text');
		await nextFrame();

		const count = container.querySelector('.panneau .compte')?.textContent;
		expect(count?.replace(/\s+/g, ' ').trim()).toBe('3 objets');
		expect(bodyShown(container)).toBe(false);
	});
});

// =============================================================================
// Limites
// =============================================================================

describe('atelier vide', () => {
	it('le panneau est déplié : les boutons de création sont là', async () => {
		const container = await mountAt(390, atelierOf());

		expect(toggleOf(container).getAttribute('aria-expanded')).toBe('true');
		expect(bodyShown(container)).toBe(true);
	});

	it('un premier objet créé ailleurs (barre d’outils, console) replie le panneau', async () => {
		const atelier = atelierOf();
		const container = await mountAt(390, atelier);

		atelier.create({ kind: 'point', name: 'A', definition: '(1 ; 2)' }, 'text');
		await nextFrame();

		expect(bodyShown(container)).toBe(false);
	});

	it('un premier objet créé par « + Point » laisse le panneau déplié', async () => {
		const container = await mountAt(390, atelierOf());

		const plus = [...container.querySelectorAll('.panneau .creer button')].find(
			(b) => b.textContent?.trim() === '+ Point'
		);
		if (!(plus instanceof HTMLButtonElement)) throw new Error('pas de « + Point »');
		plus.click();
		await nextFrame();

		expect(bodyShown(container)).toBe(true);
	});

	it('un atelier qui redevient vide déplie le panneau', async () => {
		const atelier = atelierOf([['A', '(1 ; 2)']]);
		const container = await mountAt(390, atelier);
		expect(bodyShown(container)).toBe(false);

		atelier.remove('A');
		await nextFrame();

		expect(bodyShown(container)).toBe(true);
	});
});

describe('une carte qui prend la main', () => {
	it('la carte prête à taper de /grapheur est à l’écran, son champ a le focus', async () => {
		await page.viewport(390, 664);
		const { container } = await render(AtelierContainer, {
			atelier: new Atelier(),
			ephemeral: true,
			view: 'graphe',
			startWith: 'function',
			consoleAtStart: false
		});

		await vi.waitFor(() => expect(container.querySelectorAll('article.objet').length).toBe(1));
		expect(toggleOf(container).getAttribute('aria-expanded')).toBe('true');
		expect(bodyShown(container)).toBe(true);
		await vi.waitFor(() =>
			expect(document.activeElement?.tagName.toLowerCase()).toBe('math-field')
		);
	});
});

describe('au-dessus de 720 px', () => {
	it('rien ne change : pas de bouton de repli, les cartes sont là', async () => {
		const container = await mountAt(
			1024,
			atelierOf([
				['A', '(1 ; 2)'],
				['B', '(3 ; 1)']
			])
		);

		expect(getComputedStyle(toggleOf(container)).display).toBe('none');
		expect(bodyShown(container)).toBe(true);
	});

	it('repassé sous 720 px, le panneau retrouve son état replié', async () => {
		const container = await mountAt(1024, atelierOf([['A', '(1 ; 2)']]));
		expect(bodyShown(container)).toBe(true);

		await page.viewport(390, 664);
		await nextFrame();

		expect(bodyShown(container)).toBe(false);
	});
});
