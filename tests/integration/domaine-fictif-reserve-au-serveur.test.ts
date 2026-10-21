/**
 * Domaine fictif des comptes d'enfants : réservé au serveur
 * ==========================================================
 *
 * Un enfant inscrit par son parent se connecte par un identifiant (`noelie42`), stocké
 * comme `noelie42@eleves.chiph.re`. Sans garde en base, n'importe qui pouvait créer ce
 * compte par l'API publique (signUp GoTrue direct) et bloquer l'identifiant (audit PR 1,
 * Moyen 1).
 *
 * Décision de David (2026-10-21) : toute adresse du domaine fictif est refusée dans
 * `auth.users`, sauf si le compte porte `app_metadata.child_account = true` — une marque
 * que seul le serveur (clé service) peut poser.
 *
 * Ce que le fichier prouve :
 *   1. signUp public sur le domaine fictif → refusé, aucun compte créé ;
 *   2. création serveur SANS la marque → refusée ;
 *   3. création serveur AVEC la marque → acceptée ;
 *   4. changement d'adresse vers le domaine fictif sans la marque → refusé ;
 *   5. non-régression : signUp public sur une adresse ordinaire → accepté.
 *
 * @vitest-environment node
 */
import { describe, it, expect, afterAll } from 'vitest';
import {
	createServiceRoleClient,
	createTestSupabaseClient
} from '../helpers/database/trigger-test-helpers';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { CHILD_ACCOUNT_DOMAIN } from '$lib/utils/child-account';

// ============================================================================
// HELPERS
// ============================================================================

const service = createServiceRoleClient();
const creees: string[] = [];

function identifiantFictif(): string {
	return `zzsquat${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}@${CHILD_ACCOUNT_DOMAIN}`;
}

async function compteExiste(email: string): Promise<boolean> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query('select 1 from auth.users where lower(email) = lower($1)', [
		email
	]);
	return rows.length > 0;
}

// ============================================================================
// TESTS
// ============================================================================

describe('domaine fictif réservé au serveur', () => {
	afterAll(async () => {
		for (const id of creees) await service.auth.admin.deleteUser(id);
	});

	it('signUp public sur le domaine fictif : refusé, aucun compte', async () => {
		const email = identifiantFictif();
		const { data } = await createTestSupabaseClient().auth.signUp({
			email,
			password: 'Squat-2026-xyz'
		});
		if (data.user) creees.push(data.user.id);
		expect(await compteExiste(email)).toBe(false);
	});

	it('création serveur sans la marque : refusée', async () => {
		const email = identifiantFictif();
		const { data, error } = await service.auth.admin.createUser({
			email,
			password: 'Squat-2026-xyz',
			email_confirm: true
		});
		if (data.user) creees.push(data.user.id);
		expect(error).not.toBeNull();
		expect(await compteExiste(email)).toBe(false);
	});

	it('création serveur avec la marque child_account : acceptée', async () => {
		const email = identifiantFictif();
		const { data, error } = await service.auth.admin.createUser({
			email,
			password: 'Enfant-2026-xyz',
			email_confirm: true,
			app_metadata: { child_account: true }
		});
		if (data.user) creees.push(data.user.id);
		expect(error).toBeNull();
		expect(await compteExiste(email)).toBe(true);
	});

	it("changement d'adresse vers le domaine fictif sans la marque : refusé", async () => {
		const { data: cree } = await service.auth.admin.createUser({
			email: `zz-squat-${crypto.randomUUID()}@gmail.test`,
			password: 'Ordinaire-2026-xyz',
			email_confirm: true
		});
		creees.push(cree.user!.id);

		const email = identifiantFictif();
		const { error } = await service.auth.admin.updateUserById(cree.user!.id, {
			email,
			email_confirm: true
		});
		expect(error).not.toBeNull();
		expect(await compteExiste(email)).toBe(false);
	});

	it('signUp public sur une adresse ordinaire : accepté (non-régression)', async () => {
		const email = `zz-squat-${crypto.randomUUID()}@gmail.test`;
		const { data, error } = await createTestSupabaseClient().auth.signUp({
			email,
			password: 'Ordinaire-2026-xyz'
		});
		if (data.user) creees.push(data.user.id);
		expect(error).toBeNull();
		expect(await compteExiste(email)).toBe(true);
	});
});
