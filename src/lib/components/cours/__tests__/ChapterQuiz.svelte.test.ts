/**
 * ChapterQuiz — l'envoi de la réponse, et ce qu'on fait quand il échoue.
 * ======================================================================
 *
 * Ces tests existent à cause de trois défauts qui ont coexisté sans que rien
 * ne les signale :
 *
 * - le composant postait vers `/api/chapters/quiz/submit`, une route qui
 *   n'existe pas (la vraie est `/api/student/chapters/[id]/quiz/submit`) ;
 * - il envoyait `chapterQuizQuestionId` et `submittedAnswer` là où le Zod du
 *   serveur exige `quizQuestionId` et `timeSpentSeconds` ;
 * - et le `catch` qui entourait l'appel disait « Continue anyway ».
 *
 * Les deux premiers sont invisibles au typecheck (une URL et des clés JSON
 * sont des chaînes), le troisième les rendait invisibles à l'élève. D'où des
 * assertions sur l'URL, sur le corps, et sur ce que l'élève voit en cas
 * d'échec — pas sur un appel de fonction interne.
 *
 * Les tests passent par l'enchaînement réel (choisir une réponse, PUIS valider) :
 * appeler directement le gestionnaire court-circuiterait l'étape qui cassait.
 * Réserve à connaître : `.click()` reste un clic synthétique, il ne prouverait
 * pas qu'un bouton est cliquable (recouvert, `pointer-events: none`). C'est
 * l'idiome du dépôt (cf. `FlashCard.svelte.test.ts`), et l'enjeu ici est le
 * contenu de la requête, pas l'atteignabilité du bouton.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ChapterQuiz from '../ChapterQuiz.svelte';
import type { QuestionInstance } from '$lib/questions/types';
import { resolvedMarkdown } from '$lib/ubumark';
import { toaster } from '$lib/stores/toaster.svelte';

// Le toast est rendu par un `<Toaster />` monté par la mise en page, absent
// d'un test unitaire : on observe donc l'appel, qui est le seul endroit où
// « l'élève est prévenu » soit visible ici.
vi.mock('$lib/stores/toaster.svelte', () => ({
	toaster: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), message: vi.fn() }
}));

const CHAPITRE = '99999999-9999-4999-8999-999999999999';
const QUIZ_Q1 = '11111111-1111-4111-8111-111111111111';
const QUIZ_Q2 = '22222222-2222-4222-8222-222222222222';

function instance(): QuestionInstance {
	return {
		templateId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
		statement: resolvedMarkdown('Le nombre 4 est-il pair ?'),
		choices: [
			{ content: resolvedMarkdown('pair'), isCorrect: true },
			{ content: resolvedMarkdown('impair'), isCorrect: false }
		],
		shuffledChoices: [
			{ content: resolvedMarkdown('pair'), originalIndex: 0 },
			{ content: resolvedMarkdown('impair'), originalIndex: 1 }
		],
		correctChoiceIndex: '0',
		grades: ['2'],
		theme: 'Nombres',
		domain: 'Entiers',
		level: 1,
		generatedAt: new Date().toISOString()
	} as QuestionInstance;
}

function question(id: string) {
	return {
		id,
		chapterId: CHAPITRE,
		questionTemplateId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
		displayOrder: 0,
		pointsOverride: null,
		createdAt: new Date().toISOString(),
		bestResult: null,
		attemptsCount: 0
	};
}

function props(overrides: Record<string, unknown> = {}) {
	return {
		chapterId: CHAPITRE,
		questions: [question(QUIZ_Q1)],
		instances: { [QUIZ_Q1]: instance() },
		unavailable: [],
		...overrides
	};
}

/** Le bouton de validation de la carte, s'il est proposé. */
function boutonValider(container: HTMLElement) {
	return [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('Valider'));
}

/** Clique un bouton par son libellé, puis laisse le DOM se remettre à jour. */
async function cliquer(container: HTMLElement, libelle: string) {
	const bouton = [...container.querySelectorAll('button')].find((b) =>
		b.textContent?.includes(libelle)
	);
	expect(bouton, `bouton « ${libelle} » absent`).toBeDefined();
	bouton!.click();
	await new Promise((r) => setTimeout(r, 10));
}

/** Choisir une réponse puis valider, comme le ferait un élève. */
async function repondre(container: HTMLElement) {
	const choix = container.querySelector<HTMLButtonElement>('.choice-button');
	expect(choix, 'aucun choix affiché').not.toBeNull();
	choix!.click();
	await new Promise((r) => setTimeout(r, 0));

	const valider = boutonValider(container);
	expect(valider, 'bouton Valider absent').toBeDefined();
	valider!.click();
	await new Promise((r) => setTimeout(r, 50));
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
	vi.mocked(toaster.error).mockClear();
	fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: {} }) });
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('ChapterQuiz — envoi de la réponse', () => {
	it('poste vers la route du chapitre, pas vers une route inexistante', async () => {
		const { container } = render(ChapterQuiz, props());

		await repondre(container);

		const appels = fetchMock.mock.calls.map((c) => String(c[0]));
		expect(appels).toContain(`/api/student/chapters/${CHAPITRE}/quiz/submit`);
		expect(appels.some((url) => url === '/api/chapters/quiz/submit')).toBe(false);
	});

	it('envoie les clés que le serveur valide', async () => {
		const { container } = render(ChapterQuiz, props());

		await repondre(container);

		const appel = fetchMock.mock.calls.find(
			(c) => String(c[0]) === `/api/student/chapters/${CHAPITRE}/quiz/submit`
		);
		expect(appel).toBeDefined();

		const corps = JSON.parse(appel![1].body as string);
		expect(corps.quizQuestionId).toBe(QUIZ_Q1);
		expect(typeof corps.isCorrect).toBe('boolean');
		expect(Number.isInteger(corps.timeSpentSeconds)).toBe(true);
		expect(corps.timeSpentSeconds).toBeGreaterThanOrEqual(0);
		expect(corps).not.toHaveProperty('chapterQuizQuestionId');
	});

	it('prévient l’élève quand l’enregistrement échoue', async () => {
		fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
		const { container } = render(ChapterQuiz, props());

		await repondre(container);
		await new Promise((r) => setTimeout(r, 50));

		expect(toaster.error).toHaveBeenCalledWith(expect.stringMatching(/enregistr/i));
	});

	it('ne prévient de rien quand tout se passe bien', async () => {
		const { container } = render(ChapterQuiz, props());

		await repondre(container);

		expect(toaster.error).not.toHaveBeenCalled();
	});
});

describe('ChapterQuiz — revenir sur une question déjà répondue', () => {
	/**
	 * Le `{#key}` qui isole l'état de la carte entre deux questions la remonte
	 * aussi au retour en arrière : sans garde, l'élève revalide la même question,
	 * le score la compte deux fois et le serveur ré-attribue de l'XP. Un quiz de
	 * trois questions pouvait ainsi finir à 6/3.
	 */
	async function quizDeDeux() {
		const q2 = { ...question(QUIZ_Q2), displayOrder: 1 };
		return render(
			ChapterQuiz,
			props({
				questions: [question(QUIZ_Q1), q2],
				instances: { [QUIZ_Q1]: instance(), [QUIZ_Q2]: instance() }
			})
		);
	}

	it('ne re-soumet pas et ne recompte pas au retour en arrière', async () => {
		const { container } = await quizDeDeux();

		await repondre(container); // Q1
		await cliquer(container, 'Suivant');
		await cliquer(container, 'Précédent'); // retour sur Q1, déjà répondue

		// La carte ne doit plus accepter de réponse.
		expect(boutonValider(container)).toBeUndefined();

		const soumissions = fetchMock.mock.calls.filter(
			(c) => String(c[0]) === `/api/student/chapters/${CHAPITRE}/quiz/submit`
		);
		expect(soumissions).toHaveLength(1);
	});

	it('compte chaque question une seule fois dans le score final', async () => {
		const { container } = await quizDeDeux();

		await repondre(container); // Q1 : juste
		await cliquer(container, 'Suivant');
		await cliquer(container, 'Précédent');
		await cliquer(container, 'Suivant'); // re-passage par Q1
		await repondre(container); // Q2 : juste
		await cliquer(container, 'Voir le résultat');
		await new Promise((r) => setTimeout(r, 50));

		// `QuizSummary` rend « score/total » sans espace, et « 100% ».
		const texte = container.textContent!.replace(/\s+/g, ' ');
		expect(texte).toContain('2/2');
		expect(texte).not.toContain('3/2');
		expect(texte).toContain('100%');
	});
});

describe('ChapterQuiz — un quiz vide dit pourquoi', () => {
	it('annonce les questions écartées au lieu de les taire', async () => {
		const { container } = render(
			ChapterQuiz,
			props({
				instances: {},
				unavailable: [{ quizQuestionId: QUIZ_Q1, reason: 'modele_indisponible' }]
			})
		);
		await new Promise((r) => setTimeout(r, 0));

		// Le gabarit coupe les lignes : on compare le message, pas sa mise en forme.
		const texte = container.textContent!.replace(/\s+/g, ' ').trim();
		expect(texte).toMatch(/1 question n'est pas disponible/i);
		expect(texte).toMatch(/publier/i);
	});
});
