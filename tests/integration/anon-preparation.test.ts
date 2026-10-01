/**
 * Policies qui interrogent classes / class_members : `authenticated`, plus `public`
 * ===============================================================================
 *
 * Migration `20261001130000_policies_classes_vers_authenticated` : 14 policies
 * de 10 tables passent de `TO public` à `TO authenticated`, sans changer leurs
 * conditions. C'est la préparation du retrait de SELECT à `anon` sur `classes`
 * et `class_members` (une sous-requête de policy tourne avec les droits de
 * l'appelant).
 *
 * Ce que le fichier prouve :
 *   1. les 14 policies ciblent `authenticated` (ROUGE avant la migration) ;
 *   2. leurs USING / WITH CHECK sont identiques au caractère près (empreintes
 *      md5 relevées en prod le 2026-10-01, avant la migration) ;
 *   3. non-régression : l'élève membre lit toujours, l'élève extérieur ne lit
 *      toujours rien, le professeur écrit toujours ;
 *   4. anon n'obtient toujours rien, ni en lecture ni en écriture.
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

/** [table, policy, md5(coalesce(qual,'') || '|' || coalesce(with_check,''))] — relevé en prod */
const POLICIES = [
	[
		'class_journal_entries',
		'Students can view published journal entries',
		'24aa2cc259daba18c7a3c59c473db91a'
	],
	[
		'class_schedules',
		'Students can view schedules for their classes',
		'4821babcccdee049c9a7df7cbbe96599'
	],
	['conversations', 'Users can view their conversations', '7d5e44ff789475cf5c23ef682f109efc'],
	[
		'game_class_settings',
		'Students can view class game settings',
		'0a00e1d4561cf9f1d2762b4a61e7576e'
	],
	[
		'game_class_settings',
		'Teachers can manage own class settings',
		'f6f204fbf2063f28c51617be95aa94ab'
	],
	['game_timeslots', 'Students can view class timeslots', '197b66347f5fc3459b73eb22b604da4d'],
	[
		'messages',
		'Users can view messages in their conversations',
		'b1c597780bfe691497077dea77ca66a6'
	],
	[
		'notifications',
		'Teachers can create notifications for their classes',
		'e4ff05319199094167b49bec6a20e1d9'
	],
	[
		'notifications',
		'Users can view notifications targeting them',
		'8635e00feddcc45ed9a6fe8aeb885f1f'
	],
	[
		'parental_consents',
		'Teachers can insert consents for their students',
		'7274e661d3b65ff25d6e42af3dbc54be'
	],
	[
		'parental_consents',
		'Teachers can update consents for their students',
		'22924c318ae1d0aaf743973b806b71fb'
	],
	['riddle_assignments', 'Students can view own assignments', '6190cc1f659ffec875ae73b30cd1a28a'],
	[
		'riddle_assignments',
		'Teachers can create assignments for their riddles',
		'a2b20744a47395426acdae0c8d279c2a'
	],
	['riddle_attempts', 'Teachers can validate attempts', '76439e3ff10a46a5b92a3083221ecc98']
] as const;

const TABLES = [...new Set(POLICIES.map(([table]) => table))];

/** Client de service : ensemencement et constats, jamais un appel testé. */
const service = createServiceRoleClient();

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

async function idsSeenBy(client: SupabaseClient<Database>, table: string): Promise<string[]> {
	const { data, error } = await client.from(table as never).select('id');
	if (error) throw new Error(`${table}: ${error.message}`);
	return ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
}

// ============================================================================
// TESTS
// ============================================================================

describe('policies classes / class_members ciblées sur authenticated', () => {
	let enseignant: SupabaseClient<Database>;
	let eleve: SupabaseClient<Database>;
	let exterieur: SupabaseClient<Database>;
	let profId: string;
	let eleveId: string;
	let classe: string;
	let enigme: string;
	let tentative: string;
	let consentement: string;
	let conversation: string;
	const seeded: Record<string, string> = {};

	beforeAll(async () => {
		await cleanupAllTestData();

		const profilProf = await TestData.profile().withRole('teacher').create();
		const profilEleve = await TestData.profile().withRole('student').create();
		const profilExterieur = await TestData.profile().withRole('student').create();
		profId = profilProf.id;
		eleveId = profilEleve.id;

		const ecole = await insert('schools', {
			name: 'Lycée prépa-anon ZZ',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: 'Année prépa-anon ZZ',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		classe = await insert('classes', {
			name: '2nde prépa-anon ZZ',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'ZZPA01',
			is_active: true
		});
		{
			const { error } = await service
				.from('class_members')
				.insert({ class_id: classe, student_id: eleveId, status: 'active' });
			expect(error).toBeNull();
		}

		seeded.class_journal_entries = await insert('class_journal_entries', {
			class_id: classe,
			entry_date: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10),
			is_published: true
		});
		seeded.class_schedules = await insert('class_schedules', {
			class_id: classe,
			day_of_week: 1,
			start_time: '08:00',
			end_time: '09:00'
		});
		seeded.game_class_settings = await insert('game_class_settings', { class_id: classe });
		seeded.game_timeslots = await insert('game_timeslots', {
			class_id: classe,
			name: 'Créneau ZZ',
			difficulty: 1,
			challenge_ids: [],
			starts_at: new Date(Date.now() - 3600_000).toISOString(),
			ends_at: new Date(Date.now() + 3600_000).toISOString()
		});
		seeded.notifications = await insert('notifications', {
			title: 'Notif classe ZZ',
			message: 'Pour la classe',
			type: 'info',
			target_type: 'classes',
			target_class_ids: [classe],
			created_by: profId
		});

		conversation = await insert('conversations', { is_group: false });
		seeded.conversations = conversation;
		for (const userId of [eleveId, profId]) {
			const { error } = await service
				.from('conversation_participants')
				.insert({ conversation_id: conversation, user_id: userId });
			expect(error).toBeNull();
		}
		seeded.messages = await insert('messages', {
			conversation_id: conversation,
			sender_id: profId,
			content: { type: 'doc', content: [] },
			plain_text: 'Bonjour ZZ'
		});

		enigme = await insert('riddles', {
			title: 'Énigme prépa-anon ZZ',
			statement: 'Énoncé',
			correction: 'Correction',
			difficulty: 1,
			created_by: profId
		});
		seeded.riddle_assignments = await insert('riddle_assignments', {
			riddle_id: enigme,
			class_id: classe,
			assigned_by: profId
		});
		tentative = await insert('riddle_attempts', {
			riddle_id: enigme,
			student_id: eleveId,
			attempt_number: 1,
			submitted_answer: { answer: '42' }
		});
		seeded.riddle_attempts = tentative;
		consentement = await insert('parental_consents', {
			student_id: eleveId,
			parent_email: 'parent.zz@example.com'
		});
		seeded.parental_consents = consentement;

		eleve = await clientFor(profilEleve.email);
		exterieur = await clientFor(profilExterieur.email);
		enseignant = await clientFor(profilProf.email);
	}, 120_000);

	afterAll(async () => {
		// Enfants avant parents ; les tables liées à la classe suivent sa suppression.
		await service.from('messages').delete().eq('conversation_id', conversation);
		await service.from('conversation_participants').delete().eq('conversation_id', conversation);
		await service.from('conversations').delete().eq('id', conversation);
		await service.from('notifications').delete().like('title', '%ZZ%');
		await service.from('riddle_attempts').delete().eq('riddle_id', enigme);
		await service.from('riddle_assignments').delete().eq('riddle_id', enigme);
		await service.from('riddles').delete().eq('id', enigme);
		await service.from('parental_consents').delete().eq('student_id', eleveId);
		await service.from('game_timeslots').delete().eq('class_id', classe);
		await service.from('game_class_settings').delete().eq('class_id', classe);
		await service.from('class_schedules').delete().eq('class_id', classe);
		await service.from('class_journal_entries').delete().eq('class_id', classe);
		await cleanupAllTestData();
	});

	// --------------------------------------------------------------------------
	// Forme des policies
	// --------------------------------------------------------------------------

	it.each(POLICIES)('%s — « %s » cible authenticated seul', async (table, policy) => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query<{ roles: string[] }>(
			`select roles::text[] as roles from pg_policies
			 where schemaname = 'public' and tablename = $1 and policyname = $2`,
			[table, policy]
		);
		expect(rows).toHaveLength(1);
		expect(rows[0].roles).toEqual(['authenticated']);
	});

	it.each(POLICIES)('%s — « %s » : conditions inchangées', async (table, policy, hash) => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query<{ h: string }>(
			`select md5(coalesce(qual, '') || '|' || coalesce(with_check, '')) as h from pg_policies
			 where schemaname = 'public' and tablename = $1 and policyname = $2`,
			[table, policy]
		);
		expect(rows[0]?.h).toBe(hash);
	});

	it('plus aucune policy TO public de public n’interroge classes / class_members', async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query<{ name: string }>(
			`select tablename || '.' || policyname as name from pg_policies
			 where schemaname = 'public' and 'public' = any(roles)
			   and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~ '(classes|class_members)'`
		);
		expect(rows.map((r) => r.name)).toEqual([]);
	});

	// --------------------------------------------------------------------------
	// Non-régression : lectures
	// --------------------------------------------------------------------------

	it.each([
		'class_journal_entries',
		'class_schedules',
		'game_class_settings',
		'game_timeslots',
		'notifications',
		'riddle_assignments',
		'conversations',
		'messages'
	])('l’élève membre lit toujours sa ligne de %s, l’extérieur non', async (table) => {
		expect(await idsSeenBy(eleve, table)).toContain(seeded[table]);
		expect(await idsSeenBy(exterieur, table)).not.toContain(seeded[table]);
	});

	// --------------------------------------------------------------------------
	// Non-régression : écritures du professeur
	// --------------------------------------------------------------------------

	it('le professeur modifie toujours les réglages de jeu de sa classe', async () => {
		const { data, error } = await enseignant
			.from('game_class_settings')
			.update({ base_difficulty: 2 })
			.eq('class_id', classe)
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
	});

	it('le professeur crée toujours une notification pour sa classe', async () => {
		const { data, error } = await enseignant
			.from('notifications')
			.insert({
				title: 'Notif prof ZZ',
				message: 'Rappel',
				type: 'reminder',
				target_type: 'classes',
				target_class_ids: [classe],
				created_by: profId
			})
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
	});

	it('le professeur assigne toujours son énigme à un élève', async () => {
		const { data, error } = await enseignant
			.from('riddle_assignments')
			.insert({ riddle_id: enigme, student_id: eleveId, assigned_by: profId })
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
	});

	it('le professeur valide toujours une tentative', async () => {
		const { data, error } = await enseignant
			.from('riddle_attempts')
			.update({ is_correct: true })
			.eq('id', tentative)
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
	});

	it('le professeur crée et modifie toujours un consentement parental', async () => {
		const created = await enseignant
			.from('parental_consents')
			.insert({ student_id: eleveId, parent_email: 'autre.parent.zz@example.com' })
			.select('id');
		expect(created.error).toBeNull();
		expect(created.data).toHaveLength(1);

		const updated = await enseignant
			.from('parental_consents')
			.update({ parent_email: 'parent.modifie.zz@example.com' })
			.eq('id', consentement)
			.select('id');
		expect(updated.error).toBeNull();
		expect(updated.data).toHaveLength(1);
	});

	// --------------------------------------------------------------------------
	// anon : toujours rien
	// --------------------------------------------------------------------------

	it.each(TABLES)('anon ne lit aucune ligne de %s', async (table) => {
		const { data } = await anonClient()
			.from(table as never)
			.select('id');
		expect(data ?? []).toEqual([]);
	});

	it('anon ne crée ni notification, ni assignation, ni consentement', async () => {
		const anon = anonClient();
		const notif = await anon
			.from('notifications')
			.insert({
				title: 'Notif anon ZZ',
				message: 'x',
				type: 'info',
				target_type: 'classes',
				target_class_ids: [classe]
			})
			.select('id');
		expect(notif.error).not.toBeNull();

		const assignation = await anon
			.from('riddle_assignments')
			.insert({ riddle_id: enigme, class_id: classe, assigned_by: profId })
			.select('id');
		expect(assignation.error).not.toBeNull();

		const consent = await anon
			.from('parental_consents')
			.insert({ student_id: eleveId, parent_email: 'anon.zz@example.com' })
			.select('id');
		expect(consent.error).not.toBeNull();
	});

	it('anon ne modifie ni tentative, ni consentement, ni réglage de jeu', async () => {
		const anon = anonClient();
		const attempts = await anon
			.from('riddle_attempts')
			.update({ is_correct: false })
			.eq('id', tentative)
			.select('id');
		expect(attempts.data ?? []).toEqual([]);
		const consent = await anon
			.from('parental_consents')
			.update({ parent_email: 'anon.zz@example.com' })
			.eq('id', consentement)
			.select('id');
		expect(consent.data ?? []).toEqual([]);
		const settings = await anon
			.from('game_class_settings')
			.update({ base_difficulty: 5 })
			.eq('class_id', classe)
			.select('id');
		expect(settings.data ?? []).toEqual([]);

		const { data } = await service
			.from('game_class_settings')
			.select('base_difficulty')
			.eq('class_id', classe)
			.single();
		expect(data?.base_difficulty).not.toBe(5);
	});
});
