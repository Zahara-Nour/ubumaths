/**
 * Mots de passe des élèves (PR 3)
 * ===============================
 *
 * Ce que le fichier prouve, contre le GoTrue et la base locaux :
 *   1. un enfant n'a de cible de réinitialisation (l'adresse du parent) que si cette adresse est
 *      CONFIRMÉE (demande la plus récente `granted`) ; en attente, inconnu → rien (R1) ;
 *   2. le jeton de réinitialisation change le mot de passe sans ouvrir de session chez le
 *      parent (R2) ; l'enfant se connecte avec le nouveau ; le jeton ne sert qu'une fois ;
 *   3. un jeton d'un compte qui n'est pas un enfant est refusé ;
 *   4. le mot de passe provisoire du prof marche et pose la marque « à changer » (R3).
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	cleanupAllTestData,
	createServiceRoleClient,
	createTestSupabaseClient
} from '../helpers/database/trigger-test-helpers';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';
import { createChildAccount, createParentRequest } from '$lib/server/child-registration';
import {
	createChildRecoveryToken,
	findChildResetTarget,
	setChildPasswordFromToken,
	setProvisionalPassword
} from '$lib/server/child-password';
import { childAccountEmail } from '$lib/utils/child-account';

// ============================================================================
// HELPERS
// ============================================================================

const service = createServiceRoleClient();
const creees: string[] = [];
const MOT_DE_PASSE = 'Zz-Enfant-2026!';
const NOUVEAU = 'Zz-Nouveau-2026!';
// Prénom propre au fichier : les identifiants des autres tests ne le gênent pas.
const PRENOM = 'Zéphyrine';
const PARENT = 'zz-parent-mdp@exemple.test';

async function classe() {
	const { data: school } = await service
		.from('schools')
		.insert({ name: `zz-MDP ${crypto.randomUUID()}`, city: 'zz', country: 'zz' })
		.select('id')
		.single();
	const { data: cls, error } = await service
		.from('classes')
		.insert({
			name: 'zz-MDP',
			join_code: `MD${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`,
			is_active: true,
			registration_open: true,
			school_id: school!.id,
			grade: '6'
		} as Database['public']['Tables']['classes']['Insert'])
		.select('join_code')
		.single();
	if (error) throw new Error(`classe : ${error.message}`);
	return cls!.join_code;
}

async function enfant(code: string) {
	const res = await createChildAccount(service, {
		childFirstname: PRENOM,
		password: MOT_DE_PASSE,
		classCode: code,
		termsVersion: 'cgu-test'
	});
	if (!res.ok) throw new Error(`enfant : ${res.reason}`);
	creees.push(res.userId);
	return res;
}

async function confirmer(token: string) {
	const { error } = await service
		.from('parental_consents')
		.update({ status: 'granted', consent_given_at: new Date().toISOString() })
		.eq('consent_token', token);
	if (error) throw new Error(`confirmation : ${error.message}`);
}

async function sessions(userId: string): Promise<number> {
	const pg = await getPostgresClient();
	const res = await pg.query('select id from auth.sessions where user_id = $1', [userId]);
	return res.rowCount ?? 0;
}

async function seConnecte(email: string, password: string): Promise<boolean> {
	const { error } = await createTestSupabaseClient().auth.signInWithPassword({ email, password });
	return !error;
}

// ============================================================================
// TESTS
// ============================================================================

describe('Mots de passe des élèves', () => {
	let code: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		// L'insertion d'une classe crée sa conversation, qui exige le prof.
		await TestData.profile().withRole('teacher').create();
		code = await classe();
	});

	afterAll(async () => {
		for (const id of creees) await service.auth.admin.deleteUser(id);
		await cleanupAllTestData();
		const pg = await getPostgresClient();
		await pg.query(`delete from schools where name like 'zz-MDP %'`);
	});

	it('1. adresse du parent en attente → pas de cible ; confirmée → le parent', async () => {
		const compte = await enfant(code);
		const email = childAccountEmail(compte.loginId);
		const demande = await createParentRequest(service, compte.userId, PARENT);

		expect(await findChildResetTarget(service, email)).toEqual({
			ok: false,
			reason: 'unconfirmed'
		});

		await confirmer(demande!.token);
		expect(await findChildResetTarget(service, email)).toEqual({
			ok: true,
			userId: compte.userId,
			firstname: PRENOM,
			loginId: compte.loginId,
			parentEmail: PARENT
		});
	});

	it('1 bis. identifiant inconnu, ou enfant sans demande au parent → pas de cible', async () => {
		expect(await findChildResetTarget(service, childAccountEmail('zzpersonne99'))).toEqual({
			ok: false,
			reason: 'unknown'
		});
		const seul = await enfant(code);
		expect(await findChildResetTarget(service, childAccountEmail(seul.loginId))).toEqual({
			ok: false,
			reason: 'no_parent'
		});
	});

	it('1 ter. la demande la plus récente fait foi', async () => {
		const compte = await enfant(code);
		const ancienne = await createParentRequest(service, compte.userId, 'zz-ancien@exemple.test');
		await confirmer(ancienne!.token);
		await createParentRequest(service, compte.userId, 'zz-nouveau@exemple.test');
		expect(await findChildResetTarget(service, childAccountEmail(compte.loginId))).toEqual({
			ok: false,
			reason: 'unconfirmed'
		});
	});

	it('2. le jeton change le mot de passe, une seule fois, sans laisser de session', async () => {
		const compte = await enfant(code);
		const email = childAccountEmail(compte.loginId);
		const jeton = await createChildRecoveryToken(service, email);
		expect(jeton).toBeTruthy();

		const res = await setChildPasswordFromToken(service, jeton!, NOUVEAU);
		expect(res).toEqual({ ok: true, firstname: PRENOM, loginId: compte.loginId });
		// Aucune session laissée chez le parent (R2).
		expect(await sessions(compte.userId)).toBe(0);

		expect(await seConnecte(email, NOUVEAU)).toBe(true);
		expect(await seConnecte(email, MOT_DE_PASSE)).toBe(false);

		expect(await setChildPasswordFromToken(service, jeton!, 'Zz-Encore-2026!')).toEqual({
			ok: false,
			reason: 'invalid_token'
		});
	});

	it('2 bis. le parent qui choisit le mot de passe lève la marque « à changer »', async () => {
		const compte = await enfant(code);
		await setProvisionalPassword(service, compte.userId);
		const jeton = await createChildRecoveryToken(service, childAccountEmail(compte.loginId));
		await setChildPasswordFromToken(service, jeton!, NOUVEAU);
		const { data } = await service.auth.admin.getUserById(compte.userId);
		expect(data.user?.app_metadata.must_change_password).toBe(false);
	});

	it('3. un jeton d’un compte qui n’est pas un enfant est refusé', async () => {
		const email = `zz-adulte-${crypto.randomUUID()}@exemple.test`;
		const { data } = await service.auth.admin.createUser({
			email,
			password: MOT_DE_PASSE,
			email_confirm: true
		});
		creees.push(data.user!.id);
		const jeton = await createChildRecoveryToken(service, email);
		expect(await setChildPasswordFromToken(service, jeton!, NOUVEAU)).toEqual({
			ok: false,
			reason: 'not_child'
		});
		// Le refus ferme la session ouverte par le jeton (ici, aucun changement de mot de passe
		// ne le fait à notre place).
		expect(await sessions(data.user!.id)).toBe(0);
		expect(await seConnecte(email, MOT_DE_PASSE)).toBe(true);
	});

	it('4. mot de passe provisoire : il marche et pose la marque « à changer »', async () => {
		const compte = await enfant(code);
		const res = await setProvisionalPassword(service, compte.userId);
		expect(res.ok).toBe(true);
		if (!res.ok) return;

		expect(await seConnecte(childAccountEmail(compte.loginId), res.password)).toBe(true);
		const { data } = await service.auth.admin.getUserById(compte.userId);
		expect(data.user?.app_metadata.must_change_password).toBe(true);
		// La marque s'ajoute : celle du domaine fictif reste.
		expect(data.user?.app_metadata.child_account).toBe(true);
	});
});
