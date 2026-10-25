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

	it('verso après « faux » : la figure, sa droite et la bonne en pointillés, la consigne', async () => {
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
			.poll(() => container.querySelector('button[aria-label="Voir la correction"]'))
			.not.toBeNull();
		(
			container.querySelector('button[aria-label="Voir la correction"]') as HTMLButtonElement
		).click();
		// Verso : le résultat attendu (la ligne « figure » n'existe qu'au verso)
		const figure = '[data-kind="figure"] [data-testid="bonne-droite"]';
		await expect.poll(() => container.querySelector(figure), { timeout: 5000 }).not.toBeNull();
		const verso = container.querySelector('[data-kind="figure"]')?.closest('.face') as HTMLElement;
		expect(verso.querySelectorAll('[data-testid="droite-eleve"]')).toHaveLength(1);
		expect(verso.querySelector('[data-testid="instruction"]')?.textContent).toContain(
			'Trace la droite qui passe par les points A et B.'
		);
		expect(verso.textContent).not.toContain('droite(');
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

describe('case « figure » : mesures à l’écran (revue #1775)', () => {
	const AXES_BLOCK = BLOCK.replace('fenetre: 0 ; 10 ; 0 ; 6', 'fenetre: 0 ; 10 ; 0 ; 6\naxes: oui');
	const nodeOf = (source: string) =>
		parseMarkdown(resolvedMarkdown(source)).children[0] as FigureNode;

	/** FigureBlock en saisie dans un cadre étroit (échelle d'affichage ≠ 1) ; réponses notées */
	async function narrowFigure(source: string, widthPx: number) {
		const changes: string[] = [];
		const main = mainElement();
		main.style.width = `${widthPx}px`;
		const screen = await render(FigureBlock, {
			target: main,
			props: {
				node: nodeOf(source),
				answer: { value: '', isCorrect: null, disabled: false, onChange: (v) => changes.push(v) }
			}
		});
		return { screen, changes, rect: await zone(screen.container) };
	}

	/** Toucher à `dx` px ÉCRAN à droite du point (x, y) de la figure */
	function tapNear(rect: SVGRectElement, x: number, y: number, dx: number) {
		const box = rect.getBoundingClientRect();
		rect.dispatchEvent(
			new MouseEvent('click', {
				bubbles: true,
				clientX: box.left + (x / 10) * box.width + dx,
				clientY: box.top + ((6 - y) / 6) * box.height
			})
		);
	}

	it('repère avec marge, cadre étroit : à 18 px de A aimanté, à 30 px non', async () => {
		const { screen, changes, rect } = await narrowFigure(AXES_BLOCK, 200);
		// L'échelle d'affichage n'est pas 1 : le rayon de 24 px doit en tenir compte
		expect(rect.getBoundingClientRect().width).toBeLessThan(190);
		tapNear(rect, 1, 2, 18);
		tapNear(rect, 7, 2, 0);
		await expect.poll(() => changes.at(-1)).toBe('droite(1;2;7;2)');
		tapNear(rect, 1, 2, 30);
		tapNear(rect, 7, 2, 0);
		await expect.poll(() => changes.length).toBe(2);
		// La valeur passée reste '' : chaque appel ne porte que la droite tracée ; départ
		// non aimanté (à droite de A), arrivée aimantée sur B
		expect(changes[1]).not.toBe('droite(1;2;7;2)');
		const [x1] = changes[1].slice('droite('.length).split(';').map(Number);
		expect(x1).toBeGreaterThan(1);
		expect(changes[1].endsWith(';7;2)')).toBe(true);
		await screen.unmount();
	});

	it('la droite va jusqu’aux bords de la fenêtre', async () => {
		const { container } = await render(FigureBlock, {
			target: mainElement(),
			props: {
				node: nodeOf(BLOCK),
				answer: { value: 'droite(1;2;7;2)', isCorrect: null, disabled: false, onChange: () => {} }
			}
		});
		await expect
			.poll(() => container.querySelector('[data-testid="droite-eleve"]'), { timeout: 5000 })
			.not.toBeNull();
		const line = container.querySelector('[data-testid="droite-eleve"]') as SVGLineElement;
		const width = Number(
			(container.querySelector('[data-testid="zone-de-trace"]') as SVGRectElement).getAttribute(
				'width'
			)
		);
		expect(Number(line.getAttribute('x1'))).toBeCloseTo(0, 5);
		expect(Number(line.getAttribute('x2'))).toBeCloseTo(width, 5);
		expect(width).toBeGreaterThan(100);
	});

	it('saisie : figure en role="group" (boutons des points lisibles au lecteur d’écran)', async () => {
		const { container } = await render(FigureBlock, {
			target: mainElement(),
			props: {
				node: nodeOf(BLOCK),
				answer: { value: '', isCorrect: null, disabled: false, onChange: () => {} }
			}
		});
		await zone(container);
		expect(
			container.querySelector('svg[role="group"] [role="button"][aria-label="Point A"]')
		).not.toBeNull();
		expect(container.querySelector('svg[role="img"]')).toBeNull();
	});

	it('le départ en attente ne passe pas au bloc suivant (vue réutilisée)', async () => {
		const answer = { value: '', isCorrect: null, disabled: false, onChange: () => {} };
		const screen = await render(FigureBlock, {
			target: mainElement(),
			props: { node: nodeOf(BLOCK), answer }
		});
		tap(await zone(screen.container), 1, 2);
		await expect
			.poll(() => screen.container.querySelector('[data-testid="depart"]'))
			.not.toBeNull();
		await screen.rerender({
			node: nodeOf(BLOCK.replace('C = point(4, 5)', 'C = point(5, 4)')),
			answer
		});
		await expect.poll(() => screen.container.querySelector('[data-testid="depart"]')).toBeNull();
	});
});
