/**
 * Figure de travail + case choix oui / non : l'écran (chantier figure-et-choix, lot 2)
 * ===================================================================================
 *
 * Comportements validés par David le 2026-10-26 (`docs/wip/figure-et-choix-progress.md`
 * § 2.3 et § 2.9) : l'élève PEUT tracer pour vérifier ; vide, la figure ne bloque pas
 * « Valider » ; le choix seul est noté ; après Valider, ses traits restent gris, ni
 * verts ni rouges ; la carte de correction montre « Ta figure de travail » en dernier.
 * Décor réel : la question est générée ; saisie et verdict dans `FlashCard`, copie dans
 * `CorrectionCard`.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FlashCard from '../FlashCard.svelte';
import QuestionCard from '../QuestionCard.svelte';
import { toDisplayInstance, toPublicQuestion } from '$lib/questions/public-question';
import { toSubmission } from '$lib/questions/submission';
import { gradeQuestion } from '$lib/questions/grading';
import type { AnswerData } from '$lib/types/question-display';
import CorrectionCard from '../CorrectionCard.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import type { TestAnswerResult } from '$lib/types/test';
import { templateMarkdown } from '$lib/ubumark';

// Constantes
const BLOCK = [
	'```figure-de-travail',
	'fenetre: 0 ; 10 ; 0 ; 6',
	'outils: droite',
	'---',
	'A = point(2, 3)',
	'B = point(8, 5)',
	'C = point(5, 4.25)',
	'```'
].join('\n');

const TEMPLATE = {
	id: 'test-cp058-travail',
	title: 'Points alignés',
	status: 'draft',
	type: 'fill_in_blanks',
	variations: [
		{
			statement: templateMarkdown(
				`Les points A, B et C sont-ils alignés ? Tu peux tracer la droite (AB) pour vérifier.\n\n${BLOCK}\n\n\`\`\`choix\nmelanger: non\n- Oui\n- Non\n\`\`\``
			),
			blanks: [{ expectedAnswer: '' }, { expectedAnswer: '1' }]
		}
	],
	grades: ['CP'],
	theme: 'Test',
	domain: 'Test',
	level: 1
} as unknown as QuestionTemplate;

const A: [number, number] = [2, 3];
const B: [number, number] = [8, 5];

// Variables
let mains: HTMLElement[] = [];

// Functions
function instance(): QuestionInstance {
	const result = generateInstance(TEMPLATE, 42);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

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

async function draw(container: HTMLElement, from: [number, number], to: [number, number]) {
	const rect = await zone(container);
	tap(rect, ...from);
	tap(rect, ...to);
	await expect
		.poll(() => container.querySelectorAll('[data-testid="droite-eleve"]').length)
		.toBe(1);
}

function choiceButton(root: HTMLElement, letter: string): HTMLButtonElement {
	const button = [...root.querySelectorAll<HTMLButtonElement>('[role="radio"]')].find(
		(b) => b.querySelector('.choice-letter')?.textContent === letter
	);
	if (!button) throw new Error(`choix ${letter} absent`);
	return button;
}

function validateButton(container: HTMLElement): HTMLButtonElement {
	const button = [...container.querySelectorAll('button')].find((b) =>
		b.textContent?.includes('Valider')
	);
	if (!button) throw new Error('bouton Valider absent');
	return button as HTMLButtonElement;
}

async function verdictKind(container: HTMLElement): Promise<string | null> {
	await expect.poll(() => container.querySelector('[data-testid="front-verdict"]')).not.toBeNull();
	return (
		container.querySelector('[data-testid="front-verdict"]')?.getAttribute('data-kind') ?? null
	);
}

// Tests
describe('figure de travail + case choix : saisie et verdict', () => {
	it('rien tracé : Valider actif dès le choix ; « Non » juste', async () => {
		const { container } = await render(FlashCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		await zone(container);
		choiceButton(container, 'B').click();
		await expect.poll(() => validateButton(container).disabled).toBe(false);
		validateButton(container).click();
		expect(await verdictKind(container)).toBe('correct');
	});

	it('droite tracée puis « Oui » : faux, sans message de cases numérotées', async () => {
		const { container } = await render(FlashCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		await draw(container, A, B);
		choiceButton(container, 'A').click();
		await expect.poll(() => validateButton(container).disabled).toBe(false);
		validateButton(container).click();
		expect(await verdictKind(container)).toBe('incorrect');
		expect(container.textContent).not.toContain('blancs suivants');
		expect(container.textContent).not.toContain('pas tout complété');
		// Le message du choix une seule fois (pas de « Blanc 1 : » qui le répète)
		await expect.poll(() => container.textContent).toContain('Le choix correct');
		expect(container.textContent?.split('Le choix correct').length).toBe(2);
	});

	it('après Valider : les traits restent, gris, ni verts ni bonne droite', async () => {
		const { container } = await render(FlashCard, {
			target: mainElement(),
			props: { instance: instance(), interactive: true }
		});
		await draw(container, A, B);
		choiceButton(container, 'B').click();
		await expect.poll(() => validateButton(container).disabled).toBe(false);
		validateButton(container).click();
		expect(await verdictKind(container)).toBe('correct');
		await expect
			.poll(() => container.querySelector('[data-testid="droite-eleve"].droite-travail'))
			.not.toBeNull();
		expect(container.querySelector('.droite-juste')).toBeNull();
		expect(container.querySelector('[data-testid="bonne-droite"]')).toBeNull();
	});
});

describe('figure de travail : carte de correction', () => {
	async function card(values: string[]) {
		const answerResult: TestAnswerResult = {
			index: 0,
			instance: instance(),
			userAnswer: { value: values, isCorrect: true, timeSpent: 3, attempts: 1, submittedAt: '' },
			isCorrect: true
		};
		return await render(CorrectionCard, { target: mainElement(), props: { answerResult } });
	}

	function kinds(container: HTMLElement): (string | null)[] {
		const front = container.querySelector('.flip-front') as HTMLElement;
		return [...front.querySelectorAll('[data-testid="expected-result"] > [data-kind]')].map((el) =>
			el.getAttribute('data-kind')
		);
	}

	it('« Ta figure de travail » en dernier, ses traits gris', async () => {
		const { container } = await card(['droite(2;3;8;5)', '1']);
		await expect.poll(() => kinds(container)).toContain('work-figure');
		expect(kinds(container).at(-1)).toBe('work-figure');
		const line = container.querySelector('[data-kind="work-figure"]') as HTMLElement;
		expect(line.textContent).toContain('Ta figure de travail :');
		await expect
			.poll(() => line.querySelector('[data-testid="droite-eleve"].droite-travail'))
			.not.toBeNull();
		expect(line.querySelector('.droite-juste')).toBeNull();
		expect(line.querySelector('[data-testid="bonne-droite"]')).toBeNull();
	});

	it('rien tracé : « aucun tracé »', async () => {
		const { container } = await card(['', '1']);
		await expect.poll(() => kinds(container)).toContain('work-figure');
		const line = container.querySelector('[data-kind="work-figure"]') as HTMLElement;
		expect(line.textContent).toContain('Ta figure de travail : aucun tracé.');
	});
});

describe('figure de travail en évaluation notée (version publique)', () => {
	it('rien tracé : Valider actif dès le choix ; la copie envoyée vaut 1 point', async () => {
		const full = instance();
		const onAnswerSubmit = vi.fn<(answer: AnswerData) => void>();
		const { container } = await render(QuestionCard, {
			target: mainElement(),
			props: {
				interactive: true,
				collectOnly: true,
				instance: toDisplayInstance(toPublicQuestion(full, { position: 0, delaySeconds: 20 })),
				onAnswerSubmit
			}
		});
		await zone(container);
		choiceButton(container, 'B').click();
		await expect.poll(() => validateButton(container).disabled).toBe(false);
		validateButton(container).click();
		await vi.waitFor(() => expect(onAnswerSubmit).toHaveBeenCalledTimes(1));
		const submission = toSubmission(
			[0],
			[{ index: 0, instance: full, isCorrect: false, userAnswer: onAnswerSubmit.mock.calls[0][0] }]
		);
		expect(gradeQuestion(full, submission.answers[0]).points).toBe(1);
	});
});
