/**
 * FillBlanksInput — trous dans une cellule de tableau (2026-10-03)
 *
 * Un `$?$` écrit dans une cellule devient `$\placeholder[N]{}$` (N dans l'ordre de
 * lecture), mais le tableau était rendu comme un bloc SANS trou : la case
 * s'affichait sans pouvoir être saisie. Les auteurs posaient la question sous le
 * tableau pour contourner.
 *
 * Rendu dans <main> : décor réel de l'application (`main p { font-size … }`).
 */
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { MathfieldElement } from 'mathlive';
import FillBlanksInput from '../FillBlanksInput.svelte';
import type { ResolvedMarkdown } from '$lib/ubumark';
import type { InstanceBlank } from '$lib/questions/types';

// Modèle sonde : deux trous dans le tableau, un dessous (cf. generateInstance)
const STATEMENT = [
	'Complète le tableau.',
	'',
	'| $x$ | $1$ | $2$ |',
	'|---|---|---|',
	'| $2 x$ | $\\placeholder[0]{}$ | $\\placeholder[1]{}$ |',
	'',
	'$3\\times 2=\\placeholder[2]{}$'
].join('\n') as ResolvedMarkdown;

const blanks: InstanceBlank[] = [
	{ type: 'math', expectedAnswer: '2' },
	{ type: 'math', expectedAnswer: '4' },
	{ type: 'math', expectedAnswer: '6' }
];

// Loi de probabilité à 5 colonnes (A-05 des variables aléatoires) : la plus large
const WIDE_STATEMENT = [
	'| $x_k$ | $-3$ | $-1$ | $2$ | $5$ |',
	'|---|---|---|---|---|',
	'| $P(X=x_k)$ | $0{,}17$ | $\\placeholder[0]{}$ | $0{,}33$ | $\\placeholder[1]{}$ |'
].join('\n') as ResolvedMarkdown;

let mains: HTMLElement[] = [];
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}
afterEach(async () => {
	for (const m of mains) m.remove();
	mains = [];
	await page.viewport(1280, 800);
});

beforeAll(async () => {
	// Import dynamique : un `import 'mathlive'` statique casse le mocker de vitest
	await import('mathlive');
	await customElements.whenDefined('math-field');
});

/** Les champs MathLive des cellules du tableau, dans l'ordre du DOM */
function tableFields(container: HTMLElement): MathfieldElement[] {
	return [...container.querySelectorAll<MathfieldElement>('table math-field')];
}

async function focus(field: HTMLElement) {
	await expect
		.poll(() => {
			field.focus();
			return document.activeElement === field;
		})
		.toBe(true);
}

describe('FillBlanksInput — trou dans une cellule de tableau', () => {
	it('chaque cellule à trou porte un champ saisissable, avec le bon index', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: STATEMENT, blanks, validationResults: [] }
		});
		const fields = tableFields(screen.container);
		expect(fields).toHaveLength(2);
		await expect.poll(() => fields.map((field) => field.getPrompts())).toEqual([['0'], ['1']]);
		// Le trou sous le tableau reste un champ, lui aussi
		expect(screen.container.querySelectorAll('math-field')).toHaveLength(3);
	});

	it('saisie dans la 2e cellule → valeur à l’index 1', async () => {
		const values: string[] = [];
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: STATEMENT, blanks, values, validationResults: [] }
		});
		const [, second] = tableFields(screen.container);
		await focus(second);
		await userEvent.keyboard('4');
		await expect.poll(() => values[1]).toBe('4');
		expect(values[0]).toBeUndefined();
	});

	it('Tab passe d’une cellule à la suivante, puis au trou sous le tableau (ordre de lecture)', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: STATEMENT, blanks, validationResults: [] }
		});
		const all = [...screen.container.querySelectorAll<MathfieldElement>('math-field')];
		await focus(all[0]);
		await userEvent.keyboard('{Tab}');
		await expect.poll(() => document.activeElement).toBe(all[1]);
		await userEvent.keyboard('{Tab}');
		await expect.poll(() => document.activeElement).toBe(all[2]);
	});

	it('trou texte {{blank:N}} dans une cellule : champ texte, Entrée valide comme ailleurs', async () => {
		const statement = ['| $x$ | mot |', '|---|---|', '| $1$ | {{blank:0}} |'].join(
			'\n'
		) as ResolvedMarkdown;
		let submitted = 0;
		const values: string[] = [];
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement,
				blanks: [{ type: 'text', expectedAnswer: 'un' }],
				values,
				validationResults: [],
				onSubmit: () => submitted++
			}
		});
		const input = screen.container.querySelector<HTMLInputElement>('td input[type="text"]');
		expect(input).not.toBeNull();
		await userEvent.type(input!, 'un');
		expect(values[0]).toBe('un');
		await userEvent.keyboard('{Enter}');
		expect(submitted).toBe(1);
	});

	it('après correction : état de chaque case annoncé, message du trou 2 listé', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement: STATEMENT,
				blanks,
				values: ['2', '5', '6'],
				validationResults: [true, false, true],
				blankFeedback: [undefined, 'Double la valeur de $x$.', undefined]
			}
		});
		const table = screen.container.querySelector('table')!;
		await expect.poll(() => table.textContent ?? '').toContain('Case 1 : juste');
		expect(table.textContent).toContain('Case 2 : fausse');
		const status = page.getByRole('status', { name: 'Messages par blanc' });
		await expect.element(status).toHaveTextContent('Blanc 2 : Double la valeur de');
	});

	it('mode flash : cases statiques « ? » dans le tableau, aucun champ', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: STATEMENT, blanks, validationResults: [], flashMode: true }
		});
		const table = screen.container.querySelector('table')!;
		expect(table.querySelector('math-field')).toBeNull();
		const latex = [...table.querySelectorAll('math-span')].map((m) => m.textContent ?? '');
		expect(latex.filter((l) => l.includes('\\boxed{?}'))).toHaveLength(2);
	});

	it('mode correction : réponses attendues affichées dans les cellules', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: STATEMENT, blanks, validationResults: [], showCorrectAnswers: true }
		});
		const table = screen.container.querySelector('table')!;
		expect(table.querySelector('math-field')).toBeNull();
		const latex = [...table.querySelectorAll('math-span')].map((m) => m.textContent ?? '');
		expect(latex.some((l) => l.includes('\\textcolor{green}{2}'))).toBe(true);
		expect(latex.some((l) => l.includes('\\textcolor{green}{4}'))).toBe(true);
	});

	it('onlyBlanks : le tableau à trous est gardé', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: STATEMENT, blanks, validationResults: [], onlyBlanks: true }
		});
		expect(tableFields(screen.container)).toHaveLength(2);
		expect(screen.container.textContent).not.toContain('Complète le tableau');
	});

	it('cellules sans trou d’un tableau à trous : rendues comme avant (pas de paragraphe)', async () => {
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: STATEMENT, blanks, validationResults: [] }
		});
		const table = screen.container.querySelector('table')!;
		expect(table.querySelector('p')).toBeNull();
		const header = [...table.querySelectorAll('th')].map((th) => th.textContent?.trim());
		expect(header).toHaveLength(3);
	});

	it('375 px : le tableau défile dans son cadre, la page ne déborde pas, les cases restent lisibles', async () => {
		await page.viewport(375, 800);
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement: WIDE_STATEMENT, blanks: blanks.slice(0, 2), validationResults: [] }
		});
		const fields = tableFields(screen.container);
		expect(fields).toHaveLength(2);
		await expect.poll(() => fields[0].getBoundingClientRect().width).toBeGreaterThanOrEqual(40);
		expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(375);
		const wrapper = screen.container.querySelector('table')!.parentElement!;
		expect(getComputedStyle(wrapper).overflowX).toBe('auto');
	});
});
