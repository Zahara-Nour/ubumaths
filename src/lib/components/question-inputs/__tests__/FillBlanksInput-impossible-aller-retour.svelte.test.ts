/**
 * FillBlanksInput — bouton « impossible » : aller-retour avec MathLive.
 * Taper dans une AUTRE case de la même formule relit toutes les cases (MathPrompt) :
 * le texte du bouton doit en ressortir reconnu. Mesuré : MathLive relit ’ en ' (accents et
 * espaces intacts), d'où la tolérance de `isImpossibleAnswer`.
 */

import { describe, it, expect } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import FillBlanksInput from '../FillBlanksInput.svelte';
import { isImpossibleAnswer } from '#lib/questions/impossible-answer.ts';
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
			const label = labels[pressedIndex];
			const button = screen.getByRole('button', { name: new RegExp(label) });
			await userEvent.click(button);
			await expect.element(button).toHaveAttribute('aria-pressed', 'true');

			const field = document.querySelector('math-field') as MathfieldElement;
			// Frappe dans l'autre case : MathPrompt relit toutes les cases
			field.focus();
			field.setPromptValue(String(otherIndex), '', { silenceNotifications: true });
			field.executeCommand(['insert', '2']);
			field.dispatchEvent(new Event('input', { bubbles: true }));
			await new Promise((resolve) => setTimeout(resolve, 200));

			expect(isImpossibleAnswer(values[pressedIndex], label)).toBe(true);
			await expect.element(button).toHaveAttribute('aria-pressed', 'true');
		});
	}
});
