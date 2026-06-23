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
			classMembershipsResult
		] = await Promise.all([
			// Profile data
			supabase.from('profiles').select('*').eq('id', userId).single(),

			// Évaluation — référentiel de CONNAISSANCES (famille A) : état acquis par capacité
			supabase
				.from('student_skill_state_a')
				.select(
					'skill_id, is_acquired, total_successes, distinct_template_successes, needs_remediation, last_success_at, last_attempt_at'
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
					'skill_id, success, with_help, phase_blocage, grade, template_id, task_id, source, created_at'
				)
				.eq('student_id', userId)
				.order('created_at', { ascending: false })
				.limit(5000),

			// Évaluation — indicateurs observables par capacité
			supabase
				.from('student_observable_state')
				.select('skill_id, count_plus, count_minus, is_acquis, last_attempt_at')
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
			supabase.from('class_members').select('class_id, status, joined_at').eq('student_id', userId)
		]);

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
			created_at: profile.created_at,
			updated_at: profile.updated_at
		};

		const exportData = {
			// Metadata
			_metadata: {
				exported_at: new Date().toISOString(),
				user_id: userId,
				format_version: '1.2',
				gdpr_article: 'Article 20 - Droit a la portabilite',
				categories: [
					'profile',
					'evaluation',
					'activite',
					'communications',
					'social',
					'gaming',
					'rewards',
					'classes'
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
				flashcard_decks: flashcardDecksResult.data || []
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
				player_stats: gamePlayerResult.data || null
			},

			// Rewards & Economy
			rewards: {
				events: rewardEventsResult.data || []
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
