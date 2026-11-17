/**
 * Démarrage du serveur : jsdom chargé à la demande
 * ================================================
 *
 * `hooks.server.ts` importe `errorMonitoring`, qui importe `notifications`.
 * L'assainisseur des notifications s'appuie sur `isomorphic-dompurify`, donc sur
 * jsdom (~650 modules, ~70 % du démarrage du serveur mesuré le 2026-11-09). Chargé
 * à l'import, il pesait sur chaque démarrage à froid, page de connexion comprise.
 *
 * Ces tests prouvent qu'importer ces modules ne charge plus l'assainisseur, et
 * qu'écrire une notification l'assainit toujours.
 */
import { describe, it, expect, vi } from 'vitest';

const chargements = vi.hoisted(() => ({ dompurify: 0 }));

vi.mock('isomorphic-dompurify', async (importOriginal) => {
	chargements.dompurify += 1;
	return importOriginal();
});

const insertMock = vi.fn().mockResolvedValue({ error: null });

vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => ({ from: () => ({ insert: insertMock }) })
}));

describe('chargement de l’assainisseur des notifications', () => {
	it('importer errorMonitoring et notifications ne charge pas isomorphic-dompurify', async () => {
		await import('../errorMonitoring');
		await import('../notifications');

		expect(chargements.dompurify).toBe(0);
	});

	it('écrire une notification système charge l’assainisseur et assainit le message', async () => {
		const { insertSystemNotification } = await import('../notifications');

		await insertSystemNotification({
			title: 'T',
			message: '<p>Bonjour</p><script>alert(1)</script>',
			type: 'info',
			target_type: 'users',
			target_user_ids: ['u1'],
			system_event_type: 'badge_unlocked'
		});

		expect(chargements.dompurify).toBe(1);
		const ligne = insertMock.mock.calls[0][0] as Record<string, unknown>;
		expect(ligne.message).toBe('<p>Bonjour</p>');
	});
});
