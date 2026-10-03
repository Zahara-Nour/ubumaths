/**
 * Bloc ```figure à l'écran : forme des points (2026-10-03, branche fix/figures-pdf)
 *
 * `forme="croix"` dessinait un rond plein à l'écran, une croix au PDF. L'écran
 * suit désormais le PDF : rond plein, cercle vide, croix, carré.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FigureBlock from '../FigureBlock.svelte';
import { parseFigureContent } from '$lib/ubumark/parser/figure-parser';

const SOURCE = `fenetre: 0 ; 5 ; 0 ; 3
---
A = point(1, 1)
B = point(2, 1)
C = point(3, 1)
D = point(4, 1)
montre(B, forme="croix")
montre(C, forme="cercle")
montre(D, forme="carre")`;

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
	// 5 s : le premier rendu charge geometry-core à la demande
	await expect
		.poll(() => container.querySelector('svg[role="img"]'), { timeout: 5000 })
		.not.toBeNull();
	return container.querySelector('svg[role="img"]') as SVGSVGElement;
}

/** Forme dessinée pour le point nommé `name` (id = data-element de son nom) */
function markOf(svg: SVGSVGElement, name: string): Element {
	const label = [...svg.querySelectorAll('text')].find((t) => t.textContent === name)!;
	const id = label.getAttribute('data-element');
	const marks = [...svg.querySelectorAll(`[data-element="${id}"]`)].filter((e) => e !== label);
	expect(marks).toHaveLength(1);
	return marks[0];
}

describe('FigureBlock — forme des points', () => {
	it('point : rond plein ; croix : deux traits ; cercle : vide ; carré : plein', async () => {
		const node = parseFigureContent(SOURCE);
		const screen = await render(FigureBlock, { target: mainElement(), props: { node } });
		const svg = await svgOf(screen.container);

		const a = markOf(svg, 'A');
		expect(a.tagName).toBe('circle');
		expect(getComputedStyle(a).fill).not.toBe('none');

		const b = markOf(svg, 'B');
		expect(b.tagName).toBe('path');
		expect(b.getAttribute('d')!.match(/M/g)).toHaveLength(2);
		expect(getComputedStyle(b).fill).toBe('none');
		expect(getComputedStyle(b).strokeWidth).toBe('1.5px');

		const c = markOf(svg, 'C');
		expect(c.tagName).toBe('circle');
		expect(getComputedStyle(c).fill).toBe('none');
		expect(getComputedStyle(c).stroke).not.toBe('none');

		const d = markOf(svg, 'D');
		expect(d.tagName).toBe('rect');
		expect(getComputedStyle(d).fill).not.toBe('none');
	});

	it('texte `n⃗` : lettre en italique et flèche posée au-dessus, sans caractère combinant', async () => {
		const node = parseFigureContent(`fenetre: 0 ; 4 ; 0 ; 3\n---\ntexte(2, 1, "vecteur n⃗")`);
		const screen = await render(FigureBlock, { target: mainElement(), props: { node } });
		const svg = await svgOf(screen.container);
		const text = svg.querySelector('text.figure-etiquette')!;
		expect(text.textContent).not.toContain('\u20d7');
		const base = text.querySelector('.figure-accent-base')!;
		expect(base.textContent).toBe('n');
		expect(getComputedStyle(base).fontStyle).toBe('italic');
		const arrow = text.querySelector('.figure-accent')!;
		expect(arrow.textContent).toBe('→');
		// Flèche AU-DESSUS de la lettre, à peu près centrée sur elle
		const b = (base as SVGTextContentElement).getBoundingClientRect();
		const a = (arrow as SVGTextContentElement).getBoundingClientRect();
		expect(a.bottom).toBeLessThan(b.top + b.height * 0.6);
		expect(Math.abs((a.left + a.right) / 2 - (b.left + b.right) / 2)).toBeLessThan(b.width);
	});
});
