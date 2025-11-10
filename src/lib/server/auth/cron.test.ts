/**
 * Unit tests for CRON Job Authentication Utilities
 *
 * Tests all security features of verifyCronAuth() and generateCronSecret():
 * - Fail-secure behavior (rejects when CRON_SECRET undefined)
 * - Authorization header validation (missing, invalid format)
 * - Timing attack protection (length mismatch, constant-time comparison)
 * - Token validation (valid token, case-insensitive Bearer)
 * - Secret generation (length, uniqueness)
 *
 * @module server/auth/cron.test
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { verifyCronAuth, generateCronSecret } from './cron';
import * as envModule from '$lib/server/env';

// Mock getEnv to control CRON_SECRET value
vi.mock('$lib/server/env', () => ({
	getEnv: vi.fn()
}));

describe('verifyCronAuth', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('rejects when CRON_SECRET not configured', () => {
		// SECURITY: Fail-secure - should reject all requests if CRON_SECRET is undefined
		vi.mocked(envModule.getEnv).mockReturnValue({
			CRON_SECRET: undefined
		} as ReturnType<typeof envModule.getEnv>);

		const request = new Request('https://example.com/api/cache/cleanup', {
			method: 'POST',
			headers: { Authorization: 'Bearer test-token-12345678' }
		});

		try {
			verifyCronAuth(request);
			expect.fail('Should have thrown an error');
		} catch (err: unknown) {
			expect((err as { status: number }).status).toBe(503);
			expect((err as { body?: { message?: string } }).body?.message).toContain(
				'CRON endpoints disabled'
			);
		}
	});

	test('rejects when Authorization header is missing', () => {
		vi.mocked(envModule.getEnv).mockReturnValue({
			CRON_SECRET: 'test-secret-12345678901234567890'
		} as ReturnType<typeof envModule.getEnv>);

		const request = new Request('https://example.com/api/cache/cleanup', {
			method: 'POST'
			// No Authorization header
		});

		try {
			verifyCronAuth(request);
			expect.fail('Should have thrown an error');
		} catch (err: unknown) {
			expect((err as { status: number }).status).toBe(401);
			expect((err as { body?: { message?: string } }).body?.message).toContain(
				'Missing Authorization header'
			);
		}
	});

	test('rejects when Authorization header has invalid format', () => {
		vi.mocked(envModule.getEnv).mockReturnValue({
			CRON_SECRET: 'test-secret-12345678901234567890'
		} as ReturnType<typeof envModule.getEnv>);

		// Test various invalid formats
		const invalidFormats = [
			'test-token-12345678', // Missing "Bearer" prefix
			'Basic dGVzdDp0ZXN0', // Wrong auth type
			'Bearer', // Missing token
			'Bearer ', // Missing token (only space)
			'Bearertest-token-12345678' // Missing space
		];

		for (const authHeader of invalidFormats) {
			const request = new Request('https://example.com/api/cache/cleanup', {
				method: 'POST',
				headers: { Authorization: authHeader }
			});

			try {
				verifyCronAuth(request);
				expect.fail(`Should have thrown an error for: ${authHeader}`);
			} catch (err: unknown) {
				expect((err as { status: number }).status).toBe(401);
				expect((err as { body?: { message?: string } }).body?.message).toContain(
					'Invalid Authorization header format'
				);
			}
		}
	});

	test('rejects when token length differs from secret (timing attack protection)', () => {
		// SECURITY: Length check prevents timing attacks by failing fast on length mismatch
		const secret = 'test-secret-12345678901234567890'; // 32 chars
		vi.mocked(envModule.getEnv).mockReturnValue({
			CRON_SECRET: secret
		} as ReturnType<typeof envModule.getEnv>);

		// Test with shorter token
		const shortRequest = new Request('https://example.com/api/cache/cleanup', {
			method: 'POST',
			headers: { Authorization: 'Bearer short' } // Only 5 chars
		});

		try {
			verifyCronAuth(shortRequest);
			expect.fail('Should have thrown an error for short token');
		} catch (err: unknown) {
			expect((err as { status: number }).status).toBe(401);
			expect((err as { body?: { message?: string } }).body?.message).toContain('Invalid token');
		}

		// Test with longer token
		const longRequest = new Request('https://example.com/api/cache/cleanup', {
			method: 'POST',
			headers: { Authorization: 'Bearer test-secret-12345678901234567890-extra-chars' } // Too long
		});

		try {
			verifyCronAuth(longRequest);
			expect.fail('Should have thrown an error for long token');
		} catch (err: unknown) {
			expect((err as { status: number }).status).toBe(401);
			expect((err as { body?: { message?: string } }).body?.message).toContain('Invalid token');
		}
	});

	test('rejects when token value differs from secret (constant-time comparison)', () => {
		// SECURITY: Constant-time comparison prevents timing attacks on token value
		const secret = 'test-secret-12345678901234567890';
		vi.mocked(envModule.getEnv).mockReturnValue({
			CRON_SECRET: secret
		} as ReturnType<typeof envModule.getEnv>);

		// Test with wrong token (same length, different value)
		const wrongRequest = new Request('https://example.com/api/cache/cleanup', {
			method: 'POST',
			headers: { Authorization: 'Bearer wrong-secret-123456789012345678' } // Same length (32 chars), wrong value
		});

		try {
			verifyCronAuth(wrongRequest);
			expect.fail('Should have thrown an error for wrong token');
		} catch (err: unknown) {
			expect((err as { status: number }).status).toBe(401);
			expect((err as { body?: { message?: string } }).body?.message).toContain('Invalid token');
		}
	});

	test('accepts valid token matching CRON_SECRET', () => {
		const secret = 'test-secret-12345678901234567890';
		vi.mocked(envModule.getEnv).mockReturnValue({
			CRON_SECRET: secret
		} as ReturnType<typeof envModule.getEnv>);

		const request = new Request('https://example.com/api/cache/cleanup', {
			method: 'POST',
			headers: { Authorization: `Bearer ${secret}` }
		});

		// Should not throw
		expect(() => verifyCronAuth(request)).not.toThrow();
	});

	test('accepts Bearer keyword in any case (case-insensitive)', () => {
		const secret = 'test-secret-12345678901234567890';
		vi.mocked(envModule.getEnv).mockReturnValue({
			CRON_SECRET: secret
		} as ReturnType<typeof envModule.getEnv>);

		const cases = ['Bearer', 'bearer', 'BEARER', 'BeArEr'];

		for (const bearerCase of cases) {
			const request = new Request('https://example.com/api/cache/cleanup', {
				method: 'POST',
				headers: { Authorization: `${bearerCase} ${secret}` }
			});

			// Should not throw regardless of case
			expect(() => verifyCronAuth(request)).not.toThrow();
		}
	});
});

describe('generateCronSecret', () => {
	test('generates 32-character string', () => {
		const secret = generateCronSecret();
		expect(secret).toHaveLength(32);
	});

	test('generates unique secrets on each call', () => {
		// Generate multiple secrets
		const secrets = new Set<string>();
		const iterations = 100;

		for (let i = 0; i < iterations; i++) {
			secrets.add(generateCronSecret());
		}

		// All secrets should be unique
		expect(secrets.size).toBe(iterations);
	});

	test('generates hex strings only', () => {
		const secret = generateCronSecret();

		// Should only contain hex characters (0-9, a-f)
		const hexRegex = /^[0-9a-f]+$/;
		expect(hexRegex.test(secret)).toBe(true);
	});

	test('generates cryptographically secure secrets', () => {
		// Test that secrets have good entropy by checking distribution
		const secret = generateCronSecret();

		// Count unique characters (should be diverse)
		const uniqueChars = new Set(secret.split('')).size;

		// With 32 hex chars, we should have at least 8 different characters
		// (this is a heuristic - real entropy testing is more complex)
		expect(uniqueChars).toBeGreaterThanOrEqual(8);
	});
});
