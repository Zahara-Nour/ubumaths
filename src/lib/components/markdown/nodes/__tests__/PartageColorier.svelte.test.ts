/**
 * Figure à colorier à l'écran (```partage + `colorier:`, chantier
 * `docs/wip/fractions-a-colorier-progress.md`) : toucher, glisser, clavier, nom
 * accessible, correction.
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import PartageColorier from '../PartageColorier.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
import BuildAnswer from '$lib/components/questions/BuildAnswer.svelte';
import { parsePartageContent } from '$lib/ubumark/parser/partage-parser';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { templateMarkdown, type ResolvedMarkdown } from '$lib/ubumark';
import type { InstanceBlank, QuestionTemplate } from '$lib/questions/types';

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

const node = (...lines: string[]) => parsePartageContent(lines.join('\n'));

const parts = (root: Element) => [
	...root.querySelectorAll<SVGPolygonElement>('.partage-colorier [role="button"]')
];
const colored = (root: Element) =>
	parts(root).filter((p) => p.getAttribute('aria-pressed') === 'true');

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

/** Pointeur au centre de la part de rang `rank` (à partir de 1) */
function pointAt(root: Element, rank: number) {
	const box = parts(root)[rank - 1].getBoundingClientRect();
	return {
		clientX: box.left + box.width / 2,
		clientY: box.top + box.height / 2,
		pointerId: 1,
		isPrimary: true
	};
}

function fire(root: Element, type: string, rank: number, init: PointerEventInit = {}) {
	// La figure qui porte la part (plusieurs figures : `unites:`)
	const svg = parts(root)[rank - 1].closest('svg')!;
	svg.dispatchEvent(new PointerEvent(type, { bubbles: true, ...pointAt(root, rank), ...init }));
}

const tap = (root: Element, rank: number) => {
	fire(root, 'pointerdown', rank);
	fire(root, 'pointerup', rank);
};

describe('PartageColorier — le geste', () => {
	it('toucher une part la colorie, la toucher encore l’efface', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(PartageColorier, {
			target: mainElement(),
			props: { node: node('forme: bande 8', 'colorier: 3/8'), answer: answer() }
		});
		const root = screen.container;
		expect(colored(root)).toHaveLength(0);
		tap(root, 3);
		await expect.poll(() => probe.value).toBe('3');
		tap(root, 1);
		await expect.poll(() => probe.value).toBe('1, 3');
		await expect.poll(() => colored(root)).toHaveLength(2);
		tap(root, 3);
		await expect.poll(() => probe.value).toBe('1');
	});

	it('glisser colorie plusieurs parts d’un coup', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(PartageColorier, {
			target: mainElement(),
			props: { node: node('forme: bande 8', 'colorier: 3/8'), answer: answer() }
		});
		const root = screen.container;
		fire(root, 'pointerdown', 2);
		fire(root, 'pointermove', 3);
		fire(root, 'pointermove', 4);
		fire(root, 'pointerup', 4);
		await expect.poll(() => probe.value).toBe('2, 3, 4');
	});

	it('la première part touchée décide : partie d’une part coloriée, le glissé efface', async () => {
		const { probe, answer } = answerProbe('1, 2, 3, 4');
		const screen = await render(PartageColorier, {
			target: mainElement(),
			props: { node: node('forme: bande 8', 'colorier: 3/8'), answer: answer() }
		});
		const root = screen.container;
		fire(root, 'pointerdown', 2);
		fire(root, 'pointermove', 3);
		fire(root, 'pointermove', 6);
		fire(root, 'pointerup', 6);
		// Les parts 4 et 5, enjambées entre deux mouvements, sont effacées aussi
		await expect.poll(() => probe.value).toBe('1');
	});

	it('glissé rapide : les parts enjambées entre deux mouvements sont coloriées', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(PartageColorier, {
			target: mainElement(),
			props: { node: node('forme: bande 10', 'colorier: 3/10'), answer: answer() }
		});
		const root = screen.container;
		fire(root, 'pointerdown', 1);
		fire(root, 'pointermove', 10);
		fire(root, 'pointerup', 10);
		await expect.poll(() => probe.value).toBe('1, 2, 3, 4, 5, 6, 7, 8, 9, 10');
	});

	it('clic droit ou second doigt : rien n’est colorié', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(PartageColorier, {
			target: mainElement(),
			props: { node: node('forme: bande 8', 'colorier: 3/8'), answer: answer() }
		});
		const root = screen.container;
		fire(root, 'pointerdown', 2, { button: 2 });
		fire(root, 'pointerup', 2, { button: 2 });
		fire(root, 'pointerdown', 3, { isPrimary: false, pointerId: 2 });
		fire(root, 'pointerup', 3, { isPrimary: false, pointerId: 2 });
		expect(probe.changes).toEqual([]);
	});

	it('grille 10 × 10 : 100 parts, un glissé sur une ligne', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(PartageColorier, {
			target: mainElement(),
			props: { node: node('forme: grille 10×10', 'colorier: 37/100'), answer: answer() }
		});
		const root = screen.container;
		expect(parts(root)).toHaveLength(100);
		fire(root, 'pointerdown', 11);
		for (let rank = 12; rank <= 15; rank++) fire(root, 'pointermove', rank);
		fire(root, 'pointerup', 15);
		await expect.poll(() => probe.value).toBe('11, 12, 13, 14, 15');
	});

	it('le doigt ne fait pas défiler la page sur la figure', async () => {
		const screen = await render(PartageColorier, {
			target: mainElement(),
			props: { node: node('forme: bande 8', 'colorier: 3/8'), answer: answerProbe().answer() }
		});
		const svg = screen.container.querySelector('svg.partage-figure')!;
		expect(getComputedStyle(svg).touchAction).toBe('none');
	});
});

describe('PartageColorier — clavier et accessibilité', () => {
	it('chaque part est un bouton à bascule au nom « Part N sur T »', async () => {
		const { answer } = answerProbe('3');
		const screen = await render(PartageColorier, {
			target: mainElement(),
			props: { node: node('forme: bande 8', 'colorier: 3/8'), answer: answer() }
		});
		const root = screen.container;
		expect(parts(root)).toHaveLength(8);
		expect(parts(root)[0].getAttribute('aria-label')).toBe('Part 1 sur 8');
		expect(parts(root)[2].getAttribute('aria-label')).toBe('Part 3 sur 8, coloriée');
		expect(parts(root)[2].getAttribute('aria-pressed')).toBe('true');
		expect(parts(root)[0].getAttribute('aria-pressed')).toBe('false');
	});

	it('le nom de la figure est la forme seule : jamais la fraction attendue', async () => {
		const screen = await render(PartageColorier, {
			target: mainElement(),
			props: { node: node('forme: bande 8', 'colorier: 3/8'), answer: answerProbe().answer() }
		});
		const root = screen.container;
		expect(root.querySelector('svg.partage-figure')!.getAttribute('aria-label')).toBe(
			'Bande partagée en parts égales'
		);
		expect(root.innerHTML).not.toMatch(/3\/8|3 parts/);
	});

	it('Tab atteint les parts, Espace et Entrée basculent', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(PartageColorier, {
			target: mainElement(),
			props: { node: node('forme: bande 4', 'colorier: 1/4'), answer: answer() }
		});
		const root = screen.container;
		parts(root)[1].focus();
		await userEvent.keyboard(' ');
		await expect.poll(() => probe.value).toBe('2');
		await userEvent.keyboard('{Enter}');
		await expect.poll(() => probe.value).toBe('');
		await userEvent.tab();
		expect(document.activeElement).toBe(parts(root)[2]);
	});

	it('verrouillée : parts non focalisables, aucun changement', async () => {
		const { probe } = answerProbe();
		const screen = await render(PartageColorier, {
			target: mainElement(),
			props: {
				node: node('forme: bande 4', 'colorier: 1/4'),
				answer: {
					value: '1',
					isCorrect: true,
					disabled: true,
					onChange: (v: string) => (probe.value = v)
				}
			}
		});
		const root = screen.container;
		expect(parts(root)[0].getAttribute('aria-disabled')).toBe('true');
		expect(parts(root)[0].getAttribute('tabindex')).toBe('-1');
		tap(root, 2);
		expect(probe.value).toBe('');
	});
});

describe('PartageColorier — correction', () => {
	it('faux : la phrase, la figure de l’élève et la figure juste', async () => {
		const screen = await render(PartageColorier, {
			target: mainElement(),
			props: {
				node: node('forme: bande 8', 'colorier: 3/8'),
				answer: { value: '2, 7', isCorrect: false, disabled: true, onChange: () => {} }
			}
		});
		const root = screen.container;
		expect(root.textContent).toContain(
			'Tu as colorié 2 parts sur 8 ; il fallait en colorier 3 (3/8).'
		);
		expect(colored(root)).toHaveLength(2);
		const solution = root.querySelectorAll('.placer-correction .partage-coloriee');
		expect(solution).toHaveLength(3);
		expect(root.querySelector('.placer-faux')).not.toBeNull();
	});

	it('juste : cadre vert, pas de correction', async () => {
		const screen = await render(PartageColorier, {
			target: mainElement(),
			props: {
				node: node('forme: bande 8', 'colorier: 3/8'),
				answer: { value: '1, 5, 8', isCorrect: true, disabled: true, onChange: () => {} }
			}
		});
		expect(screen.container.querySelector('.placer-juste')).not.toBeNull();
		expect(screen.container.querySelector('.placer-correction')).toBeNull();
	});

	it('rien colorié : « Tu n’as rien colorié. »', async () => {
		const screen = await render(PartageColorier, {
			target: mainElement(),
			props: {
				node: node('forme: bande 8', 'colorier: 3/8'),
				answer: { value: '', isCorrect: false, disabled: true, onChange: () => {} }
			}
		});
		expect(screen.container.textContent).toContain('Tu n’as rien colorié.');
	});
});

describe('hors question, dans une question, dans la copie corrigée', () => {
	it('hors question (cours, aperçu) : le geste, rien de jugé', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: {
				content: ['```partage', 'forme: bande 8', 'colorier: 3/8', '```'].join(
					'\n'
				) as ResolvedMarkdown
			}
		});
		expect(parts(screen.container)).toHaveLength(8);
		expect(screen.container.textContent).not.toContain('Correction');
	});

	const STATEMENT = [
		'Colorie.',
		'',
		'```partage',
		'case: 0',
		'forme: bande 8',
		'colorier: 3/8',
		'```'
	].join('\n') as ResolvedMarkdown;
	const blanks: InstanceBlank[] = [
		{ type: 'text', expectedAnswer: '3/8', expectedAnswerLatex: '3/8', construire: 'partage' }
	];

	it('décor de la prod : la question générée remplit sa case', async () => {
		const generated = generateInstance(
			{
				id: 'test-partage',
				title: 'Colorier',
				status: 'draft',
				variations: [
					{
						statement: templateMarkdown(
							['Colorie.', '', '```partage', 'forme: bande 8', 'colorier: 3/8', '```'].join('\n')
						)
					}
				],
				grades: ['CM1'],
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
		tap(screen.container, 2);
		await expect.poll(() => values[0]).toBe('2');
	});

	it('bonne réponse affichée : la figure juste, sans geste', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: STATEMENT, blanks, showCorrectAnswers: true, validationResults: [] }
		});
		const root = screen.container;
		expect(root.querySelectorAll('.partage-coloriee')).toHaveLength(3);
		expect(root.querySelector('[role="button"][aria-pressed]')).toBeNull();
	});

	it('copie corrigée (BuildAnswer) : les parts de l’élève, verrouillées', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'partage',
				source: 'forme: bande 8\ncolorier: 3/8',
				answer: '1, 2',
				status: 'incorrect'
			}
		});
		const root = screen.container;
		expect(colored(root)).toHaveLength(2);
		expect(parts(root)[0].getAttribute('aria-disabled')).toBe('true');
		expect(root.textContent).toContain('il fallait en colorier 3 (3/8)');
	});

	it('copie sans réponse (verso) : la figure juste seule', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'partage',
				source: 'forme: bande 8\ncolorier: 3/8',
				answer: null,
				status: 'solution'
			}
		});
		expect(screen.container.querySelectorAll('.partage-coloriee')).toHaveLength(3);
	});
});

describe('PartageColorier — plusieurs figures (unites:)', () => {
	const sevenQuarters = () => node('forme: bande 4', 'unites: 3', 'colorier: 7/4');

	it('trois figures, rangs à la suite : toucher la figure 2 colorie la part 5', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(PartageColorier, {
			target: mainElement(),
			props: { node: sevenQuarters(), answer: answer() }
		});
		const root = screen.container;
		expect(root.querySelectorAll('.partage-colorier svg.partage-figure')).toHaveLength(3);
		expect(parts(root)).toHaveLength(12);
		tap(root, 5);
		await expect.poll(() => probe.value).toBe('5');
		tap(root, 12);
		await expect.poll(() => probe.value).toBe('5, 12');
	});

	it('glisser dans la figure 2 colorie ses parts', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(PartageColorier, {
			target: mainElement(),
			props: { node: sevenQuarters(), answer: answer() }
		});
		const root = screen.container;
		fire(root, 'pointerdown', 5);
		fire(root, 'pointermove', 6);
		fire(root, 'pointermove', 8);
		fire(root, 'pointerup', 8);
		await expect.poll(() => probe.value).toBe('5, 6, 7, 8');
	});

	it('noms accessibles : « Figure 2, part 1 sur 4 », figures « figure 2 sur 3 »', async () => {
		const { answer } = answerProbe('5');
		const screen = await render(PartageColorier, {
			target: mainElement(),
			props: { node: sevenQuarters(), answer: answer() }
		});
		const root = screen.container;
		expect(parts(root)[0].getAttribute('aria-label')).toBe('Figure 1, part 1 sur 4');
		expect(parts(root)[4].getAttribute('aria-label')).toBe('Figure 2, part 1 sur 4, coloriée');
		expect(parts(root)[11].getAttribute('aria-label')).toBe('Figure 3, part 4 sur 4');
		const figures = [...root.querySelectorAll('.partage-colorier svg.partage-figure')];
		expect(figures[1].getAttribute('aria-label')).toBe(
			'Bande partagée en parts égales, figure 2 sur 3'
		);
		expect(root.innerHTML).not.toMatch(/7\/4|7 parts/);
	});

	it('faux : la phrase, et les figures justes, unités pleines d’abord', async () => {
		const screen = await render(PartageColorier, {
			target: mainElement(),
			props: {
				node: sevenQuarters(),
				answer: { value: '1, 2, 3, 4, 5', isCorrect: false, disabled: true, onChange: () => {} }
			}
		});
		const root = screen.container;
		expect(root.textContent).toContain(
			'Tu as colorié 5 parts ; il fallait en colorier 7 (7/4, chaque figure a 4 parts).'
		);
		const solution = [...root.querySelectorAll('.placer-correction svg')];
		expect(solution).toHaveLength(3);
		expect(solution.map((svg) => svg.querySelectorAll('.partage-coloriee').length)).toEqual([
			4, 3, 0
		]);
	});
});
