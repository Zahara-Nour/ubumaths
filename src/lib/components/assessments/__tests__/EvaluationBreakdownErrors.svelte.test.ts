/**
 * Bilan par question : une ligne s'ouvre et montre les erreurs de la classe sur
 * cette question (chantier `erreurs-frequentes`, PR 1).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import EvaluationBreakdown from '../EvaluationBreakdown.svelte';
import type {
	BreakdownTally,
	EvaluationBreakdown as Breakdown,
	EvaluationQuestionErrors,
	QuestionErrorGroup
} from '$lib/types/evaluation-breakdown';
import type { QuestionInstance } from '$lib/questions/types';

const EVALUATION = '8b9c0d1e-8888-4888-8888-888888888888';
const T1 = '4d5e6f70-4444-4444-8444-444444444441';

const tally: BreakdownTally = {
	answers: 4,
	pointsEarned: 2,
	successRate: 50,
	correct: 2,
	partial: 0,
	incorrect: 2,
	empty: 0
};

const breakdown: Breakdown = {
	status: 'ok',
	copies: 4,
	lateCopies: 0,
	questions: [
		{ templateId: T1, title: 'Fractions égales', ...tally },
		{ templateId: null, title: 'Modèle supprimé', ...tally }
	],
	notions: []
};

function group(students: string[]): QuestionErrorGroup {
	return {
		instance: {
			templateId: T1,
			statement: 'Calcule 3 + 4',
			blanks: [{ type: 'text', expectedAnswer: '7' }],
			generatedAt: ''
		} as unknown as QuestionInstance,
		values: ['8'],
		status: 'incorrect',
		verdict: { unavailable: true, status: 'incorrect' },
		students
	};
}

function ok(overrides: Partial<Extract<EvaluationQuestionErrors, { status: 'ok' }>> = {}) {
	return { status: 'ok', answers: 12, withoutAnswer: 0, blanks: [], groups: [], ...overrides };
}

function stubFetch(body: unknown) {
	const fetchMock = vi.fn(async () => new Response(JSON.stringify(body)));
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

function toggle(container: HTMLElement): HTMLButtonElement {
	const button = container.querySelector<HTMLButtonElement>(
		'[data-testid="bilan-questions"] tbody button[aria-expanded]'
	);
	if (!button) throw new Error('ligne dépliable absente');
	return button;
}

const text = (container: HTMLElement) => (container.textContent ?? '').replace(/\s+/g, ' ');

afterEach(() => vi.unstubAllGlobals());

describe('bilan par question : erreurs dépliables', () => {
	it('la ligne est un bouton fermé ; rien n’est chargé avant le dépliage', async () => {
		const fetchMock = stubFetch(ok());
		const { container } = await render(EvaluationBreakdown, {
			breakdown,
			evaluationId: EVALUATION
		});
		expect(toggle(container).getAttribute('aria-expanded')).toBe('false');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('modèle supprimé : ligne non dépliable', async () => {
		stubFetch(ok());
		const { container } = await render(EvaluationBreakdown, {
			breakdown,
			evaluationId: EVALUATION
		});
		expect(
			container.querySelectorAll('[data-testid="bilan-questions"] tbody button[aria-expanded]')
		).toHaveLength(1);
	});

	it('premier dépliage : une lecture ; replier puis rouvrir ne relit pas', async () => {
		const fetchMock = stubFetch(ok());
		const { container } = await render(EvaluationBreakdown, {
			breakdown,
			evaluationId: EVALUATION
		});
		await userEvent.click(toggle(container));
		await vi.waitFor(() => expect(text(container)).toContain('Aucune erreur sur cette question.'));
		expect(toggle(container).getAttribute('aria-expanded')).toBe('true');
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const url = String((fetchMock.mock.calls[0] as unknown[])[0]);
		expect(url).toContain(`/assessments/${EVALUATION}/results/question-errors`);
		expect(url).toContain(`template=${T1}`);

		await userEvent.click(toggle(container));
		expect(toggle(container).getAttribute('aria-expanded')).toBe('false');
		await userEvent.click(toggle(container));
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('chargement : un état d’attente est visible', async () => {
		vi.stubGlobal('fetch', () => new Promise(() => {}));
		const { container } = await render(EvaluationBreakdown, {
			breakdown,
			evaluationId: EVALUATION
		});
		await userEvent.click(toggle(container));
		expect(text(container)).toContain('Chargement des erreurs');
	});

	it('erreur du serveur : le message, le reste de la page demeure', async () => {
		stubFetch({ status: 'error', message: 'x' });
		const { container } = await render(EvaluationBreakdown, {
			breakdown,
			evaluationId: EVALUATION
		});
		await userEvent.click(toggle(container));
		await vi.waitFor(() =>
			expect(text(container)).toContain('Les erreurs ne peuvent pas être chargées pour le moment.')
		);
		expect(text(container)).toContain('Fractions égales');
	});

	it('réseau en échec : le même message', async () => {
		vi.stubGlobal('fetch', async () => {
			throw new Error('réseau');
		});
		const { container } = await render(EvaluationBreakdown, {
			breakdown,
			evaluationId: EVALUATION
		});
		await userEvent.click(toggle(container));
		await vi.waitFor(() =>
			expect(text(container)).toContain('Les erreurs ne peuvent pas être chargées pour le moment.')
		);
	});

	it('groupes, noms en texte, cases ratées et sans réponse', async () => {
		stubFetch(
			ok({
				withoutAnswer: 2,
				blanks: [
					{ blank: 1, errors: 2, answers: 12 },
					{ blank: 2, errors: 9, answers: 12 }
				],
				groups: [group(['Ada Lovelace', 'Bob', '<b>Eve</b>']), group(['Cléo'])]
			})
		);
		const { container } = await render(EvaluationBreakdown, {
			breakdown,
			evaluationId: EVALUATION
		});
		await userEvent.click(toggle(container));
		await vi.waitFor(() => expect(text(container)).toContain('Case 2 : 9 erreurs sur 12'));
		const all = text(container);
		expect(all).toContain('Case 1 : 2 erreurs sur 12');
		expect(all).toContain('3 élèves ont répondu ainsi');
		expect(all).toContain('Ada Lovelace');
		expect(all).toContain('<b>Eve</b>');
		expect(container.querySelector('b')).toBeNull();
		expect(all).toContain('Cléo');
		expect(all).not.toContain('1 élèves');
		expect(all).toContain('2 sans réponse');
	});

	it('sans identifiant de contrôle : aucune ligne dépliable (compatibilité)', async () => {
		const { container } = await render(EvaluationBreakdown, { breakdown });
		expect(container.querySelectorAll('tbody button[aria-expanded]')).toHaveLength(0);
	});
});
