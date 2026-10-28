/**
 * Étiquettes à ranger à l'écran (chantier `docs/wip/reponses-a-placer-progress.md` § 21, 22)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import RangerPlacer from '../RangerPlacer.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
import BuildAnswer from '$lib/components/questions/BuildAnswer.svelte';
import { parseRangerContent } from '$lib/ubumark/parser/ranger-parser';
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

/** Bloc d'une instance : déjà mélangé, `case:` posée */
const shown = (...lines: string[]) => parseRangerContent(['case: 0', ...lines].join('\n'));

const tray = (root: Element) => [
	...root.querySelectorAll<HTMLButtonElement>('[data-ranger-tray] button')
];
const places = (root: Element) => [
	...root.querySelectorAll<HTMLButtonElement>('button[data-ranger-place]')
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

describe('Étiquettes à ranger — le geste', () => {
	it('au départ : les étiquettes en haut, les places vides séparées du signe', async () => {
		const screen = await render(RangerPlacer, {
			target: mainElement(),
			props: { node: shown('- 7', '- 2', '- 5'), answers: answersProbe(3).answers() }
		});
		const root = screen.container;
		expect(tray(root).map((b) => b.textContent?.trim())).toEqual(['7', '2', '5']);
		expect(placeText(root)).toEqual(['', '', '']);
		expect(root.querySelectorAll('.ranger-signe')).toHaveLength(2);
		expect(root.querySelector('.ranger-signe')?.textContent).toBe('<');
	});

	it('toucher une étiquette puis une place : posée, réponse = sa position affichée', async () => {
		const { probe, answers } = answersProbe(3);
		const screen = await render(RangerPlacer, {
			target: mainElement(),
			props: { node: shown('- 7', '- 2', '- 5'), answers: answers() }
		});
		const root = screen.container;
		await userEvent.click(tray(root)[1]);
		expect(tray(root)[1].getAttribute('aria-pressed')).toBe('true');
		await userEvent.click(places(root)[0]);
		expect(placeText(root)).toEqual(['2', '', '']);
		expect(probe.values).toEqual(['1', '', '']);
		// Posée : elle n'est plus prenable en haut
		expect(tray(root)[1].disabled).toBe(true);
	});

	it('place prise : venue d’en haut, l’autre remonte ; venue d’une place, échange', async () => {
		const { probe, answers } = answersProbe(3);
		const screen = await render(RangerPlacer, {
			target: mainElement(),
			props: { node: shown('- 7', '- 2', '- 5'), answers: answers() }
		});
		const root = screen.container;
		await userEvent.click(tray(root)[0]);
		await userEvent.click(places(root)[2]);
		await userEvent.click(tray(root)[2]);
		await userEvent.click(places(root)[2]);
		expect(probe.values).toEqual(['', '', '2']);
		expect(tray(root)[0].disabled).toBe(false);
	});

	it('toucher une étiquette posée la renvoie en haut', async () => {
		const { probe, answers } = answersProbe(2);
		const screen = await render(RangerPlacer, {
			target: mainElement(),
			props: { node: shown('- 9', '- 4'), answers: answers() }
		});
		const root = screen.container;
		await userEvent.click(tray(root)[0]);
		await userEvent.click(places(root)[1]);
		expect(probe.values).toEqual(['', '0']);
		await userEvent.click(places(root)[1]);
		expect(probe.values).toEqual(['', '']);
	});

	it('glisser une étiquette sur une place', async () => {
		const { probe, answers } = answersProbe(3);
		const screen = await render(RangerPlacer, {
			target: mainElement(),
			props: { node: shown('- 7', '- 2', '- 5'), answers: answers() }
		});
		const root = screen.container;
		const from = tray(root)[2].getBoundingClientRect();
		const to = places(root)[1].getBoundingClientRect();
		const at = (r: DOMRect) => ({
			bubbles: true,
			pointerId: 1,
			button: 0,
			clientX: r.left + r.width / 2,
			clientY: r.top + r.height / 2
		});
		tray(root)[2].dispatchEvent(new PointerEvent('pointerdown', at(from)));
		window.dispatchEvent(new PointerEvent('pointermove', at(to)));
		window.dispatchEvent(new PointerEvent('pointerup', at(to)));
		await expect.poll(() => probe.values).toEqual(['', '2', '']);
	});

	it('clavier : Entrée prend, flèche bas, Entrée pose', async () => {
		const { probe, answers } = answersProbe(2);
		const screen = await render(RangerPlacer, {
			target: mainElement(),
			props: { node: shown('- 9', '- 4'), answers: answers() }
		});
		const root = screen.container;
		tray(root)[1].focus();
		await userEvent.keyboard('{Enter}');
		await userEvent.keyboard('{ArrowDown}');
		expect(document.activeElement).toBe(places(root)[0]);
		await userEvent.keyboard('{Enter}');
		expect(probe.values).toEqual(['1', '']);
	});

	it('noms accessibles : jamais l’ordre juste', async () => {
		const screen = await render(RangerPlacer, {
			target: mainElement(),
			props: { node: shown('- 7', '- 2', '- 5'), answers: answersProbe(3).answers() }
		});
		const root = screen.container;
		expect(tray(root)[0].getAttribute('aria-label')).toBe('Étiquette 1 sur 3');
		expect(places(root)[0].getAttribute('aria-label')).toBe('Place 1 sur 3, vide');
		expect(root.textContent).toContain('du plus petit au plus grand');
	});

	it('signe: > : du plus grand au plus petit', async () => {
		const screen = await render(RangerPlacer, {
			target: mainElement(),
			props: { node: shown('signe: >', '- 1', '- 9'), answers: answersProbe(2).answers() }
		});
		expect(screen.container.querySelector('.ranger-signe')?.textContent).toBe('>');
		expect(screen.container.textContent).toContain('du plus grand au plus petit');
	});

	it('hors question (cours, aide) : le bloc rend le geste, étiquettes mélangées', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: { content: ['```ranger', '- 1', '- 2', '- 3', '```'].join('\n') }
		});
		const labels = tray(screen.container).map((b) => b.textContent?.trim());
		expect([...labels].sort()).toEqual(['1', '2', '3']);
		expect(labels).not.toEqual(['1', '2', '3']);
		expect(labels).not.toEqual(['3', '2', '1']);
	});
});

describe('FillBlanksInput — étiquettes à ranger', () => {
	const template = {
		id: 't',
		title: 'Ranger',
		status: 'draft',
		variations: [
			{
				statement: templateMarkdown(
					['Range.', '', '```ranger', '- 2', '- 3', '- 6', '```'].join('\n')
				)
			}
		],
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
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
		const position = tray(root).findIndex((b) => b.textContent?.trim() === '2');
		await userEvent.click(tray(root)[position]);
		await userEvent.click(places(root)[0]);
		await expect.poll(() => values[0]).toBe(String(position));
		expect(values[0]).toBe(generated.blanks?.[0].expectedAnswer);
	});

	it('correction : places fausses marquées, le rangement juste à côté', async () => {
		const generated = instance();
		const right = (generated.blanks ?? []).map((b) => b.expectedAnswer);
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement: generated.statement,
				blanks: generated.blanks ?? [],
				values: [right[1], right[0], right[2]],
				disabled: true,
				validationResults: [false, false, true]
			}
		});
		const root = screen.container;
		expect(root.querySelectorAll('.ranger-faux')).toHaveLength(2);
		const correction = root.querySelector('.ranger-correction');
		expect(correction).not.toBeNull();
		expect(
			[...correction!.querySelectorAll('.ranger-place')].map((p) => p.textContent?.trim())
		).toEqual(['2', '3', '6']);
	});

	it('bonne réponse affichée : les étiquettes rangées, sans étiquettes à prendre', async () => {
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
		expect([...root.querySelectorAll('.ranger-place')].map((p) => p.textContent?.trim())).toEqual([
			'2',
			'3',
			'6'
		]);
	});
});

describe('BuildAnswer — étiquettes à ranger', () => {
	it('copie corrigée : les places de l’élève verrouillées, et le rangement juste', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'ranger',
				source: ['case: 0', '- 6', '- 2', '- 3'].join('\n'),
				answer: '2 ; 1 ; 0',
				status: 'incorrect',
				answers: [
					{ answer: '2', status: 'incorrect' },
					{ answer: '1', status: 'incorrect' },
					{ answer: '0', status: 'correct' }
				],
				expected: ['1', '2', '0']
			}
		});
		const root = screen.container;
		expect(tray(root)).toHaveLength(0);
		expect(places(root).every((p) => p.disabled)).toBe(true);
		expect(root.querySelectorAll('.ranger-faux')).toHaveLength(2);
		const correction = root.querySelector('.ranger-correction');
		expect(
			[...correction!.querySelectorAll('.ranger-place')].map((p) => p.textContent?.trim())
		).toEqual(['2', '3', '6']);
	});
});
