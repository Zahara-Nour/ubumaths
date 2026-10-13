/**
 * Import d'élèves : une panne du serveur n'est pas une erreur de saisie.
 * =====================================================================
 *
 * Quand la lecture d'un profil existant échouait (autre chose que « aucune
 * ligne »), l'action levait une 500… aussitôt rattrapée par le `catch` final,
 * qui répondait 400 « Données invalides » : l'admin cherchait une faute dans
 * un fichier juste.
 *
 * @module routes/admin/import-students/panne-serveur.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWriteVerdictSupabase } from '$tests/helpers/write-verdict-supabase';

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001';
const SCHOOL_ID = '550e8400-e29b-41d4-a716-446655440030';

function importRequest(): Request {
	const body = new FormData();
	body.append(
		'students',
		JSON.stringify([
			{
				email: 'alice@ecole.fr',
				firstname: 'Alice',
				lastname: 'Dupont',
				grade: '6',
				class_codes: []
			}
		])
	);
	body.append('school_id', SCHOOL_ID);
	return new Request('http://localhost', { method: 'POST', body });
}

describe('admin/import-students : panne du serveur → 500', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('lecture du profil existant en panne → 500, pas 400', async () => {
		const { client } = createWriteVerdictSupabase({
			classes: { awaited: { data: [], error: null } },
			// Doublon : on passe au traitement élève par élève.
			pending_students: { awaited: { data: null, error: { code: '23505' } } },
			profiles: { single: { data: null, error: { code: '57014', message: 'timeout' } } }
		});
		const { actions } = await import('../+page.server');

		let outcome: unknown;
		try {
			outcome = await actions.import({
				request: importRequest(),
				locals: {
					supabase: client,
					user: { id: ADMIN_ID },
					profile: { id: ADMIN_ID, role: 'admin' }
				}
			} as never);
		} catch (err) {
			outcome = err;
		}

		expect(outcome).toMatchObject({ status: 500 });
	});
});
