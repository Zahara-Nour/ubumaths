/**
 * AgeQuestionDialog — question d'âge en 2nde (B7-B10).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import AgeQuestionDialog from '../AgeQuestionDialog.svelte';

const QUESTION = 'As-tu 15 ans ou plus ?';

describe('AgeQuestionDialog', () => {
	let originalFetch: typeof globalThis.fetch;
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
		fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it('B7 — s’affiche pour un élève de 2nde sans réponse', async () => {
		await render(AgeQuestionDialog, { role: 'student', grade: '2', ageDeclaration: null });
		await expect.element(page.getByText(QUESTION)).toBeVisible();
		await expect.element(page.getByText(/accord de tes parents/)).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Oui' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Non' })).toBeVisible();
	});

	it.each([
		['autre niveau', { role: 'student', grade: '3', ageDeclaration: null }],
		['1re', { role: 'student', grade: '1_SPE', ageDeclaration: null }],
		['déjà répondu', { role: 'student', grade: '2', ageDeclaration: '15_plus' }],
		['professeur', { role: 'teacher', grade: '2', ageDeclaration: null }]
	])('B7 — ne s’affiche pas (%s)', async (_label, props) => {
		await render(AgeQuestionDialog, props);
		// Laisse le temps à un éventuel portail de s'ouvrir.
		await new Promise((r) => setTimeout(r, 50));
		expect(page.getByText(QUESTION).query()).toBeNull();
	});

	it('B8 — Oui envoie fifteenOrOlder: true puis prévient le parent', async () => {
		const onAnswered = vi.fn();
		await render(AgeQuestionDialog, {
			role: 'student',
			grade: '2',
			ageDeclaration: null,
			onAnswered
		});
		await page.getByRole('button', { name: 'Oui' }).click();
		await expect.poll(() => fetchMock.mock.calls.length).toBe(1);
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('/api/student/age-declaration');
		expect(init.method).toBe('POST');
		expect(JSON.parse(String(init.body))).toEqual({ fifteenOrOlder: true });
		await expect.poll(() => onAnswered.mock.calls.length).toBe(1);
		await expect.poll(() => page.getByText(QUESTION).query()).toBeNull();
	});

	it('B9 — Non envoie fifteenOrOlder: false', async () => {
		await render(AgeQuestionDialog, { role: 'student', grade: '2', ageDeclaration: null });
		await page.getByRole('button', { name: 'Non' }).click();
		await expect.poll(() => fetchMock.mock.calls.length).toBe(1);
		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(JSON.parse(String(init.body))).toEqual({ fifteenOrOlder: false });
	});

	it('B10 — Échap ferme sans rien envoyer', async () => {
		await render(AgeQuestionDialog, { role: 'student', grade: '2', ageDeclaration: null });
		await expect.element(page.getByText(QUESTION)).toBeVisible();
		await userEvent.keyboard('{Escape}');
		await expect.poll(() => page.getByText(QUESTION).query()).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('B10 — un clic hors de la fenêtre ferme sans rien envoyer', async () => {
		await render(AgeQuestionDialog, { role: 'student', grade: '2', ageDeclaration: null });
		await expect.element(page.getByText(QUESTION)).toBeVisible();
		const overlay = document.querySelector('[data-slot="dialog-overlay"]');
		expect(overlay).not.toBeNull();
		await page.elementLocator(overlay as Element).click({ position: { x: 5, y: 5 } });
		await expect.poll(() => page.getByText(QUESTION).query()).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
