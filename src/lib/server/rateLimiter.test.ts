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
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// Mock the logger to avoid console noise in tests (must be hoisted)
vi.mock('$lib/utils/logger', () => ({
	createLogger: vi.fn(() => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
		trace: vi.fn()
	}))
}));

// Mock Supabase createClient to return our mock
vi.mock('@supabase/supabase-js', () => ({
	createClient: vi.fn()
}));

// Import after mocks are set up
import {
	checkLoginRateLimitByIP,
	checkLoginRateLimitByEmail,
	checkSignupRateLimitByIP,
	checkOAuthRateLimitByIP,
	checkNotificationCreateRateLimit,
	checkNotificationMarkRateLimit,
	checkNotificationDeleteRateLimit
} from './rateLimiter';

// ============================================================================
// MOCK SUPABASE CLIENT
// ============================================================================

/**
 * Create a mock Supabase client for testing rate limiting
 *
 * This simulates the rate_limits table with in-memory storage
 */

// In-memory storage for rate limit entries (global to persist across function calls)
const rateLimits = new Map<
	string,
	{
		key: string;
		count: number;
		expires_at: string;
	}
>();

function createMockSupabase() {
	const mockSupabase = {
		from: (table: string) => {
			if (table !== 'rate_limits') {
				throw new Error(`Unexpected table: ${table}`);
			}

			return {
				select: (_columns: string) => ({
					eq: (column: string, value: string) => ({
						gte: (column2: string, value2: string) => ({
							maybeSingle: () => {
								// Make synchronous to simulate atomic snapshot read
								const entry = rateLimits.get(value);
								if (!entry || new Date(entry.expires_at).getTime() < new Date(value2).getTime()) {
									return Promise.resolve({ data: null, error: null });
								}
								// Return a copy to avoid reference issues
								return Promise.resolve({ data: { ...entry }, error: null });
							}
						})
					})
				}),
				update: (data: { count: number }) => {
					// Track WHERE conditions for atomic evaluation
					const conditions: Array<() => boolean> = [];
					let targetKey: string | null = null;

					return {
						eq: (column: string, value: string) => {
							// Store the key (first WHERE condition)
							targetKey = value;
							conditions.push(() => rateLimits.has(value));
							return {
								lt: (column2: string, value2: number) => {
									// Add count < maxAttempts condition
									conditions.push(() => {
										const entry = rateLimits.get(targetKey!);
										return entry ? entry.count < value2 : false;
									});
									return {
										gte: (column3: string, value3: string) => {
											// Add expires_at >= now condition
											conditions.push(() => {
												const entry = rateLimits.get(targetKey!);
												if (!entry) return false;
												return new Date(entry.expires_at).getTime() >= new Date(value3).getTime();
											});
											return {
												select: (_columns: string) => ({
													maybeSingle: () => {
														// CRITICAL: Make this synchronous to simulate PostgreSQL's row-level locking
														// In PostgreSQL, UPDATE with WHERE clause acquires an exclusive lock on matching rows
														// and evaluates conditions atomically. We simulate this by making the entire
														// check-and-update operation synchronous (no await).

														// ATOMICALLY evaluate all conditions and update
														const allConditionsMet = conditions.every((condition) => condition());

														if (!allConditionsMet) {
															// One or more conditions failed → UPDATE affects 0 rows → return null
															return Promise.resolve({ data: null, error: null });
														}

														// All conditions passed → perform UPDATE
														const entry = rateLimits.get(targetKey!);
														if (entry) {
															entry.count = data.count;
															// Return updated row (simulates RETURNING clause)
															return Promise.resolve({ data: { ...entry }, error: null });
														}

														// Shouldn't happen (conditions passed but no entry)
														return Promise.resolve({ data: null, error: null });
													}
												})
											};
										}
									};
								}
							};
						}
					};
				},
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
					// Synchronously check for unique constraint violation
					const records = Array.isArray(data) ? data : [data];
					for (const record of records) {
						// Simulate PostgreSQL UNIQUE constraint on 'key' column
						if (rateLimits.has(record.key)) {
							// Return unique constraint violation error (PostgreSQL error code 23505)
							return Promise.resolve({
								error: {
									code: '23505',
									message: 'duplicate key value violates unique constraint "rate_limits_key_key"'
								}
							});
						}
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
	let expireEntry: (key: string) => void;

	beforeEach(() => {
		// Clear the in-memory storage
		rateLimits.clear();

		// Reset the singleton service role client
		const globalForSupabase = globalThis as unknown as {
			supabaseServiceRoleClient: SupabaseClient<Database> | undefined;
		};
		globalForSupabase.supabaseServiceRoleClient = undefined;

		const mock = createMockSupabase();
		expireEntry = mock.expireEntry;

		// Reset the mock implementation for createClient
		vi.mocked(createClient).mockReturnValue(mock.mockSupabase as any);

		// NOTE: Do NOT call vi.clearAllMocks() here as it clears the logger mock
		// and the createClient mock we just configured above, breaking all tests
	});

	describe('Login Rate Limiting by IP', () => {
		it('should allow first login attempt', async () => {
			const testIP = '192.168.1.100';
			const result = await checkLoginRateLimitByIP(testIP);
			expect(result.allowed).toBe(true);
			expect(result.message).toBeUndefined();
		});

		it('should track multiple attempts within window', async () => {
			const testIP = '192.168.1.101';

			// Attempts 1-5 should be allowed
			for (let i = 1; i <= 5; i++) {
				const result = await checkLoginRateLimitByIP(testIP);
				expect(result.allowed).toBe(true);
			}

			// 6th attempt should be blocked
			const blocked = await checkLoginRateLimitByIP(testIP);
			expect(blocked.allowed).toBe(false);
			expect(blocked.message).toContain('Trop de tentatives');
			expect(blocked.message).toContain('15 minutes');
		});

		it('should block after exceeding limit', async () => {
			const testIP = '192.168.1.102';

			// Exceed limit (5 allowed + 1 blocked)
			for (let i = 0; i < 6; i++) {
				await checkLoginRateLimitByIP(testIP);
			}

			// Verify subsequent attempts are blocked
			const result = await checkLoginRateLimitByIP(testIP);
			expect(result.allowed).toBe(false);
			expect(result.message).toBeDefined();
			expect(result.message).toContain('Trop de tentatives');
		});

		it('should handle missing IP gracefully', async () => {
			const result = await checkLoginRateLimitByIP('');
			expect(result.allowed).toBe(true); // Fail open for security
		});

		it('should reset after time window expires', async () => {
			const testIP = '192.168.1.103';

			// Exceed limit
			for (let i = 0; i < 6; i++) {
				await checkLoginRateLimitByIP(testIP);
			}

			// Verify blocked
			let result = await checkLoginRateLimitByIP(testIP);
			expect(result.allowed).toBe(false);

			// Manually expire the entry (simulates time passing)
			expireEntry(`ratelimit:login:ip:${testIP}`);

			// Should be allowed again
			result = await checkLoginRateLimitByIP(testIP);
			expect(result.allowed).toBe(true);
		});
	});

	describe('Login Rate Limiting by Email', () => {
		it('should allow first login attempt', async () => {
			const testEmail = 'unique-email-test@example.com';
			const result = await checkLoginRateLimitByEmail(testEmail);
			expect(result.allowed).toBe(true);
		});

		it('should normalize email to lowercase', async () => {
			const normalizeTestEmail = 'NORMALIZE@EXAMPLE.COM';

			// First attempt with uppercase
			const first = await checkLoginRateLimitByEmail(normalizeTestEmail);
			expect(first.allowed).toBe(true);

			// Second attempt with mixed case
			const second = await checkLoginRateLimitByEmail('Normalize@Example.Com');
			expect(second.allowed).toBe(true);

			// Third attempt with lowercase - should track as same email
			const third = await checkLoginRateLimitByEmail('normalize@example.com');
			expect(third.allowed).toBe(true);

			// Fourth attempt should be blocked (limit is 3)
			const fourth = await checkLoginRateLimitByEmail('normalize@example.com');
			expect(fourth.allowed).toBe(false);
			expect(fourth.message).toContain('Trop de tentatives');
		});

		it('should block after 3 attempts (stricter than IP)', async () => {
			const strictTestEmail = 'strict@example.com';

			// Attempts 1-3 should be allowed
			for (let i = 1; i <= 3; i++) {
				const result = await checkLoginRateLimitByEmail(strictTestEmail);
				expect(result.allowed).toBe(true);
			}

			// 4th attempt should be blocked
			const blocked = await checkLoginRateLimitByEmail(strictTestEmail);
			expect(blocked.allowed).toBe(false);
			expect(blocked.message).toContain('email');
		});

		it('should handle missing email gracefully', async () => {
			const result = await checkLoginRateLimitByEmail('');
			expect(result.allowed).toBe(true); // Fail open
		});

		it('should track email separately from IP', async () => {
			const separateTestEmail = 'separate@example.com';

			// Exceed email rate limit
			for (let i = 0; i < 4; i++) {
				await checkLoginRateLimitByEmail(separateTestEmail);
			}
			const emailResult = await checkLoginRateLimitByEmail(separateTestEmail);
			expect(emailResult.allowed).toBe(false);

			// IP should still work (different rate limit key)
			const ipResult = await checkLoginRateLimitByIP('192.168.1.999');
			expect(ipResult.allowed).toBe(true);
		});
	});

	describe('Signup Rate Limiting by IP', () => {
		it('should allow first signup attempt', async () => {
			const testIP = '192.168.1.200';
			const result = await checkSignupRateLimitByIP(testIP);
			expect(result.allowed).toBe(true);
		});

		it('should block after 3 attempts', async () => {
			const testIP = '192.168.1.201';

			// Attempts 1-3 should be allowed
			for (let i = 1; i <= 3; i++) {
				const result = await checkSignupRateLimitByIP(testIP);
				expect(result.allowed).toBe(true);
			}

			// 4th attempt should be blocked
			const blocked = await checkSignupRateLimitByIP(testIP);
			expect(blocked.allowed).toBe(false);
			expect(blocked.message).toContain('Trop de tentatives');
			expect(blocked.message).toContain('inscription');
		});

		it('should have 1 hour block duration (not 30 minutes)', async () => {
			const testIP = '192.168.1.202';

			// Exceed limit
			for (let i = 0; i < 4; i++) {
				await checkSignupRateLimitByIP(testIP);
			}

			// Check error message mentions 1 hour
			const result = await checkSignupRateLimitByIP(testIP);
			expect(result.allowed).toBe(false);
			expect(result.message).toContain('1 heure');
		});
	});

	describe('OAuth Rate Limiting by IP', () => {
		it('should allow first OAuth attempt', async () => {
			const testIP = '192.168.1.300';
			const result = await checkOAuthRateLimitByIP(testIP);
			expect(result.allowed).toBe(true);
		});

		it('should allow more attempts than login (10 vs 5)', async () => {
			const testIP = '192.168.1.301';

			// Attempts 1-10 should be allowed
			for (let i = 1; i <= 10; i++) {
				const result = await checkOAuthRateLimitByIP(testIP);
				expect(result.allowed).toBe(true);
			}

			// 11th attempt should be blocked
			const blocked = await checkOAuthRateLimitByIP(testIP);
			expect(blocked.allowed).toBe(false);
			expect(blocked.message).toContain('OAuth');
		});
	});

	describe('Edge Cases', () => {
		it('should handle concurrent requests for same IP', async () => {
			const testIP = '192.168.1.600';

			// Simulate concurrent requests
			const results = await Promise.all(
				Array.from({ length: 10 }, () => checkLoginRateLimitByIP(testIP))
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
			const result = await checkLoginRateLimitByEmail(specialEmail);
			expect(result.allowed).toBe(true);
		});

		it('should handle IPv6 addresses', async () => {
			const ipv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
			const result = await checkLoginRateLimitByIP(ipv6);
			expect(result.allowed).toBe(true);
		});
	});

	describe('French Error Messages', () => {
		it('should return French error messages for login', async () => {
			const testIP = '192.168.1.800';

			// Exceed limit
			for (let i = 0; i < 6; i++) {
				await checkLoginRateLimitByIP(testIP);
			}

			const result = await checkLoginRateLimitByIP(testIP);
			expect(result.message).toContain('Trop de tentatives');
			expect(result.message).toMatch(/minute/);
		});

		it('should return French error messages for signup', async () => {
			const testIP = '192.168.1.900';

			// Exceed limit
			for (let i = 0; i < 4; i++) {
				await checkSignupRateLimitByIP(testIP);
			}

			const result = await checkSignupRateLimitByIP(testIP);
			expect(result.message).toContain('Trop de tentatives');
			expect(result.message).toContain('inscription');
		});
	});

	describe('Notification Rate Limits', () => {
		describe('checkNotificationCreateRateLimit', () => {
			describe('Teacher Rate Limit (10/hour)', () => {
				it('should allow teachers up to 10 notifications per hour', async () => {
					const userId = 'test-teacher-id-1';

					// First 10 requests should succeed
					for (let i = 0; i < 10; i++) {
						const result = await checkNotificationCreateRateLimit(userId, 'teacher');
						expect(result.allowed).toBe(true);
						expect(result.message).toBeUndefined();
						expect(result.retryAfter).toBeUndefined();
					}
				});

				it('should block teachers after 10 notifications per hour', async () => {
					const userId = 'test-teacher-id-2';

					// Exhaust limit (10 requests)
					for (let i = 0; i < 10; i++) {
						await checkNotificationCreateRateLimit(userId, 'teacher');
					}

					// 11th request should be blocked
					const result = await checkNotificationCreateRateLimit(userId, 'teacher');
					expect(result.allowed).toBe(false);
					expect(result.message).toContain('limite de création de notifications');
					expect(result.retryAfter).toBeDefined();
					expect(result.retryAfter).toBeGreaterThan(0);
					expect(result.retryAfter).toBeLessThanOrEqual(3600);
				});

				it('should return correct French error message when limit exceeded', async () => {
					const userId = 'test-teacher-id-3';

					// Exhaust limit
					for (let i = 0; i < 10; i++) {
						await checkNotificationCreateRateLimit(userId, 'teacher');
					}

					const result = await checkNotificationCreateRateLimit(userId, 'teacher');
					expect(result.allowed).toBe(false);
					expect(result.message).toContain('Vous avez atteint la limite');
					expect(result.message).toContain('notifications');
				});

				it('should return retryAfter value when teacher limit exceeded', async () => {
					const userId = 'test-teacher-id-4';

					// Exhaust limit
					for (let i = 0; i < 10; i++) {
						await checkNotificationCreateRateLimit(userId, 'teacher');
					}

					const result = await checkNotificationCreateRateLimit(userId, 'teacher');
					expect(result.allowed).toBe(false);
					expect(result.retryAfter).toBeDefined();
					expect(typeof result.retryAfter).toBe('number');
					expect(result.retryAfter).toBeGreaterThan(0);
					// Should be at most 1 hour (3600 seconds)
					expect(result.retryAfter).toBeLessThanOrEqual(3600);
				});

				it('should reset after time window expires', async () => {
					const userId = 'test-teacher-id-5';

					// Exceed limit
					for (let i = 0; i < 10; i++) {
						await checkNotificationCreateRateLimit(userId, 'teacher');
					}

					// Verify blocked
					let result = await checkNotificationCreateRateLimit(userId, 'teacher');
					expect(result.allowed).toBe(false);

					// Manually expire the entry (simulates time passing)
					expireEntry(`notification_create:${userId}`);

					// Should be allowed again
					result = await checkNotificationCreateRateLimit(userId, 'teacher');
					expect(result.allowed).toBe(true);
				});
			});

			describe('Admin Rate Limit (50/hour)', () => {
				it('should allow admins up to 50 notifications per hour', async () => {
					const userId = 'test-admin-id-1';

					// First 50 requests should succeed
					for (let i = 0; i < 50; i++) {
						const result = await checkNotificationCreateRateLimit(userId, 'admin');
						expect(result.allowed).toBe(true);
					}
				});

				it('should block admins after 50 notifications per hour', async () => {
					const userId = 'test-admin-id-2';

					// Exhaust limit (50 requests)
					for (let i = 0; i < 50; i++) {
						await checkNotificationCreateRateLimit(userId, 'admin');
					}

					// 51st request should be blocked
					const result = await checkNotificationCreateRateLimit(userId, 'admin');
					expect(result.allowed).toBe(false);
					expect(result.message).toBeDefined();
					expect(result.retryAfter).toBeDefined();
					expect(result.retryAfter).toBeGreaterThan(0);
					expect(result.retryAfter).toBeLessThanOrEqual(3600);
				});

				it('should allow more requests for admins than teachers', async () => {
					const adminId = 'test-admin-id-3';
					const teacherId = 'test-teacher-id-6';

					// Teacher should be blocked after 10
					for (let i = 0; i < 10; i++) {
						await checkNotificationCreateRateLimit(teacherId, 'teacher');
					}
					const teacherResult = await checkNotificationCreateRateLimit(teacherId, 'teacher');
					expect(teacherResult.allowed).toBe(false);

					// Admin should still be allowed after 10 (up to 50)
					for (let i = 0; i < 25; i++) {
						const adminResult = await checkNotificationCreateRateLimit(adminId, 'admin');
						expect(adminResult.allowed).toBe(true);
					}
				});
			});

			describe('Role-Based Limits', () => {
				it('should apply different limits based on role', async () => {
					const userId = 'test-user-id-1';

					// As teacher: 10 requests allowed
					for (let i = 0; i < 10; i++) {
						const result = await checkNotificationCreateRateLimit(userId, 'teacher');
						expect(result.allowed).toBe(true);
					}

					// 11th request as teacher should fail
					const teacherResult = await checkNotificationCreateRateLimit(userId, 'teacher');
					expect(teacherResult.allowed).toBe(false);
				});

				it('should track limits independently for different users', async () => {
					const userA = 'test-user-a';
					const userB = 'test-user-b';

					// User A exhausts their limit
					for (let i = 0; i < 10; i++) {
						await checkNotificationCreateRateLimit(userA, 'teacher');
					}
					const userAResult = await checkNotificationCreateRateLimit(userA, 'teacher');
					expect(userAResult.allowed).toBe(false);

					// User B should still have their full quota
					const userBResult = await checkNotificationCreateRateLimit(userB, 'teacher');
					expect(userBResult.allowed).toBe(true);
				});

				it('should default to teacher limit for invalid roles', async () => {
					const userId = 'test-user-id-2';

					// Using 'student' role (not admin) should default to teacher limit (10)
					for (let i = 0; i < 10; i++) {
						const result = await checkNotificationCreateRateLimit(userId, 'student');
						expect(result.allowed).toBe(true);
					}

					// 11th request should be blocked (teacher limit applied)
					const result = await checkNotificationCreateRateLimit(userId, 'student');
					expect(result.allowed).toBe(false);
				});
			});

			describe('Edge Cases', () => {
				it('should handle missing userId gracefully (fail-open)', async () => {
					const result = await checkNotificationCreateRateLimit('', 'teacher');
					expect(result.allowed).toBe(true);
					expect(result.message).toBeUndefined();
				});

				it('should handle concurrent requests correctly', async () => {
					const userId = 'test-concurrent-create-1';

					// Simulate concurrent requests
					const results = await Promise.all(
						Array.from({ length: 15 }, () => checkNotificationCreateRateLimit(userId, 'teacher'))
					);

					// Should handle all requests
					const allowed = results.filter((r) => r.allowed).length;
					const blocked = results.filter((r) => !r.allowed).length;

					expect(allowed + blocked).toBe(15);
					// At least 10 should be allowed (the limit)
					expect(allowed).toBeGreaterThanOrEqual(10);
				});
			});
		});

		describe('checkNotificationMarkRateLimit', () => {
			describe('Mark-Read Rate Limit (30/15min)', () => {
				it('should allow up to 30 mark-read actions per 15 minutes', async () => {
					const userId = 'test-mark-user-1';

					// First 30 requests should succeed
					for (let i = 0; i < 30; i++) {
						const result = await checkNotificationMarkRateLimit(userId);
						expect(result.allowed).toBe(true);
						expect(result.message).toBeUndefined();
						expect(result.retryAfter).toBeUndefined();
					}
				});

				it('should block after 30 mark-read actions per 15 minutes', async () => {
					const userId = 'test-mark-user-2';

					// Exhaust limit (30 requests)
					for (let i = 0; i < 30; i++) {
						await checkNotificationMarkRateLimit(userId);
					}

					// 31st request should be blocked
					const result = await checkNotificationMarkRateLimit(userId);
					expect(result.allowed).toBe(false);
					expect(result.message).toContain('marquage');
					expect(result.retryAfter).toBeDefined();
					expect(result.retryAfter).toBeGreaterThan(0);
					expect(result.retryAfter).toBeLessThanOrEqual(900);
				});

				it('should return correct French error message when limit exceeded', async () => {
					const userId = 'test-mark-user-3';

					// Exhaust limit
					for (let i = 0; i < 30; i++) {
						await checkNotificationMarkRateLimit(userId);
					}

					const result = await checkNotificationMarkRateLimit(userId);
					expect(result.allowed).toBe(false);
					expect(result.message).toContain('Trop de requêtes de marquage');
					expect(result.message).toContain('patienter');
				});

				it('should return retryAfter value when limit exceeded', async () => {
					const userId = 'test-mark-user-4';

					// Exhaust limit
					for (let i = 0; i < 30; i++) {
						await checkNotificationMarkRateLimit(userId);
					}

					const result = await checkNotificationMarkRateLimit(userId);
					expect(result.allowed).toBe(false);
					expect(result.retryAfter).toBeDefined();
					expect(typeof result.retryAfter).toBe('number');
					expect(result.retryAfter).toBeGreaterThan(0);
					// Should be at most 15 minutes (900 seconds)
					expect(result.retryAfter).toBeLessThanOrEqual(900);
				});

				it('should reset after time window expires', async () => {
					const userId = 'test-mark-user-5';

					// Exceed limit
					for (let i = 0; i < 30; i++) {
						await checkNotificationMarkRateLimit(userId);
					}

					// Verify blocked
					let result = await checkNotificationMarkRateLimit(userId);
					expect(result.allowed).toBe(false);

					// Manually expire the entry (simulates time passing)
					expireEntry(`notification_mark:${userId}`);

					// Should be allowed again
					result = await checkNotificationMarkRateLimit(userId);
					expect(result.allowed).toBe(true);
				});
			});

			describe('User Isolation', () => {
				it('should track limits independently for different users', async () => {
					const userA = 'test-mark-user-a';
					const userB = 'test-mark-user-b';

					// User A exhausts their limit
					for (let i = 0; i < 30; i++) {
						await checkNotificationMarkRateLimit(userA);
					}
					const userAResult = await checkNotificationMarkRateLimit(userA);
					expect(userAResult.allowed).toBe(false);

					// User B should still have their full quota
					const userBResult = await checkNotificationMarkRateLimit(userB);
					expect(userBResult.allowed).toBe(true);
				});

				it('should not share limits with notification creation', async () => {
					const userId = 'test-mark-user-6';

					// Exhaust mark-read limit
					for (let i = 0; i < 30; i++) {
						await checkNotificationMarkRateLimit(userId);
					}
					const markResult = await checkNotificationMarkRateLimit(userId);
					expect(markResult.allowed).toBe(false);

					// Notification creation should still work (different limit)
					const createResult = await checkNotificationCreateRateLimit(userId, 'teacher');
					expect(createResult.allowed).toBe(true);
				});
			});

			describe('Edge Cases', () => {
				it('should handle missing userId gracefully (fail-open)', async () => {
					const result = await checkNotificationMarkRateLimit('');
					expect(result.allowed).toBe(true);
					expect(result.message).toBeUndefined();
				});

				it('should handle concurrent requests correctly', async () => {
					const userId = 'test-concurrent-mark-1';

					// Simulate concurrent requests
					const results = await Promise.all(
						Array.from({ length: 35 }, () => checkNotificationMarkRateLimit(userId))
					);

					// Should handle all requests
					const allowed = results.filter((r) => r.allowed).length;
					const blocked = results.filter((r) => !r.allowed).length;

					expect(allowed + blocked).toBe(35);
					// At least 30 should be allowed (the limit)
					expect(allowed).toBeGreaterThanOrEqual(30);
				});
			});
		});

		describe('checkNotificationDeleteRateLimit', () => {
			describe('Teacher Rate Limit (20/hour)', () => {
				it('should allow teachers up to 20 deletions per hour', async () => {
					const userId = 'test-teacher-delete-1';

					// First 20 requests should succeed
					for (let i = 0; i < 20; i++) {
						const result = await checkNotificationDeleteRateLimit(userId, 'teacher');
						expect(result.allowed).toBe(true);
						expect(result.message).toBeUndefined();
						expect(result.retryAfter).toBeUndefined();
					}
				});

				it('should block teachers after 20 deletions per hour', async () => {
					const userId = 'test-teacher-delete-2';

					// Exhaust limit (20 requests)
					for (let i = 0; i < 20; i++) {
						await checkNotificationDeleteRateLimit(userId, 'teacher');
					}

					// 21st request should be blocked
					const result = await checkNotificationDeleteRateLimit(userId, 'teacher');
					expect(result.allowed).toBe(false);
					expect(result.message).toContain('limite de suppression');
					expect(result.retryAfter).toBeDefined();
					expect(result.retryAfter).toBeGreaterThan(0);
					expect(result.retryAfter).toBeLessThanOrEqual(3600);
				});

				it('should have higher limit than create (20 vs 10)', async () => {
					const userId = 'test-teacher-delete-3';

					// Can create 10 notifications
					for (let i = 0; i < 10; i++) {
						const createResult = await checkNotificationCreateRateLimit(userId, 'teacher');
						expect(createResult.allowed).toBe(true);
					}

					// Create limit exhausted
					const createResult = await checkNotificationCreateRateLimit(userId, 'teacher');
					expect(createResult.allowed).toBe(false);

					// But can still delete 20 notifications
					for (let i = 0; i < 20; i++) {
						const deleteResult = await checkNotificationDeleteRateLimit(userId, 'teacher');
						expect(deleteResult.allowed).toBe(true);
					}

					// Delete limit exhausted after 20
					const deleteResult = await checkNotificationDeleteRateLimit(userId, 'teacher');
					expect(deleteResult.allowed).toBe(false);
				});

				it('should return retryAfter value when limit exceeded', async () => {
					const userId = 'test-teacher-delete-4';

					// Exhaust limit
					for (let i = 0; i < 20; i++) {
						await checkNotificationDeleteRateLimit(userId, 'teacher');
					}

					const result = await checkNotificationDeleteRateLimit(userId, 'teacher');
					expect(result.allowed).toBe(false);
					expect(result.retryAfter).toBeDefined();
					expect(typeof result.retryAfter).toBe('number');
					expect(result.retryAfter).toBeGreaterThan(0);
					// Should be at most 1 hour (3600 seconds)
					expect(result.retryAfter).toBeLessThanOrEqual(3600);
				});

				it('should return correct French error message when limit exceeded', async () => {
					const userId = 'test-teacher-delete-5';

					// Exhaust limit
					for (let i = 0; i < 20; i++) {
						await checkNotificationDeleteRateLimit(userId, 'teacher');
					}

					const result = await checkNotificationDeleteRateLimit(userId, 'teacher');
					expect(result.allowed).toBe(false);
					expect(result.message).toContain('Vous avez atteint la limite');
					expect(result.message).toContain('suppression');
				});

				it('should reset after time window expires', async () => {
					const userId = 'test-teacher-delete-6';

					// Exceed limit
					for (let i = 0; i < 20; i++) {
						await checkNotificationDeleteRateLimit(userId, 'teacher');
					}

					// Verify blocked
					let result = await checkNotificationDeleteRateLimit(userId, 'teacher');
					expect(result.allowed).toBe(false);

					// Manually expire the entry (simulates time passing)
					expireEntry(`notification_delete:${userId}`);

					// Should be allowed again
					result = await checkNotificationDeleteRateLimit(userId, 'teacher');
					expect(result.allowed).toBe(true);
				});
			});

			describe('Admin Rate Limit (100/hour)', () => {
				it('should allow admins up to 100 deletions per hour', async () => {
					const userId = 'test-admin-delete-1';

					// First 100 requests should succeed
					for (let i = 0; i < 100; i++) {
						const result = await checkNotificationDeleteRateLimit(userId, 'admin');
						expect(result.allowed).toBe(true);
					}
				});

				it('should block admins after 100 deletions per hour', async () => {
					const userId = 'test-admin-delete-2';

					// Exhaust limit (100 requests)
					for (let i = 0; i < 100; i++) {
						await checkNotificationDeleteRateLimit(userId, 'admin');
					}

					// 101st request should be blocked
					const result = await checkNotificationDeleteRateLimit(userId, 'admin');
					expect(result.allowed).toBe(false);
					expect(result.message).toBeDefined();
					expect(result.retryAfter).toBeDefined();
					expect(result.retryAfter).toBeGreaterThan(0);
					expect(result.retryAfter).toBeLessThanOrEqual(3600);
				});

				it('should allow more deletions for admins than teachers (100 vs 20)', async () => {
					const adminId = 'test-admin-delete-3';
					const teacherId = 'test-teacher-delete-7';

					// Teacher should be blocked after 20
					for (let i = 0; i < 20; i++) {
						await checkNotificationDeleteRateLimit(teacherId, 'teacher');
					}
					const teacherResult = await checkNotificationDeleteRateLimit(teacherId, 'teacher');
					expect(teacherResult.allowed).toBe(false);

					// Admin should still be allowed after 20 (up to 100)
					for (let i = 0; i < 50; i++) {
						const adminResult = await checkNotificationDeleteRateLimit(adminId, 'admin');
						expect(adminResult.allowed).toBe(true);
					}
				});

				it('should have higher limit than admin create (100 vs 50)', async () => {
					const userId = 'test-admin-delete-4';

					// Can create 50 notifications
					for (let i = 0; i < 50; i++) {
						const createResult = await checkNotificationCreateRateLimit(userId, 'admin');
						expect(createResult.allowed).toBe(true);
					}

					// Create limit exhausted
					const createResult = await checkNotificationCreateRateLimit(userId, 'admin');
					expect(createResult.allowed).toBe(false);

					// But can still delete 100 notifications
					for (let i = 0; i < 100; i++) {
						const deleteResult = await checkNotificationDeleteRateLimit(userId, 'admin');
						expect(deleteResult.allowed).toBe(true);
					}

					// Delete limit exhausted after 100
					const deleteResult = await checkNotificationDeleteRateLimit(userId, 'admin');
					expect(deleteResult.allowed).toBe(false);
				});
			});

			describe('Delete vs Create Isolation', () => {
				it('should track delete and create limits independently', async () => {
					const userId = 'test-isolation-1';

					// Exhaust delete limit
					for (let i = 0; i < 20; i++) {
						await checkNotificationDeleteRateLimit(userId, 'teacher');
					}
					const deleteResult = await checkNotificationDeleteRateLimit(userId, 'teacher');
					expect(deleteResult.allowed).toBe(false);

					// Create limit should still work (different quota)
					const createResult = await checkNotificationCreateRateLimit(userId, 'teacher');
					expect(createResult.allowed).toBe(true);
				});

				it('should not allow create/delete loops to bypass limits', async () => {
					const userId = 'test-isolation-2';

					// Use up create quota (10)
					for (let i = 0; i < 10; i++) {
						await checkNotificationCreateRateLimit(userId, 'teacher');
					}
					let createResult = await checkNotificationCreateRateLimit(userId, 'teacher');
					expect(createResult.allowed).toBe(false);

					// Use up delete quota (20)
					for (let i = 0; i < 20; i++) {
						await checkNotificationDeleteRateLimit(userId, 'teacher');
					}
					let deleteResult = await checkNotificationDeleteRateLimit(userId, 'teacher');
					expect(deleteResult.allowed).toBe(false);

					// Both should remain blocked (no quota sharing)
					createResult = await checkNotificationCreateRateLimit(userId, 'teacher');
					expect(createResult.allowed).toBe(false);
					deleteResult = await checkNotificationDeleteRateLimit(userId, 'teacher');
					expect(deleteResult.allowed).toBe(false);
				});
			});

			describe('Edge Cases', () => {
				it('should handle missing userId gracefully (fail-open)', async () => {
					const result = await checkNotificationDeleteRateLimit('', 'teacher');
					expect(result.allowed).toBe(true);
					expect(result.message).toBeUndefined();
				});

				it('should handle concurrent delete requests correctly', async () => {
					const userId = 'test-concurrent-delete-1';

					// Simulate concurrent requests
					const results = await Promise.all(
						Array.from({ length: 25 }, () => checkNotificationDeleteRateLimit(userId, 'teacher'))
					);

					// Should handle all requests
					const allowed = results.filter((r) => r.allowed).length;
					const blocked = results.filter((r) => !r.allowed).length;

					expect(allowed + blocked).toBe(25);
					// At least 20 should be allowed (the limit)
					expect(allowed).toBeGreaterThanOrEqual(20);
				});

				it('should reset after time window expires', async () => {
					const userId = 'test-delete-reset-1';

					// Exceed limit
					for (let i = 0; i < 20; i++) {
						await checkNotificationDeleteRateLimit(userId, 'teacher');
					}

					// Verify blocked
					let result = await checkNotificationDeleteRateLimit(userId, 'teacher');
					expect(result.allowed).toBe(false);

					// Manually expire the entry (simulates time passing)
					expireEntry(`notification_delete:${userId}`);

					// Should be allowed again
					result = await checkNotificationDeleteRateLimit(userId, 'teacher');
					expect(result.allowed).toBe(true);
				});

				it('should track limits independently for different users', async () => {
					const userA = 'test-delete-user-a';
					const userB = 'test-delete-user-b';

					// User A exhausts their limit
					for (let i = 0; i < 20; i++) {
						await checkNotificationDeleteRateLimit(userA, 'teacher');
					}
					const userAResult = await checkNotificationDeleteRateLimit(userA, 'teacher');
					expect(userAResult.allowed).toBe(false);

					// User B should still have their full quota
					const userBResult = await checkNotificationDeleteRateLimit(userB, 'teacher');
					expect(userBResult.allowed).toBe(true);
				});
			});

			describe('French Error Messages', () => {
				it('should return French error message when limit exceeded', async () => {
					const userId = 'test-delete-french-1';

					// Exhaust limit
					for (let i = 0; i < 20; i++) {
						await checkNotificationDeleteRateLimit(userId, 'teacher');
					}

					const result = await checkNotificationDeleteRateLimit(userId, 'teacher');
					expect(result.allowed).toBe(false);
					expect(result.message).toContain('suppression');
					expect(result.message).toContain('limite');
				});
			});
		});
	});

	describe('Race Condition Protection (Atomicity)', () => {
		/**
		 * NOTE ON TESTING ATOMICITY:
		 *
		 * These tests verify the atomic UPDATE implementation in the actual code,
		 * but they CANNOT perfectly simulate PostgreSQL's row-level locking in an
		 * in-memory JavaScript mock.
		 *
		 * What we CAN verify:
		 * 1. The code uses atomic UPDATE with WHERE clauses (.lt(), .gte())
		 * 2. The mock correctly simulates UPDATE returning null when conditions fail
		 * 3. The final count doesn't exceed maxAttempts (atomicity prevents overflow)
		 * 4. Most requests are correctly blocked after limit is reached
		 *
		 * What we CANNOT verify in a mock:
		 * - Exact concurrency behavior (requires real database with row locking)
		 * - True serialization of concurrent UPDATEs (JavaScript is single-threaded)
		 *
		 * The REAL protection comes from PostgreSQL's atomic UPDATE in production.
		 * These tests validate the code pattern, not the database's atomicity guarantees.
		 */

		it('should use atomic UPDATE pattern with conditions', async () => {
			const testIP = '192.168.1.999';

			// First request should insert successfully
			const result1 = await checkLoginRateLimitByIP(testIP);
			expect(result1.allowed).toBe(true);

			// Subsequent requests should use UPDATE
			for (let i = 0; i < 4; i++) {
				const result = await checkLoginRateLimitByIP(testIP);
				expect(result.allowed).toBe(true);
			}

			// 6th request should be blocked
			const blocked = await checkLoginRateLimitByIP(testIP);
			expect(blocked.allowed).toBe(false);

			// Final count should be exactly 5 (not higher due to race conditions)
			const entry = rateLimits.get(`ratelimit:login:ip:${testIP}`);
			expect(entry).toBeDefined();
			expect(entry?.count).toBe(5);
		});

		it('should never exceed maxAttempts even with concurrent requests', async () => {
			const testIP = '192.168.1.1000';

			// Send many concurrent requests
			await Promise.all(Array.from({ length: 50 }, () => checkLoginRateLimitByIP(testIP)));

			// CRITICAL: Final count must never exceed maxAttempts (5)
			// This verifies the atomic UPDATE's .lt(maxAttempts) condition works
			const entry = rateLimits.get(`ratelimit:login:ip:${testIP}`);
			expect(entry?.count).toBeLessThanOrEqual(5);
		});

		it('should isolate rate limits per key (different IPs)', async () => {
			const ips = ['192.168.1.2001', '192.168.1.2002', '192.168.1.2003'];

			// Each IP sends concurrent requests
			await Promise.all(
				ips.map((ip) => Promise.all(Array.from({ length: 10 }, () => checkLoginRateLimitByIP(ip))))
			);

			// Verify each IP's count doesn't exceed limit
			for (const ip of ips) {
				const entry = rateLimits.get(`ratelimit:login:ip:${ip}`);
				expect(entry?.count).toBeLessThanOrEqual(5);
			}
		});

		it('should enforce notification creation limits under concurrency', async () => {
			const userId = 'test-race-notification-1';

			// Send concurrent notification creation requests (limit is 10)
			await Promise.all(
				Array.from({ length: 30 }, () => checkNotificationCreateRateLimit(userId, 'teacher'))
			);

			// Final count must not exceed 10
			const entry = rateLimits.get(`notification_create:${userId}`);
			expect(entry?.count).toBeLessThanOrEqual(10);
		});

		it('should prevent count overflow with email rate limiting', async () => {
			const testEmail = 'race@example.com';

			// Send concurrent email login requests (limit is 3)
			await Promise.all(Array.from({ length: 10 }, () => checkLoginRateLimitByEmail(testEmail)));

			// CRITICAL: Final count must not exceed 3
			const entry = rateLimits.get(`ratelimit:login:email:${testEmail}`);
			expect(entry).toBeDefined();
			expect(entry?.count).toBeLessThanOrEqual(3);
		});

		it('should maintain independent counters for different keys', async () => {
			const testIP1 = '192.168.1.3001';
			const testIP2 = '192.168.1.3002';
			const testEmail1 = 'race1@example.com';
			const userId1 = 'race-user-1';

			// Run multiple operations concurrently
			await Promise.all([
				Promise.all(Array.from({ length: 10 }, () => checkLoginRateLimitByIP(testIP1))),
				Promise.all(Array.from({ length: 10 }, () => checkLoginRateLimitByIP(testIP2))),
				Promise.all(Array.from({ length: 6 }, () => checkLoginRateLimitByEmail(testEmail1))),
				Promise.all(
					Array.from({ length: 15 }, () => checkNotificationCreateRateLimit(userId1, 'teacher'))
				)
			]);

			// Verify each key's count doesn't exceed its limit
			expect(rateLimits.get(`ratelimit:login:ip:${testIP1}`)?.count).toBeLessThanOrEqual(5);
			expect(rateLimits.get(`ratelimit:login:ip:${testIP2}`)?.count).toBeLessThanOrEqual(5);
			expect(rateLimits.get(`ratelimit:login:email:${testEmail1}`)?.count).toBeLessThanOrEqual(3);
			expect(rateLimits.get(`notification_create:${userId1}`)?.count).toBeLessThanOrEqual(10);
		});
	});
});
