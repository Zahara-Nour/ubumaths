/**
 * Case répondue en QCM à l'écran (chantier idees-format, idée 4, PR 2)
 * ====================================================================
 *
 * La question tirée « en QCM » (`asChoiceInstance`) : la formule garde des
 * pointillés à la place de la case, les choix (bonne réponse et erreurs prévues)
 * suivent en ronds A, B, C… rendus en maths ; aucune saisie. Copie corrigée :
 * l'erreur prévue cochée affiche son message.
 */
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { render } from 'vitest-browser-svelte';
import QuestionCard from '../QuestionCard.svelte';
import CorrectionCard from '../CorrectionCard.svelte';
import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
import { asChoiceInstance } from '#lib/questions/choice-from-errors.ts';
import type { QuestionInstance, QuestionTemplate } from '#lib/questions/types.ts';
import type { AnswerData } from '#lib/types/question-display.ts';
import type { TestAnswerResult } from '#lib/types/test.ts';
import { templateMarkdown } from '#lib/ubumark/index.ts';

// Fixtures
const SOUSTRAIT = 'Tu as soustrait au lieu d’additionner.';

function qcm(): QuestionInstance {
	const result = generateInstance(
		{
			id: 'case-en-qcm',
			title: 'Case en QCM',
			status: 'draft',
			variations: [
				{
					statement: templateMarkdown('Calcule $8+4=?$'),
					blanks: [
						{
							expectedAnswer: '12',
							expectedErrors: [
								{ answer: '4', message: SOUSTRAIT },
								{ answer: '32', message: 'Tu as multiplié.' }
							]
						}
					]
				}
			],
			grades: ['6'],
			level: 1
		} as unknown as QuestionTemplate,
		3
	);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	const instance = asChoiceInstance(result.instance, 3);
	if (!instance) throw new Error('restée en saisie');
	return instance;
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

beforeAll(async () => {
	await import('mathlive');
	await customElements.whenDefined('math-field');
});

function radios(root: HTMLElement): HTMLButtonElement[] {
	return [...root.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
}

function validateButton(root: HTMLElement): HTMLButtonElement {
	const button = [...root.querySelectorAll('button')].find(
		(b) => b.textContent?.trim() === 'Valider'
	);
	if (!button) throw new Error('bouton Valider absent');
	return button as HTMLButtonElement;
}

// Tests
describe('question en QCM : ce que voit l’élève', () => {
	it('trois ronds rendus en maths (MathLive), aucune case à taper, jamais du code', async () => {
		const instance = qcm();
		const { container } = await render(QuestionCard, {
			target: mainElement(),
			props: { instance, interactive: true }
		});
		await expect.poll(() => radios(container).length).toBe(3);
		expect(container.querySelector('math-field')).toBeNull();
		expect(container.querySelector('pre')).toBeNull();
		expect(container.textContent).not.toContain('case: 0');
		expect(container.textContent).not.toContain('$');
		// Chaque choix porte un rendu mathématique (MathLive statique), pas du texte brut
		for (const radio of radios(container)) {
			expect(radio.querySelector('math-span')).not.toBeNull();
		}
	});

	it('cocher une erreur prévue envoie son indice d’origine', async () => {
		const instance = qcm();
		const answers: AnswerData[] = [];
		const { container } = await render(QuestionCard, {
			target: mainElement(),
			props: {
				instance,
				interactive: true,
				onAnswerSubmit: (answer: AnswerData) => answers.push(answer)
			}
		});
		await expect.poll(() => radios(container).length).toBe(3);
		const order = instance.blanks?.[0].choice?.order ?? [];
		const position = order.indexOf(1);
		radios(container)[position].click();
		await expect.poll(() => validateButton(container).disabled).toBe(false);
		validateButton(container).click();
		await expect.poll(() => answers.length).toBe(1);
		expect(answers[0].value).toEqual(['1']);
	});
});

describe('copie corrigée : le message de l’erreur prévue cochée', () => {
	it('CorrectionCard affiche le message sous les choix', async () => {
		const answerResult: TestAnswerResult = {
			index: 0,
			instance: qcm(),
			userAnswer: { value: ['1'], isCorrect: false, timeSpent: 3, attempts: 1, submittedAt: '' },
			isCorrect: false
		};
		const { container } = await render(CorrectionCard, {
			target: mainElement(),
			props: { answerResult }
		});
		const front = container.querySelector('.flip-front') as HTMLElement;
		await expect.poll(() => front.querySelector('[data-kind="choices"]')).toBeTruthy();
		await expect.poll(() => front.textContent ?? '').toContain(SOUSTRAIT);
	});
});
