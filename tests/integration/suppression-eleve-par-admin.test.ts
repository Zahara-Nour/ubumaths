/**
 * Suppression d'un élève par l'admin, sur la vraie base
 * ======================================================
 *
 * Rejoue `deleteStudentAccount` (le déroulé commun aux routes de la page Profil et de la
 * page Users) avec le client de service :
 *   1. l'élève disparaît : plus de compte, plus de profil ;
 *   2. le journal des suppressions garde l'admin demandeur (`requested_by`), sans
 *      l'identifiant de l'élève (anonymisé) ni son adresse en clair ;
 *   3. une suppression par l'élève lui-même garde `requested_by` à null ;
 *   4. supprimer le compte de l'admin plus tard ne bloque rien (passe à null) ;
 *   5. un compte prof est refusé par la base : rien n'est supprimé, journal `failed`.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import { deleteStudentAccount, hashEmail } from '#lib/server/account-deletion.ts';

// ============================================================================
// CONSTANTES
// ============================================================================

const service = createServiceRoleClient();

// ============================================================================
// HELPERS
// ============================================================================

interface AuditRow {
	user_id: string | null;
	requested_by: string | null;
	status: string;
	email_hash: string;
}

async function auditPour(email: string): Promise<AuditRow[]> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<AuditRow>(
		`select user_id, requested_by, status, email_hash
		 from account_deletion_audit where email_hash = $1 order by requested_at`,
		[await hashEmail(email)]
	);
	return rows;
}

async function existe(userId: string): Promise<{ profil: boolean; compte: boolean }> {
	const pg = await getPostgresClient();
	const p = await pg.query(`select 1 from profiles where id = $1`, [userId]);
	const u = await pg.query(`select 1 from auth.users where id = $1`, [userId]);
	return { profil: p.rowCount === 1, compte: u.rowCount === 1 };
}

// ============================================================================
// TESTS
// ============================================================================

describe('suppression d’un élève par l’admin', () => {
	let adminId: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		adminId = (await TestData.profile().withRole('admin').create()).id;
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		await pg.query(`delete from account_deletion_audit where requested_by = $1`, [adminId]);
		await cleanupAllTestData();
	});

	it('l’élève disparaît, le journal garde l’admin et pas l’élève', async () => {
		const eleve = await TestData.profile().withRole('student').create();

		await deleteStudentAccount(service, {
			userId: eleve.id,
			email: eleve.email,
			ipAddress: '127.0.0.1',
			userAgent: 'vitest',
			requestedBy: adminId
		});

		expect(await existe(eleve.id)).toEqual({ profil: false, compte: false });
		const audit = await auditPour(eleve.email);
		expect(audit).toHaveLength(1);
		expect(audit[0]).toMatchObject({ user_id: null, requested_by: adminId, status: 'completed' });
		expect(audit[0].email_hash).not.toContain('@');
	});

	it('par l’élève lui-même : requested_by reste null', async () => {
		const eleve = await TestData.profile().withRole('student').create();

		await deleteStudentAccount(service, {
			userId: eleve.id,
			email: eleve.email,
			ipAddress: null,
			userAgent: null,
			requestedBy: null
		});

		expect(await existe(eleve.id)).toEqual({ profil: false, compte: false });
		const audit = await auditPour(eleve.email);
		expect(audit[0]).toMatchObject({ requested_by: null, status: 'completed' });
	});

	it('un compte prof est refusé par la base : rien n’est supprimé', async () => {
		const prof = await TestData.profile().withRole('teacher').create();

		await expect(
			deleteStudentAccount(service, {
				userId: prof.id,
				email: prof.email,
				ipAddress: null,
				userAgent: null,
				requestedBy: adminId
			})
		).rejects.toMatchObject({ status: 500 });

		expect(await existe(prof.id)).toEqual({ profil: true, compte: true });
		const audit = await auditPour(prof.email);
		expect(audit[0]).toMatchObject({ requested_by: adminId, status: 'failed' });
	});

	it('le compte de l’admin supprimé plus tard : la ligne reste, requested_by à null', async () => {
		const autreAdmin = await TestData.profile().withRole('admin').create();
		const eleve = await TestData.profile().withRole('student').create();
		await deleteStudentAccount(service, {
			userId: eleve.id,
			email: eleve.email,
			ipAddress: null,
			userAgent: null,
			requestedBy: autreAdmin.id
		});

		const { error } = await service.auth.admin.deleteUser(autreAdmin.id);
		expect(error).toBeNull();

		const audit = await auditPour(eleve.email);
		expect(audit).toHaveLength(1);
		expect(audit[0]).toMatchObject({ requested_by: null, status: 'completed' });
	});
});
