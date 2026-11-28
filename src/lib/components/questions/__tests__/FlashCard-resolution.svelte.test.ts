/**
 * FlashCard — case « résolution » (outil 55), parcours de l'élève
 * ===============================================================
 *
 * L'élève tape 3x = 2 (faux), Entrée, x = 2/3, puis « Valider » : la ligne 1 est
 * marquée fausse, la ligne 2 juste (par rapport à la ligne 1), et le message de la
 * première ligne fausse s'affiche. Aucune marque avant « Valider ».
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import FlashCard from '../FlashCard.svelte';
import type { QuestionInstance } from '#lib/questions/types.ts';
import { resolvedMarkdown } from '#lib/ubumark/index.ts';
import type { MathfieldElement } from 'mathlive';

// Constantes
const INSTANCE = {
	templateId: 'resolution',
	statement: resolvedMarkdown('Résous : $3x-5=7$\n\n$$\\placeholder[0]{}$$'),
	blanks: [{ expectedAnswer: 'x=4', type: 'math', answerKind: 'resolution', equation: '3x-5=7' }],
	grades: ['4'],
	level: 1,
	generatedAt: new Date().toISOString()
} as QuestionInstance;

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
const front = (c: HTMLElement) => c.querySelector('.flip-card-front') as HTMLElement;

function lineFields(c: HTMLElement): MathfieldElement[] {
	return [...front(c).querySelectorAll<MathfieldElement>('.resolution math-field')];
}

async function focus(field: MathfieldElement) {
	await expect
		.poll(() => {
			field.focus();
			return document.activeElement === field;
		})
		.toBe(true);
}

describe('FlashCard — case résolution', () => {
	it('taper deux lignes, valider : ✗ puis ✓, message de la ligne 1', async () => {
		const main = document.body.appendChild(document.createElement('main'));
		mains.push(main);
		const { container } = await render(FlashCard, {
			target: main,
			props: { instance: INSTANCE, interactive: true, showCorrectionOnWrong: false } as never
		});
		await expect.poll(() => lineFields(container).length).toBe(1);

		await focus(lineFields(container)[0]);
		await userEvent.keyboard('3x=2');
		await userEvent.keyboard('{Enter}');
		await expect.poll(() => lineFields(container).length).toBe(2);
		await focus(lineFields(container)[1]);
		await userEvent.keyboard('x=2/3');
		await expect.poll(() => lineFields(container)[1].value).not.toBe('');
		expect(front(container).querySelectorAll('.resolution-marque')).toHaveLength(0);

		const button = [...front(container).querySelectorAll('button')].find(
			(b) => b.textContent?.trim() === 'Valider'
		);
		button!.click();

		await expect
			.poll(() =>
				[...front(container).querySelectorAll<HTMLElement>('.resolution-ligne')].map(
					(line) => line.dataset.etat
				)
			)
			.toEqual(['not-equivalent', 'ok']);
		expect(front(container).textContent).toContain(
			"La ligne 1 n'a pas les mêmes solutions que la précédente."
		);
	});
});
