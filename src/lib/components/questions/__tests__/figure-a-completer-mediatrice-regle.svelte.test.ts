/**
 * Case « figure » : médiatrice à la règle graduée et à l'équerre, sur papier uni
 * ==============================================================================
 *
 * Outil n° 38 (chantier `outil-equerre-uni`, phase 0 validée par David le 2026-11-28,
 * `docs/wip/outil-equerre-uni-progress.md` § 2) : la règle posée de A vers B, le Point
 * aimanté à la graduation 3 cm (décision 2), l'équerre le long de [AB] glissée jusqu'à
 * ce point → juste ; graduation 3,5 cm → « ne passe pas par son milieu ».
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FlashCard from '../FlashCard.svelte';
import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
import type { QuestionInstance, QuestionTemplate } from '#lib/questions/types.ts';
import { templateMarkdown } from '#lib/ubumark/index.ts';

// Fenêtre 0..10 × 0..8 ; [AB] de 6 cm, A(2 ; 3), B(8 ; 3) : milieu (5 ; 3)
const BLOCK = [
	'```figure-a-completer',
	'fenetre: 0 ; 10 ; 0 ; 8',
	'outils: droite, regle, point, equerre',
	'verifier: droite m = mediatrice(A, B)',
	'---',
	'A = point(2, 3)',
	'B = point(8, 3)',
	's = segment(A, B)',
	'```'
].join('\n');

function instance(): QuestionInstance {
	const template = {
		id: 'test-mediatrice-regle',
		title: 'Construire une médiatrice',
		status: 'draft',
		type: 'fill_in_blanks',
		variations: [{ statement: templateMarkdown(`Construis la médiatrice de [AB].\n\n${BLOCK}`) }],
		grades: ['6e'],
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

/** Toucher un endroit, en unités de la figure (fenêtre 0..10 × 0..8) */
function tap(rect: SVGRectElement, x: number, y: number) {
	const box = rect.getBoundingClientRect();
	rect.dispatchEvent(
		new MouseEvent('click', {
			bubbles: true,
			clientX: box.left + (x / 10) * box.width,
			clientY: box.top + ((8 - y) / 8) * box.height
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

/**
 * Règle de A vers B, Point touché près de (x ; 3) puis décalé de `nudge` mm (‹ ›),
 * équerre le long de [AB] glissée jusqu'au point marqué (`at`)
 */
async function construct(
	container: HTMLElement,
	rect: SVGRectElement,
	x: number,
	nudge: number,
	at: number
) {
	tool(container, 'regle').click();
	tap(rect, 2.02, 3.02);
	tap(rect, 7.98, 3.02);
	await expect.poll(() => all(container, 'regle').length).toBe(1);
	tool(container, 'point').click();
	tap(rect, x, 3.04);
	const plus = container.querySelector('[data-testid="regle-plus"]') as HTMLButtonElement;
	for (let i = 0; i < nudge; i++) plus.click();
	tool(container, 'equerre').click();
	tap(rect, 7, 3.02);
	await expect.poll(() => all(container, 'droite-choisie').length).toBe(1);
	tap(rect, at + 0.03, 3.03);
	await expect.poll(() => all(container, 'droite-eleve').length).toBe(1);
}

describe('case « figure » : médiatrice à la règle graduée et à l’équerre (outil n° 38)', () => {
	it('palette : Règle, Règle graduée, Point, Équerre', async () => {
		const { container } = await render(FlashCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		await zone(container);
		for (const id of ['droite', 'regle', 'point', 'equerre']) {
			expect(container.querySelector(`[data-testid="outil-${id}"]`)).not.toBeNull();
		}
	});

	it('point touché à 2,9 cm puis ‹ › d’un millimètre (3 cm), équerre par ce point : juste', async () => {
		const { container } = await render(FlashCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		const rect = await zone(container);
		await construct(container, rect, 4.9, 1, 5);
		button(container, 'Valider').click();
		await expect.poll(() => container.querySelectorAll('.droite-juste').length).toBeGreaterThan(0);
	});

	it('milieu marqué à 3,5 cm : ne passe pas par son milieu', async () => {
		const { container } = await render(FlashCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		const rect = await zone(container);
		await construct(container, rect, 5.5, 0, 5.5);
		button(container, 'Valider').click();
		await expect
			.poll(() => container.textContent)
			.toContain('Ta droite est perpendiculaire à [AB] mais ne passe pas par son milieu.');
	});
});
