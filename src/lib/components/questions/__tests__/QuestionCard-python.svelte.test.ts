/**
 * QuestionCard et FlashCard — case « programme Python » : « Valider » attend que le programme
 * ait tourné (préparations des cases), puis valide avec le verdict rangé dans la valeur.
 * Python est simulé (contexte `PYTHON_CASE_RUNTIME_KEY`).
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import QuestionCard from '../QuestionCard.svelte';
import FlashCard from '../FlashCard.svelte';
import type { QuestionInstance } from '#lib/questions/types.ts';
import { resolvedMarkdown } from '#lib/ubumark/index.ts';
import {
	PYTHON_CASE_RUNTIME_KEY,
	type PythonCaseRuntime
} from '#lib/components/question-inputs/python-case-context.ts';
import { expectedPythonAnswer, readPythonAnswer } from '#lib/questions/python/python-answer.ts';

const CODE = 'def seuil(A):\n    return 1';

function instance(): QuestionInstance {
	return {
		templateId: 'tpl-python',
		statement: resolvedMarkdown(
			[
				'Écris la fonction.',
				'',
				'```python-a-ecrire',
				'case: 0',
				'fonction: seuil',
				'solution: |',
				'  def seuil(A):',
				'      return 1',
				'essais: seuil(2)',
				'```'
			].join('\n')
		),
		grades: ['T_SPE'],
		level: 1,
		generatedAt: new Date().toISOString(),
		blanks: [
			{
				expectedAnswer: expectedPythonAnswer({
					fonction: 'seuil',
					solution: CODE,
					essais: ['seuil(2)'],
					exiger: []
				}),
				expectedAnswerLatex: CODE,
				type: 'text',
				construire: 'python'
			}
		]
	} as QuestionInstance;
}

function runtime(juste: boolean): PythonCaseRuntime {
	return {
		status: 'ready',
		start: vi.fn(),
		judge: vi.fn(async () => ({ juste }))
	};
}

/** Pose une réponse écrite dans la case (comme une frappe dans l'éditeur) */
async function typeAnswer(container: HTMLElement) {
	await expect.poll(() => container.querySelector('.python-case .cm-content')).not.toBeNull();
	const content = container.querySelector<HTMLElement>('.python-case .cm-content');
	content?.focus();
	document.execCommand('insertText', false, CODE);
}

describe('« Valider » attend le programme', () => {
	it('QuestionCard : verdict juste du programme → réponse juste, code gardé', async () => {
		const onAnswerSubmit = vi.fn();
		const fake = runtime(true);
		const { container } = await render(QuestionCard, {
			props: { instance: instance(), interactive: true, onAnswerSubmit },
			context: new Map([[PYTHON_CASE_RUNTIME_KEY, fake]])
		});
		await typeAnswer(container);
		const button = [...container.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('Valider')
		);
		await expect.poll(() => button?.disabled).toBe(false);
		button?.click();
		await expect.poll(() => onAnswerSubmit.mock.calls.length).toBe(1);
		expect(fake.judge).toHaveBeenCalled();
		const [answer] = onAnswerSubmit.mock.calls[0];
		expect(answer.isCorrect).toBe(true);
		expect(readPythonAnswer(answer.value[0])?.code).toContain('return 1');
	});

	it('QuestionCard : temps écoulé (submitPendingAnswer, synchrone) → sans verdict, fausse', async () => {
		const { component, container } = await render(QuestionCard, {
			props: { instance: instance(), interactive: true },
			context: new Map([[PYTHON_CASE_RUNTIME_KEY, runtime(true)]])
		});
		await typeAnswer(container);
		await expect.poll(() => component.hasPendingAnswer()).toBe(true);
		const answer = component.submitPendingAnswer();
		expect(answer?.isCorrect).toBe(false);
		expect(readPythonAnswer(String((answer?.value as string[])[0]))?.verdict).toBeNull();
	});

	it('FlashCard : verdict faux du programme → réponse fausse', async () => {
		const onAnswerSubmit = vi.fn();
		const { container } = await render(FlashCard, {
			props: { instance: instance(), interactive: true, onAnswerSubmit },
			context: new Map([[PYTHON_CASE_RUNTIME_KEY, runtime(false)]])
		});
		await typeAnswer(container);
		const button = [...container.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('Valider')
		);
		await expect.poll(() => button?.disabled).toBe(false);
		button?.click();
		await expect.poll(() => onAnswerSubmit.mock.calls.length).toBe(1);
		expect(onAnswerSubmit.mock.calls[0][0].isCorrect).toBe(false);
	});
});
