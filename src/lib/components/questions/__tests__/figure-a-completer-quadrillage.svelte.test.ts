/**
 * Case « figure » sur quadrillage : terminer un carré (CP-060)
 * ============================================================
 *
 * Comportements validés par David le 2026-10-26
 * (`docs/wip/geometrie-validation-progress.md` § 7 et § 9) : chaque toucher va
 * au nœud le plus proche ; le segment s'arrête à ses deux bouts ; juste → ses
 * segments en vert ; faux → message du juge et bonne figure en pointillés, du
 * côté où l'élève a tracé ; clavier : flèches de nœud en nœud, Entrée touche.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FlashCard from '../FlashCard.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';
import { NOT_A_SQUARE_FEEDBACK } from '$lib/questions/construction/judge';

// Fenêtre 0..10 × 0..7 ; côté donné [AB] de (2 ; 3) à (5 ; 3), sommets sans lettre
const BLOCK = [
	'```figure-a-completer',
	'fenetre: 0 ; 10 ; 0 ; 7',
	'grille: 1',
	'outils: segment',
	'verifier: carre A ; B',
	'---',
	'A = point(2, 3, visible=faux)',
	'B = point(5, 3, visible=faux)',
	's = segment(A, B)',
	'```'
].join('\n');

const TEMPLATE = {
	id: 'test-cp060',
	title: 'Terminer un carré',
	status: 'draft',
	type: 'fill_in_blanks',
	variations: [{ statement: templateMarkdown(`Termine le carré.\n\n${BLOCK}`) }],
	grades: ['CP'],
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

/** Toucher un endroit, en unités de la figure (fenêtre 0..10 × 0..7) */
function tap(rect: SVGRectElement, x: number, y: number) {
	const box = rect.getBoundingClientRect();
	rect.dispatchEvent(
		new MouseEvent('click', {
			bubbles: true,
			clientX: box.left + (x / 10) * box.width,
			clientY: box.top + ((7 - y) / 7) * box.height
		})
	);
}

/** Tracer des segments, chacun par deux touchers */
function draw(rect: SVGRectElement, ...segments: [number, number, number, number][]) {
	for (const [x1, y1, x2, y2] of segments) {
		tap(rect, x1, y1);
		tap(rect, x2, y2);
	}
}

function validateButton(container: HTMLElement): HTMLButtonElement {
	const button = [...container.querySelectorAll('button')].find((b) =>
		b.textContent?.includes('Valider')
	);
	if (!button) throw new Error('bouton Valider absent');
	return button as HTMLButtonElement;
}

const segments = (container: HTMLElement, testid: string) =>
	[...container.querySelectorAll(`[data-testid="${testid}"]`)] as SVGLineElement[];

describe('case « figure » sur quadrillage (CP-060)', () => {
	it('touchers près des nœuds : les trois côtés au-dessus, juste, en vert', async () => {
		const { container } = await render(FlashCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		const rect = await zone(container);
		draw(rect, [5.3, 2.8, 4.8, 6.2], [5.1, 5.9, 2.2, 6.1], [1.8, 6.2, 2.1, 3.3]);
		await expect.poll(() => segments(container, 'segment-eleve').length).toBe(3);
		validateButton(container).click();
		await expect.poll(() => container.querySelectorAll('.droite-juste').length).toBe(3);
		expect(segments(container, 'bon-segment')).toHaveLength(0);
	});

	it('le segment s’arrête à ses deux bouts (pas jusqu’aux bords)', async () => {
		const { container } = await render(FlashCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		const rect = await zone(container);
		draw(rect, [5, 3, 5, 6]);
		await expect.poll(() => segments(container, 'segment-eleve').length).toBe(1);
		const [line] = segments(container, 'segment-eleve');
		const box = rect.getBoundingClientRect();
		const svg = rect.ownerSVGElement;
		if (!svg) throw new Error('svg absent');
		const ratio = box.height / rect.height.baseVal.value;
		// De y = 3 à y = 6 : 3 carreaux sur 7, pas toute la hauteur
		const length = Math.abs(line.y2.baseVal.value - line.y1.baseVal.value) * ratio;
		expect(length).toBeGreaterThan(box.height * (3 / 7) - 2);
		expect(length).toBeLessThan(box.height * (3 / 7) + 2);
	});

	it('rectangle au lieu de carré, en dessous : faux, message, bonne figure en dessous', async () => {
		const { container } = await render(FlashCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		const rect = await zone(container);
		draw(rect, [5, 3, 5, 1], [5, 1, 2, 1], [2, 1, 2, 3]);
		await expect.poll(() => validateButton(container).disabled).toBe(false);
		validateButton(container).click();
		await expect.poll(() => container.textContent).toContain(NOT_A_SQUARE_FEEDBACK);
		const good = segments(container, 'bon-segment');
		expect(good).toHaveLength(3);
		// Bonne figure au-dessous du côté donné : ses traits descendent sous y = 3 (SVG : y grandit vers le bas)
		const sideY = rect.height.baseVal.value * (4 / 7);
		expect(
			Math.max(...good.map((l) => Math.max(l.y1.baseVal.value, l.y2.baseVal.value)))
		).toBeGreaterThan(sideY + 1);
	});

	it('clavier : flèches de nœud en nœud, Entrée touche', async () => {
		const { container } = await render(FlashCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		const rect = await zone(container);
		rect.focus();
		await expect.poll(() => container.querySelector('[data-testid="curseur"]')).not.toBeNull();
		const key = (k: string) =>
			rect.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
		// Curseur au centre (5 ; 3.5 → nœud 5 ; 4) : Entrée, deux flèches vers le haut, Entrée
		key('Enter');
		key('ArrowUp');
		key('ArrowUp');
		key('Enter');
		await expect.poll(() => segments(container, 'segment-eleve').length).toBe(1);
		expect(container.querySelector('[data-testid="depart"]')).toBeNull();
	});
});
