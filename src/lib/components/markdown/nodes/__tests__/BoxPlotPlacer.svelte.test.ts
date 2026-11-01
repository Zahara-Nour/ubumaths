/**
 * Boîte à moustaches à construire à l'écran (chantier `boite-a-moustaches`, palier 2,
 * journal § 5)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import BoxPlotPlacer from '../BoxPlotPlacer.svelte';
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

const NOTES = ['axe: 0 à 20, de 1 en 1', 'Notes = 4 ; 8 ; 11 ; 14 ; 19'];
const node = (...lines: string[]) => parseStatChartContent('boite-a-moustaches', lines.join('\n'));

const drawing = (root: Element) => root.querySelector<SVGSVGElement>('svg[role="slider"]')!;

const button = (root: Element, name: string) => {
	const found = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
		(b) => b.getAttribute('aria-label') === name || b.textContent?.trim() === name
	);
	if (!found) throw new Error(`bouton « ${name} » introuvable`);
	return found;
};

/** Toucher le dessin à la graduation `value` (axe 0 → 20 de 1 en 1), comme un doigt */
function tapAt(root: Element, value: number) {
	const svg = drawing(root);
	const grid = [...svg.querySelectorAll('line.stat-grille')].map((l) => l.getBoundingClientRect());
	const rect = grid[value];
	const init = {
		bubbles: true,
		clientX: rect.left + rect.width / 2,
		clientY: rect.top + rect.height / 2,
		pointerId: 1
	};
	svg.dispatchEvent(new PointerEvent('pointerdown', init));
	svg.dispatchEvent(new PointerEvent('pointerup', init));
}

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

describe('Boîte à construire — le geste', () => {
	it('au départ rien n’est posé ; toucher l’axe pose le trait choisi et passe au suivant', async () => {
		const { probe, answers } = answersProbe(5);
		const screen = await render(BoxPlotPlacer, {
			target: mainElement(),
			props: { node: node(...NOTES, 'placer: Notes'), answers: answers() }
		});
		const root = screen.container;
		expect(button(root, 'Min').getAttribute('aria-pressed')).toBe('true');
		expect(root.querySelector('rect.stat-boite')).toBeNull();
		tapAt(root, 4);
		await expect.poll(() => probe.values).toEqual(['4', '', '', '', '']);
		await expect.poll(() => button(root, 'Q1').getAttribute('aria-pressed')).toBe('true');
		tapAt(root, 8);
		await userEvent.click(button(root, 'Q3'));
		tapAt(root, 14);
		await expect.poll(() => probe.values).toEqual(['4', '8', '', '14', '']);
		// Q1 et Q3 posés : la boîte se dessine
		await expect.poll(() => root.querySelector('rect.stat-boite')).not.toBeNull();
	});

	it('reposer un trait déjà posé : le trait choisi reste', async () => {
		const { probe, answers } = answersProbe(5);
		const screen = await render(BoxPlotPlacer, {
			target: mainElement(),
			props: { node: node(...NOTES, 'placer: Notes'), answers: answers() }
		});
		const root = screen.container;
		tapAt(root, 4);
		await userEvent.click(button(root, 'Min'));
		tapAt(root, 5);
		await expect.poll(() => probe.values[0]).toBe('5');
		expect(button(root, 'Min').getAttribute('aria-pressed')).toBe('true');
	});

	it('clavier : flèches (une graduation), Fin, Début', async () => {
		const { probe, answers } = answersProbe(5);
		const screen = await render(BoxPlotPlacer, {
			target: mainElement(),
			props: { node: node(...NOTES, 'placer: Notes'), answers: answers() }
		});
		await userEvent.click(button(screen.container, 'Médiane'));
		drawing(screen.container).focus();
		await userEvent.keyboard('{ArrowRight}{End}{ArrowLeft}{Home}');
		expect(probe.changes).toEqual(['0', '20', '19', '0']);
		expect(probe.values[2]).toBe('0');
	});

	it('nom accessible et description : jamais les valeurs attendues', async () => {
		const screen = await render(BoxPlotPlacer, {
			target: mainElement(),
			props: { node: node(...NOTES, 'placer: Notes') }
		});
		const svg = drawing(screen.container);
		expect(svg.querySelector('title')?.textContent).toBe(
			'Boîte à moustaches à construire : boîte Notes'
		);
		expect(svg.getAttribute('aria-valuetext')).toBe('boîte Notes, minimum pas posé');
		expect(svg.querySelectorAll('line.stat-mediane, rect.stat-boite')).toHaveLength(0);
	});

	it('remonté avec des réponses : le trait choisi est le premier pas posé', async () => {
		const answers = ['4', '8', '', '14', '19'].map((value) => ({
			value,
			isCorrect: null,
			disabled: false,
			onChange: () => {}
		}));
		const screen = await render(BoxPlotPlacer, {
			target: mainElement(),
			props: { node: node(...NOTES, 'placer: Notes'), answers }
		});
		expect(button(screen.container, 'Médiane').getAttribute('aria-pressed')).toBe('true');
	});

	it('deux boîtes, une à construire : l’autre est dessinée, toucher sa bande ne pose rien', async () => {
		const { probe, answers } = answersProbe(5);
		const screen = await render(BoxPlotPlacer, {
			target: mainElement(),
			props: {
				node: node(
					'axe: 0 à 20, de 1 en 1',
					'A = 2 ; 5 ; 9 ; 12 ; 18',
					'B = 4 ; 8 ; 11 ; 14 ; 19',
					'placer: B'
				),
				answers: answers()
			}
		});
		const root = screen.container;
		expect(root.querySelectorAll('rect.stat-boite')).toHaveLength(1);
		// Une seule boîte à construire : toute la hauteur la vise
		tapAt(root, 3);
		await expect.poll(() => probe.values[0]).toBe('3');
	});

	it('hors question (aperçu, cours) : le bloc rend le geste', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: {
				content: ['```boite-a-moustaches', ...NOTES, 'placer: Notes', '```'].join(
					'\n'
				) as ResolvedMarkdown
			}
		});
		expect(drawing(screen.container)).not.toBeNull();
		expect(screen.container.textContent).not.toContain('Correction');
	});
});

describe('FillBlanksInput — boîte à construire', () => {
	const STATEMENT = [
		'Construis la boîte.',
		'',
		'```boite-a-moustaches',
		'case: 0',
		...NOTES,
		'placer: Notes',
		'```'
	].join('\n') as ResolvedMarkdown;
	const blanks: InstanceBlank[] = ['4', '8', '11', '14', '19'].map((v) => ({
		type: 'math',
		expectedAnswer: v,
		expectedAnswerLatex: v,
		construire: 'boite-a-moustaches'
	}));

	it('décor de la prod : la question générée remplit ses cases', async () => {
		const generated = generateInstance(
			{
				id: 'test-boite',
				title: 'Construire',
				status: 'draft',
				variations: [
					{
						statement: templateMarkdown(
							['Construis.', '', '```boite-a-moustaches', ...NOTES, 'placer: Notes', '```'].join(
								'\n'
							)
						)
					}
				],
				grades: ['3'],
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
		tapAt(screen.container, 6);
		await expect.poll(() => values[0]).toBe('6');
		expect(values[1] ?? '').toBe('');
	});

	it('correction : une phrase par trait faux et la boîte juste', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement: STATEMENT,
				blanks,
				values: ['4', '8', '12', '14', ''],
				disabled: true,
				validationResults: [true, true, false, true, false]
			}
		});
		const text = screen.container.textContent ?? '';
		expect(text).toContain('Ta médiane est à 12.');
		expect(text).toContain('Tu n’as pas placé le maximum.');
		expect(text).not.toContain('Ton minimum');
		expect(screen.container.querySelector('.placer-correction')).not.toBeNull();
	});

	it('bonne réponse affichée : la boîte juste, sans boutons', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: STATEMENT, blanks, showCorrectAnswers: true, validationResults: [] }
		});
		const root = screen.container;
		expect(root.querySelector('svg[role="slider"]')).toBeNull();
		expect(root.querySelectorAll('rect.stat-boite')).toHaveLength(1);
	});
});

describe('BuildAnswer — boîte à construire', () => {
	it('copie corrigée : les traits de l’élève, verrouillés, sans boutons', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'boite-a-moustaches',
				source: [...NOTES, 'placer: Notes'].join('\n'),
				answer: '4 ; 8 ; 11 ; 14 ; 19',
				status: 'correct',
				answers: ['4', '8', '11', '14', '19'].map((answer) => ({
					answer,
					status: 'correct' as const
				}))
			}
		});
		const root = screen.container;
		expect(drawing(root).getAttribute('aria-disabled')).toBe('true');
		expect(root.querySelector('button')).toBeNull();
		expect(root.querySelector('.placer-juste')).not.toBeNull();
		expect(root.querySelector('rect.stat-boite')).not.toBeNull();
	});
});
