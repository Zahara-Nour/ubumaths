/**
 * Diagramme en barres à construire à l'écran (chantier
 * `docs/wip/reponses-a-placer-progress.md` § 17, 18)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import BarresPlacer from '../BarresPlacer.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
import BuildAnswer from '$lib/components/questions/BuildAnswer.svelte';
import { parseStatChartContent } from '$lib/ubumark/parser/stat-chart-parser';
import type { ResolvedMarkdown } from '$lib/ubumark';
import type { InstanceBlank, QuestionTemplate } from '$lib/questions/types';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { templateMarkdown } from '$lib/ubumark';

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

const SPORTS = ['Football = 12', 'Natation = 8', 'Danse = 7', 'axe: 0 à 20, de 2 en 2'];
const node = (...lines: string[]) => parseStatChartContent('barres', lines.join('\n'));

const drawing = (root: Element) => root.querySelector<SVGSVGElement>('svg[role="slider"]')!;

const button = (root: Element, name: string) => {
	const found = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
		(b) => b.getAttribute('aria-label') === name || b.textContent?.trim() === name
	);
	if (!found) throw new Error(`bouton « ${name} » introuvable`);
	return found;
};

/** Toucher la colonne `label` à la hauteur `value` (lue sur la grille 0 → 20), comme un doigt */
function tapAt(root: Element, label: string, value: number, max = 20) {
	const svg = drawing(root);
	const name = [...svg.querySelectorAll('.stat-categories text')].find(
		(t) => t.textContent === label
	)!;
	const grid = [...svg.querySelectorAll('line.stat-grille')].map((l) => l.getBoundingClientRect());
	const [bottom, top] = [grid[0].top, grid[grid.length - 1].top];
	const init = {
		bubbles: true,
		clientX: name.getBoundingClientRect().left + name.getBoundingClientRect().width / 2,
		clientY: bottom + ((top - bottom) * value) / max,
		pointerId: 1
	};
	svg.dispatchEvent(new PointerEvent('pointerdown', init));
	svg.dispatchEvent(new PointerEvent('pointerup', init));
}

/** Barres en attente (pointillés au pied de leur colonne) */
const waiting = (root: Element) => drawing(root).querySelectorAll('line.barres-attente').length;

function answersProbe(count: number) {
	const probe = { values: Array<string>(count).fill(''), changes: [] as string[] };
	return {
		probe,
		answers: () =>
			probe.values.map((value, k) => ({
				value,
				isCorrect: null,
				disabled: false,
				onChange: (next: string) => {
					probe.values[k] = next;
					probe.changes.push(next);
				}
			}))
	};
}

describe('Barres à construire — le geste', () => {
	it('au départ, les barres à construire attendent ; toucher une colonne monte sa barre', async () => {
		const { probe, answers } = answersProbe(2);
		const screen = await render(BarresPlacer, {
			target: mainElement(),
			props: { node: node(...SPORTS, 'placer: Natation ; Danse'), answers: answers() }
		});
		const root = screen.container;
		expect(waiting(root)).toBe(2);
		expect(drawing(root).getAttribute('aria-valuetext')).toBe('barre Natation pas construite');
		tapAt(root, 'Danse', 7);
		await expect.poll(() => probe.values).toEqual(['', '7']);
		await expect.poll(() => waiting(root)).toBe(1);
		expect(drawing(root).getAttribute('aria-valuetext')).toBe('barre Danse : 7');
	});

	it('toucher une colonne dessinée : rien', async () => {
		const { probe, answers } = answersProbe(1);
		const screen = await render(BarresPlacer, {
			target: mainElement(),
			props: { node: node(...SPORTS, 'placer: Danse'), answers: answers() }
		});
		tapAt(screen.container, 'Football', 5);
		await new Promise((r) => setTimeout(r, 50));
		expect(probe.changes).toEqual([]);
	});

	it('étiquettes et ▲ ▼ : une unité, la barre choisie', async () => {
		const { probe, answers } = answersProbe(2);
		const screen = await render(BarresPlacer, {
			target: mainElement(),
			props: { node: node(...SPORTS, 'placer: Natation ; Danse'), answers: answers() }
		});
		const root = screen.container;
		await userEvent.click(button(root, 'Danse'));
		expect(button(root, 'Danse').getAttribute('aria-pressed')).toBe('true');
		await userEvent.click(button(root, 'Monter la barre Danse d’une unité'));
		await userEvent.click(button(root, 'Monter la barre Danse d’une unité'));
		await userEvent.click(button(root, 'Descendre la barre Danse d’une unité'));
		expect(probe.changes).toEqual(['1', '2', '1']);
	});

	it('clavier : flèches, Fin, Début', async () => {
		const { probe, answers } = answersProbe(1);
		const screen = await render(BarresPlacer, {
			target: mainElement(),
			props: { node: node(...SPORTS, 'placer: Danse'), answers: answers() }
		});
		drawing(screen.container).focus();
		await userEvent.keyboard('{ArrowUp}{End}{ArrowDown}{Home}');
		expect(probe.changes).toEqual(['1', '20', '19', '0']);
	});

	it('nom accessible et description : jamais l’effectif attendu', async () => {
		const screen = await render(BarresPlacer, {
			target: mainElement(),
			props: { node: node(...SPORTS, 'placer: Danse') }
		});
		const svg = drawing(screen.container);
		expect(svg.textContent).not.toMatch(/\b7\b(?!\d)/);
		expect(svg.querySelector('title')?.textContent).toBe(
			'Diagramme en barres à construire : barre Danse'
		);
	});

	it('remonté avec des réponses : la barre choisie est la première pas construite', async () => {
		const answers = [
			{ value: '8', isCorrect: null, disabled: false, onChange: () => {} },
			{ value: '', isCorrect: null, disabled: false, onChange: () => {} }
		];
		const screen = await render(BarresPlacer, {
			target: mainElement(),
			props: { node: node(...SPORTS, 'placer: Natation ; Danse'), answers }
		});
		expect(button(screen.container, 'Danse').getAttribute('aria-pressed')).toBe('true');
	});

	it('hors question (aperçu, cours) : le bloc rend le geste', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: {
				content: ['```barres', ...SPORTS, 'placer: Danse', '```'].join('\n') as ResolvedMarkdown
			}
		});
		expect(drawing(screen.container)).not.toBeNull();
		expect(screen.container.textContent).not.toContain('Correction');
	});
});

describe('FillBlanksInput — barres à construire', () => {
	const STATEMENT = [
		'Construis le diagramme.',
		'',
		'```barres',
		'case: 0',
		...SPORTS,
		'placer: Natation ; Danse',
		'```'
	].join('\n') as ResolvedMarkdown;
	const blanks: InstanceBlank[] = [
		{ type: 'math', expectedAnswer: '8', expectedAnswerLatex: '8', construire: 'barres' },
		{ type: 'math', expectedAnswer: '7', expectedAnswerLatex: '7', construire: 'barres' }
	];

	it('décor de la prod : la question générée remplit ses cases', async () => {
		const generated = generateInstance(
			{
				id: 'test-barres',
				title: 'Construire',
				status: 'draft',
				variations: [
					{
						statement: templateMarkdown(
							['Construis.', '', '```barres', ...SPORTS, 'placer: Natation ; Danse', '```'].join(
								'\n'
							)
						)
					}
				],
				grades: ['CE1'],
				theme: 'Test',
				domain: 'Test',
				level: 1
			} as QuestionTemplate,
			42
		);
		if (!generated.success) throw new Error(generated.errors.join(' ; '));
		const values: string[] = [];
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement: generated.instance.statement,
				blanks: generated.instance.blanks ?? [],
				values,
				validationResults: []
			}
		});
		tapAt(screen.container, 'Danse', 6);
		await expect.poll(() => values[1]).toBe('6');
		expect(values[0] ?? '').toBe('');
	});

	it('correction : une phrase par barre fausse et le diagramme juste', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement: STATEMENT,
				blanks,
				values: ['8', ''],
				disabled: true,
				validationResults: [true, false]
			}
		});
		const text = screen.container.textContent ?? '';
		expect(text).toContain('Tu n’as pas construit la barre Danse.');
		expect(text).not.toContain('Ta barre Natation');
		expect(screen.container.querySelector('.placer-correction')).not.toBeNull();
	});

	it('bonne réponse affichée : le diagramme juste, sans boutons', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: STATEMENT, blanks, showCorrectAnswers: true, validationResults: [] }
		});
		const root = screen.container;
		expect(root.querySelector('svg[role="slider"]')).toBeNull();
		expect(root.querySelectorAll('rect.stat-barre')).toHaveLength(3);
	});
});

describe('BuildAnswer — barres à construire', () => {
	it('copie corrigée : les barres de l’élève, verrouillées, sans boutons', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'barres',
				source: [...SPORTS, 'placer: Natation ; Danse'].join('\n'),
				answer: '8 ; 7',
				status: 'correct',
				answers: [
					{ answer: '8', status: 'correct' },
					{ answer: '7', status: 'correct' }
				]
			}
		});
		const root = screen.container;
		expect(drawing(root).getAttribute('aria-disabled')).toBe('true');
		expect(root.querySelector('button')).toBeNull();
		expect(root.querySelector('.placer-juste')).not.toBeNull();
	});
});

describe('Échelle choisie par l’élève (axe: à choisir, § 24-25)', () => {
	const VILLES = [
		'Alphaville = 42',
		'Bêtaville = 35',
		'Gammaville = 18',
		'axe: à choisir',
		'placer: toutes'
	];
	const tickLabels = (root: Element) =>
		[...drawing(root).querySelectorAll('.stat-graduations text')].map((t) => t.textContent);

	it('pas d’échelle : axe muet, les barres ne se construisent pas', async () => {
		const { probe, answers } = answersProbe(4);
		const screen = await render(BarresPlacer, {
			target: mainElement(),
			props: { node: node(...VILLES), answers: answers() }
		});
		const root = screen.container;
		expect(tickLabels(root).every((t) => t === '')).toBe(true);
		expect(root.textContent).toContain('Choisis d’abord l’échelle.');
		expect(button(root, 'Monter la barre Alphaville d’une unité').disabled).toBe(true);
		expect(button(root, 'Descendre la barre Alphaville d’une unité').disabled).toBe(true);
		tapAt(root, 'Gammaville', 5, 10);
		await new Promise((r) => setTimeout(r, 50));
		expect(probe.changes).toEqual([]);
	});

	it('choisir 5 : la case échelle vaut 5, l’axe se numérote, la barre se construit', async () => {
		const { probe, answers } = answersProbe(4);
		const screen = await render(BarresPlacer, {
			target: mainElement(),
			props: { node: node(...VILLES), answers: answers() }
		});
		const root = screen.container;
		await userEvent.click(button(root, 'Une graduation vaut 5'));
		expect(probe.values[0]).toBe('5');
		await expect.poll(() => tickLabels(root).at(-1)).toBe('50');
		tapAt(root, 'Gammaville', 18, 50);
		await expect.poll(() => probe.values[3]).toBe('18');
	});

	it('changer d’échelle : les barres gardent leur valeur, celles qui ne rentrent plus s’effacent', async () => {
		const { probe, answers } = answersProbe(4);
		probe.values = ['5', '42', '', '18'];
		const screen = await render(BarresPlacer, {
			target: mainElement(),
			props: { node: node(...VILLES), answers: answers() }
		});
		await userEvent.click(button(screen.container, 'Une graduation vaut 2'));
		expect(probe.values).toEqual(['2', '', '', '18']);
	});

	it('correction : la phrase de l’échelle et le diagramme juste à son échelle', async () => {
		const statement = ['```barres', 'case: 0', ...VILLES, '```'].join('\n') as ResolvedMarkdown;
		const blanks: InstanceBlank[] = ['5', '42', '35', '18'].map((v) => ({
			type: 'math',
			expectedAnswer: v,
			expectedAnswerLatex: v,
			construire: 'barres'
		}));
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement,
				blanks,
				values: ['10', '42', '35', '18'],
				disabled: true,
				validationResults: [false, true, true, true]
			}
		});
		const root = screen.container;
		expect(root.textContent).toContain(
			'Avec 10 par graduation, ton diagramme rentre, mais avec 5 il serait plus grand et plus lisible.'
		);
		const solution = root.querySelector('.placer-correction')!;
		expect(solution.textContent).toContain('50');
	});

	it('copie corrigée : l’échelle choisie écrite, sans boutons', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'barres',
				source: VILLES.join('\n'),
				answer: '5 ; 42 ; 35 ; 18',
				status: 'correct',
				answers: ['5', '42', '35', '18'].map((answer) => ({ answer, status: 'correct' as const }))
			}
		});
		const root = screen.container;
		expect(root.querySelector('button')).toBeNull();
		expect(root.textContent).toContain('Une graduation vaut 5.');
		expect(tickLabels(root).at(-1)).toBe('50');
	});

	it('bonne réponse affichée : le diagramme à la bonne échelle', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: { kind: 'barres', source: VILLES.join('\n'), answer: null, status: 'solution' }
		});
		expect(screen.container.querySelectorAll('rect.stat-barre')).toHaveLength(3);
		expect(screen.container.textContent).toContain('50');
	});
});
