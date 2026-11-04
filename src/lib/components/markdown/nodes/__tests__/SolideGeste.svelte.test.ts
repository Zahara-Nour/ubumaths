/**
 * Vecteur à tracer sur un solide à l'écran (```solide + `tracer:`, chantier
 * `solide-vecteur`, lot 2) : points cliquables, origine puis extrémité, flèche,
 * phrases, correction, case de question.
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 *
 * Cube de côté 2 : AB vers la droite, AD vers le fond, AE vers le haut ;
 * AB + AD = AC.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import SolideGeste from '../SolideGeste.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
import BuildAnswer from '$lib/components/questions/BuildAnswer.svelte';
import { parseEspaceContent } from '$lib/ubumark/parser/espace-parser';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { templateMarkdown, type ResolvedMarkdown } from '$lib/ubumark';
import type { QuestionTemplate } from '$lib/questions/types';

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

const CUBE = ['forme: cube 2', 'sommets: A B C D E F G H'];
const node = (...lines: string[]) => parseEspaceContent(lines.join('\n'), 'solide');
/** Origine libre : AB + AD, représentée par A/C, B/?, … */
const free = () => node(...CUBE, 'tracer: vecteur AB + AD');
/** Origine imposée : AB + AD depuis A */
const imposed = () => node(...CUBE, 'tracer: vecteur AB + AD depuis A');

const points = (root: Element) => [
	...root.querySelectorAll<SVGElement>('.solide-geste [role="button"].solide-cliquable')
];
const point = (root: Element, name: string) =>
	points(root).find((p) => p.getAttribute('aria-label')?.startsWith(`Point ${name}`))!;
const button = (root: Element, name: string) =>
	[...root.querySelectorAll<HTMLButtonElement>('.solide-geste button')].find(
		(b) => b.textContent?.trim() === name
	);
const studentArrow = (root: Element) => root.querySelectorAll('.solide-fleche-eleve');

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

const locked = (value: string, isCorrect: boolean | null) => ({
	value,
	isCorrect,
	disabled: true,
	onChange: () => {}
});

describe('SolideGeste — points cliquables', () => {
	it('les sommets nommés sont des boutons « Point X » ; le nom du solide jamais dit', async () => {
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: free(), answer: answerProbe().answer() }
		});
		const root = screen.container;
		expect(points(root).map((p) => p.getAttribute('aria-label'))).toEqual([
			'Point A',
			'Point B',
			'Point C',
			'Point D',
			'Point E',
			'Point F',
			'Point G',
			'Point H'
		]);
		const label = root.querySelector('svg')?.getAttribute('aria-label') ?? '';
		expect(label).not.toMatch(/cube/i);
		expect(button(root, 'Origine')).toBeDefined();
		expect(button(root, 'Extrémité')).toBeDefined();
	});

	it('les points déclarés (points:) sont cliquables après les sommets', async () => {
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: {
				node: node(...CUBE, 'points: I milieu CG', 'tracer: vecteur AB + AD + 1/2 AE depuis A'),
				answer: answerProbe().answer()
			}
		});
		const labels = points(screen.container).map((p) => p.getAttribute('aria-label'));
		// A, l'origine imposée, n'est pas à toucher
		expect(labels).toHaveLength(8);
		expect(labels[0]).toBe('Point B');
		expect(labels[7]).toBe('Point I');
	});
});

describe('SolideGeste — origine libre', () => {
	it('origine puis extrémité : la réponse A/C, la flèche dessinée', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: free(), answer: answer() }
		});
		const root = screen.container;
		expect(studentArrow(root)).toHaveLength(0);
		await userEvent.click(point(root, 'A'));
		await expect.poll(() => probe.value).toBe('A/');
		expect(studentArrow(root)).toHaveLength(0);
		await userEvent.click(point(root, 'C'));
		await expect.poll(() => probe.value).toBe('A/C');
		expect(probe.changes).toEqual(['A/', 'A/C']);
		await expect.poll(() => studentArrow(root).length).toBeGreaterThan(0);
		expect(point(root, 'A').getAttribute('aria-pressed')).toBe('true');
		expect(point(root, 'B').getAttribute('aria-pressed')).toBe('false');
	});

	it('la flèche se lit : par-dessus les points, extrémité sans disque, trait fin des points', async () => {
		// Vu au rendu : un disque bleu à l'extrémité cachait la pointe, et le point choisi
		// sans stroke-width prenait 1 unité du viewBox (1 cm) de contour, disque géant
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: free(), answer: answerProbe('A/C').answer() }
		});
		const svg = screen.container.querySelector('svg')!;
		await expect.poll(() => studentArrow(svg).length).toBeGreaterThan(0);
		const arrow = studentArrow(svg)[0];
		const circles = [...svg.querySelectorAll('circle')];
		const last = circles[circles.length - 1];
		expect(last.compareDocumentPosition(arrow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		const chosen = [...svg.querySelectorAll<SVGCircleElement>('.solide-choisi')];
		expect(chosen).toHaveLength(1);
		expect(parseFloat(getComputedStyle(chosen[0]).strokeWidth)).toBeLessThan(0.1);
	});

	it('les zones de toucher ne se chevauchent pas, même sur un pavé aplati', async () => {
		// Revue de #2339 : sur `pave 6 1 1`, E et H sont à 0,3 cm à l'écran ; des zones de
		// 0,45 cm se chevauchaient et la dernière dessinée prenait le toucher
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: {
				node: node('forme: pave 6 1 1', 'sommets: A B C D E F G H', 'tracer: vecteur AB'),
				answer: answerProbe().answer()
			}
		});
		const zones = points(screen.container).map((p) => ({
			x: Number(p.getAttribute('cx')),
			y: Number(p.getAttribute('cy')),
			r: Number(p.getAttribute('r'))
		}));
		expect(zones).toHaveLength(8);
		for (let i = 0; i < zones.length; i++) {
			for (let j = i + 1; j < zones.length; j++) {
				const d = Math.hypot(zones[i].x - zones[j].x, zones[i].y - zones[j].y);
				expect(d + 1e-9).toBeGreaterThanOrEqual(zones[i].r + zones[j].r);
			}
		}
	});

	it('origine imposée : son disque garde un trait fin', async () => {
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: imposed(), answer: answerProbe().answer() }
		});
		const origin = screen.container.querySelector<SVGCircleElement>('.solide-origine')!;
		expect(parseFloat(getComputedStyle(origin).strokeWidth)).toBeLessThan(0.1);
	});

	it('le bouton « Origine » reprend l’origine ; « Extrémité » l’extrémité', async () => {
		const { probe, answer } = answerProbe('A/C');
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: free(), answer: answer() }
		});
		const root = screen.container;
		await userEvent.click(button(root, 'Origine')!);
		await userEvent.click(point(root, 'B'));
		await expect.poll(() => probe.value).toBe('B/C');
		await userEvent.click(button(root, 'Extrémité')!);
		await userEvent.click(point(root, 'D'));
		await expect.poll(() => probe.value).toBe('B/D');
	});

	it('même point deux fois : pas de flèche', async () => {
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: free(), answer: answerProbe('A/A').answer() }
		});
		expect(studentArrow(screen.container)).toHaveLength(0);
	});

	it('un point au clavier (Espace) ; « Effacer » vide la case', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: free(), answer: answer() }
		});
		const root = screen.container;
		point(root, 'B').focus();
		await userEvent.keyboard(' ');
		await expect.poll(() => probe.value).toBe('B/');
		await userEvent.click(button(root, 'Effacer')!);
		await expect.poll(() => probe.value).toBe('');
	});

	it('le cadre, le dessin et les noms ne donnent aucune réponse', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: free(), answer: answer() }
		});
		const root = screen.container;
		await userEvent.click(root.querySelector('svg')!, { position: { x: 2, y: 2 } });
		expect(probe.changes).toEqual([]);
		expect(root.querySelector('.solide-correction')).toBeNull();
		expect(root.querySelector('.solide-fleche-juste')).toBeNull();
		expect(root.textContent).not.toMatch(/A\/C|Correction/);
	});
});

describe('SolideGeste — origine imposée', () => {
	it('A posée d’office, seul « Extrémité » ; la réponse commence par A/', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: imposed(), answer: answer() }
		});
		const root = screen.container;
		expect(button(root, 'Origine')).toBeUndefined();
		expect(button(root, 'Extrémité')).toBeDefined();
		// Rien n'est émis tant que l'élève n'a rien touché
		expect(probe.changes).toEqual([]);
		expect(point(root, 'A')).toBeUndefined();
		await userEvent.click(point(root, 'C'));
		await expect.poll(() => probe.value).toBe('A/C');
		await expect.poll(() => studentArrow(root).length).toBeGreaterThan(0);
	});
});

describe('SolideGeste — après validation', () => {
	it('juste : cadre vert, pas de correction', async () => {
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: free(), answer: locked('B/D', true) }
		});
		const root = screen.container;
		expect(root.querySelector('.solide-juste')).not.toBeNull();
		expect(root.querySelector('.solide-correction')).toBeNull();
		expect(points(root)[0].getAttribute('aria-disabled')).toBe('true');
	});

	it('mauvais sens : la phrase et la flèche juste en vert', async () => {
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: free(), answer: locked('C/A', false) }
		});
		const root = screen.container;
		expect(root.textContent).toContain('Ta flèche va dans le mauvais sens.');
		expect(root.querySelector('.solide-faux')).not.toBeNull();
		const correction = root.querySelector('.solide-correction')!;
		expect(correction.querySelectorAll('.solide-fleche-juste').length).toBeGreaterThan(0);
		expect(correction.querySelectorAll('.solide-fleche-eleve')).toHaveLength(0);
	});

	it('autre vecteur : « Ta flèche représente … » avec la formule rendue', async () => {
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: free(), answer: locked('A/B', false) }
		});
		const text = screen.container.textContent ?? '';
		expect(text).toContain('Ta flèche représente');
		expect(text).not.toContain('$');
	});

	it('origine imposée, rien posé : « Il faut placer l’extrémité. »', async () => {
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: imposed(), answer: locked('', false) }
		});
		expect(screen.container.textContent).toContain('Il faut placer l’extrémité.');
	});

	it('origine libre, rien posé : « Il faut placer l’origine et l’extrémité. »', async () => {
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: free(), answer: locked('', false) }
		});
		expect(screen.container.textContent).toContain('Il faut placer l’origine et l’extrémité.');
	});

	it('même point : la phrase', async () => {
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: free(), answer: locked('A/A', false) }
		});
		expect(screen.container.textContent).toContain(
			'Ton origine et ton extrémité sont au même endroit.'
		);
	});

	it('la réponse juste (solution) : la flèche en vert, rien à toucher', async () => {
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: imposed(), solution: true }
		});
		const root = screen.container;
		expect(root.querySelectorAll('.solide-fleche-juste').length).toBeGreaterThan(0);
		expect(root.querySelector('.solide-correction')).toBeNull();
		expect(button(root, 'Effacer')).toBeUndefined();
	});
});

describe('hors question, dans une question, dans la copie corrigée', () => {
	it('hors question (cours, aperçu) : le geste, rien de jugé', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: {
				content: ['```solide', ...CUBE, 'tracer: vecteur AB + AD', '```'].join(
					'\n'
				) as ResolvedMarkdown
			}
		});
		const root = screen.container;
		expect(points(root)).toHaveLength(8);
		await userEvent.click(point(root, 'A'));
		await userEvent.click(point(root, 'C'));
		await expect.poll(() => studentArrow(root).length).toBeGreaterThan(0);
		expect(root.textContent).not.toContain('Correction');
	});

	it('décor de la prod : la question générée remplit sa case', async () => {
		const generated = generateInstance(
			{
				id: 'test-solide',
				title: 'Solide',
				status: 'draft',
				variations: [
					{
						statement: templateMarkdown(
							[
								'Trace le vecteur AB + AD depuis A.',
								'',
								'```solide',
								...CUBE,
								'tracer: vecteur AB + AD depuis A',
								'```'
							].join('\n')
						)
					}
				],
				grades: ['CM1'],
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
		await userEvent.click(point(screen.container, 'C'));
		await expect.poll(() => values[0]).toBe('A/C');
	});

	it('copie corrigée (BuildAnswer) : la flèche de l’élève, la phrase et la juste', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'solide',
				source: [...CUBE, 'tracer: vecteur AB + AD depuis A'].join('\n'),
				answer: 'A/B',
				status: 'incorrect'
			}
		});
		const root = screen.container;
		expect(root.querySelectorAll('.solide-fleche-eleve').length).toBeGreaterThan(0);
		expect(root.textContent).toContain('Ta flèche représente');
		expect(root.querySelectorAll('.solide-correction .solide-fleche-juste').length).toBeGreaterThan(
			0
		);
		expect(button(root, 'Effacer')).toBeUndefined();
	});

	it('bonne réponse (BuildAnswer, status solution) : la flèche juste', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'solide',
				source: [...CUBE, 'tracer: vecteur AB + AD depuis A'].join('\n'),
				answer: null,
				status: 'solution'
			}
		});
		expect(screen.container.querySelectorAll('.solide-fleche-juste').length).toBeGreaterThan(0);
	});
});
