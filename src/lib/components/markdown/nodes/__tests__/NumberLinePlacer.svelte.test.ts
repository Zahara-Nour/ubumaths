/**
 * Droite graduée à placer à l'écran (phase 0 : `docs/wip/reponses-a-placer-progress.md` § 4, 6)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import NumberLine from '../NumberLine.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
import BuildAnswer from '$lib/components/questions/BuildAnswer.svelte';
import FillBlanksBoundHarness from './FillBlanksBoundHarness.svelte';
import { parseNumberLineContent } from '$lib/ubumark/parser/number-line-parser';
import { NL_LAYOUT } from '$lib/ubumark/utils/number-line-render';
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

const LINE_0_20 = ['start: 0', 'end: 20', 'step: 1', 'labels: 0, 10, 20'];

function node(...lines: string[]) {
	const { node, errors } = parseNumberLineContent(lines);
	if (!node) throw new Error(errors.map((e) => e.message).join(' ; '));
	return node;
}

const button = (root: Element, name: string) => {
	const found = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
		(b) => b.getAttribute('aria-label') === name
	);
	if (!found) throw new Error(`bouton « ${name} » introuvable`);
	return found;
};

const zone = (root: Element) => root.querySelector<HTMLElement>('[role="slider"]')!;
const FORWARD = 'Avancer le point d’une graduation';
const BACKWARD = 'Reculer le point d’une graduation';

/** Toucher la droite à la graduation de valeur v (droite de start à end), comme un doigt */
function tapAt(root: Element, v: number, start = 0, end = 20) {
	const svg = zone(root).querySelector('svg')!;
	const rect = svg.getBoundingClientRect();
	// la droite est dessinée à sa largeur réelle : marges fixes, la ligne entre les deux
	const { MARGIN_LEFT, MARGIN_RIGHT } = NL_LAYOUT;
	const lineWidth = rect.width - MARGIN_LEFT - MARGIN_RIGHT;
	const clientX = rect.left + MARGIN_LEFT + ((v - start) / (end - start)) * lineWidth;
	const clientY = rect.top + rect.height / 2;
	const init = { bubbles: true, clientX, clientY, pointerId: 1 };
	zone(root).dispatchEvent(new PointerEvent('pointerdown', init));
	zone(root).dispatchEvent(new PointerEvent('pointerup', init));
}

/** Points dessinés sur la droite de l'élève */
const points = (root: Element) => zone(root).querySelectorAll('circle.nl-point').length;

function answerProbe(initial = '') {
	const probe = { value: initial, changes: [] as string[] };
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

describe('Droite à placer — le geste', () => {
	it('sans point au départ ; toucher pose le point sur la graduation la plus proche', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: { node: node(...LINE_0_20, 'placer: 7'), answer: answer() }
		});
		const root = screen.container;
		expect(points(root)).toBe(0);
		tapAt(root, 12.3);
		await expect.poll(() => probe.value).toBe('12');
		await expect.poll(() => zone(root).getAttribute('aria-valuetext')).toBe('point sur 12');
	});

	it('boutons ◀ ▶ : un cran ; sans point, ▶ pose sur la première graduation', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: { node: node(...LINE_0_20, 'placer: 7'), answer: answer() }
		});
		const root = screen.container;
		await userEvent.click(button(root, FORWARD));
		await userEvent.click(button(root, FORWARD));
		await userEvent.click(button(root, FORWARD));
		await userEvent.click(button(root, BACKWARD));
		expect(probe.changes).toEqual(['0', '1', '2', '1']);
	});

	it('clavier : flèches, Début, Fin', async () => {
		const { probe, answer } = answerProbe('5');
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: { node: node(...LINE_0_20, 'placer: 7'), answer: answer() }
		});
		zone(screen.container).focus();
		await userEvent.keyboard('{ArrowRight}');
		expect(probe.value).toBe('6');
		await userEvent.keyboard('{End}');
		expect(probe.value).toBe('20');
		await userEvent.keyboard('{Home}');
		expect(probe.value).toBe('0');
	});

	it('jamais la valeur attendue avant la correction', async () => {
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: { node: node('start: 0', 'end: 9', 'step: 1', 'labels: 0', 'placer: 7') }
		});
		const root = screen.container;
		await userEvent.click(button(root, FORWARD));
		expect(root.textContent ?? '').not.toMatch(/7/);
		for (const el of root.querySelectorAll('*')) {
			// Attributs qui se lisent (les coordonnées du dessin, elles, valent n'importe quoi)
			for (const attr of el.attributes) {
				if (!/^(aria-|data-|title$|alt$)/.test(attr.name)) continue;
				expect(`${attr.name}=${attr.value}`).not.toMatch(/\b7\b/);
			}
		}
	});

	it('verrouillé : boutons grisés, le toucher ne bouge rien', async () => {
		const changes: string[] = [];
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: {
				node: node(...LINE_0_20, 'placer: 7'),
				answer: { value: '7', isCorrect: true, disabled: true, onChange: (v) => changes.push(v) }
			}
		});
		const root = screen.container;
		expect(button(root, FORWARD).disabled).toBe(true);
		tapAt(root, 3);
		expect(changes).toEqual([]);
	});

	it('pas fractionnaire : la réponse est la fraction', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: { node: node('start: 0', 'end: 2', 'step: 1/3', 'placer: 4/3'), answer: answer() }
		});
		tapAt(screen.container, 4 / 3, 0, 2);
		await expect.poll(() => probe.value).toBe('\\frac{4}{3}');
	});
});

describe('Droite à placer — correction', () => {
	it('fausse : « Tu as placé le point sur 9. » et la droite juste à côté', async () => {
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: {
				node: node(...LINE_0_20, 'placer: 7'),
				answer: { value: '9', isCorrect: false, disabled: true, onChange: () => {} }
			}
		});
		const root = screen.container;
		expect(root.textContent).toContain('Tu as placé le point sur 9.');
		expect(root.querySelectorAll('.placer-correction circle.nl-point')).toHaveLength(1);
		expect(root.querySelector('[role="status"]')?.textContent).toMatch(/réponse fausse/);
	});

	it('vide et fausse : « Tu n’as rien placé. »', async () => {
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: {
				node: node(...LINE_0_20, 'placer: 7'),
				answer: { value: '', isCorrect: false, disabled: true, onChange: () => {} }
			}
		});
		expect(screen.container.textContent).toContain('Tu n’as rien placé.');
	});

	it('juste : pas de correction', async () => {
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: {
				node: node(...LINE_0_20, 'placer: 7'),
				answer: { value: '7', isCorrect: true, disabled: true, onChange: () => {} }
			}
		});
		expect(screen.container.querySelector('.placer-correction')).toBeNull();
	});

	it('copie corrigée (BuildAnswer) : droite verrouillée, sans boutons', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'line',
				source: [...LINE_0_20, 'placer: 7'].join('\n'),
				answer: '9',
				status: 'incorrect'
			}
		});
		const root = screen.container;
		expect(root.querySelector(`button[aria-label="${FORWARD}"]`)).toBeNull();
		expect(root.textContent).toContain('Tu as placé le point sur 9.');
	});
});

describe('Droite à placer — hors question', () => {
	it('aperçu du prof (MarkdownRenderer) : le même geste, rien de jugé', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: {
				content: ['```line', ...LINE_0_20, 'placer: 7', '```'].join('\n') as ResolvedMarkdown
			}
		});
		const root = screen.container;
		await userEvent.click(button(root, FORWARD));
		await expect.poll(() => points(root)).toBe(1);
	});

	it('une droite sans placer: reste une image (pas de curseur)', async () => {
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: { node: node(...LINE_0_20) }
		});
		expect(screen.container.querySelector('[role="slider"]')).toBeNull();
		expect(screen.container.querySelector('[role="img"]')).not.toBeNull();
	});
});

describe('FillBlanksInput — droite à placer', () => {
	const STATEMENT = ['Place 7.', '', '```line', 'case: 0', ...LINE_0_20, 'placer: 7', '```'].join(
		'\n'
	) as ResolvedMarkdown;
	const blanks: InstanceBlank[] = [
		{ type: 'math', expectedAnswer: '7', expectedAnswerLatex: '7', construire: 'line' }
	];

	it('décor de la prod : la question générée remplit sa case', async () => {
		const generated = generateInstance(
			{
				id: 'test-placer',
				title: 'Placer',
				status: 'draft',
				variations: [
					{
						statement: templateMarkdown(
							['Place le nombre 3.', '', '```line', ...LINE_0_20, 'placer: 3', '```'].join('\n')
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
		for (let i = 0; i < 4; i++) await userEvent.click(button(screen.container, FORWARD));
		expect(values[0]).toBe('3');
	});

	// Revue de la PR 1 : le décor de la prod renvoie la valeur au bloc (`bind:values`)
	it('parent lié (bind:values) : le point reste où l’élève l’a mis', async () => {
		let last: string[] = [];
		const screen = await render(FillBlanksBoundHarness, {
			target: mainElement(),
			props: { statement: STATEMENT, blanks, onValues: (v: string[]) => (last = v) }
		});
		const root = screen.container;
		await userEvent.click(button(root, FORWARD));
		await userEvent.click(button(root, FORWARD));
		await expect.poll(() => last[0]).toBe('1');
		expect(points(root)).toBe(1);
		expect(zone(root).getAttribute('aria-valuetext')).toBe('point sur 1');
		await userEvent.click(button(root, BACKWARD));
		await expect.poll(() => last[0]).toBe('0');
		expect(zone(root).getAttribute('aria-valuetext')).toBe('point sur 0');
	});

	it('correction : le point de l’élève et la droite juste', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement: STATEMENT,
				blanks,
				values: ['9'],
				disabled: true,
				validationResults: [false]
			}
		});
		expect(screen.container.textContent).toContain('Tu as placé le point sur 9.');
		expect(screen.container.querySelector('.placer-correction')).not.toBeNull();
	});

	it('bonne réponse affichée : la droite avec le point juste, sans boutons', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: STATEMENT, blanks, showCorrectAnswers: true, validationResults: [] }
		});
		const root = screen.container;
		expect(root.querySelectorAll('circle.nl-point')).toHaveLength(1);
		expect(root.querySelector(`button[aria-label="${FORWARD}"]`)).toBeNull();
	});

	it('Entrée, droite vide : le focus va sur la droite, pas de validation', async () => {
		let submitted = 0;
		const statement = [
			'Mot : {{blank:0}}',
			'',
			'```line',
			'case: 1',
			...LINE_0_20,
			'placer: 7',
			'```'
		].join('\n') as ResolvedMarkdown;
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement,
				blanks: [{ type: 'text', expectedAnswer: 'sept' }, { ...blanks[0] }],
				validationResults: [],
				onSubmit: () => submitted++
			}
		});
		const text = screen.container.querySelector<HTMLInputElement>('input[type="text"]')!;
		await userEvent.click(text);
		await userEvent.keyboard('sept{Enter}');
		expect(submitted).toBe(0);
		expect(document.activeElement).toBe(zone(screen.container));
	});
});
