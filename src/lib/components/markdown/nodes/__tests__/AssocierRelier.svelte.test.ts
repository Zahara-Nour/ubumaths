/**
 * Associer deux colonnes à l'écran, geste « relier » (défaut) — chantier
 * `docs/wip/associer-progress.md`, décisions 6-7
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import AssocierPlacer from '../AssocierPlacer.svelte';
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

const itemCases = (root: Element) => [
	...root.querySelectorAll<HTMLButtonElement>('button[data-relier-case^="item:"]')
];
const labelCases = (root: Element) => [
	...root.querySelectorAll<HTMLButtonElement>('button[data-relier-case^="label:"]')
];
const traits = (root: Element, kind = '') => [
	...root.querySelectorAll<SVGLineElement>(`.relier-trait${kind ? `-${kind}` : ''}`)
];

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

function centerOf(element: Element) {
	const r = element.getBoundingClientRect();
	return {
		bubbles: true,
		pointerId: 1,
		button: 0,
		clientX: r.left + r.width / 2,
		clientY: r.top + r.height / 2
	};
}

function drag(from: Element, to: Element) {
	from.dispatchEvent(new PointerEvent('pointerdown', centerOf(from)));
	window.dispatchEvent(new PointerEvent('pointermove', centerOf(to)));
	window.dispatchEvent(new PointerEvent('pointerup', centerOf(to)));
}

describe('Associer, relier — le geste', () => {
	it('au départ : éléments à gauche avec un point, étiquettes à droite avec un point, aucun trait', async () => {
		const screen = await render(AssocierPlacer, {
			target: mainElement(),
			props: { node: shown(ITEMS, LABELS), answers: answersProbe(3).answers() }
		});
		const root = screen.container;
		expect(itemCases(root).map((b) => b.textContent?.trim())).toEqual(ITEMS);
		expect(labelCases(root).map((b) => b.textContent?.trim())).toEqual(LABELS);
		expect(root.querySelectorAll('[data-relier-point]')).toHaveLength(6);
		expect(traits(root)).toHaveLength(0);
		// Colonnes côte à côte : les étiquettes à droite des éléments
		const left = itemCases(root)[0].getBoundingClientRect();
		const right = labelCases(root)[0].getBoundingClientRect();
		expect(right.left).toBeGreaterThan(left.right);
	});

	it('toucher un élément puis une étiquette, ou l’inverse : relié ; une étiquette sert deux fois', async () => {
		const { probe, answers } = answersProbe(3);
		const screen = await render(AssocierPlacer, {
			target: mainElement(),
			props: { node: shown(ITEMS, LABELS), answers: answers() }
		});
		const root = screen.container;
		await userEvent.click(itemCases(root)[0]);
		await userEvent.click(labelCases(root)[1]);
		await userEvent.click(labelCases(root)[1]);
		await userEvent.click(itemCases(root)[2]);
		await expect.poll(() => probe.values).toEqual(['1', '', '1']);
		await expect.poll(() => traits(root)).toHaveLength(2);
	});

	it('le trait va d’un point à l’autre', async () => {
		const { answers } = answersProbe(3);
		const screen = await render(AssocierPlacer, {
			target: mainElement(),
			props: { node: shown(ITEMS, LABELS), answers: answers() }
		});
		const root = screen.container;
		await userEvent.click(itemCases(root)[1]);
		await userEvent.click(labelCases(root)[2]);
		await expect.poll(() => traits(root)).toHaveLength(1);
		const line = traits(root)[0].getBoundingClientRect();
		const from = root.querySelectorAll('[data-relier-point="item"]')[1].getBoundingClientRect();
		const to = root.querySelectorAll('[data-relier-point="label"]')[2].getBoundingClientRect();
		const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(3);
		near(
			Math.min(line.top, line.bottom),
			Math.min(from.top + from.height / 2, to.top + to.height / 2)
		);
		near(line.left, from.left + from.width / 2);
		near(line.right, to.left + to.width / 2);
	});

	it('un nouveau trait remplace l’ancien ; toucher un élément relié efface son trait', async () => {
		const { probe, answers } = answersProbe(3);
		const screen = await render(AssocierPlacer, {
			target: mainElement(),
			props: { node: shown(ITEMS, LABELS), answers: answers() }
		});
		const root = screen.container;
		await userEvent.click(itemCases(root)[0]);
		await userEvent.click(labelCases(root)[0]);
		await userEvent.click(labelCases(root)[2]);
		await userEvent.click(itemCases(root)[0]);
		await expect.poll(() => probe.values[0]).toBe('2');
		expect(traits(root)).toHaveLength(1);
		await userEvent.click(itemCases(root)[0]);
		await expect.poll(() => probe.values[0]).toBe('');
		await expect.poll(() => traits(root)).toHaveLength(0);
	});

	it('toucher un trait l’efface', async () => {
		const { probe, answers } = answersProbe(3);
		const screen = await render(AssocierPlacer, {
			target: mainElement(),
			props: { node: shown(ITEMS, LABELS), answers: answers() }
		});
		const root = screen.container;
		await userEvent.click(itemCases(root)[0]);
		await userEvent.click(labelCases(root)[0]);
		await expect.poll(() => root.querySelector('[data-relier-trait="0"]')).not.toBeNull();
		root
			.querySelector('[data-relier-trait="0"]')!
			.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		await expect.poll(() => probe.values[0]).toBe('');
	});

	it('glisser d’un point à l’autre, dans les deux sens', async () => {
		const { probe, answers } = answersProbe(3);
		const screen = await render(AssocierPlacer, {
			target: mainElement(),
			props: { node: shown(ITEMS, LABELS), answers: answers() }
		});
		const root = screen.container;
		drag(itemCases(root)[0], labelCases(root)[2]);
		await expect.poll(() => probe.values).toEqual(['2', '', '']);
		drag(labelCases(root)[1], itemCases(root)[1]);
		await expect.poll(() => probe.values).toEqual(['2', '1', '']);
		// Lâché dans la même colonne : rien
		drag(itemCases(root)[2], itemCases(root)[0]);
		await expect.poll(() => probe.values).toEqual(['2', '1', '']);
	});

	it('pendant le glissement, un trait suit le doigt', async () => {
		const screen = await render(AssocierPlacer, {
			target: mainElement(),
			props: { node: shown(ITEMS, LABELS), answers: answersProbe(3).answers() }
		});
		const root = screen.container;
		const from = itemCases(root)[0];
		from.dispatchEvent(new PointerEvent('pointerdown', centerOf(from)));
		window.dispatchEvent(new PointerEvent('pointermove', centerOf(labelCases(root)[1])));
		await expect.poll(() => traits(root, 'suivi')).toHaveLength(1);
		window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 }));
		await expect.poll(() => traits(root, 'suivi')).toHaveLength(0);
	});

	it('clavier : Entrée prend l’élément, flèche droite, Entrée relie', async () => {
		const { probe, answers } = answersProbe(3);
		const screen = await render(AssocierPlacer, {
			target: mainElement(),
			props: { node: shown(ITEMS, LABELS), answers: answers() }
		});
		itemCases(screen.container)[0].focus();
		await userEvent.keyboard('{ArrowDown}');
		await userEvent.keyboard('{Enter}');
		await userEvent.keyboard('{ArrowRight}');
		await userEvent.keyboard('{ArrowDown}');
		await userEvent.keyboard('{Enter}');
		await expect.poll(() => probe.values).toEqual(['', '2', '']);
	});

	it('noms accessibles : jamais la bonne étiquette', async () => {
		const screen = await render(AssocierPlacer, {
			target: mainElement(),
			props: { node: shown(ITEMS, LABELS), answers: answersProbe(3).answers() }
		});
		const root = screen.container;
		expect(itemCases(root)[0].getAttribute('aria-label')).toBe('Élément 1 sur 3, pas relié');
		expect(labelCases(root)[0].getAttribute('aria-label')).toBe('Étiquette 1 sur 3');
	});

	it('téléphone (360 px) : deux colonnes, rien ne déborde, le point centré sur sa case', async () => {
		await page.viewport(360, 700);
		const long = ['une situation assez longue pour passer à la ligne sur un téléphone', 'b', 'c'];
		const screen = await render(AssocierPlacer, {
			target: mainElement(),
			props: { node: shown(long, LABELS), answers: answersProbe(3).answers() }
		});
		const root = screen.container.querySelector<HTMLElement>('.associer')!;
		expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
		expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
		const cell = itemCases(root)[0].getBoundingClientRect();
		const dot = root.querySelector('[data-relier-point="item"]')!.getBoundingClientRect();
		expect(Math.abs(dot.top + dot.height / 2 - (cell.top + cell.height / 2))).toBeLessThan(2);
		expect(labelCases(root)[0].getBoundingClientRect().left).toBeGreaterThan(cell.right);
	});

	it('hors question (cours, aide) : relier par défaut, étiquettes mélangées une fois chacune', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: {
				content: ['```associer', '- a -> 1', '- b -> 2', '- c -> 1', '- -> 3', '```'].join('\n')
			}
		});
		const labels = labelCases(screen.container).map((b) => b.textContent?.trim());
		expect([...labels].sort()).toEqual(['1', '2', '3']);
		expect(labels).not.toEqual(['1', '2', '3']);
		expect(screen.container.querySelector('[data-associer-tray]')).toBeNull();
	});
});

describe('FillBlanksInput — associer, relier', () => {
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

	it('décor de la prod : relier remplit la case de l’élément', async () => {
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
		const position = labelCases(root).findIndex((b) => b.textContent?.trim() === '1');
		await userEvent.click(itemCases(root)[0]);
		await userEvent.click(labelCases(root)[position]);
		await expect.poll(() => values[0]).toBe(String(position));
		expect(values[0]).toBe(generated.blanks?.[0].expectedAnswer);
	});

	it('correction : trait faux rouge, bon trait en pointillés verts, traits justes verts', async () => {
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
		await expect.poll(() => traits(root, 'faux')).toHaveLength(1);
		expect(traits(root, 'juste')).toHaveLength(2);
		expect(traits(root, 'solution')).toHaveLength(1);
		expect(getComputedStyle(traits(root, 'solution')[0]).strokeDasharray).not.toBe('none');
		// Verrouillé : rien à toucher, aucun trait à effacer
		expect(itemCases(root).every((b) => b.disabled)).toBe(true);
		expect(root.querySelector('[data-relier-trait]')).toBeNull();
	});

	it('bonne réponse affichée : un trait de chaque élément vers sa bonne étiquette', async () => {
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
		await expect.poll(() => traits(root, 'eleve')).toHaveLength(3);
		expect(itemCases(root)[0].getAttribute('aria-label')).toMatch(/relié à l’étiquette/);
	});
});

describe('BuildAnswer — associer, relier', () => {
	it('copie corrigée : traits de l’élève figés, le bon trait en pointillés sous le faux', async () => {
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
		await expect.poll(() => traits(root, 'faux')).toHaveLength(1);
		expect(traits(root, 'juste')).toHaveLength(1);
		expect(traits(root, 'solution')).toHaveLength(1);
		expect(labelCases(root).every((b) => b.disabled)).toBe(true);
	});
});
