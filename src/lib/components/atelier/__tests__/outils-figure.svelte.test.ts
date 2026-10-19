/**
 * La barre d'outils de la vue Géométrie (géométrie, lot 3, PR 2 — M3, M5
 * partiel, M7, M8 de `docs/wip/atelier-geometrie-lot3-phase0.md`).
 *
 * Asserte le RENDU et le chemin complet : un clic sur la toile écrit sa ligne
 * dans la console, l'objet se dessine.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

// =============================================================================
// Décor
// =============================================================================

type Entry = [kind: 'point' | 'curve', name: string, definition: string];

/** Unités visibles sur le plus petit côté de la toile (`FigureView`). */
const UNITS_ACROSS = 13;

function atelierOf(entries: Entry[] = []): Atelier {
	const atelier = new Atelier();
	for (const [kind, name, definition] of entries) {
		atelier.create({ kind, name, definition }, 'text');
	}
	return atelier;
}

async function mount(atelier: Atelier) {
	const { container } = await render(AtelierContainer, {
		atelier,
		ephemeral: true,
		view: 'figure',
		consoleAtStart: false
	});
	await vi.waitFor(() => expect(container.querySelector('svg.geometry-canvas')).toBeTruthy());
	return container;
}

function canvasOf(container: HTMLElement): SVGSVGElement {
	const svg = container.querySelector('svg.geometry-canvas');
	if (!(svg instanceof SVGSVGElement)) throw new Error('pas de toile');
	return svg;
}

/** Le point de l'écran du point (x ; y) du repère : origine au centre, repère orthonormé. */
function screenOf(container: HTMLElement, x: number, y: number): { x: number; y: number } {
	const rect = canvasOf(container).getBoundingClientRect();
	const ppu = Math.min(rect.width, rect.height) / UNITS_ACROSS;
	return { x: rect.x + rect.width / 2 + x * ppu, y: rect.y + rect.height / 2 - y * ppu };
}

function pointer(
	target: Element,
	type: 'pointerdown' | 'pointermove' | 'pointerup',
	at: { x: number; y: number },
	pointerId = 1
) {
	target.dispatchEvent(
		new PointerEvent(type, {
			clientX: at.x,
			clientY: at.y,
			bubbles: true,
			pointerId,
			pointerType: pointerId === 1 ? 'mouse' : 'touch'
		})
	);
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

/** Cliquer (appuyer, relâcher sans bouger) au point (x ; y) du repère. */
async function clickAt(container: HTMLElement, x: number, y: number, dx = 0) {
	const svg = canvasOf(container);
	const at = screenOf(container, x, y);
	at.x += dx;
	pointer(svg, 'pointerdown', at);
	pointer(svg, 'pointerup', at);
	await nextFrame();
}

function toolButton(container: HTMLElement, label: string): HTMLButtonElement {
	const button = container.querySelector(`[role="toolbar"] button[aria-label="${label}"]`);
	if (!(button instanceof HTMLButtonElement)) throw new Error(`pas d'outil ${label}`);
	return button;
}

/** Les lignes écrites dans la console. */
function consoleLines(container: HTMLElement): string[] {
	return [...container.querySelectorAll('.historique .saisie')].map(
		(p) => p.textContent?.trim() ?? ''
	);
}

function messageOf(container: HTMLElement): string {
	return container.querySelector('.figure .refus')?.textContent?.trim() ?? '';
}

// =============================================================================
// Tests
// =============================================================================

describe('M3 : la barre d’outils de la vue Géométrie', () => {
	it('onze outils, dans l’ordre, Déplacer choisi par défaut', async () => {
		const container = await mount(atelierOf());

		const toolbar = container.querySelector('[role="toolbar"][aria-label="Outils de géométrie"]');
		const buttons = [...(toolbar?.querySelectorAll('button') ?? [])];
		expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
			'Déplacer',
			'Point',
			'Segment',
			'Droite',
			'Demi-droite',
			'Cercle',
			'Milieu',
			'Intersection',
			'Point sur un objet',
			'Parallèle',
			'Perpendiculaire'
		]);
		expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual([
			'true',
			...Array<string>(10).fill('false')
		]);
	});

	it('M8 : la barre se parcourt aux flèches (un seul arrêt de tabulation)', async () => {
		const container = await mount(atelierOf());
		toolButton(container, 'Déplacer').focus();

		await userEvent.keyboard('{ArrowRight}');

		expect(document.activeElement?.getAttribute('aria-label')).toBe('Point');
	});

	it('Point : un clic sur la toile écrit A = (2 ; 1) dans la console, le point se dessine', async () => {
		const atelier = atelierOf();
		const container = await mount(atelier);
		toolButton(container, 'Point').click();
		await nextFrame();
		expect(messageOf(container)).toBe('Clique où placer le point.');

		await clickAt(container, 2, 1);

		expect(atelier.get('A')?.definition).toBe('(2 ; 1)');
		await vi.waitFor(() => expect(consoleLines(container)).toEqual(['A = (2 ; 1)']));
		await vi.waitFor(() =>
			expect(canvasOf(container).querySelectorAll('circle.point').length).toBe(1)
		);
		// M8 : la création est annoncée, la console reste fermée (G7)
		await vi.waitFor(() =>
			expect(container.querySelector('[data-annonce]')?.textContent).toContain('A = (2 ; 1)')
		);
	});

	it('Segment : deux clics dans le vide écrivent A, B et d = [AB] ; la consigne suit', async () => {
		const atelier = atelierOf();
		const container = await mount(atelier);
		toolButton(container, 'Segment').click();
		await nextFrame();
		expect(messageOf(container)).toBe('Clique sur un premier point.');

		await clickAt(container, 0, 0);
		await vi.waitFor(() => expect(messageOf(container)).toBe('Clique sur un deuxième point.'));
		await clickAt(container, 3, 2);

		await vi.waitFor(() =>
			expect(consoleLines(container)).toEqual(['A = (0 ; 0)', 'B = (3 ; 2)', 'd = [AB]'])
		);
		await vi.waitFor(() => expect(canvasOf(container).querySelector('.segment')).toBeTruthy());
		expect(messageOf(container)).toBe('Clique sur un premier point.');
	});

	it('Cercle : le centre, puis un point du cercle — c = cercle(A ; passant=B)', async () => {
		const atelier = atelierOf();
		const container = await mount(atelier);
		toolButton(container, 'Cercle').click();

		await clickAt(container, 0, 0);
		await clickAt(container, 2, 0);

		await vi.waitFor(() =>
			expect(consoleLines(container)).toEqual([
				'A = (0 ; 0)',
				'B = (2 ; 0)',
				'c = cercle(A ; passant=B)'
			])
		);
		await vi.waitFor(() => expect(canvasOf(container).querySelector('.circle')).toBeTruthy());
	});
});

describe('M5 (partiel) : un clic près d’un point existant le réutilise', () => {
	it('à 5 px de A, la Droite part de A : seule B s’écrit, puis d = (AB)', async () => {
		const atelier = atelierOf([['point', 'A', '(0 ; 0)']]);
		const container = await mount(atelier);
		toolButton(container, 'Droite').click();

		await clickAt(container, 0, 0, 5);
		await clickAt(container, 3, 0);

		await vi.waitFor(() => expect(consoleLines(container)).toEqual(['B = (3 ; 0)', 'd = (AB)']));
	});

	it('un outil choisi, le point visé ne se glisse pas : appuyer et tirer n’écrit rien', async () => {
		const atelier = atelierOf([['point', 'A', '(0 ; 0)']]);
		const container = await mount(atelier);
		toolButton(container, 'Segment').click();
		const svg = canvasOf(container);
		const at = screenOf(container, 0, 0);

		pointer(svg, 'pointerdown', at);
		pointer(svg, 'pointermove', { x: at.x + 40, y: at.y });
		await nextFrame();
		pointer(svg, 'pointerup', { x: at.x + 40, y: at.y });
		await nextFrame();

		expect(atelier.get('A')?.definition).toBe('(0 ; 0)');
		expect(consoleLines(container)).toEqual([]);
	});
});

describe('M7 : le fantôme, Échap', () => {
	it('le premier point posé, un fantôme suit la souris ; Échap l’abandonne, A reste', async () => {
		const atelier = atelierOf();
		const container = await mount(atelier);
		toolButton(container, 'Segment').click();
		await clickAt(container, 0, 0);

		pointer(canvasOf(container), 'pointermove', screenOf(container, 2, 2));
		await vi.waitFor(() => expect(canvasOf(container).querySelector('.fantome')).toBeTruthy());

		await userEvent.keyboard('{Escape}');

		await vi.waitFor(() => expect(canvasOf(container).querySelector('.fantome')).toBeNull());
		expect(messageOf(container)).toBe('Clique sur un premier point.');
		expect(atelier.get('A')).toBeDefined();
	});

	it('le même point deux fois : la vue le dit, rien ne s’écrit', async () => {
		const atelier = atelierOf([['point', 'A', '(0 ; 0)']]);
		const container = await mount(atelier);
		toolButton(container, 'Segment').click();

		await clickAt(container, 0, 0);
		await clickAt(container, 0, 0);

		await vi.waitFor(() => expect(messageOf(container)).toBe('Choisis un autre point que A.'));
		expect(consoleLines(container)).toEqual([]);
	});
});

describe('M8 : les flèches déplacent le point choisi', () => {
	it('le point posé se déplace de 0,1 à la flèche, de 1 avec Maj', async () => {
		const atelier = atelierOf();
		const container = await mount(atelier);
		toolButton(container, 'Point').click();
		await clickAt(container, 2, 1);
		await vi.waitFor(() => expect(atelier.get('A')).toBeDefined());

		const toile = container.querySelector<HTMLElement>('.toile');
		toile?.focus();
		expect(toile?.getAttribute('aria-label')).toBe('Figure : les flèches déplacent A');
		await userEvent.keyboard('{ArrowRight}');
		expect(atelier.get('A')?.definition).toBe('(2,1 ; 1)');
		await userEvent.keyboard('{Shift>}{ArrowUp}{/Shift}');
		expect(atelier.get('A')?.definition).toBe('(2,1 ; 2)');
	});
});

describe('revue de la PR', () => {
	it('Annuler le premier point d’un segment : la construction est abandonnée, la consigne le dit', async () => {
		const atelier = atelierOf();
		const container = await mount(atelier);
		toolButton(container, 'Segment').click();
		await clickAt(container, 0, 0);
		await vi.waitFor(() => expect(messageOf(container)).toBe('Clique sur un deuxième point.'));

		container.querySelector<HTMLButtonElement>('button[aria-label^="Annuler"]')?.click();

		await vi.waitFor(() => expect(atelier.get('A')).toBeUndefined());
		await vi.waitFor(() => expect(messageOf(container)).toBe('Clique sur un premier point.'));
	});

	it('une flèche enfoncée puis le focus perdu : le geste se ferme (Annuler n’attend pas)', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 1)']]);
		const container = await mount(atelier);
		toolButton(container, 'Point').click();
		await clickAt(container, 1, 1);
		const toile = container.querySelector<HTMLElement>('.toile');
		toile?.focus();

		toile?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		expect(atelier.get('A')?.definition).toBe('(1,1 ; 1)');
		expect(atelier.draggingPoint).toBe(true);
		toolButton(container, 'Point').focus();

		expect(atelier.draggingPoint).toBe(false);
	});

	it('un second doigt pendant un appui d’outil : aucun clic ne part', async () => {
		const atelier = atelierOf();
		const container = await mount(atelier);
		toolButton(container, 'Point').click();
		const svg = canvasOf(container);
		const first = screenOf(container, 0, 0);
		const second = screenOf(container, 3, 3);

		pointer(svg, 'pointerdown', first, 1);
		pointer(svg, 'pointerdown', second, 2);
		pointer(svg, 'pointerup', second, 2);
		pointer(svg, 'pointerup', first, 1);
		await nextFrame();

		expect(consoleLines(container)).toEqual([]);
	});

	it('Échap qui ferme la console n’abandonne pas la construction', async () => {
		const atelier = atelierOf();
		const container = await mount(atelier);
		toolButton(container, 'Segment').click();
		await clickAt(container, 0, 0);
		container.querySelector<HTMLButtonElement>('button[aria-controls="atelier-console"]')?.click();
		await vi.waitFor(() =>
			expect(container.querySelector('#atelier-console input, #atelier-console math-field')).toBe(
				document.activeElement
			)
		);

		await userEvent.keyboard('{Escape}');

		await vi.waitFor(() =>
			expect(
				container
					.querySelector('button[aria-controls="atelier-console"]')
					?.getAttribute('aria-expanded')
			).toBe('false')
		);
		expect(messageOf(container)).toBe('Clique sur un deuxième point.');
	});

	it('un point construit visé n’est pas le point des flèches, son refus ne cache pas la consigne', async () => {
		const atelier = atelierOf([
			['point', 'A', '(0 ; 0)'],
			['point', 'B', '(4 ; 0)'],
			['point', 'I', 'milieu(A ; B)']
		]);
		const container = await mount(atelier);
		toolButton(container, 'Segment').click();
		await clickAt(container, 2, 0);
		const toile = container.querySelector<HTMLElement>('.toile');
		toile?.focus();

		await userEvent.keyboard('{ArrowUp}');

		expect(toile?.getAttribute('aria-label')).toBe('Figure');
		expect(messageOf(container)).toBe('Clique sur un deuxième point.');
	});
});
