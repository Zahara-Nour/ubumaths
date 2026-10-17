/**
 * FillBlanksInput — sens « longueur » de `AB` : raccourcis MathLive coupés (Q-N)
 * ==============================================================================
 *
 * MathLive transforme par défaut deux majuscules collées : `AA` → ∀, `EE` → ∃,
 * `RR` → ℝ… En mode longueur, l'élève qui tape `AA'` (Thalès, homothétie) doit
 * obtenir la longueur `AA'`. Ailleurs (produit, ou sens non transmis), les
 * raccourcis restent. Frappes réelles dans Chromium (Playwright).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import FillBlanksInput from '../FillBlanksInput.svelte';
import type { ResolvedMarkdown } from '$lib/ubumark';
import type { InstanceBlank } from '$lib/questions/types';
import type { CapitalPairs } from '$lib/mathAST/parser/types';
import type { MathfieldElement } from 'mathlive';

const statement = 'Réponse : $\\placeholder[0]{}$' as ResolvedMarkdown;
const blank: InstanceBlank = { type: 'math', expectedAnswer: "AA'" };

/** Import dynamique : un `import 'mathlive'` statique casse le mocker de vitest */
beforeAll(async () => {
	await import('mathlive');
	await customElements.whenDefined('math-field');
});

/** Donne le focus au champ, curseur dans la case 0 */
async function focusedMathField(): Promise<MathfieldElement> {
	await expect.poll(() => document.querySelector('math-field')).toBeTruthy();
	const mathField = document.querySelector('math-field') as MathfieldElement;
	await expect
		.poll(() => {
			mathField.focus();
			return document.activeElement === mathField;
		})
		.toBe(true);
	return mathField;
}

/** Ce que donne la frappe `keys` dans la case, selon le sens transmis */
async function typed(keys: string, capitalPairs?: CapitalPairs): Promise<string> {
	const { unmount } = await render(FillBlanksInput, {
		props: { statement, blanks: [blank], ...(capitalPairs && { capitalPairs }) }
	});
	const mathField = await focusedMathField();
	await userEvent.keyboard(keys);
	const value = mathField.getPromptValue('0');
	await unmount();
	return value;
}

describe('FillBlanksInput — raccourcis de deux majuscules (Q-N)', () => {
	it("mode longueur : A, A, ' donne AA' (pas ∀')", async () => {
		const value = await typed("AA'", 'length');
		// Mesuré le 2026-10-12 : `\forall^{\prime}` sans le filtre
		expect(value).toBe('AA^{\\prime}');
	});

	it('mode longueur : R, R et E, E restent des lettres', async () => {
		expect(await typed('RR', 'length')).toBe('RR');
		expect(await typed('EF+EE', 'length')).not.toContain('exists');
	});

	it('mode produit : le raccourci reste (A, A → ∀)', async () => {
		expect(await typed('AA', 'product')).toContain('forall');
	});

	it('champ monté, longueur puis produit : le raccourci revient (aperçu de l’éditeur)', async () => {
		const { rerender, unmount } = await render(FillBlanksInput, {
			props: { statement, blanks: [blank], capitalPairs: 'length' }
		});
		await rerender({ statement, blanks: [blank], capitalPairs: 'product' });
		const mathField = await focusedMathField();
		await userEvent.keyboard('AA');
		const value = mathField.getPromptValue('0');
		await unmount();
		expect(value).toContain('forall');
	});

	it('sens non transmis (instance d’avant) : le raccourci reste', async () => {
		expect(await typed('RR')).toContain('mathbb');
	});

	it("mode longueur : ~A'B'=?~ a son champ de saisie (Thalès)", async () => {
		const thales = "Calcule ~A'B'=?~" as ResolvedMarkdown;
		const { container, unmount } = await render(FillBlanksInput, {
			props: { statement: thales, blanks: [blank], capitalPairs: 'length' }
		});
		await expect.poll(() => container.querySelectorAll('math-field').length).toBe(1);
		await unmount();
	});
});
