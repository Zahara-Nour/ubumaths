/**
 * Test Fixtures - Barrel Export
 * =============================
 *
 * Central export point for all test fixtures.
 * Import from this file to access mock data for tests.
 *
 * @example
 * ```typescript
 * import {
 *   mockIds,
 *   mockProfiles,
 *   createMockProfile,
 *   createMockStudent,
 *   createMockTeacher
 * } from 'tests/helpers/fixtures';
 *
 * describe('Profile tests', () => {
 *   it('should use mock profile', () => {
 *     const student = createMockStudent({ firstname: 'Alice' });
 *     expect(student.role).toBe('student');
 *   });
 * });
 * ```
 */

// ============================================================================
// PROFILES
// ============================================================================

export {
	// Constants
	mockIds,
	mockProfiles,
	mockEmailDomains,

	// Factories
	createMockProfile,
	createMockStudent,
	createMockTeacher,
	createMockAdmin,
	createMockTestUser,

	// Collections
	createMockStudents,
	createMockClassRoster,

	// Utilities
	createMockEmail,
	resetProfileIdCounter,

	// Types
	type ProfileRole,
	type Profile
} from './profiles';
