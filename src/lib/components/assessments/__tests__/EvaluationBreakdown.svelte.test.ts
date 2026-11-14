/**
 * Bilan d'un contrôle par question et par notion (chantier `bilan-controle`, P6) :
 * ce que lit le professeur (N1, N2, L1, L4, E1). Durée sans doute trop courte
 * (chantier `durees-trop-courtes`, P7).
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EvaluationBreakdown from '../EvaluationBreakdown.svelte';
import type {
	BreakdownTally,
	EvaluationBreakdown as Breakdown,
	QuestionTiming
} from '$lib/types/evaluation-breakdown';

function tally(overrides: Partial<BreakdownTally> = {}): BreakdownTally {
	return {
		answers: 4,
		pointsEarned: 2.5,
		successRate: 62.5,
		correct: 2,
		partial: 1,
		incorrect: 1,
		empty: 0,
		...overrides
	};
}

function ok(overrides: Partial<Extract<Breakdown, { status: 'ok' }>> = {}): Breakdown {
	return {
		status: 'ok',
		copies: 4,
		lateCopies: 0,
		questions: [
			{ templateId: 't1', title: 'Fractions égales', timing: null, ...tally() },
			{
				templateId: 't2',
				title: 'Somme de relatifs',
				timing: null,
				...tally({
					successRate: 25,
					pointsEarned: 1,
					correct: 1,
					partial: 0,
					incorrect: 2,
					empty: 1
				})
			}
		],
		notions: [
			{ notionId: 'n-rel', branch: 'Nombres', notion: 'Relatifs', ...tally({ successRate: 25 }) },
			{ notionId: 'n-frac', branch: 'Nombres', notion: 'Fractions', ...tally() },
			{ notionId: null, branch: null, notion: 'Sans notion', ...tally({ successRate: 100 }) }
		],
		...overrides
	};
}

function rows(container: HTMLElement, section: string): string[] {
	const region = container.querySelector(`[data-testid="${section}"]`);
	return [...(region?.querySelectorAll('tbody tr') ?? [])].map((tr) =>
		(tr.textContent ?? '').replace(/\s+/g, ' ').trim()
	);
}

describe('EvaluationBreakdown', () => {
	it('N1 : une ligne par question, taux arrondi et répartition juste / partiel / faux / sans réponse', async () => {
		const { container } = await render(EvaluationBreakdown, { breakdown: ok() });
		const questions = rows(container, 'bilan-questions');
		expect(questions).toHaveLength(2);
		expect(questions[0]).toContain('Fractions égales');
		expect(questions[0]).toContain('63 %');
		expect(questions[1]).toContain('Somme de relatifs');
		expect(questions[1]).toContain('25 %');

		const headers = [...container.querySelectorAll('[data-testid="bilan-questions"] th')].map(
			(th) => th.textContent?.trim()
		);
		expect(headers).toEqual(expect.arrayContaining(['Juste', 'Partiel', 'Faux', 'Sans réponse']));
		expect(container.textContent).toContain('4 copies');
	});

	it('N2 : notions dans l’ordre reçu (plus faible d’abord), avec la branche', async () => {
		const { container } = await render(EvaluationBreakdown, { breakdown: ok() });
		const notions = rows(container, 'bilan-notions');
		expect(notions.map((r) => r.split(' ')[0])).toEqual(['Nombres', 'Nombres', 'Sans']);
		expect(notions[0]).toContain('Relatifs');
		expect(notions[2]).toContain('Sans notion');
	});

	it('L1 : aucune copie rendue → « Pas encore de copie rendue », aucun 0 %', async () => {
		const { container } = await render(EvaluationBreakdown, {
			breakdown: ok({
				copies: 0,
				questions: [
					{
						templateId: 't1',
						title: 'Fractions égales',
						timing: null,
						...tally({
							answers: 0,
							pointsEarned: 0,
							successRate: null,
							correct: 0,
							partial: 0,
							incorrect: 0
						})
					}
				],
				notions: []
			})
		});
		const text = (container.textContent ?? '').replace(/\s+/g, ' ');
		expect(text.match(/Pas encore de copie rendue/g)).toHaveLength(2);
		expect(text).not.toContain('0 %');
		expect(text).not.toContain('copie comptée');
		expect(container.querySelectorAll('tbody tr')).toHaveLength(0);
	});

	it('L4 : copies en retard dites à part', async () => {
		const { container } = await render(EvaluationBreakdown, { breakdown: ok({ lateCopies: 1 }) });
		expect(container.textContent).toContain('1 copie rendue en retard, non comptée');
	});

	it('L4 : pluriel', async () => {
		const { container } = await render(EvaluationBreakdown, { breakdown: ok({ lateCopies: 2 }) });
		expect(container.textContent).toContain('2 copies rendues en retard, non comptées');
	});

	it('E1 : erreur de lecture → message dans les deux sections, aucun tableau', async () => {
		const { container } = await render(EvaluationBreakdown, {
			breakdown: { status: 'error', message: 'Le bilan ne peut pas être calculé pour le moment.' }
		});
		const text = container.textContent ?? '';
		expect(text).toContain('Bilan par question');
		expect(text).toContain('Bilan par notion');
		expect(text.match(/Le bilan ne peut pas être calculé pour le moment\./g)).toHaveLength(2);
		expect(container.querySelectorAll('table')).toHaveLength(0);
	});

	describe('durée sans doute trop courte (P7)', () => {
		function withTiming(timing: QuestionTiming | null): Breakdown {
			const base = ok();
			if (base.status !== 'ok') throw new Error('bilan attendu');
			return {
				...base,
				questions: [{ ...base.questions[0], timing }, base.questions[1]]
			};
		}

		it('signalée → marque et phrase sur la ligne du modèle, aucun nom', async () => {
			const { container } = await render(EvaluationBreakdown, {
				breakdown: withTiming({
					delaySeconds: 20,
					students: 10,
					unansweredInTime: 7,
					tooShort: true
				})
			});
			const questions = rows(container, 'bilan-questions');
			expect(questions[0]).toContain('Durée sans doute trop courte');
			expect(questions[0]).toContain("7 élèves sur 10 n'ont rien répondu dans les 20 s");
			expect(questions[1]).not.toContain('Durée sans doute trop courte');
		});

		it('singulier : 1 élève… n’a', async () => {
			const { container } = await render(EvaluationBreakdown, {
				breakdown: withTiming({
					delaySeconds: 10,
					students: 1,
					unansweredInTime: 1,
					tooShort: true
				})
			});
			expect(rows(container, 'bilan-questions')[0]).toContain(
				"1 élève sur 1 n'a rien répondu dans les 10 s"
			);
		});

		it('sous le seuil, ou sans durée (Course, D1) → rien', async () => {
			for (const timing of [
				{ delaySeconds: 20, students: 4, unansweredInTime: 4, tooShort: false },
				null
			]) {
				const { container } = await render(EvaluationBreakdown, { breakdown: withTiming(timing) });
				const text = container.textContent ?? '';
				expect(text).not.toContain('Durée sans doute trop courte');
				expect(text).not.toContain('rien répondu');
			}
		});
	});
});
