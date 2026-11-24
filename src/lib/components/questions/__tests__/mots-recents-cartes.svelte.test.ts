/**
 * Moins de mots soulignés sur les cartes (chantier `mots-cliquables`,
 * comportements validés par David le 2026-11-16) : R1 mots récents, R2 rien
 * dans la correction, R3 niveau d'un professeur ou d'un visiteur, R4 question
 * de cours. Le repérage lui-même : src/lib/dictionary/__tests__/mots-recents.test.ts.
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import QuestionCard from '../QuestionCard.svelte';
import FlashCard from '../FlashCard.svelte';
import CorrectionCard from '../CorrectionCard.svelte';
import ReaderGradeHarness from './ReaderGradeHarness.svelte';
import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
import type { QuestionInstance, QuestionTemplate } from '#lib/questions/types.ts';
import type { TestAnswerResult } from '#lib/types/test.ts';
import { resolvedMarkdown, templateMarkdown } from '#lib/ubumark/index.ts';

// Le dictionnaire arrive de /api/dictionnaire (ADR 0022) : ici, le jeu de référence figé
vi.mock('#lib/dictionary/fetch-dictionary.ts', async () => {
	const { REFERENCE_DICTIONARY: entries } =
		await import('../../../../../tests/fixtures/lexique/dictionnaire-reference');
	return { fetchDictionary: async () => entries };
});

function instanceOf(
	statement: string,
	grades: string[],
	extra: { options?: Record<string, unknown>; correction?: string } = {}
): QuestionInstance {
	const template = {
		id: '00000000-0000-4000-8000-0000000000d3',
		title: 'Mots récents',
		level: 1,
		grades,
		status: 'published',
		...(extra.options && { options: extra.options }),
		variations: [
			{
				statement: templateMarkdown(`${statement}\n\n\`\`\`choix\n- $$4$$\n- $$3$$\n\`\`\``),
				blanks: [{ expectedAnswer: '0' }],
				...(extra.correction && {
					correction: { steps: [templateMarkdown(extra.correction)] }
				})
			}
		]
	} as unknown as QuestionTemplate;
	const result = generateInstance(template, 1);
	if (!result.success) throw new Error('instance non générée');
	return result.instance;
}

function words(root: Element | null): string[] {
	return [...(root?.querySelectorAll('button.lexicon-term') ?? [])].map((b) => b.textContent ?? '');
}

describe('R1 et R3 : mots récents, au niveau du lecteur', () => {
	it('N1. élève de 4e : seul le mot de 5e est souligné', async () => {
		const { container } = await render(ReaderGradeHarness, {
			instance: instanceOf('Calcule la somme de la fraction, puis l’équation.', ['4']),
			readerGrade: '4'
		});
		await expect.poll(() => words(container)).toEqual(['équation']);
	});

	it('N4. visiteur sur une question 4e + 3e : lu comme un élève de 3e', async () => {
		const { container } = await render(ReaderGradeHarness, {
			instance: instanceOf('La fonction, l’équation et la fraction.', ['4', '3']),
			readerGrade: null
		});
		// « fonction » (3e) : soulignée ; « équation » (5e) : plus de l'année d'avant d'un 3e
		await expect.poll(() => words(container)).toEqual(['fonction']);
	});
});

describe('R2 : rien de souligné dans la correction', () => {
	it('N3. flash-card : l’énoncé du recto garde ses mots, le verso n’en a aucun', async () => {
		const { container } = await render(FlashCard, {
			instance: instanceOf('Le pourcentage du quotient.', ['6'], {
				correction: 'Un pourcentage est un quotient.'
			}),
			startFlipped: true
		});
		const front = () => container.querySelector('.flip-card-front');
		const back = () => container.querySelector('.flip-card-back');
		await expect.poll(() => words(front())).toEqual(['pourcentage', 'quotient']);
		await expect.poll(() => back()?.textContent).toContain('Un pourcentage est un quotient.');
		expect(words(back())).toEqual([]);
	});

	it('N3. carte de correction : énoncé rempli et correction sans mot', async () => {
		// Une carte ordinaire d'abord : le dictionnaire est chargé, l'absence prouve le refus
		const instance = instanceOf('Le pourcentage du quotient.', ['6'], {
			correction: 'Un pourcentage est un quotient.'
		});
		const ordinaire = await render(QuestionCard, { interactive: true, instance });
		await expect.poll(() => words(ordinaire.container)).toEqual(['pourcentage', 'quotient']);
		const answerResult = {
			index: 0,
			instance,
			userAnswer: { value: ['0'], isCorrect: false, timeSpent: 3, attempts: 1, submittedAt: '' },
			isCorrect: false
		} as TestAnswerResult;
		const main = document.body.appendChild(document.createElement('main'));
		const { container } = await render(CorrectionCard, { target: main, props: { answerResult } });
		await expect
			.poll(() => container.querySelector('.flip-back')?.textContent)
			.toContain('Un pourcentage est un quotient.');
		await expect
			.poll(() => container.querySelector('.flip-front')?.textContent)
			.toContain('pourcentage');
		expect(words(container)).toEqual([]);
	});
});

describe('R4 : question de cours', () => {
	it('modèle marqué « question de cours » : aucun mot repéré automatiquement', async () => {
		// Une carte ordinaire d'abord : le dictionnaire est chargé, l'absence prouve le refus
		const ordinaire = await render(QuestionCard, {
			interactive: true,
			instance: instanceOf('Définition d’un pourcentage.', ['6'])
		});
		await expect.poll(() => words(ordinaire.container)).toEqual(['pourcentage']);
		const cours = await render(QuestionCard, {
			interactive: true,
			instance: instanceOf('Définition d’un pourcentage.', ['6'], {
				options: { courseQuestion: true }
			})
		});
		await expect.poll(() => cours.container.textContent).toContain('pourcentage');
		expect(words(cours.container)).toEqual([]);
	});

	it('B6. question de cours sans mot marqué : pas de bouton « Mots du dictionnaire »', async () => {
		const { container } = await render(QuestionCard, {
			interactive: true,
			instance: instanceOf('Définition d’un pourcentage.', ['6'], {
				options: { courseQuestion: true }
			})
		});
		await expect.poll(() => container.textContent).toContain('pourcentage');
		expect(container.querySelector('button[aria-label="Mots du dictionnaire"]')).toBeNull();
	});

	it('mot marqué `{.def}` : toujours repéré sur une question de cours', async () => {
		const { container } = await render(QuestionCard, {
			interactive: true,
			instance: instanceOf('Le [quotient]{.def} d’un pourcentage.', ['6'], {
				options: { courseQuestion: true }
			})
		});
		await expect.poll(() => words(container)).toEqual(['quotient']);
	});

	it('carte de cours : recto sans mot automatique, verso sans mot', async () => {
		const course = {
			templateId: 'carte',
			statement: resolvedMarkdown('Le [quotient]{.def} et le pourcentage ?'),
			correction: { steps: [resolvedMarkdown('Un pourcentage est un quotient.')] },
			options: { courseCard: true },
			grades: ['6'],
			level: 1,
			generatedAt: new Date().toISOString()
		} as QuestionInstance;
		const { container } = await render(FlashCard, { instance: course, startFlipped: true });
		const back = () => container.querySelector('.flip-card-back');
		await expect
			.poll(() => words(container.querySelector('.flip-card-front')))
			.toEqual(['quotient']);
		await expect.poll(() => back()?.textContent).toContain('Un pourcentage est un quotient.');
		expect(words(back())).toEqual([]);
	});
});
