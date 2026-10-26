/**
 * Bloc ```monnaie à construire à l'écran (phase 0 : `docs/wip/construire-progress.md` § 3, 4 bis, 6)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import Monnaie from '../Monnaie.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
import { parseMonnaieContent } from '$lib/ubumark/parser/monnaie-parser';
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

const node = (...lines: string[]) => parseMonnaieContent(lines.join('\n'));

const button = (root: Element, name: string) => {
	const found = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
		(b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === name
	);
	if (!found) throw new Error(`bouton « ${name} » introuvable`);
	return found;
};

const plan = (root: Element) => root.querySelector<SVGSVGElement>('svg.construire-plan')!;
/** Valeurs posées sur le plan, dans l'ordre de lecture (`10 €`, `2 €`) */
const placed = (root: Element) =>
	[...plan(root).querySelectorAll('.monnaie-objet')].map(
		(g) => g.querySelector('text')?.textContent ?? ''
	);

/** Cliquer au centre d'une coupure du plan, comme un doigt */
function tap(svg: SVGSVGElement, el: Element) {
	const box = el.getBoundingClientRect();
	svg.dispatchEvent(
		new MouseEvent('click', {
			bubbles: true,
			clientX: box.left + box.width / 2,
			clientY: box.top + box.height / 2
		})
	);
}

/** Réponse de la case, relevée à chaque changement */
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

describe('Monnaie à construire — le geste (Q1, Q2)', () => {
	it('plan vide, réserve par défaut ; toucher la réserve pose une coupure, rangée d’office', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(Monnaie, {
			target: mainElement(),
			props: { node: node('construire: 35'), answer: answer() }
		});
		const root = screen.container;
		expect(placed(root)).toEqual([]);
		for (const name of [
			'Ajouter un billet de 50 €',
			'Ajouter un billet de 20 €',
			'Ajouter un billet de 10 €',
			'Ajouter un billet de 5 €',
			'Ajouter une pièce de 2 €',
			'Ajouter une pièce de 1 €'
		]) {
			expect(button(root, name)).toBeTruthy();
		}
		expect(root.querySelector('button[aria-label="Ajouter un billet de 100 €"]')).toBeNull();
		await userEvent.click(button(root, 'Ajouter une pièce de 2 €'));
		await userEvent.click(button(root, 'Ajouter un billet de 10 €'));
		await userEvent.click(button(root, 'Ajouter un billet de 20 €'));
		expect(placed(root)).toEqual(['20 €', '10 €', '2 €']);
		expect(probe.changes).toEqual(['2', '12', '32']);
	});

	it('réserve donnée : ses coupures seulement', async () => {
		const screen = await render(Monnaie, {
			target: mainElement(),
			props: { node: node('construire: 35', 'réserve: 10 5') }
		});
		const labels = [...screen.container.querySelectorAll('button[aria-label^="Ajouter"]')].map(
			(b) => b.getAttribute('aria-label')
		);
		expect(labels).toEqual(['Ajouter un billet de 10 €', 'Ajouter un billet de 5 €']);
	});

	it('toucher une coupure posée l’enlève ; « Enlever » au clavier aussi', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(Monnaie, {
			target: mainElement(),
			props: { node: node('construire: 35'), answer: answer() }
		});
		const root = screen.container;
		await userEvent.click(button(root, 'Ajouter un billet de 10 €'));
		await userEvent.click(button(root, 'Ajouter une pièce de 2 €'));
		await userEvent.click(button(root, 'Ajouter une pièce de 1 €'));
		tap(plan(root), plan(root).querySelector('.monnaie-billet')!);
		await expect.poll(() => placed(root)).toEqual(['2 €', '1 €']);
		expect(probe.value).toBe('3');
		await userEvent.click(button(root, 'Enlever une pièce de 2 €'));
		expect(placed(root)).toEqual(['1 €']);
		expect(probe.value).toBe('1');
	});

	it('« Tout enlever » : plan vide, réponse vide (Q6)', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(Monnaie, {
			target: mainElement(),
			props: { node: node('construire: 35'), answer: answer() }
		});
		const root = screen.container;
		await userEvent.click(button(root, 'Ajouter une pièce de 1 €'));
		await userEvent.click(button(root, 'Tout enlever'));
		expect(placed(root)).toEqual([]);
		expect(probe.value).toBe('');
	});

	it('jamais la somme affichée pendant la construction (Q3)', async () => {
		const screen = await render(Monnaie, {
			target: mainElement(),
			props: { node: node('construire: 35') }
		});
		const root = screen.container;
		await userEvent.click(button(root, 'Ajouter un billet de 20 €'));
		await userEvent.click(button(root, 'Ajouter un billet de 10 €'));
		await userEvent.click(button(root, 'Ajouter un billet de 5 €'));
		expect(root.textContent ?? '').not.toMatch(/35/);
		expect(plan(root).getAttribute('aria-label') ?? '').not.toMatch(/\d/);
	});

	it('plafond : au-delà de 100 €, le bouton se grise', async () => {
		const screen = await render(Monnaie, {
			target: mainElement(),
			props: { node: node('construire: 35') }
		});
		const root = screen.container;
		await userEvent.click(button(root, 'Ajouter un billet de 50 €'));
		await userEvent.click(button(root, 'Ajouter un billet de 20 €'));
		await userEvent.click(button(root, 'Ajouter un billet de 20 €'));
		expect(button(root, 'Ajouter un billet de 20 €').disabled).toBe(true);
		expect(button(root, 'Ajouter un billet de 10 €').disabled).toBe(false);
	});

	it('verrouillé (après validation) : ni ajout ni retrait', async () => {
		const screen = await render(Monnaie, {
			target: mainElement(),
			props: {
				node: node('construire: 35'),
				answer: { value: '35', isCorrect: true, disabled: true, onChange: () => {} }
			}
		});
		expect(button(screen.container, 'Ajouter une pièce de 1 €').disabled).toBe(true);
		expect(button(screen.container, 'Tout enlever').disabled).toBe(true);
	});
});

describe('Monnaie à construire — correction (Q8)', () => {
	it('fausse : la construction de l’élève, sa somme, une construction juste à côté', async () => {
		const screen = await render(Monnaie, {
			target: mainElement(),
			props: {
				node: node('construire: 35'),
				answer: { value: '32', isCorrect: false, disabled: true, onChange: () => {} }
			}
		});
		const root = screen.container;
		expect(root.textContent).toContain('Tu as posé 32 €.');
		const solution = root.querySelector('.construire-correction svg')!;
		expect(
			[...solution.querySelectorAll('.monnaie-objet')].map(
				(g) => g.querySelector('text')?.textContent
			)
		).toEqual(['20 €', '10 €', '5 €']);
		expect(root.querySelector('[role="status"]')?.textContent).toMatch(/réponse fausse/);
	});

	it('la construction juste suit la réserve : 6 € avec 2 et 5 € = 3 pièces de 2 €', async () => {
		const screen = await render(Monnaie, {
			target: mainElement(),
			props: {
				node: node('construire: 6', 'réserve: 2 5'),
				answer: { value: '5', isCorrect: false, disabled: true, onChange: () => {} }
			}
		});
		const solution = screen.container.querySelector('.construire-correction svg')!;
		expect(solution.querySelectorAll('.monnaie-piece')).toHaveLength(3);
		expect(solution.querySelectorAll('.monnaie-billet')).toHaveLength(0);
	});

	it('vide et fausse : « Tu n’as rien posé. »', async () => {
		const screen = await render(Monnaie, {
			target: mainElement(),
			props: {
				node: node('construire: 35'),
				answer: { value: '', isCorrect: false, disabled: true, onChange: () => {} }
			}
		});
		expect(screen.container.textContent).toContain('Tu n’as rien posé.');
	});

	it('juste : pas de correction', async () => {
		const screen = await render(Monnaie, {
			target: mainElement(),
			props: {
				node: node('construire: 35'),
				answer: { value: '35', isCorrect: true, disabled: true, onChange: () => {} }
			}
		});
		expect(screen.container.querySelector('.construire-correction')).toBeNull();
		expect(screen.container.textContent).not.toContain('Tu as posé');
	});
});

describe('Monnaie à construire — hors question', () => {
	it('aperçu du prof (MarkdownRenderer) : le même geste, rien de jugé', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: { content: '```monnaie\nconstruire: 35\n```' as ResolvedMarkdown }
		});
		const root = screen.container;
		await userEvent.click(button(root, 'Ajouter une pièce de 2 €'));
		expect(placed(root)).toEqual(['2 €']);
	});

	it('une monnaie à lire reste inchangée (pas de réserve)', async () => {
		const screen = await render(Monnaie, {
			target: mainElement(),
			props: { node: node('billets: 10', 'pièces: 2') }
		});
		expect(screen.container.querySelector('.construire-plan')).toBeNull();
		expect(screen.container.querySelectorAll('.monnaie-objet')).toHaveLength(2);
	});
});

describe('FillBlanksInput — bloc ```monnaie à construire', () => {
	const STATEMENT = ['Paie 35 €.', '', '```monnaie', 'case: 0', 'construire: 35', '```'].join(
		'\n'
	) as ResolvedMarkdown;
	const blanks: InstanceBlank[] = [
		{ type: 'math', expectedAnswer: '35', expectedAnswerLatex: '35', construire: 'monnaie' }
	];

	it('décor de la prod : la question générée, construite, remplit sa case', async () => {
		const generated = generateInstance(
			{
				id: 'test-construire-monnaie',
				title: 'Payer',
				status: 'draft',
				variations: [
					{
						statement: templateMarkdown(
							'Paie le ballon à 35 €.\n\n```monnaie\nréserve: 20 10 5 2 1\n\nconstruire: 35\n```'
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
		for (let i = 0; i < 3; i++) await userEvent.click(button(root, 'Ajouter un billet de 10 €'));
		await userEvent.click(button(root, 'Ajouter une pièce de 2 €'));
		await userEvent.click(button(root, 'Ajouter une pièce de 2 €'));
		await userEvent.click(button(root, 'Ajouter une pièce de 1 €'));
		expect(values[0]).toBe('35');
	});

	it('correction : la construction de l’élève et une construction juste', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement: STATEMENT,
				blanks,
				values: ['32'],
				disabled: true,
				validationResults: [false]
			}
		});
		expect(screen.container.textContent).toContain('Tu as posé 32 €.');
		expect(screen.container.querySelector('.construire-correction')).not.toBeNull();
	});

	it('bonne réponse affichée : une construction juste, sans réserve', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: STATEMENT, blanks, showCorrectAnswers: true, validationResults: [] }
		});
		const root = screen.container;
		expect(
			[...root.querySelectorAll('.monnaie-objet')].map((g) => g.querySelector('text')?.textContent)
		).toEqual(['20 €', '10 €', '5 €']);
		expect(root.querySelector('button[aria-label="Ajouter une pièce de 1 €"]')).toBeNull();
	});

	it('Entrée, plan vide : le focus va sur la réserve, pas de validation', async () => {
		let submitted = 0;
		const statement = [
			'Mot : {{blank:0}}',
			'',
			'```monnaie',
			'case: 1',
			'construire: 35',
			'```'
		].join('\n') as ResolvedMarkdown;
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement,
				blanks: [{ type: 'text', expectedAnswer: 'trente' }, ...blanks],
				validationResults: [],
				onSubmit: () => submitted++
			}
		});
		const text = screen.container.querySelector<HTMLInputElement>('input[type="text"]')!;
		await userEvent.click(text);
		await userEvent.keyboard('trente{Enter}');
		expect(submitted).toBe(0);
		expect(document.activeElement).toBe(button(screen.container, 'Ajouter un billet de 50 €'));
	});
});
