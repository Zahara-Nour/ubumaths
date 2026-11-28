/**
 * FillBlanksInput — case « résolution » (outil 55)
 * ================================================
 *
 * Une case `answerKind: 'resolution'` posée seule dans `$$?$$` : une colonne de lignes
 * MathLive à la place du champ, « Ajouter une ligne », Entrée ajoute une ligne, la croix
 * en retire une. Les lignes partent dans UNE valeur (`3x=12\\x=4`). Une fois validée,
 * chaque ligne porte ✓ ou ✗ ; jamais pendant la saisie (décision de David, 2026-11-28).
 *
 * Rendu dans <main> : décor réel de l'application.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import type { MathfieldElement } from 'mathlive';
import FillBlanksInput from '../FillBlanksInput.svelte';
import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
import type { QuestionInstance, QuestionTemplate } from '#lib/questions/types.ts';
import { templateMarkdown } from '#lib/ubumark/index.ts';

// Variables
let mains: HTMLElement[] = [];

// Functions
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}

afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

function generated(): QuestionInstance {
	const result = generateInstance(
		{
			id: 'test-resolution',
			title: 'Équation',
			status: 'draft',
			type: 'fill_in_blanks',
			variations: [
				{
					statement: templateMarkdown('Résous : $3x-5=7$\n\n$$?$$'),
					blanks: [{ expectedAnswer: 'x=4', answerKind: 'resolution', equation: '3x-5=7' }]
				}
			],
			grades: ['4'],
			level: 1
		} as unknown as QuestionTemplate,
		42
	);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

async function screenOf(
	options: { values?: string[]; validationResults?: (boolean | null)[]; disabled?: boolean } = {}
) {
	const instance = generated();
	const values = options.values ?? [];
	const screen = await render(FillBlanksInput, {
		target: mainElement(),
		props: {
			statement: instance.statement,
			blanks: instance.blanks ?? [],
			values,
			validationResults: options.validationResults ?? [],
			disabled: options.disabled ?? false,
			flashMode: false,
			showCorrectAnswers: false
		}
	});
	return { root: screen.container as HTMLElement, values };
}

function lineFields(root: HTMLElement): MathfieldElement[] {
	return [...root.querySelectorAll<MathfieldElement>('.resolution math-field')];
}

async function waitFor(check: () => boolean, label: string) {
	for (let i = 0; i < 50; i++) {
		if (check()) return;
		await new Promise((resolve) => setTimeout(resolve, 20));
	}
	throw new Error(`attente dépassée : ${label}`);
}

/** Curseur dans le champ, une fois MathLive monté (comme la navigation au clavier) */
async function focus(element: HTMLElement) {
	await expect
		.poll(() => {
			element.focus();
			return document.activeElement === element;
		})
		.toBe(true);
}

function typeInto(field: MathfieldElement, latex: string) {
	field.value = latex;
	field.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
}

describe('case résolution', () => {
	it('une ligne vide au départ, pas de champ à trous', async () => {
		const { root } = await screenOf();
		expect(lineFields(root)).toHaveLength(1);
		expect(root.querySelector('.resolution-ajouter')?.textContent).toContain('Ajouter une ligne');
		// Le bloc $$?$$ ne devient pas un champ à trous
		expect(lineFields(root)[0].getPrompts?.() ?? []).toEqual([]);
	});

	it('deux lignes tapées : UNE valeur, lignes séparées par \\\\', async () => {
		const { root, values } = await screenOf();
		typeInto(lineFields(root)[0], '3x=12');
		await userEvent.click(root.querySelector<HTMLButtonElement>('.resolution-ajouter')!);
		await waitFor(() => lineFields(root).length === 2, 'deuxième ligne');
		typeInto(lineFields(root)[1], 'x=4');
		await waitFor(() => values[0] === '3x=12\\\\x=4', 'valeur de la case');
		expect(values[0]).toBe('3x=12\\\\x=4');
	});

	it('Entrée ajoute une ligne sous la ligne courante', async () => {
		const { root } = await screenOf();
		const first = lineFields(root)[0];
		await focus(first);
		await userEvent.keyboard('3x=12');
		await userEvent.keyboard('{Enter}');
		await waitFor(() => lineFields(root).length === 2, 'ligne ajoutée par Entrée');
		expect(lineFields(root)).toHaveLength(2);
	});

	it('Entrée sur une ligne vide : la question est validée (règle commune)', async () => {
		let submitted = 0;
		const instance = generated();
		const values = ['3x=12\\\\x=4'];
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement: instance.statement,
				blanks: instance.blanks ?? [],
				values,
				validationResults: [],
				onSubmit: () => submitted++
			}
		});
		const root = screen.container as HTMLElement;
		await focus(lineFields(root)[1]);
		await userEvent.keyboard('{Enter}');
		await waitFor(() => lineFields(root).length === 3, 'ligne vide ajoutée');
		await focus(lineFields(root)[2]);
		await userEvent.keyboard('{Enter}');
		await waitFor(() => submitted === 1, 'question validée');
		expect(lineFields(root)).toHaveLength(3);
	});

	it('la croix retire une ligne, et la valeur suit', async () => {
		const { root, values } = await screenOf({ values: ['3x=12\\\\x=4'] });
		expect(lineFields(root)).toHaveLength(2);
		await userEvent.click(
			root.querySelector<HTMLButtonElement>('[aria-label="Retirer la ligne 1"]')!
		);
		await waitFor(() => lineFields(root).length === 1, 'ligne retirée');
		await waitFor(() => values[0] === 'x=4', 'valeur sans la ligne 1');
		expect(values[0]).toBe('x=4');
	});

	it('pendant la saisie : aucune marque', async () => {
		const { root } = await screenOf({ values: ['3x=2\\\\x=4'] });
		expect(root.querySelectorAll('.resolution-marque')).toHaveLength(0);
	});

	it('validée : ✓ puis ✗ à la première ligne fausse, la suite sans marque', async () => {
		const { root } = await screenOf({
			values: ['3x=12\\\\3x=2\\\\x=\\frac{2}{3}'],
			validationResults: [false],
			disabled: true
		});
		const states = [...root.querySelectorAll<HTMLElement>('.resolution-ligne')].map(
			(line) => line.dataset.etat
		);
		expect(states).toEqual(['ok', 'not-equivalent', undefined]);
		expect(root.querySelector('.resolution-ajouter')).toBeNull();
	});
});

describe('case résolution parmi d’autres cases', () => {
	it('Entrée dans une case remplie : le curseur va dans la résolution vide', async () => {
		let submitted = 0;
		const result = generateInstance(
			{
				id: 'test-resolution-deux-cases',
				title: 'Équation',
				status: 'draft',
				type: 'fill_in_blanks',
				variations: [
					{
						statement: templateMarkdown('Combien vaut $2+2$ ? $?$\n\nRésous : $3x-5=7$\n\n$$?$$'),
						blanks: [
							{ expectedAnswer: '4' },
							{ expectedAnswer: 'x=4', answerKind: 'resolution', equation: '3x-5=7' }
						]
					}
				],
				grades: ['4'],
				level: 1
			} as unknown as QuestionTemplate,
			42
		);
		if (!result.success) throw new Error(result.errors.join(' ; '));
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement: result.instance.statement,
				blanks: result.instance.blanks ?? [],
				values: [],
				validationResults: [],
				onSubmit: () => submitted++
			}
		});
		const root = screen.container as HTMLElement;
		const first = [...root.querySelectorAll<MathfieldElement>('math-field')].find(
			(field) => !field.closest('.resolution')
		)!;
		await expect.poll(() => first.getPrompts().length).toBeGreaterThan(0);
		await focus(first);
		await userEvent.keyboard('4');
		await userEvent.keyboard('{Enter}');
		await expect.poll(() => document.activeElement === lineFields(root)[0]).toBe(true);
		expect(submitted).toBe(0);
	});
});
