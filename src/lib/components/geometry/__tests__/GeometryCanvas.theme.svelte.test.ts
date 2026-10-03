/**
 * Figures interactives en thème clair / sombre (lot 2, 2026-10-03)
 *
 * Spécification : docs/wip/figures-interactives-theme-progress.md. On lit la
 * couleur RENDUE (`getComputedStyle`) en basculant `color-scheme` sur <html>,
 * dont dépendent les tokens `light-dark()` d'app.css. Rendu dans <main> :
 * décor réel de l'application.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import GeometryCanvas from '../GeometryCanvas.svelte';
import InstrumentHarness from './InstrumentHarness.svelte';
import { runDsl } from '$lib/geometry-core';

// Valeurs attendues (app.css)
const ROUGE = { light: 'rgb(220, 38, 38)', dark: 'rgb(255, 98, 87)' };
const BLEU = { light: 'rgb(37, 99, 235)', dark: 'rgb(93, 147, 254)' };
const CARTE = { light: 'rgb(255, 255, 255)', dark: 'rgb(47, 47, 47)' };
const TEXTE = { light: 'rgb(26, 26, 26)', dark: 'rgb(239, 239, 239)' };
const SURVOL = { light: 'rgb(217, 119, 6)', dark: 'rgb(245, 158, 11)' };

let mains: HTMLElement[] = [];
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
	document.documentElement.style.colorScheme = '';
});

async function renderFigure(
	script: string,
	renderMode: 'normal' | 'rough' | 'mixed' = 'normal'
): Promise<SVGSVGElement> {
	const { figure } = runDsl(script);
	const screen = await render(GeometryCanvas, {
		target: mainElement(),
		props: { figure, width: 400, height: 300, center: { x: 0, y: 0 }, renderMode }
	});
	await expect.poll(() => screen.container.querySelector('svg.geometry-canvas')).not.toBeNull();
	return screen.container.querySelector('svg.geometry-canvas') as SVGSVGElement;
}

/** Lit une propriété calculée dans les deux modes */
function inBothModes(read: () => string): { light: string; dark: string } {
	const root = document.documentElement;
	try {
		root.style.colorScheme = 'light';
		const light = read();
		root.style.colorScheme = 'dark';
		const dark = read();
		return { light, dark };
	} finally {
		root.style.colorScheme = '';
	}
}

function one(svg: SVGSVGElement, selector: string): SVGElement {
	const found = svg.querySelector(selector);
	if (!found) throw new Error(`aucun élément ${selector}`);
	return found as SVGElement;
}

describe('GeometryCanvas — couleurs d’auteur', () => {
	it('couleur="rouge" suit le mode', async () => {
		const svg = await renderFigure(
			'A = point(0, 0)\nB = point(3, 0)\ns = segment(A, B, couleur="rouge")'
		);
		expect(inBothModes(() => getComputedStyle(one(svg, 'line.segment')).stroke)).toEqual(ROUGE);
	});

	it('un hexadécimal d’auteur reste fixe', async () => {
		const svg = await renderFigure(
			'A = point(0, 0)\nB = point(3, 0)\ns = segment(A, B, couleur="#1e40af")'
		);
		const fixed = 'rgb(30, 64, 175)';
		expect(inBothModes(() => getComputedStyle(one(svg, 'line.segment')).stroke)).toEqual({
			light: fixed,
			dark: fixed
		});
	});

	it('un objet sans couleur prend le bleu de la palette (L2-a)', async () => {
		const svg = await renderFigure('A = point(0, 0)\nB = point(3, 0)\ns = segment(A, B)');
		expect(inBothModes(() => getComputedStyle(one(svg, 'line.segment')).stroke)).toEqual(BLEU);
		expect(inBothModes(() => getComputedStyle(one(svg, 'circle.point')).fill)).toEqual(BLEU);
	});

	it('mode main levée (rough.js) : suit aussi le thème', async () => {
		const svg = await renderFigure(
			'A = point(0, 0)\nB = point(3, 0)\ns = segment(A, B, couleur="rouge")',
			'rough'
		);
		const strokes = () => getComputedStyle(one(svg, 'g.rough path')).stroke;
		expect(inBothModes(strokes)).toEqual(ROUGE);
		// Aucune couleur restée en attribut dans le HTML injecté
		expect(svg.querySelector('g.rough [stroke]:not([stroke="none"])')).toBeNull();
	});
});

describe('GeometryCanvas — habillage', () => {
	it('le fond de la figure suit celui des cartes', async () => {
		const svg = await renderFigure('A = point(0, 0)');
		expect(inBothModes(() => getComputedStyle(svg).backgroundColor)).toEqual(CARTE);
	});

	it('le halo d’une étiquette prend la couleur du fond', async () => {
		const svg = await renderFigure('A = point(0, 0)');
		expect(inBothModes(() => getComputedStyle(one(svg, 'text.label')).stroke)).toEqual(CARTE);
	});

	it('les graduations suivent le texte atténué (lisibles en sombre)', async () => {
		const svg = await renderFigure('A = point(0, 0)');
		const grad = inBothModes(() => getComputedStyle(one(svg, 'text.graduation')).fill);
		expect(grad.light).toBe('rgb(115, 115, 115)');
		expect(grad.dark).toBe('rgb(158, 158, 158)');
	});
});

describe('GeometryCanvas — états (survol)', () => {
	it('un point survolé garde son surlignage malgré la couleur d’auteur', async () => {
		const svg = await renderFigure('A = point(0, 0, couleur="rouge")');
		const point = one(svg, 'circle.point');
		await userEvent.hover(point);
		await expect.poll(() => one(svg, 'circle.point').classList.contains('hovered')).toBe(true);
		const hovered = one(svg, 'circle.point');
		expect(inBothModes(() => getComputedStyle(hovered).stroke)).toEqual(SURVOL);
		expect(inBothModes(() => getComputedStyle(hovered).fill)).toEqual(ROUGE);
	});

	it('un point en forme de cercle (couleur en contour) garde aussi son surlignage', async () => {
		const svg = await renderFigure('A = point(0, 0, couleur="rouge", forme="cercle")');
		const point = one(svg, 'circle.point');
		expect(inBothModes(() => getComputedStyle(point).stroke)).toEqual(ROUGE);
		// Contour seul (fill: none) : Playwright ne le juge jamais « stable » ; on
		// survole quand même le centre du point (mouvement de souris réel).
		await userEvent.hover(point, { force: true });
		await expect.poll(() => one(svg, 'circle.point').classList.contains('hovered')).toBe(true);
		expect(inBothModes(() => getComputedStyle(one(svg, 'circle.point')).stroke)).toEqual(SURVOL);
	});
});

describe('Instruments (constructions-v2) — traits noirs', () => {
	it('le compas : ses traits noirs suivent le texte de la page', async () => {
		const screen = await render(InstrumentHarness, {
			target: mainElement(),
			props: { instrument: 'compass' }
		});
		const line = screen.container.querySelector('.compass-instrument line') as SVGElement;
		expect(line).not.toBeNull();
		expect(inBothModes(() => getComputedStyle(line).stroke)).toEqual(TEXTE);
	});

	it('la règle : graduations comprises, corps réaliste inchangé', async () => {
		const screen = await render(InstrumentHarness, {
			target: mainElement(),
			props: { instrument: 'ruler' }
		});
		const tick = screen.container.querySelector(
			'.ruler-instrument .graduations line'
		) as SVGElement;
		expect(tick).not.toBeNull();
		expect(inBothModes(() => getComputedStyle(tick).stroke)).toEqual(TEXTE);
	});
});
