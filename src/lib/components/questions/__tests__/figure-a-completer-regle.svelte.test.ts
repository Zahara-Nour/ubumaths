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
import type { Position } from '$lib/questions/construction/judge';
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

// PR 4 : triangle rectangle en A(2 ; 2), B(8 ; 2), AC = 4 cm → C(2 ; 6) ; règle de 10 cm
const TRIANGLE_BLOCK = [
	'```figure-a-completer',
	'fenetre: 0 ; 10 ; 0 ; 8',
	'verifier: triangle ABC : CAB = 90 ; AC = 4 cm',
	'---',
	'A = point(2, 2)',
	'B = point(8, 2)',
	's = segment(A, B)',
	'```'
].join('\n');

/** L'équerre le long de [AB] en A, puis la règle posée en A, aimantée à la perpendiculaire */
async function squareAndRuler() {
	const { container, rect } = await rendered(TRIANGLE_BLOCK);
	tool(container, 'equerre');
	tap(rect, 5, 2.05);
	await expect.poll(() => all(container, 'droite-choisie').length).toBe(1);
	tap(rect, 2.05, 2.05);
	await expect.poll(() => all(container, 'droite-eleve').length).toBe(1);
	tool(container, 'regle');
	tap(rect, 2.05, 2.05);
	tap(rect, 2.12, 5);
	await expect.poll(() => all(container, 'regle').length).toBe(1);
	tool(container, 'segment');
	return { container, rect };
}

describe('case « figure » : triangle rectangle coté en cm (PR 4)', () => {
	it('palette : Segment, Équerre, Règle graduée ; [AC] arrêté sur 4 cm, puis [BC] → juste', async () => {
		const { container, rect } = await squareAndRuler();
		const palette = ['segment', 'equerre', 'regle'].map((id) => byTestId(container, `outil-${id}`));
		expect(palette.map((b) => b?.textContent?.trim())).toEqual([
			'Segment',
			'Équerre',
			'Règle graduée'
		]);
		tap(rect, 2.05, 2.05);
		tap(rect, 2.1, 6);
		await expect.poll(() => mmShown(container)).toBe('40');
		tap(rect, 8.05, 2.05);
		// Le bout de [BC] s'aimante aussi à la graduation la plus proche (C, à 40 mm)
		tap(rect, 2.05, 6);
		await expect.poll(() => all(container, 'segment-eleve').length).toBe(2);
		button(container, 'Valider').click();
		await expect.poll(() => container.querySelectorAll('.droite-juste').length).toBeGreaterThan(0);
	});

	it('[AC] arrêté sur 3,8 cm : message ; à la correction, la règle posée en A', async () => {
		const { container, rect } = await squareAndRuler();
		tap(rect, 2.05, 2.05);
		tap(rect, 2.1, 5.8);
		await expect.poll(() => mmShown(container)).toBe('38');
		tap(rect, 8.05, 2.05);
		tap(rect, 2.05, 5.8);
		await expect.poll(() => all(container, 'segment-eleve').length).toBe(2);
		button(container, 'Valider').click();
		await expect
			.poll(() => container.textContent)
			.toContain('Ton côté [AC] mesure 3,8 cm au lieu de 4 cm.');
		await expect.poll(() => all(container, 'bonne-regle').length).toBe(1);
	});
});

// PR 6 : rectangle coté en A(2 ; 2), B(8 ; 2), BC = 3 cm → C(8 ; 5), D(2 ; 5)
const RECTANGLE_BLOCK = [
	'```figure-a-completer',
	'fenetre: 0 ; 10 ; 0 ; 8',
	'verifier: rectangle A ; B ; C ; D : BC = 3 cm',
	'---',
	'A = point(2, 2)',
	'B = point(8, 2)',
	's = segment(A, B)',
	'```'
].join('\n');

/** Équerre le long de [AB] en `x` ; règle posée en `x`, aimantée à la perpendiculaire ; côté jusqu'à `top` */
async function rightSide(container: HTMLElement, rect: SVGRectElement, x: number, top: number) {
	const droites = all(container, 'droite-eleve').length;
	tool(container, 'equerre');
	tap(rect, 5, 2.05);
	await expect.poll(() => all(container, 'droite-choisie').length).toBe(1);
	tap(rect, x + 0.05, 2.05);
	await expect.poll(() => all(container, 'droite-eleve').length).toBe(droites + 1);
	tool(container, 'regle');
	tap(rect, x + 0.05, 2.05);
	tap(rect, x + 0.12, 6);
	await expect.poll(() => all(container, 'regle').length).toBe(1);
	tool(container, 'segment');
	const segments = all(container, 'segment-eleve').length;
	tap(rect, x + 0.05, 2.05);
	tap(rect, x + 0.1, top);
	await expect.poll(() => all(container, 'segment-eleve').length).toBe(segments + 1);
}

describe('case « figure » : rectangle coté en cm (PR 6)', () => {
	it('palette : Segment, Équerre, Règle graduée ; 3 cm en B et en A, puis [CD] → juste', async () => {
		const { container, rect } = await rendered(RECTANGLE_BLOCK);
		const palette = ['segment', 'equerre', 'regle'].map((id) => byTestId(container, `outil-${id}`));
		expect(palette.map((b) => b?.textContent?.trim())).toEqual([
			'Segment',
			'Équerre',
			'Règle graduée'
		]);
		await rightSide(container, rect, 8, 5);
		await expect.poll(() => mmShown(container)).toBe('30');
		await rightSide(container, rect, 2, 5);
		await expect.poll(() => mmShown(container)).toBe('30');
		// [CD] : toucher pile sur C et D (le bout s'aimante d'abord aux graduations de la règle posée)
		tap(rect, 8, 5);
		tap(rect, 2, 5);
		await expect.poll(() => all(container, 'segment-eleve').length).toBe(3);
		button(container, 'Valider').click();
		await expect.poll(() => container.querySelectorAll('.droite-juste').length).toBeGreaterThan(0);
	});

	it('[BC] arrêté sur 2,8 cm : message ; à la correction, deux règles', async () => {
		const { container, rect } = await rendered(RECTANGLE_BLOCK);
		await rightSide(container, rect, 8, 4.8);
		await expect.poll(() => mmShown(container)).toBe('28');
		await rightSide(container, rect, 2, 4.8);
		tap(rect, 8, 4.8);
		tap(rect, 2, 4.8);
		await expect.poll(() => all(container, 'segment-eleve').length).toBe(3);
		button(container, 'Valider').click();
		await expect
			.poll(() => container.textContent)
			.toContain('Ton côté [BC] mesure 2,8 cm au lieu de 3 cm.');
		await expect.poll(() => all(container, 'bonne-regle').length).toBe(2);
	});
});

// Chantier `triangle-cote-cm` : A(2 ; 2), B(8 ; 2), AC = 4 cm, BC = 5 cm → C(4,25 ; 5,307…)
const SIDES_BLOCK = [
	'```figure-a-completer',
	'fenetre: 0 ; 10 ; 0 ; 8',
	'verifier: triangle ABC : AC = 4 cm ; BC = 5 cm',
	'---',
	'A = point(2, 2)',
	'B = point(8, 2)',
	's = segment(A, B)',
	'```'
].join('\n');

/** Règle posée en `at` vers `toward`, puis le compas piqué en `at`, ouvert près de `opening` */
async function rulerAndCompass(
	container: HTMLElement,
	rect: SVGRectElement,
	at: Position,
	toward: Position,
	opening: Position
) {
	const circles = all(container, 'cercle-eleve').length;
	tool(container, 'regle');
	tap(rect, at.x + 0.05, at.y + 0.05);
	tap(rect, toward.x, toward.y);
	await expect.poll(() => all(container, 'regle').length).toBe(1);
	tool(container, 'compas');
	await expect.poll(() => container.textContent).toContain('Pique le compas au 0 de la règle');
	tap(rect, at.x + 0.05, at.y + 0.05);
	tap(rect, opening.x, opening.y);
	await expect.poll(() => all(container, 'cercle-eleve').length).toBe(circles + 1);
}

describe('case « figure » : triangle coté en cm, trois longueurs (triangle-cote-cm)', () => {
	it('palette : Segment, Compas, Règle graduée ; compas ouverts sur 4 cm et 5 cm, côtés → juste', async () => {
		const { container, rect } = await rendered(SIDES_BLOCK);
		const palette = ['segment', 'compas', 'regle'].map((id) => byTestId(container, `outil-${id}`));
		expect(palette.map((b) => b?.textContent?.trim())).toEqual([
			'Segment',
			'Compas',
			'Règle graduée'
		]);
		expect(byTestId(container, 'outil-report')).toBeNull();
		// Règle en A vers le haut : l'ouverture s'aimante à la graduation de 4 cm
		await rulerAndCompass(container, rect, { x: 2, y: 2 }, { x: 2, y: 7 }, { x: 2.05, y: 6 });
		await expect.poll(() => mmShown(container)).toBe('40');
		// Règle en B vers la gauche, le long de [AB] : 5 cm
		await rulerAndCompass(container, rect, { x: 8, y: 2 }, { x: 4, y: 2 }, { x: 3, y: 2.05 });
		await expect.poll(() => mmShown(container)).toBe('50');
		tool(container, 'segment');
		tap(rect, 2.05, 2.05);
		tap(rect, 4.27, 5.3);
		tap(rect, 8.05, 2.05);
		tap(rect, 4.27, 5.3);
		await expect.poll(() => all(container, 'segment-eleve').length).toBe(2);
		button(container, 'Valider').click();
		await expect.poll(() => container.querySelectorAll('.droite-juste').length).toBeGreaterThan(0);
	});

	it('compas ouvert sur 3,8 cm : message ; à la correction, deux règles', async () => {
		const { container, rect } = await rendered(SIDES_BLOCK);
		await rulerAndCompass(container, rect, { x: 2, y: 2 }, { x: 2, y: 7 }, { x: 2.05, y: 5.8 });
		await expect.poll(() => mmShown(container)).toBe('38');
		await rulerAndCompass(container, rect, { x: 8, y: 2 }, { x: 4, y: 2 }, { x: 3, y: 2.05 });
		tool(container, 'segment');
		// C(4,12 ; 5,15…) : croisement des cercles de 3,8 cm et 5 cm
		tap(rect, 2.05, 2.05);
		tap(rect, 4.13, 5.15);
		tap(rect, 8.05, 2.05);
		tap(rect, 4.13, 5.15);
		await expect.poll(() => all(container, 'segment-eleve').length).toBe(2);
		button(container, 'Valider').click();
		await expect
			.poll(() => container.textContent)
			.toContain('Ton côté [AC] mesure 3,8 cm au lieu de 4 cm.');
		await expect.poll(() => all(container, 'bonne-regle').length).toBe(2);
	});
});

describe('case « figure » : triangle coté en cm, revue de #2658', () => {
	it('règle de B dirigée vers C : le bout du segment va au croisement des arcs, pas à la graduation → juste', async () => {
		const { container, rect } = await rendered(SIDES_BLOCK);
		await rulerAndCompass(container, rect, { x: 2, y: 2 }, { x: 2, y: 7 }, { x: 2.05, y: 6 });
		// La règle de B pointée à peu près vers C : sa graduation 5 cm tombe près de C, pas sur C
		await rulerAndCompass(
			container,
			rect,
			{ x: 8, y: 2 },
			{ x: 4.3, y: 5.25 },
			{ x: 4.3, y: 5.25 }
		);
		await expect.poll(() => mmShown(container)).toBe('50');
		tool(container, 'segment');
		tap(rect, 2.05, 2.05);
		tap(rect, 4.27, 5.29);
		tap(rect, 8.05, 2.05);
		tap(rect, 4.27, 5.29);
		await expect.poll(() => all(container, 'segment-eleve').length).toBe(2);
		button(container, 'Valider').click();
		await expect.poll(() => container.querySelectorAll('.droite-juste').length).toBeGreaterThan(0);
	});

	it('trois longueurs : l’indice de la Règle posée ne propose pas le Segment', async () => {
		const { container, rect } = await rendered(SIDES_BLOCK);
		tool(container, 'regle');
		tap(rect, 2.05, 2.05);
		tap(rect, 2, 7);
		await expect.poll(() => all(container, 'regle').length).toBe(1);
		await expect
			.poll(() => container.textContent)
			.toContain('touche Compas pour l’ouvrir sur la règle');
		expect(container.textContent).not.toContain('ou Segment pour tracer le long de la règle');
	});
});
