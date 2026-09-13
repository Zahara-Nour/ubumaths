/**
 * ChapterQuiz — rendu SERVEUR.
 * ===========================
 *
 * La page élève est rendue côté serveur avant d'arriver au navigateur : si un
 * composant du quiz jette pendant le SSR, l'élève n'a pas un quiz vide, il a un
 * **500 sur tout le chapitre** — documents et fiches compris.
 *
 * Les tests de composant tournent dans un navigateur (projet `client`) et ne
 * voient donc pas ce chemin. Celui-ci tourne dans le projet `server` (node), et
 * c'est tout son intérêt : il exerce `FlashCard` — avec son rendu de markdown
 * mathématique — hors de tout DOM.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import ChapterQuiz from '../ChapterQuiz.svelte';
import type { QuestionInstance } from '$lib/questions/types';
import { resolvedMarkdown } from '$lib/ubumark';

const CHAPITRE = '99999999-9999-4999-8999-999999999999';
const QUIZ_Q1 = '11111111-1111-4111-8111-111111111111';

function instance(overrides: Partial<QuestionInstance> = {}): QuestionInstance {
	return {
		templateId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
		statement: resolvedMarkdown('Calculer $$\\frac{3}{4} + \\frac{1}{2}$$'),
		blanks: [{ expectedAnswer: '5/4', type: 'math' }],
		grades: ['2'],
		theme: 'Nombres',
		domain: 'Fractions',
		level: 1,
		generatedAt: new Date().toISOString(),
		...overrides
	} as QuestionInstance;
}

const question = {
	id: QUIZ_Q1,
	chapterId: CHAPITRE,
	questionTemplateId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
	displayOrder: 0,
	pointsOverride: null,
	createdAt: new Date().toISOString(),
	bestResult: null,
	attemptsCount: 0
};

describe('ChapterQuiz — rendu serveur', () => {
	it('rend une question sans jeter', () => {
		const html = render(ChapterQuiz, {
			props: {
				chapterId: CHAPITRE,
				questions: [question],
				instances: { [QUIZ_Q1]: instance() },
				unavailable: []
			}
		});

		expect(html.body).toContain('Question 1 / 1');
	});

	it('rend un QCM sans jeter', () => {
		const html = render(ChapterQuiz, {
			props: {
				chapterId: CHAPITRE,
				questions: [question],
				instances: {
					[QUIZ_Q1]: instance({
						blanks: undefined,
						choices: [
							{ content: resolvedMarkdown('pair'), isCorrect: true },
							{ content: resolvedMarkdown('impair'), isCorrect: false }
						],
						shuffledChoices: [
							{ content: resolvedMarkdown('pair'), originalIndex: 0 },
							{ content: resolvedMarkdown('impair'), originalIndex: 1 }
						],
						correctChoiceIndex: '0'
					} as Partial<QuestionInstance>)
				},
				unavailable: []
			}
		});

		expect(html.body).toContain('Question 1 / 1');
	});

	it('rend l’avertissement quand tout est écarté, sans jeter', () => {
		const html = render(ChapterQuiz, {
			props: {
				chapterId: CHAPITRE,
				questions: [question],
				instances: {},
				unavailable: [{ quizQuestionId: QUIZ_Q1, reason: 'modele_indisponible' as const }]
			}
		});

		const texte = html.body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
		expect(texte).toMatch(/n'est pas disponible|n&#39;est pas disponible/);
	});
});
