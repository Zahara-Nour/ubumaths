// Avatar image imports - using neutral avatars per role (GDPR: removed gender-based selection)
import avatarAdmin from '$lib/assets/images/avatars/avatar-admin.jpg';
import avatarStudent from '$lib/assets/images/avatars/avatar-student-boy.jpg';
import avatarTeacher from '$lib/assets/images/avatars/avatar-teacher-boy.jpg';

/** User role type for avatar selection */
export type UserRole = 'student' | 'teacher' | 'admin';

/**
 * Get the appropriate fallback avatar image based on user's role
 *
 * GDPR Compliance: Gender field removed to minimize personal data collection on minors.
 * Now uses neutral role-based avatars only.
 *
 * @param role - User's role (student, teacher, admin)
 * @returns Path to the appropriate avatar image
 */
export function getAvatarFallback(role: UserRole): string {
	switch (role) {
		case 'admin':
			return avatarAdmin;
		case 'teacher':
			return avatarTeacher;
		case 'student':
		default:
			return avatarStudent;
	}
}

/**
 * Generate avatar initials from user's first and last name
 *
 * @param firstname - User's first name
 * @param lastname - User's last name
 * @returns Two uppercase letters (first + last) or '?' if no name available
 */
export function getAvatarInitials(firstname: string | null, lastname: string | null): string {
	const first = firstname?.charAt(0)?.toUpperCase() || '';
	const last = lastname?.charAt(0)?.toUpperCase() || '';
	return first + last || '?';
}

/**
 * Get user avatar URL with multi-level fallback strategy
 *
 * PRIORITY ORDER:
 * 1. profile.avatar_url - Stored in database (primary source, saved on login)
 * 2. user.user_metadata.picture - Google OAuth session data (Google's standard field)
 * 3. user.user_metadata.avatar_url - Other OAuth providers (fallback field)
 * 4. Role-based default avatar - Static fallback images based on user role
 * 5. Empty string - Triggers Avatar.Fallback to show initials
 *
 * IMPORTANT: Google OAuth stores avatars in 'picture' field, not 'avatar_url'
 * See: src/routes/(public)/auth/callback/+server.ts for avatar saving logic
 * See: supabase/migrations/061_fix_google_avatar_picture_field.sql for database trigger
 *
 * GDPR: Gender field removed - now uses role-only fallback
 *
 * @param profile - User profile with avatar_url and role
 * @param user - Optional Supabase user object with OAuth metadata
 * @returns Avatar URL string or empty string for fallback to initials
 */
export function getAvatarUrl(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	profile: Record<string, any> & {
		avatar_url?: string | null;
		role?: string | null;
	},
	user?: {
		user_metadata?: {
			picture?: string;
			avatar_url?: string;
		};
	}
): string {
	// 1. Database stored avatar
	if (profile.avatar_url) {
		return profile.avatar_url;
	}

	// 2. Google OAuth 'picture' field (CRITICAL FALLBACK)
	if (user?.user_metadata?.picture) {
		return user.user_metadata.picture;
	}

	// 3. Other OAuth providers 'avatar_url' field
	if (user?.user_metadata?.avatar_url) {
		return user.user_metadata.avatar_url;
	}

	// 4. Role-based default avatar
	if (profile.role) {
		return getAvatarFallback(profile.role as UserRole);
	}

	// 5. Empty string (triggers Avatar.Fallback for initials)
	return '';
}
