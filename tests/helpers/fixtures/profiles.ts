/**
 * Profile Test Fixtures
 * =====================
 *
 * Common mock IDs and profile data for testing.
 * Extracted from the original supabase-helpers.ts for reusability.
 *
 * @example
 * ```typescript
 * import { mockIds, mockProfiles, createMockProfile } from 'tests/helpers/fixtures';
 *
 * // Use predefined IDs
 * const teacherId = mockIds.teacher;
 *
 * // Use predefined profiles
 * const studentProfile = mockProfiles.student;
 *
 * // Create custom profile
 * const customProfile = createMockProfile({
 *   id: 'custom-id',
 *   firstname: 'Alice',
 *   role: 'student'
 * });
 * ```
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** User role type */
export type ProfileRole = 'student' | 'teacher' | 'admin';

/**
 * Profile interface matching the profiles table structure
 */
export interface Profile {
	id: string;
	role: ProfileRole;
	firstname: string;
	lastname: string;
	email: string;
	is_test: boolean;
	avatar_url?: string | null;
	gidouilles?: number;
	created_at?: string;
	updated_at?: string;
}

// ============================================================================
// MOCK IDS
// ============================================================================

/**
 * Common mock IDs for consistent testing.
 * Use these IDs across tests for consistency and easier debugging.
 */
export const mockIds = {
	// Users
	teacher: 'teacher-123',
	teacher2: 'teacher-456',
	student: 'student-456',
	student2: 'student-789',
	student3: 'student-abc',
	admin: 'admin-001',

	// Classes
	class: 'class-abc',
	class2: 'class-def',

	// Academic
	assessment: 'assessment-xyz',
	assignment: 'assignment-def',
	exercise: 'exercise-ghi',

	// Communication
	riddle: 'riddle-jkl',
	message: 'message-mno',
	message2: 'message-pqr',
	draft: 'draft-001',
	template: 'template-001',

	// School
	school: 'school-001',
	schoolYear: 'school-year-001',

	// Marketplace
	listing: 'listing-001',
	card: 'card-001',
	trade: 'trade-001',

	// Game
	player: 'player-001',
	monster: 'monster-001',
	combat: 'combat-001',
	spell: 'spell-001'
} as const;

// ============================================================================
// MOCK PROFILES
// ============================================================================

/**
 * Predefined mock profiles for common test scenarios.
 * These profiles represent typical users in the system.
 */
export const mockProfiles: Record<string, Profile> = {
	teacher: {
		id: mockIds.teacher,
		role: 'teacher',
		firstname: 'John',
		lastname: 'Doe',
		email: 'teacher@voltairedoha.com',
		is_test: false,
		gidouilles: 0
	},
	teacher2: {
		id: mockIds.teacher2,
		role: 'teacher',
		firstname: 'Jane',
		lastname: 'Smith',
		email: 'teacher2@voltairedoha.com',
		is_test: false,
		gidouilles: 0
	},
	student: {
		id: mockIds.student,
		role: 'student',
		firstname: 'Alice',
		lastname: 'Martin',
		email: 'student@voltairedoha.com',
		is_test: false,
		gidouilles: 100
	},
	student2: {
		id: mockIds.student2,
		role: 'student',
		firstname: 'Bob',
		lastname: 'Wilson',
		email: 'student2@voltairedoha.com',
		is_test: false,
		gidouilles: 50
	},
	student3: {
		id: mockIds.student3,
		role: 'student',
		firstname: 'Charlie',
		lastname: 'Brown',
		email: 'student3@voltairedoha.com',
		is_test: false,
		gidouilles: 75
	},
	admin: {
		id: mockIds.admin,
		role: 'admin',
		firstname: 'Admin',
		lastname: 'User',
		email: 'admin@voltairedoha.com',
		is_test: false,
		gidouilles: 0
	},
	testStudent: {
		id: 'test-student',
		role: 'student',
		firstname: 'Test',
		lastname: 'User',
		email: 'test@voltairedoha.com',
		is_test: true,
		gidouilles: 1000
	},
	testTeacher: {
		id: 'test-teacher',
		role: 'teacher',
		firstname: 'Test',
		lastname: 'Teacher',
		email: 'test-teacher@voltairedoha.com',
		is_test: true,
		gidouilles: 0
	}
};

// ============================================================================
// PROFILE FACTORY
// ============================================================================

/**
 * Counter for generating unique IDs
 */
let profileIdCounter = 1;

/**
 * Reset the profile ID counter (useful in beforeEach)
 */
export function resetProfileIdCounter(): void {
	profileIdCounter = 1;
}

/**
 * Create a mock profile with custom fields.
 *
 * @param overrides - Partial profile data to merge with defaults
 * @returns Complete profile object
 *
 * @example
 * ```typescript
 * // Create with defaults
 * const profile = createMockProfile();
 *
 * // Create with custom fields
 * const customProfile = createMockProfile({
 *   firstname: 'Alice',
 *   lastname: 'Smith',
 *   role: 'teacher'
 * });
 *
 * // Create with specific ID
 * const specificProfile = createMockProfile({
 *   id: 'my-specific-id'
 * });
 * ```
 */
export function createMockProfile(overrides: Partial<Profile> = {}): Profile {
	const currentId = profileIdCounter++;
	const id = overrides.id ?? `profile-${currentId}`;
	const role = overrides.role ?? 'student';

	return {
		id,
		role,
		firstname: overrides.firstname ?? 'Test',
		lastname: overrides.lastname ?? 'User',
		email: overrides.email ?? `${role}${currentId}@voltairedoha.com`,
		is_test: overrides.is_test ?? false,
		gidouilles: overrides.gidouilles ?? (role === 'student' ? 100 : 0),
		avatar_url: overrides.avatar_url ?? null,
		created_at: overrides.created_at ?? new Date().toISOString(),
		updated_at: overrides.updated_at ?? new Date().toISOString()
	};
}

/**
 * Create a mock student profile.
 *
 * @param overrides - Partial profile data
 */
export function createMockStudent(overrides: Partial<Omit<Profile, 'role'>> = {}): Profile {
	return createMockProfile({ ...overrides, role: 'student' });
}

/**
 * Create a mock teacher profile.
 *
 * @param overrides - Partial profile data
 */
export function createMockTeacher(overrides: Partial<Omit<Profile, 'role'>> = {}): Profile {
	return createMockProfile({ ...overrides, role: 'teacher' });
}

/**
 * Create a mock admin profile.
 *
 * @param overrides - Partial profile data
 */
export function createMockAdmin(overrides: Partial<Omit<Profile, 'role'>> = {}): Profile {
	return createMockProfile({ ...overrides, role: 'admin' });
}

/**
 * Create a mock test user profile (is_test: true).
 *
 * @param role - User role
 * @param overrides - Partial profile data
 */
export function createMockTestUser(
	role: ProfileRole = 'student',
	overrides: Partial<Profile> = {}
): Profile {
	return createMockProfile({
		...overrides,
		role,
		is_test: true,
		gidouilles: role === 'student' ? 1000 : 0
	});
}

// ============================================================================
// PROFILE COLLECTIONS
// ============================================================================

/**
 * Create a collection of mock students.
 *
 * @param count - Number of students to create
 * @param baseOverrides - Base overrides to apply to all students
 */
export function createMockStudents(
	count: number,
	baseOverrides: Partial<Omit<Profile, 'role' | 'id'>> = {}
): Profile[] {
	return Array.from({ length: count }, (_, index) =>
		createMockStudent({
			...baseOverrides,
			firstname: baseOverrides.firstname ?? `Student${index + 1}`,
			lastname: baseOverrides.lastname ?? `LastName${index + 1}`
		})
	);
}

/**
 * Create a class roster with teacher and students.
 *
 * @param studentCount - Number of students
 * @param teacherOverrides - Optional teacher profile overrides
 */
export function createMockClassRoster(
	studentCount: number,
	teacherOverrides: Partial<Omit<Profile, 'role'>> = {}
): { teacher: Profile; students: Profile[] } {
	const teacher = createMockTeacher(teacherOverrides);
	const students = createMockStudents(studentCount);

	return { teacher, students };
}

// ============================================================================
// MOCK EMAILS
// ============================================================================

/**
 * Common email domains used in tests
 */
export const mockEmailDomains = {
	school: 'voltairedoha.com',
	test: 'test.com',
	example: 'example.com'
} as const;

/**
 * Generate a mock email address.
 *
 * @param username - Username part of email
 * @param domain - Domain (default: voltairedoha.com)
 */
export function createMockEmail(
	username: string,
	domain: string = mockEmailDomains.school
): string {
	return `${username}@${domain}`;
}
