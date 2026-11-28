/**
 * QuestionPreview — aperçu d'un modèle dans son formulaire
 *
 * Écart L93 : la variation, la taille et « Afficher correction si faux » sont des
 * `MySelect` / `MyCheckbox` (règle 2 de CLAUDE.md), pas des contrôles natifs.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import QuestionPreview from '../QuestionPreview.svelte';
import type { QuestionTemplate } from '#lib/questions/types.ts';
// Modèle réel relu (Entiers #139), deux variations
import fixture from '../../../../data/relecture/entiers/139.json';

const TEMPLATE = fixture.template as unknown as QuestionTemplate;

describe('QuestionPreview', () => {
	it('variation, taille, correction : contrôles de l’appli, plus de natifs', async () => {
		const screen = await render(QuestionPreview, { template: TEMPLATE });

		await expect
			.element(page.getByRole('combobox', { name: 'Taille : Moyenne' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('checkbox', { name: 'Afficher correction si faux' }))
			.toBeInTheDocument();
		expect(screen.container.querySelector('select, input[type="checkbox"]')).toBeNull();

		await page.getByRole('combobox', { name: /Variation à prévisualiser : Variation 1/ }).click();
		await page.getByRole('option', { name: 'Variation 2' }).click();
		await expect
			.element(page.getByRole('combobox', { name: 'Variation à prévisualiser : Variation 2' }))
			.toBeInTheDocument();

		await page.getByRole('combobox', { name: 'Taille : Moyenne' }).click();
		await page.getByRole('option', { name: 'Grande' }).click();
		await expect
			.element(page.getByRole('combobox', { name: 'Taille : Grande' }))
			.toBeInTheDocument();
		await page.screenshot({ path: '../../../../.captures/question-preview-l93.png' });
	});
});
