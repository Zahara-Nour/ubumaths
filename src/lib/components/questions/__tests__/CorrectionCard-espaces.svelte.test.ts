/**
 * Réglage « Espaces dès 4 chiffres » (E2, option C, simplify-carte § 43) : la carte pose
 * le seuil de son modèle, et les formules de la question l'écrivent. Sans réglage, le
 * BIPM (`7900`). Revue du lot 4d : sans ce test, un fournisseur oublié passerait en silence.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CorrectionCard from '../CorrectionCard.svelte';
import type { QuestionInstance } from '$lib/questions/types';
import type { TestAnswerResult } from '$lib/types/test';
import { resolvedMarkdown } from '$lib/ubumark';

function result(options?: QuestionInstance['options']): TestAnswerResult {
	return {
		index: 0,
		instance: {
			templateId: 't',
			statement: resolvedMarkdown('Calcule $7900+100 = \\placeholder[0]{}$'),
			blanks: [{ expectedAnswer: '8000', expectedAnswerLatex: '8000', type: 'math' }],
			grades: ['CM1'],
			theme: 'Entiers',
			domain: 'Additionner',
			level: 1,
			generatedAt: new Date().toISOString(),
			options
		} as QuestionInstance,
		userAnswer: { value: ['8000'], isCorrect: true, timeSpent: 3, attempts: 1, submittedAt: '' },
		isCorrect: true
	};
}

async function formulas(options?: QuestionInstance['options']): Promise<string> {
	const main = document.body.appendChild(document.createElement('main'));
	const { container } = await render(CorrectionCard, {
		target: main,
		props: { answerResult: result(options) }
	});
	await expect.poll(() => container.querySelectorAll('math-span').length).toBeGreaterThan(0);
	return [...container.querySelectorAll('math-span')].map((m) => m.textContent ?? '').join('\n');
}

describe('CorrectionCard — seuil des espaces de groupement du modèle', () => {
	it('modèle réglé « Espaces dès 4 chiffres » : 7\\,900', async () => {
		const latex = await formulas({ constraints: { spacesFromFourDigits: true } });
		expect(latex).toContain('7\\,900');
		expect(latex).not.toMatch(/7900/);
	});

	it('modèle non réglé (BIPM) : 7900 sans espace', async () => {
		const latex = await formulas();
		expect(latex).toContain('7900');
		expect(latex).not.toContain('7\\,900');
	});
});
