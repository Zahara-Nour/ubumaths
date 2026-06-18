/**
 * Admin Elevation — Pure Helpers Unit Tests
 * =========================================
 *
 * Covers the UNIT-TESTABLE, side-effect-free parts of the server-side admin
 * elevation (Pattern 2):
 *   - encodeElevationCookie / decodeElevationCookie round-trip
 *   - decode of malformed cookie values → null
 *   - decode of expired payloads → null
 *
 * The handle (createAdminElevationHandle) and the request-scoped admin client
 * (createAdminClient) are covered elsewhere because they have I/O side effects
 * (getUser network call, header injection); these helpers are pure.
 *
 * @module server/adminElevation.test
 */

import { describe, it, expect } from 'vitest';
import {
	ADMIN_ELEVATION_COOKIE,
	encodeElevationCookie,
	decodeElevationCookie,
	type ElevationCookiePayload
} from '../adminElevation';

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440002';
const ACCESS_TOKEN = 'header.payload.signature-pretend-jwt';

/** A payload that expires comfortably in the future (1 hour). */
function futurePayload(overrides: Partial<ElevationCookiePayload> = {}): ElevationCookiePayload {
	return {
		adminUserId: ADMIN_ID,
		accessToken: ACCESS_TOKEN,
		expiresAt: Date.now() + 3600_000,
		...overrides
	};
}

describe('ADMIN_ELEVATION_COOKIE', () => {
	it('is named without the reserved sb- prefix (must stay transparent to @supabase/ssr)', () => {
		expect(ADMIN_ELEVATION_COOKIE).toBe('ubu-admin-elevation');
		expect(ADMIN_ELEVATION_COOKIE.startsWith('sb-')).toBe(false);
	});
});

describe('encodeElevationCookie / decodeElevationCookie — round-trip', () => {
	it('decodes back exactly what was encoded', () => {
		const payload = futurePayload();
		const encoded = encodeElevationCookie(payload);

		expect(typeof encoded).toBe('string');
		expect(encoded.length).toBeGreaterThan(0);

		const decoded = decodeElevationCookie(encoded);
		expect(decoded).not.toBeNull();
		expect(decoded).toEqual(payload);
	});

	it('produces an opaque value that does not leak the raw token in plain text', () => {
		// base64url-encoded JSON: the access token must not appear verbatim.
		const encoded = encodeElevationCookie(futurePayload());
		expect(encoded).not.toContain(ACCESS_TOKEN);
	});
});

describe('decodeElevationCookie — malformed input → null', () => {
	it('returns null for an empty string', () => {
		expect(decodeElevationCookie('')).toBeNull();
	});

	it('returns null for non-base64 / garbage', () => {
		expect(decodeElevationCookie('!!!not-base64!!!')).toBeNull();
	});

	it('returns null for valid base64 that is not JSON', () => {
		const notJson = Buffer.from('this is not json', 'utf8').toString('base64url');
		expect(decodeElevationCookie(notJson)).toBeNull();
	});

	it('returns null when required fields are missing', () => {
		const missingToken = Buffer.from(
			JSON.stringify({ adminUserId: ADMIN_ID, expiresAt: Date.now() + 3600_000 }),
			'utf8'
		).toString('base64url');
		expect(decodeElevationCookie(missingToken)).toBeNull();
	});

	it('returns null when field types are wrong', () => {
		const wrongTypes = Buffer.from(
			JSON.stringify({ adminUserId: 42, accessToken: ACCESS_TOKEN, expiresAt: 'soon' }),
			'utf8'
		).toString('base64url');
		expect(decodeElevationCookie(wrongTypes)).toBeNull();
	});
});

describe('decodeElevationCookie — expiry', () => {
	it('returns null when expiresAt is in the past', () => {
		const expired = encodeElevationCookie(futurePayload({ expiresAt: Date.now() - 1 }));
		expect(decodeElevationCookie(expired)).toBeNull();
	});

	it('returns the payload when expiresAt is in the future', () => {
		const valid = encodeElevationCookie(futurePayload({ expiresAt: Date.now() + 60_000 }));
		const decoded = decodeElevationCookie(valid);
		expect(decoded).not.toBeNull();
		expect(decoded?.adminUserId).toBe(ADMIN_ID);
	});
});

describe('decodeElevationCookie — expiresAt is in MILLISECONDS (ms-vs-seconds guard)', () => {
	// The whole expiry contract (`expiresAt < Date.now()`, the elevate endpoint's
	// `expiresAtSec * 1000`, the handle's `payload.expiresAt`) assumes ms. If a
	// refactor ever passed seconds, a "1h" token would look ~50 years in the past
	// and every elevation would silently fail. Lock the unit here.
	it('round-trips a known ms value exactly (must NOT be divided/multiplied)', () => {
		// 2025-06-18T00:00:00Z in ms — a concrete, well-known value.
		const knownMs = 1_750_204_800_000;
		const encoded = encodeElevationCookie(futurePayload({ expiresAt: knownMs }));
		// Decode bypasses the freshness check (knownMs is in the future at test time
		// only if > now); assert on the raw JSON to be time-independent.
		const json = Buffer.from(encoded, 'base64url').toString('utf8');
		const raw = JSON.parse(json) as { expiresAt: number };
		expect(raw.expiresAt).toBe(knownMs);
		// Sanity: a millisecond epoch is ~13 digits and well above the 1e12 boundary
		// that separates it from a seconds epoch (~10 digits, ~1.7e9).
		expect(raw.expiresAt).toBeGreaterThan(1e12);
		expect(String(raw.expiresAt).length).toBe(13);
	});

	it('treats a SECONDS-magnitude expiry as already expired (proves ms semantics)', () => {
		// A seconds epoch (~1.75e9) is far below Date.now()-in-ms → must decode null,
		// which is exactly what would happen if someone wrongly stored seconds.
		const secondsMagnitude = Math.floor(Date.now() / 1000); // ~1.7e9, NOT ms
		const encoded = encodeElevationCookie(futurePayload({ expiresAt: secondsMagnitude }));
		expect(decodeElevationCookie(encoded)).toBeNull();
	});
});
