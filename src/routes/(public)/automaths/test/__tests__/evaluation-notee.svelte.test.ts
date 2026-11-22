/**
 * E19-E20 — une évaluation notée, côté élève (chantier 5, ADR 0015)
 *
 * - pendant : la page n'a que des questions PUBLIQUES (ni réponse attendue, ni
 *   correction) et ne corrige rien ; à la fin, la copie part au serveur ;
 * - après l'envoi : correction par question avec ses points, note sur 20 et
 *   « x/n questions », tels que le serveur les rend ;
 * - recharger : mêmes questions, cases vides ; Course : chrono au temps restant ;
 * - page d'attente (chantier `diaporama-reglages`, PR 2b) : lue AVANT le
 *   démarrage (lecture seule) ; la tentative ne démarre qu'au clic.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import type { PublicQuestion } from '#lib/questions/public-question.ts';
import type {
	EvaluationOverviewResponse,
	EvaluationStartResponse
} from '#lib/types/evaluation-attempt.ts';

const url = vi.hoisted(() => ({ current: new URL('http://localhost/automaths/test') }));
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return url.current;
		}
	}
}));
vi.mock('$app/navigation', async () =>
	(await import('#tests/helpers/app-navigation-mock.ts')).appNavigationMock({
		goto: vi.fn(async () => {}),
		replaceState: vi.fn()
	})
);

import Page from '../+page.svelte';
import { goto, replaceState } from '$app/navigation';

// Le dictionnaire arrive de /api/dictionnaire (ADR 0022) : ici, le jeu de référence figé
vi.mock('#lib/dictionary/fetch-dictionary.ts', async () => {
	const { REFERENCE_DICTIONARY: entries } =
		await import('../../../../../../tests/fixtures/lexique/dictionnaire-reference');
	return { fetchDictionary: async () => entries };
});

const ASSIGNMENT = '44444444-4444-4444-8444-444444444444';
const ATTEMPT = '99999999-9999-4999-8999-999999999999';

/** Question réduite à une case choix, version publique (choix dans l'ordre affiché) */
function qcm(position: number, statement: string): PublicQuestion {
	return {
		position,
		delaySeconds: 60,
		type: 'fill_in_blanks',
		statement: `${statement}\n\n\`\`\`choix\ncase: 0\n- $$3$$\n- $$4$$\n\`\`\``,
		blanks: [{ type: 'choice', choice: { choices: ['$$3$$', '$$4$$'], multiple: false } }]
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
			statement: `Question ${position}\n\n\`\`\`choix\ncase: 0\n- $$3$$\n- $$4$$\n\`\`\``,
			blanks: [
				{
					expectedAnswer: position === 0 ? '1' : '0',
					type: 'choice',
					choice: { choices: ['$$3$$', '$$4$$'], order: [0, 1], multiple: false }
				}
			],
			grades: ['6'],
			level: 1,
			generatedAt: ''
		},
		// Case choix : indices d'origine (ordre non mélangé ici)
		answer: { values: ['1'] },
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

/** Page d'attente rendue par la lecture seule, d'après la tentative que `start` rendra */
function overviewOf(start: EvaluationStartResponse): EvaluationOverviewResponse {
	if (start.preview) {
		return {
			preview: true,
			evaluation: start.evaluation,
			questionCount: start.evaluation.items.length,
			durationSeconds: start.evaluation.time_limit ?? 60,
			resumed: false
		};
	}
	const { attempt, evaluation } = start;
	return {
		preview: false,
		evaluation,
		questionCount: attempt.questions.length,
		durationSeconds:
			evaluation.form === 'course'
				? (attempt.remainingSeconds ?? 0)
				: attempt.questions.reduce((sum, q) => sum + q.delaySeconds, 0),
		resumed: attempt.resumed
	};
}

function mockApi(
	start: EvaluationStartResponse,
	submitReply: { status: number; body: unknown } = { status: 200, body: SUBMIT_RESPONSE },
	overviewReply: { status: number; body: unknown } = { status: 200, body: overviewOf(start) }
) {
	fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const href = String(input);
		if (href === `/api/evaluations/assignments/${ASSIGNMENT}` && !init?.method) {
			return new Response(JSON.stringify(overviewReply.body), { status: overviewReply.status });
		}
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

/** Ouvre la page d'un contrôle assigné : elle s'arrête sur la page d'attente */
async function renderWaitingPage() {
	url.current = new URL(`http://localhost/automaths/test?assignment=${ASSIGNMENT}`);
	const main = document.body.appendChild(document.createElement('main'));
	const rendered = await render(Page, {
		target: main,
		props: { data: { user: { id: 'eleve' } } } as never
	});
	await expect.element(page.getByTestId('series-start-summary')).toBeVisible();
	return rendered;
}

function startButton(): HTMLButtonElement {
	const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
		/C'est parti|Reprendre/.test(b.textContent ?? '')
	);
	expect(button, 'bouton de la page d’attente').toBeDefined();
	return button!;
}

/** Ouvre la page puis passe la page d'attente (la tentative démarre au clic) */
async function renderPage() {
	const rendered = await renderWaitingPage();
	startButton().click();
	return rendered;
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

	it('E19 : ne demande que la page d’attente puis /start (aucun modèle), n’affiche aucune correction pendant', async () => {
		mockApi(startResponse());
		const { container } = await renderPage();

		await expect.element(page.getByText('Combien font 2 + 2 ?')).toBeVisible();
		expect(apiCalls().map(([href]) => href)).toEqual([
			`/api/evaluations/assignments/${ASSIGNMENT}`,
			`/api/evaluations/assignments/${ASSIGNMENT}/start`
		]);
		expect(container.textContent).not.toMatch(/Correction|bonnes réponses|\/20/);
	});

	it('E19 : fin → la copie part au serveur (positions, choix, AUCUN verdict), puis sa correction et sa note', async () => {
		mockApi(startResponse());
		const { container } = await renderPage();
		await expect.element(page.getByText('Combien font 2 + 2 ?')).toBeVisible();

		await answerCurrent(1);
		await expect.element(page.getByText('Combien font 1 + 2 ?')).toBeVisible();
		await answerCurrent(1);

		await vi.waitFor(() => expect(apiCalls()).toHaveLength(3));
		const [submitUrl, init] = apiCalls()[2] as [string, RequestInit];
		expect(submitUrl).toContain(`/attempts/${ATTEMPT}/submit`);
		const body = JSON.parse(String(init.body));
		expect(
			body.answers.map((a: { position: number; values: string[] }) => [a.position, a.values])
		).toEqual([
			[0, ['1']],
			[1, ['1']]
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

		await vi.waitFor(() => expect(apiCalls()).toHaveLength(3), { timeout: 5000 });
		expect(apiCalls()[2][0]).toContain(`/attempts/${ATTEMPT}/submit`);
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

describe('Contrôle assigné — page d’attente avant le démarrage (PR 2b)', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		document.body.innerHTML = '';
	});

	it('Course : titre, forme, questions, temps ; la tentative ne démarre PAS avant le clic', async () => {
		mockApi(startResponse({}, 'course'));
		await renderWaitingPage();

		expect(document.querySelector('h2')?.textContent).toBe('Tables');
		await expect
			.element(page.getByTestId('series-start-summary'))
			.toHaveTextContent('Course aux nombres · 2 questions · 5 min');
		// Rien n'a démarré : ni /start, ni question, ni chrono
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(apiCalls().map(([href]) => href)).toEqual([
			`/api/evaluations/assignments/${ASSIGNMENT}`
		]);
		expect(document.body.textContent).not.toContain('Combien font 2 + 2 ?');

		startButton().click();
		await expect.element(page.getByText('Combien font 2 + 2 ?')).toBeVisible();
		expect(apiCalls()[1]).toEqual([
			`/api/evaluations/assignments/${ASSIGNMENT}/start`,
			{ method: 'POST' }
		]);
	});

	it('Contrôle blanc : « environ » la somme des chronos', async () => {
		mockApi(startResponse());
		await renderWaitingPage();
		await expect
			.element(page.getByTestId('series-start-summary'))
			.toHaveTextContent('Contrôle blanc · 2 questions · environ 2 min');
	});

	it('Course commencée : « il te reste », bouton « Reprendre »', async () => {
		mockApi(startResponse({ resumed: true, remainingSeconds: 125 }, 'course'));
		await renderWaitingPage();
		await expect
			.element(page.getByTestId('series-start-summary'))
			.toHaveTextContent('Tu reprends ton contrôle : il te reste 2 min 5 s');
		expect(startButton().textContent).toContain('Reprendre');
	});

	it('Contrôle blanc commencé : mêmes questions, réponses à retaper', async () => {
		mockApi(startResponse({ resumed: true }));
		await renderWaitingPage();
		await expect
			.element(page.getByTestId('series-start-summary'))
			.toHaveTextContent('Tu reprends ton contrôle : 2 questions, réponses à retaper');
	});

	it('refus dès la page d’attente (date limite) : le message, jamais de /start', async () => {
		mockApi(startResponse(), undefined, {
			status: 403,
			body: { error: 'La date limite est dépassée' }
		});
		url.current = new URL(`http://localhost/automaths/test?assignment=${ASSIGNMENT}`);
		const main = document.body.appendChild(document.createElement('main'));
		await render(Page, { target: main, props: { data: { user: { id: 'eleve' } } } as never });

		await expect.element(page.getByText('La date limite est dépassée')).toBeVisible();
		expect(apiCalls().some(([href]) => href.includes('/start'))).toBe(false);
	});

	it('démarrage en échec (500) : retour à la page d’attente, « C’est parti ! » réessaie', async () => {
		mockApi(startResponse());
		const succeed = fetchMock.getMockImplementation() as (
			input: RequestInfo | URL,
			init?: RequestInit
		) => Promise<Response>;
		let startCalls = 0;
		fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
			if (String(input).includes('/start') && ++startCalls === 1) {
				return new Response(
					JSON.stringify({
						error: 'Impossible de commencer le contrôle, réessayer dans un instant'
					}),
					{ status: 500 }
				);
			}
			return succeed(input, init);
		});
		await renderWaitingPage();

		startButton().click();
		await vi.waitFor(() => expect(startCalls).toBe(1));
		await vi.waitFor(() => expect(startButton().disabled).toBe(false));
		await expect.element(page.getByTestId('series-start-summary')).toBeVisible();

		startButton().click();
		await expect.element(page.getByText('Combien font 2 + 2 ?')).toBeVisible();
		expect(startCalls).toBe(2);
	});

	it('double clic sur « C’est parti ! » : un seul démarrage', async () => {
		mockApi(startResponse());
		await renderWaitingPage();
		const button = startButton();
		button.click();
		button.click();
		await expect.element(page.getByText('Combien font 2 + 2 ?')).toBeVisible();
		expect(apiCalls().filter(([href]) => href.includes('/start'))).toHaveLength(1);
	});
});
