/**
 * Point à placer sur le cercle trigonométrique, à l'écran (chantier
 * `docs/wip/cercle-trotteuse-progress.md` § 4 et § 6)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import TrigCircle from '../TrigCircle.svelte';
import TrigPlacer from '../TrigPlacer.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
import BuildAnswer from '$lib/components/questions/BuildAnswer.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown, type ResolvedMarkdown } from '$lib/ubumark';
import { parseTrigCircleContent } from '$lib/ubumark/parser/trig-circle-parser';
import { TRIG_RADIUS, TRIG_SVG_SIZE } from '$lib/ubumark/utils/trig-placer';

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

function node(...lines: string[]) {
	const parsed = parseTrigCircleContent(lines.join('\n'));
	if (parsed.errors.length > 0) throw new Error(parsed.errors.map((e) => e.message).join(' ; '));
	return parsed.node!;
}

const zone = (root: Element) => root.querySelector<HTMLElement>('[role="slider"]')!;
const button = (root: Element, name: string) =>
	[...root.querySelectorAll<HTMLButtonElement>('button')].find(
		(b) => b.getAttribute('aria-label') === name
	)!;

/** Coordonnées écran du point d'angle `radians` sur le cercle (`ratio` : part du rayon) */
function screenAt(root: Element, radians: number, ratio = 1) {
	const svg = zone(root).querySelector('svg')!;
	const rect = svg.getBoundingClientRect();
	const r = ((TRIG_RADIUS * rect.width) / TRIG_SVG_SIZE) * ratio;
	return {
		clientX: rect.left + rect.width / 2 + r * Math.cos(radians),
		clientY: rect.top + rect.height / 2 - r * Math.sin(radians)
	};
}

function tapAt(root: Element, radians: number, ratio = 1) {
	const init = { bubbles: true, ...screenAt(root, radians, ratio), pointerId: 1 };
	zone(root).dispatchEvent(new PointerEvent('pointerdown', init));
	zone(root).dispatchEvent(new PointerEvent('pointerup', init));
}

/** Points posés par-dessus le cercle */
const posed = (root: Element) => zone(root).querySelectorAll('circle.trig-mark').length;

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

const PI = Math.PI;

describe('Cercle à placer — le dessin', () => {
	it('repères étiquetés, 24 graduations, aucun point posé au départ', async () => {
		const screen = await render(TrigCircle, {
			target: mainElement(),
			props: { node: node('placer: M = 2*pi/3') }
		});
		const root = screen.container;
		expect(root.querySelectorAll('.trig-circle-tick')).toHaveLength(24);
		expect(root.querySelectorAll('.trig-label')).toHaveLength(4);
		expect(posed(root)).toBe(0);
		expect(zone(root).getAttribute('aria-label')).toBe('Cercle trigonométrique : ton point');
	});

	it('l’angle attendu n’est nulle part dans le DOM', async () => {
		const screen = await render(TrigCircle, {
			target: mainElement(),
			props: { node: node('placer: M = 2*pi/3') }
		});
		const html = screen.container.innerHTML;
		expect(html).not.toMatch(/2\\pi|2π|frac\{2/);
		expect(screen.container.querySelector('.trig-named-point')).toBeNull();
	});
});

describe('Cercle à placer — le geste', () => {
	it('toucher le cercle pose le point, la case reçoit le cran', async () => {
		const { probe, answer } = answerProbe();
		const placed = await render(TrigPlacer, {
			target: mainElement(),
			props: { node: node('placer: M = 2*pi/3'), answers: [answer()] }
		});
		const root = placed.container;
		tapAt(root, (2 * PI) / 3);
		await expect.poll(() => probe.value).toBe('8');
		await expect.poll(() => posed(root)).toBe(1);
		await expect.poll(() => zone(root).getAttribute('aria-valuetext')).toBe('point M sur 2π/3');
	});

	it('aimant : entre deux crans, le plus proche ; mesure principale dans le nom accessible', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(TrigPlacer, {
			target: mainElement(),
			props: { node: node('placer: M = pi/4'), answers: [answer()] }
		});
		tapAt(screen.container, (7 * PI) / 4 + 0.08);
		await expect.poll(() => probe.value).toBe('21');
		await expect
			.poll(() => zone(screen.container).getAttribute('aria-valuetext'))
			.toBe('point M sur −π/4');
	});

	it('près du centre : rien de posé', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(TrigPlacer, {
			target: mainElement(),
			props: { node: node('placer: M = pi/4'), answers: [answer()] }
		});
		tapAt(screen.container, PI / 4, 0.1);
		await new Promise((r) => setTimeout(r, 50));
		expect(probe.changes).toEqual([]);
	});

	it('◀ ▶ : un cran ; sans point, le premier appui pose sur 0', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(TrigPlacer, {
			target: mainElement(),
			props: { node: node('placer: M = pi/4'), answers: [answer()] }
		});
		const root = screen.container;
		button(root, 'Avancer le point M d’un cran (sens direct)').click();
		await expect.poll(() => probe.value).toBe('0');
		button(root, 'Reculer le point M d’un cran (sens indirect)').click();
		await expect.poll(() => probe.value).toBe('23');
		button(root, 'Avancer le point M d’un cran (sens direct)').click();
		button(root, 'Avancer le point M d’un cran (sens direct)').click();
		await expect.poll(() => probe.value).toBe('1');
	});

	it('clavier : flèches d’un cran, Début sur 0', async () => {
		const { probe, answer } = answerProbe('3');
		const screen = await render(TrigPlacer, {
			target: mainElement(),
			props: { node: node('placer: M = pi/4'), answers: [answer()] }
		});
		zone(screen.container).focus();
		await userEvent.keyboard('{ArrowUp}');
		await expect.poll(() => probe.value).toBe('4');
		await userEvent.keyboard('{ArrowLeft}');
		await expect.poll(() => probe.value).toBe('3');
		await userEvent.keyboard('{Home}');
		await expect.poll(() => probe.value).toBe('0');
	});

	it('plusieurs points : poser M active N ; toucher M posé le choisit sans le bouger', async () => {
		const m = answerProbe();
		const n = answerProbe();
		const screen = await render(TrigPlacer, {
			target: mainElement(),
			props: { node: node('placer: M = pi/3 ; N = pi'), answers: [m.answer(), n.answer()] }
		});
		const root = screen.container;
		expect(button(root, 'Point M').getAttribute('aria-pressed')).toBe('true');
		tapAt(root, PI / 3);
		await expect.poll(() => m.probe.value).toBe('4');
		await expect.poll(() => button(root, 'Point N').getAttribute('aria-pressed')).toBe('true');
		tapAt(root, PI);
		await expect.poll(() => n.probe.value).toBe('12');
		tapAt(root, PI / 3);
		await expect.poll(() => button(root, 'Point M').getAttribute('aria-pressed')).toBe('true');
		expect(m.probe.changes).toEqual(['4']);
		expect(n.probe.changes).toEqual(['12']);
	});
});

describe('Cercle à placer — correction', () => {
	it('faux : la phrase, le cercle juste en vert, rien d’autre de jugé', async () => {
		const screen = await render(TrigPlacer, {
			target: mainElement(),
			props: {
				node: node('placer: M = 2*pi/3 ; N = -pi/4'),
				answers: [
					{ value: '9', isCorrect: false, disabled: true, onChange: () => {} },
					{ value: '21', isCorrect: true, disabled: true, onChange: () => {} }
				]
			}
		});
		const root = screen.container;
		expect(root.textContent).toContain('Ton point M est sur 3π/4.');
		expect(root.textContent).not.toContain('Ton point N');
		expect(root.querySelector('.placer-faux')).not.toBeNull();
		const correction = root.querySelector('.placer-correction')!;
		expect(correction.querySelectorAll('circle.trig-mark')).toHaveLength(2);
	});

	it('copie corrigée (BuildAnswer) : le cercle de l’élève figé, sans boutons', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'trig',
				source: 'placer: M = 2*pi/3 ; N = -pi/4',
				answer: '9 ; 21',
				status: 'incorrect',
				answers: [
					{ answer: '9', status: 'incorrect' },
					{ answer: '21', status: 'correct' }
				]
			}
		});
		const root = screen.container;
		expect(root.querySelector('button')).toBeNull();
		expect(root.textContent).toContain('Ton point M est sur 3π/4.');
	});

	it('bonne réponse seule (BuildAnswer sans réponse) : les points justes, nommés', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'trig',
				source: 'placer: M = 2*pi/3 ; N = -pi/4',
				answer: null,
				status: 'solution'
			}
		});
		const root = screen.container;
		expect(root.querySelectorAll('circle.trig-mark')).toHaveLength(2);
		expect(root.querySelector('[role="slider"]')).toBeNull();
	});
});

describe('Cercle à placer — hors question, et dans une question', () => {
	it('aperçu du prof (MarkdownRenderer) : le même geste, rien de jugé', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: { content: ['```trig', 'placer: M = pi/3', '```'].join('\n') as ResolvedMarkdown }
		});
		const root = screen.container;
		tapAt(root, PI / 6);
		await expect.poll(() => posed(root)).toBe(1);
		expect(root.querySelector('.placer-faux, .placer-juste')).toBeNull();
	});

	it('un cercle sans placer: reste une image', async () => {
		const screen = await render(TrigCircle, {
			target: mainElement(),
			props: { node: node('preset: quarters') }
		});
		expect(screen.container.querySelector('[role="slider"]')).toBeNull();
		expect(screen.container.querySelectorAll('.trig-circle-tick')).toHaveLength(0);
	});

	it('FillBlanksInput : la question générée remplit une case par point', async () => {
		const generated = generateInstance(
			{
				id: 'test-trig',
				title: 'Cercle',
				status: 'draft',
				variations: [
					{
						statement: templateMarkdown(
							['Place M et N.', '', '```trig', 'placer: M = 2*pi/3 ; N = -pi/4', '```'].join('\n')
						)
					}
				],
				grades: ['1_SPE'],
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
		tapAt(root, (2 * PI) / 3);
		tapAt(root, -PI / 4);
		await expect.poll(() => values[0]).toBe('8');
		await expect.poll(() => values[1]).toBe('21');
	});
});
