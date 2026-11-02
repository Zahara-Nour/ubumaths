/**
 * Case « figure » : tracer le symétrique d'un triangle sur quadrillage
 * ====================================================================
 *
 * Chantier `controles-figure`, lot 1 (phase 0 validée par David le 2026-11-02,
 * `docs/wip/controles-figure-progress.md` § 3) : juste → segments en vert ;
 * figure glissée → message « Ta figure a glissé… » et l'image en pointillés,
 * de l'autre côté de l'axe.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FlashCard from '../FlashCard.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';
import { SYMMETRY_SLID_FEEDBACK } from '$lib/questions/construction/symmetry';

// Fenêtre 0..12 × 0..8 ; axe x = 6 ; triangle A(2 ; 2) B(4 ; 2) C(4 ; 6)
const BLOCK = [
	'```figure-a-completer',
	'fenetre: 0 ; 12 ; 0 ; 8',
	'grille: 1',
	'verifier: symetrique par d',
	'---',
	'P = point(6, 0, visible=faux)',
	'Q = point(6, 8, visible=faux)',
	'd = droite(P, Q)',
	'A = point(2, 2)',
	'B = point(4, 2)',
	'C = point(4, 6)',
	'polygone(A, B, C)',
	'```'
].join('\n');

const TEMPLATE = {
	id: 'test-symetrique',
	title: 'Tracer un symétrique',
	status: 'draft',
	type: 'fill_in_blanks',
	variations: [
		{
			statement: templateMarkdown(`Trace le symétrique du triangle par rapport à $d$.\n\n${BLOCK}`)
		}
	],
	grades: ['CM1'],
	theme: 'Test',
	domain: 'Test',
	level: 1
} as unknown as QuestionTemplate;

function instance(): QuestionInstance {
	const result = generateInstance(TEMPLATE, 42);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

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

async function zone(container: HTMLElement): Promise<SVGRectElement> {
	await expect
		.poll(() => container.querySelector('[data-testid="zone-de-trace"]'), { timeout: 5000 })
		.not.toBeNull();
	return container.querySelector('[data-testid="zone-de-trace"]') as SVGRectElement;
}

/** Toucher un endroit, en unités de la figure (fenêtre 0..12 × 0..8) */
function tap(rect: SVGRectElement, x: number, y: number) {
	const box = rect.getBoundingClientRect();
	rect.dispatchEvent(
		new MouseEvent('click', {
			bubbles: true,
			clientX: box.left + (x / 12) * box.width,
			clientY: box.top + ((8 - y) / 8) * box.height
		})
	);
}

function draw(rect: SVGRectElement, ...segments: [number, number, number, number][]) {
	for (const [x1, y1, x2, y2] of segments) {
		tap(rect, x1, y1);
		tap(rect, x2, y2);
	}
}

function validateButton(container: HTMLElement): HTMLButtonElement {
	const button = [...container.querySelectorAll('button')].find((b) =>
		b.textContent?.includes('Valider')
	);
	if (!button) throw new Error('bouton Valider absent');
	return button as HTMLButtonElement;
}

const segments = (container: HTMLElement, testid: string) =>
	[...container.querySelectorAll(`[data-testid="${testid}"]`)] as SVGLineElement[];

describe('case « figure » : symétrique sur quadrillage', () => {
	it('l’image du triangle : juste, en vert, pas de correction', async () => {
		const { container } = await render(FlashCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		const rect = await zone(container);
		draw(rect, [10.2, 1.9, 7.8, 2.1], [8.1, 2.2, 7.9, 5.8], [8.2, 6.1, 9.8, 2.2]);
		await expect.poll(() => segments(container, 'segment-eleve').length).toBe(3);
		validateButton(container).click();
		await expect.poll(() => container.querySelectorAll('.droite-juste').length).toBe(3);
		expect(segments(container, 'bon-segment')).toHaveLength(0);
	});

	it('la figure glissée : message, et l’image en pointillés à droite de l’axe', async () => {
		const { container } = await render(FlashCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		const rect = await zone(container);
		draw(rect, [8, 2, 10, 2], [10, 2, 10, 6], [10, 6, 8, 2]);
		await expect.poll(() => validateButton(container).disabled).toBe(false);
		validateButton(container).click();
		await expect.poll(() => container.textContent).toContain(SYMMETRY_SLID_FEEDBACK);
		const good = segments(container, 'bon-segment');
		expect(good).toHaveLength(3);
		// Tous à droite de l'axe x = 6 (moitié de la largeur)
		const axisX = rect.width.baseVal.value / 2;
		expect(
			Math.min(...good.map((l) => Math.min(l.x1.baseVal.value, l.x2.baseVal.value)))
		).toBeGreaterThan(axisX + 1);
	});
});
