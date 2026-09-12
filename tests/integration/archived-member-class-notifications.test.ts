/**
 * L'élève archivé ne reçoit plus les notifications de la classe quittée
 * ====================================================================
 *
 * Quatrième et dernier volet de la série (fiches, exercices, Python). Le trou
 * est ici double, et il n'est PAS là où un inventaire par mot-clé le situe :
 *
 *   A. la policy « Users can view notifications targeting them » lit
 *      `class_members` DIRECTEMENT, sans regarder `status`. C'est le vrai
 *      contrôle d'accès — les occurrences de `class_ids` dans les policies de
 *      cette table désignent `notifications.target_class_ids`, la cible de la
 *      notification, et non les classes de l'élève ;
 *
 *   B. `profiles.class_ids`, colonne dénormalisée, alimente le filtre
 *      applicatif de `getNotifications`. Sa fonction de synchronisation
 *      n'ignorait pas les adhésions archivées — et surtout, aucun trigger ne
 *      se déclenchait sur UPDATE : archiver un élève ne recalculait donc RIEN,
 *      filtre ou pas.
 *
 * Un défaut dormant s'ajoute : quatre élèves de production ont `class_ids` à
 * NULL alors qu'ils sont bien membres d'une classe. Eux ne voient AUCUNE
 * notification de classe — l'inverse du trou, et tout aussi silencieux.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import { getPostgresClient } from '../helpers/database/postgres-client';
import type { Database } from '$lib/types/database';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const service = createServiceRoleClient();

async function clientFor(email: string): Promise<SupabaseClient<Database>> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
	return client;
}

async function classIdsOf(profileId: string): Promise<string[]> {
	const { data, error } = await service
		.from('profiles')
		.select('class_ids')
		.eq('id', profileId)
		.single();
	expect(error).toBeNull();
	return (data as { class_ids: string[] | null }).class_ids ?? [];
}

describe('élève archivé — les notifications de classe', () => {
	let classId: string;
	let otherClassId: string;
	let teacherId: string;
	let notificationId: string;
	let activeStudentId: string;
	let activeStudent: SupabaseClient<Database>;
	let archivedStudentId: string;
	let archivedStudent: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();

		const teacher = await TestData.profile().withRole('teacher').create();
		teacherId = teacher.id;
		classId = (await TestData.class().withName('1re A notifs ZZ').create()).id;
		otherClassId = (await TestData.class().withName('1re B notifs ZZ').create()).id;

		const mk = async (status: string) => {
			const profile = await TestData.profile().withRole('student').create();
			const { error } = await service
				.from('class_members')
				.insert({ class_id: classId, student_id: profile.id, status });
			expect(error).toBeNull();
			return { id: profile.id, client: await clientFor(profile.email) };
		};
		const active = await mk('active');
		activeStudentId = active.id;
		activeStudent = active.client;
		const archived = await mk('archived');
		archivedStudentId = archived.id;
		archivedStudent = archived.client;

		const { data: notification, error: notifError } = await service
			.from('notifications')
			.insert({
				title: 'Annonce de classe ZZ',
				message: 'Contrôle vendredi.',
				type: 'info',
				target_type: 'classes',
				target_class_ids: [classId],
				created_by: teacherId,
				expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString()
			})
			.select('id')
			.single();
		expect(notifError).toBeNull();
		notificationId = (notification as { id: string }).id;
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	async function seesNotification(client: SupabaseClient<Database>): Promise<boolean> {
		const { data, error } = await client
			.from('notifications')
			.select('id')
			.eq('id', notificationId);
		expect(error).toBeNull();
		return (data ?? []).length === 1;
	}

	// ── A. La policy, le vrai contrôle d'accès ─────────────────────────────

	it('le témoin — l’élève actif voit l’annonce de sa classe', async () => {
		expect(await seesNotification(activeStudent)).toBe(true);
	});

	it('l’élève archivé ne voit plus l’annonce de la classe quittée', async () => {
		expect(await seesNotification(archivedStudent)).toBe(false);
	});

	// ── B. La colonne dénormalisée et son trigger ──────────────────────────

	it('une adhésion NÉE archivée n’entre pas dans `class_ids`', async () => {
		// Ce cas passe par le trigger INSERT, pas par le nouveau trigger UPDATE :
		// l'adhésion du `beforeAll` est créée directement `archived`. Le nom
		// précédent (« archiver une adhésion… ») laissait croire le contraire.
		expect(await classIdsOf(archivedStudentId)).not.toContain(classId);
		expect(await classIdsOf(activeStudentId)).toContain(classId);
	});

	it('ARCHIVER une adhésion active la retire, la réactiver la remet', async () => {
		// C'est ce test-là, et lui seul, qui prouve le trigger UPDATE : il fait
		// deux UPDATE successifs. Sans `sync_class_members_update`, la colonne ne
		// bougerait pas d'un pouce.
		const { error: reactivateError } = await service
			.from('class_members')
			.update({ status: 'active' })
			.eq('student_id', archivedStudentId)
			.eq('class_id', classId);
		expect(reactivateError).toBeNull();
		expect(await classIdsOf(archivedStudentId)).toContain(classId);
		expect(await seesNotification(archivedStudent)).toBe(true);

		const { error: archiveError } = await service
			.from('class_members')
			.update({ status: 'archived' })
			.eq('student_id', archivedStudentId)
			.eq('class_id', classId);
		expect(archiveError).toBeNull();
		expect(await classIdsOf(archivedStudentId)).not.toContain(classId);
	});

	it('une adhésion active ajoutée est bien reflétée', async () => {
		// Le chemin INSERT existait déjà : vérifier qu'il n'a pas régressé.
		const { error } = await service
			.from('class_members')
			.insert({ class_id: otherClassId, student_id: activeStudentId, status: 'active' });
		expect(error).toBeNull();
		const ids = await classIdsOf(activeStudentId);
		expect(ids).toContain(classId);
		expect(ids).toContain(otherClassId);
	});

	it('une adhésion créée DIRECTEMENT archivée n’entre pas dans `class_ids`', async () => {
		// Le trigger INSERT filtrait tout autant qu'il ignorait le statut.
		const profile = await TestData.profile().withRole('student').create();
		const { error } = await service
			.from('class_members')
			.insert({ class_id: classId, student_id: profile.id, status: 'archived' });
		expect(error).toBeNull();
		expect(await classIdsOf(profile.id)).not.toContain(classId);
	});

	// ── C. Le témoin qui protège les professeurs ───────────────────────────

	it('le rattrapage répare les élèves SANS toucher aux professeurs', async () => {
		// Le rattrapage de la migration s'exécute au `db:reset`, avant toute donnée
		// de test : l'invariant vérifié plus bas ne le prouve donc pas. On rejoue
		// ici son SQL sur une désynchronisation fabriquée.
		//
		// En production, un professeur porte un `class_ids` que `class_members` ne
		// connaît pas — sans le garde `role = 'student'`, ce rattrapage le
		// viderait. C'est le seul montage qui rougit si le garde disparaît.
		const eleve = await TestData.profile().withRole('student').create();
		const { error: adhesionError } = await service
			.from('class_members')
			.insert({ class_id: classId, student_id: eleve.id, status: 'active' });
		expect(adhesionError).toBeNull();

		// On désynchronise les deux : l'élève perd sa classe, le professeur en
		// reçoit une qu'aucune adhésion ne justifie.
		const { error: desyncError } = await service
			.from('profiles')
			.update({ class_ids: [] })
			.eq('id', eleve.id);
		expect(desyncError).toBeNull();
		const { error: profError } = await service
			.from('profiles')
			.update({ class_ids: [otherClassId] })
			.eq('id', teacherId);
		expect(profError).toBeNull();

		const pg = await getPostgresClient();
		await pg.query(`
			update public.profiles p
			set class_ids = (
				select coalesce(array_agg(cm.class_id order by cm.class_id), array[]::uuid[])
				from public.class_members cm
				where cm.student_id = p.id and cm.status = 'active'
			)
			where p.role = 'student'
				and coalesce(p.class_ids, array[]::uuid[]) is distinct from (
					select coalesce(array_agg(cm.class_id order by cm.class_id), array[]::uuid[])
					from public.class_members cm
					where cm.student_id = p.id and cm.status = 'active'
				)
		`);

		expect(await classIdsOf(eleve.id)).toContain(classId);
		expect(await classIdsOf(teacherId)).toEqual([otherClassId]);
	});

	it('le rattrapage est idempotent', async () => {
		const pg = await getPostgresClient();
		const rejouer = () =>
			pg.query(`
				update public.profiles p
				set class_ids = (
					select coalesce(array_agg(cm.class_id order by cm.class_id), array[]::uuid[])
					from public.class_members cm
					where cm.student_id = p.id and cm.status = 'active'
				)
				where p.role = 'student'
					and coalesce(p.class_ids, array[]::uuid[]) is distinct from (
						select coalesce(array_agg(cm.class_id order by cm.class_id), array[]::uuid[])
						from public.class_members cm
						where cm.student_id = p.id and cm.status = 'active'
					)
			`);
		await rejouer();
		const second = await rejouer();
		expect(second.rowCount).toBe(0);
	});

	it('le rattrapage a laissé la base cohérente', async () => {
		// La migration recalcule `class_ids` pour les élèves désynchronisés — en
		// production, quatre l'étaient et ne voyaient AUCUNE annonce de classe.
		// L'invariant se vérifie ici : aucun profil élève ne doit diverger de ses
		// adhésions actives.
		const { data: students, error: studentsError } = await service
			.from('profiles')
			.select('id, class_ids')
			.eq('role', 'student');
		expect(studentsError).toBeNull();

		const { data: memberships, error: membershipsError } = await service
			.from('class_members')
			.select('student_id, class_id')
			.eq('status', 'active');
		expect(membershipsError).toBeNull();

		const expected = new Map<string, Set<string>>();
		for (const m of memberships ?? []) {
			const set = expected.get(m.student_id) ?? new Set<string>();
			set.add(m.class_id);
			expected.set(m.student_id, set);
		}

		for (const student of students ?? []) {
			const actual = new Set((student.class_ids as string[] | null) ?? []);
			const attendu = expected.get(student.id) ?? new Set<string>();
			expect([...actual].sort()).toEqual([...attendu].sort());
		}
	});

	it('le `class_ids` d’un professeur n’est pas recalculé', async () => {
		// Un professeur n'est pas « membre » de sa classe : `class_members` ne le
		// concerne pas. Un recalcul aveugle viderait sa colonne — or
		// `getNotifications` s'en sert pour TOUT utilisateur, professeur compris.
		const { error: seedError } = await service
			.from('profiles')
			.update({ class_ids: [classId] })
			.eq('id', teacherId);
		expect(seedError).toBeNull();

		// Une adhésion d'élève survient : le trigger ne doit toucher que cet élève.
		const other = await TestData.profile().withRole('student').create();
		const { error } = await service
			.from('class_members')
			.insert({ class_id: classId, student_id: other.id, status: 'active' });
		expect(error).toBeNull();

		expect(await classIdsOf(teacherId)).toContain(classId);
	});
});
