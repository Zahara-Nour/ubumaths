/**
 * Bloc ```cubes que l'on peut tourner (`tourner: oui`) à l'écran — chantier
 * `solides-3d`, lot 6 (phase 0 du journal, § 15)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import Espace from '../Espace.svelte';
import { parseEspaceContent } from '#lib/ubumark/parser/espace-parser.ts';

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

const node = (...lines: string[]) => parseEspaceContent(lines.join('\n'));
const SIX = 'hauteurs: 2 1 1 / 1 0 1';

const svgOf = (container: Element) => container.querySelector('svg.cubes-figure') as SVGSVGElement;
const faces = (container: Element) =>
	[...container.querySelectorAll('polygon')]
		.map(
			(p) =>
				`${p.getAttribute('class')?.match(/cubes-(devant|dessus|cote)/)?.[1]}:${p.getAttribute('points')}`
		)
		.join(' | ');
const count = (container: Element, kind: string) =>
	container.querySelectorAll(`polygon.cubes-${kind}`).length;
const resetButton = (container: Element) =>
	[...container.querySelectorAll('button')].find((b) => b.textContent?.includes('Vue de départ'));

function drag(svg: SVGSVGElement, dx: number, dy: number) {
	const box = svg.getBoundingClientRect();
	const x = box.left + box.width / 2;
	const y = box.top + box.height / 2;
	const event = (type: string, clientX: number, clientY: number) =>
		svg.dispatchEvent(
			new PointerEvent(type, {
				pointerId: 7,
				isPrimary: true,
				button: 0,
				clientX,
				clientY,
				bubbles: true
			})
		);
	event('pointerdown', x, y);
	event('pointermove', x + dx / 2, y + dy / 2);
	event('pointermove', x + dx, y + dy);
	event('pointerup', x + dx, y + dy);
}

/** Attend la fin du passage de la cavalière à la vue droite (250 ms) */
const settled = () => new Promise((resolve) => setTimeout(resolve, 450));

describe('Cubes — tourner: oui', () => {
	it('sans la clé : ni clavier, ni bouton, ni consigne (53)', async () => {
		const screen = await render(Espace, { target: mainElement(), props: { node: node(SIX) } });
		const svg = svgOf(screen.container);
		expect(svg.hasAttribute('tabindex')).toBe(false);
		expect(getComputedStyle(svg).touchAction).not.toBe('none');
		expect(screen.container.querySelectorAll('button')).toHaveLength(0);
		expect(screen.container.textContent).not.toContain('tourner');
	});

	it('au repos : les mêmes faces que le dessin fixe, dans un cadre carré ; la consigne, pas de bouton (54)', async () => {
		const fixed = await render(Espace, { target: mainElement(), props: { node: node(SIX) } });
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node(SIX, 'tourner: oui') }
		});
		const svg = svgOf(screen.container);
		for (const kind of ['devant', 'dessus', 'cote']) {
			expect(count(screen.container, kind)).toBe(count(fixed.container, kind));
		}
		const [, , width, height] = (svg.getAttribute('viewBox') ?? '').split(' ').map(Number);
		expect(width).toBeCloseTo(height, 9);
		expect(svg.getAttribute('tabindex')).toBe('0');
		expect(getComputedStyle(svg).touchAction).toBe('none');
		expect(svg.getAttribute('aria-label')).toBe(
			'Assemblage de cubes en perspective, figure que l’on peut tourner'
		);
		expect(screen.container.textContent).toContain('Figure à tourner');
		expect(resetButton(screen.container)).toBeUndefined();
	});

	it('glisser : l’assemblage tourne, le cadre ne change pas, « Vue de départ » le ramène (55, 61)', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node(SIX, 'tourner: oui') }
		});
		const svg = svgOf(screen.container);
		const atRest = faces(screen.container);
		const box = svg.getAttribute('viewBox');
		const size = svg.getBoundingClientRect();

		drag(svg, 120, 0);
		await settled();
		expect(faces(screen.container)).not.toBe(atRest);
		expect(svg.getAttribute('viewBox')).toBe(box);
		expect(svg.getBoundingClientRect().width).toBe(size.width);
		expect(svg.getBoundingClientRect().height).toBe(size.height);
		// Pas de tirets : des faces pleines seulement (56)
		expect(screen.container.querySelectorAll('[stroke-dasharray]')).toHaveLength(0);

		const button = resetButton(screen.container);
		expect(button).toBeDefined();
		button!.click();
		await expect.poll(() => faces(screen.container), { timeout: 2000 }).toBe(atRest);
		expect(resetButton(screen.container)).toBeUndefined();
	});

	it('un demi-tour : on voit l’arrière, plus le trou de devant (56)', async () => {
		// 2 1 1 / 1 0 1 : de devant, 4 faces « devant » (les 2 cubes de devant, le haut de la
		// pile de 2 et le cube du milieu, vu par le trou) ; de derrière, les 4 cubes du fond
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node(SIX, 'tourner: oui') }
		});
		const svg = svgOf(screen.container);
		expect(count(screen.container, 'devant')).toBe(4);
		// Un demi-tour : π / 0,012 rad par px ≈ 262 px
		drag(svg, 262, 0);
		await settled();
		expect(count(screen.container, 'devant')).toBe(4);
		expect(count(screen.container, 'dessus')).toBe(5);
		// La gauche est passée à droite : 3 faces au bord, plus celle qui donne sur le trou
		expect(count(screen.container, 'cote')).toBe(4);
	});

	it('clavier : les flèches tournent, Échap ramène (55)', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node(SIX, 'tourner: oui') }
		});
		const svg = svgOf(screen.container);
		const atRest = faces(screen.container);
		svg.focus();
		await userEvent.keyboard('{ArrowLeft}');
		await settled();
		expect(faces(screen.container)).not.toBe(atRest);
		await userEvent.keyboard('{Escape}');
		await expect.poll(() => faces(screen.container), { timeout: 2000 }).toBe(atRest);
	});

	it('par-dessous : la figure s’arrête à la vue de dessous, elle ne se renverse pas (60)', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node(SIX, 'tourner: oui') }
		});
		const svg = svgOf(screen.container);
		// Vers le haut : on passe dessous ; bien au-delà de la butée (le premier glissement
		// s'arrête à la butée du passage vers la vue droite, le deuxième à celle de la vue droite)
		drag(svg, 0, -400);
		await settled();
		drag(svg, 0, -400);
		await settled();
		const stopped = faces(screen.container);
		drag(svg, 0, -400);
		await settled();
		expect(faces(screen.container)).toBe(stopped);
		// Les cinq dessous, de la teinte du dessus
		expect(count(screen.container, 'dessus')).toBe(5);
	});

	it('une autre question repart de la vue de départ (59)', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node(SIX, 'tourner: oui') }
		});
		drag(svgOf(screen.container), 90, 30);
		await settled();
		expect(resetButton(screen.container)).toBeDefined();
		await screen.rerender({ node: node('hauteurs: 3 1 / 1 1', 'tourner: oui') });
		expect(resetButton(screen.container)).toBeUndefined();
		expect(screen.container.textContent).toContain('Figure à tourner');
	});

	it('tourner dans un choix ne le coche pas : le clic qui suit le glissement s’arrête à la figure (61)', async () => {
		const target = mainElement();
		let clicks = 0;
		target.addEventListener('click', () => clicks++);
		const screen = await render(Espace, { target, props: { node: node(SIX, 'tourner: oui') } });
		const svg = svgOf(screen.container);
		drag(svg, 80, 0);
		svg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(clicks).toBe(0);
		svg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(clicks).toBe(1);
	});
});

describe('Cubes — tourner: qu’on ne peut pas suivre', () => {
	it.each([
		['valeur mal écrite', [SIX, 'tourner: un peu'], 'oui ou non'],
		['vue à plat', [SIX, 'vue: face', 'tourner: oui'], 'vue: face'],
		['dessiner:', [SIX, 'dessiner: face', 'tourner: oui'], 'dessiner:'],
		['retrouver:', ['hauteurs: 2 1 / 1 2', 'retrouver: face', 'tourner: oui'], 'retrouver:']
	])('%s : phrase pour le prof, figure fixe (65 à 68)', async (_, lines, phrase) => {
		const author = await render(Espace, {
			target: mainElement(),
			props: { node: node(...lines), showErrors: true }
		});
		expect(author.container.textContent).toContain('Bloc cubes : la figure ne tournera pas');
		expect(author.container.textContent).toContain(phrase);
		expect(author.container.querySelector('svg.cubes-figure')).not.toBeNull();
		expect(author.container.querySelector('.cubes-tournante')).toBeNull();
		expect(author.container.textContent).not.toContain('Figure à tourner');
	});

	it('l’élève ne lit pas la phrase', async () => {
		const student = await render(Espace, {
			target: mainElement(),
			props: { node: node(SIX, 'vue: face', 'tourner: oui') }
		});
		expect(student.container.textContent).not.toContain('tourner');
		expect(student.container.querySelector('svg.cubes-figure')).not.toBeNull();
	});
});
