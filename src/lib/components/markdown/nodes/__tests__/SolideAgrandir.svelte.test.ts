/**
 * Bloc ```solide : bouton « Agrandir » — chantier `solide-agrandir` (phase 0 du
 * journal, comportements 1 à 10)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 * La grande figure s'ouvre dans une fenêtre posée sur `document.body`.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import Espace from '../Espace.svelte';
import { parseEspaceContent } from '#lib/ubumark/parser/espace-parser.ts';
import { FIGURE_IN_CHOICE_KEY } from '../../figure-in-choice.ts';

let hosts: HTMLElement[] = [];
function host(tag = 'main'): HTMLElement {
	const element = document.body.appendChild(document.createElement(tag));
	hosts.push(element);
	return element;
}
afterEach(() => {
	for (const h of hosts) h.remove();
	hosts = [];
});

const node = (...lines: string[]) => parseEspaceContent(lines.join('\n'), 'solide');
const PAVE = ['forme: pave 4 2 3', 'sommets: A B C D E F G H', 'vecteurs: AG'];
const CUBE = ['forme: cube 3', 'sommets: A B C D E F G H', 'droites: (AG)', 'plans: (BDE)'];

const svgOf = (container: Element) => container.querySelector('svg.solide-figure') as SVGSVGElement;
const traits = (container: Element) =>
	[...container.querySelectorAll('polyline')].map((l) => l.getAttribute('points')).join(' | ');
const buttonOf = (container: Element, text: string) =>
	[...container.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
const enlargeButton = (container: Element) => buttonOf(container, 'Agrandir');
const dialog = () => document.body.querySelector<HTMLElement>('[role="dialog"]');

async function settled() {
	await new Promise((resolve) => setTimeout(resolve, 50));
}

/** Le dessin une fois immobile (le passage de la cavalière à la vue droite est animé) */
async function still(svg: SVGSVGElement): Promise<string> {
	let last = traits(svg);
	for (let i = 0; i < 40; i++) {
		await new Promise((resolve) => setTimeout(resolve, 100));
		const now = traits(svg);
		if (now === last) return now;
		last = now;
	}
	throw new Error('la figure ne s’arrête pas');
}

/** La fenêtre, une fois ouverte */
async function opened(): Promise<HTMLElement> {
	await expect.poll(() => dialog()).not.toBeNull();
	return dialog() as HTMLElement;
}

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

describe('Solide — bouton « Agrandir »', () => {
	it('figure fixe : un bouton « Agrandir la figure » sous la figure, fenêtre fermée', async () => {
		const screen = await render(Espace, { target: host(), props: { node: node(...PAVE) } });
		const button = enlargeButton(screen.container);
		expect(button).toBeDefined();
		expect(button?.getAttribute('aria-label')).toBe('Agrandir la figure');
		const figure = svgOf(screen.container).getBoundingClientRect();
		expect(button!.getBoundingClientRect().top).toBeGreaterThanOrEqual(figure.bottom - 1);
		expect(dialog()).toBeNull();
	});

	it('un appui ouvre le même dessin, plus grand, avec la même description', async () => {
		const screen = await render(Espace, { target: host(), props: { node: node(...CUBE) } });
		const small = svgOf(screen.container);
		enlargeButton(screen.container)!.click();
		const big = svgOf(await opened());
		expect(big).not.toBeNull();
		expect(traits(big)).toBe(traits(small));
		expect(big.getAttribute('viewBox')).toBe(small.getAttribute('viewBox'));
		expect(big.getAttribute('aria-label')).toBe(small.getAttribute('aria-label'));
		await settled();
		expect(big.getBoundingClientRect().width).toBeGreaterThan(
			small.getBoundingClientRect().width * 1.5
		);
		// Tout le dessin tient dans la fenêtre du navigateur
		const box = big.getBoundingClientRect();
		expect(box.left).toBeGreaterThanOrEqual(0);
		expect(box.right).toBeLessThanOrEqual(window.innerWidth);
		expect(box.top).toBeGreaterThanOrEqual(0);
		expect(box.bottom).toBeLessThanOrEqual(window.innerHeight);
	});

	it('figure fixe agrandie : ni clavier, ni « Vue de départ »', async () => {
		const screen = await render(Espace, { target: host(), props: { node: node(...PAVE) } });
		enlargeButton(screen.container)!.click();
		const window_ = await opened();
		expect(svgOf(window_).hasAttribute('tabindex')).toBe(false);
		expect(window_.textContent).not.toContain('Vue de départ');
		expect(window_.textContent).not.toContain('Figure à tourner');
	});

	it('se ferme par Échap et par la croix « Fermer »', async () => {
		const screen = await render(Espace, { target: host(), props: { node: node(...PAVE) } });
		enlargeButton(screen.container)!.click();
		await opened();
		await userEvent.keyboard('{Escape}');
		await expect.poll(() => dialog()).toBeNull();

		enlargeButton(screen.container)!.click();
		const window_ = await opened();
		buttonOf(window_, 'Fermer')!.click();
		await expect.poll(() => dialog()).toBeNull();
	});

	it('figure à tourner : la grande s’ouvre sous l’angle de la petite', async () => {
		const screen = await render(Espace, {
			target: host(),
			props: { node: node(...PAVE, 'tourner: oui') }
		});
		const small = svgOf(screen.container);
		const rest = traits(small);
		drag(small, 60, 20);
		const turned = await still(small);
		expect(turned).not.toBe(rest);

		enlargeButton(screen.container)!.click();
		const big = svgOf(await opened());
		expect(traits(big)).toBe(turned);
		expect(big.getAttribute('tabindex')).toBe('0');
	});

	it('la grande figure tourne ; à la fermeture, la petite a le même angle', async () => {
		const screen = await render(Espace, {
			target: host(),
			props: { node: node(...PAVE, 'tourner: oui') }
		});
		const small = svgOf(screen.container);
		const rest = traits(small);
		enlargeButton(screen.container)!.click();
		const window_ = await opened();
		await settled();
		const big = svgOf(window_);
		expect(traits(big)).toBe(rest);

		drag(big, 80, 30);
		const turned = await still(big);
		expect(turned).not.toBe(rest);
		expect(buttonOf(window_, 'Vue de départ')).toBeDefined();

		buttonOf(window_, 'Fermer')!.click();
		await expect.poll(() => dialog()).toBeNull();
		expect(traits(svgOf(screen.container))).toBe(turned);
	});

	it('après la fermeture, la petite figure tourne encore et « Vue de départ » la ramène', async () => {
		const screen = await render(Espace, {
			target: host(),
			props: { node: node(...PAVE, 'tourner: oui') }
		});
		const small = svgOf(screen.container);
		const rest = traits(small);
		enlargeButton(screen.container)!.click();
		const window_ = await opened();
		buttonOf(window_, 'Fermer')!.click();
		await expect.poll(() => dialog()).toBeNull();

		drag(small, 60, 20);
		await settled();
		expect(traits(small)).not.toBe(rest);
		buttonOf(screen.container, 'Vue de départ')!.click();
		await expect.poll(() => traits(small), { timeout: 3000 }).toBe(rest);
		// Le clavier reste sur la figure (le bouton a disparu)
		expect(document.activeElement).toBe(small);
	});

	it('dans la grande figure, Échap ramène d’abord la vue de départ, puis ferme', async () => {
		const screen = await render(Espace, {
			target: host(),
			props: { node: node(...PAVE, 'tourner: oui') }
		});
		enlargeButton(screen.container)!.click();
		const window_ = await opened();
		await settled();
		const big = svgOf(window_);
		const rest = traits(big);
		big.focus();
		await userEvent.keyboard('{ArrowRight}');
		await settled();
		expect(traits(big)).not.toBe(rest);

		await userEvent.keyboard('{Escape}');
		await expect.poll(() => traits(big), { timeout: 3000 }).toBe(rest);
		expect(dialog()).not.toBeNull();
		await userEvent.keyboard('{Escape}');
		await expect.poll(() => dialog()).toBeNull();
	});

	it('une nouvelle question referme la fenêtre', async () => {
		const screen = await render(Espace, { target: host(), props: { node: node(...PAVE) } });
		enlargeButton(screen.container)!.click();
		await opened();
		await screen.rerender({ node: node(...CUBE) });
		await expect.poll(() => dialog()).toBeNull();
	});

	it('le premier bloc revient après un autre : la fenêtre ne se rouvre pas seule', async () => {
		const screen = await render(Espace, { target: host(), props: { node: node(...PAVE) } });
		enlargeButton(screen.container)!.click();
		await opened();
		await screen.rerender({ node: node(...CUBE) });
		await expect.poll(() => dialog()).toBeNull();
		await screen.rerender({ node: node(...PAVE) });
		await settled();
		await settled();
		expect(dialog()).toBeNull();
	});

	it('à la fermeture, le clavier revient sur le bouton « Agrandir »', async () => {
		const screen = await render(Espace, { target: host(), props: { node: node(...PAVE) } });
		const button = enlargeButton(screen.container)!;
		button.click();
		const window_ = await opened();
		buttonOf(window_, 'Fermer')!.click();
		await expect.poll(() => dialog()).toBeNull();
		await expect.poll(() => document.activeElement).toBe(button);
	});

	it('figure dans un choix (contexte posé par la liste de choix) : pas de bouton, dès le premier rendu', async () => {
		const screen = await render(Espace, {
			target: host(),
			props: { node: node(...PAVE) },
			context: new Map([[FIGURE_IN_CHOICE_KEY, true]])
		});
		expect(svgOf(screen.container)).not.toBeNull();
		expect(screen.container.querySelectorAll('button')).toHaveLength(0);
	});

	it('figure dans une carte que l’on touche (role="button") : pas de bouton « Agrandir »', async () => {
		const card = host('div');
		card.setAttribute('role', 'button');
		const screen = await render(Espace, { target: card, props: { node: node(...PAVE) } });
		await settled();
		expect(enlargeButton(screen.container)).toBeUndefined();
	});

	it('figure dans un choix à cocher (un bouton) : pas de bouton « Agrandir »', async () => {
		const screen = await render(Espace, {
			target: host('button'),
			props: { node: node(...PAVE) }
		});
		await settled();
		expect(svgOf(screen.container)).not.toBeNull();
		expect(enlargeButton(screen.container)).toBeUndefined();
	});

	it('bloc en erreur : pas de bouton', async () => {
		const screen = await render(Espace, {
			target: host(),
			props: { node: node('forme: pave 4 2'), showErrors: true }
		});
		expect(screen.container.querySelectorAll('button')).toHaveLength(0);
	});

	it('figure à geste (`tracer:`) : pas de bouton « Agrandir »', async () => {
		const screen = await render(Espace, {
			target: host(),
			props: { node: node(...PAVE.slice(0, 2), 'tracer: vecteur AG') }
		});
		await settled();
		expect(screen.container.querySelector('svg')).not.toBeNull();
		expect(enlargeButton(screen.container)).toBeUndefined();
	});
});
