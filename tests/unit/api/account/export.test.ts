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
import { GET } from '../../../../src/routes/api/account/export/+server';

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

const mockAttempts = [
	{
		question_id: 'q1',
		submitted_answer: '42',
		is_correct: true,
		time_spent_seconds: 30,
		hints_used: 0,
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
					case 'student_attempts':
						return mockAttempts;
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

			// eq() can be terminal or chained with order/single/maybeSingle
			const eqFn = vi.fn().mockReturnValue({
				order: orderFn,
				limit: limitFn,
				single: singleFn,
				maybeSingle: maybeSingleFn,
				...terminalResult
			});

			// select() returns something with eq/or
			const selectFn = vi.fn().mockReturnValue({
				eq: eqFn,
				or: orFn,
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
			expect(contentDisposition).toContain('ubumaths-export');
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
			expect(data._metadata.format_version).toBe('1.0');
			expect(data._metadata.gdpr_article).toContain('Article 20');
		});

		test('includes all data categories', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);
			const data = await response.json();

			// Check all categories exist
			expect(data.profile).toBeDefined();
			expect(data.learning).toBeDefined();
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

		test('learning section has correct structure', async () => {
			const event = createMockEvent();

			const response = await GET(event as never);
			const data = await response.json();

			expect(data.learning.attempts).toBeDefined();
			expect(data.learning.progress).toBeDefined();
			expect(data.learning.submissions).toBeDefined();
			expect(data.learning.flashcards).toBeDefined();
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

			expect(data.rewards.inventory).toBeDefined();
			expect(data.rewards.gidouilles_history).toBeDefined();
			expect(data.rewards.bonus_history).toBeDefined();
			expect(data.rewards.purchases).toBeDefined();
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
			expect(fromCalls).toContain('student_attempts');
			expect(fromCalls).toContain('student_progress');
			expect(fromCalls).toContain('messages');
			expect(fromCalls).toContain('friendships');
			expect(fromCalls).toContain('notifications');
		});
	});
});
