import avatarAdmin from '$lib/assets/images/avatars/avatar-admin.jpg';
import avatarStudent from '$lib/assets/images/avatars/avatar-student-boy.jpg';
import avatarTeacher from '$lib/assets/images/avatars/avatar-teacher-boy.jpg';

export type UserRole = 'student' | 'teacher' | 'admin';

/** Role-based default avatar image (GDPR: no gender, role only) */
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

/** Two-letter initials from first/last name, or '?' if unavailable */
export function getAvatarInitials(firstname: string | null, lastname: string | null): string {
	const first = firstname?.charAt(0)?.toUpperCase() || '';
	const last = lastname?.charAt(0)?.toUpperCase() || '';
	return first + last || '?';
}
