/**
 * Bloc ```figure à manipuler (lot 6 du chantier figure-et-choix, décisions de
 * David du 2026-10-29) : `deplacable: oui` ou `rendu: croquis|mixte` → la
 * toile, à vue figée ; « Remettre la figure » ; la page garde la molette, le
 * clavier et (figure figée) le doigt ; sans ces clés, le SVG statique.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FigureBlock from '../FigureBlock.svelte';
import { parseFigureContent } from '$lib/ubumark/parser/figure-parser';

// Fenêtre -5..5 en taille moyenne (400 px) : 40 px par unité, A(1, 1) en (240, 160)
const HEADER = 'fenetre: -5 ; 5 ; -5 ; 5\ntaille: moyenne\ndescription: Le point A.';
const SCRIPT = 'A = point(1, 1)\nB = point(-2, 0)\ns = segment(A, B)';

let mains: HTMLElement[] = [];
function mainElement(width = 800): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	main.style.width = `${width}px`;
	mains.push(main);
	return main;
}
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

function parseBlock(header: string) {
	return parseFigureContent(`${HEADER}\n${header}\n---\n${SCRIPT}`);
}

async function renderBlock(header: string, width = 800): Promise<HTMLElement> {
	return (await renderScreen(header, width)).container;
}

async function renderScreen(header: string, width = 800) {
	const node = parseBlock(header);
	expect(node.errors).toEqual([]);
	const screen = await render(FigureBlock, { target: mainElement(width), props: { node } });
	// Le premier rendu charge la toile à la demande (lent sur une CI à froid)
	await expect
		.poll(() => screen.container.querySelector('svg.geometry-canvas, svg.figure-svg'), {
			timeout: 5000
		})
		.not.toBeNull();
	return screen;
}

function canvasOf(container: HTMLElement): SVGSVGElement {
	const svg = container.querySelector('svg.geometry-canvas') as SVGSVGElement | null;
	if (!svg) throw new Error('toile absente');
	// Pointeur fabriqué : la capture d'un pointeur inexistant lèverait
	svg.setPointerCapture = () => {};
	svg.releasePointerCapture = () => {};
	return svg;
}

/** Centre du point le plus à droite (A), en px de la toile */
function pointA(svg: SVGSVGElement): { cx: number; cy: number } {
	const points = [...svg.querySelectorAll('circle.point')].map((c) => ({
		cx: Number(c.getAttribute('cx')),
		cy: Number(c.getAttribute('cy'))
	}));
	return points.sort((a, b) => b.cx - a.cx)[0];
}

async function drag(svg: SVGSVGElement, from: [number, number], to: [number, number]) {
	const rect = svg.getBoundingClientRect();
	const at = ([x, y]: [number, number]) => ({
		clientX: rect.left + x,
		clientY: rect.top + y,
		bubbles: true,
		pointerId: 1,
		button: 0
	});
	svg.dispatchEvent(new PointerEvent('pointerdown', at(from)));
	svg.dispatchEvent(new PointerEvent('pointermove', at(to)));
	svg.dispatchEvent(new PointerEvent('pointerup', at(to)));
	await new Promise((r) => setTimeout(r, 0));
}

function resetButton(container: HTMLElement): HTMLButtonElement | undefined {
	return [...container.querySelectorAll('button')].find(
		(b) => b.textContent?.trim() === 'Remettre la figure'
	);
}

describe('FigureBlock — deplacable: oui', () => {
	it('la toile, à la taille de la figure, nommée par la description', async () => {
		const container = await renderBlock('deplacable: oui');
		const svg = canvasOf(container);
		expect(svg.getAttribute('width')).toBe('400');
		expect(svg.getAttribute('role')).toBe('application');
		expect(svg.getAttribute('aria-label')).toBe('Le point A.');
		expect(container.querySelector('svg.figure-svg')).toBeNull();
	});

	it('un point glisse ; « Remettre la figure » le ramène au départ', async () => {
		const container = await renderBlock('deplacable: oui');
		expect(pointA(canvasOf(container))).toEqual({ cx: 240, cy: 160 });

		await drag(canvasOf(container), [240, 160], [320, 80]);
		expect(pointA(canvasOf(container))).not.toEqual({ cx: 240, cy: 160 });

		resetButton(container)!.click();
		await expect.poll(() => pointA(canvasOf(container))).toEqual({ cx: 240, cy: 160 });
	});

	it('un nouvel objet nœud au même texte (re-rendu du parent) ne ramène pas la figure au départ', async () => {
		const screen = await renderScreen('deplacable: oui');
		await drag(canvasOf(screen.container), [240, 160], [320, 80]);
		const moved = pointA(canvasOf(screen.container));
		expect(moved).not.toEqual({ cx: 240, cy: 160 });

		await screen.rerender({ node: parseBlock('deplacable: oui') });
		await new Promise((r) => setTimeout(r, 0));
		expect(pointA(canvasOf(screen.container))).toEqual(moved);
	});

	it('conteneur étroit (téléphone) : la toile tient dans sa largeur', async () => {
		const container = await renderBlock('deplacable: oui', 300);
		await expect
			.poll(() => Number(canvasOf(container).getAttribute('width')))
			.toBeLessThanOrEqual(300);
		const svg = canvasOf(container);
		expect(Number(svg.getAttribute('width'))).toBeGreaterThan(200);
		expect(svg.getBoundingClientRect().right).toBeLessThanOrEqual(
			container.getBoundingClientRect().right + 0.5
		);
	});

	it('vue figée : la molette n’est pas captée (la page défile) et ne zoome pas', async () => {
		const container = await renderBlock('deplacable: oui');
		const svg = canvasOf(container);
		const rect = svg.getBoundingClientRect();
		const wheel = new WheelEvent('wheel', {
			clientX: rect.left + 200,
			clientY: rect.top + 200,
			deltaY: 100,
			bubbles: true,
			cancelable: true
		});
		svg.dispatchEvent(wheel);
		expect(wheel.defaultPrevented).toBe(false);
		await new Promise((r) => setTimeout(r, 0));
		expect(pointA(canvasOf(container))).toEqual({ cx: 240, cy: 160 });
	});

	it('aucun raccourci clavier pris à la page : espace et Ctrl+Z passent', async () => {
		await renderBlock('deplacable: oui');
		for (const init of [
			{ code: 'Space', key: ' ' },
			{ code: 'KeyZ', key: 'z', ctrlKey: true }
		]) {
			const event = new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true });
			document.body.dispatchEvent(event);
			expect(event.defaultPrevented).toBe(false);
		}
	});

	it('double-clic sur un point : aucun panneau de style', async () => {
		const container = await renderBlock('deplacable: oui');
		const svg = canvasOf(container);
		const rect = svg.getBoundingClientRect();
		svg.dispatchEvent(
			new MouseEvent('dblclick', {
				clientX: rect.left + 240,
				clientY: rect.top + 160,
				bubbles: true
			})
		);
		await new Promise((r) => setTimeout(r, 0));
		expect(container.querySelector('.style-popover, [role="dialog"]')).toBeNull();
	});

	it('le noir par défaut suit le thème (couleur du texte)', async () => {
		const container = await renderBlock('deplacable: oui');
		const point = canvasOf(container).querySelector('circle.point') as SVGCircleElement;
		expect(point.style.fill).toBe('var(--color-foreground)');
	});
});

describe('FigureBlock — rendu seul, ou réglages neutres', () => {
	it('rendu: croquis sans deplacable → toile figée : rien ne glisse, le doigt fait défiler, pas de bouton', async () => {
		const container = await renderBlock('rendu: croquis');
		const svg = canvasOf(container);
		expect(svg.getAttribute('role')).toBe('img');
		expect(getComputedStyle(svg).touchAction).toBe('auto');
		expect(resetButton(container)).toBeUndefined();

		const before = svg.innerHTML;
		await drag(svg, [240, 160], [320, 80]);
		expect(canvasOf(container).innerHTML).toBe(before);
	});

	it('deplacable: oui → le doigt est capté par la figure (touch-action: none)', async () => {
		const container = await renderBlock('deplacable: oui');
		expect(getComputedStyle(canvasOf(container)).touchAction).toBe('none');
	});

	it('deplacable: non et rendu: normal écrits → SVG statique, comme sans ces clés', async () => {
		const container = await renderBlock('deplacable: non\nrendu: normal');
		expect(container.querySelector('svg.geometry-canvas')).toBeNull();
		expect(container.querySelector('svg.figure-svg')).not.toBeNull();
	});
});
