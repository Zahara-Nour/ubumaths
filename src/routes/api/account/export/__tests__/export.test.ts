/**
 * Account Data Export API Tests
 * ==============================
 *
 * Tests for GDPR Art. 20 compliant data export.
 *
 * Tests cover:
 * - Authentication requirement
 * - Rate limiting (1 per hour)
 * - Data structure validation
 * - All data categories included
 * - Sensitive data exclusion
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { GET } from '../+server';

// ============================================================================
// MOCKS
// ============================================================================

const TEST_USER = { id: 'user-123', email: 'test@example.com' };

// Mock Supabase client
let mockSupabase: {
	from: ReturnType<typeof vi.fn>;
};

// Mock rate limiter
let mockRateLimitFn: ReturnType<typeof vi.fn>;

// Mock logger
vi.mock('$lib/utils/logger', () => ({
	createServerLogger: () => ({
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
		trace: vi.fn()
	})
}));

// Mock auth middleware
vi.mock('$lib/server/middleware/auth', () => ({
	requireAuth: vi.fn().mockResolvedValue({
		user: { id: 'user-123', email: 'test@example.com' }
	})
}));

// Mock rate limiter
vi.mock('$lib/server/middleware/rateLimit', () => ({
	rateLimit: vi.fn()
}));

import * as rateLimit from '$lib/server/middleware/rateLimit';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockProfile = {
	id: 'user-123',
	email: 'test@example.com',
	firstname: 'John',
	lastname: 'Doe',
	avatar_url: null,
	role: 'student',
	grade: '6eme',
	gidouilles: 100,
	bonus: 50,
	vip_cards: 2,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-06-01T00:00:00Z'
};

// Pedagogical data now lives in `exercise_completions` (renamed from the old
// `student_attempts`, which no longer exists in the schema).
const mockCompletions = [
	{
		exercise_id: 'ex1',
		assignment_id: null,
		completed_at: '2024-06-01T10:00:00Z',
		last_viewed_at: '2024-06-01T10:00:00Z',
		view_count: 1,
		created_at: '2024-06-01T10:00:00Z'
	}
];

// ============================================================================
// HELPERS
// ============================================================================

function createMockEvent() {
	return {
		locals: {
			supabase: mockSupabase,
			user: TEST_USER
		}
	};
}

/**
 * Creates a flexible chainable mock that handles all query patterns:
 * - .select().eq().single() -> for profiles
 * - .select().eq().order().limit() -> for student_attempts, messages, etc.
 * - .select().eq().maybeSingle() -> for game_players
 * - .select().eq() -> for student_progress, inventory, etc.
 * - .select().or() -> for friendships
 */
function setupMockSupabase() {
	// Create a thenable that resolves to { data, error: null }
	const createThenable = (data: unknown) => ({
		then: (resolve: (value: { data: unknown; error: null }) => void) => {
			return Promise.resolve(resolve({ data, error: null }));
		}
	});

	mockSupabase = {
		from: vi.fn((table: string) => {
			// Determine the data for this table
			const getData = () => {
				switch (table) {
					case 'profiles':
						return mockProfile;
					case 'exercise_completions':
						return mockCompletions;
					case 'game_players':
						return null; // maybeSingle returns null if no data
					default:
						return [];
				}
			};

			const data = getData();

			// Create chain that works for all patterns
			const terminalResult = createThenable(data);

			// Methods that can be terminal
			const limitFn = vi.fn().mockReturnValue(terminalResult);
			const singleFn = vi.fn().mockReturnValue(terminalResult);
			const maybeSingleFn = vi.fn().mockReturnValue(terminalResult);
			const orFn = vi.fn().mockReturnValue(terminalResult);

			// order() returns something with limit()
			const orderFn = vi.fn().mockReturnValue({
				limit: limitFn,
				...terminalResult
			});

			// contains() (array filter, e.g. notifications.target_user_ids) → order/limit
			const containsFn = vi.fn().mockReturnValue({
				order: orderFn,
				limit: limitFn,
				...terminalResult
			});

			// eq() can be terminal or chained with order/single/maybeSingle
			const eqFn = vi.fn().mockReturnValue({
				order: orderFn,
				limit: limitFn,
				single: singleFn,
				maybeSingle: maybeSingleFn,
				...terminalResult
			});

			// select() returns something with eq/or/contains
			const selectFn = vi.fn().mockReturnValue({
				eq: eqFn,
				or: orFn,
				contains: containsFn,
				...terminalResult
			});

			return {
				select: selectFn
			};
		})
	};

	return mockSupabase;
}

// ============================================================================
// TESTS
// ============================================================================

describe('GET /api/account/export', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRateLimitFn = vi.mocked(rateLimit.rateLimit);
		mockRateLimitFn.mockImplementation(() => {});
		setupMockSupabase();
	});

	// =========================================================================
	// RATE LIMITING TESTS
	// =========================================================================

	describe('Rate Limiting', () => {
		test('applies rate limit of 1 per hour', async () => {
			const event = createMockEvent();

			await GET(event as never);

			expect(mockRateLimitFn).toHaveBeenCalledWith(
				`account_export:${TEST_USER.id}`,
				1, // 1 attempt
				60 * 60 * 1000 // 1 hour in ms
			);
		});

		test('returns 429 when rate limited', async () => {
			mockRateLimitFn.mockImplementation(() => {
				const error = new Error('Rate limited') as Error & { status?: number };
				error.status = 429;
				throw error;
			});

			const event = createMockEvent();

			await expect(GET(event as never)).rejects.toMatchObject({
				status: 429
			});
		});
	});

	// =========================================================================
	// RESPONSE STRUCTURE TESTS
	// =========================================================================

	describe('Response Structure', () => {
		test('returns JSON with correct content-type', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);

			expect(response.headers.get('Content-Type')).toContain('application/json');
		});

		test('includes Content-Disposition header for download', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);

			const contentDisposition = response.headers.get('Content-Disposition');
			expect(contentDisposition).toContain('attachment');
			expect(contentDisposition).toContain('chiphre-export');
			expect(contentDisposition).toContain('.json');
		});

		test('includes no-cache headers', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);

			expect(response.headers.get('Cache-Control')).toContain('no-store');
		});

		test('includes metadata section', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);
			const data = await response.json();

			expect(data._metadata).toBeDefined();
			expect(data._metadata.exported_at).toBeDefined();
			expect(data._metadata.user_id).toBe(TEST_USER.id);
			expect(data._metadata.format_version).toBe('1.2');
			expect(data._metadata.gdpr_article).toContain('Article 20');
		});

		test('includes all data categories', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);
			const data = await response.json();

			// Check all categories exist
			expect(data.profile).toBeDefined();
			expect(data.evaluation).toBeDefined();
			expect(data.activite).toBeDefined();
			expect(data.communications).toBeDefined();
			expect(data.social).toBeDefined();
			expect(data.gaming).toBeDefined();
			expect(data.rewards).toBeDefined();
			expect(data.classes).toBeDefined();
		});
	});

	// =========================================================================
	// DATA CONTENT TESTS
	// =========================================================================

	describe('Data Content', () => {
		test('includes profile data', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);
			const data = await response.json();

			expect(data.profile.id).toBe(TEST_USER.id);
			expect(data.profile.email).toBe('test@example.com');
			expect(data.profile.firstname).toBeDefined();
		});

		test('evaluation and activite sections have correct structure', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);
			const data = await response.json();

			// Évaluation référentielle (connaissances famille A + compétences famille B)
			expect(data.evaluation.connaissances).toBeDefined();
			expect(data.evaluation.competences).toBeDefined();
			expect(data.evaluation.tentatives).toBeDefined();
			expect(data.evaluation.observables).toBeDefined();
			// Activité exercices (section distincte de l'évaluation)
			expect(data.activite.completions).toBeDefined();
			expect(data.activite.mastery).toBeDefined();
			expect(data.activite.flashcard_decks).toBeDefined();
		});

		test('communications section has correct structure', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);
			const data = await response.json();

			expect(data.communications.messages_sent).toBeDefined();
			expect(data.communications.private_messages_sent).toBeDefined();
			expect(data.communications.notifications).toBeDefined();
		});

		test('rewards section has correct structure', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);
			const data = await response.json();

			// Rewards data was unified into the `reward_events` table; the old
			// inventory / gidouilles_history / bonus_history / purchases tables were
			// dropped and the export now reads `reward_events` (f97abdb00).
			expect(data.rewards.events).toBeDefined();
		});
	});

	// =========================================================================
	// SECURITY TESTS
	// =========================================================================

	describe('Security', () => {
		test('does not include sensitive OAuth tokens', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);
			const data = await response.json();
			const jsonString = JSON.stringify(data);

			// Should not contain token-related fields
			expect(jsonString).not.toContain('access_token');
			expect(jsonString).not.toContain('refresh_token');
			expect(jsonString).not.toContain('google_integrations');
		});

		test('profile does not include internal fields', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);
			const data = await response.json();

			// Check that certain internal fields are not exposed
			// (these would depend on your actual schema)
			expect(data.profile).not.toHaveProperty('password_hash');
			expect(data.profile).not.toHaveProperty('is_test');
		});
	});

	// =========================================================================
	// DATA QUERIES TESTS
	// =========================================================================

	describe('Data Queries', () => {
		test('queries all required tables', async () => {
			const event = createMockEvent();

			await GET(event as never);

			// Verify that from() was called with expected tables
			const fromCalls = mockSupabase.from.mock.calls.map((call) => call[0]);

			expect(fromCalls).toContain('profiles');
			// Évaluation référentielle (connaissances famille A + compétences famille B)
			expect(fromCalls).toContain('student_point_state');
			expect(fromCalls).toContain('student_competence_level');
			expect(fromCalls).toContain('skill_attempts');
			expect(fromCalls).toContain('student_observable_state');
			// Activité exercices
			expect(fromCalls).toContain('exercise_completions');
			expect(fromCalls).toContain('student_exercise_mastery');
			expect(fromCalls).toContain('srs_decks');
			expect(fromCalls).toContain('messages');
			expect(fromCalls).toContain('friendships');
			expect(fromCalls).toContain('notifications');
		});

		test('never queries tables removed/renamed by schema drift', async () => {
			const event = createMockEvent();

			await GET(event as never);

			const fromCalls = mockSupabase.from.mock.calls.map((call) => call[0]);
			// These tables no longer exist in the current schema — querying them
			// silently returned empty data (the bug this fix closes).
			for (const dead of [
				'student_attempts',
				'student_progress',
				'assignment_submissions',
				'srs_cards'
			]) {
				expect(fromCalls).not.toContain(dead);
			}
		});
	});
});
