/**
 * Case « figure » : mesurer un segment en posant la règle graduée
 * ===============================================================
 *
 * N° 26 de `outils-manquants.md` (phase 0 validée par David le 2026-11-12,
 * `docs/wip/amelioration-progress.md` § N° 26) : `mesure AB`, la règle graduée
 * seule ; l'élève la pose (0 en A), lit, tape 6 sous la figure → juste ; règle
 * posée le 0 avant A et 7 tapé → « Le 0 de la règle doit être sur A » ; à la
 * correction, la règle posée en A et « 6 cm ».
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FlashCard from '../FlashCard.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';

// Fenêtre 0..12 × 0..6 ; [AB] horizontal de A(2 ; 3) à B(8 ; 3) : 6 cm
const BLOCK = [
	'```figure-a-completer',
	'fenetre: 0 ; 12 ; 0 ; 6',
	'verifier: mesure AB',
	'---',
	'A = point(2, 3)',
	'B = point(8, 3)',
	's = segment(A, B)',
	'```'
].join('\n');

const TEMPLATE = {
	id: 'test-mesure-segment',
	title: 'Mesurer un segment',
	status: 'draft',
	type: 'fill_in_blanks',
	variations: [{ statement: templateMarkdown(`Mesure le segment [AB].\n\n${BLOCK}`) }],
	grades: ['CP'],
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

/** Toucher un endroit, en unités de la figure (fenêtre 0..12 × 0..6) */
function tap(rect: SVGRectElement, x: number, y: number) {
	const box = rect.getBoundingClientRect();
	rect.dispatchEvent(
		new MouseEvent('click', {
			bubbles: true,
			clientX: box.left + (x / 12) * box.width,
			clientY: box.top + ((6 - y) / 6) * box.height
		})
	);
}

function byTestId(container: HTMLElement, id: string): HTMLElement | null {
	return container.querySelector(`[data-testid="${id}"]`);
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

/** Règle posée : le 0 en (x0 ; 3), la direction vers la droite */
async function posedAt(x0: number) {
	const { container, rect } = await rendered();
	await expect.poll(() => container.textContent).toContain('Touche où mettre le 0 de la règle.');
	tap(rect, x0, 3);
	await expect
		.poll(() => container.textContent)
		.toContain('Touche un point dans la direction du segment, pour y poser la règle.');
	tap(rect, 10, 3);
	await expect.poll(() => all(container, 'regle').length).toBe(1);
	return { container, rect };
}

function lengthInput(container: HTMLElement): HTMLInputElement {
	return container.querySelector('[data-testid="mesure-segment"]') as HTMLInputElement;
}

function typeLength(container: HTMLElement, text: string) {
	const input = lengthInput(container);
	input.value = text;
	input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('case « figure » : mesurer un segment à la règle graduée', () => {
	it('la règle seule, posée en A ; ni ‹ › ni segment ; la consigne dit de taper la longueur', async () => {
		const { container } = await posedAt(2);
		expect(byTestId(container, 'outil-segment')).toBeNull();
		expect(byTestId(container, 'regle-moins')).toBeNull();
		expect(byTestId(container, 'regle-retourner')).not.toBeNull();
		await expect
			.poll(() => container.textContent)
			.toContain('Règle posée : lis la longueur du segment, puis tape-la sous la figure.');
		expect(lengthInput(container)).not.toBeNull();
		expect(container.textContent).toContain('Longueur du segment [AB] :');
	});

	it('Valider attend une réponse ; règle posée sans longueur : la consigne ; 6 : juste', async () => {
		const { container } = await rendered();
		await expect.poll(() => button(container, 'Valider').disabled).toBe(true);
		mains.forEach((m) => m.remove());
		mains = [];
		const { container: again } = await posedAt(2);
		await expect.poll(() => button(again, 'Valider').disabled).toBe(false);
		button(again, 'Valider').click();
		await expect
			.poll(() => again.textContent)
			.toContain('Tape la longueur du segment [AB], en cm.');
	});

	it('6 tapé : juste', async () => {
		const { container } = await posedAt(2);
		typeLength(container, '6 cm');
		await expect.poll(() => lengthInput(container).value).toBe('6');
		await expect.poll(() => button(container, 'Valider').disabled).toBe(false);
		button(container, 'Valider').click();
		await expect.poll(() => container.textContent).toContain('réponse juste');
		expect(lengthInput(container).disabled).toBe(true);
	});

	it('règle et longueur se gardent l’une l’autre', async () => {
		const { container, rect } = await posedAt(2);
		typeLength(container, '6');
		tap(rect, 0.8, 3);
		tap(rect, 10, 3);
		await expect.poll(() => all(container, 'regle').length).toBe(1);
		expect(lengthInput(container).value).toBe('6');
	});

	it('0 avant A, 7 tapé : « le 0 doit être sur A » ; à la correction, la règle en A et « 6 cm »', async () => {
		const { container } = await posedAt(0.8);
		typeLength(container, '7');
		await expect.poll(() => button(container, 'Valider').disabled).toBe(false);
		button(container, 'Valider').click();
		await expect
			.poll(() => container.textContent)
			.toContain('Le 0 de la règle doit être sur A : le segment [AB] mesure 6 cm, pas 7 cm.');
		await expect.poll(() => all(container, 'bonne-longueur').length).toBe(1);
		expect(container.querySelector('[data-testid="bonne-longueur"] text')?.textContent).toBe(
			'6 cm'
		);
		expect(all(container, 'bonne-regle')).toHaveLength(1);
	});
});
