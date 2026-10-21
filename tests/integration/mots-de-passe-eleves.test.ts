/**
 * Mots de passe des élèves (PR 3)
 * ===============================
 *
 * Ce que le fichier prouve, contre le GoTrue et la base locaux :
 *   1. un enfant n'a de cible de réinitialisation (l'adresse du parent) que si cette adresse est
 *      CONFIRMÉE (demande la plus récente `granted`) ; en attente, inconnu → rien (R1) ;
 *   2. le jeton du lien (à nous, pas celui de GoTrue) change le mot de passe sans ouvrir de
 *      session (R2) ; GoTrue le refuse (B1) ; il ne sert qu'une fois, échoit, résiste à un
 *      mot de passe refusé ;
 *   3. un compte qui n'est pas un enfant n'est ni cible ni modifiable par jeton ;
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
	createChildResetToken,
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
		const jeton = await createChildResetToken(service, compte.userId);
		expect(jeton).toBeTruthy();

		const res = await setChildPasswordFromToken(service, compte.userId, jeton!, NOUVEAU);
		expect(res).toEqual({ ok: true, firstname: PRENOM, loginId: compte.loginId });
		// Aucune session chez le parent (R2).
		expect(await sessions(compte.userId)).toBe(0);

		expect(await seConnecte(email, NOUVEAU)).toBe(true);
		expect(await seConnecte(email, MOT_DE_PASSE)).toBe(false);

		expect(
			await setChildPasswordFromToken(service, compte.userId, jeton!, 'Zz-Encore-2026!')
		).toEqual({ ok: false, reason: 'invalid_token' });
	});

	it('2 bis. B1 : GoTrue refuse le jeton du courriel, aucune session possible', async () => {
		const compte = await enfant(code);
		const jeton = await createChildResetToken(service, compte.userId);
		const visiteur = createTestSupabaseClient();
		for (const type of ['recovery', 'magiclink', 'email'] as const) {
			const { data, error } = await visiteur.auth.verifyOtp({ type, token_hash: jeton! });
			expect(error).not.toBeNull();
			expect(data.session).toBeNull();
		}
		expect(await sessions(compte.userId)).toBe(0);
	});

	it('2 ter. mot de passe refusé par GoTrue → le même lien resservira', async () => {
		const compte = await enfant(code);
		const jeton = await createChildResetToken(service, compte.userId);
		// 5 caractères : sous le minimum de GoTrue (notre Zod est contourné ici).
		expect(await setChildPasswordFromToken(service, compte.userId, jeton!, 'Zz-1!')).toEqual({
			ok: false,
			reason: 'weak_password'
		});
		expect((await setChildPasswordFromToken(service, compte.userId, jeton!, NOUVEAU)).ok).toBe(
			true
		);
	});

	it('2 quater. lien échu, mauvais jeton, autre enfant → refusés', async () => {
		const compte = await enfant(code);
		const autre = await enfant(code);
		const jeton = await createChildResetToken(service, compte.userId);
		const plusTard = Date.now() + 3601 * 1000;
		expect(
			await setChildPasswordFromToken(service, compte.userId, jeton!, NOUVEAU, plusTard)
		).toEqual({ ok: false, reason: 'invalid_token' });
		expect(
			await setChildPasswordFromToken(service, compte.userId, 'x'.repeat(43), NOUVEAU)
		).toEqual({ ok: false, reason: 'invalid_token' });
		expect(await setChildPasswordFromToken(service, autre.userId, jeton!, NOUVEAU)).toEqual({
			ok: false,
			reason: 'invalid_token'
		});
		// Une nouvelle demande remplace la précédente.
		const second = await createChildResetToken(service, compte.userId);
		expect(await setChildPasswordFromToken(service, compte.userId, jeton!, NOUVEAU)).toEqual({
			ok: false,
			reason: 'invalid_token'
		});
		expect((await setChildPasswordFromToken(service, compte.userId, second!, NOUVEAU)).ok).toBe(
			true
		);
	});

	it('2 quinquies. le parent qui choisit le mot de passe lève la marque « à changer »', async () => {
		const compte = await enfant(code);
		await setProvisionalPassword(service, compte.userId);
		const jeton = await createChildResetToken(service, compte.userId);
		await setChildPasswordFromToken(service, compte.userId, jeton!, NOUVEAU);
		const { data } = await service.auth.admin.getUserById(compte.userId);
		expect(data.user?.app_metadata.must_change_password).toBe(false);
		expect(data.user?.app_metadata.password_reset ?? null).toBeNull();
	});

	it('3. un compte qui n’est pas un enfant : ni cible, ni changement par jeton', async () => {
		const email = `zz-adulte-${crypto.randomUUID()}@exemple.test`;
		const { data } = await service.auth.admin.createUser({
			email,
			password: MOT_DE_PASSE,
			email_confirm: true
		});
		creees.push(data.user!.id);
		const jeton = await createChildResetToken(service, data.user!.id);
		expect(await setChildPasswordFromToken(service, data.user!.id, jeton!, NOUVEAU)).toEqual({
			ok: false,
			reason: 'invalid_token'
		});
		expect(await seConnecte(email, MOT_DE_PASSE)).toBe(true);
	});

	it('3 bis. profiles.email réécrit vers une adresse fictive : pas de cible (F-b)', async () => {
		const email = `zz-adulte-${crypto.randomUUID()}@exemple.test`;
		const { data } = await service.auth.admin.createUser({
			email,
			password: MOT_DE_PASSE,
			email_confirm: true
		});
		creees.push(data.user!.id);
		const usurpee = childAccountEmail(`zzusurpe${Math.floor(Math.random() * 1e6)}`);
		await service.from('profiles').update({ email: usurpee }).eq('id', data.user!.id);
		expect(await findChildResetTarget(service, usurpee)).toEqual({ ok: false, reason: 'unknown' });
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
