/**
 * Les outils de construction de la vue Géométrie et le M5 complet (géométrie,
 * lot 3, PR 3 de `docs/archive/wip/atelier-geometrie-lot3-phase0.md`).
 *
 * Asserte le chemin complet : la toile dit ce qui est proche du clic, l'outil
 * écrit sa ligne dans la console, l'objet se dessine.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
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

/** Survoler (x ; y) du repère, sans appuyer. */
async function hoverAt(container: HTMLElement, x: number, y: number) {
	pointer(canvasOf(container), 'pointermove', screenOf(container, x, y));
	await nextFrame();
}

/** Un segment [AB] horizontal et un cercle de centre O, de rayon 2. */
const FIGURE: Entry[] = [
	['point', 'A', '(-4 ; 0)'],
	['point', 'B', '(4 ; 0)'],
	['curve', 'd', '[AB]'],
	['point', 'O', '(0 ; 0)'],
	['curve', 'c', 'cercle(O ; 2)']
];

// =============================================================================
// Tests
// =============================================================================

describe('M5 : un clic sur un objet, ou là où deux objets se coupent', () => {
	it('Point, un clic sur le segment : C = point_sur(d ; 0,9)', async () => {
		const atelier = atelierOf(FIGURE);
		const container = await mount(atelier);
		toolButton(container, 'Point').click();

		await clickAt(container, 3.2, 3 / 40 /* à quelques pixels au-dessus */);

		await vi.waitFor(() => expect(consoleLines(container)).toEqual(['C = point_sur(d ; 0,9)']));
		expect(atelier.get('C')?.status).toBe('ok');
	});

	it('Point, un clic là où le segment coupe le cercle : leur intersection', async () => {
		const atelier = atelierOf(FIGURE);
		const container = await mount(atelier);
		toolButton(container, 'Point').click();

		await clickAt(container, 2, 0);

		await vi.waitFor(() => expect(consoleLines(container)).toHaveLength(1));
		expect(consoleLines(container)[0]).toMatch(/^C = intersection\((d ; c|c ; d) ; [12]\)$/);
		expect(atelier.get('C')?.status).toBe('ok');
	});

	it('au survol, avec un outil, l’objet visé est mis en évidence', async () => {
		const container = await mount(atelierOf(FIGURE));
		toolButton(container, 'Point sur un objet').click();

		await hoverAt(container, -3, 0);

		await vi.waitFor(() =>
			expect(canvasOf(container).querySelector('.segment.hovered')).toBeTruthy()
		);
	});
});

describe('Les outils de construction', () => {
	it('Intersection, deux clics : le cercle, puis le segment près de (−2 ; 0)', async () => {
		const atelier = atelierOf(FIGURE);
		const container = await mount(atelier);
		toolButton(container, 'Intersection').click();

		await clickAt(container, 0, 2);
		await vi.waitFor(() => expect(messageOf(container)).toBe('Clique sur un deuxième objet.'));
		await clickAt(container, -3, 0);

		await vi.waitFor(() => expect(consoleLines(container)).toHaveLength(1));
		expect(consoleLines(container)[0]).toMatch(/^C = intersection\(c ; d ; [12]\)$/);
		await vi.waitFor(() =>
			expect(canvasOf(container).querySelectorAll('circle.point').length).toBe(4)
		);
	});

	it('Milieu, un clic sur le segment : C = milieu(d)', async () => {
		const container = await mount(atelierOf(FIGURE));
		toolButton(container, 'Milieu').click();

		await clickAt(container, 3, 0);

		await vi.waitFor(() => expect(consoleLines(container)).toEqual(['C = milieu(d)']));
	});

	it('Parallèle : le segment, puis un clic dans le vide — le point, puis la parallèle', async () => {
		const atelier = atelierOf(FIGURE);
		const container = await mount(atelier);
		toolButton(container, 'Parallèle').click();

		await clickAt(container, 3, 0);
		await vi.waitFor(() =>
			expect(messageOf(container)).toBe('Clique sur le point par lequel passe la parallèle.')
		);
		await clickAt(container, 1, 4);

		await vi.waitFor(() =>
			expect(consoleLines(container)).toEqual(['C = (1 ; 4)', 'd_1 = parallele(C ; d)'])
		);
		expect(atelier.get('d_1')?.status).toBe('ok');
	});

	it('Perpendiculaire : le fantôme suit le pointeur une fois la droite choisie', async () => {
		const container = await mount(atelierOf(FIGURE));
		toolButton(container, 'Perpendiculaire').click();

		await clickAt(container, 3, 0);
		await hoverAt(container, 1, 4);

		await vi.waitFor(() => {
			const ghost = canvasOf(container).querySelector('line.fantome');
			expect(ghost).toBeTruthy();
			// Verticale : la perpendiculaire à un segment horizontal
			const x1 = Number(ghost?.getAttribute('x1'));
			const x2 = Number(ghost?.getAttribute('x2'));
			expect(Math.abs(x1 - x2)).toBeLessThan(1);
		});
	});
});
