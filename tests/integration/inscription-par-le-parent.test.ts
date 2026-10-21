/**
 * Inscription d'un enfant par son parent (PR 2)
 * ==============================================
 *
 * `createChildAccount` crée le compte par la clé service, sur le domaine fictif, avec la
 * marque `child_account` ; le trigger `handle_new_user` fait le reste (code de classe →
 * approuvé, inscrit). `createParentRequest` crée la demande en attente pour le parent.
 *
 * Ce que le fichier prouve :
 *   1. identifiant `prenom` + 2 chiffres, profil approuvé dans la classe, prénom tel que saisi ;
 *   2. l'enfant se connecte avec son identifiant, en majuscules et avec accents ;
 *   3. deux enfants du même prénom → deux identifiants distincts ;
 *   4. classe fermée → refus, aucun compte laissé derrière ;
 *   5. demande au parent en attente, `email_count` à 0 puis 1 une fois le courriel parti ;
 *   6. une 6e reste soumise au consentement (lecture seule avant le clic du parent).
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
import {
	createChildAccount,
	createParentRequest,
	markParentEmailSent
} from '$lib/server/child-registration';
import { CHILD_ACCOUNT_DOMAIN, normalizeLoginIdentifier } from '$lib/utils/child-account';
import { hasValidConsent } from '$lib/utils/consent';

// ============================================================================
// HELPERS
// ============================================================================

const service = createServiceRoleClient();
const creees: string[] = [];
const MOT_DE_PASSE = 'Zz-Enfant-2026!';
// Prénom propre au fichier : les identifiants des autres tests ne le gênent pas.
const PRENOM = 'Zoélîa';

async function classe(ouverte: boolean) {
	const { data: school } = await service
		.from('schools')
		.insert({ name: `zz-PAR ${crypto.randomUUID()}`, city: 'zz', country: 'zz' })
		.select('id')
		.single();
	const { data: cls, error } = await service
		.from('classes')
		.insert({
			name: 'zz-PAR',
			join_code: `PA${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`,
			is_active: true,
			registration_open: ouverte,
			school_id: school!.id,
			grade: '6'
		} as Database['public']['Tables']['classes']['Insert'])
		.select('id, join_code')
		.single();
	if (error) throw new Error(`classe : ${error.message}`);
	return cls!;
}

async function inscrire(classCode: string) {
	const res = await createChildAccount(service, {
		childFirstname: PRENOM,
		password: MOT_DE_PASSE,
		classCode,
		termsVersion: 'cgu-test'
	});
	if (res.ok) creees.push(res.userId);
	return res;
}

// ============================================================================
// TESTS
// ============================================================================

describe('inscription par le parent', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		// L'insertion d'une classe crée sa conversation, qui exige le prof.
		await TestData.profile().withRole('teacher').create();
	});

	afterAll(async () => {
		for (const id of creees) await service.auth.admin.deleteUser(id);
		await cleanupAllTestData();
		const pg = await getPostgresClient();
		await pg.query(`delete from schools where name like 'zz-PAR %'`);
	});

	it('crée un compte approuvé dans la classe, identifiant prénom + 2 chiffres', async () => {
		const cls = await classe(true);
		const res = await inscrire(cls.join_code);
		expect(res.ok).toBe(true);
		if (!res.ok) return;

		expect(res.loginId).toMatch(/^zoelia\d{2}$/);
		expect(res.grade).toBe('6');

		const { data: profil } = await service
			.from('profiles')
			.select(
				'email, firstname, lastname, status, role, consent_required, consent_granted_at, consent_grace_period_ends'
			)
			.eq('id', res.userId)
			.single();
		expect(profil).toMatchObject({
			email: `${res.loginId}@${CHILD_ACCOUNT_DOMAIN}`,
			firstname: PRENOM,
			lastname: '',
			status: 'approved',
			consent_required: true,
			consent_granted_at: null,
			// La règle commune donnerait 30 jours d'accès complet : retirés (Q2).
			consent_grace_period_ends: null
		});
		// Lecture seule avant le clic du parent (Q2) : la garde d'accès le refuse.
		expect(hasValidConsent(profil!)).toBe(false);

		const { data: membre } = await service
			.from('class_members')
			.select('class_id')
			.eq('student_id', res.userId);
		expect(membre?.map((m) => m.class_id)).toEqual([cls.id]);
	});

	it("l'enfant se connecte avec son identifiant, majuscules et accents compris", async () => {
		const cls = await classe(true);
		const res = await inscrire(cls.join_code);
		if (!res.ok) throw new Error(res.reason);

		const saisie = res.loginId.toUpperCase().replace('E', 'É');
		const { data, error } = await createTestSupabaseClient().auth.signInWithPassword({
			email: normalizeLoginIdentifier(saisie)!,
			password: MOT_DE_PASSE
		});
		expect(error).toBeNull();
		expect(data.user?.id).toBe(res.userId);
	});

	it('deux enfants du même prénom : deux identifiants distincts', async () => {
		const cls = await classe(true);
		const a = await inscrire(cls.join_code);
		const b = await inscrire(cls.join_code);
		if (!a.ok || !b.ok) throw new Error('inscription refusée');
		expect(a.loginId).not.toBe(b.loginId);
	});

	it('classe fermée : refus, aucun compte laissé derrière', async () => {
		const cls = await classe(false);
		const pg = await getPostgresClient();
		const avant = await pg.query(
			`select count(*)::int as n from auth.users where email like 'zoelia%@${CHILD_ACCOUNT_DOMAIN}'`
		);

		const res = await inscrire(cls.join_code);
		expect(res).toEqual({ ok: false, reason: 'class_closed' });

		const apres = await pg.query(
			`select count(*)::int as n from auth.users where email like 'zoelia%@${CHILD_ACCOUNT_DOMAIN}'`
		);
		expect(apres.rows[0].n).toBe(avant.rows[0].n);
	});

	it('demande au parent en attente, email_count noté une fois le courriel parti', async () => {
		const cls = await classe(true);
		const res = await inscrire(cls.join_code);
		if (!res.ok) throw new Error(res.reason);

		const demande = await createParentRequest(service, res.userId, 'parent-zz@exemple.fr');
		expect(demande).not.toBeNull();

		const lire = () =>
			service
				.from('parental_consents')
				.select('parent_email, status, email_count')
				.eq('consent_token', demande!.token)
				.single();

		expect((await lire()).data).toEqual({
			parent_email: 'parent-zz@exemple.fr',
			status: 'pending',
			email_count: 0
		});

		await markParentEmailSent(service, demande!.token);
		expect((await lire()).data?.email_count).toBe(1);
	});
});
