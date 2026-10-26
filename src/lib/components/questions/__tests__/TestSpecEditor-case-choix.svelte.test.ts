/**
 * TestSpecEditor — choix d'une case choix rendus (chantier figure-et-choix, restes)
 * ===============================================================================
 *
 * Décision de David (2026-10-26) : dans l'éditeur de tests, chaque choix
 * s'affiche rendu, comme dans l'aperçu (formule mise en forme), précédé de sa
 * lettre ; une variable non résolue (`{{a}}`) reste telle qu'écrite.
 */

import { page } from 'vitest/browser';
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TestSpecEditor from '../TestSpecEditor.svelte';
import { templateMarkdown } from '$lib/ubumark';
import type { QuestionVariation } from '$lib/questions/types';

// Constantes
const STATEMENT = 'Combien ?\n\n```choix\n- $\\frac{1}{2}$\n- {{a}} cm\n```';

// Tests
describe('TestSpecEditor — case choix', () => {
	it('choix rendus (formule mise en forme), lettre devant ; variable laissée telle quelle', async () => {
		const variations = [
			{ statement: templateMarkdown(STATEMENT), blanks: [{ expectedAnswer: '0' }] }
		] as QuestionVariation[];
		await render(TestSpecEditor, { props: { testSpecs: [], variations } });
		await page.getByRole('button', { name: 'Ajouter un test' }).click();
		await expect.element(page.getByText('Case 1 : choix')).toBeVisible();

		const first = page.getByRole('checkbox').first();
		await expect.element(first).toBeVisible();
		const card = page.getByText('Case 1 : choix').element().parentElement;
		// Formule rendue (math-span) ; plus aucun `$` brut
		expect(card?.querySelector('math-span')?.getAttribute('aria-label')).toContain('half');
		expect(card?.textContent).not.toContain('$');
		expect(card?.textContent).toContain('A.');
		expect(card?.textContent).toContain('B.');
		expect(card?.textContent).toContain('{{a}} cm');
	});
});
