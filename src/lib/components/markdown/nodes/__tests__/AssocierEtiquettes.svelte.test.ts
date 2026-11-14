/**
 * Associer deux colonnes à l'écran (chantier `docs/wip/associer-progress.md`)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import AssocierPlacer from '../AssocierEtiquettes.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
import BuildAnswer from '$lib/components/questions/BuildAnswer.svelte';
import { parseAssocierContent } from '$lib/ubumark/parser/associer-parser';
import type { QuestionTemplate } from '$lib/questions/types';
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

/** Bloc d'une instance : sans liens, étiquettes déjà mélangées, `case:` posée */
const shown = (items: string[], labels: string[]) =>
	parseAssocierContent(
		['case: 0', ...items.map((i) => `- ${i} ->`), ...labels.map((l) => `- -> ${l}`)].join('\n')
	);

const ITEMS = ['a', 'b', 'c'];
const LABELS = ['géo', 'arith', 'aucune'];

const tray = (root: Element) => [
	...root.querySelectorAll<HTMLButtonElement>('[data-associer-tray] button')
];
const places = (root: Element) => [
	...root.querySelectorAll<HTMLButtonElement>('button[data-associer-place]')
];
const placeText = (root: Element) => places(root).map((p) => p.textContent?.trim() ?? '');

function answersProbe(count: number) {
	const probe = { values: Array<string>(count).fill('') };
	return {
		probe,
		answers: () =>
			probe.values.map((value, k) => ({
				value,
				isCorrect: null,
				disabled: false,
				onChange: (next: string) => {
					probe.values[k] = next;
				}
			}))
	};
}

describe('Associer — le geste', () => {
	it('au départ : les étiquettes en haut, une rangée « élément | place vide » par élément', async () => {
		const screen = await render(AssocierPlacer, {
			target: mainElement(),
			props: { node: shown(ITEMS, LABELS), answers: answersProbe(3).answers() }
		});
		const root = screen.container;
		expect(tray(root).map((b) => b.textContent?.trim())).toEqual(LABELS);
		expect(
			[...root.querySelectorAll('.associer-element')].map((e) => e.textContent?.trim())
		).toEqual(ITEMS);
		expect(placeText(root)).toEqual(['', '', '']);
	});

	it('toucher une étiquette puis une place : posée, et toujours disponible en haut', async () => {
		const { probe, answers } = answersProbe(3);
		const screen = await render(AssocierPlacer, {
			target: mainElement(),
			props: { node: shown(ITEMS, LABELS), answers: answers() }
		});
		const root = screen.container;
		await userEvent.click(tray(root)[1]);
		await userEvent.click(places(root)[0]);
		await userEvent.click(tray(root)[1]);
		await userEvent.click(places(root)[2]);
		await expect.poll(() => probe.values).toEqual(['1', '', '1']);
		expect(placeText(root)).toEqual(['arith', '', 'arith']);
		expect(tray(root).every((b) => !b.disabled)).toBe(true);
	});

	it('toucher une place remplie la vide', async () => {
		const { probe, answers } = answersProbe(3);
		const screen = await render(AssocierPlacer, {
			target: mainElement(),
			props: { node: shown(ITEMS, LABELS), answers: answers() }
		});
		const root = screen.container;
		await userEvent.click(tray(root)[0]);
		await userEvent.click(places(root)[1]);
		await expect.poll(() => probe.values[1]).toBe('0');
		await userEvent.click(places(root)[1]);
		await expect.poll(() => probe.values[1]).toBe('');
	});

	it('glisser une étiquette sur une place, puis d’une place à l’autre (échange)', async () => {
		const { probe, answers } = answersProbe(3);
		const screen = await render(AssocierPlacer, {
			target: mainElement(),
			props: { node: shown(ITEMS, LABELS), answers: answers() }
		});
		const root = screen.container;
		const at = (element: Element) => {
			const r = element.getBoundingClientRect();
			return {
				bubbles: true,
				pointerId: 1,
				button: 0,
				clientX: r.left + r.width / 2,
				clientY: r.top + r.height / 2
			};
		};
		const drag = (from: Element, to: Element) => {
			from.dispatchEvent(new PointerEvent('pointerdown', at(from)));
			window.dispatchEvent(new PointerEvent('pointermove', at(to)));
			window.dispatchEvent(new PointerEvent('pointerup', at(to)));
		};
		drag(tray(root)[2], places(root)[1]);
		await expect.poll(() => probe.values).toEqual(['', '2', '']);
		drag(places(root)[1], places(root)[0]);
		await expect.poll(() => probe.values).toEqual(['2', '', '']);
		// Glissée en haut : retirée
		drag(places(root)[0], tray(root)[0]);
		await expect.poll(() => probe.values).toEqual(['', '', '']);
	});

	it('clavier : Entrée prend, flèche bas, Entrée pose', async () => {
		const { probe, answers } = answersProbe(3);
		const screen = await render(AssocierPlacer, {
			target: mainElement(),
			props: { node: shown(ITEMS, LABELS), answers: answers() }
		});
		tray(screen.container)[0].focus();
		await userEvent.keyboard('{ArrowRight}');
		await userEvent.keyboard('{Enter}');
		await userEvent.keyboard('{ArrowDown}');
		await userEvent.keyboard('{ArrowDown}');
		await userEvent.keyboard('{Enter}');
		await expect.poll(() => probe.values).toEqual(['', '1', '']);
	});

	it('noms accessibles : jamais la bonne étiquette', async () => {
		const screen = await render(AssocierPlacer, {
			target: mainElement(),
			props: { node: shown(ITEMS, LABELS), answers: answersProbe(3).answers() }
		});
		const root = screen.container;
		expect(tray(root)[0].getAttribute('aria-label')).toBe('Étiquette 1 sur 3');
		expect(places(root)[0].getAttribute('aria-label')).toBe('Place de l’élément 1 sur 3, vide');
	});

	it('téléphone (360 px) : rien ne déborde', async () => {
		await page.viewport(360, 700);
		const long = ['une situation assez longue pour passer à la ligne sur un téléphone', 'b', 'c'];
		const screen = await render(AssocierPlacer, {
			target: mainElement(),
			props: { node: shown(long, LABELS), answers: answersProbe(3).answers() }
		});
		const root = screen.container.querySelector<HTMLElement>('.associer')!;
		expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
		expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
	});

	it('hors question (cours, aide) : le geste, étiquettes mélangées une fois chacune', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: {
				content: ['```associer', '- a -> 1', '- b -> 2', '- c -> 1', '- -> 3', '```'].join('\n')
			}
		});
		const labels = tray(screen.container).map((b) => b.textContent?.trim());
		expect([...labels].sort()).toEqual(['1', '2', '3']);
		expect(labels).not.toEqual(['1', '2', '3']);
	});
});

describe('FillBlanksInput — associer', () => {
	const template = {
		id: 't',
		title: 'Associer',
		status: 'draft',
		variations: [
			{
				statement: templateMarkdown(
					['Associe.', '', '```associer', '- a -> 1', '- b -> 2', '- c -> 1', '- -> 3', '```'].join(
						'\n'
					)
				)
			}
		],
		grades: ['1_SPE'],
		level: 1
	} as QuestionTemplate;

	function instance() {
		const generated = generateInstance(template, 42);
		if (!generated.success) throw new Error(generated.errors.join(' ; '));
		return generated.instance;
	}

	it('décor de la prod : la question générée remplit ses cases', async () => {
		const generated = instance();
		const values: string[] = [];
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement: generated.statement,
				blanks: generated.blanks ?? [],
				values,
				validationResults: []
			}
		});
		const root = screen.container;
		const position = tray(root).findIndex((b) => b.textContent?.trim() === '1');
		await userEvent.click(tray(root)[position]);
		await userEvent.click(places(root)[0]);
		await expect.poll(() => values[0]).toBe(String(position));
		expect(values[0]).toBe(generated.blanks?.[0].expectedAnswer);
	});

	it('correction : place fausse marquée, la bonne étiquette dessous', async () => {
		const generated = instance();
		const right = (generated.blanks ?? []).map((b) => b.expectedAnswer);
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement: generated.statement,
				blanks: generated.blanks ?? [],
				values: [right[1], right[1], right[2]],
				disabled: true,
				validationResults: [false, true, true]
			}
		});
		const root = screen.container;
		expect(root.querySelectorAll('.associer-faux')).toHaveLength(1);
		expect(root.querySelectorAll('.associer-juste')).toHaveLength(2);
		const corrections = [...root.querySelectorAll('.associer-correction')];
		expect(corrections).toHaveLength(1);
		expect(corrections[0].textContent).toContain('1');
	});

	it('bonne réponse affichée : chaque élément avec sa bonne étiquette, sans étiquettes à prendre', async () => {
		const generated = instance();
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement: generated.statement,
				blanks: generated.blanks ?? [],
				showCorrectAnswers: true,
				validationResults: []
			}
		});
		const root = screen.container;
		expect(tray(root)).toHaveLength(0);
		expect([...root.querySelectorAll('.associer-place')].map((p) => p.textContent?.trim())).toEqual(
			['1', '2', '1']
		);
	});
});

describe('BuildAnswer — associer', () => {
	it('copie corrigée : les places de l’élève verrouillées, la bonne étiquette sous la fausse', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'associer',
				// Source d'une instance, `case:` retirée : sans liens
				source: ['- a ->', '- b ->', '- -> x', '- -> y', '- -> z'].join('\n'),
				answer: '1 ; 1',
				status: 'incorrect',
				answers: [
					{ answer: '1', status: 'incorrect' },
					{ answer: '1', status: 'correct' }
				],
				expected: ['2', '1']
			}
		});
		const root = screen.container;
		expect(tray(root)).toHaveLength(0);
		expect(root.querySelectorAll('.associer-faux')).toHaveLength(1);
		expect(root.querySelector('.associer-correction')?.textContent).toContain('z');
	});
});
