/**
 * Droite à tracer à l'écran (chantier `docs/wip/points-repere-progress.md` § 3 et § 8, lot 2)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Courbe from '../Courbe.svelte';
import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
import BuildAnswer from '$lib/components/questions/BuildAnswer.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';
import { parseCourbeContent } from '$lib/ubumark/parser/courbe-parser';
import { COURBE_PAD, courbeFrame } from '$lib/ubumark/utils/courbe-scene';

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

const WINDOW = ['x: -5 ; 5', 'y: -4 ; 4', 'grille: 1'];
const TRACER = 'tracer: y = 2x - 1';

function node(...lines: string[]) {
	const parsed = parseCourbeContent(lines.join('\n'));
	if (!parsed.spec) throw new Error(parsed.errors.map((e) => e.message).join(' ; '));
	return parsed;
}

const zone = (root: Element) => root.querySelector<HTMLElement>('[role="slider"]')!;
const label = (root: Element, name: string) =>
	[...root.querySelectorAll<HTMLButtonElement>('button')].find(
		(b) => b.getAttribute('aria-label') === name
	);

/** Coordonnées écran du point (x ; y) du repère (fenêtre -5..5 / -4..4, taille moyenne) */
function screenAt(root: Element, x: number, y: number) {
	const svg = zone(root).querySelector('svg')!;
	const rect = svg.getBoundingClientRect();
	const scale = rect.width / svg.viewBox.baseVal.width;
	const { width, height } = courbeFrame('moyenne');
	return {
		clientX: rect.left + (COURBE_PAD + ((x + 5) / 10) * width) * scale,
		clientY: rect.top + (COURBE_PAD + ((4 - y) / 8) * height) * scale
	};
}

function tapAt(root: Element, x: number, y: number) {
	const init = { bubbles: true, ...screenAt(root, x, y), pointerId: 1 };
	zone(root).dispatchEvent(new PointerEvent('pointerdown', init));
	zone(root).dispatchEvent(new PointerEvent('pointerup', init));
}

const posed = (root: Element) => zone(root).querySelectorAll('circle.courbe-pose').length;
const traced = (root: Element) => zone(root).querySelectorAll('line.courbe-trace').length;

function answerProbe(initial = '') {
	const probe = { value: initial };
	return {
		probe,
		answer: () => ({
			value: probe.value,
			isCorrect: null,
			disabled: false,
			onChange: (value: string) => {
				probe.value = value;
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

describe('Droite à tracer — le geste', () => {
	it('deux points posés : la case reçoit x1;y1/x2;y2, la droite se dessine', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, TRACER), answers: [answer()] }
		});
		const root = screen.container;
		expect(label(root, 'Point 1')).toBeDefined();
		expect(label(root, 'Point 2')).toBeDefined();
		tapAt(root, 0, -1);
		await expect.poll(() => probe.value).toBe('0;-1/');
		expect(traced(root)).toBe(0);
		await expect.poll(() => label(root, 'Point 2')?.getAttribute('aria-pressed')).toBe('true');
		tapAt(root, 1, 1);
		await expect.poll(() => probe.value).toBe('0;-1/1;1');
		await expect.poll(() => posed(root)).toBe(2);
		await expect.poll(() => traced(root)).toBe(1);
		expect(zone(root).getAttribute('aria-valuetext')).toBe('point 2 en (1 ; 1)');
	});

	it('deux points au même nœud : pas de droite', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, TRACER), answers: [answer()] }
		});
		const root = screen.container;
		tapAt(root, 1, 1);
		await expect.poll(() => probe.value).toBe('1;1/');
		tapAt(root, 1.1, 0.9);
		await expect.poll(() => probe.value).toBe('1;1/1;1');
		expect(traced(root)).toBe(0);
	});

	it('jamais l’équation dans le DOM ni dans le dessin avant la correction', async () => {
		const withLine = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, TRACER) }
		});
		const without = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW) }
		});
		const svgOf = (root: Element) => root.querySelector('svg')!.innerHTML;
		expect(svgOf(withLine.container)).toBe(svgOf(without.container));
		expect(withLine.container.innerHTML).not.toMatch(/2x|2 ?x/);
	});
});

describe('Droite à tracer — correction', () => {
	it('fausse : la phrase, la droite juste et deux de ses nœuds en vert', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, TRACER), answers: [locked('0;-1/1;2', false)] }
		});
		const root = screen.container;
		expect(root.textContent).toContain('Ta droite n’est pas celle d’équation');
		expect(root.querySelector('p math-span')?.textContent).toBe('y = 2 x - 1');
		expect(root.querySelectorAll('.placer-correction line.courbe-trace')).toHaveLength(1);
		expect(root.querySelectorAll('.placer-correction circle.courbe-pose')).toHaveLength(2);
		expect(root.querySelector('.placer-faux')).not.toBeNull();
	});

	it('équation des variables mise au propre : y = 1x + 0 écrite y = x', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, 'tracer: y = 1x + 0'), answers: [locked('0;0/1;2', false)] }
		});
		expect(screen.container.querySelector('p math-span')?.textContent).toBe('y = x');
	});

	it('un seul point : « Il faut placer deux points. »', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, TRACER), answers: [locked('0;-1/', false)] }
		});
		expect(screen.container.textContent).toContain('Il faut placer deux points.');
	});

	it('points confondus : la phrase dédiée', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, TRACER), answers: [locked('1;1/1;1', false)] }
		});
		expect(screen.container.textContent).toContain(
			'Tes deux points sont au même endroit : ils ne font pas une droite.'
		);
	});

	it('équation masquée (évaluation notée) : ni phrase ni droite juste', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, 'tracer: ?'), answers: [locked('0;-1/1;2', false)] }
		});
		const root = screen.container;
		expect(root.textContent).not.toContain('équation');
		expect(root.querySelectorAll('.placer-correction line.courbe-trace')).toHaveLength(0);
	});

	it('juste : cadre vert, pas de correction', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, TRACER), answers: [locked('3;5/-1;-3', true)] }
		});
		expect(screen.container.querySelector('.placer-correction')).toBeNull();
		expect(screen.container.querySelector('.placer-juste')).not.toBeNull();
	});

	it('bonne réponse seule (BuildAnswer sans réponse) : la droite et deux nœuds', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'courbe',
				source: [...WINDOW, TRACER].join('\n'),
				answer: null,
				status: 'solution'
			}
		});
		const root = screen.container;
		expect(root.querySelectorAll('line.courbe-trace')).toHaveLength(1);
		expect(root.querySelectorAll('circle.courbe-pose')).toHaveLength(2);
		expect(root.querySelector('[role="slider"]')).toBeNull();
	});

	it('copie corrigée (BuildAnswer) : la droite de l’élève, la phrase', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'courbe',
				source: [...WINDOW, TRACER].join('\n'),
				answer: '0;-1/1;2',
				status: 'incorrect'
			}
		});
		const root = screen.container;
		expect(root.textContent).toContain('Ta droite n’est pas celle d’équation');
		expect(root.querySelector('p math-span')?.textContent).toBe('y = 2 x - 1');
		expect(label(root, 'Point 1')).toBeUndefined();
	});
});

describe('Droite à tracer — décor de la prod', () => {
	it('la question générée remplit sa case', async () => {
		const generated = generateInstance(
			{
				id: 'test-tracer',
				title: 'Tracer',
				status: 'draft',
				variations: [
					{
						statement: templateMarkdown(
							['Trace la droite.', '', '```courbe', ...WINDOW, TRACER, '```'].join('\n')
						)
					}
				],
				grades: ['2'],
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
		tapAt(root, 0, -1);
		tapAt(root, 1, 1);
		await expect.poll(() => values[0]).toBe('0;-1/1;1');
	});
});
