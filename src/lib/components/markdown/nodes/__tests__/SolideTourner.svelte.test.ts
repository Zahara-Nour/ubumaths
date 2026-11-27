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

const namePlaces = (container: Element) =>
	[...container.querySelectorAll('text')]
		.map((t) => `${t.textContent}:${t.getAttribute('x')},${t.getAttribute('y')}`)
		.join(' | ');
/** Place de chaque nom par rapport au sommet le plus proche (bout d'arête) */
function nameOffsets(container: Element): { x: number; y: number }[] {
	const ends = [...container.querySelectorAll('polyline')].flatMap((l) =>
		(l.getAttribute('points') ?? '').split(' ').map((p) => {
			const [x, y] = p.split(',').map(Number);
			return { x, y };
		})
	);
	return [...container.querySelectorAll('text')].map((t) => {
		const x = Number(t.getAttribute('x'));
		const y = Number(t.getAttribute('y'));
		const nearest = ends.reduce((best, p) =>
			Math.hypot(p.x - x, p.y - y) < Math.hypot(best.x - x, best.y - y) ? p : best
		);
		return { x: x - nearest.x, y: y - nearest.y };
	});
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

	it('les noms gardent leur place pendant le glissement, et se replacent à l’arrêt', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node('forme: pave 4 2 3', 'sommets: A B C D E F G H', 'tourner: oui') }
		});
		const svg = svgOf(screen.container);
		const atRest = nameOffsets(screen.container);
		const namesAtRest = namePlaces(screen.container);
		expect(atRest).toHaveLength(8);

		// Doigt posé, figure tournée de plus d'un quart de tour, doigt pas encore levé
		const box = svg.getBoundingClientRect();
		const x = box.left + box.width / 2;
		const y = box.top + box.height / 2;
		const pointer = (type: string, clientX: number, clientY: number) =>
			svg.dispatchEvent(
				new PointerEvent(type, {
					pointerId: 7,
					isPrimary: true,
					button: 0,
					buttons: 1,
					clientX,
					clientY,
					bubbles: true
				})
			);
		pointer('pointerdown', x, y);
		for (let step = 1; step <= 8; step++) pointer('pointermove', x + step * 25, y + step * 5);
		await expect.poll(() => resetButton(screen.container)).toBeDefined();
		// Le passage à la vue droite (250 ms) est fini, le doigt toujours posé
		await new Promise((resolve) => setTimeout(resolve, 400));
		expect(namePlaces(screen.container)).not.toBe(namesAtRest);
		const whileTurning = nameOffsets(screen.container);
		whileTurning.forEach((offset, i) => {
			expect(offset.x).toBeCloseTo(atRest[i].x, 6);
			expect(offset.y).toBeCloseTo(atRest[i].y, 6);
		});

		// Doigt levé : les noms glissent à la place qui convient à cette vue
		pointer('pointerup', x + 200, y + 40);
		await expect
			.poll(() =>
				nameOffsets(screen.container).some(
					(offset, i) => Math.hypot(offset.x - atRest[i].x, offset.y - atRest[i].y) > 0.1
				)
			)
			.toBe(true);

		// Retour : à l'arrivée, les noms sont à leur place de départ
		resetButton(screen.container)!.click();
		await expect.poll(() => resetButton(screen.container)).toBeUndefined();
		await expect.poll(() => namePlaces(screen.container)).toBe(namesAtRest);
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
});

describe('Solide rond — tourner: oui (lot 3)', () => {
	const CYLINDRE = ['forme: cylindre 2 5', "sommets: O O'"];
	/** Hauteur à l'écran des deux traits des côtés (polylignes de deux points) */
	const sideHeights = (container: Element) =>
		[...container.querySelectorAll('polyline')]
			.filter((l) => (l.getAttribute('points') ?? '').trim().split(' ').length === 2)
			.map((l) => l.getBoundingClientRect().height);

	it('au repos : le dessin fixe, la consigne ; glisser vers le haut montre le dessous', async () => {
		const fixed = await render(Espace, {
			target: mainElement(),
			props: { node: node(...CYLINDRE) }
		});
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node(...CYLINDRE, 'tourner: oui') }
		});
		const svg = svgOf(screen.container);
		expect(svg.getAttribute('tabindex')).toBe('0');
		expect(screen.container.textContent).toContain('Figure à tourner');
		expect(screen.container.querySelectorAll('polyline')).toHaveLength(5);
		expect(sideHeights(screen.container)[0]).toBeCloseTo(sideHeights(fixed.container)[0], 0);
		const before = traits(screen.container);
		const box = svg.getBoundingClientRect();

		// 60 px vers le haut : environ 41°, le regard passe sous l'horizontale
		drag(svg, 0, -60);
		await expect.poll(() => resetButton(screen.container)).toBeDefined();
		// Vu de dessous : le cercle du haut en deux moitiés, celle du fond en tirets
		await expect.poll(() => screen.container.querySelectorAll('polyline').length).toBe(6);
		expect(screen.container.querySelectorAll('polyline[stroke-dasharray]')).toHaveLength(1);
		expect(screen.container.querySelectorAll('text')).toHaveLength(2);
		expect(svg.getBoundingClientRect().width).toBe(box.width);
		expect(svg.getBoundingClientRect().height).toBe(box.height);

		resetButton(screen.container)!.click();
		await expect.poll(() => resetButton(screen.container)).toBeUndefined();
		expect(traits(screen.container)).toBe(before);
	});

	it('la bascule s’arrête à la vue de dessus : un cercle, les côtés réduits à rien', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node(...CYLINDRE, 'tourner: oui') }
		});
		const svg = svgOf(screen.container);
		const atRest = sideHeights(screen.container)[0];
		expect(atRest).toBeGreaterThan(50);
		// Bien plus que le quart de tour : la figure ne passe pas tête en bas
		drag(svg, 0, 600);
		await expect.poll(() => resetButton(screen.container)).toBeDefined();
		await expect.poll(() => Math.max(...sideHeights(screen.container))).toBeLessThan(2);
		// En revenant un peu, on voit toujours le dessus (un seul arc en tirets, 5 traits)
		drag(svg, 0, -30);
		await expect.poll(() => Math.max(...sideHeights(screen.container))).toBeGreaterThan(10);
		expect(screen.container.querySelectorAll('polyline')).toHaveLength(5);
	});
});

describe('Solide coupé ou coté — tourner: oui (lot 4)', () => {
	const texts = (container: Element) =>
		[...container.querySelectorAll('text')].map((t) => t.textContent ?? '');
	const cotes = (container: Element) => texts(container).filter((t) => /^\d/.test(t));

	it('pavé coupé et coté : les longueurs s’effacent quand la figure tourne, la section et ses noms restent', async () => {
		const lines = [
			'forme: pave 4 2 3',
			'sommets: A B C D E F G H',
			'section: parallele dessus 1 IJKL',
			'cotes: cm'
		];
		const fixed = await render(Espace, { target: mainElement(), props: { node: node(...lines) } });
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node(...lines, 'tourner: oui') }
		});
		const svg = svgOf(screen.container);
		expect(svg.getAttribute('tabindex')).toBe('0');
		expect(screen.container.textContent).not.toContain('ne tourne pas encore');
		// Au repos : le dessin fixe, ses quatre longueurs, la section teintée
		expect(texts(screen.container)).toEqual(texts(fixed.container));
		expect(cotes(screen.container)).toEqual(['4 cm', '2 cm', '3 cm', '1 cm']);
		expect(screen.container.querySelectorAll('polygon.solide-section')).toHaveLength(1);
		const before = traits(screen.container);
		const places = namePlaces(screen.container);
		const box = svg.getBoundingClientRect();

		drag(svg, 120, 30);
		await expect.poll(() => resetButton(screen.container)).toBeDefined();
		expect(cotes(screen.container)).toEqual([]);
		expect(texts(screen.container)).toEqual([...'ABCDEFGHIJKL']);
		expect(screen.container.querySelectorAll('polygon.solide-section')).toHaveLength(1);
		expect(traits(screen.container)).not.toBe(before);
		// 12 arêtes et les 4 côtés épais de la section
		expect(screen.container.querySelectorAll('polyline')).toHaveLength(16);
		expect(svg.getBoundingClientRect().width).toBe(box.width);
		expect(svg.getBoundingClientRect().height).toBe(box.height);

		// Retour à la vue de départ : les longueurs reviennent, le dessin aussi
		resetButton(screen.container)!.click();
		await expect.poll(() => resetButton(screen.container)).toBeUndefined();
		await expect.poll(() => cotes(screen.container)).toEqual(['4 cm', '2 cm', '3 cm', '1 cm']);
		// Les noms ont fini de se replacer : chacun à sa place du repos
		await expect.poll(() => namePlaces(screen.container)).toBe(places);
		expect(traits(screen.container)).toBe(before);
	});

	it('cylindre coupé parallèlement à l’axe : glisser de côté fait tourner le rectangle', async () => {
		const screen = await render(Espace, {
			target: mainElement(),
			props: { node: node('forme: cylindre 2 5', 'section: parallele 1', 'tourner: oui') }
		});
		const svg = svgOf(screen.container);
		const section = () =>
			screen.container.querySelector('polygon.solide-section')!.getBoundingClientRect().width;
		const wide = section();
		expect(wide).toBeGreaterThan(40);
		// 131 px de côté : un quart de tour, le rectangle vu par la tranche
		drag(svg, 131, 0);
		await expect.poll(() => resetButton(screen.container)).toBeDefined();
		await expect.poll(section).toBeLessThan(wide / 10);
	});
});
