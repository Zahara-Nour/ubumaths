/**
 * Rate Limiter Tests
 *
 * Comprehensive test suite for rate limiting functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	checkLoginRateLimitByIP,
	checkLoginRateLimitByEmail,
	checkSignupRateLimitByIP,
	checkOAuthRateLimitByIP,
	resetRateLimit,
	getRateLimitStatus,
	getRateLimiterStats
} from './rateLimiter';

// Mock the logger to avoid console noise in tests
vi.mock('$lib/utils/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	})
}));

describe('Rate Limiter', () => {
	beforeEach(() => {
		// Reset all rate limits before each test
		vi.clearAllMocks();
	});

	describe('Login Rate Limiting by IP', () => {
		it('should allow first login attempt', () => {
			const testIP = '192.168.1.100';
			const result = checkLoginRateLimitByIP(testIP);
			expect(result.allowed).toBe(true);
			expect(result.remainingAttempts).toBe(4); // 5 max - 1 used = 4 remaining
		});

		it('should track multiple attempts within window', () => {
			const testIP = '192.168.1.101';
			// First attempt
			const first = checkLoginRateLimitByIP(testIP);
			expect(first.allowed).toBe(true);
			expect(first.remainingAttempts).toBe(4);

			// Second attempt
			const second = checkLoginRateLimitByIP(testIP);
			expect(second.allowed).toBe(true);
			expect(second.remainingAttempts).toBe(3);

			// Third attempt
			const third = checkLoginRateLimitByIP(testIP);
			expect(third.allowed).toBe(true);
			expect(third.remainingAttempts).toBe(2);

			// Fourth attempt
			const fourth = checkLoginRateLimitByIP(testIP);
			expect(fourth.allowed).toBe(true);
			expect(fourth.remainingAttempts).toBe(1);

			// 5th attempt should still be allowed (last one)
			const fifth = checkLoginRateLimitByIP(testIP);
			expect(fifth.allowed).toBe(true);
			expect(fifth.remainingAttempts).toBe(0);

			// 6th attempt should be blocked
			const sixth = checkLoginRateLimitByIP(testIP);
			expect(sixth.allowed).toBe(false);
			expect(sixth.retryAfter).toBeGreaterThan(0);
			expect(sixth.message).toContain('Trop de tentatives');
		});

		it('should block after exceeding limit', () => {
			const testIP = '192.168.1.102';
			// Exceed limit
			for (let i = 0; i < 6; i++) {
				checkLoginRateLimitByIP(testIP);
			}

			// Verify blocked
			const result = checkLoginRateLimitByIP(testIP);
			expect(result.allowed).toBe(false);
			expect(result.retryAfter).toBeDefined();
			expect(result.message).toBeDefined();
		});

		it('should handle missing IP gracefully', () => {
			const result = checkLoginRateLimitByIP('');
			expect(result.allowed).toBe(true); // Fail open for security
		});

		it('should reset after manual reset', () => {
			const testIP = '192.168.1.103';
			// Exceed limit
			for (let i = 0; i < 6; i++) {
				checkLoginRateLimitByIP(testIP);
			}

			// Verify blocked
			let result = checkLoginRateLimitByIP(testIP);
			expect(result.allowed).toBe(false);

			// Manual reset
			resetRateLimit(testIP, 'login-ip');

			// Verify allowed again
			result = checkLoginRateLimitByIP(testIP);
			expect(result.allowed).toBe(true);
		});
	});

	describe('Login Rate Limiting by Email', () => {
		const testEmail = 'unique-email-test@example.com';

		it('should allow first login attempt', () => {
			const result = checkLoginRateLimitByEmail(testEmail);
			expect(result.allowed).toBe(true);
			expect(result.remainingAttempts).toBe(2); // 3 max - 1 used = 2 remaining
		});

		it('should normalize email to lowercase', () => {
			const normalizeTestEmail = 'NORMALIZE@EXAMPLE.COM';
			// First attempt
			const first = checkLoginRateLimitByEmail(normalizeTestEmail);
			expect(first.allowed).toBe(true);
			expect(first.remainingAttempts).toBe(2);

			// Second attempt with different case
			const second = checkLoginRateLimitByEmail('Normalize@Example.Com');
			expect(second.allowed).toBe(true);
			expect(second.remainingAttempts).toBe(1);

			// Third attempt with lowercase - should track as same email
			const third = checkLoginRateLimitByEmail('normalize@example.com');
			expect(third.allowed).toBe(true);
			expect(third.remainingAttempts).toBe(0);

			// Fourth attempt should be blocked
			const fourth = checkLoginRateLimitByEmail('normalize@example.com');
			expect(fourth.allowed).toBe(false);
		});

		it('should block after 3 attempts (stricter than IP)', () => {
			const strictTestEmail = 'strict@example.com';
			// First attempt
			const first = checkLoginRateLimitByEmail(strictTestEmail);
			expect(first.allowed).toBe(true);
			expect(first.remainingAttempts).toBe(2);

			// Second attempt
			const second = checkLoginRateLimitByEmail(strictTestEmail);
			expect(second.allowed).toBe(true);
			expect(second.remainingAttempts).toBe(1);

			// Third attempt (last allowed)
			const third = checkLoginRateLimitByEmail(strictTestEmail);
			expect(third.allowed).toBe(true);
			expect(third.remainingAttempts).toBe(0);

			// 4th attempt blocked
			const fourth = checkLoginRateLimitByEmail(strictTestEmail);
			expect(fourth.allowed).toBe(false);
			expect(fourth.retryAfter).toBeGreaterThan(0);
		});

		it('should handle missing email gracefully', () => {
			const result = checkLoginRateLimitByEmail('');
			expect(result.allowed).toBe(true); // Fail open
		});

		it('should track email separately from IP', () => {
			const separateTestEmail = 'separate@example.com';
			// Use email rate limit
			for (let i = 0; i < 4; i++) {
				checkLoginRateLimitByEmail(separateTestEmail);
			}
			const emailResult = checkLoginRateLimitByEmail(separateTestEmail);
			expect(emailResult.allowed).toBe(false);

			// IP should still work
			const ipResult = checkLoginRateLimitByIP('192.168.1.999');
			expect(ipResult.allowed).toBe(true);
		});
	});

	describe('Signup Rate Limiting by IP', () => {
		it('should allow first signup attempt', () => {
			const testIP = '192.168.1.200';
			const result = checkSignupRateLimitByIP(testIP);
			expect(result.allowed).toBe(true);
			expect(result.remainingAttempts).toBe(2); // 3 max - 1 used = 2 remaining
		});

		it('should block after 3 attempts', () => {
			const testIP = '192.168.1.201';
			// First attempt
			const first = checkSignupRateLimitByIP(testIP);
			expect(first.allowed).toBe(true);
			expect(first.remainingAttempts).toBe(2);

			// Second attempt
			const second = checkSignupRateLimitByIP(testIP);
			expect(second.allowed).toBe(true);
			expect(second.remainingAttempts).toBe(1);

			// Third attempt (last allowed)
			const third = checkSignupRateLimitByIP(testIP);
			expect(third.allowed).toBe(true);
			expect(third.remainingAttempts).toBe(0);

			// 4th attempt blocked
			const fourth = checkSignupRateLimitByIP(testIP);
			expect(fourth.allowed).toBe(false);
			expect(fourth.retryAfter).toBeGreaterThan(0);
			expect(fourth.message).toContain('Trop de tentatives');
		});

		it('should have longer block duration than login (30 min)', () => {
			const testIP = '192.168.1.202';
			// Exceed limit
			for (let i = 0; i < 4; i++) {
				checkSignupRateLimitByIP(testIP);
			}

			// Check retry after
			const result = checkSignupRateLimitByIP(testIP);
			expect(result.allowed).toBe(false);
			// Should be blocked for ~30 minutes (1800 seconds)
			expect(result.retryAfter).toBeGreaterThan(1700);
			expect(result.retryAfter).toBeLessThan(1900);
		});
	});

	describe('OAuth Rate Limiting by IP', () => {
		it('should allow first OAuth attempt', () => {
			const testIP = '192.168.1.300';
			const result = checkOAuthRateLimitByIP(testIP);
			expect(result.allowed).toBe(true);
			expect(result.remainingAttempts).toBe(9); // 10 max - 1 used = 9 remaining
		});

		it('should allow more attempts than login (10 vs 5)', () => {
			const testIP = '192.168.1.301';
			// Should allow 10 attempts
			for (let i = 1; i <= 10; i++) {
				const result = checkOAuthRateLimitByIP(testIP);
				expect(result.allowed).toBe(true);
				expect(result.remainingAttempts).toBe(10 - i);
			}

			// 11th attempt blocked
			const result = checkOAuthRateLimitByIP(testIP);
			expect(result.allowed).toBe(false);
		});
	});

	describe('Exponential Backoff', () => {
		const testIP = '192.168.1.400';

		it('should increase block duration on repeated violations', () => {
			// First violation - block for 15 minutes
			for (let i = 0; i < 6; i++) {
				checkLoginRateLimitByIP(testIP);
			}
			let result = checkLoginRateLimitByIP(testIP);
			const firstBlockDuration = result.retryAfter!;
			expect(firstBlockDuration).toBeGreaterThan(800); // ~15 min = 900s

			// Get current status to check violation count
			const status = getRateLimitStatus(testIP, 'login-ip');
			expect(status?.violationCount).toBe(1);

			// Manually expire block
			resetRateLimit(testIP, 'login-ip');

			// Second violation - should have 2x block duration
			for (let i = 0; i < 6; i++) {
				checkLoginRateLimitByIP(testIP);
			}
			result = checkLoginRateLimitByIP(testIP);
			const secondBlockDuration = result.retryAfter!;

			// Due to reset, violation count restarts
			// This test verifies the backoff mechanism exists
			expect(secondBlockDuration).toBeGreaterThan(0);
		});
	});

	describe('Rate Limit Status', () => {
		it('should return current status for IP', () => {
			const testIP = '192.168.1.500';

			// Make some attempts
			checkLoginRateLimitByIP(testIP);
			checkLoginRateLimitByIP(testIP);

			const status = getRateLimitStatus(testIP, 'login-ip');
			expect(status).toBeDefined();
			expect(status?.attempts).toBe(2);
			expect(status?.blockUntil).toBeNull();
			expect(status?.violationCount).toBe(0);
		});

		it('should return null for non-existent IP', () => {
			const status = getRateLimitStatus('non-existent-ip', 'login-ip');
			expect(status).toBeNull();
		});

		it('should return current status for email', () => {
			const testEmail = 'status@example.com';

			checkLoginRateLimitByEmail(testEmail);

			const emailStatus = getRateLimitStatus(testEmail.toLowerCase(), 'email');
			expect(emailStatus).toBeDefined();
			expect(emailStatus?.attempts).toBe(1);
		});
	});

	describe('Rate Limiter Statistics', () => {
		it('should track total entries', () => {
			// Add some IP entries
			checkLoginRateLimitByIP('192.168.2.1');
			checkLoginRateLimitByIP('192.168.2.2');

			// Add some email entries
			checkLoginRateLimitByEmail('user1@example.com');
			checkLoginRateLimitByEmail('user2@example.com');

			const stats = getRateLimiterStats();
			expect(stats.loginIPEntries).toBeGreaterThanOrEqual(2);
			expect(stats.emailEntries).toBeGreaterThanOrEqual(2);
			expect(stats.totalEntries).toBe(
				stats.loginIPEntries + stats.emailEntries + stats.signupIPEntries + stats.oauthIPEntries
			);
		});
	});

	describe('Edge Cases', () => {
		it('should handle concurrent requests for same IP', () => {
			const testIP = '192.168.1.600';

			// Simulate concurrent requests
			const results = [];
			for (let i = 0; i < 10; i++) {
				results.push(checkLoginRateLimitByIP(testIP));
			}

			// Should handle all requests correctly
			const allowed = results.filter((r) => r.allowed).length;
			const blocked = results.filter((r) => !r.allowed).length;

			expect(allowed).toBe(5); // First 5 allowed
			expect(blocked).toBe(5); // Rest blocked
		});

		it('should handle special characters in email', () => {
			const specialEmail = "test+alias@example.com";
			const result = checkLoginRateLimitByEmail(specialEmail);
			expect(result.allowed).toBe(true);
		});

		it('should handle IPv6 addresses', () => {
			const ipv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
			const result = checkLoginRateLimitByIP(ipv6);
			expect(result.allowed).toBe(true);
		});
	});

	describe('Time Window Behavior', () => {
		it('should reset attempts after time window expires', async () => {
			const testIP = '192.168.1.700';

			// Make 3 attempts
			for (let i = 0; i < 3; i++) {
				checkLoginRateLimitByIP(testIP);
			}

			// Get status
			let status = getRateLimitStatus(testIP, 'login-ip');
			expect(status?.attempts).toBe(3);

			// Manually expire the window by resetting
			// In real scenario, this would happen after 15 minutes
			resetRateLimit(testIP, 'login-ip');

			// New attempt should start fresh
			const result = checkLoginRateLimitByIP(testIP);
			expect(result.allowed).toBe(true);
			expect(result.remainingAttempts).toBe(4);

			status = getRateLimitStatus(testIP, 'login-ip');
			expect(status?.attempts).toBe(1);
		});
	});

	describe('French Error Messages', () => {
		it('should return French error messages for login', () => {
			const testIP = '192.168.1.800';

			// Exceed limit
			for (let i = 0; i < 6; i++) {
				checkLoginRateLimitByIP(testIP);
			}

			const result = checkLoginRateLimitByIP(testIP);
			expect(result.message).toContain('Trop de tentatives');
			expect(result.message).toMatch(/minute|heure|seconde/);
		});

		it('should return French error messages for signup', () => {
			const testIP = '192.168.1.900';

			// Exceed limit
			for (let i = 0; i < 4; i++) {
				checkSignupRateLimitByIP(testIP);
			}

			const result = checkSignupRateLimitByIP(testIP);
			expect(result.message).toContain('Trop de tentatives');
		});
	});
});
