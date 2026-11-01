/**
 * Horloge à placer à l'écran (chantier `docs/wip/reponses-a-placer-progress.md` § 13, 14)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import HorlogePlacer from '../HorlogePlacer.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
import BuildAnswer from '$lib/components/questions/BuildAnswer.svelte';
import { parseHorlogeContent } from '$lib/ubumark/parser/horloge-parser';
import type { ResolvedMarkdown } from '$lib/ubumark';
import type { InstanceBlank, QuestionTemplate } from '$lib/questions/types';
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

const node = (...lines: string[]) => parseHorlogeContent(lines.join('\n'));

const dial = (root: Element) => root.querySelector<SVGSVGElement>('svg[role="slider"]')!;

const button = (root: Element, name: string) => {
	const found = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
		(b) => b.getAttribute('aria-label') === name || b.textContent?.trim() === name
	);
	if (!found) throw new Error(`bouton « ${name} » introuvable`);
	return found;
};

/** Toucher le cadran au cran `tick` (0 = le 12), à mi-rayon, comme un doigt */
function tapAt(root: Element, tick: number) {
	const rect = dial(root).getBoundingClientRect();
	const angle = (tick * 6 * Math.PI) / 180;
	const r = rect.width / 4;
	const init = {
		bubbles: true,
		clientX: rect.left + rect.width / 2 + Math.sin(angle) * r,
		clientY: rect.top + rect.height / 2 - Math.cos(angle) * r,
		pointerId: 1
	};
	dial(root).dispatchEvent(new PointerEvent('pointerdown', init));
	dial(root).dispatchEvent(new PointerEvent('pointerup', init));
}

/** Aiguilles dessinées : en attente (pointillés) ou posées */
const waiting = (root: Element) =>
	dial(root).querySelectorAll('line.horloge-aiguille-attente').length;

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

describe('Horloge à placer — le geste', () => {
	it('au départ, deux aiguilles en attente ; toucher pose la grande, puis la petite devient active', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(HorlogePlacer, {
			target: mainElement(),
			props: { node: node('placer: 9 h 25'), answer: answer() }
		});
		const root = screen.container;
		expect(waiting(root)).toBe(2);
		expect(dial(root).getAttribute('aria-valuetext')).toBe('grande aiguille pas placée');
		tapAt(root, 25);
		await expect.poll(() => probe.value).toBe('- 25');
		await expect.poll(() => waiting(root)).toBe(1);
		await expect
			.poll(() => dial(root).getAttribute('aria-valuetext'))
			.toBe('petite aiguille pas placée');
		tapAt(root, 47);
		await expect.poll(() => probe.value).toBe('47 25');
		expect(waiting(root)).toBe(0);
		await expect
			.poll(() => dial(root).getAttribute('aria-valuetext'))
			.toBe('petite aiguille entre le 9 et le 10');
	});

	it('toucher une aiguille posée la reprend', async () => {
		const { probe, answer } = answerProbe('47 25');
		const screen = await render(HorlogePlacer, {
			target: mainElement(),
			props: { node: node('placer: 9 h 25'), answer: answer() }
		});
		const root = screen.container;
		// Grande aiguille active ; le doigt près de la petite (cran 46) la reprend
		tapAt(root, 46);
		await expect.poll(() => probe.value).toBe('46 25');
	});

	it('étiquettes et ◀ ▶ : un cran de l’aiguille choisie', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(HorlogePlacer, {
			target: mainElement(),
			props: { node: node('placer: 9 h'), answer: answer() }
		});
		const root = screen.container;
		await userEvent.click(button(root, 'petite aiguille'));
		await userEvent.click(button(root, 'Avancer la petite aiguille d’une minute'));
		await userEvent.click(button(root, 'Avancer la petite aiguille d’une minute'));
		await userEvent.click(button(root, 'Reculer la petite aiguille d’une minute'));
		expect(probe.changes).toEqual(['1 -', '2 -', '1 -']);
	});

	it('la légende s’affiche sous le cadran, comme au PDF', async () => {
		const { answer } = answerProbe();
		const screen = await render(HorlogePlacer, {
			target: mainElement(),
			props: { node: node('placer: 9 h', 'légendes: Départ'), answer: answer() }
		});
		expect(screen.container.querySelector('.horloge-legende')?.textContent).toBe('Départ');
	});

	it('jamais l’heure attendue dans le DOM', async () => {
		const { answer } = answerProbe();
		const screen = await render(HorlogePlacer, {
			target: mainElement(),
			props: { node: node('placer: 9 h 25'), answer: answer() }
		});
		const html = screen.container.innerHTML;
		expect(html).not.toMatch(/9 h 25|9h25|25 min/);
	});

	it('hors question (cours, aperçu) : le cadran à placer, rien de jugé', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: { content: ['```horloge', 'placer: 9 h', '```'].join('\n') as ResolvedMarkdown }
		});
		expect(dial(screen.container)).not.toBeNull();
		expect(screen.container.textContent).not.toContain('Correction');
	});
});

describe('FillBlanksInput — horloge à placer', () => {
	const STATEMENT = ['Place 9 h 45.', '', '```horloge', 'case: 0', 'placer: 9 h 45', '```'].join(
		'\n'
	) as ResolvedMarkdown;
	const blanks: InstanceBlank[] = [
		{ type: 'text', expectedAnswer: '9 h 45', expectedAnswerLatex: '9 h 45', construire: 'horloge' }
	];

	it('décor de la prod : la question générée remplit sa case', async () => {
		const generated = generateInstance(
			{
				id: 'test-horloge',
				title: 'Placer',
				status: 'draft',
				variations: [
					{
						statement: templateMarkdown(
							['Place 3 h.', '', '```horloge', 'placer: 3 h', '```'].join('\n')
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
		tapAt(screen.container, 0);
		await expect.poll(() => values[0]).toBe('- 0');
	});

	it('correction : la phrase de l’erreur type et le cadran juste', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement: STATEMENT,
				blanks,
				values: ['45 45'],
				disabled: true,
				validationResults: [false]
			}
		});
		expect(screen.container.textContent).toContain('La petite aiguille est pile sur le 9');
		expect(screen.container.querySelector('.placer-correction')).not.toBeNull();
	});

	it('bonne réponse affichée : le cadran à l’heure juste, sans boutons', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: STATEMENT, blanks, showCorrectAnswers: true, validationResults: [] }
		});
		const root = screen.container;
		expect(root.querySelector('svg[role="slider"]')).toBeNull();
		expect(root.querySelectorAll('line.horloge-aiguille')).toHaveLength(2);
	});
});

describe('BuildAnswer — horloge à placer', () => {
	it('copie corrigée : les aiguilles de l’élève, verrouillées, sans boutons', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: { kind: 'horloge', source: 'placer: 9 h', answer: '45 0', status: 'correct' }
		});
		const root = screen.container;
		expect(dial(root).getAttribute('aria-disabled')).toBe('true');
		expect(root.querySelector('button')).toBeNull();
		expect(root.querySelector('.placer-juste')).not.toBeNull();
	});
});

describe('Horloge à placer — trotteuse (chantier cercle-trotteuse)', () => {
	it('trois aiguilles en attente ; grande, puis petite, puis trotteuse', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(HorlogePlacer, {
			target: mainElement(),
			props: { node: node('placer: 9 h 25 min 40 s'), answer: answer() }
		});
		const root = screen.container;
		expect(waiting(root)).toBe(3);
		expect(button(root, 'trotteuse')).toBeDefined();
		tapAt(root, 25);
		await expect.poll(() => probe.value).toBe('- 25 -');
		tapAt(root, 47);
		await expect.poll(() => probe.value).toBe('47 25 -');
		await expect.poll(() => dial(root).getAttribute('aria-valuetext')).toBe('trotteuse pas placée');
		tapAt(root, 40);
		await expect.poll(() => probe.value).toBe('47 25 40');
		expect(waiting(root)).toBe(0);
		expect(dial(root).getAttribute('aria-valuetext')).toBe('trotteuse sur la seconde 40');
	});

	it('◀ ▶ de la trotteuse : d’une seconde', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(HorlogePlacer, {
			target: mainElement(),
			props: { node: node('placer: 9 h 0 min 5 s'), answer: answer() }
		});
		const root = screen.container;
		await userEvent.click(button(root, 'trotteuse'));
		await userEvent.click(button(root, 'Avancer la trotteuse d’une seconde'));
		expect(probe.changes).toEqual(['- - 1']);
	});

	it('sans secondes : deux étiquettes seulement', async () => {
		const { answer } = answerProbe();
		const screen = await render(HorlogePlacer, {
			target: mainElement(),
			props: { node: node('placer: 9 h 25'), answer: answer() }
		});
		const labels = [...screen.container.querySelectorAll('.placer-etiquette')].map((b) =>
			b.textContent?.trim()
		);
		expect(labels).toEqual(['petite aiguille', 'grande aiguille']);
	});

	it('jamais l’heure attendue dans le DOM, secondes comprises', async () => {
		const { answer } = answerProbe();
		const screen = await render(HorlogePlacer, {
			target: mainElement(),
			props: { node: node('placer: 9 h 25 min 40 s'), answer: answer() }
		});
		expect(screen.container.innerHTML).not.toMatch(/40 s|25 min|9 h 25/);
	});

	it('cours : une horloge à lire à secondes dessine la trotteuse', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: {
				content: ['```horloge', 'heure: 9 h 25 min 40 s', '```'].join('\n') as ResolvedMarkdown
			}
		});
		await expect
			.poll(() => screen.container.querySelectorAll('line.horloge-aiguille-secondes').length)
			.toBe(1);
	});
});
