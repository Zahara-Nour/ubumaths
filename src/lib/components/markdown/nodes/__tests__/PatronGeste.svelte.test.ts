/**
 * Patron à geste à l'écran (```patron + `designer:` / `completer:`, chantier
 * `solides`, `docs/wip/solides-progress.md` § 10) : toucher des faces, poser les
 * faces manquantes, noms accessibles, correction.
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import PatronGeste from '../PatronGeste.svelte';
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

const node = (...lines: string[]) => parseEspaceContent(lines.join('\n'), 'patron');

const faces = (root: Element) => [
	...root.querySelectorAll<SVGPolygonElement>('.patron-geste polygon.patron-face')
];
const touched = (root: Element) =>
	faces(root).filter((f) => f.getAttribute('aria-pressed') === 'true');
const spots = (root: Element) => [
	...root.querySelectorAll<SVGRectElement>('.patron-geste .patron-emplacement')
];
const placedFaces = (root: Element) => [
	...root.querySelectorAll<SVGRectElement>('.placer-zone .patron-carre.patron-touchee')
];

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

describe('designer: — toucher des faces', () => {
	const opposee = () => node('solide: cube', 'forme: 1', 'marquer: face 1', 'designer: opposee');

	it('le patron, six faces à toucher, la face grise ; jamais « patron » ni « cube »', async () => {
		const screen = await render(PatronGeste, {
			target: mainElement(),
			props: { node: opposee(), answer: answerProbe().answer() }
		});
		const root = screen.container;
		expect(faces(root)).toHaveLength(6);
		expect(touched(root)).toHaveLength(0);
		expect(root.querySelectorAll('.patron-face-marquee')).toHaveLength(1);
		const label = root.querySelector('svg')?.getAttribute('aria-label') ?? '';
		expect(label).toMatch(/^Assemblage de polygones à plier/);
		expect(label).not.toMatch(/patron|cube/i);
	});

	it('toucher une face la sélectionne, la retoucher la désélectionne ; plusieurs possibles', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(PatronGeste, {
			target: mainElement(),
			props: { node: opposee(), answer: answer() }
		});
		const root = screen.container;
		await userEvent.click(faces(root)[5]);
		await expect.poll(() => probe.value).toBe('6');
		await userEvent.click(faces(root)[2]);
		await expect.poll(() => probe.value).toBe('3,6');
		await userEvent.click(faces(root)[5]);
		await expect.poll(() => probe.value).toBe('3');
	});

	it('chaque face est un bouton à bascule « Face N » ; Espace la bascule', async () => {
		const { probe, answer } = answerProbe('2');
		const screen = await render(PatronGeste, {
			target: mainElement(),
			props: { node: opposee(), answer: answer() }
		});
		const face = faces(screen.container)[1];
		expect(face.getAttribute('aria-label')).toBe('Face 2, touchée');
		expect(face.getAttribute('aria-pressed')).toBe('true');
		faces(screen.container)[3].focus();
		await userEvent.keyboard(' ');
		await expect.poll(() => probe.value).toBe('2,4');
	});

	it('faux : la phrase et la face juste', async () => {
		const screen = await render(PatronGeste, {
			target: mainElement(),
			props: { node: opposee(), answer: locked('3', false) }
		});
		const root = screen.container;
		expect(root.textContent).toContain('Ce n’est pas la face opposée à la face grise.');
		const correction = root.querySelector('.patron-correction')!;
		const wanted = [...correction.querySelectorAll('polygon.patron-touchee')];
		expect(wanted).toHaveLength(1);
		expect(wanted[0].getAttribute('aria-label')).toBe('Face 6, touchée');
		expect(faces(root)[0].getAttribute('aria-disabled')).toBe('true');
	});

	it('juste : cadre vert, pas de correction', async () => {
		const screen = await render(PatronGeste, {
			target: mainElement(),
			props: { node: opposee(), answer: locked('6', true) }
		});
		expect(screen.container.querySelector('.placer-juste')).not.toBeNull();
		expect(screen.container.querySelector('.patron-correction')).toBeNull();
	});
});

describe('completer: — poser la face manquante', () => {
	const completer = () => node('solide: cube', 'forme: 1', 'completer: 5');

	it('cinq faces données, des emplacements en pointillés, « Faces à poser : 1 »', async () => {
		const screen = await render(PatronGeste, {
			target: mainElement(),
			props: { node: completer(), answer: answerProbe().answer() }
		});
		const root = screen.container;
		expect(root.querySelectorAll('.patron-carre')).toHaveLength(5);
		expect(spots(root).length).toBeGreaterThan(4);
		expect(root.textContent).toContain('Faces à poser : 1');
		expect(spots(root)[0].getAttribute('aria-label')).toMatch(
			/^Emplacement rangée \d, colonne \d, vide$/
		);
	});

	it('toucher un emplacement y pose une face ; plus d’emplacement ensuite ; la retoucher la retire', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(PatronGeste, {
			target: mainElement(),
			props: { node: completer(), answer: answer() }
		});
		const root = screen.container;
		const left = spots(root).find((s) =>
			s.getAttribute('aria-label')?.includes('rangée 3, colonne 1')
		)!;
		await userEvent.click(left);
		await expect.poll(() => probe.value).toBe('000000/001000/211100/001000/000000');
		await expect.poll(() => spots(root)).toHaveLength(0);
		expect(root.textContent).toContain('Faces à poser : 0');
		await userEvent.click(placedFaces(root)[0]);
		await expect.poll(() => probe.value).toBe('');
	});

	it('faux : la raison, une solution, « d’autres réponses justes »', async () => {
		const screen = await render(PatronGeste, {
			target: mainElement(),
			props: { node: completer(), answer: locked('000000/021000/011100/001000/000000', false) }
		});
		const root = screen.container;
		expect(root.textContent).toContain(
			'Ces faces ne se plient pas en cube : deux faces se recouvrent.'
		);
		expect(root.textContent).toContain('Il y a d’autres réponses justes.');
		expect(root.querySelector('.patron-correction .patron-touchee')).not.toBeNull();
		expect(spots(root)).toHaveLength(0);
	});
});

describe('hors question, dans une question, dans la copie corrigée', () => {
	it('hors question (cours, aperçu) : le geste, rien de jugé', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: {
				content: ['```patron', 'solide: cube', 'designer: face EFGH', '```'].join(
					'\n'
				) as ResolvedMarkdown
			}
		});
		expect(faces(screen.container)).toHaveLength(6);
		expect(screen.container.textContent).not.toContain('Correction');
	});

	it('hors question, completer: poser une face marche aussi', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: {
				content: ['```patron', 'solide: cube', 'forme: 1', 'completer: 5', '```'].join(
					'\n'
				) as ResolvedMarkdown
			}
		});
		const root = screen.container;
		expect(spots(root).length).toBeGreaterThan(0);
		await userEvent.click(spots(root)[0]);
		await expect.poll(() => placedFaces(root)).toHaveLength(1);
		expect(root.textContent).toContain('Faces à poser : 0');
	});

	it('décor de la prod : la question générée remplit sa case', async () => {
		const generated = generateInstance(
			{
				id: 'test-patron',
				title: 'Patron',
				status: 'draft',
				variations: [
					{
						statement: templateMarkdown(
							[
								'Touche la face opposée à la face grise.',
								'',
								'```patron',
								'solide: cube',
								'marquer: face 1',
								'designer: opposee',
								'```'
							].join('\n')
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
		await userEvent.click(faces(screen.container)[5]);
		await expect.poll(() => values[0]).toBe('6');
	});

	it('copie corrigée (BuildAnswer) : les faces de l’élève, verrouillées', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'patron',
				source: 'solide: cube\nmarquer: face 1\ndesigner: opposee',
				answer: '2,3',
				status: 'incorrect'
			}
		});
		const root = screen.container;
		const mine = [...root.querySelectorAll('.placer-zone polygon.patron-touchee')];
		expect(mine).toHaveLength(2);
		expect(faces(root)[0].getAttribute('aria-disabled')).toBe('true');
		expect(root.textContent).toContain('Ce n’est pas la face opposée');
	});

	it('copie sans réponse (verso) : la face juste, sans geste', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'patron',
				source: 'solide: cube\ncompleter: 5',
				answer: null,
				status: 'solution'
			}
		});
		const root = screen.container;
		expect(placedFaces(root)).toHaveLength(1);
		expect(root.querySelector('[role="button"]:not([aria-disabled="true"])')).toBeNull();
		expect(spots(root)).toHaveLength(0);
	});
});
