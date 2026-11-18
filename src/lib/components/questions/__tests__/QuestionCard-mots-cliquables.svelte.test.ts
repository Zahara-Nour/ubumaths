/**
 * Mots cliquables dans une question (lot 2 du lexique, comportements 12 et 13,
 * validés par David le 2026-10-09) : au niveau de l'élève connecté ; sinon
 * soulignement au plus haut niveau de la question et fiche au plus petit (R3 et
 * Q1 du chantier `mots-cliquables`) ; jamais en évaluation notée.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import QuestionCard from '../QuestionCard.svelte';
import ReaderGradeHarness from './ReaderGradeHarness.svelte';
import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
import type { QuestionInstance, QuestionTemplate } from '#lib/questions/types.ts';
import { templateMarkdown } from '#lib/ubumark/index.ts';

// Le dictionnaire arrive de /api/dictionnaire (ADR 0022) : ici, le jeu de référence figé
vi.mock('#lib/dictionary/fetch-dictionary.ts', async () => {
	const { REFERENCE_DICTIONARY: entries } =
		await import('../../../../../tests/fixtures/lexique/dictionnaire-reference');
	return { fetchDictionary: async () => entries };
});

function instanceOf(
	statement: string,
	grades: string[],
	choices: string[] = ['$$4$$', '$$3$$']
): QuestionInstance {
	const template = {
		id: '00000000-0000-4000-8000-0000000000d1',
		title: 'Mots cliquables',
		level: 1,
		grades,
		status: 'published',
		variations: [
			{
				statement: templateMarkdown(
					`${statement}\n\n\`\`\`choix\n${choices.map((choice) => `- ${choice}`).join('\n')}\n\`\`\``
				),
				blanks: [{ expectedAnswer: '0' }]
			}
		]
	} as unknown as QuestionTemplate;
	const result = generateInstance(template, 1);
	if (!result.success) throw new Error('instance non générée');
	return result.instance;
}

function lexiconButtons(container: HTMLElement): string[] {
	return [...container.querySelectorAll('button.lexicon-term')].map((b) => b.textContent ?? '');
}

describe('mots cliquables dans une question', () => {
	it('en entraînement, les mots de l’énoncé sont cliquables', async () => {
		const { container } = await render(QuestionCard, {
			interactive: true,
			instance: instanceOf('Le quotient du pourcentage à l’échelle.', ['6'])
		});
		await expect
			.poll(() => lexiconButtons(container))
			.toEqual(['quotient', 'pourcentage', 'échelle']);
	});

	it('13. en évaluation notée, aucun mot n’est souligné', async () => {
		// Une carte d'entraînement d'abord : le dictionnaire est chargé, l'absence prouve le refus
		const entrainement = await render(QuestionCard, {
			interactive: true,
			instance: instanceOf('Le pourcentage.', ['6'])
		});
		await expect.poll(() => lexiconButtons(entrainement.container)).toEqual(['pourcentage']);
		const evaluation = await render(QuestionCard, {
			interactive: true,
			collectOnly: true,
			instance: instanceOf('Le pourcentage.', ['6'])
		});
		await expect.poll(() => evaluation.container.textContent).toContain('pourcentage');
		expect(lexiconButtons(evaluation.container)).toEqual([]);
	});

	// Un choix de case choix est un bouton : un clic sur un mot enverrait la réponse
	it('aucun mot cliquable dans les réponses d’une case choix', async () => {
		const { container } = await render(QuestionCard, {
			interactive: true,
			instance: instanceOf(
				'Quelle figure a quatre côtés égaux ?',
				// CP : « côté » et « triangle » sont des mots récents (R1)
				['CP'],
				['un losange', 'un triangle']
			)
		});
		await expect.poll(() => lexiconButtons(container)).toEqual(['côtés']);
		expect(container.querySelector('.choice-content button.lexicon-term')).toBeNull();
	});

	it('12. le niveau de l’élève connecté l’emporte sur celui de la question', async () => {
		const { container } = await render(ReaderGradeHarness, {
			instance: instanceOf('Calcule la dérivée.', ['6']),
			readerGrade: '1_SPE'
		});
		// « Calcule » (CE1) : trop ancien pour un élève de 1re (R1)
		await expect.poll(() => lexiconButtons(container)).toEqual(['dérivée']);
	});

	it('R3. sans élève connecté, le plus haut niveau de la question', async () => {
		const { container } = await render(ReaderGradeHarness, {
			instance: instanceOf('Calcule la dérivée.', ['6', '1_SPE']),
			readerGrade: null
		});
		await expect.poll(() => lexiconButtons(container)).toEqual(['dérivée']);
	});

	// N4 + Q1 : fiche au plus petit niveau (4e), mais « fonction » n'arrive qu'en 3e ;
	// sans le niveau de secours de `lexiconCard`, sa fiche serait vide.
	it('R3. professeur ou visiteur, question 4e + 3e : un mot de 3e souligné, sa fiche n’est pas vide', async () => {
		const { container } = await render(ReaderGradeHarness, {
			instance: instanceOf('Trace la fonction.', ['4', '3']),
			readerGrade: null
		});
		await expect.poll(() => lexiconButtons(container)).toEqual(['fonction']);
		await userEvent.click(container.querySelector<HTMLButtonElement>('button.lexicon-term')!);
		await expect
			.poll(() => document.querySelector('[role="dialog"]')?.textContent)
			.toContain('Procédé qui, à chaque nombre');
	});
});
