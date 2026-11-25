/**
 * Invitation de cours particulier : le parent crée l'espace de son enfant (base locale)
 * ====================================================================================
 *
 * Chantier `invitation-cours-particulier` (docs/wip/invitation-cours-particulier-progress.md),
 * PR 3 : `redeemInvitation` (`#lib/server/private-lessons/redeem.ts`), appelée par la page
 * `/auth/register/invitation/[token]`. Les invitations sont créées par `createInvitation`
 * (PR 2), avec un faux expéditeur dont on lit le jeton.
 *
 *  - nominal : compte `prenom` + 3 chiffres approuvé, école et niveau de l'invitation ; classe
 *    `PRENOM123` de l'école, du niveau, de l'année en cours, inscriptions fermées ; adhésion ;
 *    CGU ; consentement accordé (IP, navigateur, adresse du parent) ; invitation utilisée,
 *    liée au compte et à la classe ; le lien ne s'ouvre plus ; l'enfant se connecte ;
 *    courriel final au parent avec l'identifiant ;
 *  - deux validations simultanées : un seul compte ;
 *  - lien inconnu, expiré, annulé, utilisé : refus, rien de créé ;
 *  - lien réservé depuis moins de 5 min : « en cours » ;
 *  - annulation pendant la création : tout est défait, rien ne reste ;
 *  - école sans année en cours : tout est défait, le lien reste valable ;
 *  - courriel final refusé : l'espace est créé quand même.
 *
 * ⚠️ Aucune assertion ne se contente d'un `error === null`.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
	cleanupAllTestData,
	createServiceRoleClient,
	createTestSupabaseClient
} from '../helpers/database/trigger-test-helpers';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import {
	createInvitation,
	type InvitationEmailSender
} from '#lib/server/private-lessons/invitations.ts';
import { redeemInvitation, type WelcomeEmailSender } from '#lib/server/private-lessons/redeem.ts';
import type { PrivateLessonWelcomeEmailData } from '#lib/email-templates/private-lesson-welcome.ts';
import { CHILD_ACCOUNT_DOMAIN, normalizeLoginIdentifier } from '#lib/utils/child-account.ts';
import { hasValidConsent } from '#lib/utils/consent.ts';

// Constantes

const TABLE = 'private_lesson_invitations';
const PARENT_EMAIL = 'parent.zelie@example.test';
const MOT_DE_PASSE = 'Zz-Invitation-2026!';
const IP = '203.0.113.7';
const NAVIGATEUR = 'Navigateur de test';
const JOUR = 86_400_000;
const service = createServiceRoleClient();

// Variables

let ecole: { id: string; name: string };
let ecoleSansAnnee: { id: string; name: string };
let adminId: string;
let anneeId: string;
let jetons: string[] = [];
let finaux: { to: string; data: PrivateLessonWelcomeEmailData }[] = [];
const comptes: string[] = [];

// Functions

const expediteurInvitation: InvitationEmailSender = async (_to, data) => {
	jetons.push(data.token);
	return { success: true, messageId: 'faux' };
};

const expediteurFinal: WelcomeEmailSender = async (to, data) => {
	finaux.push({ to, data });
	return { success: true, messageId: 'faux' };
};

const expediteurFinalRefuse: WelcomeEmailSender = async () => ({
	success: false,
	error: 'Envoi refusé par Brevo (statut 400)'
});

/** Un prénom par test (lettres seules) : les identifiants ne se gênent pas. */
let numero = 0;
function prenomNeuf(): string {
	numero += 1;
	return `Zelie${'abcdefghijklmnopqrstuvwxyz'[numero % 26]}`;
}

async function inviter(
	firstname = prenomNeuf(),
	school = ecole
): Promise<{ id: string; token: string; firstname: string }> {
	const outcome = await createInvitation(service, expediteurInvitation, {
		school,
		firstname,
		parentEmail: PARENT_EMAIL,
		grade: '5',
		createdBy: adminId
	});
	if (!outcome.ok) throw new Error(`invitation refusée : ${outcome.reason}`);
	const token = jetons.at(-1);
	if (!token) throw new Error('aucun jeton');
	return { id: outcome.invitation.id, token, firstname };
}

function valider(
	token: string,
	send: WelcomeEmailSender = expediteurFinal,
	beforeFinalize?: () => Promise<void>
) {
	return redeemInvitation(
		service,
		send,
		{ token, password: MOT_DE_PASSE, termsVersion: 'cgu-test', ip: IP, userAgent: NAVIGATEUR },
		{ beforeFinalize }
	).then((outcome) => {
		if (outcome.ok) comptes.push(outcome.studentId);
		return outcome;
	});
}

async function invitation(id: string) {
	const { data, error } = await service
		.from(TABLE)
		.select('used_at, cancelled_at, claimed_at, student_id, class_id')
		.eq('id', id)
		.single();
	if (error) throw new Error(error.message);
	return data;
}

async function lireParLien(token: string): Promise<unknown> {
	const { data, error } = await service.rpc('get_private_lesson_invitation', { p_token: token });
	if (error) throw new Error(error.message);
	return data;
}

/** Comptes, classes et profils au nom d'un prénom : ce qu'une création ratée ne doit pas laisser. */
async function traces(firstname: string): Promise<{ users: number; classes: number }> {
	const pg = await getPostgresClient();
	const base = firstname.toLowerCase();
	const users = await pg.query(`select count(*)::int as n from auth.users where email like $1`, [
		`${base}%@${CHILD_ACCOUNT_DOMAIN}`
	]);
	const classes = await pg.query(`select count(*)::int as n from classes where name like $1`, [
		`${firstname.toUpperCase()}%`
	]);
	return { users: users.rows[0].n, classes: classes.rows[0].n };
}

async function nouvelleEcole(name: string): Promise<{ id: string; name: string }> {
	const { data, error } = await service
		.from('schools')
		.insert({ name, city: 'Testville', country: 'France' })
		.select('id, name')
		.single();
	if (error || !data) throw new Error(`schools : ${error?.message}`);
	return data;
}

// Tests

describe('invitation de cours particulier : la page du parent (base locale)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		// L'insertion d'une classe crée sa conversation, qui exige le prof.
		await TestData.profile().withRole('teacher').create();
		adminId = (await TestData.profile().withRole('admin').create()).id;
		ecole = await nouvelleEcole('zz-INV Cours particuliers parent');
		ecoleSansAnnee = await nouvelleEcole('zz-INV Sans annee');

		const debut = new Date(Date.now() - 30 * JOUR).toISOString().slice(0, 10);
		const fin = new Date(Date.now() + 300 * JOUR).toISOString().slice(0, 10);
		const { data, error } = await service
			.from('school_years')
			.insert({ school_id: ecole.id, name: 'Année test', start_date: debut, end_date: fin })
			.select('id')
			.single();
		if (error || !data) throw new Error(`school_years : ${error?.message}`);
		anneeId = data.id;
	});

	beforeEach(() => {
		jetons = [];
		finaux = [];
	});

	afterAll(async () => {
		for (const id of comptes) await service.auth.admin.deleteUser(id);
		const pg = await getPostgresClient();
		await pg.query(`delete from classes where school_id in ($1, $2)`, [
			ecole.id,
			ecoleSansAnnee.id
		]);
		// Invitations et années partent avec leur école (on delete cascade).
		await pg.query(`delete from schools where name like 'zz-INV %'`);
		await cleanupAllTestData();
	});

	it('nominal : compte, classe fermée, adhésion, CGU, consentement, invitation utilisée', async () => {
		const inv = await inviter('Zélie');
		const outcome = await valider(inv.token);
		expect(outcome).toMatchObject({ ok: true, childFirstname: 'Zélie', emailSent: true });
		if (!outcome.ok) return;
		expect(outcome.loginId).toMatch(/^zelie\d{3}$/);

		// Profil
		const { data: profil } = await service
			.from('profiles')
			.select(
				'email, firstname, lastname, role, status, school_id, grade, consent_required, consent_granted_at, consent_grace_period_ends'
			)
			.eq('id', outcome.studentId)
			.single();
		expect(profil).toMatchObject({
			email: `${outcome.loginId}@${CHILD_ACCOUNT_DOMAIN}`,
			firstname: 'Zélie',
			lastname: '',
			role: 'student',
			status: 'approved',
			school_id: ecole.id,
			grade: '5',
			consent_required: true,
			consent_grace_period_ends: null
		});
		expect(profil?.consent_granted_at).not.toBeNull();
		expect(hasValidConsent(profil!)).toBe(true);

		// Classe
		const { data: classe } = await service
			.from('classes')
			.select('id, name, school_id, grade, school_year_id, is_active, registration_open')
			.eq('id', outcome.classId)
			.single();
		expect(classe).toEqual({
			id: outcome.classId,
			name: outcome.loginId.toUpperCase(),
			school_id: ecole.id,
			grade: '5',
			school_year_id: anneeId,
			is_active: true,
			registration_open: false
		});

		// Adhésion
		const { data: membres } = await service
			.from('class_members')
			.select('student_id')
			.eq('class_id', outcome.classId);
		expect(membres).toEqual([{ student_id: outcome.studentId }]);

		// CGU
		const { data: cgu } = await service
			.from('terms_acceptances')
			.select('terms_version')
			.eq('user_id', outcome.studentId);
		expect(cgu).toEqual([{ terms_version: 'cgu-test' }]);

		// Consentement : preuve de la requête, adresse du parent
		const { data: consentements } = await service
			.from('parental_consents')
			.select('parent_email, status, consent_ip, consent_user_agent, consent_given_at')
			.eq('student_id', outcome.studentId);
		expect(consentements).toHaveLength(1);
		expect(consentements![0]).toMatchObject({
			parent_email: PARENT_EMAIL,
			status: 'granted',
			consent_ip: IP,
			consent_user_agent: NAVIGATEUR
		});
		expect(consentements![0].consent_given_at).not.toBeNull();

		// Invitation utilisée, liée ; le lien ne s'ouvre plus
		const ligne = await invitation(inv.id);
		expect(ligne.used_at).not.toBeNull();
		expect(ligne.cancelled_at).toBeNull();
		expect(ligne.student_id).toBe(outcome.studentId);
		expect(ligne.class_id).toBe(outcome.classId);
		expect(await lireParLien(inv.token)).toBeNull();

		// Courriel final au parent
		expect(finaux).toEqual([
			{ to: PARENT_EMAIL, data: { childFirstname: 'Zélie', loginId: outcome.loginId } }
		]);

		// L'enfant se connecte avec son identifiant
		const { data: session, error } = await createTestSupabaseClient().auth.signInWithPassword({
			email: normalizeLoginIdentifier(outcome.loginId)!,
			password: MOT_DE_PASSE
		});
		expect(error).toBeNull();
		expect(session.user?.id).toBe(outcome.studentId);
	});

	it('un lien déjà utilisé : refusé, aucun second compte', async () => {
		const inv = await inviter();
		const premier = await valider(inv.token);
		expect(premier.ok).toBe(true);

		const second = await valider(inv.token);
		expect(second).toEqual({ ok: false, reason: 'invalid' });
		expect(await traces(inv.firstname)).toEqual({ users: 1, classes: 1 });
	});

	it('deux validations simultanées : un seul compte', async () => {
		const inv = await inviter();
		const [a, b] = await Promise.all([valider(inv.token), valider(inv.token)]);
		const reussies = [a, b].filter((o) => o.ok);
		const refusees = [a, b].filter((o) => !o.ok);
		expect(reussies).toHaveLength(1);
		expect(refusees).toHaveLength(1);
		expect(['in_use', 'invalid']).toContain(!refusees[0].ok && refusees[0].reason);
		expect(await traces(inv.firstname)).toEqual({ users: 1, classes: 1 });
	});

	it('lien inconnu, expiré ou annulé : refusé, rien de créé', async () => {
		expect(await valider('x'.repeat(43))).toEqual({ ok: false, reason: 'invalid' });

		const expiree = await inviter();
		await service
			.from(TABLE)
			.update({ expires_at: new Date(Date.now() - 1000).toISOString() })
			.eq('id', expiree.id)
			.select('id');
		expect(await valider(expiree.token)).toEqual({ ok: false, reason: 'invalid' });
		expect(await traces(expiree.firstname)).toEqual({ users: 0, classes: 0 });

		const annulee = await inviter();
		await service
			.from(TABLE)
			.update({ cancelled_at: new Date().toISOString() })
			.eq('id', annulee.id)
			.select('id');
		expect(await valider(annulee.token)).toEqual({ ok: false, reason: 'invalid' });
		expect(await traces(annulee.firstname)).toEqual({ users: 0, classes: 0 });
	});

	it('réservé depuis moins de 5 min : « en cours » ; réservation périmée : passe', async () => {
		const inv = await inviter();
		await service
			.from(TABLE)
			.update({ claimed_at: new Date(Date.now() - 60_000).toISOString() })
			.eq('id', inv.id)
			.select('id');
		expect(await valider(inv.token)).toEqual({ ok: false, reason: 'in_use' });
		expect(await traces(inv.firstname)).toEqual({ users: 0, classes: 0 });

		await service
			.from(TABLE)
			.update({ claimed_at: new Date(Date.now() - 6 * 60_000).toISOString() })
			.eq('id', inv.id)
			.select('id');
		expect((await valider(inv.token)).ok).toBe(true);
	});

	it('annulé pendant la création : tout est défait, rien ne reste', async () => {
		const inv = await inviter();
		const pg = await getPostgresClient();
		let ids: { student: string; cls: string } | null = null;
		const lignesLiees = async (student: string, cls: string) => {
			const r = await pg.query(
				`select
					(select count(*)::int from profiles where id = $1) as profils,
					(select count(*)::int from class_members where student_id = $1 or class_id = $2) as adhesions,
					(select count(*)::int from terms_acceptances where user_id = $1) as cgu,
					(select count(*)::int from parental_consents where student_id = $1) as consentements,
					(select count(*)::int from conversations where class_id = $2) as conversations`,
				[student, cls]
			);
			return r.rows[0];
		};
		const outcome = await valider(inv.token, expediteurFinal, async () => {
			// Tout existe à ce moment-là : on le relève, pour prouver ensuite que tout est parti.
			const cree = await pg.query(
				`select p.id as student, c.id as cls from profiles p, classes c
				 where p.email like $1 and c.name = upper(split_part(p.email, '@', 1))`,
				[`${inv.firstname.toLowerCase()}%@${CHILD_ACCOUNT_DOMAIN}`]
			);
			expect(cree.rows).toHaveLength(1);
			ids = cree.rows[0];
			expect(await lignesLiees(ids!.student, ids!.cls)).toEqual({
				profils: 1,
				adhesions: 1,
				cgu: 1,
				consentements: 1,
				conversations: 1
			});
			// L'admin annule pendant que le serveur crée (sa garde le refuse ; ici, en direct).
			const { data } = await service
				.from(TABLE)
				.update({ cancelled_at: new Date().toISOString() })
				.eq('id', inv.id)
				.select('id');
			expect(data).toHaveLength(1);
		});
		expect(outcome).toEqual({ ok: false, reason: 'invalid' });

		expect(await traces(inv.firstname)).toEqual({ users: 0, classes: 0 });
		expect(ids).not.toBeNull();
		expect(await lignesLiees(ids!.student, ids!.cls)).toEqual({
			profils: 0,
			adhesions: 0,
			cgu: 0,
			consentements: 0,
			conversations: 0
		});
		const ligne = await invitation(inv.id);
		expect(ligne).toMatchObject({ used_at: null, student_id: null, class_id: null });
		expect(ligne.cancelled_at).not.toBeNull();
		expect(finaux).toEqual([]);
	});

	it('école sans année en cours : défait, réservation retirée, le lien reste valable', async () => {
		const inv = await inviter(prenomNeuf(), ecoleSansAnnee);
		expect(await valider(inv.token)).toEqual({ ok: false, reason: 'server_error' });

		expect(await traces(inv.firstname)).toEqual({ users: 0, classes: 0 });
		const ligne = await invitation(inv.id);
		expect(ligne).toMatchObject({ used_at: null, claimed_at: null });
		expect(await lireParLien(inv.token)).toMatchObject({ firstname: inv.firstname });
	});

	it('courriel final refusé : l’espace est créé quand même', async () => {
		const inv = await inviter();
		const outcome = await valider(inv.token, expediteurFinalRefuse);
		expect(outcome).toMatchObject({ ok: true, emailSent: false });
		expect(await traces(inv.firstname)).toEqual({ users: 1, classes: 1 });
		expect((await invitation(inv.id)).used_at).not.toBeNull();
	});
});
