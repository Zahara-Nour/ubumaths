/**
 * Téléphone et tablette (géométrie, lot 3, PR 4 — M6 de
 * `docs/archive/wip/atelier-geometrie-lot3-phase0.md`) : la vue se déplace (glisser
 * sur le fond avec Déplacer, deux doigts avec tout outil), se zoome au
 * pincement, et sur un téléphone la toile tient dans l'écran, barre d'outils
 * en bas.
 *
 * Asserte le RENDU : la position dessinée des points, et ce que l'atelier
 * garde (rien d'écrit, aucune étape).
 */

import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

// =============================================================================
// Décor
// =============================================================================

type Entry = [kind: 'point' | 'curve', name: string, definition: string];

type At = { x: number; y: number };

function atelierOf(entries: Entry[] = []): Atelier {
	const atelier = new Atelier();
	for (const [kind, name, definition] of entries) {
		atelier.create({ kind, name, definition }, 'text');
	}
	return atelier;
}

async function mount(atelier: Atelier) {
	const { container } = await render(AtelierContainer, {
		atelier,
		ephemeral: true,
		view: 'figure',
		consoleAtStart: false
	});
	await vi.waitFor(() => expect(container.querySelector('svg.geometry-canvas')).toBeTruthy());
	return container;
}

/**
 * Monter l'atelier comme dans la page d'un téléphone (iPhone 13) : 600 px de
 * haut sous l'en-tête, « Mes objets » (vide) au-dessus de la vue.
 */
async function mountOnPhone(atelier: Atelier) {
	const { container } = await render(AtelierContainer, {
		atelier,
		ephemeral: true,
		view: 'figure',
		consoleAtStart: false
	});
	container.style.height = '600px';
	await vi.waitFor(() => expect(container.querySelector('svg.geometry-canvas')).toBeTruthy());
	return container;
}

function canvasOf(container: HTMLElement): SVGSVGElement {
	const svg = container.querySelector('svg.geometry-canvas');
	if (!(svg instanceof SVGSVGElement)) throw new Error('pas de toile');
	return svg;
}

/** Le centre dessiné, à l'écran, du point `label` (A, puis B : l'ordre de création). */
function drawnAt(container: HTMLElement, label: 'A' | 'B'): At {
	const circle = canvasOf(container).querySelectorAll('circle.point')[label === 'A' ? 0 : 1];
	if (!circle) throw new Error(`pas de point ${label}`);
	const rect = circle.getBoundingClientRect();
	return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function pointer(
	target: Element,
	type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
	at: At,
	pointerId: number,
	pointerType: 'mouse' | 'touch'
) {
	target.dispatchEvent(
		new PointerEvent(type, {
			clientX: at.x,
			clientY: at.y,
			bubbles: true,
			pointerId,
			pointerType,
			isPrimary: pointerId === 1 || pointerId === 11
		})
	);
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

/** Un endroit vide de la toile : à 30 % de sa largeur, 70 % de sa hauteur. */
function backgroundOf(container: HTMLElement): At {
	const rect = canvasOf(container).getBoundingClientRect();
	return { x: rect.x + rect.width * 0.3, y: rect.y + rect.height * 0.7 };
}

/** Glisser un pointeur de `from` de (dx ; dy) pixels, en quatre mouvements. */
async function slide(
	container: HTMLElement,
	from: At,
	dx: number,
	dy: number,
	pointerType: 'mouse' | 'touch'
) {
	const svg = canvasOf(container);
	pointer(svg, 'pointerdown', from, 1, pointerType);
	for (let i = 1; i <= 4; i++) {
		pointer(
			svg,
			'pointermove',
			{ x: from.x + (dx * i) / 4, y: from.y + (dy * i) / 4 },
			1,
			pointerType
		);
		await nextFrame();
	}
	pointer(svg, 'pointerup', { x: from.x + dx, y: from.y + dy }, 1, pointerType);
	await nextFrame();
}

/**
 * Deux doigts : posés en `a` et `b`, ils vont en `a2` et `b2` en quatre
 * mouvements, puis se lèvent.
 */
async function twoFingers(container: HTMLElement, a: At, b: At, a2: At, b2: At) {
	const svg = canvasOf(container);
	pointer(svg, 'pointerdown', a, 11, 'touch');
	pointer(svg, 'pointerdown', b, 12, 'touch');
	for (let i = 1; i <= 4; i++) {
		const t = i / 4;
		pointer(
			svg,
			'pointermove',
			{ x: a.x + (a2.x - a.x) * t, y: a.y + (a2.y - a.y) * t },
			11,
			'touch'
		);
		pointer(
			svg,
			'pointermove',
			{ x: b.x + (b2.x - b.x) * t, y: b.y + (b2.y - b.y) * t },
			12,
			'touch'
		);
		await nextFrame();
	}
	pointer(svg, 'pointerup', a2, 11, 'touch');
	pointer(svg, 'pointerup', b2, 12, 'touch');
	await nextFrame();
}

function toolButton(container: HTMLElement, label: string): HTMLButtonElement {
	const button = container.querySelector(`[role="toolbar"] button[aria-label="${label}"]`);
	if (!(button instanceof HTMLButtonElement)) throw new Error(`pas d'outil ${label}`);
	return button;
}

/** Les lignes écrites dans la console. */
function consoleLines(container: HTMLElement): string[] {
	return [...container.querySelectorAll('.historique .saisie')].map(
		(p) => p.textContent?.trim() ?? ''
	);
}

function expectNear(actual: At, expected: At, tolerance = 1.5) {
	expect(Math.abs(actual.x - expected.x)).toBeLessThan(tolerance);
	expect(Math.abs(actual.y - expected.y)).toBeLessThan(tolerance);
}

// =============================================================================
// Tests
// =============================================================================

describe('M6 : la vue se déplace et se zoome, sans rien écrire', () => {
	beforeEach(async () => {
		await page.viewport(1280, 900);
	});

	it('Déplacer, glisser sur le fond à la souris : la figure suit, rien n’est écrit', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const steps = atelier.history.steps;
		const container = await mount(atelier);
		const before = drawnAt(container, 'A');

		await slide(container, backgroundOf(container), 60, -40, 'mouse');

		expectNear(drawnAt(container, 'A'), { x: before.x + 60, y: before.y - 40 });
		expect(atelier.get('A')?.definition).toBe('(1 ; 2)');
		expect(atelier.history.steps).toBe(steps);
		expect(consoleLines(container)).toEqual([]);
	});

	it('Déplacer, glisser sur le fond au doigt : la vue se déplace aussi', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const container = await mount(atelier);
		const before = drawnAt(container, 'A');

		await slide(container, backgroundOf(container), -50, 30, 'touch');

		expectNear(drawnAt(container, 'A'), { x: before.x - 50, y: before.y + 30 });
		expect(atelier.get('A')?.definition).toBe('(1 ; 2)');
	});

	it('glisser un point au doigt le déplace, la vue reste où elle est', async () => {
		const atelier = atelierOf([
			['point', 'A', '(1 ; 2)'],
			['point', 'B', '(-2 ; -1)']
		]);
		const container = await mount(atelier);
		const b = drawnAt(container, 'B');

		await slide(container, drawnAt(container, 'A'), 40, 0, 'touch');

		expect(atelier.get('A')?.definition).not.toBe('(1 ; 2)');
		expectNear(drawnAt(container, 'B'), b);
	});

	it('deux doigts qui glissent ensemble déplacent la vue', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const steps = atelier.history.steps;
		const container = await mount(atelier);
		const before = drawnAt(container, 'A');
		const o = backgroundOf(container);

		await twoFingers(
			container,
			o,
			{ x: o.x + 80, y: o.y },
			{ x: o.x + 30, y: o.y + 20 },
			{ x: o.x + 110, y: o.y + 20 }
		);

		expectNear(drawnAt(container, 'A'), { x: before.x + 30, y: before.y + 20 });
		expect(atelier.history.steps).toBe(steps);
	});

	it('deux doigts qui s’écartent zoment autour de leur milieu', async () => {
		const atelier = atelierOf([
			['point', 'A', '(1 ; 2)'],
			['point', 'B', '(-2 ; -1)']
		]);
		const container = await mount(atelier);
		const a = drawnAt(container, 'A');
		const b = drawnAt(container, 'B');
		const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

		// Les doigts passent de 60 à 120 px d'écart, autour du milieu de [AB] : zoom × 2
		await twoFingers(
			container,
			{ x: middle.x - 30, y: middle.y },
			{ x: middle.x + 30, y: middle.y },
			{ x: middle.x - 60, y: middle.y },
			{ x: middle.x + 60, y: middle.y }
		);

		const a2 = drawnAt(container, 'A');
		const b2 = drawnAt(container, 'B');
		expectNear({ x: (a2.x + b2.x) / 2, y: (a2.y + b2.y) / 2 }, middle);
		expect(Math.hypot(a2.x - b2.x, a2.y - b2.y)).toBeCloseTo(
			2 * Math.hypot(a.x - b.x, a.y - b.y),
			0
		);
	});

	it('avec un outil, deux doigts déplacent la vue et ne posent rien', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const container = await mount(atelier);
		toolButton(container, 'Point').click();
		await nextFrame();
		const before = drawnAt(container, 'A');
		const o = backgroundOf(container);

		await twoFingers(
			container,
			o,
			{ x: o.x + 80, y: o.y },
			{ x: o.x - 40, y: o.y },
			{ x: o.x + 40, y: o.y }
		);

		expect(atelier.names).toEqual(['A']);
		expect(consoleLines(container)).toEqual([]);
		expectNear(drawnAt(container, 'A'), { x: before.x - 40, y: before.y });
	});

	it('avec un outil, un appui d’un doigt pose toujours le point', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const container = await mount(atelier);
		toolButton(container, 'Point').click();
		await nextFrame();
		const svg = canvasOf(container);
		const at = backgroundOf(container);

		pointer(svg, 'pointerdown', at, 11, 'touch');
		pointer(svg, 'pointerup', at, 11, 'touch');
		await nextFrame();

		expect(atelier.names.length).toBe(2);
	});
});

describe('M6 : un geste de vue ne laisse rien derrière lui', () => {
	beforeEach(async () => {
		await page.viewport(1280, 900);
	});

	/** Appuyer et relâcher un doigt en `at`. */
	async function tap(container: HTMLElement, at: At, pointerId = 21) {
		pointer(canvasOf(container), 'pointerdown', at, pointerId, 'touch');
		pointer(canvasOf(container), 'pointerup', at, pointerId, 'touch');
		await nextFrame();
	}

	it('après un pincement, un appui d’un doigt pose de nouveau un point', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const container = await mount(atelier);
		toolButton(container, 'Point').click();
		await nextFrame();
		const o = backgroundOf(container);

		await twoFingers(container, o, { x: o.x + 80, y: o.y }, o, { x: o.x + 120, y: o.y });
		await tap(container, { x: o.x + 40, y: o.y - 60 });

		expect(atelier.names.length).toBe(2);
	});

	it('un doigt du pincement annulé par le navigateur : le geste se ferme, l’outil reprend', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const container = await mount(atelier);
		toolButton(container, 'Point').click();
		await nextFrame();
		const svg = canvasOf(container);
		const o = backgroundOf(container);

		pointer(svg, 'pointerdown', o, 11, 'touch');
		pointer(svg, 'pointerdown', { x: o.x + 80, y: o.y }, 12, 'touch');
		pointer(svg, 'pointercancel', o, 11, 'touch');
		pointer(svg, 'pointercancel', { x: o.x + 80, y: o.y }, 12, 'touch');
		await nextFrame();
		await tap(container, { x: o.x + 40, y: o.y - 60 });

		expect(atelier.names.length).toBe(2);
	});

	it('pendant le glisser d’un point au doigt, un second doigt ne déplace pas la vue', async () => {
		const atelier = atelierOf([
			['point', 'A', '(1 ; 2)'],
			['point', 'B', '(-2 ; -1)']
		]);
		const container = await mount(atelier);
		const svg = canvasOf(container);
		const a = drawnAt(container, 'A');
		const b = drawnAt(container, 'B');
		const o = backgroundOf(container);

		pointer(svg, 'pointerdown', a, 11, 'touch');
		pointer(svg, 'pointermove', { x: a.x + 30, y: a.y }, 11, 'touch');
		await nextFrame();
		pointer(svg, 'pointerdown', o, 12, 'touch');
		pointer(svg, 'pointermove', { x: o.x + 100, y: o.y + 50 }, 12, 'touch');
		await nextFrame();
		pointer(svg, 'pointerup', { x: o.x + 100, y: o.y + 50 }, 12, 'touch');
		pointer(svg, 'pointerup', { x: a.x + 30, y: a.y }, 11, 'touch');
		await nextFrame();

		expectNear(drawnAt(container, 'B'), b);
		expect(atelier.get('A')?.definition).not.toBe('(1 ; 2)');
	});

	it('Déplacer : un doigt levé après le pincement, l’autre continue de déplacer la vue', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const container = await mount(atelier);
		const svg = canvasOf(container);
		const o = backgroundOf(container);

		pointer(svg, 'pointerdown', o, 11, 'touch');
		pointer(svg, 'pointerdown', { x: o.x + 80, y: o.y }, 12, 'touch');
		pointer(svg, 'pointerup', { x: o.x + 80, y: o.y }, 12, 'touch');
		await nextFrame();
		const before = drawnAt(container, 'A');
		pointer(svg, 'pointermove', { x: o.x + 25, y: o.y + 15 }, 11, 'touch');
		await nextFrame();
		pointer(svg, 'pointerup', { x: o.x + 25, y: o.y + 15 }, 11, 'touch');
		await nextFrame();

		expectNear(drawnAt(container, 'A'), { x: before.x + 25, y: before.y + 15 });
	});

	it('Déplacer : l’annulation d’un autre doigt ne coupe pas le déplacement de la vue', async () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const container = await mount(atelier);
		const svg = canvasOf(container);
		const before = drawnAt(container, 'A');
		const o = backgroundOf(container);

		pointer(svg, 'pointerdown', o, 1, 'mouse');
		pointer(svg, 'pointermove', { x: o.x + 20, y: o.y }, 1, 'mouse');
		await nextFrame();
		pointer(svg, 'pointercancel', { x: o.x, y: o.y }, 31, 'touch');
		pointer(svg, 'pointermove', { x: o.x + 40, y: o.y }, 1, 'mouse');
		await nextFrame();
		pointer(svg, 'pointerup', { x: o.x + 40, y: o.y }, 1, 'mouse');
		await nextFrame();

		expectNear(drawnAt(container, 'A'), { x: before.x + 40, y: before.y });
	});
});

describe('M6 : sur un téléphone, la toile tient dans l’écran', () => {
	beforeEach(async () => {
		await page.viewport(390, 664);
	});
	afterEach(async () => {
		await page.viewport(1280, 900);
	});

	it('la toile est entière à l’écran, la barre d’outils dessous, sur une ligne', async () => {
		const container = await mountOnPhone(atelierOf());
		await nextFrame();
		const frame = container.getBoundingClientRect();
		const toile = container.querySelector('.figure .toile')?.getBoundingClientRect();
		const outils = container
			.querySelector('[role="toolbar"][aria-label="Outils de géométrie"]')
			?.getBoundingClientRect();
		if (!toile || !outils) throw new Error('vue incomplète');

		// Plus que le plancher de 10rem : la toile prend vraiment la place libre
		expect(toile.height).toBeGreaterThan(180);
		expect(outils.top).toBeGreaterThanOrEqual(toile.bottom - 1);
		expect(toile.bottom).toBeLessThanOrEqual(frame.bottom + 1);
		expect(outils.bottom).toBeLessThanOrEqual(frame.bottom + 1);
		// Une seule rangée d'outils (elle défile de côté), boutons de 44 px au plus
		expect(outils.height).toBeLessThan(60);
	});

	it('une consigne longue ne déplace ni ne rétrécit la toile', async () => {
		const container = await mountOnPhone(atelierOf([['point', 'A', '(1 ; 2)']]));
		const toile = () => container.querySelector('.figure .toile')?.getBoundingClientRect();
		const before = toile();

		toolButton(container, 'Perpendiculaire').click();
		await nextFrame();

		const after = toile();
		expect(after?.top).toBe(before?.top);
		expect(after?.height).toBe(before?.height);
		// La consigne est dite, posée sur le haut de la toile
		const refus = container.querySelector('.figure .refus');
		expect(refus?.textContent?.trim()).not.toBe('');
		const at = refus?.getBoundingClientRect();
		expect(at?.top).toBeGreaterThanOrEqual((after?.top ?? 0) - 1);
		expect(at?.bottom).toBeLessThanOrEqual((after?.bottom ?? 0) + 1);
	});

	it('sans message, la région annoncée reste rendue (un lecteur d’écran l’entend changer)', async () => {
		const container = await mountOnPhone(atelierOf([['point', 'A', '(1 ; 2)']]));
		const refus = container.querySelector('.figure .refus');
		expect(refus?.textContent?.trim()).toBe('');
		expect(refus && getComputedStyle(refus).display).not.toBe('none');
	});
});
