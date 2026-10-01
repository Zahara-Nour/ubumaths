/**
 * Notifications système : écrites par le serveur seul
 * ====================================================
 *
 * Migration `20261001140000_notifications_systeme_reservees_au_serveur` :
 * « Users can create system notifications » ne vise plus que service_role, et
 * « Admins can create any notification » passe de public à authenticated.
 *
 * Ce que le fichier prouve :
 *   1. un élève connecté ne peut plus diffuser une notification système à toute
 *      l'école, ni s'en adresser une (ROUGE avant la migration) ;
 *   2. le professeur ne le peut pas non plus (ROUGE avant la migration) ;
 *   3. non-régression : le client service crée toujours une notification système,
 *      le professeur écrit toujours pour sa classe, l'admin écrit toujours ;
 *   4. anon n'écrit toujours rien ;
 *   5. les deux policies visent les rôles attendus (ROUGE avant la migration).
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
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

// ============================================================================
// CONSTANTS
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const MARQUE = 'ZZ-notif-systeme';

/** Client de service : ensemencement et constats. */
const service = createServiceRoleClient();

type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];

// ============================================================================
// HELPERS
// ============================================================================

function anonClient(): SupabaseClient<Database> {
	return createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

async function clientFor(email: string): Promise<SupabaseClient<Database>> {
	const client = anonClient();
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

async function insert(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`${table}: ${error.message}`);
	return (data as { id: string }).id;
}

/** Notification système « à toute l'école », telle qu'un élève malveillant l'enverrait. */
function diffusionSysteme(titre: string): NotificationInsert {
	return {
		title: `${titre} ${MARQUE}`,
		message: 'Message usurpé',
		type: 'alert',
		priority: 'urgent',
		target_type: 'all',
		is_system: true,
		created_by: null,
		system_event_type: 'maintenance_scheduled'
	};
}

/** Lignes réellement présentes en base pour ce titre (constat par le client service). */
async function lignesAvecTitre(titre: string): Promise<number> {
	const { data, error } = await service
		.from('notifications')
		.select('id')
		.eq('title', `${titre} ${MARQUE}`);
	if (error) throw new Error(error.message);
	return (data ?? []).length;
}

// ============================================================================
// TESTS
// ============================================================================

describe('notifications système réservées au serveur', () => {
	let eleve: SupabaseClient<Database>;
	let enseignant: SupabaseClient<Database>;
	let admin: SupabaseClient<Database>;
	let eleveId: string;
	let profId: string;
	let classe: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const profilEleve = await TestData.profile().withRole('student').create();
		const profilProf = await TestData.profile().withRole('teacher').create();
		const profilAdmin = await TestData.profile().withRole('admin').create();
		eleveId = profilEleve.id;
		profId = profilProf.id;

		const ecole = await insert('schools', {
			name: `Lycée ${MARQUE}`,
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: `Année ${MARQUE}`,
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		classe = await insert('classes', {
			name: `2nde ${MARQUE}`,
			school_id: ecole,
			school_year_id: annee,
			join_code: 'ZZNS01',
			is_active: true
		});
		{
			const { error } = await service
				.from('class_members')
				.insert({ class_id: classe, student_id: eleveId, status: 'active' });
			expect(error).toBeNull();
		}

		eleve = await clientFor(profilEleve.email);
		enseignant = await clientFor(profilProf.email);
		admin = await clientFor(profilAdmin.email);
	});

	afterAll(async () => {
		await service.from('notifications').delete().like('title', `%${MARQUE}%`);
		await cleanupAllTestData();
	});

	// --------------------------------------------------------------------------
	// 1-2. Ce qui est désormais refusé
	// --------------------------------------------------------------------------

	it("un élève ne peut plus diffuser une notification système à toute l'école", async () => {
		const { error } = await eleve.from('notifications').insert(diffusionSysteme('élève-all'));
		expect(error?.code).toBe('42501');
		expect(await lignesAvecTitre('élève-all')).toBe(0);
	});

	it("un élève ne peut plus s'adresser une notification système", async () => {
		const { error } = await eleve.from('notifications').insert({
			...diffusionSysteme('élève-soi'),
			target_type: 'users',
			target_user_ids: [eleveId]
		});
		expect(error?.code).toBe('42501');
		expect(await lignesAvecTitre('élève-soi')).toBe(0);
	});

	it("le professeur ne peut plus diffuser une notification système à toute l'école", async () => {
		const { error } = await enseignant.from('notifications').insert(diffusionSysteme('prof-all'));
		expect(error?.code).toBe('42501');
		expect(await lignesAvecTitre('prof-all')).toBe(0);
	});

	it("anon n'écrit toujours aucune notification système", async () => {
		const { error } = await anonClient().from('notifications').insert(diffusionSysteme('anon-all'));
		expect(error).not.toBeNull();
		expect(await lignesAvecTitre('anon-all')).toBe(0);
	});

	it('un élève ne peut ni modifier ni masquer une notification système qui le cible', async () => {
		const id = await insert('notifications', {
			...diffusionSysteme('cible-élève'),
			target_type: 'users',
			target_user_ids: [eleveId]
		});
		const { data, error } = await eleve
			.from('notifications')
			.update({ target_type: 'all', deleted_at: new Date().toISOString() })
			.eq('id', id)
			.select('id');
		// Refus RLS d'un UPDATE : zéro ligne, sans erreur.
		expect(error).toBeNull();
		expect(data).toEqual([]);
		const { data: apres } = await service
			.from('notifications')
			.select('target_type, deleted_at')
			.eq('id', id)
			.single();
		expect(apres).toEqual({ target_type: 'users', deleted_at: null });
	});

	// --------------------------------------------------------------------------
	// 3. Non-régression
	// --------------------------------------------------------------------------

	it('le client service crée toujours une notification système', async () => {
		const { data, error } = await service
			.from('notifications')
			.insert({
				...diffusionSysteme('service'),
				target_type: 'users',
				target_user_ids: [eleveId]
			})
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
	});

	it('le professeur écrit toujours une notification pour sa classe', async () => {
		const { data, error } = await enseignant
			.from('notifications')
			.insert({
				title: `prof-classe ${MARQUE}`,
				message: 'Pour la classe',
				type: 'info',
				target_type: 'classes',
				target_class_ids: [classe],
				created_by: profId
			})
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
	});

	it("l'admin écrit toujours une notification à toute l'école", async () => {
		const { error } = await admin.from('notifications').insert({
			title: `admin-all ${MARQUE}`,
			message: 'Annonce',
			type: 'announcement',
			target_type: 'all'
		});
		expect(error).toBeNull();
		expect(await lignesAvecTitre('admin-all')).toBe(1);
	});

	// --------------------------------------------------------------------------
	// 5. Rôles des policies
	// --------------------------------------------------------------------------

	it.each([
		['Users can create system notifications', ['service_role']],
		['Admins can create any notification', ['authenticated']]
	])('la policy « %s » vise %j', async (policy, roles) => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query<{ roles: string[] }>(
			`select roles::text[] as roles from pg_policies
			 where schemaname = 'public' and tablename = 'notifications' and policyname = $1`,
			[policy]
		);
		expect(rows).toHaveLength(1);
		expect(rows[0].roles).toEqual(roles);
	});
});
