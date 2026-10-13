/**
 * logError — ce que le journal des erreurs garde, et ce que l'alerte critique montre
 *
 * - Une adresse courriel ne reste en clair nulle part dans `context` : le masquage
 *   ne regardait que les NOMS de clés (password, token…), jamais les valeurs.
 * - Le message d'une erreur critique est un texte venu du navigateur : il est
 *   échappé avant d'entrer dans le HTML de la notification aux admins.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const insertMock = vi.fn();
const createSystemNotificationMock = vi.fn();

vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => ({
		from: () => ({
			insert: (row: Record<string, unknown>) => {
				insertMock(row);
				return {
					select: () => ({
						single: async () => ({
							data: { id: 'err-1', severity: row.severity, error_signature: 'sig' },
							error: null
						})
					})
				};
			}
		})
	})
}));
vi.mock('$lib/server/notifications', () => ({
	createSystemNotification: (...args: unknown[]) => createSystemNotificationMock(...args)
}));

import { logError } from '../errorMonitoring';

type Client = Parameters<typeof logError>[0];
const unusedClient = {} as Client;

/** Ligne écrite dans `error_logs` par le dernier appel. */
const insertedRow = () => insertMock.mock.calls.at(-1)?.[0] as Record<string, unknown>;

describe('logError — journal des erreurs', () => {
	beforeEach(() => {
		insertMock.mockReset();
		createSystemNotificationMock.mockReset();
		createSystemNotificationMock.mockResolvedValue({ success: true });
	});

	it('masque une adresse courriel dans les valeurs du contexte, même imbriquées', async () => {
		await logError(unusedClient, {
			error_type: 'server_load',
			severity: 'error',
			message: 'Profil introuvable',
			url: '/dashboard',
			context: {
				user_email: 'ada.lovelace@example.com',
				detail: { note: 'écrire à eleve-12@college.fr' },
				emails: ['x@y.org']
			}
		});

		const serialized = JSON.stringify(insertedRow().context);
		expect(serialized).not.toMatch(/@example\.com|@college\.fr|x@y\.org/);
		expect(serialized).toContain('[email]@[domain]');
	});

	it('masque une adresse courriel dans l’URL', async () => {
		await logError(unusedClient, {
			error_type: 'client_js',
			severity: 'error',
			message: 'Erreur',
			url: '/auth/login?email=ada@example.com'
		});

		expect(insertedRow().url).toBe('/auth/login?email=[email]@[domain]');
	});

	it('échappe le message d’une erreur critique dans la notification aux admins', async () => {
		await logError(unusedClient, {
			error_type: 'client_js',
			severity: 'critical',
			message: '<a href="https://piege.example">Cliquez ici</a>',
			url: '/<b>page</b>'
		});

		expect(createSystemNotificationMock).toHaveBeenCalledTimes(1);
		const [notice] = createSystemNotificationMock.mock.calls[0] as [{ message: string }];
		expect(notice.message).not.toContain('<a href');
		expect(notice.message).toContain('&lt;a href=');
		expect(notice.message).toContain('/&lt;b&gt;page&lt;/b&gt;');
	});
});
