/**
 * Case « figure » mêlée à une case texte (CP-058, PR 5)
 * =====================================================
 *
 * Comportements validés par David le 2026-10-26
 * (`docs/wip/geometrie-validation-progress.md` § 8 et § 9) : l'élève trace la droite
 * (AB) puis tape « oui » ou « non » ; Valider grisé tant que la droite manque ; droite
 * fausse → le message du juge ; réponse fausse → faux, sans message de cases
 * numérotées (un enfant de CP ne lit pas « Les blancs suivants… », ni « Blanc 1 »).
 * Décor réel : la question est générée ; la saisie dans `QuestionCard`, la correction
 * dans `FlashCard`.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import QuestionCard from '../QuestionCard.svelte';
import FlashCard from '../FlashCard.svelte';
import CorrectionCard from '../CorrectionCard.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import type { TestAnswerResult } from '$lib/types/test';
import { templateMarkdown } from '$lib/ubumark';

// C presque sur la droite (AB) : 0,25 carreau au-dessus
const BLOCK = [
	'```figure-a-completer',
	'fenetre: 0 ; 10 ; 0 ; 6',
	'outils: droite',
	'verifier: droite_par A ; B',
	'---',
	'A = point(2, 3)',
	'B = point(8, 5)',
	'C = point(5, 4.25)',
	'```'
].join('\n');

const TEMPLATE = {
	id: 'test-cp058',
	title: 'Points alignés',
	status: 'draft',
	type: 'fill_in_blanks',
	variations: [
		{
			statement: templateMarkdown(
				`Les points A, B et C sont-ils alignés ? Trace la droite (AB) pour vérifier.\n\n${BLOCK}\n\nRéponds par oui ou par non : [_]`
			),
			blanks: [{ expectedAnswer: 'non' }]
		}
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

/** Tracer la droite par deux points de la figure */
async function draw(container: HTMLElement, from: [number, number], to: [number, number]) {
	const rect = await zone(container);
	tap(rect, ...from);
	tap(rect, ...to);
	await expect
		.poll(() => container.querySelectorAll('[data-testid="droite-eleve"]').length)
		.toBe(1);
}

function textInput(container: HTMLElement): HTMLInputElement {
	const input = container.querySelector<HTMLInputElement>('input[type="text"]');
	if (!input) throw new Error('case texte absente');
	return input;
}

function validateButton(container: HTMLElement): HTMLButtonElement {
	const button = [...container.querySelectorAll('button')].find((b) =>
		b.textContent?.includes('Valider')
	);
	if (!button) throw new Error('bouton Valider absent');
	return button as HTMLButtonElement;
}

const A: [number, number] = [2, 3];
const B: [number, number] = [8, 5];
const C: [number, number] = [5, 4.25];

describe('figure + case oui / non : saisie', () => {
	it('« non » tapé sans droite : Valider grisé ; la droite tracée, Valider actif', async () => {
		const { container } = await render(QuestionCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		await zone(container);
		await userEvent.type(textInput(container), 'non');
		await expect.poll(() => textInput(container).value).toBe('non');
		expect(validateButton(container).disabled).toBe(true);
		await draw(container, A, B);
		await expect.poll(() => validateButton(container).disabled).toBe(false);
	});

	it('Entrée dans la case texte sans droite : rien n’est validé', async () => {
		const { container } = await render(FlashCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		await zone(container);
		await userEvent.type(textInput(container), 'non');
		expect(validateButton(container).disabled).toBe(true);
		await userEvent.keyboard('{Enter}');
		// Laisser à l'écran le temps d'une validation tardive avant de constater l'absence
		await new Promise((resolve) => setTimeout(resolve, 200));
		expect(container.querySelector('[data-testid="front-verdict"]')).toBeNull();
		expect(container.querySelector('[data-testid="zone-de-trace"]')).not.toBeNull();
	});
});

describe('figure + case oui / non : verdict', () => {
	async function answer(from: [number, number], to: [number, number], text: string) {
		const screen = await render(FlashCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		await draw(screen.container, from, to);
		await userEvent.type(textInput(screen.container), text);
		await expect.poll(() => validateButton(screen.container).disabled).toBe(false);
		validateButton(screen.container).click();
		await expect
			.poll(() => screen.container.querySelector('[data-testid="front-verdict"]'))
			.not.toBeNull();
		return screen.container;
	}

	it('droite (AB) et « Non » : juste', async () => {
		const container = await answer(A, B, 'Non');
		expect(
			container.querySelector('[data-testid="front-verdict"]')?.getAttribute('data-kind')
		).toBe('correct');
	});

	it('droite (AC) : faux, le message du juge, sans cases numérotées', async () => {
		const container = await answer(A, C, 'non');
		const verdict = container.querySelector('[data-testid="front-verdict"]') as HTMLElement;
		expect(verdict.getAttribute('data-kind')).toBe('incorrect');
		expect(verdict.textContent).toContain('Ta droite passe par A et C, pas par B.');
		expect(container.textContent).not.toContain('blancs suivants');
		expect(container.textContent).not.toContain('Blanc 1');
	});

	it('droite (AC), case texte vide : le message du juge, pas « Tu n’as pas tout complété. »', async () => {
		const screen = await render(FlashCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		await draw(screen.container, A, C);
		await expect.poll(() => validateButton(screen.container).disabled).toBe(false);
		validateButton(screen.container).click();
		await expect
			.poll(() => screen.container.querySelector('[data-testid="front-verdict"]')?.textContent)
			.toContain('Ta droite passe par A et C, pas par B.');
	});

	it('droite (AB) et « oui » : faux, sans cases numérotées', async () => {
		const container = await answer(A, B, 'oui');
		const verdict = container.querySelector('[data-testid="front-verdict"]') as HTMLElement;
		expect(verdict.getAttribute('data-kind')).toBe('incorrect');
		expect(container.textContent).not.toContain('blancs suivants');
		expect(container.textContent).not.toContain('Blanc 2');
	});
});

describe('figure + case oui / non : copie corrigée', () => {
	it('la figure avant « Ta réponse », comme dans l’énoncé', async () => {
		const answerResult: TestAnswerResult = {
			index: 0,
			instance: instance(),
			userAnswer: {
				value: ['droite(2;3;8;5)', 'non'],
				isCorrect: true,
				timeSpent: 3,
				attempts: 1,
				submittedAt: ''
			},
			isCorrect: true
		};
		const { container } = await render(CorrectionCard, {
			target: mainElement(),
			props: { answerResult }
		});
		const front = container.querySelector('.flip-front') as HTMLElement;
		const kinds = () =>
			[...front.querySelectorAll('[data-testid="expected-result"] > [data-kind]')].map((el) =>
				el.getAttribute('data-kind')
			);
		await expect.poll(kinds).toContain('figure');
		expect(kinds()[0]).toBe('figure');
	});
});
