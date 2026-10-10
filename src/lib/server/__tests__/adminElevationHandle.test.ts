/**
 * Handle d'élévation admin — une élévation n'existe pas sans session
 * ==================================================================
 *
 * Constat B4 (docs/wip/rgpd-securite-constats.md) : le cookie `ubu-admin-elevation`
 * survivait au logout, et le handle l'honorait sans exiger `locals.user`. Sur un poste
 * partagé en classe, l'élève suivant pouvait utiliser `/api/admin/*` pendant ≤ 1 h
 * sans être connecté.
 *
 * Ce que le fichier prouve :
 *   1. cookie valide mais aucune session → pas d'élévation, jeton jamais vérifié,
 *      cookie effacé ;
 *   2. non-régression : cookie valide + session → élévation active.
 */
import { describe, it, expect, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import {
	ADMIN_ELEVATION_COOKIE,
	createAdminElevationHandle,
	encodeElevationCookie
} from '../adminElevation';

// ============================================================================
// CONSTANTES
// ============================================================================

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440002';
const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001';

// ============================================================================
// HELPERS
// ============================================================================

/** Client admin factice : `profiles.role` vaut 'admin'. */
function adminClient() {
	const single = vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null });
	return {
		from: vi.fn(() => ({ select: () => ({ eq: () => ({ single }) }) }))
	};
}

function eventAvecCookie(user: { id: string } | null) {
	const cookie = encodeElevationCookie({
		adminUserId: ADMIN_ID,
		accessToken: 'jeton-admin',
		expiresAt: Date.now() + 3600_000
	});
	const cookies = {
		get: vi.fn((name: string) => (name === ADMIN_ELEVATION_COOKIE ? cookie : undefined)),
		delete: vi.fn()
	};
	const locals: Record<string, unknown> = { user };
	const event = {
		url: new URL('http://localhost/api/admin/schools'),
		cookies,
		locals
	} as unknown as RequestEvent;
	return { event, cookies, locals };
}

// ============================================================================
// TESTS
// ============================================================================

describe('createAdminElevationHandle — session exigée', () => {
	it('sans session, un cookie valide ne donne aucune élévation et est effacé', async () => {
		const verifyToken = vi.fn().mockResolvedValue({ userId: ADMIN_ID, client: adminClient() });
		const handle = createAdminElevationHandle({ verifyToken: verifyToken as never });
		const { event, cookies, locals } = eventAvecCookie(null);
		const resolve = vi.fn().mockResolvedValue(new Response());

		await handle({ event, resolve });

		expect(locals.adminElevation).toBeNull();
		expect(locals.adminSupabase).toBeUndefined();
		expect(verifyToken).not.toHaveBeenCalled();
		expect(cookies.delete).toHaveBeenCalledWith(
			ADMIN_ELEVATION_COOKIE,
			expect.objectContaining({ path: '/' })
		);
		expect(resolve).toHaveBeenCalled();
	});

	it('avec une session, un cookie valide donne l’élévation (non-régression)', async () => {
		const client = adminClient();
		const verifyToken = vi.fn().mockResolvedValue({ userId: ADMIN_ID, client });
		const handle = createAdminElevationHandle({ verifyToken: verifyToken as never });
		const { event, cookies, locals } = eventAvecCookie({ id: TEACHER_ID });

		await handle({ event, resolve: vi.fn().mockResolvedValue(new Response()) });

		expect(locals.adminElevation).toMatchObject({ active: true, adminUserId: ADMIN_ID });
		expect(locals.adminSupabase).toBe(client);
		expect(cookies.delete).not.toHaveBeenCalled();
	});
});
