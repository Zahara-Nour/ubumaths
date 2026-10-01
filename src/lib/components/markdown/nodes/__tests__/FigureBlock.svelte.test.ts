/**
 * Bloc ```figure à l'écran (2026-10-01)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des
 * règles), Tailwind chargé par le projet de tests navigateur. L'afficheur est
 * chargé à la demande : chaque test attend son apparition.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FigureBlock from '../FigureBlock.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import { parseFigureContent } from '$lib/ubumark/parser/figure-parser';
import { buildFigureScene } from '$lib/ubumark/utils/figure-scene';

const SOURCE = `fenetre: -1 ; 8 ; -1 ; 6
taille: petite
---
A = point(0, 0)
B = point(5, 0)
C = point(0, 4)
p = polygone(A, B, C)
angle(B, A, C, marque="carre")
m = marque_segment(A, B, traits=2)
v = vecteur(B, C)
c = cercle(A, rayon=1)
texte(2, 3, "hypoténuse")`;

const ERREUR_DSL = `fenetre: -1 ; 8 ; -1 ; 6
---
A = point(0, 0)
c = cercle(A, 2)`;

let mains: HTMLElement[] = [];
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

async function svgOf(container: HTMLElement): Promise<SVGSVGElement> {
	await expect.poll(() => container.querySelector('svg[role="img"]')).not.toBeNull();
	return container.querySelector('svg[role="img"]') as SVGSVGElement;
}

describe('FigureBlock — figure', () => {
	it('SVG role="img" avec un libellé automatique', async () => {
		const node = parseFigureContent(SOURCE);
		const screen = await render(FigureBlock, { target: mainElement(), props: { node } });
		const svg = await svgOf(screen.container);
		expect(svg.getAttribute('aria-label')).toMatch(/^Figure géométrique : points A, B, C/);
	});

	it('la description de l’auteur est prioritaire', async () => {
		const node = parseFigureContent(SOURCE.replace('---', 'description: Triangle ABC.\n---'));
		const screen = await render(FigureBlock, { target: mainElement(), props: { node } });
		const svg = await svgOf(screen.container);
		expect(svg.getAttribute('aria-label')).toBe('Triangle ABC.');
	});

	it('chaque objet visible de la scène est dessiné', async () => {
		const node = parseFigureContent(SOURCE);
		const scene = buildFigureScene(node).scene!;
		const screen = await render(FigureBlock, { target: mainElement(), props: { node } });
		const svg = await svgOf(screen.container);
		const drawn = new Set(
			[...svg.querySelectorAll('[data-element]')].map((e) => e.getAttribute('data-element'))
		);
		expect(drawn).toEqual(new Set(scene.elements.map((e) => e.id)));
		// Noms des points, codage à deux traits, texte
		const texts = [...svg.querySelectorAll('text')].map((t) => t.textContent);
		expect(texts).toEqual(expect.arrayContaining(['A', 'B', 'C', 'hypoténuse']));
	});

	it('repère isotrope : le rapport du dessin suit la fenêtre', async () => {
		const node = parseFigureContent(SOURCE);
		const screen = await render(FigureBlock, { target: mainElement(), props: { node } });
		const svg = await svgOf(screen.container);
		const [, , w, h] = svg.getAttribute('viewBox')!.split(' ').map(Number);
		expect(w).toBe(280);
		expect(h / w).toBeCloseTo(7 / 9, 2);
	});

	it('trait visible : couleur du texte (token), pas `none`', async () => {
		const node = parseFigureContent(SOURCE);
		const screen = await render(FigureBlock, { target: mainElement(), props: { node } });
		const svg = await svgOf(screen.container);
		const scene = buildFigureScene(node).scene!;
		const triangle = scene.elements.find((e) => e.type === 'polygon')!;
		const polygon = svg.querySelector(`polygon[data-element="${triangle.id}"]`)!;
		const stroke = getComputedStyle(polygon).stroke;
		expect(stroke).toMatch(/^rgb/);
		expect(getComputedStyle(polygon).fill).toBe('none');
		// Point : disque plein de la couleur du texte
		const dot = svg.querySelector('circle[r="3"]')!;
		expect(getComputedStyle(dot).fill).toBe(
			getComputedStyle(document.querySelector('main')!).color
		);
	});
});

describe('FigureBlock — erreurs (Q48, comportement 14)', () => {
	it('prof : message situé (ligne du bloc) et piste de correction', async () => {
		const node = parseFigureContent(ERREUR_DSL);
		const screen = await render(FigureBlock, {
			target: mainElement(),
			props: { node, showErrors: true }
		});
		await expect.poll(() => screen.container.textContent).toMatch(/Ligne 4 : `cercle\(\)`/);
		expect(screen.container.textContent).toMatch(/passant=B/);
		expect(screen.container.querySelector('svg')).toBeNull();
	});

	it('élève : cadre neutre, aucun message technique', async () => {
		const node = parseFigureContent(ERREUR_DSL);
		const screen = await render(FigureBlock, { target: mainElement(), props: { node } });
		await expect.poll(() => screen.container.textContent).toMatch(/Figure indisponible/);
		expect(screen.container.textContent).not.toMatch(/Ligne|cercle/);
	});

	it('type refusé (courbe) : situé pour le prof', async () => {
		const node = parseFigureContent('fenetre: 0 ; 4 ; 0 ; 3\n---\ncourbe("y = x")');
		const screen = await render(FigureBlock, {
			target: mainElement(),
			props: { node, showErrors: true }
		});
		await expect.poll(() => screen.container.textContent).toMatch(/Ligne 3 : courbe\(\)/);
	});

	it('erreur d’en-tête : affichée sans attendre le chargement', async () => {
		const node = parseFigureContent('fenetre: 4 ; 0 ; 0 ; 3\n---\n');
		const screen = await render(FigureBlock, {
			target: mainElement(),
			props: { node, showErrors: true }
		});
		expect(screen.container.textContent).toMatch(/Ligne 1 : fenêtre/);
	});
});

describe('FigureBlock — dans MarkdownRenderer', () => {
	const MD = ['Avant.', '', '```figure', ...ERREUR_DSL.split('\n'), '```'].join('\n');

	it('contexte prof posé par `showAuthoringErrors`', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: { content: MD, showAuthoringErrors: true }
		});
		await expect.poll(() => screen.container.textContent).toMatch(/Ligne 4 :/);
	});

	it('par défaut (élève) : cadre neutre', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: { content: MD }
		});
		await expect.poll(() => screen.container.textContent).toMatch(/Figure indisponible/);
	});

	it('bloc en retrait dans un item de liste : dessiné', async () => {
		const md = [
			'1. Observer :',
			'',
			...['```figure', ...SOURCE.split('\n'), '```'].map((l) => `   ${l}`),
			'2. Suite.'
		].join('\n');
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: { content: md }
		});
		await svgOf(screen.container);
	});
});
