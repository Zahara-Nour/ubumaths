/**
 * RiddleCard — un envoi refusé ou échoué rend la main à l'élève.
 *
 * Constat (audit de #1149) : la carte passait à « En attente de validation » dès le clic,
 * avant la réponse du serveur ; une erreur (500, réseau) laissait l'élève bloqué, sans
 * pouvoir réessayer sans recharger la page.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import RiddleCard from '../RiddleCard.svelte';
import type { StudentRiddle } from '$lib/types/riddle';

// ============================================================================
// CONSTANTES
// ============================================================================

const RIDDLE: StudentRiddle = {
	id: '11111111-1111-4111-8111-111111111111',
	riddle_number: 3,
	title: 'Le puits',
	genre: null,
	difficulty: 1,
	statement: 'Énoncé du puits',
	image_url: null,
	answer: null,
	created_by: '22222222-2222-4222-8222-222222222222',
	status: 'published',
	created_at: '2026-10-01T00:00:00Z',
	updated_at: '2026-10-01T00:00:00Z'
};

// ============================================================================
// TESTS
// ============================================================================

describe('RiddleCard : envoi de la réponse', () => {
	it('revient à la saisie quand la page signale un échec', async () => {
		const onSubmit = vi.fn(async () => false);
		await render(RiddleCard, { riddle: RIDDLE, mode: 'interactive', onSubmit });

		await userEvent.fill(page.getByLabelText('Votre réponse'), 'Douze mètres');
		await page.getByRole('button', { name: /Demander validation/ }).click();

		expect(onSubmit).toHaveBeenCalledWith('Douze mètres');
		await expect.element(page.getByRole('button', { name: /Demander validation/ })).toBeVisible();
		await expect.element(page.getByText('En attente de validation')).not.toBeInTheDocument();
	});

	it('reste sur « En attente de validation » quand l’envoi est accepté', async () => {
		const onSubmit = vi.fn(async () => true);
		await render(RiddleCard, { riddle: RIDDLE, mode: 'interactive', onSubmit });

		await userEvent.fill(page.getByLabelText('Votre réponse'), 'Douze mètres');
		await page.getByRole('button', { name: /Demander validation/ }).click();

		await expect.element(page.getByText('En attente de validation')).toBeVisible();
	});
});
