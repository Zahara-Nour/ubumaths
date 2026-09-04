import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FlashCard from '../FlashCard.svelte';
import type { QuestionInstance } from '$lib/questions/types';
import { resolvedMarkdown } from '$lib/ubumark';

/**
 * Régression : `getQuestionType()` ne connaît que deux types — sans `choices`,
 * une question est classée `fill_in_blanks`. Si elle n'a pas non plus de
 * `blanks`, la face réponse n'avait aucune branche pour ce cas et rendait un
 * encadré vert entièrement vide, sans le moindre message.
 */
describe('FlashCard — face réponse sans réponse structurée', () => {
	function instance(overrides: Partial<QuestionInstance> = {}): QuestionInstance {
		return {
			templateId: 'test',
			statement: resolvedMarkdown('Calculer $$\\frac{3}{4} + \\frac{1}{2}$$'),
			grades: ['6'],
			theme: 'Algèbre',
			domain: 'Fractions',
			level: 1,
			generatedAt: new Date().toISOString(),
			...overrides
		} as QuestionInstance;
	}

	async function flipToAnswer(container: HTMLElement) {
		const flip = container.querySelector<HTMLButtonElement>('[aria-label="Voir la correction"]');
		expect(flip).not.toBeNull();
		flip?.click();
		await new Promise((r) => setTimeout(r, 0));
	}

	it('renvoie vers l’explication quand il y en a une', async () => {
		const { container } = render(FlashCard, {
			instance: instance({
				correction: { steps: [resolvedMarkdown('On réduit au même dénominateur.')] }
			} as Partial<QuestionInstance>)
		});

		await flipToAnswer(container);

		expect(container.textContent).toContain("voir l'explication ci-dessous");
	});

	it('le dit explicitement quand il n’y a rien à montrer', async () => {
		const { container } = render(FlashCard, { instance: instance() });

		await flipToAnswer(container);

		expect(container.textContent).toContain('Aucune réponse enregistrée');
	});

	it('ne montre pas le repli quand la question a des blancs', async () => {
		const { container } = render(FlashCard, {
			instance: instance({
				blanks: [{ expectedAnswer: '5/4', type: 'math' }]
			} as Partial<QuestionInstance>)
		});

		await flipToAnswer(container);

		expect(container.textContent).not.toContain('Aucune réponse enregistrée');
		expect(container.textContent).not.toContain("voir l'explication ci-dessous");
	});
});
