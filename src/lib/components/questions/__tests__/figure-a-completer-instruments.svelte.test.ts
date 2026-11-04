/**
 * Case « figure » : construire le symétrique d'un point sur papier uni
 * ===================================================================
 *
 * Chantier `controles-figure`, lot 2b (phase 0 validée par David le 2026-11-02,
 * `docs/wip/controles-figure-progress.md` § 7) : sans `grille:`, une palette
 * (Règle, Équerre, Compas, Point) ; équerre = une droite (surlignée), puis un
 * point → la perpendiculaire ; compas = le centre, puis un point → le cercle ;
 * touchers aimantés sur les points, les intersections, les traits.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FlashCard from '../FlashCard.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';

// Fenêtre 0..12 × 0..8 ; axe y = x ; A(2 ; 5) → A'(5 ; 2) ; pied H(3,5 ; 3,5)
const BLOCK = [
	'```figure-a-completer',
	'fenetre: 0 ; 12 ; 0 ; 8',
	"verifier: point A' = symetrie(A, axe=d)",
	'---',
	'P = point(0, 0, visible=faux)',
	'Q = point(8, 8, visible=faux)',
	'd = droite(P, Q)',
	'A = point(2, 5)',
	'```'
].join('\n');

const TEMPLATE = {
	id: 'test-instruments',
	title: 'Construire un symétrique',
	status: 'draft',
	type: 'fill_in_blanks',
	variations: [
		{
			statement: templateMarkdown(
				`Construis le symétrique du point $A$ par rapport à $d$.\n\n${BLOCK}`
			)
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

/** Toucher un endroit, en unités de la figure (fenêtre 0..12 × 0..8) */
function tap(rect: SVGRectElement, x: number, y: number) {
	const box = rect.getBoundingClientRect();
	rect.dispatchEvent(
		new MouseEvent('click', {
			bubbles: true,
			clientX: box.left + (x / 12) * box.width,
			clientY: box.top + ((8 - y) / 8) * box.height
		})
	);
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

describe('case « figure » : instruments sur papier uni', () => {
	it('palette : Règle, Équerre, Compas, Point ; le point est l’outil de départ', async () => {
		const { container } = await rendered();
		const palette = ['outil-droite', 'outil-equerre', 'outil-compas', 'outil-point'].map(
			(id) => container.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement
		);
		expect(palette.map((b) => b?.textContent?.trim())).toEqual([
			'Règle',
			'Équerre',
			'Compas',
			'Point'
		]);
		expect(palette[3].getAttribute('aria-pressed')).toBe('true');
	});

	it('équerre puis compas puis point : la construction juste', async () => {
		const { container, rect } = await rendered();
		button(container, 'Équerre').click();
		await expect.poll(() => button(container, 'Équerre').getAttribute('aria-pressed')).toBe('true');
		// Loin de toute droite : la consigne
		tap(rect, 10, 1);
		await expect.poll(() => container.textContent).toContain('Touche d’abord une droite.');
		// Sur d : la droite est surlignée ; puis par A : la perpendiculaire
		tap(rect, 6, 6.1);
		await expect.poll(() => all(container, 'droite-choisie').length).toBe(1);
		tap(rect, 2.1, 5);
		await expect.poll(() => all(container, 'droite-eleve').length).toBe(1);
		expect(all(container, 'droite-choisie')).toHaveLength(0);
		// Compas : centre au pied H (intersection), par A
		button(container, 'Compas').click();
		tap(rect, 3.6, 3.4);
		tap(rect, 2, 5.1);
		await expect.poll(() => all(container, 'cercle-eleve').length).toBe(1);
		// Point : l'autre intersection
		button(container, 'Point').click();
		tap(rect, 5.1, 2.1);
		await expect.poll(() => all(container, 'point-eleve').length).toBe(1);
		button(container, 'Valider').click();
		await expect.poll(() => container.querySelectorAll('.point-juste').length).toBe(1);
	});

	it('Effacer : la droite choisie pour l’équerre d’abord', async () => {
		const { container, rect } = await rendered();
		button(container, 'Équerre').click();
		tap(rect, 6, 6.1);
		await expect.poll(() => all(container, 'droite-choisie').length).toBe(1);
		button(container, 'Effacer').click();
		await expect.poll(() => all(container, 'droite-choisie').length).toBe(0);
	});
});
