/**
 * CorrectionCard — carte de correction des résultats (Entraînement, Course,
 * Évaluation). Lot 2 du résultat attendu (R13) : recto = résultat attendu +
 * statut global ; verso = correction concise ↔ détaillée (`CorrectionView`).
 *
 * Défauts déjà payés : « undefined » pour une question à trous (2026-09-30), lettre
 * d'un QCM mélangé (2026-10-01), LaTeX brut dans un `<code>`.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CorrectionCard from '../CorrectionCard.svelte';
import type { QuestionInstance } from '$lib/questions/types';
import type { TestAnswerResult } from '$lib/types/test';
import type { AnswerData } from '$lib/types/question-display';
import type { DetailedVerdict } from '$lib/utils/answer-validator';
import { resolvedMarkdown } from '$lib/ubumark';

function result(
	instance: Partial<QuestionInstance>,
	value: AnswerData['value'] = ['150']
): TestAnswerResult {
	return {
		index: 0,
		instance: {
			templateId: 't',
			statement: resolvedMarkdown('Calcule $16 \\times 10 = \\placeholder[0]{}$'),
			grades: ['6'],
			theme: 'Entiers',
			domain: 'Multiplier',
			level: 1,
			generatedAt: new Date().toISOString(),
			...instance
		} as QuestionInstance,
		userAnswer: { value, isCorrect: false, timeSpent: 3, attempts: 1, submittedAt: '' },
		isCorrect: false
	};
}

const oneBlank = {
	blanks: [{ expectedAnswer: '160', expectedAnswerLatex: '160', type: 'math' }]
} as Partial<QuestionInstance>;

async function show(props: { answerResult: TestAnswerResult; verdict?: DetailedVerdict }) {
	const main = document.body.appendChild(document.createElement('main'));
	return await render(CorrectionCard, { target: main, props });
}

const front = (c: HTMLElement) => c.querySelector('.flip-front') as HTMLElement;
const back = (c: HTMLElement) => c.querySelector('.flip-back') as HTMLElement;
const formulas = (root: HTMLElement) =>
	[...root.querySelectorAll('math-span')].map((m) => m.textContent ?? '').join('\n');

describe('CorrectionCard — recto : résultat attendu et statut global', () => {
	it('faux : `≠ 150`, `= 160` encadré, « Faux », plus de « Votre réponse » ni `<code>`', async () => {
		const { container } = await show({ answerResult: result(oneBlank) });
		const recto = front(container);
		expect(recto.querySelector('[data-testid="expected-result"]')).not.toBeNull();
		expect(formulas(recto)).toContain('\\neq');
		expect(formulas(recto)).toContain('\\bbox[border:1px solid var(--expected-correct)]{160}');
		expect(recto.querySelector('[data-testid="global-verdict"]')?.textContent).toContain('Faux');
		expect(recto.querySelector('code')).toBeNull();
		expect(recto.textContent).not.toContain('Votre réponse');
		expect(recto.textContent).not.toContain('Réponse correcte');
		expect(recto.textContent).not.toContain('undefined');
	});

	it('juste : statut « Juste »', async () => {
		const { container } = await show({ answerResult: result(oneBlank, ['160']) });
		expect(
			front(container).querySelector('[data-testid="global-verdict"]')?.getAttribute('data-kind')
		).toBe('correct');
	});

	it('plusieurs trous : toutes les solutions dans l’énoncé rempli', async () => {
		const { container } = await show({
			answerResult: result(
				{
					statement: resolvedMarkdown('$\\placeholder[0]{}$ centaines et {{blank:1}}'),
					blanks: [
						{ expectedAnswer: '2', expectedAnswerLatex: '2', type: 'math' },
						{ expectedAnswer: 'dizaines', type: 'text' }
					]
				} as Partial<QuestionInstance>,
				['3', 'unités']
			)
		});
		const recto = formulas(front(container));
		expect(recto).toContain('{2}');
		expect(recto).toContain('dizaines');
	});

	it('évaluation : le verdict SERVEUR est affiché tel quel (½, case ambre)', async () => {
		const verdict: DetailedVerdict = {
			status: 'unoptimal_form',
			blanks: [{ index: 0, status: 'unoptimal_form', remarks: ['Simplifie.'], answer: '160' }]
		};
		const { container } = await show({ answerResult: result(oneBlank, ['160']), verdict });
		const recto = front(container);
		const badge = recto.querySelector('[data-testid="global-verdict"]');
		expect(badge?.getAttribute('data-kind')).toBe('half');
		expect(badge?.textContent).toContain('½');
		expect(recto.querySelector('[data-kind="comparison"]')?.getAttribute('data-status')).toBe(
			'unoptimal'
		);
		expect(recto.textContent).toContain('Simplifie.');
	});
});

describe('CorrectionCard — QCM', () => {
	const choices = {
		blanks: undefined,
		choices: [
			{ content: resolvedMarkdown('Paris'), isCorrect: true },
			{ content: resolvedMarkdown('Marseille'), isCorrect: false },
			{ content: resolvedMarkdown('Lyon'), isCorrect: false }
		],
		// Lyon (origine 2) affiché en A
		shuffledChoices: [
			{ content: resolvedMarkdown('Lyon'), originalIndex: 2 },
			{ content: resolvedMarkdown('Paris'), originalIndex: 0 },
			{ content: resolvedMarkdown('Marseille'), originalIndex: 1 }
		],
		correctChoiceIndex: '0',
		statement: resolvedMarkdown('Capitale de la France ?')
	} as Partial<QuestionInstance>;

	it('ordre affiché, lettre vue par l’élève, coché à tort et bonne réponse', async () => {
		const { container } = await show({ answerResult: result(choices, 2) });
		const items = [...front(container).querySelectorAll('[data-kind="choices"] li')];
		expect(items[0].textContent?.trim().startsWith('A')).toBe(true);
		expect(items[0].textContent).toContain('Lyon');
		expect(items[0].getAttribute('data-status')).toBe('incorrect');
		expect(items[1].textContent).toContain('Paris');
		expect(items[1].getAttribute('data-status')).toBe('solution');
		// L'énoncé d'un QCM reste lisible au recto
		expect(front(container).textContent).toContain('Capitale de la France');
	});
});

describe('CorrectionCard — verso : correction concise ↔ détaillée (ADR 0017)', () => {
	it('s’ouvre concise, sans marqueur brut, avec l’interrupteur', async () => {
		const { container } = await show({
			answerResult: result({
				...oneBlank,
				correction: {
					steps: [resolvedMarkdown('On multiplie \\detail{deux par huit dizaines} vite.')]
				}
			} as Partial<QuestionInstance>)
		});
		const verso = back(container);
		expect(verso.querySelector('[data-testid="correction-view"]')).not.toBeNull();
		expect(verso.textContent).not.toContain('\\detail');
		expect(verso.textContent).not.toContain('deux par huit dizaines');
		expect(verso.textContent).toContain('Voir le détail');
	});
});

describe('Q104 — comparaison R1 : la consigne seule, sans formule à case vide', () => {
	it('« Calcule » au-dessus de la comparaison, aucune case de saisie au recto', async () => {
		const { container } = await show({ answerResult: result(oneBlank) });
		const recto = front(container);
		expect(recto.querySelector('[data-testid="statement"]')).toBeNull();
		expect(recto.querySelector('math-field')).toBeNull();
		expect(recto.querySelector('[data-testid="instruction"]')?.textContent).toContain('Calcule');
	});

	it('énoncé sans texte hors formule : rien au-dessus de la comparaison', async () => {
		const { container } = await show({
			answerResult: result({
				...oneBlank,
				statement: resolvedMarkdown('$16 \\times 10 = \\placeholder[0]{}$')
			} as Partial<QuestionInstance>)
		});
		const recto = front(container);
		expect(recto.querySelector('[data-testid="instruction"]')).toBeNull();
		expect(recto.querySelector('[data-testid="statement"]')).toBeNull();
		expect(recto.querySelector('[data-kind="comparison"]')).not.toBeNull();
	});
});

describe('Q105 — entraînement noté comme l’évaluation', () => {
	it('deux cases, une juste et une vide : « ½ point » (partiel du barème)', async () => {
		const { container } = await show({
			answerResult: result(
				{
					statement: resolvedMarkdown('$\\placeholder[0]{}+1=8$ et $\\placeholder[1]{}+1=9$'),
					blanks: [
						{ expectedAnswer: '7', expectedAnswerLatex: '7', type: 'math' },
						{ expectedAnswer: '8', expectedAnswerLatex: '8', type: 'math' }
					]
				} as Partial<QuestionInstance>,
				['7', '']
			)
		});
		const badge = front(container).querySelector('[data-testid="global-verdict"]');
		expect(badge?.getAttribute('data-kind')).toBe('half');
		expect(badge?.textContent).toContain('½ point');
	});

	it('QCM multiple incomplet (bons cochés, un oublié) : « ½ point », comme en évaluation', async () => {
		const { container } = await show({
			answerResult: result(
				{
					blanks: undefined,
					statement: resolvedMarkdown('Nombres pairs ?'),
					choices: [
						{ content: resolvedMarkdown('12'), isCorrect: true },
						{ content: resolvedMarkdown('15'), isCorrect: false },
						{ content: resolvedMarkdown('28'), isCorrect: true }
					],
					correctChoiceIndex: ['0', '2'],
					multipleAnswers: true
				} as Partial<QuestionInstance>,
				[0]
			)
		});
		expect(
			front(container).querySelector('[data-testid="global-verdict"]')?.getAttribute('data-kind')
		).toBe('half');
	});
});
