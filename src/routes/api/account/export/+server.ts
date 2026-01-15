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
			studentAttemptsResult,
			studentProgressResult,
			assignmentSubmissionsResult,
			messagesResult,
			privateMessagesResult,
			friendshipsResult,
			notificationsResult,
			gamePlayerResult,
			inventoryResult,
			gidouillesHistoryResult,
			bonusHistoryResult,
			shopPurchasesResult,
			classMembershipsResult,
			srsCardsResult
		] = await Promise.all([
			// Profile data
			supabase.from('profiles').select('*').eq('id', userId).single(),

			// Learning data - student attempts (limit to recent 1000)
			supabase
				.from('student_attempts')
				.select(
					'question_id, submitted_answer, is_correct, time_spent_seconds, hints_used, created_at'
				)
				.eq('student_id', userId)
				.order('created_at', { ascending: false })
				.limit(1000),

			// Learning data - progress
			supabase
				.from('student_progress')
				.select(
					'topic_id, mastery_level, exercises_completed, correct_answers, total_points, streak, last_practice_at'
				)
				.eq('student_id', userId),

			// Assignment submissions
			supabase
				.from('assignment_submissions')
				.select('assignment_id, completion_percentage, score, submitted_at, graded_at')
				.eq('student_id', userId),

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
				.select('id, recipient_id, content, created_at')
				.eq('sender_id', userId)
				.order('created_at', { ascending: false })
				.limit(500),

			// Friendships (both directions)
			supabase
				.from('friendships')
				.select('requester_id, addressee_id, status, created_at')
				.or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),

			// Notifications
			supabase
				.from('notifications')
				.select('id, type, title, message, read, created_at')
				.eq('user_id', userId)
				.order('created_at', { ascending: false })
				.limit(200),

			// Game player data
			supabase
				.from('game_players')
				.select('level, xp, coins, total_combats, wins, losses, last_played_at')
				.eq('user_id', userId)
				.maybeSingle(),

			// Inventory
			supabase
				.from('student_item_inventory')
				.select('item_id, quantity, acquired_at')
				.eq('student_id', userId),

			// Gidouilles history (rewards)
			supabase
				.from('gidouilles_history')
				.select('amount, reason, created_at')
				.eq('student_id', userId)
				.order('created_at', { ascending: false })
				.limit(500),

			// Bonus history
			supabase
				.from('bonus_history')
				.select('amount, reason, created_at')
				.eq('student_id', userId)
				.order('created_at', { ascending: false })
				.limit(500),

			// Shop purchases
			supabase
				.from('shop_purchase_history')
				.select('item_id, quantity, price_paid, purchased_at')
				.eq('student_id', userId)
				.order('purchased_at', { ascending: false })
				.limit(200),

			// Class memberships
			supabase.from('class_members').select('class_id, joined_at').eq('student_id', userId),

			// SRS flashcard data
			supabase
				.from('srs_cards')
				.select('deck_id, front, back, ease_factor, interval, repetitions, next_review, created_at')
				.eq('user_id', userId)
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
				format_version: '1.0',
				gdpr_article: 'Article 20 - Droit a la portabilite',
				categories: [
					'profile',
					'learning',
					'communications',
					'social',
					'gaming',
					'rewards',
					'classes'
				]
			},

			// Profile
			profile: sanitizedProfile,

			// Learning data
			learning: {
				attempts: studentAttemptsResult.data || [],
				progress: studentProgressResult.data || [],
				submissions: assignmentSubmissionsResult.data || [],
				flashcards: srsCardsResult.data || []
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
				inventory: inventoryResult.data || [],
				gidouilles_history: gidouillesHistoryResult.data || [],
				bonus_history: bonusHistoryResult.data || [],
				purchases: shopPurchasesResult.data || []
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
			attempts_count: exportData.learning.attempts.length,
			messages_count: exportData.communications.messages_sent.length
		});

		// Return with appropriate headers for download
		return json(exportData, {
			headers: {
				'Content-Disposition': `attachment; filename="ubumaths-export-${userId.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.json"`,
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
