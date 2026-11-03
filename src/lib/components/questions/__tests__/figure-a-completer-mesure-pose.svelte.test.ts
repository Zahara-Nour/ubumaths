/**
 * Case « figure » : mesurer un angle, rapporteur déjà posé
 * ========================================================
 *
 * Chantier `controles-figure`, lot 8 (phase 0 validée par David le 2026-11-03,
 * `docs/wip/controles-figure-progress.md` § 23) : `mesure AOB, rapporteur posé`.
 * Le rapporteur est là dès le chargement, figé ; aucun outil, aucun Effacer ;
 * l'élève tape la mesure. Le rapporteur reste posé à la correction.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FlashCard from '../FlashCard.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';

const BLOCK = [
	'```figure-a-completer',
	'fenetre: 0 ; 10 ; 0 ; 8',
	'verifier: mesure AOB, rapporteur posé',
	'---',
	'O = point(4, 3)',
	'A = point(9, 3)',
	'B = rotation(A, angle=50, centre=O)',
	'x = demidroite(O, A)',
	'y = demidroite(O, B)',
	'```'
].join('\n');

const TEMPLATE = {
	id: 'test-mesure-rapporteur-pose',
	title: 'Lire un angle',
	status: 'draft',
	type: 'fill_in_blanks',
	variations: [
		{ statement: templateMarkdown(`Lis la mesure de l’angle $\\widehat{AOB}$.\n\n${BLOCK}`) }
	],
	grades: ['6e'],
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

/**
 * La figure de l'élève : celle qui porte la case de la mesure (la réponse
 * attendue, `expected-result`, recopie la figure, rapporteur posé compris)
 */
function own(container: HTMLElement): HTMLElement {
	const input = container.querySelector('[data-testid="mesure-angle"]');
	return (input?.closest('.figure-a-completer') as HTMLElement | null) ?? container;
}

const all = (container: HTMLElement, testid: string) =>
	[...own(container).querySelectorAll(`[data-testid="${testid}"]`)] as SVGElement[];

function button(container: HTMLElement, text: string): HTMLButtonElement | undefined {
	return [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(text)) as
		HTMLButtonElement | undefined;
}

function measureInput(container: HTMLElement): HTMLInputElement {
	return container.querySelector('[data-testid="mesure-angle"]') as HTMLInputElement;
}

function typeMeasure(container: HTMLElement, text: string) {
	const input = measureInput(container);
	input.value = text;
	input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function rendered() {
	const { container } = await render(FlashCard, {
		target: mainElement(),
		props: { instance: instance(), interactive: true }
	});
	await expect.poll(() => all(container, 'rapporteur-pose').length, { timeout: 5000 }).toBe(1);
	return container;
}

describe('case « figure » : rapporteur déjà posé', () => {
	it('posé au chargement ; ni outil, ni Effacer, ni zone de tracé ; la consigne de lecture', async () => {
		const container = await rendered();
		expect(all(container, 'rapporteur')).toHaveLength(0);
		expect(container.querySelector('[data-testid^="outil-"]')).toBeNull();
		expect(button(container, 'Effacer')).toBeUndefined();
		expect(container.querySelector('[data-testid="zone-de-trace"]')).toBeNull();
		expect(container.textContent).toContain(
			'Lis la mesure sur le rapporteur, puis tape-la sous la figure.'
		);
		expect(measureInput(container)).not.toBeNull();
	});

	it('50 : juste ; le rapporteur reste posé', async () => {
		const container = await rendered();
		typeMeasure(container, '50');
		await expect.poll(() => button(container, 'Valider')?.disabled).toBe(false);
		button(container, 'Valider')?.click();
		await expect.poll(() => container.textContent).toContain('réponse juste');
		expect(all(container, 'rapporteur-pose')).toHaveLength(1);
	});

	it('130 : mauvaise graduation ; à la correction, l’arc codé et le rapporteur', async () => {
		const container = await rendered();
		typeMeasure(container, '130');
		await expect.poll(() => button(container, 'Valider')?.disabled).toBe(false);
		button(container, 'Valider')?.click();
		await expect
			.poll(() => container.textContent)
			.toContain('L’angle mesure 50°, pas 130° : tu as lu la mauvaise graduation du rapporteur.');
		await expect.poll(() => all(container, 'bon-angle').length).toBe(1);
		expect(all(container, 'rapporteur-pose')).toHaveLength(1);
	});
});
