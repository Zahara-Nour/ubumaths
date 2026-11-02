/**
 * Case « figure » : placer le symétrique d'un point sur quadrillage
 * =================================================================
 *
 * Chantier `controles-figure`, lot 2a (phase 0 validée par David le 2026-11-02,
 * `docs/wip/controles-figure-progress.md` § 5) : un toucher place un point, au
 * nœud le plus proche ; juste → en vert ; pas à la même distance → le message,
 * et A' en pointillés avec son nom et [AA'] codé.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FlashCard from '../FlashCard.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';
import { notSameDistanceFeedback } from '$lib/questions/construction/point';

// Fenêtre 0..12 × 0..8 ; axe x = 6 ; A(2 ; 5) → A'(10 ; 5)
const BLOCK = [
	'```figure-a-completer',
	'fenetre: 0 ; 12 ; 0 ; 8',
	'grille: 1',
	"verifier: point A' = symetrie(A, axe=d)",
	'---',
	'P = point(6, 0, visible=faux)',
	'Q = point(6, 8, visible=faux)',
	'd = droite(P, Q)',
	'A = point(2, 5)',
	'```'
].join('\n');

const TEMPLATE = {
	id: 'test-point',
	title: 'Placer un symétrique',
	status: 'draft',
	type: 'fill_in_blanks',
	variations: [
		{
			statement: templateMarkdown(`Place le symétrique du point $A$ par rapport à $d$.\n\n${BLOCK}`)
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

function validateButton(container: HTMLElement): HTMLButtonElement {
	const button = [...container.querySelectorAll('button')].find((b) =>
		b.textContent?.includes('Valider')
	);
	if (!button) throw new Error('bouton Valider absent');
	return button as HTMLButtonElement;
}

const all = (container: HTMLElement, testid: string) =>
	[...container.querySelectorAll(`[data-testid="${testid}"]`)] as SVGElement[];

describe('case « figure » : placer un point sur quadrillage', () => {
	it('le symétrique, touché près du nœud : juste, en vert, pas de correction', async () => {
		const { container } = await render(FlashCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		const rect = await zone(container);
		tap(rect, 10.2, 4.9);
		await expect.poll(() => all(container, 'point-eleve').length).toBe(1);
		validateButton(container).click();
		await expect.poll(() => container.querySelectorAll('.point-juste').length).toBe(1);
		expect(all(container, 'bon-point')).toHaveLength(0);
	});

	it('pas à la même distance : message, et A’ en pointillés avec son nom', async () => {
		const { container } = await render(FlashCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		const rect = await zone(container);
		tap(rect, 9, 5);
		await expect.poll(() => validateButton(container).disabled).toBe(false);
		validateButton(container).click();
		await expect.poll(() => container.textContent).toContain(notSameDistanceFeedback('A', "A'"));
		const good = all(container, 'bon-point');
		expect(good).toHaveLength(1);
		expect(good[0].textContent).toContain('A’');
		// À droite de l'axe x = 6 (moitié de la largeur), aux 10/12 de la largeur
		const circle = good[0].querySelector('circle') as SVGCircleElement;
		expect(circle.cx.baseVal.value / rect.width.baseVal.value).toBeCloseTo(10 / 12, 2);
	});
});
