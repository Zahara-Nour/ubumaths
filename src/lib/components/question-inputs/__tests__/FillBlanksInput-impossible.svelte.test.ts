/**
 * FillBlanksInput — case « expression, ou bien : impossible » (chantier `reponse-impossible`).
 * Le bouton porte le texte du prof ; son état se lit dans la valeur de la case.
 */

import { describe, it, expect } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import FillBlanksInput from '../FillBlanksInput.svelte';
import type { ResolvedMarkdown } from '#lib/ubumark/index.ts';
import type { InstanceBlank } from '#lib/questions/types.ts';

const statement = 'Factorise : $\\placeholder[0]{}$' as ResolvedMarkdown;
const blank: InstanceBlank = {
	type: 'math',
	expectedAnswer: 'impossible',
	impossibleLabel: 'pas factorisable'
};

describe('FillBlanksInput — bouton « impossible »', () => {
	it('affiche le bouton, bascule aria-pressed et écrit le texte dans la valeur', async () => {
		const values = $state<string[]>([]);
		const screen = await render(FillBlanksInput, {
			props: { statement, blanks: [blank], values }
		});
		const button = screen.getByRole('button', { name: 'pas factorisable' });
		await expect.element(button).toHaveAttribute('aria-pressed', 'false');

		await userEvent.click(button);
		await expect.element(button).toHaveAttribute('aria-pressed', 'true');
		await expect.poll(() => values[0]).toBe('\\text{pas factorisable}');

		await userEvent.click(button);
		await expect.element(button).toHaveAttribute('aria-pressed', 'false');
		await expect.poll(() => values[0]).toBe('');
	});

	it('désactivé en mode correction', async () => {
		const screen = await render(FillBlanksInput, {
			props: { statement, blanks: [blank], showCorrectAnswers: true }
		});
		await expect.element(screen.getByRole('button', { name: 'pas factorisable' })).toBeDisabled();
	});
});
