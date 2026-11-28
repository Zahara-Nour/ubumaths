/**
 * FillBlanksInput — case « droite paramétrique » (outil 64)
 * =========================================================
 *
 * Une case `answerKind: 'droite-parametrique'` posée seule dans `$$?$$` : trois lignes
 * MathLive `x =`, `y =`, `z =` à la place du champ. Les lignes partent dans UNE valeur
 * (`x=1+2t\\y=2\\z=-1+3t`), vides comprises. Rendu dans <main> : décor réel.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
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
			id: 'test-droite-parametrique',
			title: 'Droite',
			status: 'draft',
			type: 'fill_in_blanks',
			variations: [
				{
					statement: templateMarkdown('Représentation de $d$\n\n$$?$$'),
					blanks: [
						{ expectedAnswer: 'x=1+2t\\\\y=2\\\\z=-1+3t', answerKind: 'droite-parametrique' }
					]
				}
			],
			grades: ['T_SPE'],
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
	return [...root.querySelectorAll<MathfieldElement>('.parametrique math-field')];
}

async function waitFor(check: () => boolean, label: string) {
	for (let i = 0; i < 50; i++) {
		if (check()) return;
		await new Promise((resolve) => setTimeout(resolve, 20));
	}
	throw new Error(`attente dépassée : ${label}`);
}

function typeInto(field: MathfieldElement, latex: string) {
	field.value = latex;
	field.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
}

describe('case droite paramétrique', () => {
	it('trois lignes x =, y =, z =, pas de champ à trous', async () => {
		const { root } = await screenOf();
		expect(lineFields(root)).toHaveLength(3);
		const names = [...root.querySelectorAll('.parametrique-nom')].map((n) =>
			n.textContent?.replace(/\s+/g, ' ').trim()
		);
		expect(names).toEqual(['x =', 'y =', 'z =']);
		expect(lineFields(root)[0].getAttribute('aria-label')).toBe('Case 1, x =');
	});

	it('lignes tapées : UNE valeur, la place des lignes vides gardée', async () => {
		const { root, values } = await screenOf();
		typeInto(lineFields(root)[0], '1+2t');
		await waitFor(() => values[0] === 'x=1+2t\\\\y=\\\\z=', 'première ligne');
		typeInto(lineFields(root)[2], '-1+3t');
		await waitFor(() => values[0] === 'x=1+2t\\\\y=\\\\z=-1+3t', 'troisième ligne');
		expect(values[0]).toBe('x=1+2t\\\\y=\\\\z=-1+3t');
	});

	it('une valeur relue remplit les trois lignes', async () => {
		const { root } = await screenOf({ values: ['x=3+2t\\\\y=2\\\\z=2+3t'] });
		await waitFor(() => lineFields(root)[1]?.value === '2', 'lignes remplies');
		expect(lineFields(root).map((field) => field.value)).toEqual(['3+2t', '2', '2+3t']);
	});

	it('validée juste : la case est marquée', async () => {
		const { root } = await screenOf({
			values: ['x=3+2t\\\\y=2\\\\z=2+3t'],
			validationResults: [true],
			disabled: true
		});
		expect(root.querySelector<HTMLElement>('.parametrique')?.dataset.etat).toBe('ok');
	});
});
