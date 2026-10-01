/**
 * Retrait des droits hérités de `anon` — option b (base locale requise)
 * ======================================================================
 *
 * Migration `20261001170000_anon_retrait_droits_herites` :
 *   - `anon` perd tout droit sur 143 relations de `public` sans policy pour
 *     `anon` / `public` (141 tables et vues, 1 vue matérialisée, 1 séquence) ;
 *   - PUBLIC et `anon` perdent EXECUTE sur 143 fonctions de `public` ;
 *   - les 4 RPC des pages publiques restent exécutables par `anon`.
 *
 * Ce que le fichier prouve :
 *   (a) anon n'a plus aucun droit sur chaque objet fermé (ROUGE sans la
 *       migration) ;
 *   (b) authenticated et service_role gardent EXECUTE sur TOUTES les fonctions
 *       révoquées, et leurs droits sur un échantillon de tables ;
 *   (c) non-régression anon : les 4 RPC publiques restent appelables, les
 *       tables lues sans connexion répondent sans erreur ;
 *   (d) un élève connecté lit toujours ses classes.
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

const TOUS_DROITS_TABLE = 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN';

/** Tables et vues (security_invoker) fermées à anon — inventaire prod du 2026-10-01. */
const RELATIONS_FERMEES = [
	'account_deletion_audit',
	'achievement_events',
	'achievement_migrations',
	'app_config',
	'audit_logs',
	'background_job_runs',
	'bonus_history',
	'buddy_skins',
	'bug_reports',
	'bug_reports_config',
	'chapter_template_instantiations',
	'chapter_template_versions',
	'chapter_templates',
	'class_chapters',
	'class_google_classroom_links',
	'class_members',
	'classes',
	'coursework_categories',
	'coursework_materials',
	'curriculum_objectives',
	'curriculum_point_automatismes',
	'curriculum_points',
	'curriculum_themes',
	'daily_summaries',
	'evaluation_task_perimeter',
	'evaluation_tasks',
	'exercise_curriculum_points',
	'exercise_favorites',
	'exercise_templates',
	'game_2048_scores',
	'game_class_settings',
	'gidouilles_activity',
	'google_classroom_courses',
	'google_classroom_coursework',
	'google_classroom_material_attachments',
	'google_classroom_materials',
	'google_classroom_topics',
	'google_integrations',
	'journal_entry_activities',
	'journal_entry_points',
	'kanban_boards',
	'kanban_card_assignees',
	'kanban_card_tags',
	'kanban_cards',
	'kanban_columns',
	'kanban_tags',
	'marketplace_chat_messages',
	'marketplace_config',
	'marketplace_listing_views',
	'marketplace_listings',
	'marketplace_locked_cards',
	'marketplace_proposals',
	'marketplace_trade_offers',
	'marketplace_trades',
	'math_competence_subdimensions',
	'math_competences',
	'mathemo_scores',
	'message_template_versions',
	'message_templates',
	'migration_edits',
	'migration_images',
	'migration_tracking',
	'minesweeper_multiplayer_game_state',
	'minesweeper_multiplayer_matches',
	'minesweeper_multiplayer_queue',
	'minesweeper_player_stats',
	'minesweeper_reference_times_history',
	'minesweeper_student_achievements',
	'minesweeper_tournament_classes',
	'minesweeper_tournament_games',
	'minesweeper_tournaments',
	'observables',
	'orphaned_documents',
	'python_exercise_assignments',
	'python_exercise_mastery',
	'python_exercise_submissions',
	'python_submission_server_verdicts',
	'question_template_points',
	'rag_chunks',
	'rag_documents',
	'reward_events',
	'school_year_closures',
	'server_cache',
	'shared_coursework',
	'shared_coursework_students',
	'shared_materials',
	'skill_attempts',
	'srs_anti_fraud_flags',
	'srs_deck_sections',
	'student_buddies',
	'student_checklist_progress',
	'student_competence_level',
	'student_observable_state',
	'student_point_state',
	'student_warnings',
	'template_audit_log',
	'template_usage_stats',
	'terms_acceptances',
	'tutor_conversations',
	'tutor_messages',
	'user_favorite_templates',
	'user_preferences',
	'user_whiteboard_template_favorites',
	'vip_card_config',
	'vip_card_templates',
	'vip_cards_activity',
	'weekly_rewards',
	'whiteboard_export_counters',
	'whiteboard_templates',
	'worksheet_assignment_classes',
	'worksheet_assignment_exercise_settings',
	'worksheet_assignment_students',
	'worksheet_assignments',
	'worksheet_error_reports',
	'worksheet_exercises',
	'worksheet_instances',
	'worksheet_sections',
	'worksheet_templates',
	'worksheets',
	'active_student_warnings',
	'admin_error_stats_24h',
	'admin_job_failures',
	'admin_job_status',
	'admin_online_users',
	'admin_pg_cron_jobs',
	'admin_user_activity',
	'deck_stats_view',
	'game_scores_unified',
	'migration_review_tree',
	'minesweeper_achievements_compat',
	'minesweeper_leaderboard',
	'minesweeper_multiplayer_leaderboard',
	'minesweeper_student_achievement_progress',
	'minesweeper_student_achievements_compat',
	'minesweeper_tournament_standings',
	'riddle_progress',
	'riddle_stats',
	'riddle_student_history',
	'student_coursework_view',
	'student_point_state_v',
	'user_conversations_view'
] as const;

/** Fonctions retirées à PUBLIC et anon — inventaire prod du 2026-10-01 (143). */
const FONCTIONS_REVOQUEES = [
	'public.add_student_to_class_chat()',
	'public.assign_curriculum_point_code()',
	'public.audit_trigger_func()',
	'public.auto_log_template_changes()',
	'public.award_gidouilles_on_victory()',
	'public.calculate_3bv(jsonb)',
	'public.calculate_elo_change(integer,integer)',
	'public.calculate_minesweeper_points(text,integer,integer,uuid)',
	'public.calculate_riddle_gidouilles(integer,integer)',
	'public.calculate_tournament_score(integer,integer,text,text)',
	'public.calculate_week_boundaries(date,integer)',
	'public.calculate_worksheet_total_points(uuid)',
	'public.check_expired_items()',
	'public.check_max_attachments()',
	'public.check_max_attempts()',
	'public.check_profanity_simple(text)',
	'public.check_python_files_limit()',
	'public.check_python_notebooks_limit()',
	'public.cleanup_kanban_assignees_on_class_leave()',
	'public.cleanup_kanban_assignees_on_move()',
	'public.create_class_chat_room()',
	'public.create_error_report_notification()',
	'public.create_game_profile_for_new_user()',
	'public.create_initial_template_version()',
	'public.delete_exercise_images()',
	'public.enforce_kanban_tags_per_board_cap()',
	'public.enforce_single_teacher()',
	'public.ensure_single_active_deck()',
	'public.exercise_has_multiple_variations(uuid)',
	'public.exercise_variation_count(uuid)',
	'public.exercises_search_vector(text,text,text,text[])',
	'public.extract_plain_text_from_tiptap(jsonb)',
	'public.friendships_freeze_parties()',
	'public.generate_error_signature(text,text,text,integer)',
	'public.generate_join_code()',
	'public.generate_reward_event_description(reward_type,reward_event_type,numeric,text,jsonb)',
	'public.generate_reward_event_description(text,text,numeric)',
	'public.generate_share_token()',
	'public.generate_variant_seed(uuid,uuid,integer)',
	'public.get_accessible_kanban_boards(integer,timestamp with time zone)',
	'public.get_cycle_for_grade(text)',
	'public.get_minesweeper_reference_time(text,text)',
	'public.guard_profile_role_change()',
	'public.guard_profile_role_on_insert()',
	'public.handle_new_user()',
	'public.handle_teacher_overrides_updated_at()',
	'public.increment_proposal_count()',
	'public.increment_stats_change_counter()',
	'public.increment_template_instantiation_count()',
	'public.increment_tutor_message_count()',
	'public.is_exercise_parameterized(uuid)',
	'public.is_valid_grade_array(text[])',
	'public.log_achievements_to_events()',
	'public.log_bonus_history_to_events()',
	'public.log_gidouilles_activity_to_events()',
	'public.log_vip_card_changes()',
	'public.log_vip_cards_to_events()',
	'public.log_warning_added_to_events()',
	'public.log_warning_removed_to_events()',
	'public.mark_checkpoint_hint_revealed(uuid,text)',
	'public.normalize_grade_array(text[])',
	'public.normalize_grade_value(text)',
	'public.orphan_chapter_documents()',
	'public.place_curriculum_objective_last()',
	'public.place_curriculum_point_last()',
	'public.place_curriculum_theme_last()',
	'public.populate_shared_coursework_names()',
	'public.populate_shared_material_names()',
	'public.prevent_worksheet_instance_tampering()',
	'public.process_message_content()',
	'public.purge_pending_student_on_activation()',
	'public.rag_hybrid_search(text,vector,text[],text[],integer,double precision,double precision)',
	'public.rate_limit_submissions()',
	'public.reorder_curriculum_objectives(uuid,uuid[])',
	'public.reorder_curriculum_points(uuid,uuid[])',
	'public.reorder_curriculum_themes(text,uuid[])',
	'public.save_template_version()',
	'public.set_checklist_completed_at_insert()',
	'public.set_checklist_completed_at()',
	'public.set_class_member_left_at()',
	'public.set_error_signature()',
	'public.set_listing_expiry()',
	'public.set_minesweeper_started_at()',
	'public.set_offer_number()',
	'public.set_submission_attempt_number()',
	'public.set_trade_validation_timestamp()',
	'public.skill_attempts_after_insert()',
	'public.sync_class_chat_membership()',
	'public.sync_class_members_to_class_ids()',
	'public.trg_minesweeper_tournaments_updated_at()',
	'public.update_challenge_statistics()',
	'public.update_completion_last_viewed()',
	'public.update_constructions_updated_at()',
	'public.update_conversation_last_message()',
	'public.update_coursework_categories_updated_at()',
	'public.update_daily_summaries_updated_at()',
	'public.update_error_occurrence()',
	'public.update_exercises_updated_at()',
	'public.update_folder_message_count()',
	'public.update_friendships_updated_at()',
	'public.update_game_player_last_played()',
	'public.update_google_classroom_courses_updated_at()',
	'public.update_google_classroom_coursework_updated_at()',
	'public.update_google_classroom_materials_updated_at()',
	'public.update_google_classroom_topics_updated_at()',
	'public.update_google_integrations_updated_at()',
	'public.update_message_drafts_updated_at()',
	'public.update_message_search_index()',
	'public.update_message_template_updated_at()',
	'public.update_migration_tracking_updated_at()',
	'public.update_parental_consents_updated_at()',
	'public.update_parody_evaluations_updated_at()',
	'public.update_pem_updated_at()',
	'public.update_player_combat_stats()',
	'public.update_python_files_updated_at()',
	'public.update_python_mastery_on_submission()',
	'public.update_python_notebooks_updated_at()',
	'public.update_rag_documents_updated_at()',
	'public.update_riddles_updated_at()',
	'public.update_search_index_on_attachment()',
	'public.update_shared_coursework_on_course_rename()',
	'public.update_shared_coursework_on_teacher_rename()',
	'public.update_shared_coursework_updated_at()',
	'public.update_shared_material_course_name()',
	'public.update_shared_material_teacher_name()',
	'public.update_shared_materials_updated_at()',
	'public.update_spreadsheets_updated_at()',
	'public.update_student_buddies_updated_at()',
	'public.update_student_exercise_mastery_updated_at()',
	'public.update_student_progress_after_attempt()',
	'public.update_templates_updated_at()',
	'public.update_tutor_conversation_updated_at()',
	'public.update_updated_at_column()',
	'public.update_user_folders_updated_at()',
	'public.update_user_presence_updated_at()',
	'public.update_user_restrictions_updated_at()',
	'public.update_vip_cards_history()',
	'public.update_weekly_best_rewards_timestamp()',
	'public.update_whiteboard_template_updated_at()',
	'public.upsert_checkpoint_run(uuid,text,text,text)',
	'public.upsert_error_occurrence(text,uuid,text,text,text,text,text,integer)',
	'public.validate_locked_entity_reference()',
	'public.validate_minesweeper_win(jsonb,text)'
] as const;

const VUE_MATERIALISEE_FERMEE = 'student_achievement_stats';
const SEQUENCE_FERMEE = 'riddles_riddle_number_seq';

/** Tables dont anon garde la lecture (policy anon / public, lues sans connexion). */
const TABLES_LUES_PAR_ANON = [
	'question_templates',
	'resource_tags',
	'parody_evaluations',
	'tags'
] as const;

/** Échantillon : authenticated et service_role doivent garder ces droits. */
const ECHANTILLON_TABLES = [
	['classes', 'SELECT'],
	['class_members', 'SELECT'],
	['worksheets', 'SELECT'],
	['worksheet_instances', 'INSERT'],
	['kanban_cards', 'UPDATE'],
	['student_point_state', 'SELECT'],
	['marketplace_listings', 'DELETE'],
	['student_coursework_view', 'SELECT']
] as const;

// ============================================================================
// HELPERS
// ============================================================================

async function scalar(sql: string, params: unknown[]): Promise<boolean> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ ok: boolean }>(sql, params);
	return rows[0].ok;
}

function anonClient(): SupabaseClient<Database> {
	return createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe('(a) anon n’a plus aucun droit sur les objets fermés', () => {
	it('l’inventaire compte 141 relations et 143 fonctions', () => {
		expect(RELATIONS_FERMEES).toHaveLength(141);
		expect(new Set(RELATIONS_FERMEES).size).toBe(141);
		expect(FONCTIONS_REVOQUEES).toHaveLength(143);
		expect(new Set(FONCTIONS_REVOQUEES).size).toBe(143);
	});

	it.each(RELATIONS_FERMEES)('table/vue %s : aucun droit pour anon', async (rel) => {
		expect(
			await scalar(`select has_table_privilege('anon', $1, $2) as ok`, [
				`public.${rel}`,
				TOUS_DROITS_TABLE
			])
		).toBe(false);
	});

	it(`vue matérialisée ${VUE_MATERIALISEE_FERMEE} : aucun droit pour anon`, async () => {
		expect(
			await scalar(`select has_table_privilege('anon', $1, $2) as ok`, [
				`public.${VUE_MATERIALISEE_FERMEE}`,
				TOUS_DROITS_TABLE
			])
		).toBe(false);
	});

	it(`séquence ${SEQUENCE_FERMEE} : aucun droit pour anon`, async () => {
		expect(
			await scalar(`select has_sequence_privilege('anon', $1, 'USAGE,SELECT,UPDATE') as ok`, [
				`public.${SEQUENCE_FERMEE}`
			])
		).toBe(false);
	});

	it.each(FONCTIONS_REVOQUEES)('fonction %s : non exécutable par anon', async (fn) => {
		expect(await scalar(`select has_function_privilege('anon', $1, 'EXECUTE') as ok`, [fn])).toBe(
			false
		);
	});

	it('PostgREST : anon reçoit un refus explicite sur une table fermée', async () => {
		const { data, error } = await anonClient().from('classes').select('id');
		expect(data).toBeNull();
		expect(error?.code).toBe('42501');
	});
});

describe('(b) authenticated et service_role gardent leurs droits', () => {
	it.each(FONCTIONS_REVOQUEES)('fonction %s : exécutable par authenticated', async (fn) => {
		expect(
			await scalar(`select has_function_privilege('authenticated', $1, 'EXECUTE') as ok`, [fn])
		).toBe(true);
	});

	it.each(FONCTIONS_REVOQUEES)('fonction %s : exécutable par service_role', async (fn) => {
		expect(
			await scalar(`select has_function_privilege('service_role', $1, 'EXECUTE') as ok`, [fn])
		).toBe(true);
	});

	it.each(ECHANTILLON_TABLES)('table %s : %s gardé par les deux rôles', async (rel, priv) => {
		for (const role of ['authenticated', 'service_role']) {
			expect(
				await scalar(`select has_table_privilege($1, $2, $3) as ok`, [role, `public.${rel}`, priv])
			).toBe(true);
		}
	});

	it('séquence : les deux rôles gardent USAGE', async () => {
		for (const role of ['authenticated', 'service_role']) {
			expect(
				await scalar(`select has_sequence_privilege($1, $2, 'USAGE') as ok`, [
					role,
					`public.${SEQUENCE_FERMEE}`
				])
			).toBe(true);
		}
	});
});

describe('(c) non-régression anon : ce qui doit rester ouvert', () => {
	it.each(TABLES_LUES_PAR_ANON)('anon lit %s sans erreur', async (table) => {
		const { error } = await anonClient().from(table).select('*').limit(1);
		expect(error).toBeNull();
	});

	it('get_consent_info : exécutable et appelable par anon', async () => {
		expect(
			await scalar(`select has_function_privilege('anon', $1, 'EXECUTE') as ok`, [
				'public.get_consent_info(uuid)'
			])
		).toBe(true);
		const { error } = await anonClient().rpc('get_consent_info', {
			p_token: '00000000-0000-4000-8000-000000000000'
		});
		expect(error).toBeNull();
	});

	it('get_worksheet_by_share_token : exécutable et appelable par anon', async () => {
		expect(
			await scalar(`select has_function_privilege('anon', $1, 'EXECUTE') as ok`, [
				'public.get_worksheet_by_share_token(text, uuid)'
			])
		).toBe(true);
		const { error } = await anonClient().rpc('get_worksheet_by_share_token', {
			p_token: 'jeton-inexistant',
			p_worksheet_id: '00000000-0000-4000-8000-000000000000'
		});
		expect(error).toBeNull();
	});

	it('get_class_journal_by_share_token : exécutable et appelable par anon', async () => {
		expect(
			await scalar(`select has_function_privilege('anon', $1, 'EXECUTE') as ok`, [
				'public.get_class_journal_by_share_token(text)'
			])
		).toBe(true);
		const { error } = await anonClient().rpc('get_class_journal_by_share_token', {
			p_token: 'jeton-inexistant'
		});
		expect(error).toBeNull();
	});

	it('get_exercise_by_share_token : exécutable et appelable par anon', async () => {
		expect(
			await scalar(`select has_function_privilege('anon', $1, 'EXECUTE') as ok`, [
				'public.get_exercise_by_share_token(text)'
			])
		).toBe(true);
		const { error } = await anonClient().rpc('get_exercise_by_share_token', {
			p_token: 'jeton-inexistant'
		});
		expect(error).toBeNull();
	});
});

describe('(d) un élève connecté lit toujours ses classes', () => {
	const service = createServiceRoleClient();
	let eleve: SupabaseClient<Database>;
	let classe: string;

	async function insert(table: string, row: Record<string, unknown>): Promise<string> {
		const { data, error } = await service
			.from(table as never)
			.insert(row as never)
			.select('id')
			.single();
		if (error) throw new Error(`${table}: ${error.message}`);
		return (data as { id: string }).id;
	}

	beforeAll(async () => {
		await cleanupAllTestData();
		// Le trigger de création de classe ouvre un salon de discussion au nom du
		// professeur unique : il doit exister avant la classe.
		await TestData.profile().withRole('teacher').create();
		const profilEleve = await TestData.profile().withRole('student').create();
		const ecole = await insert('schools', {
			name: 'Lycée option-b ZZ',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: 'Année option-b ZZ',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		classe = await insert('classes', {
			name: '2nde option-b ZZ',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'ZZOB01',
			is_active: true
		});
		const { error } = await service
			.from('class_members')
			.insert({ class_id: classe, student_id: profilEleve.id, status: 'active' });
		if (error) throw new Error(`class_members: ${error.message}`);

		eleve = anonClient();
		const { error: authError } = await eleve.auth.signInWithPassword({
			email: profilEleve.email,
			password: DEFAULT_TEST_PASSWORD
		});
		if (authError) throw new Error(`connexion élève : ${authError.message}`);
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('voit sa classe dans `classes`', async () => {
		const { data, error } = await eleve.from('classes').select('id');
		expect(error).toBeNull();
		expect((data ?? []).map((r) => r.id)).toContain(classe);
	});

	it('voit son inscription dans `class_members`', async () => {
		const { data, error } = await eleve.from('class_members').select('class_id');
		expect(error).toBeNull();
		expect((data ?? []).map((r) => r.class_id)).toContain(classe);
	});
});
