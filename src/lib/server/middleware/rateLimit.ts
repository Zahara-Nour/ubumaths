/**
 * Rate Limiting Middleware
 *
 * In-memory rate limiter for protecting endpoints against abuse.
 * Note: For production with multiple instances, consider Redis-based rate limiting.
 *
 * @module lib/server/middleware/rateLimit
 */

import { error } from '@sveltejs/kit';

interface RateLimitRecord {
	count: number;
	resetTime: number;
}

// In-memory store for rate limit tracking
const requestCounts = new Map<string, RateLimitRecord>();

// Cleanup old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpiredRecords(): void {
	const now = Date.now();
	if (now - lastCleanup < CLEANUP_INTERVAL) return;

	lastCleanup = now;
	for (const [key, record] of requestCounts.entries()) {
		if (now > record.resetTime) {
			requestCounts.delete(key);
		}
	}
}

/**
 * Rate limit by key (user ID, IP address, etc.)
 *
 * @param key - Unique identifier for rate limiting (e.g., `user:${userId}`, `ip:${ip}`)
 * @param maxRequests - Maximum requests allowed in window (default: 100)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @throws 429 error if rate limit exceeded
 *
 * @example
 * ```typescript
 * // Rate limit by user ID
 * rateLimit(`messages:${user.id}`, 30, 60000); // 30 per minute
 *
 * // Rate limit by IP
 * rateLimit(`errors:${clientIp}`, 20, 60000); // 20 per minute
 * ```
 */
export function rateLimit(key: string, maxRequests = 100, windowMs = 60000): void {
	cleanupExpiredRecords();

	const now = Date.now();
	const record = requestCounts.get(key);

	if (!record || now > record.resetTime) {
		requestCounts.set(key, { count: 1, resetTime: now + windowMs });
		return;
	}

	if (record.count >= maxRequests) {
		const retryAfter = Math.ceil((record.resetTime - now) / 1000);
		throw error(429, `Trop de requetes. Reessayez dans ${retryAfter} secondes.`);
	}

	record.count++;
}

/**
 * Check rate limit without throwing (returns boolean)
 *
 * @param key - Unique identifier for rate limiting
 * @param maxRequests - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(key: string, maxRequests = 100, windowMs = 60000): boolean {
	cleanupExpiredRecords();

	const now = Date.now();
	const record = requestCounts.get(key);

	if (!record || now > record.resetTime) {
		requestCounts.set(key, { count: 1, resetTime: now + windowMs });
		return true;
	}

	if (record.count >= maxRequests) {
		return false;
	}

	record.count++;
	return true;
}

/**
 * Get remaining requests for a key
 *
 * @param key - Unique identifier
 * @param maxRequests - Maximum requests allowed
 * @returns Number of remaining requests, or maxRequests if no record exists
 */
export function getRemainingRequests(key: string, maxRequests = 100): number {
	const record = requestCounts.get(key);
	if (!record || Date.now() > record.resetTime) {
		return maxRequests;
	}
	return Math.max(0, maxRequests - record.count);
}

/**
 * Reset rate limit for a key (useful for testing)
 */
export function resetRateLimit(key: string): void {
	requestCounts.delete(key);
}
