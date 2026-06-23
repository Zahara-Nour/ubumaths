/**
 * Unit tests for CSRF Protection utilities
 */

import { describe, it, expect } from 'vitest';
import { validateOrigin, isValidOrigin } from '../csrfProtection';

describe('CSRF Protection', () => {
	describe('validateOrigin', () => {
		it('should allow requests from production domain', () => {
			const request = new Request('https://chiph.re/api/test', {
				method: 'POST',
				headers: { Origin: 'https://chiph.re' }
			});

			expect(() => validateOrigin(request)).not.toThrow();
		});

		it('should allow requests from www.chiph.re', () => {
			const request = new Request('https://www.chiph.re/api/test', {
				method: 'POST',
				headers: { Origin: 'https://www.chiph.re' }
			});

			expect(() => validateOrigin(request)).not.toThrow();
		});

		it('should allow requests from Vercel production deployment', () => {
			const request = new Request('https://chiphre-6op8.vercel.app/api/test', {
				method: 'POST',
				headers: { Origin: 'https://chiphre-6op8.vercel.app' }
			});

			expect(() => validateOrigin(request)).not.toThrow();
		});

		it('should allow requests from Vercel preview deployments', () => {
			const request = new Request('https://chiphre-pr-123.vercel.app/api/test', {
				method: 'POST',
				headers: { Origin: 'https://chiphre-pr-123.vercel.app' }
			});

			expect(() => validateOrigin(request)).not.toThrow();
		});

		it('should allow requests from localhost:5173', () => {
			const request = new Request('http://localhost:5173/api/test', {
				method: 'POST',
				headers: { Origin: 'http://localhost:5173' }
			});

			expect(() => validateOrigin(request)).not.toThrow();
		});

		it('should allow requests from localhost:5175 (Claude port)', () => {
			const request = new Request('http://localhost:5175/api/test', {
				method: 'POST',
				headers: { Origin: 'http://localhost:5175' }
			});

			expect(() => validateOrigin(request)).not.toThrow();
		});

		it('should block requests from evil.com', () => {
			const request = new Request('https://chiph.re/api/test', {
				method: 'POST',
				headers: { Origin: 'https://evil.com' }
			});

			expect(() => validateOrigin(request)).toThrow();
		});

		it('should block requests from malicious subdomain', () => {
			const request = new Request('https://chiph.re/api/test', {
				method: 'POST',
				headers: { Origin: 'https://phishing.chiph.re' }
			});

			expect(() => validateOrigin(request)).toThrow();
		});

		it('should block requests without origin or referer', () => {
			const request = new Request('https://chiph.re/api/test', {
				method: 'POST'
			});

			expect(() => validateOrigin(request)).toThrow();
		});

		it('should allow requests with valid referer when origin is missing', () => {
			const request = new Request('https://chiph.re/api/test', {
				method: 'POST',
				headers: { Referer: 'https://chiph.re/some/page' }
			});

			expect(() => validateOrigin(request)).not.toThrow();
		});

		it('should block requests with invalid referer when origin is missing', () => {
			const request = new Request('https://chiph.re/api/test', {
				method: 'POST',
				headers: { Referer: 'https://evil.com/page' }
			});

			expect(() => validateOrigin(request)).toThrow();
		});
	});

	describe('isValidOrigin', () => {
		it('should return true for valid origin', () => {
			const request = new Request('https://chiph.re/api/test', {
				method: 'POST',
				headers: { Origin: 'https://chiph.re' }
			});

			expect(isValidOrigin(request)).toBe(true);
		});

		it('should return false for invalid origin', () => {
			const request = new Request('https://chiph.re/api/test', {
				method: 'POST',
				headers: { Origin: 'https://evil.com' }
			});

			expect(isValidOrigin(request)).toBe(false);
		});

		it('should return false for missing headers', () => {
			const request = new Request('https://chiph.re/api/test', {
				method: 'POST'
			});

			expect(isValidOrigin(request)).toBe(false);
		});
	});
});
