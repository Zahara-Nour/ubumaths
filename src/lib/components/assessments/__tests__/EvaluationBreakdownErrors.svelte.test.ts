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
} from '#lib/types/evaluation-breakdown.ts';
import type { QuestionInstance } from '#lib/questions/types.ts';

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
		{ templateId: T1, title: 'Fractions égales', timing: null, choiceAnswers: 0, ...tally },
		{ templateId: null, title: 'Modèle supprimé', timing: null, choiceAnswers: 0, ...tally }
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
		students,
		errorKinds: [],
		asChoice: false
	};
}

function ok(overrides: Partial<Extract<EvaluationQuestionErrors, { status: 'ok' }>> = {}) {
	return {
		status: 'ok',
		answers: 12,
		withoutAnswer: 0,
		blanks: [],
		groups: [],
		errorKinds: [],
		unrecognized: 0,
		...overrides
	};
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

	it('types d’erreur : compte par type, et type de chaque réponse (chantier type-erreur)', async () => {
		stubFetch(
			ok({
				errorKinds: [
					{ label: 'Erreur de signe', count: 4 },
					{ label: 'Puissance de 10', count: 2 }
				],
				unrecognized: 6,
				groups: [
					{ ...group(['Ada']), errorKinds: [{ blank: 1, guess: { kind: 'sign' } }] },
					{
						...group(['Bob']),
						errorKinds: [{ blank: 1, guess: { kind: 'power-of-ten', exponent: -2 } }]
					},
					group(['Cléo'])
				]
			})
		);
		const { container } = await render(EvaluationBreakdown, {
			breakdown,
			evaluationId: EVALUATION
		});
		await userEvent.click(toggle(container));
		await vi.waitFor(() =>
			expect(container.querySelector('[data-testid="error-kind-counts"]')).not.toBeNull()
		);
		const counts = (
			container.querySelector('[data-testid="error-kind-counts"]')?.textContent ?? ''
		).replace(/\s+/g, ' ');
		expect(counts).toContain('Erreur de signe : 4 · Puissance de 10 : 2 · Non reconnue : 6');
		const labels = [...container.querySelectorAll('[data-testid="error-kinds"]')].map((el) =>
			(el.textContent ?? '').trim()
		);
		expect(labels).toEqual(['Erreur de signe', 'Puissance de 10 (÷ 100)']);
	});

	it('erreur prévue : comptée sous son nom, formule rendue (idées-format, idée 3)', async () => {
		stubFetch(
			ok({
				errorKinds: [
					{ label: 'Tu as oublié le carré de $x$.', count: 3 },
					{ label: 'Erreur de signe', count: 1 }
				],
				groups: [
					{
						...group(['Ada']),
						errorKinds: [{ blank: 1, expected: 'Tu as oublié le carré de $x$.' }]
					}
				]
			})
		);
		const { container } = await render(EvaluationBreakdown, {
			breakdown,
			evaluationId: EVALUATION
		});
		await userEvent.click(toggle(container));
		await vi.waitFor(() =>
			expect(container.querySelector('[data-testid="error-kind-counts"]')).not.toBeNull()
		);
		const counts = container.querySelector('[data-testid="error-kind-counts"]');
		expect(counts?.textContent ?? '').not.toContain('$');
		expect(counts?.querySelector('math-span')).not.toBeNull();
		expect((counts?.textContent ?? '').replace(/\s+/g, ' ')).toContain('Tu as oublié le carré de');
		expect((counts?.textContent ?? '').replace(/\s+/g, ' ')).toContain(
			' : 3 · Erreur de signe : 1'
		);
		const chip = container.querySelector('[data-testid="error-kinds"]');
		expect(chip?.textContent ?? '').toContain('Tu as oublié le carré de');
		expect(chip?.querySelector('math-span')).not.toBeNull();
	});

	it('un `$` isolé par nom ne s’apparie pas avec celui du nom suivant', async () => {
		stubFetch(
			ok({
				errorKinds: [
					{ label: 'Prix en $', count: 2 },
					{ label: 'Coût en $', count: 1 }
				],
				groups: [group(['Ada'])]
			})
		);
		const { container } = await render(EvaluationBreakdown, {
			breakdown,
			evaluationId: EVALUATION
		});
		await userEvent.click(toggle(container));
		await vi.waitFor(() =>
			expect(container.querySelector('[data-testid="error-kind-counts"]')).not.toBeNull()
		);
		const counts = container.querySelector('[data-testid="error-kind-counts"]');
		expect(counts?.querySelector('math-span')).toBeNull();
		expect((counts?.textContent ?? '').replace(/\s+/g, ' ')).toContain(
			'Prix en $ : 2 · Coût en $ : 1'
		);
	});

	it('aucun type reconnu : pas de ligne de comptes', async () => {
		stubFetch(ok({ unrecognized: 3, groups: [group(['Ada'])] }));
		const { container } = await render(EvaluationBreakdown, {
			breakdown,
			evaluationId: EVALUATION
		});
		await userEvent.click(toggle(container));
		await vi.waitFor(() => expect(text(container)).toContain('Ada'));
		expect(container.querySelector('[data-testid="error-kind-counts"]')).toBeNull();
		expect(container.querySelector('[data-testid="error-kinds"]')).toBeNull();
	});

	it('sans identifiant de contrôle : aucune ligne dépliable (compatibilité)', async () => {
		const { container } = await render(EvaluationBreakdown, { breakdown });
		expect(container.querySelectorAll('tbody button[aria-expanded]')).toHaveLength(0);
	});
	it('idée 4 : la ligne dit « en QCM », ou combien de réponses l’ont été', async () => {
		const mixed: Breakdown = {
			...breakdown,
			questions: [
				{ ...breakdown.questions[0], choiceAnswers: 4 },
				{ ...breakdown.questions[1], choiceAnswers: 1 }
			]
		} as Breakdown;
		const { container } = await render(EvaluationBreakdown, { breakdown: mixed });
		const rows = [...container.querySelectorAll('[data-testid="bilan-questions"] tbody tr')].map(
			(row) => text(row as HTMLElement)
		);
		expect(rows[0]).toContain('en QCM');
		expect(rows[0]).not.toContain('dont');
		expect(rows[1]).toContain('dont 1 en QCM');
	});

	it('idée 4 : sans réponse en QCM, aucune mention', async () => {
		const { container } = await render(EvaluationBreakdown, { breakdown });
		expect(text(container)).not.toContain('QCM');
	});

	it('idée 4 : chaque groupe répondu en QCM porte la mention', async () => {
		stubFetch(ok({ groups: [{ ...group(['Ada']), asChoice: true }, group(['Bob'])] }));
		const { container } = await render(EvaluationBreakdown, {
			breakdown,
			evaluationId: EVALUATION
		});
		await userEvent.click(toggle(container));
		await vi.waitFor(() => expect(text(container)).toContain('Bob'));
		const marks = container.querySelectorAll('[data-testid="as-choice"]');
		expect(marks).toHaveLength(1);
		expect(marks[0].textContent?.trim()).toBe('en QCM');
	});
});
