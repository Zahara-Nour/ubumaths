/**
 * Case « figure » : reproduire un triangle sur quadrillage
 * ========================================================
 *
 * Outil n° 47 (chantier `outil-triangle-quadrillage`, phase 0 validée par David
 * le 2026-11-28, `docs/wip/outil-triangle-quadrillage-progress.md` § 1) :
 * `triangle ABC : reproduit DEF`, le segment seul. Forme 1 : [AB] tracé, l'élève
 * trace [AC] et [BC] ; forme 2 : seul A placé, l'élève trace les trois côtés.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FlashCard from '../FlashCard.svelte';
import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
import type { QuestionInstance, QuestionTemplate } from '#lib/questions/types.ts';
import { templateMarkdown } from '#lib/ubumark/index.ts';

// Fenêtre 0..14 × 0..8 ; modèle D(1 ; 1), E(5 ; 1), F(2 ; 4)
const MODEL = [
	'D = point(1, 1)',
	'E = point(5, 1)',
	'F = point(2, 4)',
	'de = segment(D, E)',
	'ef = segment(E, F)',
	'df = segment(D, F)'
];
const block = (body: string[]) =>
	[
		'```figure-a-completer',
		'fenetre: 0 ; 14 ; 0 ; 8',
		'grille: 1',
		'verifier: triangle ABC : reproduit DEF',
		'---',
		...MODEL,
		...body,
		'```'
	].join('\n');
// Forme 1 : A(8 ; 4), B(12 ; 4) tracés → C(9 ; 7)
const SIDE = block(['A = point(8, 4)', 'B = point(12, 4)', 'ab = segment(A, B)']);
// Forme 2 : A(8 ; 1) seul → B(12 ; 1), C(9 ; 4)
const FREE = block(['A = point(8, 1)']);

function instance(block: string): QuestionInstance {
	const template = {
		id: 'test-triangle-copy',
		title: 'Reproduire un triangle',
		status: 'draft',
		type: 'fill_in_blanks',
		variations: [
			{
				statement: templateMarkdown(`Reproduis le triangle $DEF$.\n\n${block}`)
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

describe('case « figure » : triangle à reproduire sur quadrillage', () => {
	const tap = tapper(14);
	const draw = (rect: SVGRectElement, p: [number, number], q: [number, number]) => {
		tap(rect, p[0] + 0.1, p[1] + 0.1);
		tap(rect, q[0] + 0.1, q[1] + 0.1);
	};

	it('palette : le segment seul', async () => {
		const { container } = await rendered(SIDE);
		expect(byTestId(container, 'outil-compas')).toBeNull();
		expect(byTestId(container, 'outil-report')).toBeNull();
		expect(byTestId(container, 'outil-equerre')).toBeNull();
	});

	it('forme 1 : [AC] et [BC] vers le bon nœud → juste', async () => {
		const { container, rect } = await rendered(SIDE);
		draw(rect, [8, 4], [9, 7]);
		draw(rect, [12, 4], [9, 7]);
		await expect.poll(() => all(container, 'segment-eleve').length).toBe(2);
		button(container, 'Valider').click();
		await expect.poll(() => container.querySelectorAll('.droite-juste').length).toBeGreaterThan(0);
	});

	it('forme 1 : C décalé → message, correction [AC] et [BC]', async () => {
		const { container, rect } = await rendered(SIDE);
		draw(rect, [8, 4], [10, 7]);
		draw(rect, [12, 4], [10, 7]);
		await expect.poll(() => all(container, 'segment-eleve').length).toBe(2);
		button(container, 'Valider').click();
		await expect
			.poll(() => container.textContent)
			.toContain(
				'Ton sommet C n’est pas au bon endroit : compte les carreaux depuis A sur le modèle.'
			);
		await expect.poll(() => all(container, 'bon-segment').length).toBe(2);
		expect(all(container, 'bon-triangle-arc')).toHaveLength(0);
	});

	it('forme 2 : triangle retourné → message, correction des trois côtés', async () => {
		const { container, rect } = await rendered(FREE);
		draw(rect, [8, 1], [4, 1]);
		draw(rect, [4, 1], [7, 4]);
		draw(rect, [7, 4], [8, 1]);
		await expect.poll(() => all(container, 'segment-eleve').length).toBe(3);
		button(container, 'Valider').click();
		await expect
			.poll(() => container.textContent)
			.toContain('Ton triangle est retourné par rapport au modèle.');
		await expect.poll(() => all(container, 'bon-segment').length).toBe(3);
	});
});
