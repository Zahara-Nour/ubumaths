/**
 * Repère à points à placer à l'écran (chantier `docs/wip/points-repere-progress.md` § 3, lot 1)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import Courbe from '../Courbe.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';
import BuildAnswer from '$lib/components/questions/BuildAnswer.svelte';
import { parseCourbeContent } from '$lib/ubumark/parser/courbe-parser';
import { COURBE_PAD, courbeFrame } from '$lib/ubumark/utils/courbe-scene';
import type { ResolvedMarkdown } from '$lib/ubumark';

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

const WINDOW = ['x: -5 ; 5', 'y: -4 ; 4'];

function node(...lines: string[]) {
	const parsed = parseCourbeContent(lines.join('\n'));
	if (!parsed.spec) throw new Error(parsed.errors.map((e) => e.message).join(' ; '));
	return parsed;
}

const zone = (root: Element) => root.querySelector<HTMLElement>('[role="slider"]')!;
const label = (root: Element, name: string) =>
	[...root.querySelectorAll<HTMLButtonElement>('button')].find(
		(b) => b.getAttribute('aria-label') === name
	)!;

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

/** Toucher le repère en (x ; y), comme un doigt (décalé de `dx`, `dy` unités pour tester l'aimant) */
function tapAt(root: Element, x: number, y: number) {
	const init = { bubbles: true, ...screenAt(root, x, y), pointerId: 1 };
	zone(root).dispatchEvent(new PointerEvent('pointerdown', init));
	zone(root).dispatchEvent(new PointerEvent('pointerup', init));
}

/** Points de l'élève dessinés sur le repère */
const posed = (root: Element) => zone(root).querySelectorAll('circle.courbe-pose').length;

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

describe('Repère à placer — le geste', () => {
	it('sans point au départ ; toucher pose le point, la case reçoit x;y', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, 'placer: A=(2 ; 3)'), answers: [answer()] }
		});
		const root = screen.container;
		expect(posed(root)).toBe(0);
		tapAt(root, 2, 3);
		await expect.poll(() => probe.value).toBe('2;3');
		await expect.poll(() => posed(root)).toBe(1);
		await expect.poll(() => zone(root).getAttribute('aria-valuetext')).toBe('point A en (2 ; 3)');
	});

	it('aimant : le doigt entre deux nœuds, le point va au plus proche', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, 'grille: 1 ; 1', 'placer: A=(2 ; 3)'), answers: [answer()] }
		});
		tapAt(screen.container, 1.8, -0.6);
		await expect.poll(() => probe.value).toBe('2;-1');
	});

	it('grille décimale : la case porte le point décimal', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(Courbe, {
			target: mainElement(),
			props: {
				node: node(...WINDOW, 'grille: 0,5 ; 0,5', 'placer: A=(1,5 ; -0,5)'),
				answers: [answer()]
			}
		});
		tapAt(screen.container, 1.55, -0.45);
		await expect.poll(() => probe.value).toBe('1.5;-0.5');
		await expect
			.poll(() => zone(screen.container).getAttribute('aria-valuetext'))
			.toBe('point A en (1,5 ; -0,5)');
	});

	it('clavier : la première flèche pose le point de départ, puis un cran par flèche', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, 'grille: 1 ; 1', 'placer: A=(2 ; 3)'), answers: [answer()] }
		});
		zone(screen.container).focus();
		await userEvent.keyboard('{ArrowRight}');
		expect(probe.value).toBe('0;0');
		await userEvent.keyboard('{ArrowRight}');
		expect(probe.value).toBe('1;0');
		await userEvent.keyboard('{ArrowUp}');
		expect(probe.value).toBe('1;1');
		await userEvent.keyboard('{ArrowLeft}');
		await userEvent.keyboard('{ArrowDown}');
		expect(probe.value).toBe('0;0');
		await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowUp}');
		expect(probe.value).toBe('2;1');
		await userEvent.keyboard('{Home}');
		expect(probe.value).toBe('0;0');
	});

	it('clavier : jamais hors de la fenêtre', async () => {
		const { probe, answer } = answerProbe('5;4');
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, 'grille: 1 ; 1', 'placer: A=(2 ; 3)'), answers: [answer()] }
		});
		zone(screen.container).focus();
		await userEvent.keyboard('{ArrowRight}{ArrowUp}');
		expect(probe.changes).toEqual([]);
		expect(probe.value).toBe('5;4');
	});

	it('plusieurs points : étiquettes, A actif au départ, poser active le suivant', async () => {
		const a = answerProbe();
		const b = answerProbe();
		const screen = await render(Courbe, {
			target: mainElement(),
			props: {
				node: node(...WINDOW, 'placer: A=(2 ; 3) ; B=(-1 ; 2)'),
				answers: [a.answer(), b.answer()]
			}
		});
		const root = screen.container;
		expect(label(root, 'Point A').getAttribute('aria-pressed')).toBe('true');
		expect(label(root, 'Point B').getAttribute('aria-pressed')).toBe('false');
		tapAt(root, 2, 3);
		await expect.poll(() => a.probe.value).toBe('2;3');
		await expect.poll(() => label(root, 'Point B').getAttribute('aria-pressed')).toBe('true');
		tapAt(root, -1, 2);
		await expect.poll(() => b.probe.value).toBe('-1;2');
		expect(posed(root)).toBe(2);
	});

	it('toucher une étiquette change le point actif ; toucher un point posé le reprend', async () => {
		const a = answerProbe('2;3');
		const b = answerProbe('-1;2');
		const screen = await render(Courbe, {
			target: mainElement(),
			props: {
				node: node(...WINDOW, 'placer: A=(2 ; 3) ; B=(-1 ; 2)'),
				answers: [a.answer(), b.answer()]
			}
		});
		const root = screen.container;
		await userEvent.click(label(root, 'Point B'));
		expect(label(root, 'Point B').getAttribute('aria-pressed')).toBe('true');
		// Le doigt sur A (posé) reprend A, même si B est le point actif
		const init = { bubbles: true, ...screenAt(root, 2, 3), pointerId: 1 };
		zone(root).dispatchEvent(new PointerEvent('pointerdown', init));
		zone(root).dispatchEvent(new PointerEvent('pointermove', { ...init, ...screenAt(root, 3, 3) }));
		zone(root).dispatchEvent(new PointerEvent('pointerup', init));
		await expect.poll(() => a.probe.value).toBe('3;3');
		expect(b.probe.changes).toEqual([]);
	});

	it('jamais la cible dans le DOM avant la correction', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, 'placer: A=(2 ; 3) ; B=(-1 ; 2)') }
		});
		const root = screen.container;
		tapAt(root, 1, 1);
		await expect.poll(() => posed(root)).toBe(1);
		// Ni aria-valuetext, ni attributs de données, ni texte ne disent (2 ; 3) / (-1 ; 2)
		expect(root.textContent ?? '').not.toMatch(/\(2 ; 3\)|\(-1 ; 2\)|\(−1 ; 2\)/);
		for (const el of root.querySelectorAll('*')) {
			for (const attr of el.attributes) {
				if (!/^(aria-|data-|title$|alt$)/.test(attr.name)) continue;
				expect(`${attr.name}=${attr.value}`).not.toMatch(/\(2 ; 3\)|\(-1 ; 2\)|2;3|-1;2/);
			}
		}
		expect(root.innerHTML).not.toContain('courbe-pose-nom">B');
	});

	it('jamais la cible dans le dessin : avant tout geste, le même SVG que sans placer:', async () => {
		const withTargets = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, 'grille: 1', 'placer: A=(2 ; 3) ; B=(-1 ; 2)') }
		});
		const without = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, 'grille: 1') }
		});
		// Positions (cx, cy, x, y…) et noms compris : rien du dessin ne dépend des cibles
		const svgOf = (root: Element) => root.querySelector('svg')!.innerHTML;
		expect(svgOf(withTargets.container)).toBe(svgOf(without.container));
	});

	it('verrouillé : le toucher ne bouge rien, étiquettes grisées', async () => {
		const changes: string[] = [];
		const screen = await render(Courbe, {
			target: mainElement(),
			props: {
				node: node(...WINDOW, 'placer: A=(2 ; 3) ; B=(-1 ; 2)'),
				answers: [
					{ value: '2;3', isCorrect: true, disabled: true, onChange: (v) => changes.push(v) },
					{ value: '', isCorrect: true, disabled: true, onChange: (v) => changes.push(v) }
				]
			}
		});
		tapAt(screen.container, 1, 1);
		expect(changes).toEqual([]);
		expect(label(screen.container, 'Point A').disabled).toBe(true);
	});
});

describe('Repère à placer — correction', () => {
	const locked = (value: string, isCorrect: boolean) => ({
		value,
		isCorrect,
		disabled: true,
		onChange: () => {}
	});

	it('fausse : une phrase par point faux, le repère juste à côté en vert', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: {
				node: node(...WINDOW, 'placer: A=(2 ; 3) ; B=(-1 ; 2) ; C=(0 ; -3)'),
				answers: [locked('3;2', false), locked('-1;2', true), locked('', false)]
			}
		});
		const root = screen.container;
		expect(root.textContent).toContain(
			'Tu as placé A en (3 ; 2) : tu as échangé l’abscisse et l’ordonnée.'
		);
		expect(root.textContent).toContain('Tu n’as pas placé C.');
		expect(root.textContent).not.toContain('Tu as placé B');
		expect(root.querySelectorAll('.placer-correction circle.courbe-pose')).toHaveLength(3);
		expect(root.querySelector('.placer-faux')).not.toBeNull();
		expect(root.querySelector('[role="status"]')?.textContent).toMatch(/réponse fausse/);
	});

	it('point seul sans nom, vide : « Tu n’as rien placé. »', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, 'placer: (2 ; 3)'), answers: [locked('', false)] }
		});
		expect(screen.container.textContent).toContain('Tu n’as rien placé.');
	});

	it('juste : cadre vert, pas de correction', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, 'placer: A=(2 ; 3)'), answers: [locked('2;3', true)] }
		});
		expect(screen.container.querySelector('.placer-correction')).toBeNull();
		expect(screen.container.querySelector('.placer-juste')).not.toBeNull();
	});

	it('copie corrigée (BuildAnswer) : repère verrouillé, sans étiquettes, phrases par point', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'courbe',
				source: [...WINDOW, 'placer: A=(2 ; 3) ; B=(-1 ; 2)'].join('\n'),
				answer: '3;2 ; -1;2',
				status: 'incorrect',
				answers: [
					{ answer: '3;2', status: 'incorrect' },
					{ answer: '-1;2', status: 'correct' }
				]
			}
		});
		const root = screen.container;
		expect(root.querySelector('button')).toBeNull();
		expect(root.textContent).toContain('Tu as placé A en (3 ; 2)');
		expect(root.textContent).not.toContain('Tu as placé B');
	});

	it('bonne réponse seule (BuildAnswer sans réponse) : les points justes, nommés', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'courbe',
				source: [...WINDOW, 'placer: A=(2 ; 3) ; B=(-1 ; 2)'].join('\n'),
				answer: null,
				status: 'solution'
			}
		});
		const root = screen.container;
		expect(root.querySelectorAll('circle.courbe-pose')).toHaveLength(2);
		expect(root.querySelector('[role="slider"]')).toBeNull();
	});
});

describe('Repère à placer — hors question et titres d’axes', () => {
	it('aperçu du prof (MarkdownRenderer) : le même geste, rien de jugé', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: {
				content: ['```courbe', ...WINDOW, 'placer: A=(2 ; 3)', '```'].join('\n') as ResolvedMarkdown
			}
		});
		const root = screen.container;
		tapAt(root, 1, 1);
		await expect.poll(() => posed(root)).toBe(1);
		expect(root.querySelector('.placer-faux, .placer-juste')).toBeNull();
	});

	it('un repère sans placer: reste une image (pas de curseur)', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW) }
		});
		expect(screen.container.querySelector('[role="slider"]')).toBeNull();
		expect(screen.container.querySelector('[role="img"]')).not.toBeNull();
	});

	it('titres d’axes : dessinés, même sans geste', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, 'axes: x = Durée (min) ; y = Température (°C)') }
		});
		const titles = [...screen.container.querySelectorAll('.courbe-titre-axe')].map(
			(t) => t.textContent
		);
		expect(titles).toEqual(['Durée (min)', 'Température (°C)']);
	});

	it('titre de l’axe y : à gauche de l’axe quand il est au bord droit (fenêtre toute négative)', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node('x: -10 ; -2', 'y: 0 ; 4', 'axes: y = Température (°C)') }
		});
		const title = screen.container.querySelector('.courbe-titre-axe')!;
		expect(title.getAttribute('text-anchor')).toBe('end');
		const svg = screen.container.querySelector('svg')!;
		expect(Number(title.getAttribute('x'))).toBeLessThanOrEqual(svg.viewBox.baseVal.width);
	});
});

describe('FillBlanksInput — repère à placer', () => {
	it('décor de la prod : la question générée remplit une case par point', async () => {
		const generated = generateInstance(
			{
				id: 'test-repere',
				title: 'Repère',
				status: 'draft',
				variations: [
					{
						statement: templateMarkdown(
							[
								'Place A et B.',
								'',
								'```courbe',
								...WINDOW,
								'placer: A=(2 ; 3) ; B=(-1 ; 2)',
								'```'
							].join('\n')
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
		tapAt(root, 2, 3);
		tapAt(root, -1, 2);
		await expect.poll(() => values[0]).toBe('2;3');
		await expect.poll(() => values[1]).toBe('-1;2');
		expect(root.textContent ?? '').not.toMatch(/\(2 ; 3\)/);
	});
});
