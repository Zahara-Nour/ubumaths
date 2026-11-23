/**
 * FillBlanksInput — bouton « impossible » et relecture MathLive.
 * Taper dans une AUTRE case de la même formule relit toutes les cases (MathPrompt) : la case
 * du bouton enfoncé, vide et verrouillée, ne doit pas effacer la marque du bouton.
 */

import { describe, it, expect } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import FillBlanksInput from '../FillBlanksInput.svelte';
import { IMPOSSIBLE_ANSWER } from '#lib/questions/impossible-answer.ts';
import type { ResolvedMarkdown } from '#lib/ubumark/index.ts';
import type { InstanceBlank } from '#lib/questions/types.ts';
import type { MathfieldElement } from 'mathlive';

const statement = '$\\placeholder[0]{}\\times\\placeholder[1]{}$' as ResolvedMarkdown;
const labels = ['n’existe pas', 'pas défini'];
const blanks: InstanceBlank[] = labels.map((impossibleLabel) => ({
	type: 'math',
	expectedAnswer: 'impossible',
	impossibleLabel
}));

describe('FillBlanksInput — bouton « impossible » et relecture MathLive', () => {
	for (const [pressedIndex, otherIndex] of [
		[0, 1],
		[1, 0]
	]) {
		it(`bouton ${pressedIndex} enfoncé, frappe dans la case ${otherIndex} : reste enfoncé`, async () => {
			const values = $state<string[]>([]);
			const screen = await render(FillBlanksInput, { props: { statement, blanks, values } });
			const button = screen.getByRole('button', { name: new RegExp(labels[pressedIndex]) });
			await userEvent.click(button);
			await expect.element(button).toHaveAttribute('aria-pressed', 'true');

			await customElements.whenDefined('math-field');
			const field = document.querySelector('math-field') as MathfieldElement;
			// Frappe dans l'autre case : MathPrompt relit toutes les cases
			field.focus();
			const range = field.getPromptRange(String(otherIndex));
			if (!range) throw new Error(`case ${otherIndex} introuvable`);
			field.selection = { ranges: [range] };
			field.executeCommand(['insert', '2']);
			field.dispatchEvent(new Event('input', { bubbles: true }));
			await expect.poll(() => values[otherIndex]).toBe('2');

			expect(values[pressedIndex]).toBe(IMPOSSIBLE_ANSWER);
			await expect.element(button).toHaveAttribute('aria-pressed', 'true');
		});
	}
});
