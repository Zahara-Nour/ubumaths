/**
 * ExpectedResultView — décor écran du résultat attendu (lot 2, R13)
 * ================================================================
 *
 * Chaque ligne de `buildExpectedResult` est rendue avec son texte, son état
 * (`data-status`) et un libellé accessible : le statut n'est jamais porté par
 * la couleur seule. Exigence de sécurité (audit PR #643) : une valeur math est
 * rendue COMME FORMULE, jamais en markdown (aucun lien fabricable).
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ExpectedResultView from '../ExpectedResultView.svelte';
import { buildExpectedResult, type ExpectedResult } from '$lib/questions/expected-result';
import type { QuestionInstance } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

// Fixtures
function instance(statement: string, blanks: QuestionInstance['blanks']): QuestionInstance {
	return {
		templateId: 't',
		statement: statement as ResolvedMarkdown,
		blanks,
		grades: ['6'],
		theme: 'T',
		domain: 'D',
		level: 1,
		generatedAt: ''
	};
}

const equals = instance('Calcule : $3+5=\\placeholder[0]{}$', [
	{ expectedAnswer: '8', expectedAnswerLatex: '8', type: 'math' }
]);
const twoBlanks = instance('$\\placeholder[0]{}+5=10$ et $2+\\placeholder[1]{}=3$', [
	{ expectedAnswer: '5', expectedAnswerLatex: '5', type: 'math' },
	{ expectedAnswer: '1', expectedAnswerLatex: '1', type: 'math' }
]);
const answer = (values: string[]) => ({ values, latex: values });

async function show(result: ExpectedResult) {
	const main = document.body.appendChild(document.createElement('main'));
	return await render(ExpectedResultView, { target: main, props: { result } });
}

const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
/** Source LaTeX des formules rendues (contenu des `math-span`) */
const formulas = (root: HTMLElement) =>
	[...root.querySelectorAll('math-span, math-field')].map((m) => m.textContent ?? '').join('\n');

// Tests
describe('R1 — comparaison', () => {
	it('juste : `3+5 = 8` encadré vert, libellé « juste »', async () => {
		const { container } = await show(buildExpectedResult(equals, answer(['8'])));
		const line = container.querySelector('[data-kind="comparison"]');
		expect(line?.getAttribute('data-status')).toBe('correct');
		expect(text(line)).toContain('juste');
		expect(formulas(container)).toContain(
			'\\bbox[border:1px solid var(--expected-correct)]{3+5 = 8}'
		);
		expect(formulas(container)).toContain('var(--expected-correct)');
		expect(container.querySelector('[data-kind="solution"]')).toBeNull();
	});

	it('faux : `≠` rouge, libellé « faux », puis `= 8` encadré', async () => {
		const { container } = await show(buildExpectedResult(equals, answer(['9'])));
		const line = container.querySelector('[data-kind="comparison"]');
		expect(line?.getAttribute('data-status')).toBe('incorrect');
		expect(text(line)).toContain('faux');
		expect(formulas(container)).toContain('\\neq');
		expect(formulas(container)).toContain('var(--expected-incorrect)');
		const solution = container.querySelector('[data-kind="solution"]');
		expect(solution).not.toBeNull();
		expect(formulas(solution as HTMLElement)).toContain(
			'\\bbox[border:1px solid var(--expected-correct)]{8}'
		);
	});

	it('vide : la solution puis « Tu n’as rien répondu. »', async () => {
		const { container } = await show(buildExpectedResult(equals, answer([''])));
		expect(container.querySelector('[data-kind="solution"]')).not.toBeNull();
		expect(text(container.querySelector('[data-kind="empty"]'))).toBe("Tu n'as rien répondu.");
	});
});

describe('R2 — forme non optimale', () => {
	it('réponse ambre, libellé « forme à améliorer », remarque, solution', async () => {
		const { container } = await show(buildExpectedResult(equals, answer(['08'])));
		const line = container.querySelector('[data-kind="comparison"]');
		expect(line?.getAttribute('data-status')).toBe('unoptimal');
		expect(text(line)).toContain('forme à améliorer');
		expect(formulas(container)).toContain('var(--expected-unoptimal)');
		expect(text(container.querySelector('[data-kind="remark"]')).length).toBeGreaterThan(0);
		expect(container.querySelector('[data-kind="solution"]')).not.toBeNull();
	});
});

describe('R3 — énoncé rempli, « Ta réponse »', () => {
	it('solutions en vert dans les trous, puis chaque case de l’élève avec son statut', async () => {
		const { container } = await show(buildExpectedResult(twoBlanks, answer(['5', '2'])));
		const filled = container.querySelector('[data-kind="filled-statement"]') as HTMLElement;
		expect(formulas(filled)).toContain('\\textcolor{var(--expected-correct)}{5}');
		expect(formulas(filled)).toContain('\\textcolor{var(--expected-correct)}{1}');
		const mine = container.querySelector('[data-kind="your-answer"]') as HTMLElement;
		expect(text(mine)).toContain('Ta réponse');
		expect(formulas(mine)).toContain('\\textcolor{var(--expected-incorrect)}{2}');
		// Statut de chaque case en toutes lettres
		expect(text(mine)).toContain('case 1 : juste');
		expect(text(mine)).toContain('case 2 : faux');
	});
});

describe('R5 — QCM', () => {
	it('bon coché, coché à tort, bon oublié : état et libellé', async () => {
		const result: ExpectedResult = {
			status: 'incorrect',
			lines: [
				{
					kind: 'choices',
					choices: [
						{
							originalIndex: 2,
							content: 'c',
							checked: false,
							isCorrect: true,
							status: 'unoptimal'
						},
						{ originalIndex: 0, content: 'a', checked: true, isCorrect: true, status: 'correct' },
						{ originalIndex: 1, content: 'b', checked: true, isCorrect: false, status: 'incorrect' }
					]
				}
			]
		};
		const { container } = await show(result);
		const items = [...container.querySelectorAll('[data-kind="choices"] li')];
		expect(items.map((li) => li.getAttribute('data-status'))).toEqual([
			'unoptimal',
			'correct',
			'incorrect'
		]);
		expect(text(items[0])).toContain('oublié');
		expect(text(items[1])).toContain('coché, juste');
		expect(text(items[2])).toContain('coché à tort');
	});
});

describe('R7 — « Une réponse possible »', () => {
	it('énoncé rempli précédé de « Une réponse possible : »', async () => {
		const result: ExpectedResult = {
			status: 'incorrect',
			lines: [
				{
					kind: 'filled-statement',
					markdown: 'Un diviseur de 12 : $\\placeholder[0]{}$',
					fills: [{ index: 0, context: 'math', value: '3', status: 'solution' }],
					possible: true
				}
			]
		};
		const { container } = await show(result);
		expect(text(container)).toContain('Une réponse possible');
	});
});

describe('attendu seul (R8, R10)', () => {
	it('réponse attendue en formule, réponse de l’élève en texte avec son statut', async () => {
		const result: ExpectedResult = {
			status: 'incorrect',
			lines: [
				{
					kind: 'expected-only',
					index: 0,
					context: 'math',
					value: '\\frac{1}{2}',
					possible: false,
					studentAnswer: '0,7',
					studentStatus: 'incorrect'
				}
			]
		};
		const { container } = await show(result);
		const line = container.querySelector('[data-kind="expected-only"]') as HTMLElement;
		expect(formulas(line)).toContain('\\frac{1}{2}');
		expect(text(line)).toContain('0,7');
		expect(text(line)).toContain('faux');
	});
});

describe('sécurité — une valeur math est rendue comme formule', () => {
	const HOSTILE = '[clic](https://evil.example)';

	it.each([
		['R1', equals, [HOSTILE]],
		['R3', twoBlanks, [HOSTILE, HOSTILE]]
	])('%s : aucun lien, la charge est DANS une formule', async (_n, inst, values) => {
		const { container } = await show(buildExpectedResult(inst, answer(values)));
		expect(container.querySelector('a')).toBeNull();
		expect(container.innerHTML).not.toMatch(/<a[\s>]/);
		expect(container.innerHTML).not.toContain('href');
		expect(container.innerHTML).not.toMatch(/style="position/);
		expect(formulas(container)).toContain('evil.example');
	});

	it('case texte hostile : aucun lien non plus', async () => {
		const inst = instance('Le mot {{blank:0}}.', [{ expectedAnswer: 'chat', type: 'text' }]);
		const { container } = await show(buildExpectedResult(inst, answer([HOSTILE])));
		expect(container.querySelector('a')).toBeNull();
		expect(container.innerHTML).not.toContain('href');
	});
});
