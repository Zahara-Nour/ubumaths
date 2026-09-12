/**
 * resolveAssignmentAccess — tests
 * ================================
 *
 * Le module tranche entre trois issues : écrire, relire seulement, rien. La
 * quatrième — « je n'ai pas su lire » — ne doit surtout PAS se confondre avec
 * « rien » : un refus par défaut sur panne ferait répondre « devoir
 * introuvable » à un élève dont le devoir existe.
 *
 * Deuxième invariant, plus discret : `can_read_assignment` n'est appelée que
 * si `can_access_assignment` a refusé. Un élève en cours d'année ne paie pas
 * un aller-retour de plus.
 */

import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { resolveAssignmentAccess } from '../assignment-access';

const AFFECTATION = '550e8400-e29b-41d4-a716-446655440000';

type Reponse = { data: unknown; error: unknown };

function mockSupabase(reponses: Record<string, Reponse>) {
	const rpc = vi.fn((nom: string) => Promise.resolve(reponses[nom] ?? { data: null, error: null }));
	return { client: { rpc } as unknown as SupabaseClient<Database>, rpc };
}

describe('resolveAssignmentAccess', () => {
	it('accorde l’accès plein au membre actif', async () => {
		const { client, rpc } = mockSupabase({
			can_access_assignment: { data: true, error: null }
		});

		expect(await resolveAssignmentAccess(client, AFFECTATION)).toEqual({
			canRead: true,
			readOnly: false
		});

		// Le second appel n'a pas lieu : inutile, et il coûterait un aller-retour
		// à chaque ouverture de fiche par un élève en cours d'année.
		expect(rpc).toHaveBeenCalledTimes(1);
		expect(rpc).toHaveBeenCalledWith('can_access_assignment', { p_assignment_id: AFFECTATION });
	});

	it('accorde la lecture seule à l’ancien membre', async () => {
		const { client, rpc } = mockSupabase({
			can_access_assignment: { data: false, error: null },
			can_read_assignment: { data: true, error: null }
		});

		expect(await resolveAssignmentAccess(client, AFFECTATION)).toEqual({
			canRead: true,
			readOnly: true
		});
		expect(rpc).toHaveBeenCalledTimes(2);
	});

	it('refuse celui qui n’a jamais eu accès', async () => {
		const { client } = mockSupabase({
			can_access_assignment: { data: false, error: null },
			can_read_assignment: { data: false, error: null }
		});

		expect(await resolveAssignmentAccess(client, AFFECTATION)).toEqual({
			canRead: false,
			readOnly: false
		});
	});

	it('traite l’absence de ligne comme un refus, pas comme une panne', async () => {
		// PGRST116 = zéro ligne. C'est une ABSENCE, la suite sait la traiter.
		const { client } = mockSupabase({
			can_access_assignment: { data: null, error: { code: 'PGRST116' } },
			can_read_assignment: { data: null, error: { code: 'PGRST116' } }
		});

		expect(await resolveAssignmentAccess(client, AFFECTATION)).toEqual({
			canRead: false,
			readOnly: false
		});
	});

	describe('une panne n’est pas un refus', () => {
		it('lève 500 si le contrôle d’écriture échoue', async () => {
			const { client } = mockSupabase({
				can_access_assignment: { data: null, error: { code: '57014', message: 'timeout' } }
			});

			await expect(resolveAssignmentAccess(client, AFFECTATION)).rejects.toMatchObject({
				status: 500
			});
		});

		it('lève 500 si le contrôle de lecture échoue', async () => {
			// Le premier a refusé légitimement, le second est tombé. Renvoyer
			// « pas d'accès » ici accuserait l'élève d'un problème de serveur.
			const { client } = mockSupabase({
				can_access_assignment: { data: false, error: null },
				can_read_assignment: { data: null, error: { code: '57014', message: 'timeout' } }
			});

			await expect(resolveAssignmentAccess(client, AFFECTATION)).rejects.toMatchObject({
				status: 500
			});
		});
	});
});
