/**
 * CourseQuestionToggle — case « Question de cours » de l'éditeur (Q110 b)
 *
 * - Case MyCheckbox libellée « Question de cours », avec une aide courte.
 * - Cocher / décocher met à jour la valeur liée.
 * - Carte de cours : cochée et désactivée (une carte de cours est toujours une
 *   question de cours).
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import CourseQuestionToggle from '../CourseQuestionToggle.svelte';

describe('CourseQuestionToggle', () => {
	it('affiche la case et son aide', async () => {
		await render(CourseQuestionToggle, { checked: false, isCourseCard: false });

		await expect.element(page.getByRole('checkbox', { name: 'Question de cours' })).toBeVisible();
		await expect
			.element(page.getByText('vérifie une connaissance ou la compréhension', { exact: false }))
			.toBeVisible();
	});

	it('lecture : marqueur présent → case cochée', async () => {
		await render(CourseQuestionToggle, { checked: true, isCourseCard: false });

		await expect
			.element(page.getByRole('checkbox', { name: 'Question de cours' }))
			.toHaveAttribute('aria-checked', 'true');
	});

	it('écriture : cocher met la valeur liée à true', async () => {
		let value = false;
		await render(CourseQuestionToggle, {
			get checked() {
				return value;
			},
			set checked(next: boolean) {
				value = next;
			},
			isCourseCard: false
		});

		await page.getByRole('checkbox', { name: 'Question de cours' }).click();

		expect(value).toBe(true);
	});

	it('carte de cours : cochée et désactivée, même si la valeur liée est false', async () => {
		await render(CourseQuestionToggle, { checked: false, isCourseCard: true });

		const box = page.getByRole('checkbox', { name: 'Question de cours' });
		await expect.element(box).toHaveAttribute('aria-checked', 'true');
		await expect.element(box).toBeDisabled();
	});
});
