/**
 * Case « figure » : mesurer un angle au rapporteur
 * ================================================
 *
 * Chantier `controles-figure`, lot 6 (phase 0 validée par David le 2026-11-03,
 * `docs/wip/controles-figure-progress.md` § 19) : `mesure AOB`, le rapporteur
 * seul ; l'élève le pose en O sur [OA), lit, tape 50 sous la figure → juste ;
 * 130 → « mauvaise graduation », et à la correction l'arc codé « 50° ».
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FlashCard from '../FlashCard.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';

// Fenêtre 0..10 × 0..8 ; O(4 ; 3), [OA) horizontal, [OB) à 50° ; rapporteur de rayon 2,8
const BLOCK = [
	'```figure-a-completer',
	'fenetre: 0 ; 10 ; 0 ; 8',
	'verifier: mesure AOB',
	'---',
	'O = point(4, 3)',
	'A = point(9, 3)',
	'B = rotation(A, angle=50, centre=O)',
	'x = demidroite(O, A)',
	'y = demidroite(O, B)',
	'```'
].join('\n');

const TEMPLATE = {
	id: 'test-mesure-rapporteur',
	title: 'Mesurer un angle',
	status: 'draft',
	type: 'fill_in_blanks',
	variations: [
		{
			statement: templateMarkdown(`Mesure l’angle $\\widehat{AOB}$.\n\n${BLOCK}`)
		}
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

async function zone(container: HTMLElement): Promise<SVGRectElement> {
	await expect
		.poll(() => container.querySelector('[data-testid="zone-de-trace"]'), { timeout: 5000 })
		.not.toBeNull();
	return container.querySelector('[data-testid="zone-de-trace"]') as SVGRectElement;
}

function click(rect: SVGRectElement, clientX: number, clientY: number) {
	rect.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX, clientY }));
}

/** Toucher un endroit, en unités de la figure (fenêtre 0..10 × 0..8) */
function tap(rect: SVGRectElement, x: number, y: number) {
	const box = rect.getBoundingClientRect();
	click(rect, box.left + (x / 10) * box.width, box.top + ((8 - y) / 8) * box.height);
}

/** Toucher dans la direction faisant `deg` degrés avec [OA), à 2,5 unités de O */
function tapAtDegree(rect: SVGRectElement, deg: number) {
	const angle = (deg * Math.PI) / 180;
	tap(rect, 4 + 2.5 * Math.cos(angle), 3 + 2.5 * Math.sin(angle));
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

async function rendered() {
	const { container } = await render(FlashCard, {
		target: mainElement(),
		props: { instance: instance(), interactive: true }
	});
	return { container, rect: await zone(container) };
}

/** Rapporteur posé : centre O, base sur [OA) (touchée entre O et A) */
async function posed() {
	const { container, rect } = await rendered();
	await expect
		.poll(() => container.textContent)
		.toContain('Touche où piquer le centre du rapporteur.');
	tap(rect, 4.05, 3.05);
	await expect
		.poll(() => container.textContent)
		.toContain('Touche un point du côté, pour y poser la base du rapporteur.');
	tap(rect, 7, 3.05);
	await expect.poll(() => all(container, 'rapporteur').length).toBe(1);
	return { container, rect };
}

function measureInput(container: HTMLElement): HTMLInputElement {
	return container.querySelector('[data-testid="mesure-angle"]') as HTMLInputElement;
}

function typeMeasure(container: HTMLElement, text: string) {
	const input = measureInput(container);
	input.value = text;
	input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('case « figure » : mesurer un angle au rapporteur', () => {
	it('le rapporteur seul, posé en O ; la consigne dit de taper la mesure', async () => {
		const { container } = await posed();
		expect(byTestId(container, 'outil-segment')).toBeNull();
		await expect
			.poll(() => container.textContent)
			.toContain('Lis la mesure sur le rapporteur, puis tape-la sous la figure.');
		expect(measureInput(container)).not.toBeNull();
	});

	it('Valider attend une mesure ; chiffres seulement ; 50 : juste', async () => {
		const { container } = await rendered();
		expect(button(container, 'Valider').disabled).toBe(true);
		typeMeasure(container, '5a0°');
		await expect.poll(() => measureInput(container).value).toBe('50');
		await expect.poll(() => button(container, 'Valider').disabled).toBe(false);
		button(container, 'Valider').click();
		await expect.poll(() => container.textContent).toContain('réponse juste');
		expect(measureInput(container).disabled).toBe(true);
	});

	it('« 50,5 » : 50 gardé, et la consigne du degré près (revue)', async () => {
		const { container } = await rendered();
		typeMeasure(container, '50,5');
		await expect.poll(() => measureInput(container).value).toBe('50');
		await expect
			.poll(() => container.textContent)
			.toContain('Au degré près : tape un nombre entier.');
		typeMeasure(container, '51');
		await expect.poll(() => byTestId(container, 'mesure-consigne')).toBeNull();
	});

	it('repère et mesure se gardent l’un l’autre', async () => {
		const { container, rect } = await posed();
		typeMeasure(container, '50');
		tapAtDegree(rect, 50);
		await expect.poll(() => all(container, 'repere-eleve').length).toBe(1);
		expect(measureInput(container).value).toBe('50');
		typeMeasure(container, '49');
		await expect.poll(() => measureInput(container).value).toBe('49');
		expect(all(container, 'repere-eleve')).toHaveLength(1);
	});

	it('130 : mauvaise graduation ; à la correction, l’arc codé « 50° »', async () => {
		const { container } = await rendered();
		typeMeasure(container, '130');
		await expect.poll(() => button(container, 'Valider').disabled).toBe(false);
		button(container, 'Valider').click();
		await expect
			.poll(() => container.textContent)
			.toContain('L’angle mesure 50°, pas 130° : tu as lu la mauvaise graduation du rapporteur.');
		await expect.poll(() => all(container, 'bon-angle').length).toBe(1);
		expect(container.querySelector('[data-testid="bon-angle"] text')?.textContent).toBe('50°');
	});
});
