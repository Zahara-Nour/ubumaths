/**
 * Case « figure » : construire un triangle par un côté et deux angles
 * ===================================================================
 *
 * Chantier `controles-figure`, lot 7 (phase 0 validée par David le 2026-11-03,
 * `docs/archive/wip/controles-figure-progress.md` § 21) : `triangle ABC : CAB = 40 ;
 * ABC = 65`, palette Rapporteur · Règle · Segment ; repère à 40 en A, droite de A
 * au repère, repère à 65 en B (rapporteur retourné), droite, côtés jusqu'au
 * croisement → juste ; à la correction, les côtés et les deux angles codés.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FlashCard from '../FlashCard.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';

// Fenêtre 0..12 × 0..8 ; A(3 ; 2), B(9 ; 2) ; rapporteur de rayon 2,8
const BLOCK = [
	'```figure-a-completer',
	'fenetre: 0 ; 12 ; 0 ; 8',
	'verifier: triangle ABC : CAB = 40 ; ABC = 65',
	'---',
	'A = point(3, 2)',
	'B = point(9, 2)',
	's = segment(A, B)',
	'```'
].join('\n');

const TEMPLATE = {
	id: 'test-triangle-angles',
	title: 'Construire un triangle',
	status: 'draft',
	type: 'fill_in_blanks',
	variations: [
		{
			statement: templateMarkdown(
				`Construis le triangle $ABC$ tel que $\\widehat{CAB} = 40^\\circ$ et $\\widehat{ABC} = 65^\\circ$.\n\n${BLOCK}`
			)
		}
	],
	grades: ['5e'],
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

const A = { x: 3, y: 2 };
const B = { x: 9, y: 2 };
const AC = (6 * Math.sin((65 * Math.PI) / 180)) / Math.sin((75 * Math.PI) / 180);
const C = {
	x: A.x + AC * Math.cos((40 * Math.PI) / 180),
	y: A.y + AC * Math.sin((40 * Math.PI) / 180)
};

async function zone(container: HTMLElement): Promise<SVGRectElement> {
	await expect
		.poll(() => container.querySelector('[data-testid="zone-de-trace"]'), { timeout: 5000 })
		.not.toBeNull();
	return container.querySelector('[data-testid="zone-de-trace"]') as SVGRectElement;
}

function click(rect: SVGRectElement, clientX: number, clientY: number) {
	rect.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX, clientY }));
}

/** Toucher un endroit, en unités de la figure (fenêtre 0..12 × 0..8) */
function tap(rect: SVGRectElement, x: number, y: number) {
	const box = rect.getBoundingClientRect();
	click(rect, box.left + (x / 12) * box.width, box.top + ((8 - y) / 8) * box.height);
}

/** Toucher depuis `center`, dans la direction absolue `deg` (degrés), à 2,5 unités */
function tapToward(rect: SVGRectElement, center: { x: number; y: number }, deg: number) {
	const angle = (deg * Math.PI) / 180;
	tap(rect, center.x + 2.5 * Math.cos(angle), center.y + 2.5 * Math.sin(angle));
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

/**
 * Poser le rapporteur en `center` (base vers `base`), retourné ou non, puis viser
 * `deg` : toucher dans la direction absolue `toward`, ‹ › jusqu'à la graduation
 */
async function markAt(
	container: HTMLElement,
	rect: SVGRectElement,
	center: { x: number; y: number },
	base: { x: number; y: number },
	flip: boolean,
	deg: number,
	toward: number
) {
	tool(container, 'rapporteur');
	tap(rect, center.x + 0.05, center.y + 0.05);
	tap(rect, (center.x + base.x) / 2, base.y + 0.05);
	await expect.poll(() => all(container, 'rapporteur').length).toBe(1);
	if (flip) byTestId(container, 'rapporteur-retourner').click();
	const before = all(container, 'repere-eleve').length;
	tapToward(rect, center, toward);
	await expect.poll(() => all(container, 'repere-eleve').length).toBe(before + 1);
	for (let i = 0; i < 5 && Number(degreeShown(container)) !== deg; i++) {
		const shown = Number(degreeShown(container));
		byTestId(container, shown < deg ? 'rapporteur-plus' : 'rapporteur-moins').click();
		await expect.poll(() => Number(degreeShown(container))).not.toBe(shown);
	}
	expect(degreeShown(container)).toBe(String(deg));
}

/** La règle du sommet au dernier repère placé */
async function ruleToLastMark(
	container: HTMLElement,
	rect: SVGRectElement,
	from: { x: number; y: number }
) {
	tool(container, 'droite');
	const before = all(container, 'droite-eleve').length;
	tap(rect, from.x + 0.05, from.y + 0.05);
	const marks = all(container, 'repere-eleve');
	const box = marks[marks.length - 1].getBoundingClientRect();
	click(rect, box.left + box.width / 2, box.top + box.height / 2);
	await expect.poll(() => all(container, 'droite-eleve').length).toBe(before + 1);
}

describe('case « figure » : triangle par un côté et deux angles', () => {
	it('palette : Rapporteur, Règle, Segment', async () => {
		const { container } = await rendered();
		const palette = ['rapporteur', 'droite', 'segment'].map((id) =>
			byTestId(container, `outil-${id}`)
		);
		expect(palette.map((b) => b?.textContent?.trim())).toEqual(['Rapporteur', 'Règle', 'Segment']);
	});

	it('40° en A, 65° en B, droites, côtés jusqu’au croisement : juste', async () => {
		const { container, rect } = await rendered();
		await markAt(container, rect, A, B, false, 40, 40);
		await ruleToLastMark(container, rect, A);
		// En B, la base vers A : le rapporteur se retourne pour passer au-dessus de (AB)
		await markAt(container, rect, B, A, true, 65, 115);
		await ruleToLastMark(container, rect, B);
		tool(container, 'segment');
		tap(rect, A.x + 0.05, A.y + 0.05);
		tap(rect, C.x + 0.05, C.y + 0.05);
		tap(rect, B.x + 0.05, B.y + 0.05);
		tap(rect, C.x - 0.05, C.y + 0.05);
		await expect.poll(() => all(container, 'segment-eleve').length).toBe(2);
		button(container, 'Valider').click();
		await expect.poll(() => container.querySelectorAll('.droite-juste').length).toBeGreaterThan(0);
	});

	it('sommet à l’œil : faux ; à la correction, les côtés et les deux angles codés', async () => {
		const { container, rect } = await rendered();
		tool(container, 'segment');
		tap(rect, A.x + 0.05, A.y + 0.05);
		tap(rect, 6, 5);
		tap(rect, B.x + 0.05, B.y + 0.05);
		tap(rect, 6, 5);
		await expect.poll(() => all(container, 'segment-eleve').length).toBe(2);
		button(container, 'Valider').click();
		await expect
			.poll(() => container.textContent)
			.toContain('Ton sommet C est placé à l’œil : trace ses côtés avec le rapporteur.');
		await expect.poll(() => all(container, 'bon-segment').length).toBe(2);
		const angles = all(container, 'bon-triangle-angle');
		expect(angles.map((g) => g.querySelector('text')?.textContent)).toEqual(['40°', '65°']);
	});
});
