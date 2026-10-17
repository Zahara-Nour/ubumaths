import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ExerciseVisibilityFields from '../ExerciseVisibilityFields.svelte';

/**
 * Cases « publique » et « Afficher sur Google » du formulaire d'exercice.
 *
 * Cocher Google ouvre une fenêtre d'alerte : seule sa confirmation coche la
 * case. La case Google est grisée tant que l'exercice n'est pas public, et
 * décocher « publique » décoche aussi Google. Les clics passent par
 * `userEvent` : de vrais événements, comme ceux du professeur.
 */

const DIALOG_TITLE = 'Afficher cet exercice sur Google ?';

function googleBox() {
	return page.getByRole('checkbox', { name: 'Afficher sur Google' });
}

function publicBox() {
	return page.getByRole('checkbox', { name: /publique/ });
}

describe('ExerciseVisibilityFields', () => {
	it('cocher « Afficher sur Google » ouvre la fenêtre d’alerte sans cocher la case', async () => {
		const onchange = vi.fn();
		await render(ExerciseVisibilityFields, { isPublic: true, searchIndexed: false, onchange });

		await userEvent.click(googleBox());

		await expect.element(page.getByRole('dialog')).toBeVisible();
		await expect.element(page.getByText(DIALOG_TITLE)).toBeVisible();
		await expect
			.element(page.getByText(/sans lien ni compte\. Son contenu pourra être copié/))
			.toBeVisible();
		await expect.element(googleBox()).not.toBeChecked();
		expect(onchange).not.toHaveBeenCalled();
	});

	it('confirmer coche la case et signale le changement', async () => {
		const onchange = vi.fn();
		await render(ExerciseVisibilityFields, { isPublic: true, searchIndexed: false, onchange });

		await userEvent.click(googleBox());
		await userEvent.click(page.getByRole('button', { name: 'Afficher sur Google' }));

		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
		await expect.element(googleBox()).toBeChecked();
		expect(onchange).toHaveBeenCalled();
	});

	it('annuler laisse la case décochée et ne change rien', async () => {
		const onchange = vi.fn();
		await render(ExerciseVisibilityFields, { isPublic: true, searchIndexed: false, onchange });

		await userEvent.click(googleBox());
		await userEvent.click(page.getByRole('button', { name: 'Annuler' }));

		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
		await expect.element(googleBox()).not.toBeChecked();
		expect(onchange).not.toHaveBeenCalled();
	});

	it('décocher « Afficher sur Google » ne demande pas de confirmation', async () => {
		await render(ExerciseVisibilityFields, { isPublic: true, searchIndexed: true });

		await userEvent.click(googleBox());

		await expect.element(googleBox()).not.toBeChecked();
		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
	});

	it('la case Google est grisée tant que l’exercice n’est pas public', async () => {
		await render(ExerciseVisibilityFields, { isPublic: false, searchIndexed: false });

		await expect.element(googleBox()).toBeDisabled();

		await userEvent.click(publicBox());

		await expect.element(googleBox()).toBeEnabled();
	});

	it('décocher « publique » décoche aussi Google et grise la case', async () => {
		await render(ExerciseVisibilityFields, { isPublic: true, searchIndexed: true });
		await expect.element(googleBox()).toBeChecked();

		await userEvent.click(publicBox());

		await expect.element(publicBox()).not.toBeChecked();
		await expect.element(googleBox()).not.toBeChecked();
		await expect.element(googleBox()).toBeDisabled();
	});
});
