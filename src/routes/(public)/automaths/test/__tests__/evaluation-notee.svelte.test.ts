/**
 * E19-E20 — une évaluation notée, côté élève (chantier 5, ADR 0015)
 *
 * - pendant : la page n'a que des questions PUBLIQUES (ni réponse attendue, ni
 *   correction) et ne corrige rien ; à la fin, la copie part au serveur ;
 * - après l'envoi : correction par question avec ses points, note sur 20 et
 *   « x/n questions », tels que le serveur les rend ;
 * - recharger : mêmes questions, cases vides ; Course : chrono au temps restant.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import type { PublicQuestion } from '$lib/questions/public-question';
import type { EvaluationStartResponse } from '$lib/types/evaluation-attempt';

const url = vi.hoisted(() => ({ current: new URL('http://localhost/automaths/test') }));
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return url.current;
		}
	}
}));
vi.mock('$app/navigation', async (importOriginal) => ({
	...(await importOriginal<typeof import('$app/navigation')>()),
	goto: vi.fn(async () => {}),
	replaceState: vi.fn()
}));

import Page from '../+page.svelte';
import { goto, replaceState } from '$app/navigation';

// Le dictionnaire arrive de /api/dictionnaire (ADR 0022) : ici, le jeu de référence figé
vi.mock('$lib/dictionary/fetch-dictionary', async () => {
	const { REFERENCE_DICTIONARY: entries } = await import(
		'../../../../../../tests/fixtures/lexique/dictionnaire-reference'
	);
	return { fetchDictionary: async () => entries };
});

const ASSIGNMENT = '44444444-4444-4444-8444-444444444444';
const ATTEMPT = '99999999-9999-4999-8999-999999999999';

function qcm(position: number, statement: string): PublicQuestion {
	return {
		position,
		delaySeconds: 60,
		type: 'multiple_choice',
		statement,
		choices: [{ content: '$$3$$' }, { content: '$$4$$' }]
	};
}

function startResponse(
	overrides: Partial<Extract<EvaluationStartResponse, { preview: false }>['attempt']> = {},
	form: 'interactive' | 'course' = 'interactive'
): EvaluationStartResponse {
	return {
		preview: false,
		evaluation: { id: 'e', form, time_limit: form === 'course' ? 300 : null, title: 'Tables' },
		attempt: {
			id: ATTEMPT,
			resumed: false,
			remainingSeconds: form === 'course' ? 300 : null,
			questions: [qcm(0, 'Combien font 2 + 2 ?'), qcm(1, 'Combien font 1 + 2 ?')],
			...overrides
		}
	};
}

const SUBMIT_RESPONSE = {
	attemptId: ATTEMPT,
	late: false,
	grade: 10,
	pointsEarned: 1,
	totalQuestions: 2,
	correctCount: 1,
	questions: [0, 1].map((position) => ({
		position,
		instance: {
			templateId: 't',
			statement: `Question ${position}`,
			choices: [
				{ content: '$$3$$', isCorrect: position === 1 },
				{ content: '$$4$$', isCorrect: position === 0 }
			],
			shuffledChoices: [
				{ content: '$$3$$', originalIndex: 0 },
				{ content: '$$4$$', originalIndex: 1 }
			],
			grades: ['6'],
			theme: 'T',
			domain: 'D',
			level: 1,
			generatedAt: ''
		},
		// QCM : indices d'origine (ordre non mélangé ici)
		answer: { choiceIndexes: [1] },
		status: position === 0 ? 'correct' : 'incorrect',
		points: position === 0 ? 1 : 0,
		isCorrect: position === 0,
		partial: false
	}))
};

let fetchMock: ReturnType<typeof vi.fn>;
const realFetch = globalThis.fetch;

/** Appels à l'API de l'application (les modules chargés par Vite passent aussi par fetch) */
function apiCalls(): Array<[string, RequestInit | undefined]> {
	return fetchMock.mock.calls
		.map(([input, init]) => [String(input), init] as [string, RequestInit | undefined])
		.filter(([href]) => href.startsWith('/api/'));
}

function mockApi(
	start: EvaluationStartResponse,
	submitReply: { status: number; body: unknown } = { status: 200, body: SUBMIT_RESPONSE }
) {
	fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const href = String(input);
		if (href.startsWith('/api/') && href.includes('/start')) {
			return new Response(JSON.stringify(start), { status: 200 });
		}
		if (href.startsWith('/api/') && href.includes('/submit')) {
			return new Response(JSON.stringify(submitReply.body), { status: submitReply.status });
		}
		if (href.startsWith('/api/')) return new Response('{}', { status: 404 });
		return realFetch(input, init);
	});
	vi.stubGlobal('fetch', fetchMock);
}

async function renderPage() {
	url.current = new URL(`http://localhost/automaths/test?assignment=${ASSIGNMENT}`);
	const main = document.body.appendChild(document.createElement('main'));
	return await render(Page, {
		target: main,
		props: { data: { templates: [], user: { id: 'eleve' } } } as never
	});
}

/** Coche le choix `index` de la question affichée puis « Valider » */
async function answerCurrent(index: number) {
	const cards = document.querySelectorAll<HTMLElement>('[data-testid="interactive-question"]');
	const card = cards[cards.length - 1];
	const buttons = card.querySelectorAll<HTMLButtonElement>('.choice-button');
	buttons[index].click();
	await vi.waitFor(() => {
		const validate = [...card.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('Valider')
		);
		expect(validate?.disabled).toBe(false);
		validate!.click();
	});
}

describe('Évaluation notée — page élève', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		document.body.innerHTML = '';
	});

	it('E19 : ne demande que /start (aucun modèle), n’affiche aucune correction pendant', async () => {
		mockApi(startResponse());
		const { container } = await renderPage();

		await expect.element(page.getByText('Combien font 2 + 2 ?')).toBeVisible();
		expect(apiCalls()).toHaveLength(1);
		expect(apiCalls()[0][0]).toContain(`/assignments/${ASSIGNMENT}/start`);
		expect(container.textContent).not.toMatch(/Correction|bonnes réponses|\/20/);
	});

	it('E19 : fin → la copie part au serveur (positions, choix, AUCUN verdict), puis sa correction et sa note', async () => {
		mockApi(startResponse());
		const { container } = await renderPage();
		await expect.element(page.getByText('Combien font 2 + 2 ?')).toBeVisible();

		await answerCurrent(1);
		await expect.element(page.getByText('Combien font 1 + 2 ?')).toBeVisible();
		await answerCurrent(1);

		await vi.waitFor(() => expect(apiCalls()).toHaveLength(2));
		const [submitUrl, init] = apiCalls()[1] as [string, RequestInit];
		expect(submitUrl).toContain(`/attempts/${ATTEMPT}/submit`);
		const body = JSON.parse(String(init.body));
		expect(
			body.answers.map((a: { position: number; choices: number[] }) => [a.position, a.choices])
		).toEqual([
			[0, [1]],
			[1, [1]]
		]);
		expect(JSON.stringify(body)).not.toMatch(/isCorrect|points|score|grade/);

		await expect.element(page.getByTestId('evaluation-grade')).toHaveTextContent('10/20');
		expect(
			container
				.querySelector('[data-testid="evaluation-questions-count"]')
				?.textContent?.replace(/\s+/g, ' ')
				.trim()
		).toBe('1/2 questions');
		const points = [...container.querySelectorAll('[data-testid="question-points"]')].map((el) =>
			el.textContent?.trim()
		);
		expect(points).toEqual(['1 point', '0 point']);
	});

	it('après l’envoi, l’URL devient celle des résultats : recharger ne relance PAS une tentative', async () => {
		vi.mocked(replaceState).mockClear();
		mockApi(startResponse());
		await renderPage();
		await expect.element(page.getByText('Combien font 2 + 2 ?')).toBeVisible();
		expect(replaceState).not.toHaveBeenCalled();

		await answerCurrent(1);
		await expect.element(page.getByText('Combien font 1 + 2 ?')).toBeVisible();
		await answerCurrent(1);

		await expect.element(page.getByTestId('evaluation-grade')).toHaveTextContent('10/20');
		expect(replaceState).toHaveBeenCalledWith(
			`/dashboard/student/assessments/${ASSIGNMENT}/results`,
			{}
		);
	});

	it('E20 : recharger une tentative en cours → mêmes questions, rien de coché', async () => {
		mockApi(startResponse({ resumed: true }));
		const { container } = await renderPage();

		await expect.element(page.getByText('Combien font 2 + 2 ?')).toBeVisible();
		expect(container.querySelectorAll('.choice-button.selected')).toHaveLength(0);
		expect(container.textContent).toContain('Question 1 sur 2');
	});

	it('E20 : Course reprise → le chrono part du temps RESTANT', async () => {
		mockApi(startResponse({ resumed: true, remainingSeconds: 125 }, 'course'));
		const { container } = await renderPage();

		await expect.element(page.getByText('Combien font 2 + 2 ?')).toBeVisible();
		// Compte à rebours en secondes : 125 (ou 124 après un tic), jamais les 300 de l'évaluation
		const text = container.textContent?.replace(/\s+/g, ' ') ?? '';
		expect(text).toMatch(/répondu 12[45] Terminer/);
		expect(text).not.toContain('300');
	});
});

describe('Évaluation notée — Course reprise après la fin du temps', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		document.body.innerHTML = '';
	});

	it('temps restant 0 : la copie part d’elle-même, et la note du serveur s’affiche', async () => {
		mockApi(startResponse({ resumed: true, remainingSeconds: 0 }, 'course'), {
			status: 200,
			body: { ...SUBMIT_RESPONSE, late: true, grade: 0, pointsEarned: 0, correctCount: 0 }
		});
		await renderPage();

		await vi.waitFor(() => expect(apiCalls()).toHaveLength(2), { timeout: 5000 });
		expect(apiCalls()[1][0]).toContain(`/attempts/${ATTEMPT}/submit`);
		await expect.element(page.getByTestId('evaluation-grade')).toHaveTextContent('0/20');
		expect(document.body.textContent).toMatch(/après la fin du temps/);
	});
});

describe('Évaluation notée — envoi réussi, réponse perdue (409)', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(goto).mockClear();
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		document.body.innerHTML = '';
	});

	async function finishBothQuestions() {
		await expect.element(page.getByText('Combien font 2 + 2 ?')).toBeVisible();
		await answerCurrent(1);
		await expect.element(page.getByText('Combien font 1 + 2 ?')).toBeVisible();
		await answerCurrent(1);
	}

	it('409 avec la copie déjà notée : la page l’affiche (pas de blocage)', async () => {
		mockApi(startResponse(), {
			status: 409,
			body: { error: 'Cette tentative est déjà terminée', result: SUBMIT_RESPONSE }
		});
		await renderPage();
		await finishBothQuestions();

		await expect.element(page.getByTestId('evaluation-grade')).toHaveTextContent('10/20');
		expect(document.body.textContent).not.toContain("n'a pas pu être envoyée");
		expect(replaceState).toHaveBeenCalledWith(
			`/dashboard/student/assessments/${ASSIGNMENT}/results`,
			{}
		);
	});

	it('409 sans copie reconstruite : direction les résultats de l’élève', async () => {
		mockApi(startResponse(), {
			status: 409,
			body: { error: 'Cette tentative est déjà terminée', result: null }
		});
		await renderPage();
		await finishBothQuestions();

		await vi.waitFor(() =>
			expect(goto).toHaveBeenCalledWith(`/dashboard/student/assessments/${ASSIGNMENT}/results`)
		);
	});
});
