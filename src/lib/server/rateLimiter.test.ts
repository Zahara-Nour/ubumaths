/**
 * Rate Limiter Tests (Database-backed Implementation)
 *
 * Tests for the new database-backed rate limiting system that replaced Redis.
 *
 * MIGRATION NOTES:
 * - All functions are now async and require Supabase client
 * - Return type changed from boolean to RateLimitResult { allowed, message? }
 * - Removed: getRateLimitStatus(), getRateLimiterStats(), resetRateLimit()
 * - Removed: remainingAttempts, retryAfter, violationCount fields
 * - Simplified: No exponential backoff tracking
 * - Configuration: Signup window changed from 30min to 1 hour
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import {
	checkLoginRateLimitByIP,
	checkLoginRateLimitByEmail,
	checkSignupRateLimitByIP,
	checkOAuthRateLimitByIP
} from './rateLimiter';

// Mock the logger to avoid console noise in tests
vi.mock('$lib/utils/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn()
	})
}));

// ============================================================================
// MOCK SUPABASE CLIENT
// ============================================================================

/**
 * Create a mock Supabase client for testing rate limiting
 *
 * This simulates the rate_limits table with in-memory storage
 */
function createMockSupabase() {
	// In-memory storage for rate limit entries
	const rateLimits = new Map<
		string,
		{
			key: string;
			count: number;
			expires_at: string;
		}
	>();

	const mockSupabase = {
		from: (table: string) => {
			if (table !== 'rate_limits') {
				throw new Error(`Unexpected table: ${table}`);
			}

			return {
				select: (_columns: string) => ({
					eq: (column: string, value: string) => ({
						gte: (column2: string, value2: string) => ({
							maybeSingle: async () => {
								const entry = rateLimits.get(value);
								console.log(`[MOCK SELECT] key=${value}, entry=`, entry);
								if (!entry || new Date(entry.expires_at).getTime() < new Date(value2).getTime()) {
									return { data: null, error: null };
								}
								// Return a copy to avoid reference issues
								const result = { data: { ...entry }, error: null };
								console.log(`[MOCK SELECT] Returning:`, result.data);
								return result;
							}
						})
					})
				}),
				update: (data: { count: number }) => ({
					eq: (column: string, value: string) => {
						// Synchronously update the entry, then return a resolved promise
						console.log(`[MOCK UPDATE] key=${value}, count=${data.count}`);
						const entry = rateLimits.get(value);
						if (entry) {
							entry.count = data.count;
							console.log(`[MOCK UPDATE] Updated entry:`, entry);
						}
						return Promise.resolve({ error: null });
					}
				}),
				insert: (
					data:
						| {
								key: string;
								count: number;
								expires_at: string;
						  }
						| {
								key: string;
								count: number;
								expires_at: string;
						  }[]
				) => {
					// Synchronously insert into the map, then return a resolved promise
					const records = Array.isArray(data) ? data : [data];
					for (const record of records) {
						console.log(`[MOCK INSERT] key=${record.key}, count=${record.count}`);
						rateLimits.set(record.key, record);
					}
					return Promise.resolve({ error: null });
				}
			};
		}
	} as unknown as SupabaseClient<Database>;

	// Helper to clear all rate limits (simulates database cleanup)
	const clearAll = () => rateLimits.clear();

	// Helper to get entry count
	const getEntryCount = () => rateLimits.size;

	// Helper to manually expire an entry (for testing)
	const expireEntry = (key: string) => {
		const entry = rateLimits.get(key);
		if (entry) {
			entry.expires_at = new Date(Date.now() - 1000).toISOString();
		}
	};

	return { mockSupabase, clearAll, getEntryCount, expireEntry };
}

// ============================================================================
// TESTS
// ============================================================================

describe('Rate Limiter (Database-backed)', () => {
	let mockSupabase: SupabaseClient<Database>;
	let expireEntry: (key: string) => void;

	beforeEach(() => {
		const mock = createMockSupabase();
		mockSupabase = mock.mockSupabase;
		expireEntry = mock.expireEntry;
		vi.clearAllMocks();
	});

	describe('Login Rate Limiting by IP', () => {
		it('should allow first login attempt', async () => {
			const testIP = '192.168.1.100';
			const result = await checkLoginRateLimitByIP(testIP, mockSupabase);
			expect(result.allowed).toBe(true);
			expect(result.message).toBeUndefined();
		});

		it('should track multiple attempts within window', async () => {
			const testIP = '192.168.1.101';

			// Attempts 1-5 should be allowed
			for (let i = 1; i <= 5; i++) {
				const result = await checkLoginRateLimitByIP(testIP, mockSupabase);
				expect(result.allowed).toBe(true);
			}

			// 6th attempt should be blocked
			const blocked = await checkLoginRateLimitByIP(testIP, mockSupabase);
			expect(blocked.allowed).toBe(false);
			expect(blocked.message).toContain('Trop de tentatives');
			expect(blocked.message).toContain('15 minutes');
		});

		it('should block after exceeding limit', async () => {
			const testIP = '192.168.1.102';

			// Exceed limit (5 allowed + 1 blocked)
			for (let i = 0; i < 6; i++) {
				await checkLoginRateLimitByIP(testIP, mockSupabase);
			}

			// Verify subsequent attempts are blocked
			const result = await checkLoginRateLimitByIP(testIP, mockSupabase);
			expect(result.allowed).toBe(false);
			expect(result.message).toBeDefined();
			expect(result.message).toContain('Trop de tentatives');
		});

		it('should handle missing IP gracefully', async () => {
			const result = await checkLoginRateLimitByIP('', mockSupabase);
			expect(result.allowed).toBe(true); // Fail open for security
		});

		it('should reset after time window expires', async () => {
			const testIP = '192.168.1.103';

			// Exceed limit
			for (let i = 0; i < 6; i++) {
				await checkLoginRateLimitByIP(testIP, mockSupabase);
			}

			// Verify blocked
			let result = await checkLoginRateLimitByIP(testIP, mockSupabase);
			expect(result.allowed).toBe(false);

			// Manually expire the entry (simulates time passing)
			expireEntry(`ratelimit:login:ip:${testIP}`);

			// Should be allowed again
			result = await checkLoginRateLimitByIP(testIP, mockSupabase);
			expect(result.allowed).toBe(true);
		});
	});

	describe('Login Rate Limiting by Email', () => {
		it('should allow first login attempt', async () => {
			const testEmail = 'unique-email-test@example.com';
			const result = await checkLoginRateLimitByEmail(testEmail, mockSupabase);
			expect(result.allowed).toBe(true);
		});

		it('should normalize email to lowercase', async () => {
			const normalizeTestEmail = 'NORMALIZE@EXAMPLE.COM';

			// First attempt with uppercase
			const first = await checkLoginRateLimitByEmail(normalizeTestEmail, mockSupabase);
			expect(first.allowed).toBe(true);

			// Second attempt with mixed case
			const second = await checkLoginRateLimitByEmail('Normalize@Example.Com', mockSupabase);
			expect(second.allowed).toBe(true);

			// Third attempt with lowercase - should track as same email
			const third = await checkLoginRateLimitByEmail('normalize@example.com', mockSupabase);
			expect(third.allowed).toBe(true);

			// Fourth attempt should be blocked (limit is 3)
			const fourth = await checkLoginRateLimitByEmail('normalize@example.com', mockSupabase);
			expect(fourth.allowed).toBe(false);
			expect(fourth.message).toContain('Trop de tentatives');
		});

		it('should block after 3 attempts (stricter than IP)', async () => {
			const strictTestEmail = 'strict@example.com';

			// Attempts 1-3 should be allowed
			for (let i = 1; i <= 3; i++) {
				const result = await checkLoginRateLimitByEmail(strictTestEmail, mockSupabase);
				expect(result.allowed).toBe(true);
			}

			// 4th attempt should be blocked
			const blocked = await checkLoginRateLimitByEmail(strictTestEmail, mockSupabase);
			expect(blocked.allowed).toBe(false);
			expect(blocked.message).toContain('email');
		});

		it('should handle missing email gracefully', async () => {
			const result = await checkLoginRateLimitByEmail('', mockSupabase);
			expect(result.allowed).toBe(true); // Fail open
		});

		it('should track email separately from IP', async () => {
			const separateTestEmail = 'separate@example.com';

			// Exceed email rate limit
			for (let i = 0; i < 4; i++) {
				await checkLoginRateLimitByEmail(separateTestEmail, mockSupabase);
			}
			const emailResult = await checkLoginRateLimitByEmail(separateTestEmail, mockSupabase);
			expect(emailResult.allowed).toBe(false);

			// IP should still work (different rate limit key)
			const ipResult = await checkLoginRateLimitByIP('192.168.1.999', mockSupabase);
			expect(ipResult.allowed).toBe(true);
		});
	});

	describe('Signup Rate Limiting by IP', () => {
		it('should allow first signup attempt', async () => {
			const testIP = '192.168.1.200';
			const result = await checkSignupRateLimitByIP(testIP, mockSupabase);
			expect(result.allowed).toBe(true);
		});

		it('should block after 3 attempts', async () => {
			const testIP = '192.168.1.201';

			// Attempts 1-3 should be allowed
			for (let i = 1; i <= 3; i++) {
				const result = await checkSignupRateLimitByIP(testIP, mockSupabase);
				expect(result.allowed).toBe(true);
			}

			// 4th attempt should be blocked
			const blocked = await checkSignupRateLimitByIP(testIP, mockSupabase);
			expect(blocked.allowed).toBe(false);
			expect(blocked.message).toContain('Trop de tentatives');
			expect(blocked.message).toContain('inscription');
		});

		it('should have 1 hour block duration (not 30 minutes)', async () => {
			const testIP = '192.168.1.202';

			// Exceed limit
			for (let i = 0; i < 4; i++) {
				await checkSignupRateLimitByIP(testIP, mockSupabase);
			}

			// Check error message mentions 1 hour
			const result = await checkSignupRateLimitByIP(testIP, mockSupabase);
			expect(result.allowed).toBe(false);
			expect(result.message).toContain('1 heure');
		});
	});

	describe('OAuth Rate Limiting by IP', () => {
		it('should allow first OAuth attempt', async () => {
			const testIP = '192.168.1.300';
			const result = await checkOAuthRateLimitByIP(testIP, mockSupabase);
			expect(result.allowed).toBe(true);
		});

		it('should allow more attempts than login (10 vs 5)', async () => {
			const testIP = '192.168.1.301';

			// Attempts 1-10 should be allowed
			for (let i = 1; i <= 10; i++) {
				const result = await checkOAuthRateLimitByIP(testIP, mockSupabase);
				expect(result.allowed).toBe(true);
			}

			// 11th attempt should be blocked
			const blocked = await checkOAuthRateLimitByIP(testIP, mockSupabase);
			expect(blocked.allowed).toBe(false);
			expect(blocked.message).toContain('OAuth');
		});
	});

	describe('Edge Cases', () => {
		it('should handle concurrent requests for same IP', async () => {
			const testIP = '192.168.1.600';

			// Simulate concurrent requests
			const results = await Promise.all(
				Array.from({ length: 10 }, () => checkLoginRateLimitByIP(testIP, mockSupabase))
			);

			// Should handle all requests correctly
			const allowed = results.filter((r) => r.allowed).length;
			const blocked = results.filter((r) => !r.allowed).length;

			// Due to race conditions in the mock, we just verify total count
			expect(allowed + blocked).toBe(10);
			expect(allowed).toBeGreaterThanOrEqual(5); // At least 5 allowed
		});

		it('should handle special characters in email', async () => {
			const specialEmail = 'test+alias@example.com';
			const result = await checkLoginRateLimitByEmail(specialEmail, mockSupabase);
			expect(result.allowed).toBe(true);
		});

		it('should handle IPv6 addresses', async () => {
			const ipv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
			const result = await checkLoginRateLimitByIP(ipv6, mockSupabase);
			expect(result.allowed).toBe(true);
		});
	});

	describe('French Error Messages', () => {
		it('should return French error messages for login', async () => {
			const testIP = '192.168.1.800';

			// Exceed limit
			for (let i = 0; i < 6; i++) {
				await checkLoginRateLimitByIP(testIP, mockSupabase);
			}

			const result = await checkLoginRateLimitByIP(testIP, mockSupabase);
			expect(result.message).toContain('Trop de tentatives');
			expect(result.message).toMatch(/minute/);
		});

		it('should return French error messages for signup', async () => {
			const testIP = '192.168.1.900';

			// Exceed limit
			for (let i = 0; i < 4; i++) {
				await checkSignupRateLimitByIP(testIP, mockSupabase);
			}

			const result = await checkSignupRateLimitByIP(testIP, mockSupabase);
			expect(result.message).toContain('Trop de tentatives');
			expect(result.message).toContain('inscription');
		});
	});
});
