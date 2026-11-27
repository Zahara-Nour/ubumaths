/**
 * Tests de preuve du registre des écarts (docs/ecarts/registre.md), domaine
 * rapports de bug.
 *
 * Chaque test affirme le comportement ATTENDU d'un écart encore ouvert : il est
 * rouge tant que l'écart est vrai. Le nom de chaque `describe` porte l'identifiant
 * de l'écart, que le registre retient par `› L122`.
 *
 * Les tests nommés « témoin » sont verts aujourd'hui : ils montrent que le même
 * geste marche sur un cas voisin, donc que le rouge vient bien de l'écart.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createWriteVerdictSupabase } from '#tests/helpers/write-verdict-supabase.ts';

const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const REPORT_ID = '550e8400-e29b-41d4-a716-446655440040';
const OLD_PATH = `${USER_ID}/${REPORT_ID}/1700000000000.png`;

/** Signature PNG (octets magiques) suivie de quelques octets. */
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

const log = vi.hoisted(() => ({
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn()
}));

vi.mock('#lib/utils/logger.ts', () => ({
	createServerLogger: () => log,
	createLogger: () => log
}));

describe('L122 : remplacement d’une capture, ancienne capture non effacée', () => {
	beforeEach(() => {
		vi.resetModules();
		for (const spy of Object.values(log)) spy.mockClear();
	});

	/**
	 * Remplace la capture d'un rapport qui en a déjà une ; `removal` est ce que le
	 * stockage rend à l'effacement de l'ancienne. Rend le nombre d'alertes
	 * (avertissements et erreurs) écrites au journal du serveur.
	 */
	async function alertsAfterReplacing(removal: { data: unknown; error: unknown }): Promise<number> {
		const { client, bucket, removedPaths } = createWriteVerdictSupabase({
			profiles: { single: { data: { id: USER_ID, role: 'student' }, error: null } },
			bug_reports: {
				single: {
					data: { id: REPORT_ID, user_id: USER_ID, screenshot_path: OLD_PATH },
					error: null
				},
				awaited: { data: [{ id: REPORT_ID }], error: null }
			}
		});
		bucket.remove.mockImplementation(async (paths: string[]) => {
			removedPaths.push(paths);
			return removal as { data: never[]; error: null };
		});
		const { POST } = await import('../../src/routes/api/bug-reports/[reportId]/screenshot/+server');

		const body = new FormData();
		body.append('image', new File([PNG_BYTES], 'capture.png', { type: 'image/png' }));
		const response = await POST({
			params: { reportId: REPORT_ID },
			request: new Request('http://localhost', { method: 'POST', body }),
			locals: {
				supabase: client,
				user: { id: USER_ID },
				safeGetSession: vi.fn().mockResolvedValue({
					user: { id: USER_ID },
					session: { access_token: 'token' }
				})
			}
		} as never);

		// La nouvelle capture est enregistrée et l'effacement de l'ancienne demandé :
		// sinon le compte d'alertes ne dirait rien de l'écart.
		if (response.status !== 200) throw new Error(`envoi refusé : ${response.status}`);
		if (JSON.stringify(removedPaths) !== JSON.stringify([[OLD_PATH]])) {
			throw new Error(`effacement inattendu : ${JSON.stringify(removedPaths)}`);
		}
		return log.warn.mock.calls.length + log.error.mock.calls.length;
	}

	it('témoin : ancienne capture effacée (le stockage rend son nom), aucune alerte', async () => {
		expect(await alertsAfterReplacing({ data: [{ name: OLD_PATH }], error: null })).toBe(0);
	});

	it('témoin : effacement en erreur, le journal le dit', async () => {
		expect(
			await alertsAfterReplacing({ data: null, error: { message: 'stockage indisponible' } })
		).toBeGreaterThan(0);
	});

	// Un effacement refusé par les règles du stockage ne rend pas d'erreur : il rend
	// zéro fichier. Aujourd'hui : rien au journal, l'ancienne capture reste orpheline.
	it('effacement refusé en silence (zéro fichier rendu), le journal le dit', async () => {
		expect(await alertsAfterReplacing({ data: [], error: null })).toBeGreaterThan(0);
	});
});
