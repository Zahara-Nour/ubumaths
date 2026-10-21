/**
 * StudentPasswordReset — la fenêtre ne se ferme pas pendant la réinitialisation
 * (revue de la PR 3, n° 3) : fermée trop tôt, le mot de passe provisoire serait appliqué
 * sans jamais être vu par le prof.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import StudentPasswordReset from '../StudentPasswordReset.svelte';

const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440001';

describe('StudentPasswordReset', () => {
	let originalFetch: typeof globalThis.fetch;
	let respond: (password: string) => void;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
		globalThis.fetch = vi.fn(
			() =>
				new Promise<Response>((resolve) => {
					respond = (password) =>
						resolve(
							new Response(JSON.stringify({ password }), {
								status: 200,
								headers: { 'Content-Type': 'application/json' }
							})
						);
				})
		) as unknown as typeof globalThis.fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it('Échap pendant la requête → la fenêtre reste, le mot de passe s’affiche', async () => {
		await render(StudentPasswordReset, { studentId: STUDENT_ID, studentName: 'Noélie' });
		await userEvent.click(page.getByRole('button', { name: 'Réinitialiser le mot de passe' }));
		const reset = page.getByRole('button', { name: 'Réinitialiser', exact: true });
		await userEvent.click(reset);
		await expect.element(reset).toBeDisabled();

		await userEvent.keyboard('{Escape}');
		respond('Tigre-Lune-47');

		await expect.element(page.getByText('Tigre-Lune-47')).toBeVisible();
	});

	it('hors requête → Échap ferme la fenêtre', async () => {
		await render(StudentPasswordReset, { studentId: STUDENT_ID, studentName: 'Noélie' });
		await userEvent.click(page.getByRole('button', { name: 'Réinitialiser le mot de passe' }));
		await expect.element(page.getByRole('dialog')).toBeVisible();
		await userEvent.keyboard('{Escape}');
		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
	});
});
