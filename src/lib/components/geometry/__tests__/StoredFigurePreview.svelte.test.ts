/**
 * Figure stockée avec en-tête (spécification validée le 2026-10-13) :
 * `deplacable: non` fige les points mais laisse les curseurs actifs ;
 * `deplacable: oui` (témoin) les laisse glisser ; le repère de l'en-tête est
 * dessiné en SVG sous les objets ; un script nu garde l'affichage historique.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import StoredFigurePreview from '../StoredFigurePreview.svelte';
import { evaluateStoredFigure } from '$lib/utils/geometry-figure-script';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import type { Figure } from '$lib/geometry-core/graph/figure';

const SCRIPT = 's = slider(min=0, max=4, valeur=1)\nA = point(1, 1)\nB = point(s, 0)';

let mains: HTMLElement[] = [];
function mainElement(width: number): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	main.style.width = `${width}px`;
	mains.push(main);
	return main;
}
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

async function renderText(
	text: string,
	containerWidth = 800
): Promise<{ figure: Figure; svg: SVGSVGElement }> {
	const result = evaluateStoredFigure(text);
	if (!result.ok) throw new Error(result.message);
	const screen = await render(StoredFigurePreview, {
		target: mainElement(containerWidth),
		props: { result }
	});
	await expect.poll(() => screen.container.querySelector('svg.geometry-canvas')).not.toBeNull();
	const svg = screen.container.querySelector('svg.geometry-canvas') as SVGSVGElement;
	// Pointeur fabriqué : la capture d'un pointeur inexistant lèverait
	svg.setPointerCapture = () => {};
	svg.releasePointerCapture = () => {};
	return { figure: result.figure, svg };
}

function positionOf(figure: Figure, label: string): { x: number; y: number } {
	const el = figure.getAllElements().find((e) => e.label === label);
	const pos = el ? figure.getPosition(el.id) : undefined;
	if (!pos) throw new Error(`point ${label} introuvable`);
	return { x: geoToNumber(pos.x), y: geoToNumber(pos.y) };
}

/** Glisser de (x1, y1) à (x2, y2), en px de la toile */
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

// Fenêtre -5..5 en taille moyenne (400 px) : 40 px par unité, A(1, 1) en (240, 160)
const HEADER = 'fenetre: -5 ; 5 ; -5 ; 5\ntaille: moyenne';

describe('StoredFigurePreview — deplacable', () => {
	it('deplacable: non → le point ne glisse pas, le curseur reste actif', async () => {
		const { figure, svg } = await renderText(`${HEADER}\ndeplacable: non\n---\n${SCRIPT}`);
		expect(svg.getAttribute('width')).toBe('400');

		await drag(svg, [240, 160], [320, 80]);
		expect(positionOf(figure, 'A')).toEqual({ x: 1, y: 1 });

		const slider = document.querySelector('.sliders-panel input[type="range"]') as HTMLInputElement;
		expect(slider).not.toBeNull();
		slider.value = '3';
		slider.dispatchEvent(new Event('input', { bubbles: true }));
		await expect.poll(() => positionOf(figure, 'B').x).toBe(3);
	});

	it('témoin : deplacable: oui → le même geste déplace le point', async () => {
		const { figure, svg } = await renderText(`${HEADER}\ndeplacable: oui\n---\n${SCRIPT}`);
		await drag(svg, [240, 160], [320, 80]);
		expect(positionOf(figure, 'A')).not.toEqual({ x: 1, y: 1 });
	});
});

describe('StoredFigurePreview — zoom', () => {
	it('fenêtre de 100 unités (4 px par unité) : la molette dézoome encore', async () => {
		const result = evaluateStoredFigure(`fenetre: 0 ; 100 ; 0 ; 100\n---\n${SCRIPT}`);
		if (!result.ok) throw new Error(result.message);
		const windows: { xMin: number; xMax: number }[] = [];
		const screen = await render(StoredFigurePreview, {
			target: mainElement(800),
			props: { result, onWindowChange: (w) => windows.push(w) }
		});
		await expect.poll(() => screen.container.querySelector('svg.geometry-canvas')).not.toBeNull();
		const svg = screen.container.querySelector('svg.geometry-canvas') as SVGSVGElement;
		const rect = svg.getBoundingClientRect();
		const at = {
			clientX: rect.left + 200,
			clientY: rect.top + 200,
			bubbles: true,
			cancelable: true
		};
		svg.dispatchEvent(new WheelEvent('wheel', { ...at, deltaY: 100 }));
		await expect.poll(() => windows.at(-1)!.xMax - windows.at(-1)!.xMin).toBeGreaterThan(105);
	});
});

describe('StoredFigurePreview — repère et script nu', () => {
	it('axes: oui → axes et graduations dessinés en SVG, marge autour de la fenêtre', async () => {
		const { svg } = await renderText(`${HEADER}\naxes: oui\ngrille: 1\n---\n${SCRIPT}`);
		expect(svg.getAttribute('width')).toBe(String(400 + 2 * 26));
		const axis = svg.querySelector('.underlay line.figure-axe');
		expect(axis).not.toBeNull();
		expect(axis?.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(svg.querySelectorAll('.underlay line.figure-grille').length).toBe(22);
		// Grille historique de la toile éteinte
		expect(svg.querySelector('g.grid')).toBeNull();
	});

	it('conteneur étroit (téléphone) : la toile tient, la fenêtre reste entière', async () => {
		await renderText(`${HEADER}\naxes: oui\n---\n${SCRIPT}`, 300);
		// Toile relue à chaque essai : la mesure du conteneur la recrée
		const current = () => document.querySelector('main svg.geometry-canvas') as SVGSVGElement;
		await expect.poll(() => Number(current().getAttribute('width'))).toBeLessThanOrEqual(300);
		// Fenêtre -5..5 entière : la toile vaut 10 unités plus la marge des axes, sur l'échelle réduite
		const width = Number(current().getAttribute('width'));
		const axis = current().querySelectorAll('.underlay line.figure-axe');
		expect(axis.length).toBe(2);
		const labels = [...current().querySelectorAll('.underlay .figure-graduation-texte')].map(
			(t) => t.textContent
		);
		expect(labels).toContain('−5');
		expect(labels).toContain('5');
		expect(width).toBeGreaterThan(2 * 26);
	});

	it('script nu : toile historique 520 × 520, grille de la toile, point déplaçable', async () => {
		const { figure, svg } = await renderText(SCRIPT);
		expect(svg.getAttribute('width')).toBe('520');
		expect(svg.querySelector('g.grid')).not.toBeNull();
		expect(svg.querySelector('.underlay')).toBeNull();
		// 40 px par unité, origine au centre : A(1, 1) en (300, 220)
		await drag(svg, [300, 220], [380, 140]);
		expect(positionOf(figure, 'A')).not.toEqual({ x: 1, y: 1 });
	});
});
