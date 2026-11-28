/**
 * Case « figure » : figure composée, un programme de construction en étapes (outil n° 45)
 * ======================================================================================
 *
 * Chantier `outil-equerre-uni`, phase 0 validée par David le 2026-11-28
 * (`docs/wip/outil-equerre-uni-progress.md` § 3) : « Trace [AB] de 6 cm, le cercle de
 * centre A de rayon 2 cm, puis le cercle de diamètre [AB] ». Une seule validation ; le
 * message est celui de la première étape fausse (« Étape n : … ») ; la correction dessine
 * chaque étape (le segment, les règles, les deux cercles, le milieu I).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FlashCard from '../FlashCard.svelte';
import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
import type { QuestionInstance, QuestionTemplate } from '#lib/questions/types.ts';
import { templateMarkdown } from '#lib/ubumark/index.ts';

// Fenêtre 0..12 × 0..10 ; A(4 ; 4)
const BLOCK = [
	'```figure-a-completer',
	'fenetre: 0 ; 12 ; 0 ; 10',
	'outils: segment, regle, compas, point',
	'verifier: segment AB = 6 cm',
	'verifier: cercle c = cercle(A, rayon=2 cm)',
	'verifier: point I = milieu(A, B)',
	'verifier: cercle k = cercle(I, passant=A)',
	'---',
	'A = point(4, 4)',
	'```'
].join('\n');

function instance(): QuestionInstance {
	const template = {
		id: 'test-figure-composee',
		title: 'Construire une figure composée',
		status: 'draft',
		type: 'fill_in_blanks',
		variations: [{ statement: templateMarkdown(`Suis le programme.\n\n${BLOCK}`) }],
		grades: ['CM1'],
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

/** Toucher un endroit, en unités de la figure (fenêtre 0..12 × 0..10) */
function tap(rect: SVGRectElement, x: number, y: number) {
	const box = rect.getBoundingClientRect();
	rect.dispatchEvent(
		new MouseEvent('click', {
			bubbles: true,
			clientX: box.left + (x / 12) * box.width,
			clientY: box.top + ((10 - y) / 10) * box.height
		})
	);
}

function tool(container: HTMLElement, id: string): HTMLButtonElement {
	const found = container.querySelector(`[data-testid="outil-${id}"]`);
	if (!found) throw new Error(`outil ${id} absent`);
	return found as HTMLButtonElement;
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

/** La règle posée en A vers la droite, puis le segment de A jusqu'à la graduation `cm` */
async function drawSegment(container: HTMLElement, rect: SVGRectElement, cm: number) {
	tool(container, 'regle').click();
	tap(rect, 4.02, 4.02);
	tap(rect, 11.5, 4.02);
	await expect.poll(() => all(container, 'regle').length).toBe(1);
	tool(container, 'segment').click();
	tap(rect, 4.02, 4.03);
	tap(rect, 4 + cm + 0.02, 4.03);
}

async function rendered() {
	const { container } = await render(FlashCard, {
		target: mainElement(),
		props: { instance: instance(), interactive: true }
	});
	return { container, rect: await zone(container) };
}

describe('case « figure » : figure composée (outil n° 45)', () => {
	it('palette : Segment, Règle graduée, Compas, Point', async () => {
		const { container } = await rendered();
		for (const id of ['segment', 'regle', 'compas', 'point']) {
			expect(container.querySelector(`[data-testid="outil-${id}"]`)).not.toBeNull();
		}
	});

	it('[AB] de 5 cm : le message de l’étape 1 ; la correction dessine chaque étape', async () => {
		const { container, rect } = await rendered();
		await drawSegment(container, rect, 5);
		button(container, 'Valider').click();
		await expect
			.poll(() => container.textContent)
			.toContain('Étape 1 : Ton segment mesure 5 cm au lieu de 6 cm.');
		// Le segment [AB], les deux cercles (c, puis k de centre I), le milieu I
		await expect.poll(() => all(container, 'bon-segment').length).toBe(1);
		expect(all(container, 'bon-cercle')).toHaveLength(2);
		expect(all(container, 'bon-point')).toHaveLength(1);
		expect(container.querySelector('[data-testid="bon-point"] text')?.textContent).toBe('I');
	});

	it('[AB] juste, rien d’autre : le message de l’étape 2', async () => {
		const { container, rect } = await rendered();
		await drawSegment(container, rect, 6);
		button(container, 'Valider').click();
		await expect
			.poll(() => container.textContent)
			.toContain('Étape 2 : Trace le cercle de centre A et de rayon 2 cm.');
	});
});
