/**
 * Droite à graduer à l'écran (` ```line ` + `graduer:`, outil n° 61, phase 0 :
 * `docs/wip/outil-graduer-segment-progress.md`)
 *
 * L'élève choisit le nombre de parts (− / +) : l'écran coupe chaque intervalle de
 * `step` en parts égales ; il pose ensuite les points sur SES graduations.
 * Rendu dans <main> : décor réel de l'application.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import NumberLine from '#lib/components/markdown/nodes/NumberLine.svelte';
import FillBlanksInput from '#lib/components/question-inputs/FillBlanksInput.svelte';
import BuildAnswer from '#lib/components/questions/BuildAnswer.svelte';
import { parseNumberLineContent } from '#lib/ubumark/parser/number-line-parser.ts';
import { NL_LAYOUT } from '#lib/ubumark/utils/number-line-render.ts';
import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
import { templateMarkdown } from '#lib/ubumark/index.ts';
import type { QuestionTemplate } from '#lib/questions/types.ts';

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

const LINE = ['start: 0', 'end: 2', 'step: 1'];
const MORE = 'Une part de plus';
const LESS = 'Une part de moins';

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

/** La droite de l'élève (la première du bloc) */
const studentLine = (root: Element) => root.querySelector<SVGSVGElement>('.graduer-droite svg')!;
const ticks = (root: Element) => studentLine(root).querySelectorAll('.nl-tick').length;
const partsShown = (root: Element) => root.querySelector('.graduer-parts')?.textContent?.trim();
const zone = (root: Element) => root.querySelector<HTMLElement>('[role="slider"]')!;

/** Toucher la droite de l'élève à la valeur v (droite de 0 à 2) */
function tapAt(root: Element, v: number, start = 0, end = 2) {
	const rect = studentLine(root).getBoundingClientRect();
	const { MARGIN_LEFT, MARGIN_RIGHT } = NL_LAYOUT;
	const lineWidth = rect.width - MARGIN_LEFT - MARGIN_RIGHT;
	const clientX = rect.left + MARGIN_LEFT + ((v - start) / (end - start)) * lineWidth;
	const init = { bubbles: true, clientX, clientY: rect.top + rect.height / 2, pointerId: 1 };
	zone(root).dispatchEvent(new PointerEvent('pointerdown', init));
	zone(root).dispatchEvent(new PointerEvent('pointerup', init));
}

function probe(count: number) {
	const values = Array.from({ length: count }, () => '');
	const answers = values.map((_, k) => ({
		value: '',
		isCorrect: null,
		disabled: false,
		onChange: (value: string) => (values[k] = value)
	}));
	return { values, answers };
}

describe('Droite à graduer — le geste', () => {
	it('au départ : 1 part, seules les graduations de step ; + coupe chaque unité', async () => {
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: { node: node(...LINE, 'graduer: 3') }
		});
		const root = screen.container;
		expect(root.textContent).toContain('Parts dans une unité');
		expect(partsShown(root)).toBe('1');
		expect(ticks(root)).toBe(3);
		expect(button(root, LESS).disabled).toBe(true);
		await userEvent.click(button(root, MORE));
		await userEvent.click(button(root, MORE));
		await expect.poll(() => partsShown(root)).toBe('3');
		expect(ticks(root)).toBe(7);
		// les nombres écrits restent ceux de step
		expect(studentLine(root).textContent).not.toContain('frac');
	});

	it('de 1 à 12 parts, jamais au-delà', async () => {
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: { node: node(...LINE, 'graduer: 3') }
		});
		const root = screen.container;
		for (let i = 1; i < 12; i++) await userEvent.click(button(root, MORE));
		await expect.poll(() => partsShown(root)).toBe('12');
		expect(button(root, MORE).disabled).toBe(true);
	});

	it('la case des parts reçoit le nombre de parts', async () => {
		const { values, answers } = probe(1);
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: { node: node(...LINE, 'graduer: 3'), answers }
		});
		await userEvent.click(button(screen.container, MORE));
		await userEvent.click(button(screen.container, MORE));
		await expect.poll(() => values[0]).toBe('3');
		await userEvent.click(button(screen.container, LESS));
		await expect.poll(() => values[0]).toBe('2');
	});

	it('le point se colle aux graduations de l’élève', async () => {
		const { values, answers } = probe(2);
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: { node: node(...LINE, 'graduer: 3', 'placer: A=5/3'), answers }
		});
		const root = screen.container;
		// une seule part : A ne va que sur 0, 1 ou 2
		tapAt(root, 1.6);
		await expect.poll(() => values[1]).toBe('2');
		await userEvent.click(button(root, MORE));
		await userEvent.click(button(root, MORE));
		// changer le nombre de parts retire le point
		await expect.poll(() => values[1]).toBe('');
		expect(zone(root).querySelectorAll('circle.nl-point')).toHaveLength(0);
		tapAt(root, 5 / 3);
		await expect.poll(() => values[1]).toBe('\\frac{5}{3}');
		expect(zone(root).getAttribute('aria-valuetext')).toBe('point A sur 5/3');
	});

	it('sans placer: pas de point à poser, la droite se partage seule', async () => {
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: { node: node(...LINE, 'graduer: 4') }
		});
		expect(screen.container.querySelector('[role="slider"]')).toBeNull();
		expect(button(screen.container, MORE)).toBeTruthy();
	});
});

describe('Droite à graduer — la correction', () => {
	const answer = (value: string, isCorrect: boolean) => ({
		value,
		isCorrect,
		disabled: true,
		onChange: () => {}
	});

	it('parts et point faux : les deux phrases, la droite juste en vert', async () => {
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: {
				node: node(...LINE, 'graduer: 3', 'placer: A=5/3'),
				answers: [answer('4', false), answer('\\frac{5}{4}', false)]
			}
		});
		const root = screen.container;
		expect(root.textContent).toContain('Tu as partagé l’unité en 4 parts ; il en fallait 3.');
		expect(root.textContent).toContain('Tu as placé A sur 5/4.');
		expect(partsShown(root)).toBe('4');
		expect(ticks(root)).toBe(9);
		const correction = root.querySelector('.graduer-correction')!;
		expect(correction.querySelectorAll('.nl-tick')).toHaveLength(7);
		const greens = correction.querySelectorAll('circle.nl-point');
		expect(greens).toHaveLength(1);
		expect(root.querySelector('.graduer-faux')).not.toBeNull();
	});

	it('6 parts, A sur 10/6 : graduations fausses, A juste', async () => {
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: {
				node: node(...LINE, 'graduer: 3', 'placer: A=5/3'),
				answers: [answer('6', false), answer('\\frac{5}{3}', true)]
			}
		});
		const root = screen.container;
		expect(root.textContent).toContain('Tu as partagé l’unité en 6 parts ; il en fallait 3.');
		expect(root.textContent).not.toContain('Tu as placé A');
		expect(zone(root).getAttribute('aria-valuetext')).toBe('point A sur 10/6');
	});

	it('point oublié : « Tu n’as pas placé A. »', async () => {
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: {
				node: node(...LINE, 'graduer: 3', 'placer: A=5/3'),
				answers: [answer('3', true), answer('', false)]
			}
		});
		expect(screen.container.textContent).toContain('Tu n’as pas placé A.');
		expect(screen.container.textContent).not.toContain('Tu as partagé');
	});

	it('tout juste : cadre vert, pas de correction', async () => {
		const screen = await render(NumberLine, {
			target: mainElement(),
			props: {
				node: node(...LINE, 'graduer: 3', 'placer: A=5/3'),
				answers: [answer('3', true), answer('\\frac{5}{3}', true)]
			}
		});
		expect(screen.container.querySelector('.graduer-juste')).not.toBeNull();
		expect(screen.container.querySelector('.graduer-correction')).toBeNull();
	});

	it('copie corrigée (BuildAnswer) : la droite de l’élève, sans boutons', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'line',
				source: [...LINE, 'graduer: 3', 'placer: A=5/3'].join('\n'),
				answer: '4 \\frac{5}{4}',
				status: 'incorrect',
				answers: [
					{ answer: '4', status: 'incorrect' },
					{ answer: '\\frac{5}{4}', status: 'incorrect' }
				]
			}
		});
		const root = screen.container;
		expect(root.querySelector(`button[aria-label="${MORE}"]`)).toBeNull();
		expect(root.textContent).toContain('Parts dans une unité : 4');
		expect(root.textContent).toContain('Tu as placé A sur 5/4.');
	});

	it('bonne réponse seule (BuildAnswer) : d parts, points en vert', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'line',
				source: [...LINE, 'graduer: 3', 'placer: A=5/3'].join('\n'),
				answer: null,
				status: 'solution'
			}
		});
		const root = screen.container;
		expect(root.querySelectorAll('.nl-tick')).toHaveLength(7);
		expect(root.querySelectorAll('circle.nl-point')).toHaveLength(1);
	});
});

describe('FillBlanksInput — droite à graduer', () => {
	it('décor de la prod : la question générée remplit ses cases', async () => {
		const generated = generateInstance(
			{
				id: 'test-graduer',
				title: 'Graduer',
				status: 'draft',
				variations: [
					{
						statement: templateMarkdown(
							['Place A.', '', '```line', ...LINE, 'graduer: 3', 'placer: A=5/3', '```'].join('\n')
						)
					}
				],
				grades: ['6'],
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
		await userEvent.click(button(root, MORE));
		await userEvent.click(button(root, MORE));
		await expect.poll(() => values[0]).toBe('3');
		tapAt(root, 5 / 3);
		await expect.poll(() => values[1]).toBe('\\frac{5}{3}');
	});
});
