/**
 * Case « figure » : construire la bissectrice d'un angle
 * =====================================================
 *
 * Chantier `controles-figure`, lot 9, PR A (phase 0 validée par David le 2026-11-06,
 * `docs/wip/controles-figure-progress.md` § 25) : `droite d = bissectrice(A, O, B)`.
 * Vrais touchers : l'arc piqué en O, ouvert à l'œil, coupe les côtés en A' et B'
 * (exception 4) ; deux arcs au compas, de A' par B' et de B' par A' ; la règle de O
 * au croisement → juste. À la correction : la bissectrice, les deux demi-angles
 * codés et les arcs de la construction.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FlashCard from '../FlashCard.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';

// Fenêtre 0..12 × 0..8 ; O(2 ; 2), A(8 ; 3), B(4 ; 7). Arc en O par (5 ; 1), rayon √10 :
// A' ≈ (5,12 ; 2,52), B' ≈ (3,17 ; 4,94) ; arcs de rayon A'B' : croisement P ≈ (6,24 ; 5,41)
const BLOCK = [
	'```figure-a-completer',
	'fenetre: 0 ; 12 ; 0 ; 8',
	'verifier: droite d = bissectrice(A, O, B)',
	'---',
	'O = point(2, 2)',
	'A = point(8, 3)',
	'B = point(4, 7)',
	'x = demidroite(O, A)',
	'y = demidroite(O, B)',
	'```'
].join('\n');

const TEMPLATE = {
	id: 'test-bissectrice',
	title: 'Construire une bissectrice',
	status: 'draft',
	type: 'fill_in_blanks',
	variations: [
		{
			statement: templateMarkdown(
				`Construis la bissectrice de l’angle $\\widehat{AOB}$.\n\n${BLOCK}`
			)
		}
	],
	grades: ['6e'],
	level: 1
} as unknown as QuestionTemplate;

function instance(template: QuestionTemplate = TEMPLATE): QuestionInstance {
	const result = generateInstance(template, 42);
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

function button(container: HTMLElement, text: string): HTMLButtonElement {
	const found = [...container.querySelectorAll('button')].find((b) =>
		b.textContent?.includes(text)
	);
	if (!found) throw new Error(`bouton ${text} absent`);
	return found as HTMLButtonElement;
}

const all = (container: HTMLElement, testid: string) =>
	[...container.querySelectorAll(`[data-testid="${testid}"]`)] as SVGElement[];

async function rendered(template?: QuestionTemplate) {
	const { container } = await render(FlashCard, {
		target: mainElement(),
		props: { instance: instance(template), interactive: true }
	});
	return { container, rect: await zone(container) };
}

describe('case « figure » : construire la bissectrice', () => {
	it('arc en O à l’œil, deux arcs au compas, la règle de O au croisement : juste', async () => {
		const { container, rect } = await rendered();
		button(container, 'Compas').click();
		tap(rect, 2, 2.05);
		tap(rect, 5, 1);
		await expect.poll(() => all(container, 'cercle-eleve').length).toBe(1);
		tap(rect, 5.12, 2.55);
		tap(rect, 3.17, 4.9);
		tap(rect, 3.17, 4.9);
		tap(rect, 5.12, 2.55);
		await expect.poll(() => all(container, 'cercle-eleve').length).toBe(3);
		button(container, 'Règle').click();
		tap(rect, 2, 2.05);
		tap(rect, 6.24, 5.45);
		await expect.poll(() => all(container, 'droite-eleve').length).toBe(1);
		button(container, 'Valider').click();
		await expect.poll(() => container.querySelectorAll('.droite-juste').length).toBeGreaterThan(0);
	});

	it('droite tracée à l’œil : faux, la bissectrice, ses demi-angles et ses arcs à la correction', async () => {
		const { container, rect } = await rendered();
		tap(rect, 2, 2.05);
		tap(rect, 6.3, 5.3);
		await expect.poll(() => all(container, 'droite-eleve').length).toBe(1);
		button(container, 'Valider').click();
		await expect
			.poll(() => container.textContent)
			.toContain('Ta bissectrice est tracée à l’œil : construis-la avec tes instruments.');
		await expect.poll(() => all(container, 'bonne-droite').length).toBe(1);
		expect(all(container, 'bonne-bissectrice-demi-angle')).toHaveLength(2);
		expect(all(container, 'bonne-bissectrice-arc')).toHaveLength(3);
	});
});
