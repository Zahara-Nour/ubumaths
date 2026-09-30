/**
 * Formulaire d'évaluation (C20, chantier 4, Q30).
 *
 * - Choix de la forme : Entraînement ou Course aux nombres.
 * - Temps limite affiché SEULEMENT pour une Course aux nombres : 1 à 60 min,
 *   7 min par défaut ; un Entraînement n'en envoie aucun.
 * - Plus de champ catégories (ni titre, ni niveau) : tout vient de la série.
 * - Ordre aléatoire par MyCheckbox.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import EvaluationConfigForm from '../EvaluationConfigForm.svelte';
import type { EvaluationSettingsInput } from '$lib/types/evaluation';

type OnSubmit = (settings: EvaluationSettingsInput) => void;

async function renderForm(props: {
	onSubmit: OnSubmit;
	initialData?: Partial<EvaluationSettingsInput>;
}) {
	// Décor réel : les pages placent le formulaire dans <main>
	const main = document.body.appendChild(document.createElement('main'));
	return await render(EvaluationConfigForm, { target: main, props });
}

async function submit() {
	await page.getByRole('button', { name: 'Créer' }).click();
}

describe('EvaluationConfigForm — forme et temps limite', () => {
	it('Entraînement par défaut : aucun champ de temps, rien de tel envoyé', async () => {
		const onSubmit = vi.fn<OnSubmit>();
		const { container } = await renderForm({ onSubmit });

		expect(container.querySelector('#timeLimit')).toBeNull();
		await submit();

		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit.mock.calls[0][0]).toMatchObject({
			form: 'interactive',
			time_limit_minutes: null
		});
	});

	it('choisir « Course aux nombres » fait apparaître le temps limite, 7 min par défaut', async () => {
		const onSubmit = vi.fn<OnSubmit>();
		const { container } = await renderForm({ onSubmit });

		await page.getByRole('button', { name: 'Choisir une forme' }).click();
		await page.getByRole('option', { name: 'Course aux nombres' }).click();

		await expect.element(page.getByLabelText('Temps limite (minutes)')).toHaveValue(7);
		await submit();

		expect(onSubmit.mock.calls[0][0]).toMatchObject({ form: 'course', time_limit_minutes: 7 });
		expect(container.querySelector('#timeLimit')).not.toBeNull();
	});

	it('Course aux nombres : un temps hors de 1 à 60 min est refusé avec un message', async () => {
		const onSubmit = vi.fn<OnSubmit>();
		await renderForm({ onSubmit, initialData: { form: 'course', time_limit_minutes: 7 } });

		const input = page.getByLabelText('Temps limite (minutes)');
		await input.fill('61');
		await submit();

		expect(onSubmit).not.toHaveBeenCalled();
		await expect
			.element(page.getByText('Le temps limite va de 1 à 60 minutes'))
			.toBeInTheDocument();

		await input.fill('0');
		await submit();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('repasser en Entraînement retire le temps limite de ce qui est envoyé', async () => {
		const onSubmit = vi.fn<OnSubmit>();
		const { container } = await renderForm({
			onSubmit,
			initialData: { form: 'course', time_limit_minutes: 12 }
		});

		await page.getByRole('button', { name: 'Choisir une forme' }).click();
		await page.getByRole('option', { name: 'Entraînement' }).click();

		expect(container.querySelector('#timeLimit')).toBeNull();
		await submit();
		expect(onSubmit.mock.calls[0][0]).toMatchObject({
			form: 'interactive',
			time_limit_minutes: null
		});
	});

	it('reprend le temps d’une évaluation existante', async () => {
		await renderForm({
			onSubmit: vi.fn<OnSubmit>(),
			initialData: { form: 'course', time_limit_minutes: 12 }
		});
		await expect.element(page.getByLabelText('Temps limite (minutes)')).toHaveValue(12);
	});
});

describe('EvaluationConfigForm — la composition vient de la série', () => {
	it('n’a ni champ catégories, ni titre, ni niveau', async () => {
		const { container } = await renderForm({ onSubmit: vi.fn<OnSubmit>() });

		expect(container.textContent).not.toMatch(/catégorie/i);
		expect(container.querySelector('#title')).toBeNull();
		expect(container.textContent).not.toContain('Niveau');
	});
});

describe('EvaluationConfigForm — ordre aléatoire (MyCheckbox)', () => {
	it('décocher « Mélanger l’ordre des questions » envoie shuffle_questions à false', async () => {
		const onSubmit = vi.fn<OnSubmit>();
		await renderForm({ onSubmit });

		const checkbox = page.getByRole('checkbox', { name: "Mélanger l'ordre des questions" });
		await expect.element(checkbox).toBeChecked();
		await userEvent.click(checkbox);
		await submit();

		expect(onSubmit.mock.calls[0][0].shuffle_questions).toBe(false);
	});
});

describe('EvaluationConfigForm — date limite', () => {
	it('envoie la date limite en ISO', async () => {
		const onSubmit = vi.fn<OnSubmit>();
		await renderForm({ onSubmit });

		await page.getByLabelText('Date limite (facultative)').fill('2099-05-01T10:30');
		await submit();

		const deadline = onSubmit.mock.calls[0][0].deadline;
		expect(deadline).not.toBeNull();
		expect(new Date(deadline!).getTime()).toBe(new Date('2099-05-01T10:30').getTime());
	});
});
