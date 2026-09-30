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
	goto: vi.fn(async () => {})
}));

import Page from '../+page.svelte';

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
		answer: { choices: [1] },
		status: position === 0 ? 'correct' : 'incorrect',
		points: position === 0 ? 1 : 0,
		isCorrect: position === 0
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

function mockApi(start: EvaluationStartResponse) {
	fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const href = String(input);
		if (href.startsWith('/api/') && href.includes('/start')) {
			return new Response(JSON.stringify(start), { status: 200 });
		}
		if (href.startsWith('/api/') && href.includes('/submit')) {
			return new Response(JSON.stringify(SUBMIT_RESPONSE), { status: 200 });
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
