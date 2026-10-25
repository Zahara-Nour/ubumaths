/**
 * Case « figure » à l'écran de l'élève (bloc ```figure-a-completer, PR 2)
 * =====================================================================
 *
 * Comportements validés par David le 2026-10-25
 * (`docs/wip/geometrie-validation-progress.md` § 5) : toucher A puis B trace la
 * droite, aimantée près des points ; Effacer ; Valider grisé tant que rien n'est
 * tracé ; juste → droite verte ; faux → message du juge et bonne droite en
 * pointillés. Décor réel : la question est générée ; la saisie dans `QuestionCard`
 * (évaluations : jamais de verdict), la correction dans `FlashCard` (entraînement).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import QuestionCard from '../QuestionCard.svelte';
import FlashCard from '../FlashCard.svelte';
import FigureBlock from '$lib/components/markdown/nodes/FigureBlock.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import { parseMarkdown, resolvedMarkdown, templateMarkdown } from '$lib/ubumark';
import type { FigureNode } from '$lib/ubumark/types/figure';

const BLOCK = [
	'```figure-a-completer',
	'fenetre: 0 ; 10 ; 0 ; 6',
	'outils: droite',
	'verifier: droite_par A ; B',
	'---',
	'A = point(1, 2)',
	'B = point(7, 2)',
	'C = point(4, 5)',
	'```'
].join('\n');

const TEMPLATE = {
	id: 'test-cp059',
	title: 'Tracer une droite',
	status: 'draft',
	type: 'fill_in_blanks',
	variations: [
		{ statement: templateMarkdown(`Trace la droite qui passe par les points A et B.\n\n${BLOCK}`) }
	],
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

/** La zone de tracé, une fois la vue chargée à la demande (geometry-core) */
async function zone(container: HTMLElement): Promise<SVGRectElement> {
	await expect
		.poll(() => container.querySelector('[data-testid="zone-de-trace"]'), { timeout: 5000 })
		.not.toBeNull();
	return container.querySelector('[data-testid="zone-de-trace"]') as SVGRectElement;
}

/** Toucher un endroit de la figure, en unités de la figure (fenêtre 0..10 × 0..6) */
function tap(rect: SVGRectElement, x: number, y: number) {
	const box = rect.getBoundingClientRect();
	rect.dispatchEvent(
		new MouseEvent('click', {
			bubbles: true,
			clientX: box.left + (x / 10) * box.width,
			clientY: box.top + ((6 - y) / 6) * box.height
		})
	);
}

function validateButton(container: HTMLElement): HTMLButtonElement {
	const button = [...container.querySelectorAll('button')].find((b) =>
		b.textContent?.includes('Valider')
	);
	if (!button) throw new Error('bouton Valider absent');
	return button as HTMLButtonElement;
}

function eraseButton(container: HTMLElement): HTMLButtonElement | undefined {
	return [...container.querySelectorAll('button')].find((b) =>
		b.textContent?.includes('Effacer')
	) as HTMLButtonElement | undefined;
}

describe('case « figure » : tracer', () => {
	it('rien tracé : Valider grisé, Effacer grisé', async () => {
		const { container } = await render(QuestionCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		await zone(container);
		expect(validateButton(container).disabled).toBe(true);
		expect(eraseButton(container)?.disabled).toBe(true);
	});

	it('premier toucher : un départ marqué, Valider toujours grisé', async () => {
		const { container } = await render(QuestionCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		tap(await zone(container), 1.1, 2.1);
		await expect.poll(() => container.querySelector('[data-testid="depart"]')).not.toBeNull();
		expect(container.querySelectorAll('[data-testid="droite-eleve"]')).toHaveLength(0);
		expect(validateButton(container).disabled).toBe(true);
	});

	it('A puis B (aimantés) : une droite, Valider → juste, droite verte', async () => {
		const { container } = await render(FlashCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		const rect = await zone(container);
		tap(rect, 1.2, 1.9);
		tap(rect, 6.8, 2.2);
		await expect
			.poll(() => container.querySelectorAll('[data-testid="droite-eleve"]').length)
			.toBe(1);
		await expect.poll(() => validateButton(container).disabled).toBe(false);
		validateButton(container).click();
		await expect.poll(() => container.querySelector('.droite-juste')).not.toBeNull();
		expect(container.querySelector('[data-testid="bonne-droite"]')).toBeNull();
		// Plus de saisie après Valider
		expect(container.querySelector('[data-testid="zone-de-trace"]')).toBeNull();
	});

	it('A puis C (le point piège) : faux, message du juge, bonne droite en pointillés', async () => {
		const { container } = await render(FlashCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		const rect = await zone(container);
		tap(rect, 1, 2);
		tap(rect, 4, 5);
		await expect.poll(() => validateButton(container).disabled).toBe(false);
		validateButton(container).click();
		await expect
			.poll(() => container.textContent)
			.toContain('Ta droite passe par A et C, pas par B.');
		expect(container.querySelector('[data-testid="bonne-droite"]')).not.toBeNull();
		expect(container.querySelector('.droite-juste')).toBeNull();
	});

	it('loin de B : le trait part de l’endroit touché, faux', async () => {
		const { container } = await render(FlashCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		const rect = await zone(container);
		tap(rect, 1, 2);
		tap(rect, 7, 3.5);
		await expect.poll(() => validateButton(container).disabled).toBe(false);
		validateButton(container).click();
		await expect
			.poll(() => container.textContent)
			.toContain('Ta droite ne passe pas par le point B.');
	});

	it('Effacer : le départ en attente, puis la dernière droite', async () => {
		const { container } = await render(QuestionCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		const rect = await zone(container);
		tap(rect, 1, 2);
		tap(rect, 7, 2);
		tap(rect, 4, 5);
		await expect.poll(() => container.querySelector('[data-testid="depart"]')).not.toBeNull();
		eraseButton(container)?.click();
		await expect.poll(() => container.querySelector('[data-testid="depart"]')).toBeNull();
		expect(container.querySelectorAll('[data-testid="droite-eleve"]')).toHaveLength(1);
		eraseButton(container)?.click();
		await expect
			.poll(() => container.querySelectorAll('[data-testid="droite-eleve"]').length)
			.toBe(0);
		await expect.poll(() => validateButton(container).disabled).toBe(true);
	});

	it('clavier : Entrée sur le point A puis sur le point B trace (AB)', async () => {
		const { container } = await render(QuestionCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		await zone(container);
		const point = (name: string) =>
			container.querySelector(`[aria-label="Point ${name}"]`) as SVGElement;
		for (const name of ['A', 'B']) {
			point(name).focus();
			point(name).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		}
		await expect
			.poll(() => container.querySelectorAll('[data-testid="droite-eleve"]').length)
			.toBe(1);
		await expect.poll(() => validateButton(container).disabled).toBe(false);
	});
});

describe('case « figure » : hors saisie', () => {
	const node = () => {
		const doc = parseMarkdown(resolvedMarkdown(BLOCK));
		return doc.children[0] as FigureNode;
	};

	it('rendu statique : la figure de départ seule, aucune zone de tracé', async () => {
		const { container } = await render(FigureBlock, {
			target: mainElement(),
			props: { node: node() }
		});
		await expect
			.poll(() => container.querySelector('svg[role="img"]'), { timeout: 5000 })
			.not.toBeNull();
		expect(container.querySelector('[data-testid="zone-de-trace"]')).toBeNull();
		expect(container.querySelector('[data-testid="bonne-droite"]')).toBeNull();
	});

	it('mode correction : la bonne droite, sans saisie', async () => {
		const { container } = await render(FigureBlock, {
			target: mainElement(),
			props: { node: node(), showSolution: true }
		});
		await expect
			.poll(() => container.querySelector('[data-testid="bonne-droite"]'), { timeout: 5000 })
			.not.toBeNull();
		expect(container.querySelector('[data-testid="zone-de-trace"]')).toBeNull();
		expect(eraseButton(container)).toBeUndefined();
	});
});
