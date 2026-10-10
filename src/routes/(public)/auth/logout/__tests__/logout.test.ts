/**
 * Logout — l'élévation admin part avec la session
 * ===============================================
 *
 * Constat B4 : `/auth/logout` fermait la session Supabase mais laissait le cookie
 * `ubu-admin-elevation` (jeton admin ≤ 1 h). Le logout doit l'effacer, et révoquer le
 * jeton admin côté GoTrue (au mieux : un échec n'empêche pas le logout).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// MOCKS
// ============================================================================

const adminSignOut = vi.fn();

vi.mock('$lib/server/adminElevation', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/server/adminElevation')>();
	return {
		...actual,
		createAdminClient: vi.fn(() => ({ auth: { signOut: adminSignOut } }))
	};
});

vi.mock('$lib/utils/logger', () => ({
	createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })
}));

import { POST } from '../+server';
import { ADMIN_ELEVATION_COOKIE, encodeElevationCookie } from '$lib/server/adminElevation';

// ============================================================================
// HELPERS
// ============================================================================

function eventDeLogout(elevationCookie: string | undefined) {
	const cookies = {
		get: vi.fn((name: string) => (name === ADMIN_ELEVATION_COOKIE ? elevationCookie : undefined)),
		delete: vi.fn()
	};
	const supabase = {
		auth: {
			getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'prof@example.com' } } }),
			signOut: vi.fn().mockResolvedValue({ error: null })
		}
	};
	return { event: { cookies, locals: { supabase } }, cookies, supabase };
}

async function logout(event: unknown) {
	// La route répond par une redirection 303 (levée).
	await expect(POST(event as never)).rejects.toMatchObject({ status: 303 });
}

// ============================================================================
// TESTS
// ============================================================================

describe('POST /auth/logout — élévation admin', () => {
	beforeEach(() => {
		adminSignOut.mockReset().mockResolvedValue({ error: null });
	});

	it('efface le cookie d’élévation et révoque le jeton admin', async () => {
		const cookie = encodeElevationCookie({
			adminUserId: '550e8400-e29b-41d4-a716-446655440002',
			accessToken: 'jeton-admin',
			expiresAt: Date.now() + 3600_000,
			elevatedBy: '550e8400-e29b-41d4-a716-446655440001'
		});
		const { event, cookies, supabase } = eventDeLogout(cookie);

		await logout(event);

		expect(supabase.auth.signOut).toHaveBeenCalled();
		expect(cookies.delete).toHaveBeenCalledWith(
			ADMIN_ELEVATION_COOKIE,
			expect.objectContaining({ path: '/' })
		);
		expect(adminSignOut).toHaveBeenCalled();
	});

	it('se déconnecte même si la révocation du jeton admin échoue', async () => {
		adminSignOut.mockRejectedValue(new Error('GoTrue indisponible'));
		const cookie = encodeElevationCookie({
			adminUserId: '550e8400-e29b-41d4-a716-446655440002',
			accessToken: 'jeton-admin',
			expiresAt: Date.now() + 3600_000,
			elevatedBy: '550e8400-e29b-41d4-a716-446655440001'
		});
		const { event, cookies } = eventDeLogout(cookie);

		await logout(event);

		expect(cookies.delete).toHaveBeenCalledWith(ADMIN_ELEVATION_COOKIE, expect.anything());
	});

	it('sans élévation, aucun appel de révocation', async () => {
		const { event } = eventDeLogout(undefined);

		await logout(event);

		expect(adminSignOut).not.toHaveBeenCalled();
	});
});
