/**
 * Case « figure » : perpendiculaire et parallèle par un point, à l'équerre, sur papier uni
 * =========================================================================================
 *
 * Outil n° 40 (chantier `outil-equerre-uni`, phase 0 validée par David le 2026-11-28,
 * `docs/wip/outil-equerre-uni-progress.md` § 1) : l'équerre posée le long de (d), glissée
 * jusqu'à A → juste ; une perpendiculaire ailleurs → « ne passe pas par A » ; à la
 * correction, l'angle droit codé au pied, et pour la parallèle la perpendiculaire par A
 * en trait fin.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FlashCard from '../FlashCard.svelte';
import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
import type { QuestionInstance, QuestionTemplate } from '#lib/questions/types.ts';
import { templateMarkdown } from '#lib/ubumark/index.ts';

// Fenêtre 0..12 × 0..8 ; (d) par (0 ; 2) et (12 ; 5) : y = 2 + x / 4 ; A(4 ; 6)
function block(verifier: string): string {
	return [
		'```figure-a-completer',
		'fenetre: 0 ; 12 ; 0 ; 8',
		`verifier: ${verifier}`,
		'---',
		'm = point(0, 2, visible=faux)',
		'n = point(12, 5, visible=faux)',
		'd = droite(m, n)',
		'A = point(4, 6)',
		'```'
	].join('\n');
}

function template(verifier: string): QuestionTemplate {
	return {
		id: 'test-droite-equerre',
		title: 'Tracer une perpendiculaire',
		status: 'draft',
		type: 'fill_in_blanks',
		variations: [{ statement: templateMarkdown(`Trace la droite $p$.\n\n${block(verifier)}`) }],
		grades: ['CM1'],
		level: 1
	} as unknown as QuestionTemplate;
}

function instance(t: QuestionTemplate): QuestionInstance {
	const result = generateInstance(t, 42);
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

async function rendered(verifier: string) {
	const { container } = await render(FlashCard, {
		target: mainElement(),
		props: { instance: instance(template(verifier)), interactive: true }
	});
	return { container, rect: await zone(container) };
}

const PERPENDICULAIRE = 'droite p = perpendiculaire(A, d)';
const PARALLELE = 'droite q = parallele(A, d)';

describe('case « figure » : perpendiculaire à l’équerre sur papier uni (outil n° 40)', () => {
	it('palette : Règle, Équerre, Compas, Report', async () => {
		const { container } = await rendered(PERPENDICULAIRE);
		const palette = ['outil-droite', 'outil-equerre', 'outil-compas', 'outil-report'].map(
			(id) => container.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement | null
		);
		expect(palette.every((b) => b !== null)).toBe(true);
	});

	it('l’équerre le long de (d), glissée jusqu’à A : juste', async () => {
		const { container, rect } = await rendered(PERPENDICULAIRE);
		button(container, 'Équerre').click();
		tap(rect, 8, 4.05);
		await expect.poll(() => all(container, 'droite-choisie').length).toBe(1);
		tap(rect, 4.05, 6.05);
		await expect.poll(() => all(container, 'droite-eleve').length).toBe(1);
		button(container, 'Valider').click();
		await expect.poll(() => container.querySelectorAll('.droite-juste').length).toBeGreaterThan(0);
	});

	it('l’équerre ailleurs sur (d) : ne passe pas par A ; correction avec l’angle droit', async () => {
		const { container, rect } = await rendered(PERPENDICULAIRE);
		button(container, 'Équerre').click();
		tap(rect, 8, 4.05);
		await expect.poll(() => all(container, 'droite-choisie').length).toBe(1);
		tap(rect, 10, 4.5);
		await expect.poll(() => all(container, 'droite-eleve').length).toBe(1);
		button(container, 'Valider').click();
		await expect
			.poll(() => container.textContent)
			.toContain('Ta droite est perpendiculaire à (d) mais ne passe pas par A.');
		await expect.poll(() => all(container, 'bonne-droite').length).toBe(1);
		expect(all(container, 'bonne-droite-angle-droit')).toHaveLength(1);
		expect(all(container, 'bonne-droite-perpendiculaire')).toHaveLength(0);
	});
});

describe('case « figure » : parallèle à l’équerre sur papier uni (outil n° 40)', () => {
	it('tracée à l’œil : faux ; correction avec la perpendiculaire par A et deux angles droits', async () => {
		const { container, rect } = await rendered(PARALLELE);
		button(container, 'Règle').click();
		tap(rect, 4.05, 6.05);
		tap(rect, 11, 7.6);
		await expect.poll(() => all(container, 'droite-eleve').length).toBe(1);
		button(container, 'Valider').click();
		await expect
			.poll(() => container.textContent)
			.toContain('Ta droite est tracée à l’œil : construis-la avec tes instruments.');
		await expect.poll(() => all(container, 'bonne-droite').length).toBe(1);
		expect(all(container, 'bonne-droite-perpendiculaire')).toHaveLength(1);
		expect(all(container, 'bonne-droite-angle-droit')).toHaveLength(2);
	});
});
