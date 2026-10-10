/**
 * Fonctions SECURITY DEFINER vérifiées — liste blanche du garde-fou
 * ==================================================================
 *
 * Lue par `tests/integration/garde-fonctions-security-definer.test.ts`
 * (décision de David, Q145).
 *
 * Une fonction SECURITY DEFINER s'exécute avec les droits de son propriétaire
 * (`postgres`) : la RLS ne la protège PAS. Si un élève peut l'appeler, seule une
 * garde DANS son corps l'empêche de lire ou d'écrire le compte d'un autre.
 * Chaque entrée ci-dessous dit quelle garde a été LUE dans le corps (prosrc),
 * en une ligne. Une entrée qui ment est pire que pas d'entrée.
 *
 * Clé : `nom(arguments d'identité)`, telle que la rend
 * `pg_get_function_identity_arguments` (les surcharges sont distinctes).
 *
 * Inventaire du 2026-10-03, identique en local (toutes migrations) et en
 * production : mêmes signatures, mêmes droits, même `md5(prosrc)`.
 *
 * ⚠️ NE PAS AJOUTER une fonction pour faire passer le test sans avoir lu son
 * corps. Si elle ne contrôle pas l'appelant : la corriger (garde
 * `auth.uid()`, cf. migrations `rpc_lot*`) ou révoquer EXECUTE.
 *
 * ── Lot 5 (migration 20261003230000_rpc_lot5_gardes_restantes) ──────────
 *
 * Les 24 fonctions relevées au premier passage du garde-fou (2026-10-03) ont
 * été gardées (8, entrées « lot 5 » ci-dessous) ou rendues au seul client
 * service (16, REVOKE authenticated : absentes de la liste).
 */

// ============================================================================
// TYPES
// ============================================================================

export type CategorieDefiner =
	/** Paramètre utilisateur comparé à auth.uid() (refus 42501 sinon). */
	| 'compte-appelant'
	/** Paramètre utilisateur = auth.uid(), ou appelant prof/admin. */
	| 'compte-appelant-ou-prof'
	/** Ne lit/écrit qu'à partir d'auth.uid(), sans paramètre visant autrui. */
	| 'auth-uid'
	/** L'appelant doit participer (match, partie, conversation, échange). */
	| 'participant'
	/** Réservée prof/admin (is_teacher_or_admin, assert_*, rôle lu). */
	| 'prof'
	/** Réservée admin (is_admin, rôle admin lu). */
	| 'admin'
	/** Prédicat de policy RLS sur l'appelant, sans paramètre utilisateur. */
	| 'predicat-rls'
	/** Accès par jeton de partage / de consentement (pages publiques). */
	| 'jeton'
	/** Classement ou annuaire borné et voulu (décision tracée). */
	| 'classement'
	/** Contenu, configuration ou agrégat sans donnée de compte. */
	| 'non-personnel';

export interface FonctionDefinerVerifiee {
	categorie: CategorieDefiner;
	/** Une ligne, en français : la garde LUE dans le corps. */
	justification: string;
	/** Exécutable aussi par `anon` (pages publiques sans connexion). */
	anon?: true;
}

// ============================================================================
// LISTE
// ============================================================================

export const FONCTIONS_DEFINER_VERIFIEES: Record<string, FonctionDefinerVerifiee> = {
	// ── Comptes : paramètre utilisateur comparé à auth.uid() ──────────────────
	'accept_proposal_atomic(p_proposal_id uuid, p_user_id uuid)': {
		categorie: 'compte-appelant',
		justification: 'refuse si auth.uid() <> p_user_id (sauf service_role)'
	},
	'create_1on1_chat(p_user1_id uuid, p_user2_id uuid)': {
		categorie: 'compte-appelant',
		justification: 'garde p_user1_id = auth.uid(), puis amitié acceptée exigée'
	},
	'get_private_messages_unread_count(p_user_id uuid)': {
		categorie: 'compte-appelant',
		justification: 'garde auth.uid() = p_user_id (lot 4)'
	},
	'get_due_cards_for_deck(p_user_id uuid, p_deck_id uuid, p_all boolean)': {
		categorie: 'compte-appelant',
		justification: 'garde p_user_id = auth.uid() et deck appartenant à l’appelant'
	},
	'get_user_conversations(p_user_id uuid)': {
		categorie: 'compte-appelant',
		justification: 'refuse p_user_id <> auth.uid() ; NULL = auth.uid()'
	},
	'insert_tutor_messages(p_conversation_id uuid, p_user_id uuid, p_messages jsonb)': {
		categorie: 'compte-appelant',
		justification: 'garde auth.uid() = p_user_id et conversation possédée'
	},
	'mark_conversation_read(p_conversation_id uuid, p_user_id uuid, p_message_id uuid)': {
		categorie: 'compte-appelant',
		justification: 'garde auth.uid() = p_user_id'
	},
	'mark_message_as_read(p_message_id uuid, p_user_id uuid)': {
		categorie: 'compte-appelant',
		justification: 'garde auth.uid() = p_user_id'
	},
	'move_message_to_folder(p_message_id uuid, p_user_id uuid, p_folder_id uuid)': {
		categorie: 'compte-appelant',
		justification: 'garde auth.uid() = p_user_id, dossier de l’appelant'
	},
	'purchase_shop_item(p_student_id uuid, p_template_id uuid, p_quantity integer, p_purchase_context jsonb)':
		{
			categorie: 'compte-appelant',
			justification: 'refuse si p_student_id <> auth.uid()'
		},
	'purchase_vip_card(p_student_id uuid, p_card_id text)': {
		categorie: 'compte-appelant',
		justification: 'auth.uid() requis et égal à p_student_id'
	},
	'record_game_reward(p_student_id uuid, p_game_type text, p_game_id uuid, p_theoretical_reward numeric, p_school_id uuid)':
		{
			categorie: 'compte-appelant',
			justification: 'refuse si auth.uid() <> p_student_id ; élève seulement'
		},
	'record_listing_views_batch(p_listing_ids uuid[], p_user_id uuid)': {
		categorie: 'compte-appelant',
		justification: 'garde auth.uid() = p_user_id (lot 4)'
	},
	'request_vip_card_activation(p_student_id uuid, p_instance_id text)': {
		categorie: 'compte-appelant',
		justification: 'auth.uid() requis et égal à p_student_id'
	},
	'sell_vip_card(p_student_id uuid, p_card_instance_id text)': {
		categorie: 'compte-appelant',
		justification: 'auth.uid() requis et égal à p_student_id'
	},
	'submit_riddle_attempt(p_riddle_id uuid, p_student_id uuid, p_submitted_answer jsonb, p_is_correct boolean)':
		{
			categorie: 'compte-appelant',
			justification: 'refuse si auth.uid() <> p_student_id'
		},
	'toggle_message_star(p_message_id uuid, p_user_id uuid)': {
		categorie: 'compte-appelant',
		justification: 'garde auth.uid() = p_user_id'
	},
	'update_message_status(p_message_id uuid, p_user_id uuid, p_status text)': {
		categorie: 'compte-appelant',
		justification: 'garde auth.uid() = p_user_id'
	},
	'update_tutor_conversation_stats(p_conversation_id uuid, p_user_id uuid, p_message_count integer, p_max_help_level integer)':
		{
			categorie: 'compte-appelant',
			justification: 'garde auth.uid() = p_user_id et conversation possédée'
		},
	'upsert_mathemo_score(p_user_id uuid, p_word_length integer, p_won boolean, p_found_first_try boolean, p_score numeric)':
		{
			categorie: 'compte-appelant',
			justification: 'refuse si auth.uid() <> p_user_id'
		},
	'upsert_user_presence(p_user_id uuid, p_status text)': {
		categorie: 'compte-appelant',
		justification: 'garde auth.uid() = p_user_id'
	},

	// ── Lot 5 : soi, ou prof / admin ──────────────────────────────────────────
	'can_moderate_message(moderator_uuid uuid, message_uuid uuid)': {
		categorie: 'compte-appelant-ou-prof',
		justification: 'garde moderator_uuid = auth.uid() ou is_teacher_or_admin (lot 5)'
	},
	'is_conversation_participant(p_conversation_id uuid, p_user_id uuid)': {
		categorie: 'compte-appelant-ou-prof',
		justification: 'garde p_user_id = auth.uid() ou is_teacher_or_admin (lot 5)'
	},
	'is_riddle_assigned_to_student(p_riddle_id uuid, p_student_id uuid)': {
		categorie: 'compte-appelant-ou-prof',
		justification: 'garde p_student_id = auth.uid() ou is_teacher_or_admin (lot 5)'
	},
	'student_has_exercise_access(p_exercise_id uuid, p_student_id uuid)': {
		categorie: 'compte-appelant-ou-prof',
		justification: 'garde p_student_id = auth.uid() ou is_teacher_or_admin (lot 5)'
	},
	'check_daily_trade_limit(p_user_id uuid)': {
		categorie: 'compte-appelant-ou-prof',
		justification: 'garde soi, ami (is_friend, partenaire d’échange) ou prof/admin (lot 5)'
	},
	'minesweeper_rank_in_school()': {
		categorie: 'auth-uid',
		justification:
			'sans paramètre : rang de auth.uid() parmi les élèves classés de son école, le nombre seul (D16)'
	},
	'check_marketplace_enabled(p_student_id uuid)': {
		categorie: 'compte-appelant-ou-prof',
		justification: 'garde soi, ami (is_friend, partenaire d’échange) ou prof/admin (lot 5)'
	},

	// ── Comptes : soi-même, ou prof / admin ───────────────────────────────────
	'count_user_notebooks(p_user_id uuid)': {
		categorie: 'compte-appelant-ou-prof',
		justification: 'garde auth.uid() = p_user_id ou is_teacher_or_admin (lot 4)'
	},
	'count_user_python_files(p_user_id uuid)': {
		categorie: 'compte-appelant-ou-prof',
		justification: 'garde auth.uid() = p_user_id ou is_teacher_or_admin (lot 4)'
	},
	'draw_multiple_vip_cards(p_student_id uuid, p_count integer, p_payment_method text, p_gidouilles_cost integer, p_vip_card_instance_id uuid, p_force_rarity text, p_min_rarity text, p_exclude_card_ids text[], p_only_cards_with_actions boolean)':
		{
			categorie: 'compte-appelant-ou-prof',
			justification: 'soi-même, ou prof et élève inscrit ; filtres de rareté réservés au prof'
		},
	'duplicate_template(p_template_id uuid, p_user_id uuid, p_new_title text)': {
		categorie: 'compte-appelant-ou-prof',
		justification: 'exige p_user_id = auth.uid() ET is_teacher_or_admin'
	},
	'get_2048_user_rank(p_user_id uuid)': {
		categorie: 'compte-appelant-ou-prof',
		justification: 'garde auth.uid() = p_user_id ou is_teacher_or_admin (lot 4)'
	},
	'get_allowed_recipients(p_user_id uuid)': {
		categorie: 'compte-appelant-ou-prof',
		justification: 'garde auth.uid() = p_user_id ou is_admin'
	},
	'get_deck_stats(p_user_id uuid, p_deck_id uuid)': {
		categorie: 'compte-appelant-ou-prof',
		justification:
			'garde auth.uid() = p_user_id ou is_teacher_or_admin (lot 4), puis paquet lisible selon les policies SELECT de srs_decks (20261004230000)'
	},
	'get_message_details(p_message_id uuid, p_user_id uuid)': {
		categorie: 'compte-appelant-ou-prof',
		justification: 'garde auth.uid() = p_user_id ou is_admin, puis destinataire du message'
	},
	'get_message_thread(p_thread_root_id uuid, p_user_id uuid)': {
		categorie: 'compte-appelant-ou-prof',
		justification: 'garde auth.uid() = p_user_id ou is_admin, puis accès au fil vérifié'
	},
	'get_student_exercises(p_student_id uuid)': {
		categorie: 'compte-appelant-ou-prof',
		justification: 'assert_can_read_student(p_student_id) en tête'
	},
	'get_student_week_best(p_student_id uuid, p_school_id uuid)': {
		categorie: 'compte-appelant-ou-prof',
		justification: 'auth.uid() = p_student_id, sinon rôle prof/admin exigé'
	},
	'get_user_inbox(p_user_id uuid, p_status text, p_folder_id uuid, p_limit integer, p_offset integer)':
		{
			categorie: 'compte-appelant-ou-prof',
			justification: 'garde auth.uid() = p_user_id ou is_admin'
		},
	'get_user_sent_messages(p_user_id uuid, p_limit integer, p_offset integer)': {
		categorie: 'compte-appelant',
		justification: 'garde auth.uid() = p_user_id ou is_admin'
	},
	'get_user_status(user_id uuid)': {
		categorie: 'compte-appelant-ou-prof',
		justification: 'garde auth.uid() = user_id ou is_teacher_or_admin (lot 4)'
	},
	'has_proposal_on_listing(p_listing_id uuid, p_user_id uuid)': {
		categorie: 'compte-appelant-ou-prof',
		justification: 'garde auth.uid() = p_user_id ou is_teacher_or_admin (lot 4)'
	},
	'log_template_action(p_template_id uuid, p_action text, p_performed_by uuid, p_changes jsonb, p_metadata jsonb)':
		{
			categorie: 'compte-appelant-ou-prof',
			justification: 'hors prof/admin : p_performed_by = auth.uid() et modèle à soi'
		},
	'search_private_messages(p_user_id uuid, p_query text, p_search_in text, p_has_attachments boolean, p_sender_name text, p_date_from timestamp with time zone, p_date_to timestamp with time zone, p_limit integer, p_offset integer)':
		{
			categorie: 'compte-appelant-ou-prof',
			justification: 'garde auth.uid() = p_user_id ou is_admin'
		},
	'send_private_message(p_sender_id uuid, p_recipient_ids uuid[], p_subject text, p_content jsonb, p_is_group_message boolean, p_class_id uuid, p_parent_message_id uuid)':
		{
			categorie: 'compte-appelant-ou-prof',
			justification: 'garde p_sender_id = auth.uid() ou is_admin, puis destinataires validés'
		},
	'use_vip_card(p_student_id uuid, p_instance_id text, p_card_id text, p_metadata jsonb, p_context text)':
		{
			categorie: 'compte-appelant-ou-prof',
			justification: 'auth.uid() = p_student_id, sinon is_teacher_or_admin et élève inscrit'
		},

	// ── Ne lit / n'écrit qu'à partir d'auth.uid() ─────────────────────────────
	'get_classes_by_user_grade()': {
		categorie: 'auth-uid',
		justification: 'classes filtrées sur cm.student_id = auth.uid()'
	},
	'get_my_error_reports()': {
		categorie: 'auth-uid',
		justification: 'filtre student_id = auth.uid()'
	},
	'get_my_exercise_assignments()': {
		categorie: 'auth-uid',
		justification: 'filtre ea.student_id / classes de auth.uid()'
	},
	'get_students_in_class_by_grade(target_class_id uuid)': {
		categorie: 'auth-uid',
		justification: 'exige que auth.uid() soit membre de target_class_id'
	},
	'get_teacher_assignment_stats()': {
		categorie: 'auth-uid',
		justification: 'filtre assigned_by = auth.uid()'
	},
	'get_teacher_exercise_assignments()': {
		categorie: 'auth-uid',
		justification: 'filtre assigned_by = auth.uid()'
	},
	'join_multiplayer_queue(p_difficulty text, p_match_type text)': {
		categorie: 'auth-uid',
		justification: 'inscrit auth.uid() seulement, refuse si non authentifié'
	},
	'leave_multiplayer_queue()': {
		categorie: 'auth-uid',
		justification: 'retire auth.uid() seulement'
	},
	'check_match_status()': {
		categorie: 'auth-uid',
		justification: 'état du match de auth.uid() seulement'
	},
	'use_2048_power(p_power_type text)': {
		categorie: 'auth-uid',
		justification: 'débite auth.uid(), élève seulement'
	},
	'use_mathemo_power(p_power_type text)': {
		categorie: 'auth-uid',
		justification: 'débite auth.uid(), élève seulement'
	},
	'use_item(p_inventory_id uuid, p_context text, p_usage_data jsonb)': {
		categorie: 'auth-uid',
		justification: 'objet d’inventaire filtré sur i.student_id = auth.uid()'
	},

	// ── Participant : partie, match, conversation, échange ────────────────────
	'abandon_multiplayer_match(p_match_id uuid, p_reason text)': {
		categorie: 'participant',
		justification: 'auth.uid() doit participer au match'
	},
	'abandon_tournament_game(p_game_id uuid)': {
		categorie: 'participant',
		justification: 'partie appartenant à auth.uid() exigée'
	},
	'complete_minesweeper_game(p_game_id uuid, p_grid_state jsonb)': {
		categorie: 'participant',
		justification: 'partie filtrée sur student_id = auth.uid()'
	},
	'complete_multiplayer_match(p_match_id uuid, p_time_seconds integer, p_grid_state jsonb)': {
		categorie: 'participant',
		justification: 'auth.uid() doit participer au match'
	},
	'complete_tournament_game(p_game_id uuid, p_status text, p_time_seconds integer, p_grid_state jsonb)':
		{
			categorie: 'participant',
			justification: 'partie filtrée sur g.student_id = auth.uid()'
		},
	'delete_attachment(p_attachment_id uuid)': {
		categorie: 'participant',
		justification: 'auteur de la pièce jointe, ou prof créateur de la conversation'
	},
	'execute_trade(p_trade_id uuid)': {
		categorie: 'participant',
		justification: 'auth.uid() = initiateur ou partenaire de l’échange'
	},
	'get_match_state(p_match_id uuid)': {
		categorie: 'participant',
		justification: 'match filtré sur la participation de auth.uid()'
	},
	'get_message_attachments(p_message_id uuid)': {
		categorie: 'participant',
		justification: 'auth.uid() participant de la conversation'
	},
	'get_message_reaction_counts(p_message_id uuid)': {
		categorie: 'participant',
		justification: 'auth.uid() participant de la conversation'
	},
	'get_messages_paginated(p_conversation_id uuid, p_limit integer, p_before_id uuid, p_before_timestamp timestamp with time zone)':
		{
			categorie: 'participant',
			justification: 'auth.uid() participant de la conversation'
		},
	'get_reaction_users(p_message_id uuid, p_emoji text)': {
		categorie: 'participant',
		justification: 'auth.uid() participant de la conversation'
	},
	'record_minesweeper_loss(p_game_id uuid, p_grid_state jsonb)': {
		categorie: 'participant',
		justification: 'partie filtrée sur student_id = auth.uid()'
	},
	'report_message(p_message_id uuid, p_reason text, p_details text)': {
		categorie: 'participant',
		justification: 'auth.uid() participant de la conversation'
	},
	'soft_delete_message(p_message_id uuid)': {
		categorie: 'participant',
		justification: 'auteur du message, ou prof créateur de la conversation'
	},
	'start_match(p_match_id uuid)': {
		categorie: 'participant',
		justification: 'match filtré sur la participation de auth.uid()'
	},
	'start_tournament_game(p_tournament_id uuid)': {
		categorie: 'participant',
		justification: 'auth.uid() requis et éligible au tournoi'
	},
	'toggle_reaction(p_message_id uuid, p_emoji text)': {
		categorie: 'participant',
		justification: 'auth.uid() participant de la conversation'
	},
	'update_game_state(p_match_id uuid, p_cells_revealed integer, p_flags_used integer, p_time_elapsed integer, p_last_action jsonb)':
		{
			categorie: 'participant',
			justification: 'match filtré sur la participation de auth.uid()'
		},
	'use_detector(p_game_id uuid)': {
		categorie: 'participant',
		justification: 'partie filtrée sur student_id = auth.uid()'
	},
	'use_hint(p_game_id uuid)': {
		categorie: 'participant',
		justification: 'partie filtrée sur student_id = auth.uid()'
	},
	'use_minesweeper_undo(p_game_id uuid, p_grid_state jsonb)': {
		categorie: 'participant',
		justification: 'partie filtrée sur student_id = auth.uid()'
	},

	// ── Réservées prof / admin ────────────────────────────────────────────────
	'add_student_gidouilles(p_student_id uuid, p_amount integer)': {
		categorie: 'prof',
		justification: 'is_teacher_or_admin, puis élève inscrit'
	},
	'award_achievement_manual(p_student_id uuid, p_achievement_id text, p_reason text)': {
		categorie: 'prof',
		justification: 'is_teacher_or_admin (lot 5), puis élève inscrit dans une classe'
	},
	'get_teacher_classes_for_messaging()': {
		categorie: 'prof',
		justification: 'is_teacher_or_admin, refus 42501 (lot 5)'
	},
	'add_warning(p_student_id uuid, p_class_id uuid, p_academic_period_id uuid, p_warning_type text)':
		{
			categorie: 'prof',
			justification: 'is_class_teacher(p_class_id) (= is_teacher_or_admin)'
		},
	'add_warnings_bulk(p_student_id uuid, p_class_id uuid, p_academic_period_id uuid, p_warning_types text[])':
		{
			categorie: 'prof',
			justification: 'is_class_teacher(p_class_id) (= is_teacher_or_admin)'
		},
	'approve_vip_card(p_student_id uuid, p_instance_id text)': {
		categorie: 'prof',
		justification: 'is_teacher_or_admin, puis élève inscrit'
	},
	'award_random_vip_card(p_student_id uuid)': {
		categorie: 'prof',
		justification: 'is_teacher_or_admin, puis élève inscrit'
	},
	'award_vip_cards_with_filters(p_student_id uuid, p_count integer, p_filters jsonb)': {
		categorie: 'prof',
		justification: 'is_teacher_or_admin, puis élève inscrit'
	},
	'award_weekly_reward(p_student_id uuid, p_class_id uuid, p_week_start date, p_week_end date, p_gidouilles integer, p_reason text)':
		{
			categorie: 'prof',
			justification: 'rôle admin, ou teacher et is_teacher_or_admin'
		},
	'backfill_tournament_scores(p_tournament_id uuid)': {
		categorie: 'prof',
		justification: 'is_teacher_or_admin (lot 4)'
	},
	'can_view_student_profile(student_profile_id uuid)': {
		categorie: 'prof',
		justification: 'vrai seulement si is_teacher_or_admin'
	},
	'compute_daily_summary(p_student_id uuid, p_class_id uuid, p_summary_date date)': {
		categorie: 'prof',
		justification: 'rôle admin, ou teacher et is_teacher_or_admin'
	},
	'create_tournament(p_name text, p_difficulty text, p_start_date timestamp with time zone, p_end_date timestamp with time zone, p_class_ids uuid[], p_description text, p_top_x_games integer, p_podium_rewards jsonb, p_podium_places integer)':
		{
			categorie: 'prof',
			justification: 'auth.uid() requis, rôle prof/admin ; global réservé admin'
		},
	'finalize_tournament(p_tournament_id uuid)': {
		categorie: 'prof',
		justification: 'créateur du tournoi (auth.uid()) ou admin'
	},
	'get_assignment_completion_stats(p_assignment_id uuid)': {
		categorie: 'prof',
		justification: 'assert_teacher_or_admin() en tête'
	},
	'get_exercise_completion_stats(p_exercise_id uuid)': {
		categorie: 'prof',
		justification: 'assert_teacher_or_admin() en tête'
	},
	'get_message_context_for_moderation(p_message_id uuid, p_before_count integer)': {
		categorie: 'prof',
		justification: 'is_teacher_or_admin'
	},
	'get_next_export_counter(p_class_id uuid, p_export_date date)': {
		categorie: 'prof',
		justification: 'is_teacher_or_admin (lot 4)'
	},
	'get_pending_reports_count()': {
		categorie: 'prof',
		justification: 'is_teacher_or_admin'
	},
	'get_reports_for_moderation(p_status text, p_limit integer, p_offset integer)': {
		categorie: 'prof',
		justification: 'is_teacher_or_admin'
	},
	'get_teacher_classes_with_data(p_is_test_mode boolean)': {
		categorie: 'prof',
		justification: 'is_teacher_or_admin, refus 42501'
	},
	'get_teacher_classes_with_students(p_is_test_mode boolean)': {
		categorie: 'prof',
		justification: 'is_teacher_or_admin, refus 42501'
	},
	'get_user_moderation_history(p_user_id uuid, p_limit integer)': {
		categorie: 'prof',
		justification: 'rôle prof/admin de auth.uid() exigé'
	},
	'grant_specific_vip_card(p_student_id uuid, p_card_id text, p_count integer)': {
		categorie: 'prof',
		justification: 'is_teacher_or_admin, puis élève inscrit'
	},
	'initialize_default_categories(p_class_id uuid)': {
		categorie: 'prof',
		justification: 'auth.uid() requis et is_teacher_or_admin'
	},
	'is_class_teacher(p_class_id uuid)': {
		categorie: 'prof',
		justification: 'rend is_teacher_or_admin() (mono-prof)'
	},
	'is_my_student(p_student_id uuid)': {
		categorie: 'prof',
		justification: 'rend is_teacher_or_admin() (mono-prof)'
	},
	'is_teacher_for_shared_coursework(p_shared_coursework_id uuid)': {
		categorie: 'prof',
		justification: 'rend is_teacher_or_admin() (mono-prof)'
	},
	'is_teacher_of_class(p_class_id uuid)': {
		categorie: 'prof',
		justification: 'rend is_teacher_or_admin() (mono-prof)'
	},
	'is_teacher_of_student(p_student_id uuid)': {
		categorie: 'prof',
		justification: 'vrai seulement si is_teacher_or_admin'
	},
	'log_moderation_action(p_action text, p_target_type text, p_target_id uuid, p_reason text, p_metadata jsonb)':
		{
			categorie: 'prof',
			justification: 'rôle prof/admin de auth.uid() exigé, auteur = auth.uid()'
		},
	'process_weekly_rewards(p_week_start date, p_week_end date, p_class_ids uuid[])': {
		categorie: 'prof',
		justification: 'rôle admin ou teacher de auth.uid() exigé'
	},
	'redistribute_tournament_rewards(p_tournament_id uuid)': {
		categorie: 'prof',
		justification: 'créateur du tournoi (auth.uid()) ou admin'
	},
	'reject_vip_card(p_student_id uuid, p_instance_id text)': {
		categorie: 'prof',
		justification: 'is_teacher_or_admin, puis élève inscrit'
	},
	'remove_student_vip_card(p_student_id uuid, p_card_id text)': {
		categorie: 'prof',
		justification: 'is_teacher_or_admin, puis élève inscrit'
	},
	'remove_vip_card(p_student_id uuid, p_card_id text, p_instance_id text, p_reason text)': {
		categorie: 'prof',
		justification: 'is_teacher_or_admin, puis élève inscrit'
	},
	'remove_warnings_bulk(p_student_id uuid, p_class_id uuid, p_academic_period_id uuid, p_warning_types text[], p_deletion_context jsonb)':
		{
			categorie: 'prof',
			justification: 'is_class_teacher(p_class_id) (= is_teacher_or_admin)'
		},
	'reorder_worksheet_exercises(p_worksheet_id uuid, p_exercises jsonb)': {
		categorie: 'prof',
		justification: 'créateur de la fiche (auth.uid()) ou admin'
	},
	'reorder_worksheet_sections(p_worksheet_id uuid, p_sections jsonb)': {
		categorie: 'prof',
		justification: 'créateur de la fiche (auth.uid()) ou admin'
	},
	'review_report(p_report_id uuid, p_new_status text, p_review_notes text, p_delete_message boolean)':
		{
			categorie: 'prof',
			justification: 'is_teacher_or_admin'
		},
	'set_riddle_of_the_day(p_riddle_id uuid, p_date date, p_selected_by uuid)': {
		categorie: 'prof',
		justification: 'is_teacher_or_admin ; auteur = auth.uid()'
	},
	'soft_delete_warning(p_warning_id uuid)': {
		categorie: 'prof',
		justification: 'rôle prof/admin de auth.uid() exigé'
	},
	'update_class_gidouilles(p_class_id uuid, p_delta integer)': {
		categorie: 'prof',
		justification: 'is_teacher_or_admin'
	},
	'update_student_bonus(p_student_id uuid, p_class_id uuid, p_delta integer, p_reason text, p_created_by uuid)':
		{
			categorie: 'prof',
			justification: 'admin, ou teacher et élève actif de p_class_id'
		},
	'update_student_gidouilles(p_student_id uuid, p_class_id uuid, p_delta integer, p_reason text, p_created_by uuid)':
		{
			categorie: 'prof',
			justification: 'admin, ou teacher et élève actif de p_class_id'
		},
	'update_student_gidouilles(p_student_id uuid, p_delta integer)': {
		categorie: 'prof',
		justification: 'is_teacher_or_admin, puis élève inscrit'
	},
	'validate_riddle_attempt(p_attempt_id uuid, p_is_correct boolean)': {
		categorie: 'prof',
		justification: 'is_teacher_or_admin, refus 42501'
	},

	// ── Réservées admin ───────────────────────────────────────────────────────
	'admin_compose_class(p_class_id uuid, p_student_ids uuid[])': {
		categorie: 'admin',
		justification: 'is_admin, refus 42501'
	},
	'award_weekly_best_bonuses(p_week_start date, p_week_end date)': {
		categorie: 'admin',
		justification: 'rôle admin de auth.uid() exigé (NULL = tâche planifiée)'
	},
	'close_school_year(p_school_year_id uuid)': {
		categorie: 'admin',
		justification: 'is_admin en tête, exception sinon'
	},
	'get_all_exercise_assignments()': {
		categorie: 'admin',
		justification: 'WHERE exige rôle admin de auth.uid() : vide sinon'
	},
	'get_database_stats()': {
		categorie: 'admin',
		justification: 'is_admin, refus 42501'
	},
	'reopen_school_year(p_school_year_id uuid)': {
		categorie: 'admin',
		justification: 'is_admin en tête, exception sinon'
	},
	'resolve_error(p_error_log_id uuid, p_resolved_by uuid, p_notes text)': {
		categorie: 'admin',
		justification: 'is_admin en tête, exception sinon'
	},
	'resolve_error_by_signature(p_error_signature text, p_resolved_by uuid, p_notes text)': {
		categorie: 'admin',
		justification: 'is_admin en tête, exception sinon'
	},
	'search_users_unaccent(search_term text, result_limit integer)': {
		categorie: 'admin',
		justification: 'is_admin, refus 42501'
	},

	// ── Prédicats de policy RLS sur l'appelant ────────────────────────────────
	'are_classmates(p_user_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'relation entre auth.uid() et p_user_id (classe commune)'
	},
	'can_access_assignment(p_assignment_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'créateur ou élève visé, calculé sur auth.uid()'
	},
	'can_access_kanban_board(p_board_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'propriétaire ou membre de la classe, sur auth.uid()'
	},
	'can_access_kanban_column(p_column_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'délègue à can_access_kanban_board (auth.uid())'
	},
	'can_assign_kanban_card(p_card_id uuid, p_assignee uuid)': {
		categorie: 'predicat-rls',
		justification: 'can_access_kanban_board puis propriétaire ou assigné = auth.uid()'
	},
	'can_grant_kanban_card_assignment(p_card_id uuid, p_assignee uuid)': {
		categorie: 'predicat-rls',
		justification: 'faux si can_assign_kanban_card (auth.uid()) est faux'
	},
	'can_manage_kanban_card_tag(p_card_id uuid, p_tag_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'délègue à can_access_kanban_board (auth.uid())'
	},
	'can_read_assignment(p_assignment_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'can_access_assignment ou had_class_access_to_assignment (auth.uid())'
	},
	'had_class_access_to_assignment(p_assignment_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'adhésion de auth.uid() à une classe visée'
	},
	'has_individual_assignment(p_assignment_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'student_id = auth.uid()'
	},
	'has_pending_request_from(p_requester_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'demande reçue par auth.uid() seulement'
	},
	'is_admin()': {
		categorie: 'predicat-rls',
		justification: 'rôle de auth.uid()'
	},
	'is_assignment_creator(p_assignment_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'created_by = auth.uid()'
	},
	'is_class_member(p_class_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'student_id = auth.uid()'
	},
	'is_class_student(p_class_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'student_id = auth.uid()'
	},
	'is_classmate(p_class_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'cm.student_id = auth.uid()'
	},
	'is_evaluation_owner(p_evaluation_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'created_by = auth.uid()'
	},
	'is_file_assigned_to_student(p_file_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'adhésion de auth.uid() à une classe visée'
	},
	'is_friend(p_user_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'amitié entre auth.uid() et p_user_id seulement'
	},
	'is_in_assigned_class(p_assignment_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'adhésion de auth.uid() à une classe visée'
	},
	'is_notebook_assigned_to_student(p_notebook_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'adhésion de auth.uid() à une classe visée'
	},
	'is_series_owner(p_series_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'created_by = auth.uid()'
	},
	'is_student()': {
		categorie: 'predicat-rls',
		justification: 'rôle de auth.uid()'
	},
	'is_student_in_class(p_class_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'student_id = auth.uid()'
	},
	'is_teacher_or_admin()': {
		categorie: 'predicat-rls',
		justification: 'rôle de auth.uid()'
	},
	'my_school()': {
		categorie: 'predicat-rls',
		justification: 'école de auth.uid()'
	},
	'same_school(p_other uuid)': {
		categorie: 'predicat-rls',
		justification: 'compare l’école de p_other à my_school() (auth.uid())'
	},
	'shares_tournament(target_user_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'tournoi commun entre auth.uid() et la cible'
	},
	'student_can_read_evaluation(p_evaluation_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'élève visé = auth.uid() ou classe de auth.uid()'
	},
	'student_can_read_series(p_series_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'student_can_read_evaluation / is_class_student (auth.uid())'
	},
	'student_has_exercise_access(p_exercise_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'délègue à student_has_worksheet_access (auth.uid())'
	},
	'student_has_worksheet_access(p_worksheet_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'classe ou affectation individuelle de auth.uid()'
	},
	'teacher_owns_riddle(p_riddle_id uuid)': {
		categorie: 'predicat-rls',
		justification: 'created_by = auth.uid()'
	},

	// ── Jetons (pages publiques, anon compris) ────────────────────────────────
	'get_class_journal_by_share_token(p_token text)': {
		categorie: 'jeton',
		justification: 'jeton de partage du cahier de textes (16 à 64 caractères)',
		anon: true
	},
	'get_consent_info(p_token uuid)': {
		categorie: 'jeton',
		justification: 'jeton de consentement parental, expiration vérifiée',
		anon: true
	},
	'get_exercise_by_share_token(p_token text)': {
		categorie: 'jeton',
		justification: 'jeton de partage d’exercice actif et non expiré',
		anon: true
	},
	'get_worksheet_by_share_token(p_token text, p_worksheet_id uuid)': {
		categorie: 'jeton',
		justification: 'jeton du cahier de textes + fiche citée par une séance',
		anon: true
	},
	'exercise_has_valid_share_token(exercise_uuid uuid)': {
		categorie: 'jeton',
		justification: 'booléen sur un EXERCICE (jeton actif), aucune donnée de compte'
	},

	// ── Classements et annuaires bornés, voulus ───────────────────────────────
	'game_leaderboard(p_game text, p_scope text, p_limit integer)': {
		categorie: 'classement',
		justification: 'auth.uid() requis, borné à my_school() (classe, niveau, école)'
	},
	'minesweeper_scoped_leaderboard(p_scope text, p_limit integer)': {
		categorie: 'classement',
		justification: 'auth.uid() requis, borné à my_school() (classe, niveau, école)'
	},
	'get_achievement_leaderboard(p_limit integer, p_context text)': {
		categorie: 'classement',
		justification:
			'nom pseudonymisé « Marie D. » + avatar, voulu (2026-09-15, achievements/service.ts)'
	},
	'resolve_marketplace_participants(p_user_ids uuid[])': {
		categorie: 'classement',
		justification: 'nom pseudonymisé des seuls participants du marché (David, 2026-09-15)'
	},
	'get_staff_directory()': {
		categorie: 'classement',
		justification: 'annuaire du personnel (prof/admin) : aucun élève'
	},

	// ── Contenu, configuration, agrégats sans donnée de compte ────────────────
	'app_is_anti_fraud_enabled()': {
		categorie: 'non-personnel',
		justification: 'lit un drapeau de app_config'
	},
	'curriculum_point_reference_counts(p_point_id uuid)': {
		categorie: 'non-personnel',
		justification: 'compteurs de références d’un point du référentiel'
	},
	'curriculum_referenced_points(p_grade text)': {
		categorie: 'non-personnel',
		justification: 'identifiants de points du référentiel référencés'
	},
	'get_error_stats(p_hours integer)': {
		categorie: 'non-personnel',
		justification: 'agrégats des journaux d’erreurs : ni identifiant, ni message'
	},
	'get_riddle_of_the_day(p_date date)': {
		categorie: 'non-personnel',
		justification: 'identifiant de l’énigme du jour'
	},
	'get_template_statistics(p_template_id uuid)': {
		categorie: 'non-personnel',
		justification: 'agrégats anonymes d’usage d’un modèle de message'
	},
	'get_templates_for_context(p_trigger_type text, p_class_id uuid)': {
		categorie: 'non-personnel',
		justification: 'modèle de message actif (contenu), aucune donnée d’élève'
	},
	'get_tournament_details(p_tournament_id uuid)': {
		categorie: 'non-personnel',
		justification: 'fiche d’un tournoi et deux compteurs, aucune donnée d’élève'
	},
	'get_whiteboard_templates(p_category whiteboard_template_category)': {
		categorie: 'non-personnel',
		justification: 'modèles de tableau blanc publics (is_public)'
	},
	'is_riddle_of_the_day(p_riddle_id uuid)': {
		categorie: 'non-personnel',
		justification: 'booléen sur une énigme'
	},
	'next_curriculum_point_code(p_grade text)': {
		categorie: 'non-personnel',
		justification: 'prochain code de point du référentiel (lecture)'
	},
	'shared_coursework_is_restricted(p_shared_coursework_id uuid)': {
		categorie: 'non-personnel',
		justification: 'booléen : un partage est-il restreint, sans dire à qui'
	}
};

// ============================================================================
// FONCTIONS DE TRIGGER SECURITY DEFINER
// ============================================================================

/**
 * Une fonction de trigger ne s'appelle pas en RPC (« can only be called as triggers ») : elle
 * sort de la liste ci-dessus. Celles qui sont déclarées ici sont vérifiées une à une par le
 * garde-fou (d) : SECURITY DEFINER, propriétaire postgres, EXECUTE retiré à PUBLIC, anon et
 * authenticated, garde d'appelant lue dans le corps (`auth.role()` et
 * `public.is_teacher_or_admin()`, ou `public.is_admin()`, plus stricte).
 */
export interface DeclencheurDefinerVerifie {
	/** Une ligne, en français : ce que fait la fonction, et pourquoi DEFINER. */
	justification: string;
}

/** Règles de tag (migration 20261013120000_tags_modeles_points, choix (A) de David, 2026-10-10). */
const REGLES_DE_TAG =
	'validation des règles de tag sur une vue complète ; garde d’appelant (ni prof ni admin : non évalué) ; aucune écriture, aucune donnée renvoyée';

export const DECLENCHEURS_DEFINER_VERIFIES: Record<string, DeclencheurDefinerVerifie> = {
	'question_template_points_check_rules()': { justification: REGLES_DE_TAG },
	'question_templates_guard_point_tags()': { justification: REGLES_DE_TAG },
	'curriculum_points_guard_tags()': { justification: REGLES_DE_TAG },
	'classification_nodes_guard_point_tags()': { justification: REGLES_DE_TAG },
	'exercise_curriculum_points_check_rules()': { justification: REGLES_DE_TAG },
	'exercise_classifications_guard_point_tags()': { justification: REGLES_DE_TAG },
	'dictionary_entries_keep_version()': {
		justification:
			'historique du dictionnaire : seule voie d’écriture des versions (plus d’INSERT direct) ; garde d’appelant admin ; auteur = auth.uid()'
	}
};
