/**
 * Bloc ```collection à construire à l'écran (phase 0 : `docs/wip/construire-progress.md` § 3, 4 bis, 5)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import Collection from '../Collection.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
import FillBlanksBoundHarness from './FillBlanksBoundHarness.svelte';
import { parseCollectionContent } from '$lib/ubumark/parser/collection-parser';
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

const node = (...lines: string[]) => parseCollectionContent(lines.join('\n'));

const button = (root: Element, name: string) => {
	const found = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
		(b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === name
	);
	if (!found) throw new Error(`bouton « ${name} » introuvable`);
	return found;
};

const plan = (root: Element) => root.querySelector<SVGSVGElement>('svg.construire-plan')!;
const placed = (root: Element, kind: string) =>
	plan(root).querySelectorAll(`.collection-objet.collection-${kind}`).length;

/** Cliquer au centre d'un objet du plan, comme un doigt */
function tap(svg: SVGSVGElement, el: Element) {
	const box = el.getBoundingClientRect();
	svg.dispatchEvent(
		new MouseEvent('click', {
			bubbles: true,
			clientX: box.left + box.width / 2,
			clientY: box.top + box.height / 2
		})
	);
}

/** Réponse de la case, relevée à chaque changement */
function answerProbe(initial = '') {
	const probe = {
		value: initial,
		changes: [] as string[]
	};
	return {
		probe,
		answer: () => ({
			value: probe.value,
			isCorrect: null,
			disabled: false,
			onChange: (value: string) => {
				probe.value = value;
				probe.changes.push(value);
			}
		})
	};
}

describe('Collection à construire — le geste (Q1, Q2)', () => {
	it('plan vide, réserve : toucher la réserve pose un objet, rangé d’office', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(Collection, {
			target: mainElement(),
			props: { node: node('construire: 34'), answer: answer() }
		});
		const root = screen.container;
		expect(placed(root, 'barre') + placed(root, 'cube')).toBe(0);
		await userEvent.click(button(root, 'Ajouter une barre de dix'));
		await userEvent.click(button(root, 'Ajouter une barre de dix'));
		await userEvent.click(button(root, 'Ajouter un cube'));
		expect(placed(root, 'barre')).toBe(2);
		expect(placed(root, 'cube')).toBe(1);
		expect(probe.changes).toEqual(['10', '20', '21']);
	});

	it('toucher un objet posé l’enlève ; « Enlever » au clavier aussi', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(Collection, {
			target: mainElement(),
			props: { node: node('construire: 34'), answer: answer() }
		});
		const root = screen.container;
		await userEvent.click(button(root, 'Ajouter une barre de dix'));
		await userEvent.click(button(root, 'Ajouter un cube'));
		await userEvent.click(button(root, 'Ajouter un cube'));
		tap(plan(root), plan(root).querySelector('.collection-barre')!);
		await expect.poll(() => placed(root, 'barre')).toBe(0);
		expect(probe.value).toBe('2');
		await userEvent.click(button(root, 'Enlever un cube'));
		expect(placed(root, 'cube')).toBe(1);
		expect(probe.value).toBe('1');
	});

	it('« Tout enlever » : plan vide, réponse vide (Q6)', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(Collection, {
			target: mainElement(),
			props: { node: node('construire: 34'), answer: answer() }
		});
		const root = screen.container;
		await userEvent.click(button(root, 'Ajouter un cube'));
		await userEvent.click(button(root, 'Tout enlever'));
		expect(placed(root, 'cube')).toBe(0);
		expect(probe.value).toBe('');
	});

	it('paquets : la réserve donne des paquets et des jetons', async () => {
		const screen = await render(Collection, {
			target: mainElement(),
			props: { node: node('construire: 12', 'dessin: paquets') }
		});
		const root = screen.container;
		await userEvent.click(button(root, 'Ajouter un paquet de dix'));
		await userEvent.click(button(root, 'Ajouter un jeton'));
		expect(placed(root, 'paquet')).toBe(1);
		expect(placed(root, 'jeton')).toBe(1);
	});

	it('jamais le total affiché pendant la construction (Q3)', async () => {
		const screen = await render(Collection, {
			target: mainElement(),
			props: { node: node('construire: 34') }
		});
		const root = screen.container;
		for (let i = 0; i < 3; i++) await userEvent.click(button(root, 'Ajouter une barre de dix'));
		for (let i = 0; i < 4; i++) await userEvent.click(button(root, 'Ajouter un cube'));
		expect(root.textContent ?? '').not.toMatch(/34/);
		expect(plan(root).getAttribute('aria-label') ?? '').not.toMatch(/\d/);
	});

	it('plafond : au-delà de 10 barres, le bouton se grise', async () => {
		const screen = await render(Collection, {
			target: mainElement(),
			props: { node: node('construire: 34') }
		});
		const add = button(screen.container, 'Ajouter une barre de dix');
		for (let i = 0; i < 10; i++) await userEvent.click(add);
		expect(add.disabled).toBe(true);
	});

	it('verrouillé (après validation) : ni ajout ni retrait', async () => {
		const screen = await render(Collection, {
			target: mainElement(),
			props: {
				node: node('construire: 34'),
				answer: { value: '34', isCorrect: true, disabled: true, onChange: () => {} }
			}
		});
		expect(button(screen.container, 'Ajouter un cube').disabled).toBe(true);
		expect(button(screen.container, 'Tout enlever').disabled).toBe(true);
	});
});

describe('Collection à construire — correction (Q8)', () => {
	it('fausse : la construction de l’élève, sa valeur, une construction juste à côté', async () => {
		const screen = await render(Collection, {
			target: mainElement(),
			props: {
				node: node('construire: 34'),
				answer: { value: '32', isCorrect: false, disabled: true, onChange: () => {} }
			}
		});
		const root = screen.container;
		expect(root.textContent).toContain('Ta collection vaut 32.');
		const solution = root.querySelector('.construire-correction svg')!;
		expect(solution.querySelectorAll('.collection-barre')).toHaveLength(3);
		expect(solution.querySelectorAll('.collection-cube')).toHaveLength(4);
		expect(root.querySelector('[role="status"]')?.textContent).toMatch(/réponse fausse/);
	});

	it('vide et fausse : « Ta collection est vide. »', async () => {
		const screen = await render(Collection, {
			target: mainElement(),
			props: {
				node: node('construire: 34'),
				answer: { value: '', isCorrect: false, disabled: true, onChange: () => {} }
			}
		});
		expect(screen.container.textContent).toContain('Ta collection est vide.');
	});

	it('juste : pas de correction', async () => {
		const screen = await render(Collection, {
			target: mainElement(),
			props: {
				node: node('construire: 34'),
				answer: { value: '34', isCorrect: true, disabled: true, onChange: () => {} }
			}
		});
		expect(screen.container.querySelector('.construire-correction')).toBeNull();
		expect(screen.container.textContent).not.toContain('Ta collection vaut');
	});
});

describe('Collection à construire — hors question', () => {
	it('aperçu du prof (MarkdownRenderer) : le même geste, rien de jugé', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: { content: '```collection\nconstruire: 34\n```' as ResolvedMarkdown }
		});
		const root = screen.container;
		await userEvent.click(button(root, 'Ajouter un cube'));
		expect(placed(root, 'cube')).toBe(1);
	});
});

describe('FillBlanksInput — bloc ```collection à construire', () => {
	const STATEMENT = ['Construis 34.', '', '```collection', 'case: 0', 'construire: 34', '```'].join(
		'\n'
	) as ResolvedMarkdown;
	const blanks: InstanceBlank[] = [
		{ type: 'math', expectedAnswer: '34', expectedAnswerLatex: '34', construire: 'collection' }
	];

	it('la construction remplit values[N]', async () => {
		const values: string[] = [];
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: STATEMENT, blanks, values, validationResults: [] }
		});
		const root = screen.container;
		for (let i = 0; i < 3; i++) await userEvent.click(button(root, 'Ajouter une barre de dix'));
		for (let i = 0; i < 4; i++) await userEvent.click(button(root, 'Ajouter un cube'));
		expect(values[0]).toBe('34');
	});

	it('décor de la prod : la question générée, construite, remplit sa case', async () => {
		const generated = generateInstance(
			{
				id: 'test-construire',
				title: 'Construire',
				status: 'draft',
				variations: [
					{
						statement: templateMarkdown(
							'Construis 34.\n\n```collection\ndessin: barres\n\nconstruire: 34\n```'
						)
					}
				],
				grades: ['CP'],
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
		const root = screen.container;
		for (let i = 0; i < 2; i++) await userEvent.click(button(root, 'Ajouter une barre de dix'));
		for (let i = 0; i < 14; i++) await userEvent.click(button(root, 'Ajouter un cube'));
		expect(values[0]).toBe('34');
	});

	it('parent lié (bind:values) : 2 barres + 14 cubes restent tels quels, la case vaut 34', async () => {
		let last: string[] = [];
		const screen = await render(FillBlanksBoundHarness, {
			target: mainElement(),
			props: { statement: STATEMENT, blanks, onValues: (v: string[]) => (last = v) }
		});
		const root = screen.container;
		for (let i = 0; i < 2; i++) await userEvent.click(button(root, 'Ajouter une barre de dix'));
		for (let i = 0; i < 14; i++) await userEvent.click(button(root, 'Ajouter un cube'));
		await expect.poll(() => last[0]).toBe('34');
		expect(placed(root, 'barre')).toBe(2);
		expect(placed(root, 'cube')).toBe(14);
	});

	it('correction : la construction de l’élève et une construction juste', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement: STATEMENT,
				blanks,
				values: ['32'],
				disabled: true,
				validationResults: [false]
			}
		});
		expect(screen.container.textContent).toContain('Ta collection vaut 32.');
		expect(screen.container.querySelector('.construire-correction')).not.toBeNull();
	});

	it('bonne réponse affichée : une construction juste, sans réserve', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: STATEMENT, blanks, showCorrectAnswers: true, validationResults: [] }
		});
		const root = screen.container;
		expect(root.querySelectorAll('.collection-barre')).toHaveLength(3);
		expect(root.querySelectorAll('.collection-cube')).toHaveLength(4);
		expect(root.querySelector('button[aria-label="Ajouter un cube"]')).toBeNull();
	});

	it('Entrée, plan vide : le focus va sur la réserve, pas de validation', async () => {
		let submitted = 0;
		const statement = [
			'Mot : {{blank:0}}',
			'',
			'```collection',
			'case: 1',
			'construire: 34',
			'```'
		].join('\n') as ResolvedMarkdown;
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement,
				blanks: [{ type: 'text', expectedAnswer: 'trente' }, ...blanks],
				validationResults: [],
				onSubmit: () => submitted++
			}
		});
		const text = screen.container.querySelector<HTMLInputElement>('input[type="text"]')!;
		await userEvent.click(text);
		await userEvent.keyboard('trente{Enter}');
		expect(submitted).toBe(0);
		expect(document.activeElement).toBe(button(screen.container, 'Ajouter une barre de dix'));
	});
});
