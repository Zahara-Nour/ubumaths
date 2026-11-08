/**
 * Case « figure » : construire un triangle rectangle
 * ==================================================
 *
 * Chantier `cercle-triangle-rectangle`, n° 20 (phase 0 validée par David le
 * 2026-11-08, `docs/wip/cercle-triangle-rectangle-progress.md` § 3). Papier uni :
 * `CAB = 90 ; AC = u`, palette Segment · Équerre · Report ; équerre le long de
 * [AB] en A, report de u en A, côtés → juste. Quadrillage : `AC = 4 carreaux`,
 * le segment seul. À la correction, l'angle droit codé (et la perpendiculaire
 * sur papier uni).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FlashCard from '../FlashCard.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';

// Papier uni : fenêtre 0..12 × 0..8 ; A(3 ; 2), B(9 ; 2) ; u de longueur 4 → C(3 ; 6)
const PLAIN = [
	'```figure-a-completer',
	'fenetre: 0 ; 12 ; 0 ; 8',
	'verifier: triangle ABC : CAB = 90 ; AC = u',
	'---',
	'A = point(3, 2)',
	'B = point(9, 2)',
	's = segment(A, B)',
	'u = segment(point(6, 6.5), point(10, 6.5))',
	'```'
].join('\n');

// Quadrillage : fenêtre 0..10 × 0..8 ; A(2 ; 2), B(8 ; 2) ; AC = 4 carreaux → C(2 ; 6)
const GRID = [
	'```figure-a-completer',
	'fenetre: 0 ; 10 ; 0 ; 8',
	'grille: 1',
	'verifier: triangle ABC : CAB = 90 ; AC = 4 carreaux',
	'---',
	'A = point(2, 2)',
	'B = point(8, 2)',
	's = segment(A, B)',
	'```'
].join('\n');

function instance(block: string): QuestionInstance {
	const template = {
		id: 'test-triangle-rectangle',
		title: 'Construire un triangle rectangle',
		status: 'draft',
		type: 'fill_in_blanks',
		variations: [
			{
				statement: templateMarkdown(`Construis le triangle $ABC$ rectangle en $A$.\n\n${block}`)
			}
		],
		grades: ['CE2'],
		level: 1
	} as unknown as QuestionTemplate;
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

function click(rect: SVGRectElement, clientX: number, clientY: number) {
	rect.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX, clientY }));
}

/** Toucher un endroit, en unités de la figure (fenêtre 0..width × 0..8) */
function tapper(width: number) {
	return (rect: SVGRectElement, x: number, y: number) => {
		const box = rect.getBoundingClientRect();
		click(rect, box.left + (x / width) * box.width, box.top + ((8 - y) / 8) * box.height);
	};
}

function byTestId(container: HTMLElement, id: string): HTMLButtonElement {
	return container.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement;
}

function tool(container: HTMLElement, id: string) {
	byTestId(container, `outil-${id}`).click();
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

async function rendered(block: string) {
	const { container } = await render(FlashCard, {
		target: mainElement(),
		props: { instance: instance(block), interactive: true }
	});
	return { container, rect: await zone(container) };
}

describe('case « figure » : triangle rectangle sur papier uni', () => {
	const tap = tapper(12);

	it('palette : Segment, Équerre, Report', async () => {
		const { container } = await rendered(PLAIN);
		const palette = ['segment', 'equerre', 'report'].map((id) =>
			byTestId(container, `outil-${id}`)
		);
		expect(palette.map((b) => b?.textContent?.trim())).toEqual(['Segment', 'Équerre', 'Report']);
		expect(byTestId(container, 'outil-rapporteur')).toBeNull();
	});

	it('équerre le long de [AB] en A, report de u en A, côtés : juste', async () => {
		const { container, rect } = await rendered(PLAIN);
		tool(container, 'equerre');
		tap(rect, 6, 2.05);
		await expect.poll(() => all(container, 'droite-choisie').length).toBe(1);
		tap(rect, 3.05, 2.05);
		await expect.poll(() => all(container, 'droite-eleve').length).toBe(1);
		tool(container, 'report');
		tap(rect, 6.05, 6.55);
		tap(rect, 9.95, 6.55);
		await expect.poll(() => all(container, 'ecartement').length).toBe(1);
		tap(rect, 3.05, 2.05);
		await expect.poll(() => all(container, 'report-eleve').length).toBe(1);
		tool(container, 'segment');
		tap(rect, 3.05, 2.05);
		tap(rect, 3.05, 6.05);
		tap(rect, 9.05, 2.05);
		tap(rect, 3.05, 5.95);
		await expect.poll(() => all(container, 'segment-eleve').length).toBe(2);
		button(container, 'Valider').click();
		await expect.poll(() => container.querySelectorAll('.droite-juste').length).toBeGreaterThan(0);
	});

	it('côté à l’œil : faux ; à la correction, perpendiculaire et angle droit codé', async () => {
		const { container, rect } = await rendered(PLAIN);
		tool(container, 'segment');
		tap(rect, 3.05, 2.05);
		tap(rect, 4, 5);
		tap(rect, 9.05, 2.05);
		tap(rect, 4, 5);
		await expect.poll(() => all(container, 'segment-eleve').length).toBe(2);
		button(container, 'Valider').click();
		await expect
			.poll(() => container.textContent)
			.toContain('Ton côté [AC] est tracé à l’œil : utilise l’équerre.');
		await expect.poll(() => all(container, 'bon-segment').length).toBe(2);
		expect(all(container, 'bon-triangle-perpendiculaire')).toHaveLength(1);
		expect(all(container, 'bon-triangle-angle-droit')).toHaveLength(1);
		expect(all(container, 'bon-triangle-arc')).toHaveLength(1);
	});
});

describe('case « figure » : triangle rectangle sur quadrillage', () => {
	const tap = tapper(10);

	it('palette : le segment seul', async () => {
		const { container } = await rendered(GRID);
		expect(byTestId(container, 'outil-equerre')).toBeNull();
		expect(byTestId(container, 'outil-report')).toBeNull();
	});

	it('[AC] de 4 carreaux, [BC] : juste', async () => {
		const { container, rect } = await rendered(GRID);
		tap(rect, 2.1, 2.1);
		tap(rect, 2.1, 6.1);
		tap(rect, 8.1, 2.1);
		tap(rect, 1.9, 5.9);
		await expect.poll(() => all(container, 'segment-eleve').length).toBe(2);
		button(container, 'Valider').click();
		await expect.poll(() => container.querySelectorAll('.droite-juste').length).toBeGreaterThan(0);
	});

	it('5 carreaux : faux, le message compte ; angle droit codé, sans perpendiculaire', async () => {
		const { container, rect } = await rendered(GRID);
		tap(rect, 2.1, 2.1);
		tap(rect, 2.1, 7.1);
		tap(rect, 8.1, 2.1);
		tap(rect, 1.9, 6.9);
		await expect.poll(() => all(container, 'segment-eleve').length).toBe(2);
		button(container, 'Valider').click();
		await expect
			.poll(() => container.textContent)
			.toContain('Ton côté [AC] mesure 5 carreaux au lieu de 4.');
		await expect.poll(() => all(container, 'bon-triangle-angle-droit').length).toBe(1);
		expect(all(container, 'bon-triangle-perpendiculaire')).toHaveLength(0);
	});
});
