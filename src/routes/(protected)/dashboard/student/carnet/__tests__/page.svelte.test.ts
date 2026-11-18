/**
 * Mon carnet de liaison — ce que l'élève sait de son partage (C1-C3)
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';
import type { PageData } from '../$types';
import type { StudentCarnet } from '#lib/validation/carnet.ts';

function donnees(
	partage: Partial<StudentCarnet>,
	notifications: PageData['notifications'] = []
): PageData {
	const carnet: StudentCarnet = {
		firstname: 'Léa',
		weeks: [],
		revisions: { overdue: 0 },
		evaluations: [],
		classes: [],
		shared: true,
		opted_out: false,
		parents: 1,
		...partage
	};
	return { carnet, notifications } as unknown as PageData;
}

function phrase(): string {
	return document.querySelector('[data-testid="carnet-partage"]')?.textContent?.trim() ?? '';
}

describe('Mon carnet de liaison', () => {
	it('C1 : un parent le reçoit → « Tes parents voient cette page »', async () => {
		await render(Page, { data: donnees({ parents: 1 }), form: null });
		expect(phrase()).toContain('Tes parents voient cette page');
	});

	it('C1 : aucune adresse confirmée', async () => {
		await render(Page, { data: donnees({ parents: 0 }), form: null });
		expect(phrase()).toBe('Aucun parent ne reçoit encore ton carnet.');
	});

	it('C3 : partage coupé, même avec des adresses', async () => {
		await render(Page, {
			data: donnees({ opted_out: true, shared: false, parents: 2 }),
			form: null
		});
		expect(phrase()).toBe('Le partage avec tes parents est arrêté.');
	});

	it('carnet pas ouvert pour sa classe', async () => {
		await render(Page, { data: donnees({ shared: false, parents: 0 }), form: null });
		expect(phrase()).toContain("n'est pas encore ouvert");
	});

	it('C2 : courriels envoyés, date et motif, jamais d’adresse', async () => {
		const screen = await render(Page, {
			data: donnees({}, [
				{
					created_at: '2026-11-10T08:00:00Z',
					kind: 'exception',
					reasons: ['inactivity', 'reviews_overdue']
				},
				{ created_at: '2026-11-01T08:00:00Z', kind: 'link', reasons: [] }
			]),
			form: null
		});
		await expect
			.element(screen.getByText('Alerte : pas de travail depuis longtemps, révisions en retard'))
			.toBeVisible();
		await expect.element(screen.getByText('Envoi du lien du carnet')).toBeVisible();
		await expect.element(screen.getByText('10 novembre 2026')).toBeVisible();
		expect(document.body.textContent).not.toContain('@');
	});

	it('A2 : le formulaire d’ajout n’apparaît que si le carnet est ouvert et moins de 2 parents', async () => {
		const cas: [Partial<StudentCarnet>, boolean][] = [
			[{ parents: 0 }, true],
			[{ parents: 1 }, true],
			[{ parents: 2 }, false],
			[{ shared: false, parents: 0 }, false],
			[{ opted_out: true, shared: false, parents: 0 }, false]
		];
		for (const [partage, visible] of cas) {
			const screen = await render(Page, { data: donnees(partage), form: null });
			expect(!!document.querySelector('#carnet-parent-email'), JSON.stringify(partage)).toBe(
				visible
			);
			await screen.unmount();
		}
	});
});
