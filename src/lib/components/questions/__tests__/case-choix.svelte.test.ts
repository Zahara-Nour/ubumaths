/**
 * Case « choix » à l'écran (chantier figure-et-choix § 2.1, PR 1a interface)
 * =========================================================================
 *
 * Les choix s'affichent À L'ENDROIT du bloc ```choix dans l'énoncé : ronds (une
 * réponse) ou carrés (plusieurs), lettres A, B, C, contenu en markdown. La
 * valeur de la case = indices d'origine cochés (« 1 », « 0;2 »). Une case choix
 * vide compte comme une case vide. Après correction : les choix à leur place,
 * cochés de l'élève et bons choix marqués comme le QCM, jamais deux fois. Hors
 * question, le bloc est une liste A, B, C non cliquable, jamais du code.
 */
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { MathfieldElement } from 'mathlive';
import QuestionCard from '../QuestionCard.svelte';
import FlashCard from '../FlashCard.svelte';
import CorrectionCard from '../CorrectionCard.svelte';
import { MarkdownRenderer } from '$lib/components/markdown';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import type { AnswerData } from '$lib/types/question-display';
import type { TestAnswerResult } from '$lib/types/test';
import { templateMarkdown } from '$lib/ubumark';

// Fixtures
function generate(statement: string, expected: string[], seed = 42): QuestionInstance {
	const result = generateInstance(
		{
			id: 'test-case-choix',
			title: 'Case choix',
			status: 'draft',
			type: 'fill_in_blanks',
			variations: [
				{
					statement: templateMarkdown(statement),
					blanks: expected.map((expectedAnswer) => ({ expectedAnswer }))
				}
			],
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1
		} as unknown as QuestionTemplate,
		seed
	);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

/** Une case math, puis une case choix (Oui / Non, non mélangée), puis du texte */
const MIXED = () =>
	generate(
		'Calcule $2+3=?$.\n\nEst-ce pair ?\n\n```choix\nmelanger: non\n- Oui\n- Non\n```\n\nFin.',
		['5', '1']
	);

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

beforeAll(async () => {
	await import('mathlive');
	await customElements.whenDefined('math-field');
});

const textIndex = (root: HTMLElement, text: string) => (root.textContent ?? '').indexOf(text);

function validateButton(root: HTMLElement): HTMLButtonElement {
	const button = [...root.querySelectorAll('button')].find(
		(b) => b.textContent?.trim() === 'Valider'
	);
	if (!button) throw new Error('bouton Valider absent');
	return button as HTMLButtonElement;
}

function choiceButton(root: HTMLElement, letter: string): HTMLButtonElement {
	const button = [
		...root.querySelectorAll<HTMLButtonElement>('[role="radio"], [role="checkbox"]')
	].find((b) => b.querySelector('.choice-letter')?.textContent === letter);
	if (!button) throw new Error(`choix ${letter} absent`);
	return button;
}

/** Tape `keys` dans la case du champ MathLive */
async function typeInPrompt(root: HTMLElement, keys: string) {
	await expect.poll(() => root.querySelector('math-field')).toBeTruthy();
	const field = root.querySelector('math-field') as MathfieldElement;
	await expect
		.poll(() => {
			field.focus();
			return document.activeElement === field;
		})
		.toBe(true);
	await userEvent.keyboard(keys);
	await expect.poll(() => field.getPromptValue('0')).toBe(keys);
}

// Tests
describe('saisie : les choix à l’endroit du bloc', () => {
	it('ronds A / B dans un groupe radio, entre la question et la suite, jamais du code', async () => {
		const { container } = await render(QuestionCard, {
			target: mainElement(),
			props: { instance: MIXED(), interactive: true }
		});
		const group = await expect
			.poll(() => container.querySelector('[role="radiogroup"]'))
			.toBeTruthy()
			.then(() => container.querySelector('[role="radiogroup"]') as HTMLElement);
		expect(group.getAttribute('aria-label')).toBe('Case 2 : choix');
		const radios = [...group.querySelectorAll('[role="radio"]')];
		expect(radios.map((r) => r.querySelector('.choice-letter')?.textContent)).toEqual(['A', 'B']);
		expect(radios.map((r) => r.querySelector('.choice-content')?.textContent?.trim())).toEqual([
			'Oui',
			'Non'
		]);
		// À sa place : après « Est-ce pair ? », avant « Fin. »
		expect(textIndex(container, 'Est-ce pair')).toBeLessThan(textIndex(container, 'Oui'));
		expect(textIndex(container, 'Non')).toBeLessThan(textIndex(container, 'Fin.'));
		expect(container.querySelector('pre')).toBeNull();
		expect(container.textContent).not.toContain('case: 1');
	});

	it('case choix vide = case vide : Valider grisé ; cochée, la valeur part en indice d’origine', async () => {
		const answers: AnswerData[] = [];
		const { container } = await render(QuestionCard, {
			target: mainElement(),
			props: {
				instance: MIXED(),
				interactive: true,
				onAnswerSubmit: (answer: AnswerData) => answers.push(answer)
			}
		});
		await typeInPrompt(container, '5');
		await expect.poll(() => validateButton(container).disabled).toBe(true);
		choiceButton(container, 'B').click();
		await expect.poll(() => choiceButton(container, 'B').getAttribute('aria-checked')).toBe('true');
		await expect.poll(() => validateButton(container).disabled).toBe(false);
		validateButton(container).click();
		await expect.poll(() => answers.length).toBe(1);
		expect(answers[0].value).toEqual(['5', '1']);
	});

	it('plusieurs: oui → carrés, indices d’origine triés malgré le mélange', async () => {
		const instance = generate(
			'Choisis.\n\n```choix\nplusieurs: oui\n- a\n- b\n- c\n- d\n```',
			['0;2'],
			7
		);
		const order = instance.blanks?.[0].choice?.order ?? [];
		const answers: AnswerData[] = [];
		const { container } = await render(QuestionCard, {
			target: mainElement(),
			props: {
				instance,
				interactive: true,
				onAnswerSubmit: (answer: AnswerData) => answers.push(answer)
			}
		});
		await expect
			.poll(() => container.querySelector('[role="group"][aria-label="Case 1 : choix"]'))
			.toBeTruthy();
		expect(container.querySelectorAll('[role="checkbox"]')).toHaveLength(4);
		choiceButton(container, 'D').click();
		choiceButton(container, 'A').click();
		await expect.poll(() => validateButton(container).disabled).toBe(false);
		validateButton(container).click();
		await expect.poll(() => answers.length).toBe(1);
		const expected = [order[3], order[0]].sort((x, y) => x - y).join(';');
		expect(answers[0].value).toEqual([expected]);
	});

	it('clavier : les flèches passent d’un choix à l’autre', async () => {
		const { container } = await render(QuestionCard, {
			target: mainElement(),
			props: { instance: MIXED(), interactive: true }
		});
		await expect.poll(() => container.querySelector('[role="radiogroup"]')).toBeTruthy();
		choiceButton(container, 'A').focus();
		await userEvent.keyboard('{ArrowDown}');
		expect(document.activeElement).toBe(choiceButton(container, 'B'));
	});
});

describe('après correction : les choix à leur place, une seule fois', () => {
	it('FlashCard : au recto, le choix coché à tort marqué ; au verso, les choix dans l’énoncé rempli', async () => {
		const { container } = await render(FlashCard, {
			target: mainElement(),
			props: { instance: MIXED(), interactive: true }
		});
		const front = container.querySelector('.flip-card-front') as HTMLElement;
		await typeInPrompt(front, '5');
		choiceButton(front, 'A').click();
		await expect.poll(() => validateButton(front).disabled).toBe(false);
		validateButton(front).click();
		await expect.poll(() => choiceButton(front, 'A').classList.contains('incorrect')).toBe(true);
		expect(choiceButton(front, 'B').classList.contains('correct')).toBe(true);

		const back = container.querySelector('.flip-card-back') as HTMLElement;
		await expect.poll(() => back.querySelector('[data-kind="choices"]')).toBeTruthy();
		// Une seule liste, DANS l'énoncé rempli, entre la question et la suite
		expect(back.querySelectorAll('[data-kind="choices"]')).toHaveLength(1);
		const filled = back.querySelector('[data-kind="filled-statement"]') as HTMLElement;
		expect(filled.querySelector('[data-kind="choices"]')).not.toBeNull();
		expect(textIndex(filled, 'Est-ce pair')).toBeLessThan(textIndex(filled, 'Oui'));
		expect(textIndex(filled, 'Non')).toBeLessThan(textIndex(filled, 'Fin.'));
		const statuses = [...filled.querySelectorAll('[data-kind="choices"] li')].map((li) =>
			li.getAttribute('data-status')
		);
		expect(statuses).toEqual(['incorrect', 'solution']);
	});

	it('copie corrigée (CorrectionCard) : les choix dans l’énoncé rempli, une seule fois, jamais du code', async () => {
		const answerResult: TestAnswerResult = {
			index: 0,
			instance: MIXED(),
			userAnswer: {
				value: ['5', '1'],
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
		await expect.poll(() => front.querySelector('[data-kind="choices"]')).toBeTruthy();
		expect(front.querySelectorAll('[data-kind="choices"]')).toHaveLength(1);
		const filled = front.querySelector('[data-kind="filled-statement"]') as HTMLElement;
		const statuses = [...filled.querySelectorAll('[data-kind="choices"] li')].map((li) =>
			li.getAttribute('data-status')
		);
		expect(statuses).toEqual(['neutral', 'correct']);
		expect(front.querySelector('pre')).toBeNull();
		expect(front.textContent).not.toContain('case: 1');
	});
});

describe('hors question : liste A, B, C non cliquable', () => {
	it('MarkdownRenderer : lettres et contenu en markdown, aucun bouton, aucun code', async () => {
		const { container } = await render(MarkdownRenderer, {
			target: mainElement(),
			props: { content: 'Question.\n\n```choix\n- **Oui**\n- $x^2$\n```' }
		});
		const list = await expect
			.poll(() => container.querySelector('[data-kind="choice-static"]'))
			.toBeTruthy()
			.then(() => container.querySelector('[data-kind="choice-static"]') as HTMLElement);
		expect(
			[...list.querySelectorAll('li')].map((li) => li.querySelector('[data-letter]')?.textContent)
		).toEqual(['A', 'B']);
		expect(list.querySelector('strong')?.textContent).toBe('Oui');
		expect(list.querySelector('math-span, .katex, math')).not.toBeNull();
		expect(container.querySelector('button')).toBeNull();
		expect(container.querySelector('pre')).toBeNull();
	});
});

describe('case choix : texte d’aide sous la question', () => {
	const HELPER = 'Remplissez les blancs avec vos réponses';

	it('choix seul : pas de « Remplissez les blancs » (aucun blanc à remplir)', async () => {
		const { container } = await render(QuestionCard, {
			target: mainElement(),
			props: {
				instance: generate('Est-ce pair ?\n\n```choix\nmelanger: non\n- Oui\n- Non\n```', ['1']),
				interactive: true
			}
		});
		await expect.poll(() => container.querySelector('[role="radiogroup"]')).toBeTruthy();
		expect(container.textContent).not.toContain(HELPER);
	});

	it('une case à écrire à côté du choix : le texte d’aide reste', async () => {
		const { container } = await render(QuestionCard, {
			target: mainElement(),
			props: { instance: MIXED(), interactive: true }
		});
		await expect.poll(() => container.querySelector('[role="radiogroup"]')).toBeTruthy();
		expect(container.textContent).toContain(HELPER);
	});
});
