import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Notice from '../UntranslatedExercisesNotice.svelte';
import type { WorksheetExerciseWithExercise } from '$lib/types/worksheets';

/**
 * The notice is the only thing standing between a teacher and a silently
 * half-French printed sheet: the fallback is deliberate and quiet.
 */
describe('UntranslatedExercisesNotice', () => {
	const frenchOnly = {
		id: 'we-1',
		exercise_id: 'ex-1',
		exercise: {
			id: 'ex-1',
			title: 'Produit scalaire',
			variations: [{ label: 'autonomous', statement_md: 'Calculer', solution_md: '' }]
		}
	} as unknown as WorksheetExerciseWithExercise;

	const translated = {
		id: 'we-2',
		exercise_id: 'ex-2',
		exercise: {
			id: 'ex-2',
			title: 'Dérivée',
			variations: [
				{
					label: 'autonomous',
					statement_md: 'Dériver',
					solution_md: '',
					translations: { en: { statement_md: 'Differentiate' } }
				}
			]
		}
	} as unknown as WorksheetExerciseWithExercise;

	it('says nothing on a French worksheet', () => {
		const { container } = render(Notice, { exercises: [frenchOnly], config: {} });

		expect(container.textContent).toBe('');
	});

	it('names the exercises that would come out in French', async () => {
		render(Notice, { exercises: [frenchOnly, translated], config: { language: 'en' } });

		await expect.element(page.getByText('1 exercice sortira en français')).toBeInTheDocument();
		// The translated one must not be blamed.
		await expect.element(page.getByText('Produit scalaire')).toBeInTheDocument();
	});

	it('says nothing when everything is translated', () => {
		const { container } = render(Notice, { exercises: [translated], config: { language: 'en' } });

		expect(container.textContent).toBe('');
	});

	it('agrees in number', async () => {
		render(Notice, {
			exercises: [frenchOnly, { ...frenchOnly, id: 'we-3' }],
			config: { language: 'en' }
		});

		await expect.element(page.getByText('2 exercices sortiront en français')).toBeInTheDocument();
	});
});
