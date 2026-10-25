/**
 * FillBlanksInput — bloc ```operation à remplir (PR 1b, phase 0 :
 * `docs/archive/wip/operations-posees-progress.md` § 9)
 *
 * La grille porte UNE case de la question : sa réponse (les chiffres du
 * résultat) arrive dans `values[N]` comme celle d'une case ordinaire.
 *
 * Rendu dans <main> : décor réel de l'application.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import FillBlanksInput from '../FillBlanksInput.svelte';
import type { ResolvedMarkdown } from '$lib/ubumark';
import type { InstanceBlank } from '$lib/questions/types';

let mains: HTMLElement[] = [];
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

const STATEMENT = [
	'Mot : {{blank:0}}',
	'',
	'```operation',
	'case: 1',
	'calcul: 45 + 37',
	'```'
].join('\n') as ResolvedMarkdown;

const blanks: InstanceBlank[] = [
	{ type: 'text', expectedAnswer: 'addition' },
	{ type: 'math', expectedAnswer: '82', expectedAnswerLatex: '82', operation: true }
];

const resultCells = (root: Element) => [
	...root.querySelectorAll<HTMLInputElement>('input[data-operation-cell="résultat"]')
];

describe('FillBlanksInput — bloc ```operation', () => {
	it('la grille remplit values[N] (comportements 1, 4)', async () => {
		const values: string[] = [];
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: STATEMENT, blanks, values, validationResults: [] }
		});
		const cells = resultCells(screen.container);
		expect(cells).toHaveLength(3);
		await userEvent.click(cells[2]);
		await userEvent.keyboard('28');
		expect(values[1]).toBe('82');
	});

	it('0,5 + 0,5 : « 1 » sans le 0 des dixièmes remplit values[N] (décimales de fin)', async () => {
		const statement = ['```operation', 'case: 0', 'calcul: 0,5 + 0,5', '```'].join(
			'\n'
		) as ResolvedMarkdown;
		const values: string[] = [];
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement,
				blanks: [{ type: 'math', expectedAnswer: '1', expectedAnswerLatex: '1', operation: true }],
				values,
				validationResults: []
			}
		});
		const cells = resultCells(screen.container);
		expect(cells).toHaveLength(3);
		await userEvent.click(cells[1]);
		await userEvent.keyboard('1');
		expect(cells[2].value).toBe('');
		expect(values[0]).toBe('1');
	});

	it('multiplication : chiffres et virgule de l’élève remplissent values[N] (PR 2b, § 11)', async () => {
		const statement = ['```operation', 'case: 0', 'calcul: 7 × 46,55', '```'].join(
			'\n'
		) as ResolvedMarkdown;
		const values: string[] = [];
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement,
				blanks: [
					{
						type: 'math',
						expectedAnswer: '325.85',
						expectedAnswerLatex: '325{,}85',
						operation: true
					}
				],
				values,
				validationResults: []
			}
		});
		const cells = resultCells(screen.container);
		expect(cells).toHaveLength(5);
		await userEvent.click(cells[4]);
		await userEvent.keyboard('58523');
		await userEvent.click(cells[2]);
		await userEvent.keyboard(',');
		expect(values[0]).toBe('325{,}85');
	});

	it('Entrée, grille vide : le curseur va dans la case vide la plus à droite', async () => {
		let submitted = 0;
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement: STATEMENT,
				blanks,
				validationResults: [],
				onSubmit: () => submitted++
			}
		});
		const text = screen.container.querySelector<HTMLInputElement>(
			'input[type="text"]:not([data-operation-cell])'
		)!;
		await userEvent.click(text);
		await userEvent.keyboard('addition{Enter}');
		expect(submitted).toBe(0);
		expect(document.activeElement).toBe(resultCells(screen.container)[2]);
		await userEvent.keyboard('28{Enter}');
		expect(submitted).toBe(1);
	});

	it('correction : la grille de l’élève, chiffres faux surlignés', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement: STATEMENT,
				blanks,
				values: ['addition', '72'],
				disabled: true,
				validationResults: [true, false]
			}
		});
		const cells = resultCells(screen.container);
		expect(cells.map((c) => c.value)).toEqual(['', '7', '2']);
		expect(cells.map((c) => c.getAttribute('aria-invalid'))).toEqual([null, 'true', null]);
		expect(screen.container.querySelector('.operation-correction')).not.toBeNull();
	});

	it('bonne réponse affichée : opération résolue, aucune case', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: STATEMENT, blanks, showCorrectAnswers: true, validationResults: [] }
		});
		expect(resultCells(screen.container)).toHaveLength(0);
		const grid = screen.container.querySelector('.operation-grille')!;
		expect((grid.textContent ?? '').replace(/\s+/g, '')).toBe('145+3782');
	});

	it('flash : grille d’affichage, sans saisie', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: STATEMENT, blanks, flashMode: true, validationResults: [] }
		});
		expect(resultCells(screen.container)).toHaveLength(0);
		expect(screen.container.querySelectorAll('.operation-case')).toHaveLength(3);
	});
});

// Division euclidienne : un bloc, DEUX cases (quotient, reste ; PR 3b, § 12 Q2)
describe('FillBlanksInput — division posée', () => {
	const DIVISION = [
		'```operation',
		'case: 0',
		'calcul: 9456 ÷ 7',
		'```',
		'',
		'Mot : {{blank:2}}'
	].join('\n') as ResolvedMarkdown;

	const divisionBlanks: InstanceBlank[] = [
		{ type: 'math', expectedAnswer: '1350', expectedAnswerLatex: '1350', operation: true },
		{ type: 'math', expectedAnswer: '6', expectedAnswerLatex: '6', operation: true },
		{ type: 'text', expectedAnswer: 'division' }
	];

	const cellsOf = (root: Element, kind: string) => [
		...root.querySelectorAll<HTMLInputElement>(`input[data-operation-cell="${kind}"]`)
	];

	it('quotient → values[N], reste → values[N+1] (n° 4)', async () => {
		const values: string[] = [];
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: DIVISION, blanks: divisionBlanks, values, validationResults: [] }
		});
		await userEvent.click(cellsOf(screen.container, 'quotient')[0]);
		await userEvent.keyboard('1350');
		await userEvent.click(cellsOf(screen.container, 'reste')[0]);
		await userEvent.keyboard('6');
		expect(values.slice(0, 2)).toEqual(['1350', '6']);
	});

	it('Entrée : quotient vide → sa case vide la plus à gauche ; puis le reste', async () => {
		let submitted = 0;
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement: DIVISION,
				blanks: divisionBlanks,
				validationResults: [],
				onSubmit: () => submitted++
			}
		});
		const text = screen.container.querySelector<HTMLInputElement>(
			'input[type="text"]:not([data-operation-cell])'
		)!;
		await userEvent.click(text);
		await userEvent.keyboard('division{Enter}');
		expect(document.activeElement).toBe(cellsOf(screen.container, 'quotient')[0]);
		await userEvent.keyboard('1350{Enter}');
		expect(document.activeElement).toBe(cellsOf(screen.container, 'reste')[0]);
		await userEvent.keyboard('6{Enter}');
		expect(submitted).toBe(1);
	});

	it('correction : quotient et reste de l’élève remis, chacun jugé par sa case', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement: DIVISION,
				blanks: divisionBlanks,
				values: ['1350', '5', 'division'],
				disabled: true,
				validationResults: [true, false, true]
			}
		});
		expect(cellsOf(screen.container, 'quotient').map((c) => c.value)).toEqual(['1', '3', '5', '0']);
		expect(cellsOf(screen.container, 'reste').map((c) => c.getAttribute('aria-invalid'))).toEqual([
			'true'
		]);
		expect(screen.container.querySelector('.operation-correction')).not.toBeNull();
	});

	it('division décimale : une case, quotient et virgule de l’élève', async () => {
		const statement = ['```operation', 'case: 0', 'calcul: 148,2 ÷ 5', '```'].join(
			'\n'
		) as ResolvedMarkdown;
		const values: string[] = [];
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement,
				blanks: [
					{ type: 'math', expectedAnswer: '29.64', expectedAnswerLatex: '29{,}64', operation: true }
				],
				values,
				validationResults: []
			}
		});
		expect(cellsOf(screen.container, 'reste')).toHaveLength(0);
		const cells = cellsOf(screen.container, 'quotient');
		await userEvent.click(cells[0]);
		await userEvent.keyboard('2964');
		await userEvent.click(cells[1]);
		await userEvent.keyboard(',');
		expect(values[0]).toBe('29{,}64');
	});

	it('bonne réponse affichée : potence résolue, aucune case', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement: DIVISION,
				blanks: divisionBlanks,
				showCorrectAnswers: true,
				validationResults: []
			}
		});
		expect(cellsOf(screen.container, 'quotient')).toHaveLength(0);
		expect(cellsOf(screen.container, 'reste')).toHaveLength(0);
	});
});
