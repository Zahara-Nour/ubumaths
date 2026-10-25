/**
 * Account Data Export API Endpoint
 * =================================
 *
 * GDPR Article 20 compliant data portability.
 *
 * GET /api/account/export
 *
 * Security:
 * - Requires authentication
 * - Rate limited: 1 request per hour per user
 * - Does NOT export sensitive tokens (Google OAuth)
 *
 * Returns:
 * - JSON object containing all user's personal data
 * - Structured by category for clarity
 * - Includes metadata (export date, data categories)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { rateLimit } from '$lib/server/middleware/rateLimit';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/account/export');

// Rate limit: 1 export per hour per user
const RATE_LIMIT_MAX = 1;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export const GET: RequestHandler = async ({ locals }) => {
	// Step 1: Authenticate user
	const { user } = await requireAuth(locals);
	const userId = user.id;
	const supabase = locals.supabase;

	logger.info('Data export requested', { userId });

	// Step 2: Rate limiting (1 per hour)
	rateLimit(`account_export:${userId}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);

	try {
		// Step 3: Fetch all user data in parallel
		const [
			profileResult,
			skillStateResult,
			competenceLevelResult,
			skillAttemptsResult,
			observableStateResult,
			completionsResult,
			masteryResult,
			flashcardDecksResult,
			messagesResult,
			privateMessagesResult,
			friendshipsResult,
			notificationsResult,
			gamePlayerResult,
			rewardEventsResult,
			classMembershipsResult,
			testSessionsResult,
			tutorConversationsResult,
			mathouxResult,
			mathouDecorationsResult,
			buddyResult,
			lastVisitResult
		] = await Promise.all([
			// Profile data
			supabase.from('profiles').select('*').eq('id', userId).single(),

			// Évaluation — contenus disciplinaires : état acquis par point de programme
			supabase
				.from('student_point_state')
				.select(
					'point_id, is_acquired, total_successes, distinct_template_successes, needs_remediation, last_success_at, last_attempt_at'
				)
				.eq('student_id', userId),

			// Évaluation — référentiel de COMPÉTENCES (famille B) : niveau par compétence transversale
			supabase
				.from('student_competence_level')
				.select(
					'math_competence_id, niveau, validated_observables, missing_for_next, task_count, last_recalc_at'
				)
				.eq('student_id', userId),

			// Évaluation — tentatives évaluées (couche brute commune aux deux référentiels)
			supabase
				.from('skill_attempts')
				.select(
					'observable_id, success, with_help, phase_blocage, grade, template_id, task_id, source, created_at'
				)
				.eq('student_id', userId)
				.order('created_at', { ascending: false })
				.limit(5000),

			// Évaluation — indicateurs observables par capacité
			supabase
				.from('student_observable_state')
				.select('observable_id, count_plus, count_minus, is_acquis, last_attempt_at')
				.eq('student_id', userId),

			// Activité — exercices complétés (≠ évaluation référentielle)
			supabase
				.from('exercise_completions')
				.select('exercise_id, assignment_id, completed_at, last_viewed_at, view_count, created_at')
				.eq('student_id', userId)
				.order('created_at', { ascending: false })
				.limit(2000),

			// Activité — statut de maîtrise par exercice
			supabase
				.from('student_exercise_mastery')
				.select('exercise_id, status, updated_at')
				.eq('student_id', userId),

			// Activité — decks de révision possédés par l'élève (srs_cards n'a pas de propriétaire)
			supabase
				.from('srs_decks')
				.select('id, name, description, deck_type, created_at, updated_at')
				.eq('owner_id', userId),

			// Messages sent
			supabase
				.from('messages')
				.select('id, conversation_id, content, plain_text, created_at')
				.eq('sender_id', userId)
				.order('created_at', { ascending: false })
				.limit(500),

			// Private messages sent
			supabase
				.from('private_messages')
				.select('id, subject, content, plain_text, sent_at')
				.eq('sender_id', userId)
				.order('sent_at', { ascending: false })
				.limit(500),

			// Friendships (both directions)
			supabase
				.from('friendships')
				.select('requester_id, addressee_id, status, friendship_type, created_at')
				.or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),

			// Notifications targeted at this user (model uses target_user_ids[], not user_id)
			supabase
				.from('notifications')
				.select('id, type, title, message, priority, created_at')
				.contains('target_user_ids', [userId])
				.order('created_at', { ascending: false })
				.limit(200),

			// Game player data
			supabase
				.from('game_players')
				.select('level, xp, prestige, total_combats, combats_won, combats_lost, last_played_at')
				.eq('user_id', userId)
				.maybeSingle(),

			// Reward events (unified audit trail: gidouilles, bonus, vip cards, achievements)
			supabase
				.from('reward_events')
				.select('reward_type, event_type, amount, item_name, description, created_at')
				.eq('student_id', userId)
				.order('created_at', { ascending: false })
				.limit(1000),

			// Class memberships
			supabase.from('class_members').select('class_id, status, joined_at').eq('student_id', userId),

			// Activité — sessions automaths et détail des réponses (décision du 2026-09-28)
			supabase
				.from('test_sessions')
				.select(
					'id, mode, categories, score, grade, points_earned, total_questions, time_spent, completed_at, evaluation_id, created_at, test_answers(template_id, question_instance, user_answer, is_correct, points, status, time_spent, attempts, created_at)'
				)
				.eq('user_id', userId)
				.order('created_at', { ascending: false })
				.limit(1000),

			// Tuteur IA : conversations et messages (C12, décision de David du 2026-10-11)
			supabase
				.from('tutor_conversations')
				.select(
					// Inférences sur l'élève comprises (niveau d'aide, triche détectée, effort) : le
					// droit d'accès (art. 15) les couvre.
					'id, exercise_topic, exercise_statement, exercise_correction, started_at, ended_at, message_count, max_help_level_reached, effort_score, topics_covered, created_at, tutor_messages(role, content, help_method_used, help_level, cheat_detected, created_at)'
				)
				.eq('student_id', userId)
				.order('created_at', { ascending: false })
				.limit(1000)
				.limit(5000, { referencedTable: 'tutor_messages' }),

			// Jeux — mémoire des Mathoux (Chatterie) : meilleur stade, étoiles, sieste et
			// décorations portées (panse, cou, yeux, tête) par notion.
			// Une ligne par notion (440 au plus) : sous le plafond de 1 000 lignes.
			supabase
				.from('student_mathoux')
				.select(
					'notion_id, best_stage, starred_grades, asleep, decoration, collar, glasses, hat, first_seen_at, updated_at'
				)
				.eq('student_id', userId),

			// Jeux — décorations achetées dans la Chatterie (panse, colliers, lunettes,
			// chapeaux : vingt au plus)
			supabase
				.from('student_mathou_decorations')
				.select('decoration, price_paid, purchased_at')
				.eq('student_id', userId),

			// Jeux — le Palotin de l'élève (une ligne par élève ; décision de David, 2026-10-18)
			supabase
				.from('student_buddies')
				.select(
					'palotin_type, level, xp, xp_earned_today, last_xp_date, current_streak, longest_streak, last_activity_date, constance_days_this_week, constance_week_start, themes_explored, equipped_skin_id, change_count, created_at, updated_at'
				)
				.eq('student_id', userId)
				.maybeSingle(),

			// Jeux — jour du dernier passage et retour à fêter (Palotin triste au retour,
			// 2026-10-21). Lisibles par le serveur seul (aucune policy) : lus au client
			// service, filtrés sur l'identité de la SESSION.
			createServiceRoleClient()
				.from('student_last_visits')
				.select('last_visit_date, welcome_back_on')
				.eq('student_id', userId)
				.maybeSingle()
		]);

		// Un export RGPD qui annonce « aucune session » sur une panne de lecture
		// serait faux : on échoue plutôt (500, l'élève peut réessayer).
		if (testSessionsResult.error) {
			throw new Error(`test_sessions illisible : ${testSessionsResult.error.message}`);
		}

		// Même règle : un export qui omettrait le tuteur sur une panne serait faux.
		if (tutorConversationsResult.error) {
			throw new Error(`tutor_conversations illisible : ${tutorConversationsResult.error.message}`);
		}

		// Même règle pour la mémoire des Mathoux.
		if (mathouxResult.error) {
			throw new Error(`student_mathoux illisible : ${mathouxResult.error.message}`);
		}

		if (mathouDecorationsResult.error) {
			throw new Error(
				`student_mathou_decorations illisible : ${mathouDecorationsResult.error.message}`
			);
		}

		if (buddyResult.error) {
			throw new Error(`student_buddies illisible : ${buddyResult.error.message}`);
		}

		if (lastVisitResult.error) {
			throw new Error(`student_last_visits illisible : ${lastVisitResult.error.message}`);
		}

		// Step 4: Build export object
		const profile = profileResult.data;
		if (!profile) {
			throw error(404, 'Profil non trouve');
		}

		// Remove sensitive fields from profile
		const sanitizedProfile = {
			id: profile.id,
			email: profile.email,
			firstname: profile.firstname,
			lastname: profile.lastname,
			avatar_url: profile.avatar_url,
			role: profile.role,
			grade: profile.grade,
			gidouilles: profile.gidouilles,
			bonus: profile.bonus,
			vip_cards: profile.vip_cards,
			// Consentement parental et déclaration d'âge (C12, 2026-10-11)
			consent_required: profile.consent_required,
			consent_granted_at: profile.consent_granted_at,
			consent_grace_period_ends: profile.consent_grace_period_ends,
			age_declaration: profile.age_declaration,
			age_declared_at: profile.age_declared_at,
			created_at: profile.created_at,
			updated_at: profile.updated_at
		};

		const exportData = {
			// Metadata
			_metadata: {
				exported_at: new Date().toISOString(),
				user_id: userId,
				format_version: '1.4',
				gdpr_article: 'Article 20 - Droit a la portabilite',
				categories: [
					'profile',
					'evaluation',
					'activite',
					'communications',
					'social',
					'gaming',
					'rewards',
					'classes',
					'tuteur'
				]
			},

			// Profile
			profile: sanitizedProfile,

			// Évaluation référentielle : connaissances (famille A) + compétences (famille B)
			evaluation: {
				connaissances: skillStateResult.data || [],
				competences: competenceLevelResult.data || [],
				tentatives: skillAttemptsResult.data || [],
				observables: observableStateResult.data || []
			},

			// Activité sur les exercices (distincte de l'évaluation référentielle)
			activite: {
				completions: completionsResult.data || [],
				mastery: masteryResult.data || [],
				flashcard_decks: flashcardDecksResult.data || [],
				automaths_sessions: testSessionsResult.data || []
			},

			// Communications
			communications: {
				messages_sent: messagesResult.data || [],
				private_messages_sent: privateMessagesResult.data || [],
				notifications: notificationsResult.data || []
			},

			// Social
			social: {
				friendships: friendshipsResult.data || []
			},

			// Gaming
			gaming: {
				player_stats: gamePlayerResult.data || null,
				mathoux: mathouxResult.data || [],
				mathou_decorations: mathouDecorationsResult.data || [],
				palotin: buddyResult.data || null,
				dernier_passage: lastVisitResult.data?.last_visit_date ?? null,
				retour_a_feter: lastVisitResult.data?.welcome_back_on ?? null
			},

			// Rewards & Economy
			rewards: {
				events: rewardEventsResult.data || []
			},

			// Tuteur IA
			tuteur: {
				conversations: tutorConversationsResult.data || []
			},

			// Classes
			classes: {
				memberships: classMembershipsResult.data || []
			}
		};

		// Step 5: Log successful export
		logger.info('Data export completed', {
			userId,
			categories: exportData._metadata.categories.length,
			completions_count: exportData.activite.completions.length,
			messages_count: exportData.communications.messages_sent.length
		});

		// Return with appropriate headers for download
		return json(exportData, {
			headers: {
				'Content-Disposition': `attachment; filename="chiphre-export-${userId.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.json"`,
				'Cache-Control': 'no-store, no-cache, must-revalidate'
			}
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Data export failed', { userId, error: err });
		throw error(500, "Erreur lors de l'export des donnees");
	}
};
