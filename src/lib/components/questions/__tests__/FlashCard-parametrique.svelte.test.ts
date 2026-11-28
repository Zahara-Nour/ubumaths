/**
 * FlashCard — case « droite paramétrique » (outil 64), parcours de l'élève
 * ========================================================================
 *
 * L'élève tape une représentation avec un bon point et un vecteur non colinéaire,
 * puis « Valider » : la case est marquée fausse et le message s'affiche. Une autre
 * représentation de la même droite est juste. Le verso montre l'attendue en système.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import FlashCard from '../FlashCard.svelte';
import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
import type { QuestionInstance, QuestionTemplate } from '#lib/questions/types.ts';
import { templateMarkdown } from '#lib/ubumark/index.ts';
import type { MathfieldElement } from 'mathlive';

// Variables
let mains: HTMLElement[] = [];

afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

beforeAll(async () => {
	await import('mathlive');
	await customElements.whenDefined('math-field');
});

// Functions
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

const front = (c: HTMLElement) => c.querySelector('.flip-card-front') as HTMLElement;
const back = (c: HTMLElement) => c.querySelector('.flip-card-back') as HTMLElement;

function lineFields(c: HTMLElement): MathfieldElement[] {
	return [...front(c).querySelectorAll<MathfieldElement>('.parametrique math-field')];
}

async function focus(field: MathfieldElement) {
	await expect
		.poll(() => {
			field.focus();
			return document.activeElement === field;
		})
		.toBe(true);
}

async function answer(lines: string[]) {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	const { container } = await render(FlashCard, {
		target: main,
		props: { instance: generated(), interactive: true, showCorrectionOnWrong: false } as never
	});
	await expect.poll(() => lineFields(container).length).toBe(3);
	for (const [k, line] of lines.entries()) {
		await focus(lineFields(container)[k]);
		await userEvent.keyboard(line);
		await expect.poll(() => lineFields(container)[k].value).not.toBe('');
	}
	const button = [...front(container).querySelectorAll('button')].find(
		(b) => b.textContent?.trim() === 'Valider'
	);
	button!.click();
	return container;
}

describe('FlashCard — case droite paramétrique', () => {
	it('vecteur non colinéaire : case fausse, message sous la case', async () => {
		const container = await answer(['1+2t', '2+t', '-1+3t']);
		await expect
			.poll(() => front(container).querySelector<HTMLElement>('.parametrique')?.dataset.etat)
			.toBe('faux');
		expect(front(container).textContent).toContain(
			"Ton vecteur directeur n'est pas colinéaire à celui de la droite."
		);
	});

	it('autre point de la même droite : case juste, verso en système', async () => {
		const container = await answer(['3+2t', '2', '2+3t']);
		await expect
			.poll(() => front(container).querySelector<HTMLElement>('.parametrique')?.dataset.etat)
			.toBe('ok');
		// Verso : l'attendue rendue en système, sans erreur de rendu
		const verso = back(container);
		expect(verso.querySelector('.ML__error, .katex-error')).toBeNull();
		// La réponse de l'élève en système (accolade ajoutée après la neutralisation)
		expect(verso.innerHTML).toContain('\\begin{cases}x=3+2t');
	});
});
