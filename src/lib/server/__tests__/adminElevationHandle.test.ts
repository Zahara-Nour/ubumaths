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
 *   2. cookie posé par le prof, session d'un AUTRE compte (élève connecté ensuite sur le
 *      même navigateur, session du prof terminée sans passer par le logout) → pas
 *      d'élévation, cookie effacé (security-auditor, 2026-10-10) ;
 *   3. non-régression : cookie valide + session du compte qui s'est élevé → élévation.
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
const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440003';

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

function eventAvecCookie(user: { id: string } | null, chemin = '/api/admin/schools') {
	const cookie = encodeElevationCookie({
		adminUserId: ADMIN_ID,
		accessToken: 'jeton-admin',
		expiresAt: Date.now() + 3600_000,
		elevatedBy: TEACHER_ID
	});
	const cookies = {
		get: vi.fn((name: string) => (name === ADMIN_ELEVATION_COOKIE ? cookie : undefined)),
		delete: vi.fn()
	};
	const locals: Record<string, unknown> = { user };
	const event = {
		url: new URL(`http://localhost${chemin}`),
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

	it('la session d’un autre compte ne reprend pas l’élévation du prof', async () => {
		const verifyToken = vi.fn().mockResolvedValue({ userId: ADMIN_ID, client: adminClient() });
		const handle = createAdminElevationHandle({ verifyToken: verifyToken as never });
		const { event, cookies, locals } = eventAvecCookie({ id: STUDENT_ID });

		await handle({ event, resolve: vi.fn().mockResolvedValue(new Response()) });

		expect(locals.adminElevation).toBeNull();
		expect(locals.adminSupabase).toBeUndefined();
		expect(verifyToken).not.toHaveBeenCalled();
		expect(cookies.delete).toHaveBeenCalledWith(
			ADMIN_ELEVATION_COOKIE,
			expect.objectContaining({ path: '/' })
		);
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

describe('createAdminElevationHandle — sections où l’élévation compte', () => {
	// Les pages de dev (`/dev`, chantier demo-debug) sont gardées par l'élévation
	// (`reservedAreasHandle`) : le handle doit y lire le cookie.
	it.each(['/dev', '/dev/polices'])('%s : un cookie valide donne l’élévation', async (chemin) => {
		const client = adminClient();
		const verifyToken = vi.fn().mockResolvedValue({ userId: ADMIN_ID, client });
		const handle = createAdminElevationHandle({ verifyToken: verifyToken as never });
		const { event, locals } = eventAvecCookie({ id: TEACHER_ID }, chemin);

		await handle({ event, resolve: vi.fn().mockResolvedValue(new Response()) });

		expect(locals.adminElevation).toMatchObject({ active: true, adminUserId: ADMIN_ID });
		expect(locals.adminSupabase).toBe(client);
	});

	// Routes d'écriture réservées à l'admin hors de `/api/admin` : sans le cookie lu ici,
	// `requireAdmin` y refusait le prof élevé (403 à la suppression d'un modèle, 2026-11-11).
	it.each([
		'/api/questions/templates',
		'/api/questions/templates/22222222-2222-4222-8222-222222222222',
		'/api/questions/templates/bulk-status',
		'/api/errors/bulk-resolve',
		'/api/errors/delete-resolved',
		'/api/bug-reports/config',
		'/api/messages/templates/22222222-2222-4222-8222-222222222222/approve'
	])('%s : route d’écriture admin, un cookie valide donne l’élévation', async (chemin) => {
		const client = adminClient();
		const verifyToken = vi.fn().mockResolvedValue({ userId: ADMIN_ID, client });
		const handle = createAdminElevationHandle({ verifyToken: verifyToken as never });
		const { event, locals } = eventAvecCookie({ id: TEACHER_ID }, chemin);

		await handle({ event, resolve: vi.fn().mockResolvedValue(new Response()) });

		expect(locals.adminElevation).toMatchObject({ active: true, adminUserId: ADMIN_ID });
		expect(locals.adminSupabase).toBe(client);
	});

	it.each([
		'/devoirs',
		'/aide-ecriture',
		'/atelier',
		// voisines des routes admin, hors périmètre (journal d'erreurs : appelé par tous)
		'/api/errors/log',
		'/api/bug-reports',
		'/api/questions/templates-bis',
		// liste publique des modèles (anonyme) : vérifier le jeton n'y servirait à rien
		'/api/questions/templates/all'
	])('%s : hors section, le cookie n’est pas lu', async (chemin) => {
		const verifyToken = vi.fn().mockResolvedValue({ userId: ADMIN_ID, client: adminClient() });
		const handle = createAdminElevationHandle({ verifyToken: verifyToken as never });
		const { event, cookies, locals } = eventAvecCookie({ id: TEACHER_ID }, chemin);

		await handle({ event, resolve: vi.fn().mockResolvedValue(new Response()) });

		expect(locals.adminElevation).toBeNull();
		expect(cookies.get).not.toHaveBeenCalled();
		expect(verifyToken).not.toHaveBeenCalled();
	});
});
