/**
 * La vue Figure (géométrie v2, lot 1, PR 2 — F1 à F5 de
 * `docs/archive/wip/atelier-geometrie-phase0.md`) : une projection de l'atelier dans une
 * `GeometryCanvas`, repère orthonormé ; les points se glissent (lot 3, PR 1).
 *
 * Asserte le RENDU : éléments SVG présents, texte de la vue.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import AtelierContainer from '../AtelierContainer.svelte';
import WithFigure from './harness/WithFigure.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { chooseCardAction } from './harness/function-card';
import { onDesktopScreen } from './harness/desktop-screen';

// À 414 px (la page des tests), « Mes objets » est replié : on teste les cartes sur bureau
onDesktopScreen();

// =============================================================================
// Décor
// =============================================================================

type Entry = [kind: 'value' | 'function' | 'point' | 'curve', name: string, definition: string];

function atelierOf(entries: Entry[]): Atelier {
	const atelier = new Atelier();
	for (const [kind, name, definition] of entries) {
		atelier.create({ kind, name, definition }, 'text');
	}
	return atelier;
}

function canvasOf(container: HTMLElement): SVGSVGElement {
	const svg = container.querySelector('svg.geometry-canvas');
	if (!(svg instanceof SVGSVGElement)) throw new Error('pas de toile');
	return svg;
}

/** Les noms écrits sur la toile (étiquettes des points et des courbes). */
function labels(container: HTMLElement): string[] {
	return [...canvasOf(container).querySelectorAll('text.label')].map(
		(t) => t.textContent?.trim() ?? ''
	);
}

/** Tirer le point de (dx ; dy) pixels à la souris, puis le relâcher. */
async function drag(container: HTMLElement, point: SVGElement, dx: number, dy: number) {
	const rect = point.getBoundingClientRect();
	const at = { clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2 };
	const svg = canvasOf(container);
	point.dispatchEvent(new PointerEvent('pointerdown', { ...at, bubbles: true, pointerId: 1 }));
	for (let i = 1; i <= 4; i++) {
		svg.dispatchEvent(
			new PointerEvent('pointermove', {
				clientX: at.clientX + (dx * i) / 4,
				clientY: at.clientY + (dy * i) / 4,
				bubbles: true,
				pointerId: 1
			})
		);
		await new Promise((r) => requestAnimationFrame(r));
	}
	svg.dispatchEvent(
		new PointerEvent('pointerup', {
			clientX: at.clientX + dx,
			clientY: at.clientY + dy,
			bubbles: true,
			pointerId: 1
		})
	);
	await new Promise((r) => setTimeout(r, 50));
}

/** Le centre, à l'écran, d'un élément de la toile. */
function centerOf(element: Element): { x: number; y: number } {
	const rect = element.getBoundingClientRect();
	return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** Un événement de pointeur en (x ; y), sur `target` (le point visé, ou la toile). */
function pointer(
	target: Element,
	type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
	x: number,
	y: number,
	pointerId = 1
) {
	target.dispatchEvent(
		new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, pointerId })
	);
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

/** Le point A dessiné, une fois la toile prête. */
async function pointA(container: HTMLElement): Promise<SVGCircleElement> {
	await vi.waitFor(() => expect(canvasOf(container).querySelector('circle.point')).toBeTruthy());
	return canvasOf(container).querySelector('circle.point') as SVGCircleElement;
}

/** Les coordonnées écrites d'un point, en nombres : `(2,3 ; -0,7)` → [2.3, -0.7]. */
function coordinates(definition: string | undefined): [number, number] {
	const match = /^\((.+) ; (.+)\)$/.exec(definition ?? '');
	if (match === null) throw new Error(`pas un couple : ${definition}`);
	return [Number(match[1].replace(',', '.')), Number(match[2].replace(',', '.'))];
}

// =============================================================================
// Tests
// =============================================================================

describe('la vue Géométrie (FigureView)', () => {
	it('F1, Q5 révisée : l’onglet Géométrie est entre Graphe et Données', async () => {
		const { container } = await render(AtelierContainer, { ephemeral: true });

		const tabs = [...container.querySelectorAll('.onglet')].map((b) => b.textContent?.trim());
		// Plus d'onglet Calcul : la console est un volet (lot 2 de la refonte)
		expect(tabs).toEqual(['Graphe', 'Géométrie', 'Données']);
		expect(container.textContent).not.toContain('Figure');
	});

	it('Q5 révisée : la vue s’annonce « Géométrie » au lecteur d’écran', async () => {
		const { container } = await render(WithFigure, { atelier: atelierOf([]) });

		expect(container.querySelector('section[aria-label="Géométrie"]')).toBeTruthy();
	});

	it('K1 : une fonction affichée est tracée, et la vue n’est plus vide', async () => {
		const atelier = atelierOf([['function', 'f', 'x^2']]);
		atelier.setInFigure('f', true);
		const { container } = await render(WithFigure, { atelier });

		await vi.waitFor(() =>
			expect(canvasOf(container).querySelector('path.function-curve')).toBeTruthy()
		);
		expect(labels(container)).toContain('f');
		expect(container.textContent).not.toContain('écris un point');
		expect(container.textContent).toContain('Repère');
	});

	it('F1 : une fonction affichée mais en attente (b absent) ne rend pas la vue non vide', async () => {
		const atelier = atelierOf([['function', 'f', 'b x']]);
		atelier.setInFigure('f', true);
		const { container } = await render(WithFigure, { atelier });

		await vi.waitFor(() => expect(container.querySelector('svg.geometry-canvas')).toBeTruthy());
		expect(container.textContent).toContain('écris un point');
		expect(canvasOf(container).querySelector('path.function-curve')).toBeNull();
	});

	it('K1 : « Afficher dans Géométrie » sur la carte trace 𝒞f, écrit sa ligne et ouvre Géométrie', async () => {
		const atelier = atelierOf([['function', 'f', 'x^2']]);
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		// Lot 3 de la refonte : l'action est dans le menu de la carte
		await chooseCardAction(container, 'f', 'Afficher dans Géométrie');

		await vi.waitFor(() =>
			expect(container.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe(
				'Géométrie'
			)
		);
		await vi.waitFor(() =>
			expect(canvasOf(container).querySelector('path.function-curve')).toBeTruthy()
		);
		// G2 : le geste a écrit sa ligne dans la console
		await vi.waitFor(() =>
			expect(container.querySelector('.historique')?.textContent).toContain(
				'La courbe de f est affichée dans Géométrie.'
			)
		);
	});

	it('F1 : sans objet de figure, la vue dit quoi écrire', async () => {
		const { container } = await render(AtelierContainer, {
			atelier: atelierOf([['function', 'f', 'x^2']]),
			ephemeral: true,
			view: 'figure'
		});

		expect(container.textContent).toContain(
			'Dans la console, écris un point A = (1 ; 2) ou une courbe d : y = 3x − 2'
		);
	});

	it('F2 : le point A et la droite d sont dessinés et nommés', async () => {
		const { container } = await render(AtelierContainer, {
			atelier: atelierOf([
				['point', 'A', '(1 ; 2)'],
				['curve', 'd', 'y = 3x - 2']
			]),
			ephemeral: true,
			view: 'figure'
		});

		await vi.waitFor(() => expect(canvasOf(container).querySelector('circle.point')).toBeTruthy());
		expect(canvasOf(container).querySelector('line.geo-line')).toBeTruthy();
		expect(labels(container)).toEqual(expect.arrayContaining(['A', 'd']));
		expect(container.textContent).not.toContain('écris un point');
	});

	it('F2 : repère orthonormé — le cercle x² + y² = 4 est rond à l’écran', async () => {
		const { container } = await render(WithFigure, {
			atelier: atelierOf([['curve', 'C', 'x^2 + y^2 = 4']]),
			width: 600,
			height: 300
		});

		await vi.waitFor(() =>
			expect(canvasOf(container).querySelector('path.function-curve')).toBeTruthy()
		);
		const box = (
			canvasOf(container).querySelector('path.function-curve') as SVGPathElement
		).getBBox();
		expect(Math.abs(box.width - box.height)).toBeLessThan(1);
	});

	it('F5 : une courbe en attente n’est pas dessinée', async () => {
		const { container } = await render(WithFigure, {
			atelier: atelierOf([
				['curve', 'C', 'x^2 + y^2 = b^2'],
				['point', 'A', '(1 ; 2)']
			])
		});

		await vi.waitFor(() => expect(canvasOf(container).querySelector('circle.point')).toBeTruthy());
		expect(canvasOf(container).querySelector('path.function-curve')).toBeNull();
		expect(labels(container)).not.toContain('C');
	});

	it('F3 : le repère est affiché par défaut ; la case « Repère » le masque', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const { container } = await render(WithFigure, { atelier });
		await vi.waitFor(() => expect(canvasOf(container).querySelector('g.grid')).toBeTruthy());

		const box = container.querySelector('button[role="checkbox"]');
		expect(box?.getAttribute('aria-checked')).toBe('true');
		expect(container.textContent).toContain('Repère');
		await userEvent.click(box as HTMLElement);

		await vi.waitFor(() => expect(canvasOf(container).querySelector('g.grid')).toBeNull());
		expect(atelier.figureFrame).toBe(false);
	});

	it('M1, M2 : glisser A = (1 ; 2) réécrit ses coordonnées, la toile suit, une étape', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const steps = atelier.history.steps;
		const { container } = await render(WithFigure, { atelier });
		await vi.waitFor(() => expect(canvasOf(container).querySelector('circle.point')).toBeTruthy());
		const point = canvasOf(container).querySelector('circle.point') as SVGCircleElement;
		expect(point.classList.contains('draggable')).toBe(true);
		const before = [point.getAttribute('cx'), point.getAttribute('cy')];

		await drag(container, point, 60, 40);

		expect(atelier.get('A')?.definition).not.toBe('(1 ; 2)');
		expect(atelier.get('A')?.definition).toMatch(/^\(-?\d+(,\d)? ; -?\d+(,\d)?\)$/);
		await vi.waitFor(() => {
			const after = canvasOf(container).querySelector('circle.point') as SVGCircleElement;
			expect([after.getAttribute('cx'), after.getAttribute('cy')]).not.toEqual(before);
		});
		expect(atelier.history.steps).toBe(steps + 1);
		expect(atelier.history.undo).toBe('déplacer A');
	});

	it('M2 : un point construit ne se glisse pas, et la vue dit quoi déplacer', async () => {
		const atelier = atelierOf([
			['point', 'A', '(-3 ; 0)'],
			['point', 'B', '(3 ; 0)'],
			['point', 'I', 'milieu(A, B)']
		]);
		const { container } = await render(WithFigure, { atelier });
		await vi.waitFor(() =>
			expect(canvasOf(container).querySelectorAll('circle.point').length).toBe(3)
		);
		const middle = [...canvasOf(container).querySelectorAll('circle.point')].find(
			(c) => !c.classList.contains('draggable')
		);
		expect(middle).toBeTruthy();

		await drag(container, middle as SVGCircleElement, 30, 30);

		expect(atelier.get('I')?.definition).toBe('milieu(A, B)');
		expect(atelier.get('A')?.definition).toBe('(-3 ; 0)');
		expect(atelier.get('B')?.definition).toBe('(3 ; 0)');
		expect(container.querySelector('[role="status"]')?.textContent).toContain(
			'déplace les points dont il dépend'
		);
	});

	it('S1 : le curseur de l’atelier fait bouger le point, sans curseur affiché dans la figure', async () => {
		const atelier = atelierOf([
			['value', 'a', '1'],
			['point', 'M', '(a ; 0)']
		]);
		const { container } = await render(WithFigure, { atelier });
		await vi.waitFor(() => expect(canvasOf(container).querySelector('circle.point')).toBeTruthy());
		const before = canvasOf(container).querySelector('circle.point')?.getAttribute('cx');
		// Le curseur est CACHÉ : celui de la carte suffit (S4)
		expect(container.querySelector('.sliders-panel')).toBeNull();

		atelier.slideTo('a', 3);

		await vi.waitFor(() =>
			expect(canvasOf(container).querySelector('circle.point')?.getAttribute('cx')).not.toBe(before)
		);
	});

	it('tient à la largeur d’un téléphone (360 px) sans déborder', async () => {
		const { container } = await render(WithFigure, {
			atelier: atelierOf([['point', 'A', '(1 ; 2)']]),
			width: 360,
			height: 520
		});

		await vi.waitFor(() => expect(canvasOf(container).querySelector('circle.point')).toBeTruthy());
		expect(canvasOf(container).getBoundingClientRect().width).toBeLessThanOrEqual(360);
		const view = container.querySelector('.figure') as HTMLElement;
		expect(view.scrollWidth).toBeLessThanOrEqual(360);
	});

	it('K4 : 𝒞f est peinte de la couleur de sa carte, et la suit', async () => {
		const atelier = atelierOf([['function', 'f', 'x^2']]);
		atelier.setDisplay('f', { color: 'curve-2' });
		atelier.setInFigure('f', true);
		const { container } = await render(WithFigure, { atelier });
		const curve = () => canvasOf(container).querySelector('path.function-curve') as SVGPathElement;
		await vi.waitFor(() => expect(curve()).toBeTruthy());
		// Le jeton du Graphe, résolu par le thème (clair ou sombre)
		expect(curve().style.stroke).toBe('var(--color-curve-2)');
		const token = getComputedStyle(document.documentElement).getPropertyValue('--color-curve-2');
		expect(token.trim()).not.toBe('');

		atelier.setDisplay('f', { color: 'curve-3' });

		await vi.waitFor(() => expect(curve().style.stroke).toBe('var(--color-curve-3)'));
	});
});

describe('le glisser d’un point dans la toile (revue du lot 3, PR 1)', () => {
	it('direction : tiré à droite et vers le bas, A gagne en abscisse et perd en ordonnée', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const { container } = await render(WithFigure, { atelier });

		await drag(container, await pointA(container), 60, 40);

		const [x, y] = coordinates(atelier.get('A')?.definition);
		expect(x).toBeGreaterThan(1);
		expect(y).toBeLessThan(2);
	});

	it('un clic qui tremble (2 px) ne réécrit rien : (1/3 ; 2,25) reste écrit tel quel', async () => {
		const atelier = atelierOf([['point', 'A', '(1/3 ; 2,25)']]);
		const steps = atelier.history.steps;
		const { container } = await render(WithFigure, { atelier });
		const point = await pointA(container);
		expect(point.classList.contains('draggable')).toBe(true);
		const { x, y } = centerOf(point);
		const svg = canvasOf(container);

		pointer(point, 'pointerdown', x, y);
		pointer(svg, 'pointermove', x + 2, y - 1);
		await nextFrame();
		pointer(svg, 'pointermove', x + 1, y + 2);
		await nextFrame();
		pointer(svg, 'pointerup', x + 1, y + 2);
		await nextFrame();

		expect(atelier.get('A')?.definition).toBe('(1/3 ; 2,25)');
		expect(atelier.history.steps).toBe(steps);
	});

	it('saisi à côté de son centre, le point ne saute pas sous le curseur : il suit l’écart', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const { container } = await render(WithFigure, { atelier });
		const point = await pointA(container);
		const { x, y } = centerOf(point);
		const svg = canvasOf(container);

		// Saisi 8 px à droite, tiré de 30 px : A avance de 30 px (≈ 1,08), pas de 38 (≈ 1,37)
		pointer(point, 'pointerdown', x + 8, y);
		for (let i = 1; i <= 3; i++) {
			pointer(svg, 'pointermove', x + 8 + 10 * i, y);
			await nextFrame();
		}
		pointer(svg, 'pointerup', x + 38, y);
		await nextFrame();

		expect(atelier.get('A')?.definition).toBe('(2 ; 2)');
	});

	it('un second pointeur est ignoré : ni re-saisie, ni mouvement, ni relâcher', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const steps = atelier.history.steps;
		const { container } = await render(WithFigure, { atelier });
		const point = await pointA(container);
		const { x, y } = centerOf(point);
		const svg = canvasOf(container);

		pointer(point, 'pointerdown', x, y, 1);
		pointer(svg, 'pointermove', x + 30, y, 1);
		await nextFrame();
		expect(atelier.get('A')?.definition).toBe('(2 ; 2)');

		pointer(svg, 'pointerdown', x - 100, y + 50, 2);
		pointer(svg, 'pointermove', x - 150, y + 100, 2);
		await nextFrame();
		pointer(svg, 'pointerup', x - 150, y + 100, 2);
		await nextFrame();
		expect(atelier.get('A')?.definition).toBe('(2 ; 2)');
		expect(atelier.draggingPoint).toBe(true);

		pointer(svg, 'pointermove', x + 60, y, 1);
		await nextFrame();
		pointer(svg, 'pointerup', x + 60, y, 1);
		await nextFrame();
		expect(atelier.get('A')?.definition).toBe('(3 ; 2)');
		expect(atelier.draggingPoint).toBe(false);
		expect(atelier.history.steps).toBe(steps + 1);
	});

	it('le point glissé garde la classe « dragging » tout le geste, figure refaite comprise', async () => {
		// (AB) écrite AVANT A : A posé sur B, la droite n'existe plus, la figure
		// refaite renumérote ses éléments — l'id de A change en plein geste
		const atelier = atelierOf([
			['curve', 'd', '(AB)'],
			['point', 'A', '(1 ; 2)'],
			['point', 'B', '(3 ; 2)']
		]);
		const { container } = await render(WithFigure, { atelier });
		await vi.waitFor(() =>
			expect(canvasOf(container).querySelectorAll('circle.point').length).toBe(2)
		);
		const point = [...canvasOf(container).querySelectorAll('circle.point')].sort(
			(p, q) => p.getBoundingClientRect().x - q.getBoundingClientRect().x
		)[0];
		const { x, y } = centerOf(point);
		const svg = canvasOf(container);
		const dragged = () => canvasOf(container).querySelectorAll('circle.point.dragging').length;

		pointer(point, 'pointerdown', x, y);
		pointer(svg, 'pointermove', x + 30, y);
		await nextFrame();
		pointer(svg, 'pointermove', x + 60, y);
		await nextFrame();

		expect(atelier.get('A')?.definition).toBe('(3 ; 2)');
		await vi.waitFor(() => expect(dragged()).toBe(1));

		pointer(svg, 'pointerup', x + 60, y);
		await vi.waitFor(() => expect(dragged()).toBe(0));
	});

	it('Ctrl+Z en plein glisser ne défait rien ; après le relâcher, il défait tout le glisser', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const { container } = await render(AtelierContainer, {
			atelier,
			ephemeral: true,
			view: 'figure',
			consoleAtStart: false
		});
		const point = await pointA(container);
		const { x, y } = centerOf(point);
		const svg = canvasOf(container);
		// Une unité du repère, en pixels : la toile a 13 unités sur son plus petit côté
		const rect = svg.getBoundingClientRect();
		const unit = Math.min(rect.width, rect.height) / 13;
		const ctrlZ = () =>
			document.body.dispatchEvent(
				new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', ctrlKey: true, bubbles: true })
			);

		pointer(point, 'pointerdown', x, y);
		pointer(svg, 'pointermove', x + unit, y);
		await nextFrame();
		const steps = atelier.history.steps;
		ctrlZ();
		await nextFrame();

		expect(atelier.get('A')?.definition).toBe('(2 ; 2)');
		expect(atelier.history.steps).toBe(steps);

		pointer(svg, 'pointermove', x + 2 * unit, y);
		await nextFrame();
		pointer(svg, 'pointerup', x + 2 * unit, y);
		await nextFrame();
		ctrlZ();

		await vi.waitFor(() => expect(atelier.get('A')?.definition).toBe('(1 ; 2)'));
	});

	it('annulation du navigateur (pointercancel) : le point reste où il est arrivé, le geste est fermé', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const steps = atelier.history.steps;
		const { container } = await render(WithFigure, { atelier });
		const point = await pointA(container);
		const { x, y } = centerOf(point);
		const svg = canvasOf(container);

		pointer(point, 'pointerdown', x, y);
		pointer(svg, 'pointermove', x + 30, y);
		await nextFrame();
		pointer(svg, 'pointercancel', x + 30, y);
		await nextFrame();

		expect(atelier.get('A')?.definition).toBe('(2 ; 2)');
		expect(atelier.draggingPoint).toBe(false);
		expect(atelier.history.steps).toBe(steps + 1);
		// Un mouvement après l'annulation ne déplace plus rien
		pointer(svg, 'pointermove', x + 90, y);
		await nextFrame();
		expect(atelier.get('A')?.definition).toBe('(2 ; 2)');
	});

	it('fenêtre quittée (blur) en plein glisser : le geste est fermé', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const { container } = await render(WithFigure, { atelier });
		const point = await pointA(container);
		const { x, y } = centerOf(point);
		const svg = canvasOf(container);

		pointer(point, 'pointerdown', x, y);
		pointer(svg, 'pointermove', x + 30, y);
		await nextFrame();
		window.dispatchEvent(new Event('blur'));
		await nextFrame();

		expect(atelier.draggingPoint).toBe(false);
		pointer(svg, 'pointermove', x + 90, y);
		await nextFrame();
		expect(atelier.get('A')?.definition).toBe('(2 ; 2)');
	});

	it('au plus un mouvement par image, le dernier ; le relâcher envoie celui qui attendait', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const { container } = await render(WithFigure, { atelier });
		const point = await pointA(container);
		const { x, y } = centerOf(point);
		const svg = canvasOf(container);
		const spy = vi.spyOn(atelier, 'dragPoint');

		pointer(point, 'pointerdown', x, y);
		pointer(svg, 'pointermove', x + 10, y);
		pointer(svg, 'pointermove', x + 20, y);
		pointer(svg, 'pointermove', x + 30, y);
		await nextFrame();
		expect(spy).toHaveBeenCalledTimes(1);
		expect(atelier.get('A')?.definition).toBe('(2 ; 2)');

		// Relâché dans la même image que le mouvement : il n'est pas perdu
		pointer(svg, 'pointermove', x + 60, y);
		pointer(svg, 'pointerup', x + 60, y);
		expect(spy).toHaveBeenCalledTimes(2);
		expect(atelier.get('A')?.definition).toBe('(3 ; 2)');
	});

	it('un refus dit en plein geste s’efface au relâcher', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const { container } = await render(WithFigure, { atelier });
		const point = await pointA(container);
		const { x, y } = centerOf(point);
		const svg = canvasOf(container);
		vi.spyOn(atelier, 'dragPoint').mockReturnValue({ ok: false, message: 'Refus de test.' });
		const status = () => container.querySelector('[role="status"]')?.textContent ?? '';

		pointer(point, 'pointerdown', x, y);
		pointer(svg, 'pointermove', x + 30, y);
		await nextFrame();
		await vi.waitFor(() => expect(status()).toContain('Refus de test.'));

		pointer(svg, 'pointerup', x + 30, y);
		await vi.waitFor(() => expect(status().trim()).toBe(''));
	});
});
