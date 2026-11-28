/**
 * Invitation de cours particulier : comptes orphelins (base locale)
 * =================================================================
 *
 * Chantier `invitation-cours-particulier`, PR 4 : `cleanupOrphanAccounts`
 * (`#lib/server/private-lessons/orphans.ts`), lancée chaque nuit par le cron des invitations.
 * Une création interrompue (fonction tuée en route) est simulée en créant à la main ce que
 * `redeemInvitation` aurait laissé : compte marqué, profil, classe, adhésion.
 *
 *  - succès de bout en bout : la marque est retirée tout de suite ;
 *  - orphelin de plus d'une heure : compte et classe supprimés, le lien reste valable ;
 *  - orphelin de moins d'une heure : intact ;
 *  - succès dont la marque est restée : marque retirée, compte gardé ;
 *  - compte marqué déjà connecté, ou dont l'invitation a disparu : gardé ;
 *  - élève non marqué de l'école, classe au même nom : jamais regardé ;
 *  - classe qui a un autre élève : gardée.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import {
	createInvitation,
	type InvitationEmailSender
} from '#lib/server/private-lessons/invitations.ts';
import { redeemInvitation } from '#lib/server/private-lessons/redeem.ts';
import { cleanupOrphanAccounts, INVITATION_MARK } from '#lib/server/private-lessons/orphans.ts';
import { createChildAuthUser } from '#lib/server/child-registration.ts';

// Constantes

const TABLE = 'private_lesson_invitations';
const PARENT_EMAIL = 'parent.orphelin@example.test';
const MOT_DE_PASSE = 'Zz-Orphelin-2026!';
const JOUR = 86_400_000;
const service = createServiceRoleClient();

// Variables

let ecole: { id: string; name: string };
let adminId: string;
let jetons: string[] = [];
const comptes: string[] = [];

// Functions

const expediteur: InvitationEmailSender = async (_to, data) => {
	jetons.push(data.token);
	return { success: true, messageId: 'faux' };
};

let numero = 0;
function prenomNeuf(): string {
	numero += 1;
	return `Orphe${'abcdefghijklmnopqrstuvwxyz'[numero % 26]}`;
}

async function inviter(firstname = prenomNeuf()) {
	const outcome = await createInvitation(service, expediteur, {
		school: ecole,
		firstname,
		parentEmail: PARENT_EMAIL,
		grade: '5',
		createdBy: adminId
	});
	if (!outcome.ok) throw new Error(`invitation refusée : ${outcome.reason}`);
	return { id: outcome.invitation.id, token: jetons.at(-1)!, firstname };
}

/**
 * Ce que laisse une création tuée après l'adhésion : compte marqué (ou non), profil approuvé,
 * classe au nom de l'identifiant, adhésion. `ageMs` : âge du compte.
 */
async function creationInterrompue(opts: {
	firstname: string;
	mark: string | null;
	ageMs: number;
}): Promise<{ userId: string; loginId: string; classId: string }> {
	const created = await createChildAuthUser(service, {
		childFirstname: opts.firstname,
		password: MOT_DE_PASSE,
		userMetadata: { firstname: opts.firstname, lastname: '' },
		appMetadata: opts.mark ? { [INVITATION_MARK]: opts.mark } : undefined
	});
	if (!created.ok) throw new Error(created.reason);
	comptes.push(created.userId);

	const { data: profil } = await service
		.from('profiles')
		.update({ status: 'approved', school_id: ecole.id, grade: '5' })
		.eq('id', created.userId)
		.select('id');
	expect(profil).toHaveLength(1);

	const { data: cls, error } = await service
		.from('classes')
		.insert({
			name: created.loginId.toUpperCase(),
			school_id: ecole.id,
			grade: '5',
			join_code: `OR${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`,
			is_active: true,
			registration_open: false
		})
		.select('id')
		.single();
	if (error || !cls) throw new Error(`classe : ${error?.message}`);
	await service.from('class_members').insert({ class_id: cls.id, student_id: created.userId });

	const pg = await getPostgresClient();
	await pg.query(`update auth.users set created_at = $2 where id = $1`, [
		created.userId,
		new Date(Date.now() - opts.ageMs).toISOString()
	]);
	return { userId: created.userId, loginId: created.loginId, classId: cls.id };
}

async function existe(userId: string, classId: string) {
	const pg = await getPostgresClient();
	const r = await pg.query(
		`select (select count(*)::int from auth.users where id = $1) as compte,
		        (select count(*)::int from classes where id = $2) as classe`,
		[userId, classId]
	);
	return r.rows[0] as { compte: number; classe: number };
}

async function marque(userId: string): Promise<unknown> {
	const { data, error } = await service.auth.admin.getUserById(userId);
	if (error) throw new Error(error.message);
	return data.user.app_metadata?.[INVITATION_MARK] ?? null;
}

// Tests

describe('invitations de cours particulier : comptes orphelins (base locale)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		await TestData.profile().withRole('teacher').create();
		adminId = (await TestData.profile().withRole('admin').create()).id;
		const { data, error } = await service
			.from('schools')
			.insert({ name: 'zz-ORPH Cours particuliers', city: 'Testville', country: 'France' })
			.select('id, name')
			.single();
		if (error || !data) throw new Error(`schools : ${error?.message}`);
		ecole = data;
		const debut = new Date(Date.now() - 30 * JOUR).toISOString().slice(0, 10);
		const fin = new Date(Date.now() + 300 * JOUR).toISOString().slice(0, 10);
		await service
			.from('school_years')
			.insert({ school_id: ecole.id, name: 'Année test', start_date: debut, end_date: fin });
	});

	beforeEach(() => {
		jetons = [];
	});

	afterAll(async () => {
		for (const id of comptes) await service.auth.admin.deleteUser(id);
		const pg = await getPostgresClient();
		await pg.query(`delete from classes where school_id = $1`, [ecole.id]);
		await pg.query(`delete from schools where name like 'zz-ORPH %'`);
		await cleanupAllTestData();
	});

	it('succès de bout en bout : la marque est retirée tout de suite', async () => {
		const inv = await inviter();
		const outcome = await redeemInvitation(
			service,
			async () => ({ success: true, messageId: 'faux' }),
			{
				token: inv.token,
				password: MOT_DE_PASSE,
				termsVersion: 'cgu-test',
				ip: null,
				userAgent: null
			}
		);
		if (!outcome.ok) throw new Error(outcome.reason);
		comptes.push(outcome.studentId);
		expect(await marque(outcome.studentId)).toBeNull();
		// Le retrait de la marque garde les autres marques serveur.
		const { data } = await service.auth.admin.getUserById(outcome.studentId);
		expect(data.user?.app_metadata?.child_account).toBe(true);
	});

	it('orphelin de plus d’une heure : compte et classe supprimés, le lien reste valable', async () => {
		const inv = await inviter();
		const o = await creationInterrompue({
			firstname: inv.firstname,
			mark: inv.id,
			ageMs: 2 * 3600_000
		});

		const report = await cleanupOrphanAccounts(service);
		expect(report.deleted).toBeGreaterThanOrEqual(1);
		expect(await existe(o.userId, o.classId)).toEqual({ compte: 0, classe: 0 });

		const { data } = await service.rpc('get_private_lesson_invitation', { p_token: inv.token });
		expect(data).toMatchObject({ firstname: inv.firstname });
	});

	it('orphelin de moins d’une heure : intact', async () => {
		const inv = await inviter();
		const o = await creationInterrompue({
			firstname: inv.firstname,
			mark: inv.id,
			ageMs: 10 * 60_000
		});

		await cleanupOrphanAccounts(service);
		expect(await existe(o.userId, o.classId)).toEqual({ compte: 1, classe: 1 });
		expect(await marque(o.userId)).toBe(inv.id);
	});

	it('succès dont la marque est restée : marque retirée, compte et classe gardés', async () => {
		const inv = await inviter();
		const o = await creationInterrompue({
			firstname: inv.firstname,
			mark: inv.id,
			ageMs: 2 * 3600_000
		});
		const { data } = await service
			.from(TABLE)
			.update({ used_at: new Date().toISOString(), student_id: o.userId, class_id: o.classId })
			.eq('id', inv.id)
			.select('id');
		expect(data).toHaveLength(1);

		await cleanupOrphanAccounts(service);
		expect(await existe(o.userId, o.classId)).toEqual({ compte: 1, classe: 1 });
		expect(await marque(o.userId)).toBeNull();
	});

	it('compte marqué déjà connecté : gardé', async () => {
		const inv = await inviter();
		const o = await creationInterrompue({
			firstname: inv.firstname,
			mark: inv.id,
			ageMs: 2 * 3600_000
		});
		const pg = await getPostgresClient();
		await pg.query(`update auth.users set last_sign_in_at = now() where id = $1`, [o.userId]);

		await cleanupOrphanAccounts(service);
		expect(await existe(o.userId, o.classId)).toEqual({ compte: 1, classe: 1 });
	});

	it('invitation disparue : gardé', async () => {
		const o = await creationInterrompue({
			firstname: prenomNeuf(),
			mark: crypto.randomUUID(),
			ageMs: 2 * 3600_000
		});

		await cleanupOrphanAccounts(service);
		expect(await existe(o.userId, o.classId)).toEqual({ compte: 1, classe: 1 });
	});

	it('élève non marqué de l’école, classe au même nom : jamais regardé', async () => {
		const o = await creationInterrompue({ firstname: prenomNeuf(), mark: null, ageMs: 30 * JOUR });

		await cleanupOrphanAccounts(service);
		expect(await existe(o.userId, o.classId)).toEqual({ compte: 1, classe: 1 });
	});

	it('classe qui a un autre élève : gardée, l’orphelin part seul', async () => {
		const inv = await inviter();
		const o = await creationInterrompue({
			firstname: inv.firstname,
			mark: inv.id,
			ageMs: 2 * 3600_000
		});
		const autre = await TestData.profile().withRole('student').create();
		await service.from('class_members').insert({ class_id: o.classId, student_id: autre.id });

		await cleanupOrphanAccounts(service);
		expect(await existe(o.userId, o.classId)).toEqual({ compte: 0, classe: 1 });
	});

	it('classe vide plus ancienne au même nom (identifiant redonné) : gardée', async () => {
		const inv = await inviter();
		const o = await creationInterrompue({
			firstname: inv.firstname,
			mark: inv.id,
			ageMs: 2 * 3600_000
		});
		const { data: ancienne, error } = await service
			.from('classes')
			.insert({
				name: o.loginId.toUpperCase(),
				school_id: ecole.id,
				grade: '5',
				join_code: `OA${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`,
				is_active: true,
				registration_open: false
			})
			.select('id')
			.single();
		if (error || !ancienne) throw new Error(`classe : ${error?.message}`);
		const pg = await getPostgresClient();
		await pg.query(`update classes set created_at = now() - interval '3 days' where id = $1`, [
			ancienne.id
		]);

		await cleanupOrphanAccounts(service);
		expect(await existe(o.userId, o.classId)).toEqual({ compte: 0, classe: 0 });
		expect((await existe(o.userId, ancienne.id)).classe).toBe(1);
	});
});
