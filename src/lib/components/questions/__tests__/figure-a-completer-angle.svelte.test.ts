/**
 * Case « figure » : construire un angle de mesure donnée au rapporteur
 * ====================================================================
 *
 * Chantier `controles-figure`, lot 5 (phase 0 validée par David le 2026-11-03,
 * `docs/wip/controles-figure-progress.md` § 16) : `angle AOy = 50`, palette
 * Rapporteur · Segment ; rapporteur posé en O sur [OA), repère à 50, côté de O au
 * repère → juste ; 130 → « mauvaise graduation », et à la correction le côté et
 * l'arc codé ; ‹ › et Retourner.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FlashCard from '../FlashCard.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';

// Fenêtre 0..10 × 0..8 ; O(4 ; 3), A(10 ; 3), x = [OA) ; rapporteur de rayon 2,8
const BLOCK = [
	'```figure-a-completer',
	'fenetre: 0 ; 10 ; 0 ; 8',
	'verifier: angle AOy = 50',
	'---',
	'O = point(4, 3)',
	'A = point(10, 3)',
	'x = demidroite(O, A)',
	'```'
].join('\n');

const TEMPLATE = {
	id: 'test-angle-rapporteur',
	title: 'Construire un angle',
	status: 'draft',
	type: 'fill_in_blanks',
	variations: [
		{
			statement: templateMarkdown(`Construis l’angle $\\widehat{AOy}$ de mesure 50°.\n\n${BLOCK}`)
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

/**
 * Viser `deg` : toucher près de la graduation (au pixel près, ±1° environ), puis
 * ‹ › jusqu'à elle — ce que fait l'élève
 */
async function aimAt(container: HTMLElement, rect: SVGRectElement, deg: number) {
	const before = all(container, 'repere-eleve').length;
	tapAtDegree(rect, deg);
	await expect.poll(() => all(container, 'repere-eleve').length).toBe(before + 1);
	for (let i = 0; i < 5 && Number(degreeShown(container)) !== deg; i++) {
		const shown = Number(degreeShown(container));
		byTestId(container, shown < deg ? 'rapporteur-plus' : 'rapporteur-moins').click();
		await expect.poll(() => Number(degreeShown(container))).not.toBe(shown);
	}
	expect(degreeShown(container)).toBe(String(deg));
}

/** Toucher le dernier repère placé (le trait du repère, à l'écran) */
function tapLastMark(container: HTMLElement, rect: SVGRectElement) {
	const marks = all(container, 'repere-eleve');
	const box = marks[marks.length - 1].getBoundingClientRect();
	click(rect, box.left + box.width / 2, box.top + box.height / 2);
}

function tool(container: HTMLElement, id: string) {
	(container.querySelector(`[data-testid="outil-${id}"]`) as HTMLButtonElement).click();
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

const degreeShown = (container: HTMLElement) =>
	container.querySelector('[data-testid="rapporteur"]')?.getAttribute('aria-valuenow');

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

describe('case « figure » : construire un angle au rapporteur', () => {
	it('palette : Rapporteur, Segment ; le Rapporteur d’abord', async () => {
		const { container } = await rendered();
		const palette = ['rapporteur', 'segment'].map((id) => byTestId(container, `outil-${id}`));
		expect(palette.map((b) => b?.textContent?.trim())).toEqual(['Rapporteur', 'Segment']);
		expect(palette[0].getAttribute('aria-pressed')).toBe('true');
	});

	it('repère à 50, côté de O au repère : juste', async () => {
		const { container, rect } = await posed();
		await aimAt(container, rect, 50);
		tool(container, 'segment');
		await expect.poll(() => all(container, 'rapporteur').length).toBe(0);
		tap(rect, 4.05, 3.05);
		tapLastMark(container, rect);
		await expect.poll(() => all(container, 'segment-eleve').length).toBe(1);
		button(container, 'Valider').click();
		await expect.poll(() => container.querySelectorAll('.droite-juste').length).toBeGreaterThan(0);
	});

	it('repère à 130 : mauvaise graduation ; à la correction, le côté et l’arc codé', async () => {
		const { container, rect } = await posed();
		await aimAt(container, rect, 130);
		tool(container, 'segment');
		tap(rect, 4.05, 3.05);
		tapLastMark(container, rect);
		await expect.poll(() => all(container, 'segment-eleve').length).toBe(1);
		button(container, 'Valider').click();
		await expect
			.poll(() => container.textContent)
			.toContain('tu as lu la mauvaise graduation du rapporteur');
		await expect.poll(() => all(container, 'bon-segment').length).toBe(1);
		expect(all(container, 'bon-angle')).toHaveLength(1);
		expect(container.querySelector('[data-testid="bon-angle"] text')?.textContent).toBe('50°');
	});

	it('‹ › décalent le repère ; Retourner ; Effacer le repère puis le rapporteur', async () => {
		const { container, rect } = await posed();
		await aimAt(container, rect, 50);
		byTestId(container, 'rapporteur-plus').click();
		await expect.poll(() => degreeShown(container)).toBe('51');
		byTestId(container, 'rapporteur-moins').click();
		byTestId(container, 'rapporteur-moins').click();
		await expect.poll(() => degreeShown(container)).toBe('49');
		// Sous la base : rien, et l'écran dit quoi faire
		tap(rect, 6, 1.5);
		await expect
			.poll(() => container.textContent)
			.toContain('Touche du côté des graduations, ou touche Retourner.');
		byTestId(container, 'rapporteur-retourner').click();
		tap(rect, 6, 1.5);
		await expect.poll(() => all(container, 'repere-eleve').length).toBe(2);
		button(container, 'Effacer').click();
		button(container, 'Effacer').click();
		await expect.poll(() => all(container, 'repere-eleve').length).toBe(0);
		await expect.poll(() => all(container, 'rapporteur').length).toBe(1);
		button(container, 'Effacer').click();
		await expect.poll(() => all(container, 'rapporteur').length).toBe(0);
	});
});
