/**
 * Case « figure » : tracer un segment de longueur donnée à la règle graduée
 * =========================================================================
 *
 * Chantier `regle-graduee` (CE2-039, ADR 0036, comportements validés par David
 * le 2026-11-08, `docs/wip/regle-graduee-progress.md` § 2) : `segment AB = 6 cm`,
 * palette Règle graduée · Segment ; règle posée en A, segment de A jusqu'à la
 * graduation 6 (le bout s'aimante au millimètre) → juste ; ‹ › décalent le bout
 * d'1 mm (5,8 cm → message), à la correction la règle et le bon segment ;
 * Retourner, Effacer. PR 2 (§ 4) : `segment AB = 6 cm sur [Ax)`, la règle
 * s'aimante à la demi-droite au 2e toucher.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FlashCard from '../FlashCard.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';

// Fenêtre 0..10 × 0..8 ; A(2 ; 4) ; règle de 10 cm
const BLOCK = [
	'```figure-a-completer',
	'fenetre: 0 ; 10 ; 0 ; 8',
	'verifier: segment AB = 6 cm',
	'---',
	'A = point(2, 4)',
	'```'
].join('\n');

// PR 2 : [Ax) de A(4 ; 4) vers X(8 ; 7), direction (0,8 ; 0,6) ; 6 cm → (8,8 ; 7,6)
const RAY_BLOCK = [
	'```figure-a-completer',
	'fenetre: 0 ; 10 ; 0 ; 8',
	'verifier: segment AB = 6 cm sur [Ax)',
	'---',
	'A = point(4, 4)',
	'X = point(8, 7, visible=faux)',
	'x = demidroite(A, X)',
	'```'
].join('\n');

const templateOf = (block: string) =>
	({
		id: 'test-regle-graduee',
		title: 'Tracer un segment',
		status: 'draft',
		type: 'fill_in_blanks',
		variations: [
			{ statement: templateMarkdown(`Trace le segment [AB] de longueur 6 cm.\n\n${block}`) }
		],
		grades: ['CE2'],
		level: 1
	}) as unknown as QuestionTemplate;

function instance(block = BLOCK): QuestionInstance {
	const result = generateInstance(templateOf(block), 42);
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

/** Longueur (mm) du segment tracé le long de la règle, lue sur la règle */
const mmShown = (container: HTMLElement) =>
	container.querySelector('[data-testid="regle"]')?.getAttribute('aria-valuenow');

async function rendered(block = BLOCK) {
	const { container } = await render(FlashCard, {
		target: mainElement(),
		props: { instance: instance(block), interactive: true }
	});
	return { container, rect: await zone(container) };
}

/** Règle posée : le 0 en A (touché à côté), la direction vers la droite */
async function posed() {
	const { container, rect } = await rendered();
	await expect.poll(() => container.textContent).toContain('Touche où mettre le 0 de la règle.');
	tap(rect, 2.05, 4.05);
	await expect
		.poll(() => container.textContent)
		.toContain('Touche un point dans la direction du segment, pour y poser la règle.');
	tap(rect, 9, 4);
	await expect.poll(() => all(container, 'regle').length).toBe(1);
	return { container, rect };
}

/** Segment de A jusqu'à près de la graduation 6 (le bout s'aimante au mm) */
async function drawSix(container: HTMLElement, rect: SVGRectElement) {
	tool(container, 'segment');
	// La règle reste posée en changeant d'outil
	await expect.poll(() => all(container, 'regle').length).toBe(1);
	tap(rect, 2.05, 4.05);
	tap(rect, 8.02, 4.15);
	await expect.poll(() => all(container, 'segment-eleve').length).toBe(1);
	await expect.poll(() => mmShown(container)).toBe('60');
}

describe('case « figure » : tracer un segment à la règle graduée', () => {
	it('palette : Règle graduée, Segment ; la Règle graduée d’abord', async () => {
		const { container } = await rendered();
		const palette = ['regle', 'segment'].map((id) => byTestId(container, `outil-${id}`));
		expect(palette.map((b) => b?.textContent?.trim())).toEqual(['Règle graduée', 'Segment']);
		expect(palette[0].getAttribute('aria-pressed')).toBe('true');
	});

	it('règle posée en A, segment jusqu’à la graduation 6 : juste', async () => {
		const { container, rect } = await posed();
		await drawSix(container, rect);
		button(container, 'Valider').click();
		await expect.poll(() => container.querySelectorAll('.droite-juste').length).toBeGreaterThan(0);
	});

	it('‹ › décalent le bout d’1 mm : 5,8 cm → message ; à la correction, la règle et le segment', async () => {
		const { container, rect } = await posed();
		await drawSix(container, rect);
		byTestId(container, 'regle-moins').click();
		await expect.poll(() => mmShown(container)).toBe('59');
		byTestId(container, 'regle-moins').click();
		await expect.poll(() => mmShown(container)).toBe('58');
		button(container, 'Valider').click();
		await expect
			.poll(() => container.textContent)
			.toContain('Ton segment mesure 5,8 cm au lieu de 6 cm.');
		await expect.poll(() => all(container, 'bon-segment').length).toBe(1);
		expect(all(container, 'bonne-regle')).toHaveLength(1);
	});

	it('un petit segment (1 mm) se trace au toucher : sur le bord de la règle, la graduation passe avant A', async () => {
		const { container, rect } = await posed();
		tool(container, 'segment');
		tap(rect, 2.05, 4.05);
		tap(rect, 2.1, 4.03);
		await expect.poll(() => all(container, 'segment-eleve').length).toBe(1);
		await expect.poll(() => mmShown(container)).toBe('1');
	});

	it('Retourner ; Effacer le segment puis la règle', async () => {
		const { container, rect } = await posed();
		await drawSix(container, rect);
		byTestId(container, 'regle-plus').click();
		await expect.poll(() => mmShown(container)).toBe('61');
		byTestId(container, 'regle-retourner').click();
		await expect.poll(() => byTestId(container, 'regle').getAttribute('data-sens')).toBe('-1');
		button(container, 'Effacer').click();
		await expect.poll(() => all(container, 'segment-eleve').length).toBe(0);
		await expect.poll(() => all(container, 'regle').length).toBe(1);
		button(container, 'Effacer').click();
		await expect.poll(() => all(container, 'regle').length).toBe(0);
	});
});

describe('case « figure » : segment sur une demi-droite donnée (PR 2)', () => {
	it('2e toucher à côté de [Ax) : la règle s’aimante à la demi-droite ; 6 cm le long → juste', async () => {
		const { container, rect } = await rendered(RAY_BLOCK);
		tap(rect, 4.05, 4.05);
		// Sur [Ax), y = 6,25 en x = 7 : toucher un peu au-dessus
		tap(rect, 7, 6.33);
		await expect.poll(() => all(container, 'regle').length).toBe(1);
		tool(container, 'segment');
		tap(rect, 4.05, 4.05);
		tap(rect, 8.82, 7.63);
		await expect.poll(() => all(container, 'segment-eleve').length).toBe(1);
		await expect.poll(() => mmShown(container)).toBe('60');
		button(container, 'Valider').click();
		await expect.poll(() => container.querySelectorAll('.droite-juste').length).toBeGreaterThan(0);
	});

	it('règle posée à l’horizontale, 6 cm : « Trace ton segment sur la demi-droite [Ax). »', async () => {
		const { container, rect } = await rendered(RAY_BLOCK);
		tap(rect, 4.05, 4.05);
		tap(rect, 9, 4);
		await expect.poll(() => all(container, 'regle').length).toBe(1);
		tool(container, 'segment');
		tap(rect, 4.05, 4.05);
		tap(rect, 10, 4.1);
		await expect.poll(() => mmShown(container)).toBe('60');
		button(container, 'Valider').click();
		await expect
			.poll(() => container.textContent)
			.toContain('Trace ton segment sur la demi-droite [Ax).');
		await expect.poll(() => all(container, 'bon-segment').length).toBe(1);
	});
});

// PR 3 : cercle de centre O(5 ; 4), de rayon 3 cm ; fenêtre 0..10 × 0..8, règle de 10 cm
const CIRCLE_BLOCK = [
	'```figure-a-completer',
	'fenetre: 0 ; 10 ; 0 ; 8',
	'verifier: cercle c = cercle(O, rayon=3 cm)',
	'---',
	'O = point(5, 4)',
	'```'
].join('\n');

/** Règle posée en O vers la droite, puis le compas piqué en O */
async function circleRuler() {
	const { container, rect } = await rendered(CIRCLE_BLOCK);
	tap(rect, 5.05, 4.05);
	await expect
		.poll(() => container.textContent)
		.toContain('Touche un point dans la direction où ouvrir le compas, pour y poser la règle.');
	tap(rect, 9, 4);
	await expect.poll(() => all(container, 'regle').length).toBe(1);
	await expect.poll(() => container.textContent).toContain('touche Compas');
	tool(container, 'compas');
	await expect.poll(() => container.textContent).toContain('Pique le compas au 0 de la règle');
	tap(rect, 5.05, 4.05);
	return { container, rect };
}

describe('case « figure » : cercle de rayon donné en cm (PR 3)', () => {
	it('palette : Règle graduée, Compas ; l’ouverture s’aimante à la graduation 3 → juste', async () => {
		const { container, rect } = await circleRuler();
		const palette = ['regle', 'compas'].map((id) => byTestId(container, `outil-${id}`));
		expect(palette.map((b) => b?.textContent?.trim())).toEqual(['Règle graduée', 'Compas']);
		tap(rect, 8.03, 4.12);
		await expect.poll(() => all(container, 'cercle-eleve').length).toBe(1);
		await expect.poll(() => mmShown(container)).toBe('30');
		button(container, 'Valider').click();
		await expect.poll(() => container.querySelectorAll('.droite-juste').length).toBeGreaterThan(0);
	});

	it('‹ › décalent l’ouverture d’1 mm : 2,9 cm → message ; à la correction, la règle et le cercle', async () => {
		const { container, rect } = await circleRuler();
		tap(rect, 8.03, 4.12);
		await expect.poll(() => mmShown(container)).toBe('30');
		byTestId(container, 'regle-moins').click();
		await expect.poll(() => mmShown(container)).toBe('29');
		button(container, 'Valider').click();
		await expect
			.poll(() => container.textContent)
			.toContain('Ton cercle a un rayon de 2,9 cm au lieu de 3 cm.');
		await expect.poll(() => all(container, 'bon-cercle').length).toBe(1);
		expect(all(container, 'bonne-regle')).toHaveLength(1);
	});
});
