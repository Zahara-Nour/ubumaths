/**
 * Case « figure » : construire le cercle circonscrit à un triangle
 * ================================================================
 *
 * Chantier `controles-figure`, lot 3b (phase 0 validée par David le 2026-11-02,
 * `docs/wip/controles-figure-progress.md` § 11) : `cercle c = cercle_circonscrit(A, B, C)`,
 * palette Règle · Équerre · Compas ; deux médiatrices, le compas piqué à leur
 * intersection par A → juste ; à la correction, le cercle, son centre et deux
 * médiatrices.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FlashCard from '../FlashCard.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';

// Fenêtre 0..12 × 0..8 ; A(4 ; 4), B(8 ; 4), C(5 ; 7) : centre (6 ; 5), rayon √5.
// Médiatrice de [AB] : x = 6, par (6 ; 4 ± √12) ; de [AC] : par (4,5 ∓ 1,5√3 ; 5,5 ± √3/2)
const BLOCK = [
	'```figure-a-completer',
	'fenetre: 0 ; 12 ; 0 ; 8',
	'verifier: cercle c = cercle_circonscrit(A, B, C)',
	'---',
	'A = point(4, 4)',
	'B = point(8, 4)',
	'C = point(5, 7)',
	'triangle(A, B, C)',
	'```'
].join('\n');

const TEMPLATE = {
	id: 'test-cercle-circonscrit',
	title: 'Construire un cercle circonscrit',
	status: 'draft',
	type: 'fill_in_blanks',
	variations: [
		{
			statement: templateMarkdown(`Construis le cercle circonscrit au triangle $ABC$.\n\n${BLOCK}`)
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

const R3 = Math.sqrt(3);

describe('case « figure » : construire le cercle circonscrit', () => {
	it('palette : Règle, Équerre, Compas', async () => {
		const { container } = await rendered();
		const palette = ['outil-droite', 'outil-equerre', 'outil-compas'].map(
			(id) => container.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement
		);
		expect(palette.map((b) => b?.textContent?.trim())).toEqual(['Règle', 'Équerre', 'Compas']);
		expect(container.querySelector('[data-testid="outil-point"]')).toBeNull();
	});

	it('deux médiatrices, le compas à leur intersection par A : juste', async () => {
		const { container, rect } = await rendered();
		button(container, 'Compas').click();
		for (const [p, q] of [
			[
				[4, 4],
				[8, 4]
			],
			[
				[8, 4],
				[4, 4]
			],
			[
				[4, 4],
				[5, 7]
			],
			[
				[5, 7],
				[4, 4]
			]
		]) {
			tap(rect, p[0], p[1] + 0.05);
			tap(rect, q[0], q[1] + 0.05);
		}
		await expect.poll(() => all(container, 'cercle-eleve').length).toBe(4);
		button(container, 'Règle').click();
		tap(rect, 6, 4 + 2 * R3 - 0.05);
		tap(rect, 6, 4 - 2 * R3 + 0.05);
		tap(rect, 4.5 - 1.5 * R3 + 0.05, 5.5 + R3 / 2);
		tap(rect, 4.5 + 1.5 * R3 - 0.05, 5.5 - R3 / 2);
		await expect.poll(() => all(container, 'droite-eleve').length).toBe(2);
		button(container, 'Compas').click();
		tap(rect, 6.05, 5.05);
		tap(rect, 4, 4.05);
		await expect.poll(() => all(container, 'cercle-eleve').length).toBe(5);
		button(container, 'Valider').click();
		await expect.poll(() => container.querySelectorAll('.droite-juste').length).toBeGreaterThan(0);
	});

	it('cercle tracé à l’œil : faux, le cercle, son centre et deux médiatrices à la correction', async () => {
		const { container, rect } = await rendered();
		button(container, 'Compas').click();
		tap(rect, 6, 4.8);
		tap(rect, 4, 4.05);
		await expect.poll(() => all(container, 'cercle-eleve').length).toBe(1);
		button(container, 'Valider').click();
		await expect
			.poll(() => container.textContent)
			.toContain('Ton cercle est tracé à l’œil : construis son centre avec tes instruments.');
		await expect.poll(() => all(container, 'bon-cercle').length).toBe(1);
		expect(all(container, 'bon-cercle-mediatrice')).toHaveLength(2);
	});
});
