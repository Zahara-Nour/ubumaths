import type { Gender, UserRole } from '$lib/types/database';

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
		return gender === 'F' ? avatarStudentGirl : avatarStudentBoy;
	}

	if (role === 'teacher') {
		return gender === 'F' ? avatarTeacherGirl : avatarTeacherBoy;
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
