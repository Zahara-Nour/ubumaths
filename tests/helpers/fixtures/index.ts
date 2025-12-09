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

// ============================================================================
// GAME
// ============================================================================

export {
	// Factories
	createTestPlayer,
	createTestSpell,
	createTestMonster,
	createTestCombat,
	createTestChallenge,

	// Mock client
	createMockSupabaseClient,

	// Random seeding
	seedRandom,
	resetRandom,

	// Collections
	TEST_MONSTERS,
	TEST_CHALLENGES,
	TEST_SPELLS
} from './game';

// ============================================================================
// MARKETPLACE
// ============================================================================

export {
	// Factories
	createTestUser,
	createTestClass,
	createTestCard,
	createTestListing,

	// Mock helpers
	addStudentToClass,
	giveGidouilles,
	mockRPCFunctions,

	// Concurrent testing
	simulateConcurrentOperations,
	testRaceCondition,

	// Assertions
	assertError,
	assertSuccess,

	// Cleanup
	resetMarketplaceCounters,

	// Types
	type TestUser,
	type TestClass,
	type TestCard,
	type TestListing
} from './marketplace';
