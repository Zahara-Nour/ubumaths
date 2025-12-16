import type { Gender, UserRole } from '$lib/types/database';

export type { Gender };

// Avatar image imports
import avatarAdmin from '$lib/assets/images/avatars/avatar-admin.jpg';
import avatarStudentBoy from '$lib/assets/images/avatars/avatar-student-boy.jpg';
import avatarStudentGirl from '$lib/assets/images/avatars/avatar-student-girl.jpg';
import avatarTeacherBoy from '$lib/assets/images/avatars/avatar-teacher-boy.jpg';
import avatarTeacherGirl from '$lib/assets/images/avatars/avatar-teacher-girl.jpg';

/**
 * Get the appropriate fallback avatar image based on user's role and gender
 *
 * @param role - User's role (student, teacher, admin)
 * @param gender - User's gender (boy, girl, or null)
 * @returns Path to the appropriate avatar image
 */
export function getAvatarFallback(role: UserRole, gender: Gender | null): string {
	// Admin always gets the admin avatar
	if (role === 'admin') {
		return avatarAdmin;
	}

	// For students and teachers, use gender-specific avatars
	if (role === 'student') {
		return gender === 'female' ? avatarStudentGirl : avatarStudentBoy;
	}

	if (role === 'teacher') {
		return gender === 'female' ? avatarTeacherGirl : avatarTeacherBoy;
	}

	// Fallback to student boy if role is unknown
	return avatarStudentBoy;
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
 * 4. Role/gender-based default avatar - Static fallback images based on user role and gender
 * 5. Empty string - Triggers Avatar.Fallback to show initials
 *
 * IMPORTANT: Google OAuth stores avatars in 'picture' field, not 'avatar_url'
 * See: src/routes/(public)/auth/callback/+server.ts for avatar saving logic
 * See: supabase/migrations/061_fix_google_avatar_picture_field.sql for database trigger
 *
 * @param profile - User profile with avatar_url, role, and gender
 * @param user - Optional Supabase user object with OAuth metadata
 * @returns Avatar URL string or empty string for fallback to initials
 */
export function getAvatarUrl(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	profile: Record<string, any> & {
		avatar_url?: string | null;
		role?: string | null;
		gender?: string | null;
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

	// 4. Role/gender-based default avatar
	// Cast to expected types - runtime validation done by getAvatarFallback
	if (profile.role && profile.gender !== undefined) {
		return getAvatarFallback(profile.role as UserRole, profile.gender as Gender | null);
	}

	// 5. Empty string (triggers Avatar.Fallback for initials)
	return '';
}
