/**
 * Texte à trous à étiquettes à l'écran (chantier `docs/wip/trous-etiquettes-progress.md`)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import TrousEtiquettes from '../TrousEtiquettes.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
import BuildAnswer from '$lib/components/questions/BuildAnswer.svelte';
import { parseTrousContent } from '$lib/ubumark/parser/trous-parser';
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

/** Bloc d'une instance : trous vides, réserve déjà mélangée, `case:` posée */
const shown = (lines: string[], labels: string[]) =>
	parseTrousContent(['case: 0', ...lines, `étiquettes: ${labels.join(' ; ')}`].join('\n'));

const LINES = ['Une suite est [], de raison [].', 'Une autre est [].'];
const LABELS = ['géométrique', '$r$', 'arithmétique et bien plus longue'];

const tray = (root: Element) => [
	...root.querySelectorAll<HTMLButtonElement>('[data-trous-tray] button')
];
const places = (root: Element) => [
	...root.querySelectorAll<HTMLButtonElement>('button[data-trous-place]')
];
/** Texte posé dans chaque place (sans le gabarit invisible) */
const placeText = (root: Element) =>
	[...root.querySelectorAll('.trous-place')].map(
		(p) => p.querySelector('.trous-pose')?.textContent?.trim() ?? ''
	);

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

describe('Trous — le rendu et le geste', () => {
	it('la réserve au-dessus, puis le texte, chaque trou une place DANS sa ligne', async () => {
		const screen = await render(TrousEtiquettes, {
			target: mainElement(),
			props: { node: shown(LINES, LABELS), answers: answersProbe(3).answers() }
		});
		const root = screen.container;
		expect(tray(root)).toHaveLength(3);
		expect(tray(root)[0].textContent?.trim()).toBe('géométrique');
		const lines = [...root.querySelectorAll('.trous-ligne')];
		expect(lines).toHaveLength(2);
		// Le texte autour du trou, ses espaces gardés
		const outside = lines[0].cloneNode(true) as HTMLElement;
		outside.querySelectorAll('.trous-cellule').forEach((cell) => cell.replaceWith('#'));
		expect(outside.textContent?.replace(/\s+/g, ' ').trim()).toBe('Une suite est #, de raison #.');
		expect(lines[0].querySelectorAll('button[data-trous-place]')).toHaveLength(2);
		expect(lines[1].querySelectorAll('button[data-trous-place]')).toHaveLength(1);
		// Réserve au-dessus du texte
		const trayBox = root.querySelector('[data-trous-tray]')!.getBoundingClientRect();
		expect(trayBox.bottom).toBeLessThanOrEqual(lines[0].getBoundingClientRect().top + 1);
		// Place sur la même ligne que le texte qui la précède
		const before = lines[0].getBoundingClientRect();
		const place = places(root)[0].getBoundingClientRect();
		expect(place.top).toBeLessThan(before.top + 30);
		expect(placeText(root)).toEqual(['', '', '']);
	});

	it('les places ont la largeur de la plus longue étiquette', async () => {
		const screen = await render(TrousEtiquettes, {
			target: mainElement(),
			props: { node: shown(LINES, LABELS), answers: answersProbe(3).answers() }
		});
		const root = screen.container;
		const widths = places(root).map((p) => Math.round(p.getBoundingClientRect().width));
		expect(new Set(widths).size).toBe(1);
		const widest = Math.max(...tray(root).map((b) => b.getBoundingClientRect().width));
		expect(widths[0]).toBeGreaterThanOrEqual(Math.floor(widest) - 2);
	});

	it('toucher une étiquette puis une place : posée, et toujours disponible en haut', async () => {
		const { probe, answers } = answersProbe(3);
		const screen = await render(TrousEtiquettes, {
			target: mainElement(),
			props: { node: shown(LINES, LABELS), answers: answers() }
		});
		const root = screen.container;
		await userEvent.click(tray(root)[0]);
		await userEvent.click(places(root)[0]);
		await userEvent.click(tray(root)[0]);
		await userEvent.click(places(root)[2]);
		await expect.poll(() => probe.values).toEqual(['0', '', '0']);
		expect(placeText(root)).toEqual(['géométrique', '', 'géométrique']);
		expect(tray(root).every((b) => !b.disabled)).toBe(true);
	});

	it('toucher une place remplie la vide', async () => {
		const { probe, answers } = answersProbe(3);
		const screen = await render(TrousEtiquettes, {
			target: mainElement(),
			props: { node: shown(LINES, LABELS), answers: answers() }
		});
		const root = screen.container;
		await userEvent.click(tray(root)[1]);
		await userEvent.click(places(root)[1]);
		await expect.poll(() => probe.values[1]).toBe('1');
		await userEvent.click(places(root)[1]);
		await expect.poll(() => probe.values[1]).toBe('');
	});

	it('glisser une étiquette sur une place, puis d’une place à l’autre, puis en haut', async () => {
		const { probe, answers } = answersProbe(3);
		const screen = await render(TrousEtiquettes, {
			target: mainElement(),
			props: { node: shown(LINES, LABELS), answers: answers() }
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
		drag(places(root)[0], tray(root)[0]);
		await expect.poll(() => probe.values).toEqual(['', '', '']);
	});

	it('clavier : Entrée prend, flèche bas puis droite, Entrée pose', async () => {
		const { probe, answers } = answersProbe(3);
		const screen = await render(TrousEtiquettes, {
			target: mainElement(),
			props: { node: shown(LINES, LABELS), answers: answers() }
		});
		tray(screen.container)[0].focus();
		await userEvent.keyboard('{ArrowRight}');
		await userEvent.keyboard('{Enter}');
		await userEvent.keyboard('{ArrowDown}');
		await userEvent.keyboard('{ArrowRight}');
		await userEvent.keyboard('{Enter}');
		await expect.poll(() => probe.values).toEqual(['', '1', '']);
		// Échap lâche l'étiquette prise
		tray(screen.container)[2].focus();
		await userEvent.keyboard('{Enter}');
		await userEvent.keyboard('{Escape}');
		expect(tray(screen.container)[2].getAttribute('aria-pressed')).toBe('false');
	});

	it('noms accessibles : jamais la bonne étiquette', async () => {
		const screen = await render(TrousEtiquettes, {
			target: mainElement(),
			props: { node: shown(LINES, LABELS), answers: answersProbe(3).answers() }
		});
		const root = screen.container;
		expect(tray(root)[0].getAttribute('aria-label')).toBe('Étiquette 1 sur 3');
		expect(places(root)[0].getAttribute('aria-label')).toBe('Trou 1 sur 3, vide');
	});

	it('téléphone (360 px) : le texte revient à la ligne, les places le suivent, rien ne déborde', async () => {
		await page.viewport(360, 700);
		const long = [
			'Une suite définie par une relation de récurrence assez longue pour passer à la ligne est [], de raison [].',
			'Fin [].'
		];
		const screen = await render(TrousEtiquettes, {
			target: mainElement(),
			props: { node: shown(long, LABELS), answers: answersProbe(3).answers() }
		});
		const root = screen.container.querySelector<HTMLElement>('.trous')!;
		expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
		expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
		const line = root.querySelector('.trous-ligne')!;
		// Plusieurs lignes à l'écran
		expect(line.getBoundingClientRect().height).toBeGreaterThan(80);
		for (const place of places(root)) {
			expect(place.getBoundingClientRect().right).toBeLessThanOrEqual(360);
		}
	});

	it('hors question (cours, aide) : le geste, étiquettes mélangées une fois chacune', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: {
				content: [
					'```trous',
					'$2$ est [pair], $4$ est [pair], $7$ est [impair].',
					'intrus: premier',
					'```'
				].join('\n')
			}
		});
		const labels = tray(screen.container).map((b) => b.textContent?.trim());
		expect([...labels].sort()).toEqual(['impair', 'pair', 'premier']);
		expect(labels).not.toEqual(['pair', 'impair', 'premier']);
		expect(places(screen.container)).toHaveLength(3);
		// Hors question : aucun trou ne montre la réponse
		expect(placeText(screen.container)).toEqual(['', '', '']);
	});

	it('bloc mal écrit : le message au prof', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: { content: ['```trous', 'Un texte sans trou.', 'intrus: a ; b ; c', '```'].join('\n') }
		});
		expect(screen.container.textContent).toContain('Bloc trous : aucun trou');
	});
});

describe('FillBlanksInput — trous', () => {
	const template = {
		id: 't',
		title: 'Trous',
		status: 'draft',
		variations: [
			{
				statement: templateMarkdown(
					[
						'Complète.',
						'',
						'```trous',
						'$2$ est [pair], $7$ est [impair], $4$ est [pair].',
						'intrus: premier',
						'```'
					].join('\n')
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
		const position = tray(root).findIndex((b) => b.textContent?.trim() === 'pair');
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
		expect(root.querySelectorAll('.trous-faux')).toHaveLength(1);
		expect(root.querySelectorAll('.trous-juste')).toHaveLength(2);
		const corrections = [...root.querySelectorAll('.trous-correction')];
		expect(corrections).toHaveLength(1);
		expect(corrections[0].textContent).toContain('pair');
	});

	it('bonne réponse affichée : chaque trou avec sa bonne étiquette, sans réserve', async () => {
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
		expect(placeText(root)).toEqual(['pair', 'impair', 'pair']);
	});
});

describe('BuildAnswer — trous', () => {
	it('copie corrigée : les places de l’élève verrouillées, la bonne étiquette sous la fausse', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'trous',
				// Source d'une instance, `case:` retirée : trous vides
				source: ['A [] et B [].', 'étiquettes: x ; y ; z'].join('\n'),
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
		expect(root.querySelectorAll('.trous-faux')).toHaveLength(1);
		expect(root.querySelector('.trous-correction')?.textContent).toContain('z');
	});
});
