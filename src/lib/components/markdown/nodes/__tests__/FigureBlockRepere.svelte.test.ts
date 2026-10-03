/**
 * Bloc ```figure à l'écran : axes et grille (2026-10-03)
 *
 * Rendu dans <main> (décor réel). Grille et axes SOUS les objets, objets
 * découpés à la fenêtre ; sans option, aucun repère.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FigureBlock from '../FigureBlock.svelte';
import { parseFigureContent } from '$lib/ubumark/parser/figure-parser';
import { buildFigureScene } from '$lib/ubumark/utils/figure-scene';

const SCRIPT = `A = point(1, 1)
B = point(4, 3)
d = droite(A, B)
c = cercle(B, rayon=1.5)`;

const REPERE = `fenetre: -2 ; 6 ; -1 ; 5
axes: oui
grille: oui
---
${SCRIPT}`;

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
	// 5 s : le premier rendu charge geometry-core à la demande (cf. FigureBlock.svelte.test.ts)
	await expect
		.poll(() => container.querySelector('svg[role="img"]'), { timeout: 5000 })
		.not.toBeNull();
	return container.querySelector('svg[role="img"]') as SVGSVGElement;
}

describe('FigureBlock — repère', () => {
	it('grille (9 + 7 lignes), 2 axes fléchés, graduations, « O »', async () => {
		const node = parseFigureContent(REPERE);
		const screen = await render(FigureBlock, { target: mainElement(), props: { node } });
		const svg = await svgOf(screen.container);
		const frame = svg.querySelector('.figure-repere')!;
		expect(frame).not.toBeNull();
		expect(frame.querySelectorAll('.figure-grille')).toHaveLength(16);
		expect(frame.querySelectorAll('.figure-axe')).toHaveLength(2);
		expect(frame.querySelectorAll('.figure-fleche')).toHaveLength(2);
		const labels = [...frame.querySelectorAll('.figure-graduation-texte')].map(
			(t) => t.textContent
		);
		expect(labels).toEqual(expect.arrayContaining(['−2', '1', '6', '5', 'O']));
		expect(labels).not.toContain('0');
	});

	it('objets au-dessus du repère, tous dessinés, dans la fenêtre découpée', async () => {
		const node = parseFigureContent(REPERE);
		const scene = buildFigureScene(node).scene!;
		const screen = await render(FigureBlock, { target: mainElement(), props: { node } });
		const svg = await svgOf(screen.container);
		const inner = svg.querySelector(':scope > svg')!;
		expect(inner).not.toBeNull();
		// Le repère précède les objets dans l'ordre du dessin
		const frame = svg.querySelector('.figure-repere')!;
		expect(frame.compareDocumentPosition(inner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		const drawn = new Set(
			[...inner.querySelectorAll('[data-element]')].map((e) => e.getAttribute('data-element'))
		);
		expect(drawn).toEqual(new Set(scene.elements.map((e) => e.id)));
		expect(svg.getAttribute('aria-label')).toMatch(/dans un repère/);
	});

	it('graduations lisibles : petite police, couleur calculée non vide', async () => {
		const node = parseFigureContent(REPERE);
		const screen = await render(FigureBlock, { target: mainElement(), props: { node } });
		const svg = await svgOf(screen.container);
		const label = svg.querySelector('.figure-graduation-texte')!;
		const style = getComputedStyle(label);
		expect(style.fontSize).toBe('10px');
		expect(style.fill).not.toBe('');
		expect(getComputedStyle(svg.querySelector('.figure-grille')!).stroke).not.toBe('none');
	});

	it('sans option : aucun repère, un seul SVG', async () => {
		const node = parseFigureContent(`fenetre: -2 ; 6 ; -1 ; 5\n---\n${SCRIPT}`);
		const screen = await render(FigureBlock, { target: mainElement(), props: { node } });
		const svg = await svgOf(screen.container);
		expect(svg.querySelector('.figure-repere')).toBeNull();
		expect(svg.querySelector('svg')).toBeNull();
		expect(svg.getAttribute('viewBox')).toBe('0 0 400 300');
	});
});
