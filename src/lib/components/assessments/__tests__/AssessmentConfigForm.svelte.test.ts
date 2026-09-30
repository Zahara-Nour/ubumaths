/**
 * Formulaire d'évaluation : pas de « Temps limite total » (Q19, David,
 * 2026-09-30). Une évaluation est toujours un Entraînement, où chaque question
 * a son propre chrono ; seule la Course aux nombres a une limite globale.
 * Le réglage reste en base, envoyé à `null`.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { flushSync, tick } from 'svelte';
import AssessmentConfigForm from '../AssessmentConfigForm.svelte';

type Submitted = { settings: { time_limit: number | null } };

describe('AssessmentConfigForm — pas de limite de temps globale', () => {
	it('n’affiche pas le champ « Temps limite total »', async () => {
		const { container } = await render(AssessmentConfigForm, { onSubmit: vi.fn() });

		expect(container.querySelector('#timeLimit')).toBeNull();
		expect(container.textContent).not.toContain('Temps limite');
	});

	it('envoie time_limit à null, même si l’évaluation en avait une', async () => {
		const onSubmit = vi.fn<(data: Submitted) => void>();
		const { container } = await render(AssessmentConfigForm, {
			onSubmit,
			initialData: {
				title: 'Fractions',
				grade: '6',
				settings: {
					max_attempts: null,
					time_limit: 600,
					deadline: null,
					shuffle_questions: false
				}
			}
		});

		container.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
		flushSync();
		await tick();

		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit.mock.calls[0][0].settings.time_limit).toBeNull();
	});
});
