/**
 * FillBlanksInput — tableau de signes à compléter (```variation à `?`)
 * =====================================================================
 *
 * Chantier `docs/archive/wip/tableau-signes-progress.md`, PR 3 (saisie). Chaque cellule
 * cachée est UNE case de la question :
 * - valeur de x : petite case MathLive (prompt `N` du champ) ;
 * - signe : une case qui ouvre au toucher les boutons + / − ;
 * - marque : une case qui ouvre 0 / ‖ / rien.
 * Les jetons envoyés sont ceux du juge (`isSignCellCorrect`) : `+` `-` `z` `||` `rien`.
 *
 * Rendu dans <main> : décor réel de l'application.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import FillBlanksInput from '../FillBlanksInput.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { toDisplayInstance, toPublicQuestion } from '$lib/questions/public-question';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';

// Variables
let mains: HTMLElement[] = [];

// Constantes
/** (x+3)(x-2) : la racine -3 cachée, deux signes et le 0 en -3 cachés */
const PRODUIT = [
	'```variation',
	'variable: x',
	'domain: -inf, ?-3, 2, +inf',
	'',
	'sign: (x+3)(x-2)',
	'  -inf,-3: ?+',
	'  -3: ?z',
	'  -3,2: -',
	'  2: z',
	'  2,+inf: ?+',
	'```'
].join('\n');

/** Quotient : double barre et « rien » cachés */
const QUOTIENT = [
	'```variation',
	'variable: x',
	'domain: -inf, 1, +inf',
	'',
	'sign: x-1',
	'  -inf,1: -',
	'  1: ?z',
	'  1,+inf: +',
	'',
	'sign: 1/(x-1)',
	'  -inf,1: ?-',
	'  1: ?||',
	'  1,+inf: +',
	'',
	'sign: 2',
	'  -inf,1: +',
	'  1: ?rien',
	'  1,+inf: +',
	'```'
].join('\n');

// Functions
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}

afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
	// Menus ouverts (portail hors du <main>)
	for (const menu of document.querySelectorAll('[data-signe-menu]')) menu.remove();
});

function generated(statement: string, blanks?: { expectedAnswer: string }[]): QuestionInstance {
	const result = generateInstance(
		{
			id: 'test-tableau-signes',
			title: 'Tableau de signes',
			status: 'draft',
			type: 'fill_in_blanks',
			variations: [
				{
					statement: templateMarkdown(`Complète le tableau.\n\n${statement}`),
					...(blanks && { blanks })
				}
			],
			grades: ['1SPE'],
			theme: 'Test',
			domain: 'Test',
			level: 1
		} as unknown as QuestionTemplate,
		42
	);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

interface ScreenOptions {
	values?: string[];
	validationResults?: (boolean | null)[];
	disabled?: boolean;
	flashMode?: boolean;
	showCorrectAnswers?: boolean;
	onSubmit?: () => void;
}

async function screenOf(instance: QuestionInstance, options: ScreenOptions = {}) {
	const values = options.values ?? [];
	const screen = await render(FillBlanksInput, {
		target: mainElement(),
		props: {
			statement: instance.statement,
			blanks: instance.blanks ?? [],
			values,
			validationResults: options.validationResults ?? [],
			disabled: options.disabled ?? false,
			flashMode: options.flashMode ?? false,
			showCorrectAnswers: options.showCorrectAnswers ?? false,
			onSubmit: options.onSubmit
		}
	});
	return { root: screen.container as HTMLElement, values };
}

/** Les cases signe / marque du tableau, dans l'ordre de l'écran */
function pickers(root: HTMLElement): HTMLButtonElement[] {
	return [...root.querySelectorAll<HTMLButtonElement>('button[data-signe-case]')];
}

/** Le bouton du menu ouvert dont le libellé accessible est `label` */
async function choose(label: string) {
	const menu = await waitForMenu();
	const button = [...menu.querySelectorAll<HTMLButtonElement>('button')].find(
		(b) => b.getAttribute('aria-label') === label
	);
	if (!button) throw new Error(`pas de bouton « ${label} »`);
	await userEvent.click(button);
}

async function waitForMenu(): Promise<HTMLElement> {
	for (let i = 0; i < 50; i++) {
		const menu = document.querySelector<HTMLElement>('[data-signe-menu]');
		if (menu) return menu;
		await new Promise((resolve) => setTimeout(resolve, 20));
	}
	throw new Error('menu jamais ouvert');
}

describe('tableau de signes à compléter — rendu', () => {
	it('une case MathLive pour la valeur de x, une case à menu par signe et marque', async () => {
		const instance = generated(PRODUIT);
		expect(instance.blanks?.map((b) => b.cellule)).toEqual(['valeur', 'signe', 'marque', 'signe']);
		const { root } = await screenOf(instance);
		const table = root.querySelector('.variation-table');
		expect(table).not.toBeNull();
		const fields = table!.querySelectorAll('math-field');
		expect(fields).toHaveLength(1);
		expect(pickers(root)).toHaveLength(3);
		// Aucune réponse visible : ni « -3 » dans l'en-tête, ni le 0 caché, ni les signes cachés
		const header = table!.querySelector('thead')!;
		expect(header.textContent).not.toContain('-3');
		for (const picker of pickers(root)) expect(picker.textContent?.trim()).toBe('');
	});

	it('cases numérotées dans l’ordre de lecture (libellés accessibles)', async () => {
		const { root } = await screenOf(generated(PRODUIT));
		expect(pickers(root).map((p) => p.getAttribute('aria-label'))).toEqual([
			'Case 2 : signe, vide',
			'Case 3 : marque, vide',
			'Case 4 : signe, vide'
		]);
	});

	it('tableau sans ? : rendu du tableau ordinaire, aucune case', async () => {
		const plain = PRODUIT.replace(/\?/g, '');
		const { root } = await screenOf(generated(`$x = ?$\n\n${plain}`, [{ expectedAnswer: '2' }]));
		const table = root.querySelector('.variation-table')!;
		expect(table.querySelectorAll('math-field')).toHaveLength(0);
		expect(pickers(root)).toHaveLength(0);
		expect(table.querySelector('thead')!.textContent).toContain('-3');
	});
});

describe('tableau de signes à compléter — saisie', () => {
	it('signe : toucher la case puis « moins » écrit - dans sa case', async () => {
		const { root, values } = await screenOf(generated(PRODUIT));
		await userEvent.click(pickers(root)[0]);
		await choose('moins');
		expect(values[1]).toBe('-');
		// Le menu se referme après le choix
		await expect
			.poll(() => document.querySelector('[data-signe-menu]'), { timeout: 2000 })
			.toBeNull();
	});

	it('marque : 0, double barre et rien envoient z, || et rien', async () => {
		const instance = generated(QUOTIENT);
		expect(instance.blanks?.map((b) => b.cellule)).toEqual(['marque', 'signe', 'marque', 'marque']);
		const { root, values } = await screenOf(instance);
		const cells = pickers(root);
		expect(cells).toHaveLength(4);

		await userEvent.click(cells[0]);
		await choose('zéro');
		expect(values[0]).toBe('z');

		await userEvent.click(cells[2]);
		await choose('double barre');
		expect(values[2]).toBe('||');

		await userEvent.click(cells[3]);
		await choose('rien');
		expect(values[3]).toBe('rien');
	});

	it('case remplie : le choix affiché et dit', async () => {
		const { root } = await screenOf(generated(PRODUIT), { values: ['', '-', 'rien', '+'] });
		const cells = pickers(root);
		expect(cells.map((c) => c.textContent?.trim())).toEqual(['−', 'rien', '+']);
		expect(cells.map((c) => c.getAttribute('aria-label'))).toEqual([
			'Case 2 : signe, moins',
			'Case 3 : marque, rien',
			'Case 4 : signe, plus'
		]);
	});

	it('une marque ne propose pas + / −, un signe ne propose pas 0', async () => {
		const { root } = await screenOf(generated(PRODUIT));
		await userEvent.click(pickers(root)[1]);
		const menu = await waitForMenu();
		const labels = [...menu.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'));
		expect(labels).toEqual(['zéro', 'double barre', 'rien']);
	});

	it('au clavier : + et - sur la case focalisée, Retour arrière la vide', async () => {
		const { root, values } = await screenOf(generated(PRODUIT));
		const sign = pickers(root)[0];
		sign.focus();
		await userEvent.keyboard('-');
		expect(values[1]).toBe('-');
		await userEvent.keyboard('+');
		expect(values[1]).toBe('+');
		await userEvent.keyboard('{Backspace}');
		expect(values[1]).toBe('');

		const mark = pickers(root)[1];
		mark.focus();
		await userEvent.keyboard('0');
		expect(values[2]).toBe('z');
		await userEvent.keyboard('|');
		expect(values[2]).toBe('||');
	});

	it('valeur de x : la case MathLive remplit values[0]', async () => {
		const { root, values } = await screenOf(generated(PRODUIT));
		const field = root.querySelector('.variation-table math-field') as HTMLElement & {
			getPrompts(): string[];
			setPromptValue(id: string, value: string): void;
		};
		expect(field.getPrompts()).toEqual(['0']);
		field.setPromptValue('0', '-3');
		field.dispatchEvent(new Event('input', { bubbles: true }));
		await expect.poll(() => values[0]).toBe('-3');
	});

	it('Entrée avec des cases vides : curseur sur la première case vide', async () => {
		let submitted = 0;
		const { root } = await screenOf(generated(PRODUIT), {
			values: ['-3', '+', '', ''],
			onSubmit: () => submitted++
		});
		const field = root.querySelector('.variation-table math-field') as HTMLElement & {
			setPromptValue(id: string, value: string): void;
		};
		field.setPromptValue('0', '-3');
		field.dispatchEvent(
			new InputEvent('beforeinput', { inputType: 'insertLineBreak', bubbles: true })
		);
		expect(submitted).toBe(0);
		expect(document.activeElement).toBe(pickers(root)[1]);
	});
});

describe('tableau de signes à compléter — états', () => {
	it('après validation : case fausse marquée, case juste marquée, plus de menu', async () => {
		const { root } = await screenOf(generated(PRODUIT), {
			values: ['-3', '-', 'z', '+'],
			validationResults: [true, false, true, null],
			disabled: true
		});
		const cells = pickers(root);
		expect(cells[0].dataset.etat).toBe('fausse');
		expect(cells[0].getAttribute('aria-label')).toBe('Case 2 : signe, moins, fausse');
		expect(cells[1].dataset.etat).toBe('juste');
		expect(cells.every((c) => c.disabled)).toBe(true);
	});

	it('mode flash : cellules vides, sans case à remplir', async () => {
		const { root } = await screenOf(generated(PRODUIT), { flashMode: true });
		const table = root.querySelector('.variation-table')!;
		expect(table.querySelectorAll('math-field')).toHaveLength(0);
		expect(pickers(root)).toHaveLength(0);
		expect(table.querySelectorAll('[data-vt-case]')).toHaveLength(4);
		expect(table.querySelector('thead')!.textContent).not.toContain('-3');
	});

	it('bonne réponse affichée : les cellules remplies', async () => {
		const { root } = await screenOf(generated(PRODUIT), { showCorrectAnswers: true });
		const table = root.querySelector('.variation-table')!;
		expect(pickers(root)).toHaveLength(0);
		const shown = [...table.querySelectorAll<HTMLElement>('[data-vt-case]')].map((c) =>
			c.textContent?.trim()
		);
		expect(shown).toEqual(['-3', '+', '0', '+']);
	});
});

describe('tableau de signes à compléter — évaluation notée', () => {
	it('énoncé masqué (??1, ? seul) : même écran, et la saisie marche', async () => {
		const full = generated(PRODUIT);
		const masked = toDisplayInstance(toPublicQuestion(full, { position: 0, delaySeconds: 20 }));
		expect(masked.statement).toContain('??1');
		expect(masked.statement).not.toContain('?-3');
		const { root, values } = await screenOf(masked);
		expect(root.textContent).not.toContain('??');
		expect(pickers(root)).toHaveLength(3);
		await userEvent.click(pickers(root)[2]);
		await choose('plus');
		expect(values[3]).toBe('+');
	});

	it('bonne réponse sur un énoncé masqué : lue dans les cases de la question', async () => {
		const full = generated(PRODUIT);
		const masked = toDisplayInstance(toPublicQuestion(full, { position: 0, delaySeconds: 20 }));
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: masked.statement, blanks: full.blanks ?? [], showCorrectAnswers: true }
		});
		const shown = [...screen.container.querySelectorAll<HTMLElement>('[data-vt-case]')].map((c) =>
			c.textContent?.trim()
		);
		expect(shown).toEqual(['-3', '+', '0', '+']);
	});
});
