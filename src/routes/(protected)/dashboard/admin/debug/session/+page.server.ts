/**
 * Session Debug Page - Server Load Function
 *
 * PURPOSE:
 * Inspect current user's session and authentication state for debugging.
 *
 * FEATURES:
 * - Session metadata (expiry, provider, refresh info)
 * - User metadata from OAuth
 * - Profile data comparison
 * - Auth provider details
 *
 * ACCESS CONTROL:
 * - Admin only
 *
 * PRIVACY:
 * - Access tokens and refresh tokens are redacted
 * - Email addresses are partially redacted
 */
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Redact sensitive token data
 * Shows first 8 characters + "..."
 */
function redactToken(token: string | null | undefined): string {
	if (!token) return '(none)';
	if (token.length <= 12) return '***';
	return token.substring(0, 8) + '...';
}

/**
 * Redact email address for privacy
 * Example: john.doe@example.com → joh***@example.com
 */
function redactEmail(email: string | null): string {
	if (!email) return '(no email)';
	const [local, domain] = email.split('@');
	if (!domain) return email.substring(0, 3) + '***';
	return local.substring(0, 3) + '***@' + domain;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession }, parent }) => { // supabase for future queries
	const { session, user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const { profile } = await parent();

	if (profile.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	// Build session metadata (with redacted tokens)
	const sessionMetadata = session
		? {
				access_token: redactToken(session.access_token),
				refresh_token: redactToken(session.refresh_token),
				expires_at: session.expires_at,
				expires_in: session.expires_in,
				token_type: session.token_type,
				provider_token: redactToken(session.provider_token),
				provider_refresh_token: redactToken(session.provider_refresh_token)
			}
		: null;

	// User metadata (safe to show most fields)
	const userMetadata = user.user_metadata
		? {
				email: redactEmail(user.user_metadata.email),
				email_verified: user.user_metadata.email_verified,
				phone_verified: user.user_metadata.phone_verified,
				sub: user.user_metadata.sub,
				full_name: user.user_metadata.full_name,
				avatar_url: user.user_metadata.avatar_url,
				picture: user.user_metadata.picture,
				given_name: user.user_metadata.given_name,
				family_name: user.user_metadata.family_name,
				provider_id: user.user_metadata.provider_id,
				iss: user.user_metadata.iss
			}
		: null;

	// Profile data (from database)
	const profileData = {
		id: profile.id,
		email: redactEmail(profile.email),
		firstname: profile.firstname,
		lastname: profile.lastname,
		full_name: profile.full_name,
		role: profile.role,
		school_id: profile.school_id,
		avatar_url: profile.avatar_url,
		class_ids: profile.class_ids,
		grade: profile.grade,
		gender: profile.gender,
		created_at: profile.created_at,
		updated_at: profile.updated_at
	};

	// Auth provider information
	const authProvider = {
		provider: user.app_metadata?.provider || 'unknown',
		providers: user.app_metadata?.providers || [],
		role: user.role
	};

	// Timestamp info
	const now = Date.now();
	const expiresAt = session?.expires_at ? session.expires_at * 1000 : null;
	const timeUntilExpiry = expiresAt ? expiresAt - now : null;

	return {
		sessionMetadata,
		userMetadata,
		profileData,
		authProvider,
		expiryInfo: {
			expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
			timeUntilExpiry: timeUntilExpiry ? Math.floor(timeUntilExpiry / 1000 / 60) : null, // minutes
			isExpired: timeUntilExpiry ? timeUntilExpiry < 0 : null
		}
	};
};
