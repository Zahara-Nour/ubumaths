/**
 * Case « figure » : construire un triangle de trois longueurs données
 * ===================================================================
 *
 * Chantier `controles-figure`, lot 4 (phase 0 validée par David le 2026-11-03,
 * `docs/wip/controles-figure-progress.md` § 13) : `triangle ABC : AC = u ; BC = v`,
 * palette Segment · Compas · Report · Règle ; report de u en A, de v en B, côtés
 * jusqu'à l'intersection → juste ; à la correction, les côtés, les arcs, le codage.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FlashCard from '../FlashCard.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';

// Fenêtre 0..12 × 0..9 ; A(2 ; 2), B(8 ; 2) ; u = 4 de (1 ; 8) à (5 ; 8), v = 3 de (7 ; 8) à (10 ; 8).
// C du haut : (2 + 43/12 ; 2 + √(16 − (43/12)²)) ≈ (5,583 ; 3,778)
const BLOCK = [
	'```figure-a-completer',
	'fenetre: 0 ; 12 ; 0 ; 9',
	'verifier: triangle ABC : AC = u ; BC = v',
	'---',
	'A = point(2, 2)',
	'B = point(8, 2)',
	's = segment(A, B)',
	'u = segment(point(1, 8), point(5, 8))',
	'v = segment(point(7, 8), point(10, 8))',
	'```'
].join('\n');

const TEMPLATE = {
	id: 'test-triangle-longueurs',
	title: 'Construire un triangle',
	status: 'draft',
	type: 'fill_in_blanks',
	variations: [
		{
			statement: templateMarkdown(
				`Construis le triangle $ABC$ tel que $AC = 4$ et $BC = 3$.\n\n${BLOCK}`
			)
		}
	],
	grades: ['6e'],
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

/** Toucher un endroit, en unités de la figure (fenêtre 0..12 × 0..9) */
function tap(rect: SVGRectElement, x: number, y: number) {
	const box = rect.getBoundingClientRect();
	rect.dispatchEvent(
		new MouseEvent('click', {
			bubbles: true,
			clientX: box.left + (x / 12) * box.width,
			clientY: box.top + ((9 - y) / 9) * box.height
		})
	);
}

function tool(container: HTMLElement, id: string) {
	(container.querySelector(`[data-testid="outil-${id}"]`) as HTMLButtonElement).click();
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

async function rendered() {
	const { container } = await render(FlashCard, {
		target: mainElement(),
		props: { instance: instance(), interactive: true }
	});
	return { container, rect: await zone(container) };
}

const C = { x: 2 + 43 / 12, y: 2 + Math.sqrt(16 - (43 / 12) ** 2) };

describe('case « figure » : construire un triangle de trois longueurs', () => {
	it('palette : Segment, Compas, Report, Règle', async () => {
		const { container } = await rendered();
		const palette = ['segment', 'compas', 'report', 'droite'].map(
			(id) => container.querySelector(`[data-testid="outil-${id}"]`) as HTMLButtonElement
		);
		expect(palette.map((b) => b?.textContent?.trim())).toEqual([
			'Segment',
			'Compas',
			'Report',
			'Règle'
		]);
	});

	it('report de u en A, de v en B, côtés jusqu’à l’intersection : juste', async () => {
		const { container, rect } = await rendered();
		tool(container, 'report');
		await expect
			.poll(() => container.textContent)
			.toContain('Touche les deux bouts de la longueur à reporter.');
		// Écartement de u (bouts aimantés), piqué en A
		tap(rect, 1.05, 8.05);
		tap(rect, 4.95, 8.05);
		await expect.poll(() => all(container, 'ecartement').length).toBe(1);
		expect(container.textContent).toContain('Pour une autre longueur, touche Report.');
		tap(rect, 2.05, 2.05);
		await expect.poll(() => all(container, 'report-eleve').length).toBe(1);
		// Autre longueur : reprendre Report, écartement de v, piqué en B
		tool(container, 'report');
		await expect.poll(() => all(container, 'ecartement').length).toBe(0);
		tap(rect, 7.05, 8.05);
		tap(rect, 9.95, 8.05);
		tap(rect, 8.05, 2.05);
		await expect.poll(() => all(container, 'report-eleve').length).toBe(2);
		tool(container, 'segment');
		tap(rect, 2.05, 2.05);
		tap(rect, C.x + 0.05, C.y + 0.05);
		tap(rect, 8.05, 2.05);
		tap(rect, C.x - 0.05, C.y + 0.05);
		await expect.poll(() => all(container, 'segment-eleve').length).toBe(2);
		button(container, 'Valider').click();
		await expect.poll(() => container.querySelectorAll('.droite-juste').length).toBeGreaterThan(0);
	});

	it('sommet à l’œil : faux ; à la correction, côtés, arcs et codage', async () => {
		const { container, rect } = await rendered();
		tool(container, 'segment');
		tap(rect, 2.05, 2.05);
		tap(rect, 5, 5);
		tap(rect, 8.05, 2.05);
		tap(rect, 5, 5);
		await expect.poll(() => all(container, 'segment-eleve').length).toBe(2);
		button(container, 'Valider').click();
		await expect
			.poll(() => container.textContent)
			.toContain('Ton sommet C est placé à l’œil : construis-le avec ton compas.');
		await expect.poll(() => all(container, 'bon-segment').length).toBe(2);
		expect(all(container, 'bon-triangle-arc')).toHaveLength(2);
		// [AC] et u : une marque chacun ; [BC] et v : deux chacun
		expect(all(container, 'bon-triangle-marque')).toHaveLength(6);
	});
});
