/**
 * Bloc ```solide que l'on peut tourner (`tourner: oui`) à l'écran — chantier
 * `solides-3d`, lot 2 (phase 0 du journal, § 2)
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

const node = (...lines: string[]) => parseEspaceContent(lines.join('\n'), 'solide');
const PAVE = ['forme: pave 4 2 3', 'sommets: A B C D E F G H', 'vecteurs: AG'];

const svgOf = (container: Element) => container.querySelector('svg.solide-figure') as SVGSVGElement;
const traits = (container: Element) =>
	[...container.querySelectorAll('polyline')].map((l) => l.getAttribute('points')).join(' | ');
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

describe('Solide — tourner: oui', () => {
	it('sans la clé : ni clavier, ni bouton, ni consigne', async () => {
		const screen = await render(Espace, { target: mainElement(), props: { node: node(...PAVE) } });
		const svg = svgOf(screen.container);
		expect(svg.hasAttribute('tabindex')).toBe(false);
		expect(getComputedStyle(svg).touchAction).not.toBe('none');
		expect(screen.container.querySelectorAll('button')).toHaveLength(0);
		expect(screen.container.textContent).not.toContain('tourner');
	});

	it('au repos : le dessin fixe, dans un cadre plus grand ; la consigne, pas de bouton', async () => {
		const fixed = await render(Espace, { target: mainElement(), props: { node: node(...PAVE) } });
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node(...PAVE, 'tourner: oui') }
		});
		const svg = svgOf(screen.container);
		expect(svg.getAttribute('aria-label')).toBe(
			`${svgOf(fixed.container).getAttribute('aria-label')}, figure que l’on peut tourner`
		);
		expect(svg.getAttribute('tabindex')).toBe('0');
		// Le doigt posé sur la figure ne fait pas défiler la page
		expect(getComputedStyle(svg).touchAction).toBe('none');
		expect(screen.container.querySelectorAll('polyline')).toHaveLength(12);
		expect(screen.container.querySelectorAll('polyline[stroke-dasharray]')).toHaveLength(3);
		// Même échelle : l'arête [AB] (premier trait plein du bas) a la même longueur à l'écran
		const lengths = (c: Element) =>
			[...c.querySelectorAll('polyline')]
				.map((l) => l.getBoundingClientRect())
				.map((b) => Math.round(Math.hypot(b.width, b.height)))
				.sort((a, b) => a - b);
		expect(lengths(screen.container)).toEqual(lengths(fixed.container));
		expect(svg.getBoundingClientRect().width).toBeGreaterThan(
			svgOf(fixed.container).getBoundingClientRect().width
		);
		expect(screen.container.textContent).toContain('Figure à tourner');
		expect(resetButton(screen.container)).toBeUndefined();
	});

	it('glisser tourne la figure : tirets recalculés, bouton « Vue de départ », cadre inchangé', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node(...PAVE, 'tourner: oui') }
		});
		const svg = svgOf(screen.container);
		const before = traits(screen.container);
		const box = svg.getBoundingClientRect();
		const blockHeight = screen.container
			.querySelector('.solide-bloc')!
			.getBoundingClientRect().height;
		drag(svg, 120, 30);
		await expect.poll(() => resetButton(screen.container)).toBeDefined();
		expect(traits(screen.container)).not.toBe(before);
		expect(screen.container.querySelectorAll('polyline')).toHaveLength(12);
		expect(screen.container.querySelectorAll('text')).toHaveLength(8);
		expect(screen.container.querySelectorAll('polygon.solide-pointe')).toHaveLength(1);
		// La page ne bouge pas : même cadre, même hauteur de bloc (la place du bouton est réservée)
		expect(svg.getBoundingClientRect().width).toBe(box.width);
		expect(svg.getBoundingClientRect().height).toBe(box.height);
		expect(
			screen.container.querySelector('.solide-bloc')!.getBoundingClientRect().height
		).toBeCloseTo(blockHeight, 0);

		resetButton(screen.container)!.click();
		await expect.poll(() => resetButton(screen.container)).toBeUndefined();
		expect(traits(screen.container)).toBe(before);
		// Le clavier reste sur la figure
		expect(document.activeElement).toBe(svg);
	});

	it('dans un choix : tourner la figure ne coche pas le choix, la toucher si', async () => {
		const main = mainElement();
		let clicks = 0;
		main.addEventListener('click', () => clicks++);
		const screen = await render(Espace, {
			target: main,
			props: { node: node(...PAVE, 'tourner: oui') }
		});
		const svg = svgOf(screen.container);
		drag(svg, 120, 30);
		svg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(clicks).toBe(0);
		// Un vrai clic, sans glissement, passe
		drag(svg, 1, 0);
		svg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(clicks).toBe(1);
	});

	it('Alt + flèche (retour du navigateur) n’est pas pris par la figure', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node(...PAVE, 'tourner: oui') }
		});
		const svg = svgOf(screen.container);
		const event = new KeyboardEvent('keydown', {
			key: 'ArrowLeft',
			altKey: true,
			bubbles: true,
			cancelable: true
		});
		svg.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(false);
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(resetButton(screen.container)).toBeUndefined();
	});

	it('un simple toucher ne tourne pas la figure', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node(...PAVE, 'tourner: oui') }
		});
		const before = traits(screen.container);
		drag(svgOf(screen.container), 2, 1);
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(traits(screen.container)).toBe(before);
		expect(resetButton(screen.container)).toBeUndefined();
	});

	it('clavier : les flèches tournent, Échap ramène à la vue de départ', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node(...PAVE, 'tourner: oui') }
		});
		const svg = svgOf(screen.container);
		const before = traits(screen.container);
		svg.focus();
		await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowDown}');
		await expect.poll(() => resetButton(screen.container)).toBeDefined();
		expect(traits(screen.container)).not.toBe(before);
		await userEvent.keyboard('{Escape}');
		await expect.poll(() => resetButton(screen.container)).toBeUndefined();
		expect(traits(screen.container)).toBe(before);
	});

	it('demi-tour au clavier : toujours trois arêtes cachées', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node(...PAVE, 'tourner: oui') }
		});
		svgOf(screen.container).focus();
		// Douze pas de 15° : un demi-tour
		await userEvent.keyboard('{ArrowRight>12/}');
		await expect.poll(() => resetButton(screen.container)).toBeDefined();
		// Fin du passage à la vue droite
		await new Promise((resolve) => setTimeout(resolve, 400));
		expect(screen.container.querySelectorAll('polyline[stroke-dasharray]')).toHaveLength(3);
	});

	it('un autre bloc (nouvelle question) repart de la vue de départ', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node(...PAVE, 'tourner: oui') }
		});
		drag(svgOf(screen.container), 100, 0);
		await expect.poll(() => resetButton(screen.container)).toBeDefined();
		const other = node('forme: pave 5 2 3', 'sommets: A B C D E F G H', 'tourner: oui');
		await screen.rerender({ node: other });
		expect(resetButton(screen.container)).toBeUndefined();
		const fresh = await render(Espace, { target: mainElement(), props: { node: other } });
		expect(traits(screen.container)).toBe(traits(fresh.container));
	});

	it('tourner: mal écrit : figure fixe pour l’élève, message pour le prof', async () => {
		const wrong = node(...PAVE, 'tourner: 90');
		const pupil = await render(Espace, { target: mainElement(), props: { node: wrong } });
		expect(pupil.container.querySelectorAll('polyline')).toHaveLength(12);
		expect(svgOf(pupil.container).hasAttribute('tabindex')).toBe(false);
		expect(pupil.container.textContent).not.toContain('tourner');
		const teacher = await render(Espace, {
			target: mainElement(),
			props: { node: wrong, showErrors: true }
		});
		expect(teacher.container.textContent).toContain('la figure ne tournera pas');
		expect(teacher.container.textContent).toContain('tourner « 90 » : oui ou non');
		expect(teacher.container.querySelectorAll('polyline')).toHaveLength(12);
	});

	it('forme pas encore prise en charge (cylindre) : figure fixe, message pour le prof', async () => {
		const round = node('forme: cylindre 2 5', 'tourner: oui');
		const pupil = await render(Espace, { target: mainElement(), props: { node: round } });
		expect(svgOf(pupil.container).hasAttribute('tabindex')).toBe(false);
		expect(pupil.container.querySelectorAll('button')).toHaveLength(0);
		const teacher = await render(Espace, {
			target: mainElement(),
			props: { node: round, showErrors: true }
		});
		expect(teacher.container.textContent).toContain('un cylindre ne tourne pas encore');
	});
});
