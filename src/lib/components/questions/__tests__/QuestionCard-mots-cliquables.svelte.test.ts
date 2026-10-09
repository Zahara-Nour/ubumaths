/**
 * Mots cliquables dans une question (lot 2 du lexique, comportements 12 et 13,
 * validés par David le 2026-10-09) : au niveau de l'élève connecté, sinon au
 * plus petit niveau de la question ; jamais en évaluation notée.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { render } from 'vitest-browser-svelte';
import QuestionCard from '../QuestionCard.svelte';
import ReaderGradeHarness from './ReaderGradeHarness.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import { resolvedMarkdown, templateMarkdown } from '$lib/ubumark';

function instanceOf(statement: string, grades: string[]): QuestionInstance {
	const template = {
		id: '00000000-0000-4000-8000-0000000000d1',
		title: 'Mots cliquables',
		theme: 'T',
		domain: 'D',
		level: 1,
		grades,
		status: 'published',
		variations: [
			{
				statement: templateMarkdown(statement),
				correctChoiceIndex: ['0'],
				choices: [{ content: '$$4$$' }, { content: '$$3$$' }]
			}
		]
	} as unknown as QuestionTemplate;
	const result = generateInstance(template, 1);
	if (!result.success) throw new Error('instance non générée');
	return result.instance;
}

/** Une question à champ de réponse (formule à compléter), comme en entraînement. */
const WITH_PROMPT = {
	templateId: 'b03',
	statement: resolvedMarkdown('Calcule la somme : $3+5=\\placeholder[0]{}$'),
	blanks: [{ expectedAnswer: '8', expectedAnswerLatex: '8', type: 'math' }],
	correction: { steps: [resolvedMarkdown('$3+5=8$')] },
	grades: ['6'],
	theme: 'Calcul',
	domain: 'Nombres',
	level: 1,
	generatedAt: new Date().toISOString()
} as QuestionInstance;

beforeAll(async () => {
	await import('mathlive');
	await customElements.whenDefined('math-field');
});

function lexiconButtons(container: HTMLElement): string[] {
	return [...container.querySelectorAll('button.lexicon-term')].map((b) => b.textContent ?? '');
}

describe('mots cliquables dans une question', () => {
	it('en entraînement, les mots de l’énoncé sont cliquables', async () => {
		const { container } = await render(QuestionCard, {
			interactive: true,
			instance: instanceOf('Calcule l’aire du rectangle.', ['6'])
		});
		await expect.poll(() => lexiconButtons(container)).toEqual(['Calcule', 'aire', 'rectangle']);
	});

	it('13. en évaluation notée, aucun mot n’est souligné', async () => {
		// Une carte d'entraînement d'abord : le dictionnaire est chargé, l'absence prouve le refus
		const entrainement = await render(QuestionCard, {
			interactive: true,
			instance: instanceOf('Calcule l’aire.', ['6'])
		});
		await expect.poll(() => lexiconButtons(entrainement.container)).toEqual(['Calcule', 'aire']);
		const evaluation = await render(QuestionCard, {
			interactive: true,
			collectOnly: true,
			instance: instanceOf('Calcule l’aire.', ['6'])
		});
		await expect.poll(() => evaluation.container.textContent).toContain('Calcule');
		expect(lexiconButtons(evaluation.container)).toEqual([]);
	});

	// Le dictionnaire arrive après le premier affichage : l'énoncé ne doit pas
	// recréer le champ de réponse, où l'élève a peut-être déjà commencé à taper
	it('le champ de réponse reste le même quand les mots deviennent cliquables', async () => {
		const { container } = await render(QuestionCard, { interactive: true, instance: WITH_PROMPT });
		await expect.poll(() => container.querySelector('math-field')).not.toBeNull();
		const field = container.querySelector('math-field');
		await expect.poll(() => lexiconButtons(container)).toEqual(['Calcule', 'somme']);
		expect(container.querySelector('math-field')).toBe(field);
		expect(field?.isConnected).toBe(true);
	});

	it('12. le niveau de l’élève connecté l’emporte sur celui de la question', async () => {
		const { container } = await render(ReaderGradeHarness, {
			instance: instanceOf('Calcule la dérivée.', ['6']),
			readerGrade: '1_SPE'
		});
		await expect.poll(() => lexiconButtons(container)).toEqual(['Calcule', 'dérivée']);
	});

	it('12. sans élève connecté, le plus petit niveau de la question', async () => {
		const { container } = await render(ReaderGradeHarness, {
			instance: instanceOf('Calcule la dérivée.', ['6', '1_SPE']),
			readerGrade: null
		});
		await expect.poll(() => lexiconButtons(container)).toEqual(['Calcule']);
	});
});
