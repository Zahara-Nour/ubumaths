/**
 * FillBlanksInput — case « expression, ou bien : impossible » (chantier `reponse-impossible`).
 * Le bouton a son état à part (décision de David, 2026-11-23) : enfoncé, il vide la case et la
 * verrouille (grisée par MathLive) ; la valeur de la case est alors la marque réservée
 * `IMPOSSIBLE_ANSWER`, jamais son texte.
 */

import { describe, it, expect } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import FillBlanksInput from '../FillBlanksInput.svelte';
import { IMPOSSIBLE_ANSWER } from '#lib/questions/impossible-answer.ts';
import type { ResolvedMarkdown } from '#lib/ubumark/index.ts';
import type { InstanceBlank } from '#lib/questions/types.ts';
import type { MathfieldElement } from 'mathlive';

const statement = 'Factorise : $\\placeholder[0]{}$' as ResolvedMarkdown;
const blank: InstanceBlank = {
	type: 'math',
	expectedAnswer: 'impossible',
	impossibleLabel: 'pas factorisable'
};

/** Champ MathLive de la case 0, une fois MathLive chargé */
async function mathField(): Promise<MathfieldElement> {
	await customElements.whenDefined('math-field');
	return document.querySelector('math-field') as MathfieldElement;
}

/** Vraie frappe MathLive dans la case `id` : curseur dans la case, insertion, événement `input` */
async function typeInPrompt(field: MathfieldElement, id: string, latex: string) {
	field.focus();
	const range = field.getPromptRange(id);
	if (!range) throw new Error(`case ${id} introuvable`);
	field.selection = { ranges: [range] };
	field.executeCommand(['insert', latex]);
	field.dispatchEvent(new Event('input', { bubbles: true }));
	await new Promise((resolve) => setTimeout(resolve, 50));
}

describe('FillBlanksInput — bouton « impossible »', () => {
	it('clic : case vidée et verrouillée, marque enregistrée ; second clic : case libre et vide', async () => {
		const values = $state<string[]>([]);
		const screen = await render(FillBlanksInput, {
			props: { statement, blanks: [blank], values }
		});
		const button = screen.getByRole('button', { name: 'pas factorisable' });
		await expect.element(button).toHaveAttribute('aria-pressed', 'false');
		const field = await mathField();
		// L'élève a d'abord tapé une expression : le clic doit la retirer de la case
		await typeInPrompt(field, '0', 'x+1');
		await expect.poll(() => values[0]).toBe('x+1');
		expect(field.getPromptValue('0')).toBe('x+1');

		await userEvent.click(button);
		await expect.element(button).toHaveAttribute('aria-pressed', 'true');
		await expect.poll(() => values[0]).toBe(IMPOSSIBLE_ANSWER);
		await expect.poll(() => field.getPromptValue('0')).toBe('');
		await expect.poll(() => field.getPromptState('0')[1]).toBe(true);

		await userEvent.click(button);
		await expect.element(button).toHaveAttribute('aria-pressed', 'false');
		await expect.poll(() => values[0]).toBe('');
		await expect.poll(() => field.getPromptState('0')[1]).toBe(false);
	});

	it('curseur resté dans la case au clic (Safari) : la frappe suivante n’y entre pas', async () => {
		const values = $state<string[]>([]);
		const screen = await render(FillBlanksInput, {
			props: { statement, blanks: [blank], values }
		});
		const button = screen.getByRole('button', { name: 'pas factorisable' });
		const field = await mathField();
		await typeInPrompt(field, '0', 'x');
		// Clic sans déplacer le focus (un <button> ne prend pas toujours le focus sous Safari)
		(button.element() as HTMLButtonElement).click();
		await expect.element(button).toHaveAttribute('aria-pressed', 'true');
		field.executeCommand(['insert', '2']);
		field.dispatchEvent(new Event('input', { bubbles: true }));
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(field.getPromptValue('0')).toBe('');
		expect(values[0]).toBe(IMPOSSIBLE_ANSWER);
	});

	it('réponse déjà enregistrée (marque) : bouton enfoncé et case verrouillée dès l’affichage', async () => {
		const values = $state<string[]>([IMPOSSIBLE_ANSWER]);
		const screen = await render(FillBlanksInput, {
			props: { statement, blanks: [blank], values }
		});
		const button = screen.getByRole('button', { name: 'pas factorisable' });
		await expect.element(button).toHaveAttribute('aria-pressed', 'true');
		const field = await mathField();
		await expect.poll(() => field.getPromptState('0')[1]).toBe(true);
		await expect.poll(() => field.getPromptValue('0')).toBe('');
	});

	it('le texte du bouton tapé dans la case n’enfonce pas le bouton', async () => {
		const values = $state<string[]>(['\\text{pas factorisable}']);
		const screen = await render(FillBlanksInput, {
			props: { statement, blanks: [blank], values }
		});
		await expect
			.element(screen.getByRole('button', { name: 'pas factorisable' }))
			.toHaveAttribute('aria-pressed', 'false');
	});

	it('désactivé en mode correction', async () => {
		const screen = await render(FillBlanksInput, {
			props: { statement, blanks: [blank], showCorrectAnswers: true }
		});
		await expect.element(screen.getByRole('button', { name: 'pas factorisable' })).toBeDisabled();
	});
});
