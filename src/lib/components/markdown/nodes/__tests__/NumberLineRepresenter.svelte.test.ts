/**
 * Droite graduée à représenter à l'écran (phase 0 : `docs/wip/demi-droite-progress.md`
 * § « Geste de l'élève », points 10 à 17)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import NumberLine from '../NumberLine.svelte';
import BuildAnswer from '$lib/components/questions/BuildAnswer.svelte';
import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
import FillBlanksBoundHarness from './FillBlanksBoundHarness.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { templateMarkdown } from '$lib/ubumark';
import type { QuestionTemplate } from '$lib/questions/types';
import { parseNumberLineContent } from '$lib/ubumark/parser/number-line-parser';
import { NL_LAYOUT } from '$lib/ubumark/utils/number-line-render';

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

const LINE = ['start: -5', 'end: 5', 'step: 1', 'labels: -5, 0, 5'];

function node(...lines: string[]) {
	const { node, errors } = parseNumberLineContent(lines);
	if (!node) throw new Error(errors.map((e) => e.message).join(' ; '));
	return node;
}

const zone = (root: Element) => root.querySelector<HTMLElement>('[role="slider"]')!;

/** Bouton par son texte visible */
const button = (root: Element, text: string) => {
	const found = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
		(b) => (b.textContent ?? '').replace(/\s+/g, ' ').trim() === text
	);
	if (!found) throw new Error(`bouton « ${text} » introuvable`);
	return found;
};
const hasButton = (root: Element, text: string) => {
	try {
		button(root, text);
		return true;
	} catch {
		return false;
	}
};

const LEFT = '← vers la gauche';
const RIGHT = 'vers la droite →';

/** Toucher la droite à la graduation de valeur v, comme un doigt */
function tapAt(root: Element, v: number, start = -5, end = 5) {
	const svg = zone(root).querySelector('svg')!;
	const rect = svg.getBoundingClientRect();
	const { MARGIN_LEFT, MARGIN_RIGHT } = NL_LAYOUT;
	const lineWidth = rect.width - MARGIN_LEFT - MARGIN_RIGHT;
	const clientX = rect.left + MARGIN_LEFT + ((v - start) / (end - start)) * lineWidth;
	const init = { bubbles: true, clientX, clientY: rect.top + rect.height / 2, pointerId: 1 };
	zone(root).dispatchEvent(new PointerEvent('pointerdown', init));
	zone(root).dispatchEvent(new PointerEvent('pointerup', init));
}

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

const locked = (value: string, isCorrect: boolean) => ({
	value,
	isCorrect,
	disabled: true,
	onChange: () => {}
});

describe('Demi-droite — le geste en trois temps (point 10)', () => {
	it('borne, côté, comprise / exclue ; la droite redessine chaque étape', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: { node: node(...LINE, 'representer: [2, +inf['), answers: [answer()] }
		});
		const root = screen.container;
		expect(root.querySelectorAll('.nl-segment').length).toBe(0);

		tapAt(root, 2.2);
		await expect.poll(() => probe.value).toBe('2 comprise, côté ?');
		// Limite 13 : le côté manque
		expect(root.textContent).toContain('Choisis de quel côté sont les solutions.');

		await userEvent.click(button(root, RIGHT));
		expect(probe.value).toBe('[2 ; +∞[');
		expect(button(root, RIGHT).getAttribute('aria-pressed')).toBe('true');
		await expect.poll(() => root.querySelectorAll('.nl-segment').length).toBe(1);
		expect(root.textContent).not.toContain('Choisis de quel côté');

		await userEvent.click(button(root, '2 comprise'));
		expect(probe.value).toBe(']2 ; +∞[');
		expect(hasButton(root, '2 exclue')).toBe(true);

		await userEvent.click(button(root, LEFT));
		expect(probe.value).toBe(']-∞ ; 2[');
	});

	it('toucher ailleurs déplace la borne, côté et crochet gardés', async () => {
		const { probe, answer } = answerProbe(']-∞ ; 2[');
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: { node: node(...LINE, 'representer: [2, +inf['), answers: [answer()] }
		});
		tapAt(screen.container, -3);
		await expect.poll(() => probe.value).toBe(']-∞ ; -3[');
	});

	it('clavier : les flèches déplacent la borne', async () => {
		const { probe, answer } = answerProbe('[2 ; +∞[');
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: { node: node(...LINE, 'representer: [2, +inf['), answers: [answer()] }
		});
		zone(screen.container).focus();
		await userEvent.keyboard('{ArrowRight}');
		expect(probe.value).toBe('[3 ; +∞[');
	});

	it('jamais la réponse attendue avant la correction', async () => {
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: { node: node('start: 0', 'end: 9', 'step: 1', 'labels: 0', 'representer: [7, +inf[') }
		});
		const root = screen.container;
		expect(root.textContent ?? '').not.toMatch(/7/);
		for (const el of root.querySelectorAll('*')) {
			for (const attr of el.attributes) {
				if (!/^(aria-|data-|title$|alt$)/.test(attr.name)) continue;
				expect(`${attr.name}=${attr.value}`).not.toMatch(/\b7\b/);
			}
		}
	});

	it('énoncé masqué (`representer: ?`) : le même geste', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: { node: node(...LINE, 'representer: ?'), answers: [answer()] }
		});
		tapAt(screen.container, 1);
		await userEvent.click(button(screen.container, LEFT));
		expect(probe.value).toBe(']-∞ ; 1]');
	});

	it('verrouillé : le toucher ne bouge rien, boutons grisés', async () => {
		const changes: string[] = [];
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: {
				node: node(...LINE, 'representer: [2, +inf['),
				answers: [
					{ value: '[2 ; +∞[', isCorrect: true, disabled: true, onChange: (v) => changes.push(v) }
				]
			}
		});
		tapAt(screen.container, -1);
		expect(changes).toEqual([]);
		expect(button(screen.container, LEFT).disabled).toBe(true);
	});
});

describe('Intervalle borné — deux bornes, pas de côté (point 11)', () => {
	it('deux touchers posent les deux bornes ; chaque borne bascule seule', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: { node: node(...LINE, 'representer: [-1, 3['), answers: [answer()] }
		});
		const root = screen.container;
		expect(hasButton(root, LEFT)).toBe(false);
		tapAt(root, 3);
		await expect.poll(() => probe.value).toBe('3 comprise, autre borne ?');
		tapAt(root, -1);
		await expect.poll(() => probe.value).toBe('[-1 ; 3]');
		await userEvent.click(button(root, '3 comprise'));
		expect(probe.value).toBe('[-1 ; 3[');
		await expect.poll(() => root.querySelectorAll('.nl-segment').length).toBe(1);
	});

	it('bornes posées : toucher déplace la plus proche', async () => {
		const { probe, answer } = answerProbe('[-1 ; 3[');
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: { node: node(...LINE, 'representer: [-1, 3['), answers: [answer()] }
		});
		tapAt(screen.container, 4);
		await expect.poll(() => probe.value).toBe('[-1 ; 4[');
	});
});

describe('Droite à représenter — correction (points 15 à 17)', () => {
	it('crochet faux : la phrase, puis la droite juste', async () => {
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: { node: node(...LINE, 'representer: [2, +inf['), answers: [locked(']2 ; +∞[', false)] }
		});
		const root = screen.container;
		expect(root.textContent).toContain(
			'Le nombre 2 est-il solution ? Le crochet dit le contraire.'
		);
		expect(root.querySelector('.representer-correction')).not.toBeNull();
	});

	it('mauvais côté', async () => {
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: { node: node(...LINE, 'representer: [2, +inf['), answers: [locked(']-∞ ; 2]', false)] }
		});
		expect(screen.container.textContent).toContain('Les solutions sont de l’autre côté de 2.');
	});

	it('juste : pas de correction', async () => {
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: { node: node(...LINE, 'representer: [2, +inf['), answers: [locked('[2 ; +∞[', true)] }
		});
		expect(screen.container.querySelector('.representer-correction')).toBeNull();
	});

	it('copie corrigée (BuildAnswer) : la droite de l’élève, verrouillée, sans boutons', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'line',
				source: [...LINE, 'representer: [2, +inf['].join('\n'),
				answer: ']2 ; +∞[',
				status: 'incorrect'
			}
		});
		const root = screen.container;
		expect(root.querySelectorAll('button').length).toBe(0);
		expect(root.textContent).toContain('Le crochet dit le contraire');
	});

	it('bonne réponse seule (BuildAnswer) : la demi-droite juste dessinée', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'line',
				source: [...LINE, 'representer: [2, +inf['].join('\n'),
				answer: null,
				status: 'solution'
			}
		});
		expect(screen.container.querySelectorAll('.nl-segment').length).toBe(1);
	});
});

describe('FillBlanksInput — droite à représenter', () => {
	function generated() {
		const result = generateInstance(
			{
				id: 'test-representer',
				title: 'Représenter',
				status: 'draft',
				variations: [
					{
						statement: templateMarkdown(
							['Représente $x > 1$.', '', '```line', ...LINE, 'representer: ]1, +inf[', '```'].join(
								'\n'
							)
						)
					}
				],
				grades: ['3e'],
				theme: 'Test',
				domain: 'Test',
				level: 1
			} as QuestionTemplate,
			42
		);
		if (!result.success) throw new Error(result.errors.join(' ; '));
		return result.instance;
	}

	it('décor de la prod : la question générée remplit sa case', async () => {
		const instance = generated();
		const values: string[] = [];
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement: instance.statement,
				blanks: instance.blanks ?? [],
				values,
				validationResults: []
			}
		});
		const root = screen.container;
		tapAt(root, 1);
		await userEvent.click(button(root, RIGHT));
		await userEvent.click(button(root, '1 comprise'));
		expect(values[0]).toBe(']1 ; +∞[');
	});

	it('parent lié (bind:values) : la borne reste où l’élève l’a mise', async () => {
		const instance = generated();
		let last: string[] = [];
		const screen = await render(FillBlanksBoundHarness, {
			target: mainElement(),
			props: {
				statement: instance.statement,
				blanks: instance.blanks ?? [],
				onValues: (v: string[]) => (last = v)
			}
		});
		const root = screen.container;
		tapAt(root, 1);
		await userEvent.click(button(root, RIGHT));
		await expect.poll(() => last[0]).toBe('[1 ; +∞[');
		await userEvent.click(button(root, '1 comprise'));
		await expect.poll(() => last[0]).toBe(']1 ; +∞[');
		expect(hasButton(root, '1 exclue')).toBe(true);
	});
});
