/**
 * Case « figure » : construire la médiatrice d'un segment
 * ======================================================
 *
 * Chantier `controles-figure`, lot 3 (phase 0 validée par David le 2026-11-02,
 * `docs/archive/wip/controles-figure-progress.md` § 9) : `droite m = mediatrice(A, B)`,
 * palette Règle · Équerre · Compas, et Report (lot 9, § 25 : l'écartement gardé ; la règle d'abord) ; deux cercles, la droite
 * par leurs intersections → juste ; à la correction, la médiatrice en pointillés
 * et son codage.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FlashCard from '../FlashCard.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';

// Fenêtre 0..12 × 0..8 ; A(4 ; 4), B(8 ; 4) : médiatrice x = 6 ;
// cercles de rayon 4 centrés en A et B : intersections (6 ; 4 ± √12)
const BLOCK = [
	'```figure-a-completer',
	'fenetre: 0 ; 12 ; 0 ; 8',
	'verifier: droite m = mediatrice(A, B)',
	'---',
	'A = point(4, 4)',
	'B = point(8, 4)',
	'segment(A, B)',
	'```'
].join('\n');

const TEMPLATE = {
	id: 'test-mediatrice',
	title: 'Construire une médiatrice',
	status: 'draft',
	type: 'fill_in_blanks',
	variations: [
		{
			statement: templateMarkdown(`Construis la médiatrice du segment $[AB]$.\n\n${BLOCK}`)
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

describe('case « figure » : construire la médiatrice', () => {
	it('palette : Règle, Équerre, Compas, Report (lot 9) ; la règle est l’outil de départ', async () => {
		const { container } = await rendered();
		const palette = ['outil-droite', 'outil-equerre', 'outil-compas', 'outil-report'].map(
			(id) => container.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement
		);
		expect(palette.map((b) => b?.textContent?.trim())).toEqual([
			'Règle',
			'Équerre',
			'Compas',
			'Report'
		]);
		expect(palette[0].getAttribute('aria-pressed')).toBe('true');
		expect(container.querySelector('[data-testid="outil-point"]')).toBeNull();
	});

	it('deux cercles, la droite par leurs intersections : juste', async () => {
		const { container, rect } = await rendered();
		button(container, 'Compas').click();
		tap(rect, 4, 4.1);
		tap(rect, 8, 4.1);
		tap(rect, 8, 4.1);
		tap(rect, 4, 4.1);
		await expect.poll(() => all(container, 'cercle-eleve').length).toBe(2);
		button(container, 'Règle').click();
		tap(rect, 6, 7.4);
		tap(rect, 6, 0.6);
		await expect.poll(() => all(container, 'droite-eleve').length).toBe(1);
		button(container, 'Valider').click();
		await expect.poll(() => container.querySelectorAll('.droite-juste').length).toBeGreaterThan(0);
	});

	it('cercles de rayon AB hors de la fenêtre : un écartement au Report, piqué en A et B → juste (lot 9)', async () => {
		// A(3 ; 3), B(9 ; 5) : les cercles de rayon AB se coupent en y ≈ 9,2 et −1,2, hors de
		// la fenêtre ; écartement 4 pris à la main : croisements (6 ; 4) ± 2,45 × (−0,32 ; 0,95)
		const block = BLOCK.replace('A = point(4, 4)', 'A = point(3, 3)').replace(
			'B = point(8, 4)',
			'B = point(9, 5)'
		);
		const template = {
			...TEMPLATE,
			variations: [
				{ statement: templateMarkdown(`Construis la médiatrice du segment $[AB]$.\n\n${block}`) }
			]
		} as unknown as QuestionTemplate;
		const { container, rect } = await rendered(template);
		button(container, 'Report').click();
		tap(rect, 1, 1);
		tap(rect, 5, 1);
		tap(rect, 3, 3.05);
		tap(rect, 9, 5.05);
		await expect.poll(() => all(container, 'report-eleve').length).toBe(2);
		button(container, 'Règle').click();
		tap(rect, 5.25, 6.3);
		tap(rect, 6.75, 1.7);
		await expect.poll(() => all(container, 'droite-eleve').length).toBe(1);
		button(container, 'Valider').click();
		await expect.poll(() => container.querySelectorAll('.droite-juste').length).toBeGreaterThan(0);
	});

	it('droite tracée à l’œil : faux, la médiatrice et son codage à la correction', async () => {
		const { container, rect } = await rendered();
		tap(rect, 6, 7);
		tap(rect, 6, 1);
		await expect.poll(() => all(container, 'droite-eleve').length).toBe(1);
		button(container, 'Valider').click();
		await expect
			.poll(() => container.textContent)
			.toContain('Ta droite est tracée à l’œil : construis-la avec tes instruments.');
		await expect.poll(() => all(container, 'bonne-droite').length).toBe(1);
		expect(all(container, 'codage-mediatrice')).toHaveLength(1);
	});

	it('sur quadrillage, la règle va aux nœuds : droite par deux nœuds juste (revue)', async () => {
		const grid = {
			...TEMPLATE,
			variations: [
				{
					statement: templateMarkdown(
						`Trace la médiatrice de $[AB]$.\n\n${BLOCK.replace('fenetre: 0 ; 12 ; 0 ; 8', 'fenetre: 0 ; 12 ; 0 ; 8\ngrille: 1')}`
					)
				}
			]
		} as unknown as QuestionTemplate;
		const { container, rect } = await rendered(grid);
		// Touchers à côté des nœuds (6 ; 7) et (6 ; 1)
		tap(rect, 6.3, 6.8);
		tap(rect, 5.8, 1.2);
		await expect.poll(() => all(container, 'droite-eleve').length).toBe(1);
		button(container, 'Valider').click();
		await expect.poll(() => container.querySelectorAll('.droite-juste').length).toBeGreaterThan(0);
	});
});
