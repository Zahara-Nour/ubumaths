/**
 * CSRF Protection Utilities
 *
 * Provides manual CSRF validation for API routes that need explicit origin checking.
 * SvelteKit automatically validates origin headers for form actions and most routes
 * when csrf.checkOrigin is enabled in svelte.config.js.
 *
 * Use these utilities when you need additional validation or custom error handling.
 */

import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Allowed origins for CSRF validation
 * Production, staging, and development URLs
 */
const ALLOWED_ORIGINS = [
	// Production
	'https://ubumaths.com',
	'https://www.ubumaths.com',

	// Vercel deployments
	'https://ubumaths-6op8.vercel.app',

	// Development
	'http://localhost:5173',
	'http://localhost:5175',
	'http://127.0.0.1:5173',
	'http://127.0.0.1:5175'
];

/**
 * Validates the Origin or Referer header of a request
 *
 * @param request - The incoming request
 * @throws {error} 403 if origin is invalid or missing
 *
 * @example
 * ```ts
 * export const POST: RequestHandler = async ({ request, locals }) => {
 *   validateOrigin(request);
 *   // ... rest of handler
 * };
 * ```
 */
export function validateOrigin(request: Request): void {
	const origin = request.headers.get('origin');
	const referer = request.headers.get('referer');

	// Check origin first (more reliable)
	if (origin) {
		if (!isAllowedOrigin(origin)) {
			console.warn(`[CSRF] Blocked request from invalid origin: ${origin}`);
			throw error(403, 'Invalid origin');
		}
		return;
	}

	// Fallback to referer if origin is not present
	if (referer) {
		const refererOrigin = extractOriginFromUrl(referer);
		if (refererOrigin && !isAllowedOrigin(refererOrigin)) {
			console.warn(`[CSRF] Blocked request from invalid referer: ${referer}`);
			throw error(403, 'Invalid referer');
		}
		return;
	}

	// Neither origin nor referer present - likely API client or CORS issue
	console.warn('[CSRF] Request missing both origin and referer headers');
	throw error(403, 'Missing origin headers');
}

/**
 * Validates CSRF for a RequestEvent (convenience wrapper)
 *
 * @param event - The SvelteKit RequestEvent
 * @throws {error} 403 if origin is invalid or missing
 *
 * @example
 * ```ts
 * export const POST: RequestHandler = async (event) => {
 *   validateRequestOrigin(event);
 *   // ... rest of handler
 * };
 * ```
 */
export function validateRequestOrigin(event: RequestEvent): void {
	validateOrigin(event.request);
}

/**
 * Checks if an origin is in the allowed list
 *
 * @param origin - The origin to check
 * @returns true if allowed, false otherwise
 */
function isAllowedOrigin(origin: string): boolean {
	// Handle Vercel preview deployments (pr-*.vercel.app)
	if (origin.includes('ubumaths') && origin.endsWith('.vercel.app')) {
		return true;
	}

	return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Extracts origin from a full URL
 *
 * @param url - The URL string
 * @returns The origin (protocol + host) or null if invalid
 */
function extractOriginFromUrl(url: string): string | null {
	try {
		const parsed = new URL(url);
		return `${parsed.protocol}//${parsed.host}`;
	} catch {
		return null;
	}
}

/**
 * Validates CSRF for state-changing HTTP methods (POST, PUT, DELETE, PATCH)
 * Allows GET, HEAD, and OPTIONS to pass through
 *
 * @param request - The incoming request
 * @throws {error} 403 if method requires validation and origin is invalid
 *
 * @example
 * ```ts
 * // Use in a route that handles multiple methods
 * export const handler: RequestHandler = async ({ request, locals }) => {
 *   validateOriginForMutatingMethods(request);
 *
 *   if (request.method === 'GET') {
 *     // ... handle GET
 *   } else if (request.method === 'POST') {
 *     // ... handle POST
 *   }
 * };
 * ```
 */
export function validateOriginForMutatingMethods(request: Request): void {
	const method = request.method.toUpperCase();

	// Only validate state-changing methods
	if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
		validateOrigin(request);
	}
}

/**
 * Type guard to check if a request is from an allowed origin
 * Useful for conditional logic without throwing errors
 *
 * @param request - The incoming request
 * @returns true if origin is valid, false otherwise
 *
 * @example
 * ```ts
 * export const POST: RequestHandler = async ({ request, locals }) => {
 *   if (!isValidOrigin(request)) {
 *     // Custom error handling
 *     return json({ error: 'Invalid request source' }, { status: 403 });
 *   }
 *   // ... rest of handler
 * };
 * ```
 */
export function isValidOrigin(request: Request): boolean {
	try {
		validateOrigin(request);
		return true;
	} catch {
		return false;
	}
}
