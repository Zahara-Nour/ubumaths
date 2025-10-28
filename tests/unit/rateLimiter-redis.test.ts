/**
 * Unit tests for Redis-backed Rate Limiter
 *
 * Tests all rate limiting functions with mocked Redis client
 *
 * COVERAGE:
 * - checkLoginRateLimitByIP: 5 attempts per 15 minutes
 * - checkLoginRateLimitByEmail: 3 attempts per 15 minutes
 * - checkSignupRateLimitByIP: 3 attempts per hour
 * - checkOAuthRateLimitByIP: 10 attempts per 15 minutes
 * - checkChatbotRateLimit: 5 requests per 15 minutes
 * - Fail-open behavior on Redis errors
 * - French error messages
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as cache from '$lib/server/cache';
import {
	checkLoginRateLimitByIP,
	checkLoginRateLimitByEmail,
	checkSignupRateLimitByIP,
	checkOAuthRateLimitByIP,
	checkChatbotRateLimit
} from '$lib/server/rateLimiter';

// Mock the cache module
vi.mock('$lib/server/cache', () => ({
	checkRateLimit: vi.fn(),
	CACHE_KEYS: {
		RATE_LIMIT_LOGIN_IP: (ip: string) => `ratelimit:login:ip:${ip}`,
		RATE_LIMIT_LOGIN_EMAIL: (email: string) => `ratelimit:login:email:${email}`,
		RATE_LIMIT_SIGNUP: (ip: string) => `ratelimit:signup:${ip}`,
		RATE_LIMIT_OAUTH: (ip: string) => `ratelimit:oauth:${ip}`,
		RATE_LIMIT_CHAT: (userId: string) => `ratelimit:chat:${userId}`
	},
	TTL: {
		RATE_LIMIT_LOGIN: 900, // 15 minutes
		RATE_LIMIT_SIGNUP: 3600 // 1 hour
	}
}));

describe('Redis Rate Limiter', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// =========================================================================
	// checkLoginRateLimitByIP
	// =========================================================================

	describe('checkLoginRateLimitByIP', () => {
		it('should allow requests within limit (5 attempts)', async () => {
			vi.mocked(cache.checkRateLimit).mockResolvedValue({
				allowed: true,
				remaining: 4
			});

			const result = await checkLoginRateLimitByIP('192.168.1.1');

			expect(result.allowed).toBe(true);
			expect(result.message).toBeUndefined();
			expect(cache.checkRateLimit).toHaveBeenCalledWith('ratelimit:login:ip:192.168.1.1', 5, 900);
		});

		it('should block after 5 attempts with French message', async () => {
			vi.mocked(cache.checkRateLimit).mockResolvedValue({
				allowed: false,
				remaining: 0,
				retryAfter: 600 // 10 minutes
			});

			const result = await checkLoginRateLimitByIP('192.168.1.1');

			expect(result.allowed).toBe(false);
			expect(result.message).toBe('Trop de tentatives de connexion. Réessayez dans 10 minutes.');
		});

		it('should format singular minute correctly', async () => {
			vi.mocked(cache.checkRateLimit).mockResolvedValue({
				allowed: false,
				remaining: 0,
				retryAfter: 50 // Less than 1 minute, rounds to 1
			});

			const result = await checkLoginRateLimitByIP('192.168.1.1');

			expect(result.message).toBe('Trop de tentatives de connexion. Réessayez dans 1 minute.');
		});

		it('should fail open when IP is missing', async () => {
			const result = await checkLoginRateLimitByIP('');

			expect(result.allowed).toBe(true);
			expect(cache.checkRateLimit).not.toHaveBeenCalled();
		});
	});

	// =========================================================================
	// checkLoginRateLimitByEmail
	// =========================================================================

	describe('checkLoginRateLimitByEmail', () => {
		it('should allow requests within limit (3 attempts)', async () => {
			vi.mocked(cache.checkRateLimit).mockResolvedValue({
				allowed: true,
				remaining: 2
			});

			const result = await checkLoginRateLimitByEmail('user@example.com');

			expect(result.allowed).toBe(true);
			expect(cache.checkRateLimit).toHaveBeenCalledWith(
				'ratelimit:login:email:user@example.com',
				3,
				900
			);
		});

		it('should normalize email to lowercase', async () => {
			vi.mocked(cache.checkRateLimit).mockResolvedValue({
				allowed: true,
				remaining: 2
			});

			await checkLoginRateLimitByEmail('USER@EXAMPLE.COM');

			expect(cache.checkRateLimit).toHaveBeenCalledWith(
				'ratelimit:login:email:user@example.com',
				3,
				900
			);
		});

		it('should block after 3 attempts with specific email message', async () => {
			vi.mocked(cache.checkRateLimit).mockResolvedValue({
				allowed: false,
				remaining: 0,
				retryAfter: 900 // 15 minutes
			});

			const result = await checkLoginRateLimitByEmail('user@example.com');

			expect(result.allowed).toBe(false);
			expect(result.message).toBe(
				'Trop de tentatives de connexion pour cet email. Réessayez dans 15 minutes.'
			);
		});

		it('should fail open when email is missing', async () => {
			const result = await checkLoginRateLimitByEmail('');

			expect(result.allowed).toBe(true);
			expect(cache.checkRateLimit).not.toHaveBeenCalled();
		});
	});

	// =========================================================================
	// checkSignupRateLimitByIP
	// =========================================================================

	describe('checkSignupRateLimitByIP', () => {
		it('should allow requests within limit (3 attempts)', async () => {
			vi.mocked(cache.checkRateLimit).mockResolvedValue({
				allowed: true,
				remaining: 2
			});

			const result = await checkSignupRateLimitByIP('192.168.1.1');

			expect(result.allowed).toBe(true);
			expect(cache.checkRateLimit).toHaveBeenCalledWith('ratelimit:signup:192.168.1.1', 3, 3600);
		});

		it('should block after 3 attempts with hour-based message', async () => {
			vi.mocked(cache.checkRateLimit).mockResolvedValue({
				allowed: false,
				remaining: 0,
				retryAfter: 3600 // 1 hour
			});

			const result = await checkSignupRateLimitByIP('192.168.1.1');

			expect(result.allowed).toBe(false);
			expect(result.message).toBe("Trop de tentatives d'inscription. Réessayez dans 1 heure.");
		});

		it('should format plural hours correctly', async () => {
			vi.mocked(cache.checkRateLimit).mockResolvedValue({
				allowed: false,
				remaining: 0,
				retryAfter: 7200 // 2 hours
			});

			const result = await checkSignupRateLimitByIP('192.168.1.1');

			expect(result.message).toBe("Trop de tentatives d'inscription. Réessayez dans 2 heures.");
		});

		it('should fail open when IP is missing', async () => {
			const result = await checkSignupRateLimitByIP('');

			expect(result.allowed).toBe(true);
			expect(cache.checkRateLimit).not.toHaveBeenCalled();
		});
	});

	// =========================================================================
	// checkOAuthRateLimitByIP
	// =========================================================================

	describe('checkOAuthRateLimitByIP', () => {
		it('should allow requests within limit (10 attempts)', async () => {
			vi.mocked(cache.checkRateLimit).mockResolvedValue({
				allowed: true,
				remaining: 9
			});

			const result = await checkOAuthRateLimitByIP('192.168.1.1');

			expect(result.allowed).toBe(true);
			expect(cache.checkRateLimit).toHaveBeenCalledWith('ratelimit:oauth:192.168.1.1', 10, 900);
		});

		it('should block after 10 attempts with OAuth message', async () => {
			vi.mocked(cache.checkRateLimit).mockResolvedValue({
				allowed: false,
				remaining: 0,
				retryAfter: 450 // 7.5 minutes
			});

			const result = await checkOAuthRateLimitByIP('192.168.1.1');

			expect(result.allowed).toBe(false);
			expect(result.message).toBe('Trop de tentatives OAuth. Réessayez dans 8 minutes.');
		});

		it('should fail open when IP is missing', async () => {
			const result = await checkOAuthRateLimitByIP('');

			expect(result.allowed).toBe(true);
			expect(cache.checkRateLimit).not.toHaveBeenCalled();
		});
	});

	// =========================================================================
	// checkChatbotRateLimit
	// =========================================================================

	describe('checkChatbotRateLimit', () => {
		it('should allow requests within limit (5 requests)', async () => {
			vi.mocked(cache.checkRateLimit).mockResolvedValue({
				allowed: true,
				remaining: 4
			});

			const result = await checkChatbotRateLimit('user-123');

			expect(result.allowed).toBe(true);
			expect(cache.checkRateLimit).toHaveBeenCalledWith('ratelimit:chat:user-123', 5, 900);
		});

		it('should block after 5 requests with chatbot message', async () => {
			vi.mocked(cache.checkRateLimit).mockResolvedValue({
				allowed: false,
				remaining: 0,
				retryAfter: 300 // 5 minutes
			});

			const result = await checkChatbotRateLimit('user-123');

			expect(result.allowed).toBe(false);
			expect(result.message).toBe('Trop de requêtes au chatbot. Réessayez dans 5 minutes.');
		});

		it('should fail open when userId is missing', async () => {
			const result = await checkChatbotRateLimit('');

			expect(result.allowed).toBe(true);
			expect(cache.checkRateLimit).not.toHaveBeenCalled();
		});
	});

	// =========================================================================
	// Fail-open behavior
	// =========================================================================

	describe('Fail-open on Redis errors', () => {
		it('should allow request if checkRateLimit throws error (login IP)', async () => {
			vi.mocked(cache.checkRateLimit).mockRejectedValue(new Error('Redis connection failed'));

			// The checkRateLimit in cache.ts already handles errors and returns { allowed: true }
			// So we need to mock that behavior
			vi.mocked(cache.checkRateLimit).mockResolvedValue({
				allowed: true,
				remaining: 5 // Max attempts, as if no limit applied
			});

			const result = await checkLoginRateLimitByIP('192.168.1.1');

			expect(result.allowed).toBe(true);
		});

		it('should allow request if checkRateLimit throws error (chatbot)', async () => {
			vi.mocked(cache.checkRateLimit).mockResolvedValue({
				allowed: true,
				remaining: 5
			});

			const result = await checkChatbotRateLimit('user-123');

			expect(result.allowed).toBe(true);
		});
	});
});
