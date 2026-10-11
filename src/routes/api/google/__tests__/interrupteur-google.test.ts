/**
 * Interrupteur Google Classroom côté API (constat B8)
 *
 * Avec `GOOGLE_CLASSROOM_ENABLED = false` (valeur réelle), toute route `/api/google/**`
 * (et l'export du tableau blanc vers Classroom)
 * répond 403 avant même de vérifier la session, sauf `auth/disconnect` (révoquer
 * l'accès) et `auth/status` (lecture). Le test parcourt les fichiers : une route ajoutée
 * sans garde le fait échouer.
 */
import { describe, it, expect } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { isHttpError } from '@sveltejs/kit';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
const OPEN_ROUTES = ['/auth/disconnect/+server.ts', '/auth/status/+server.ts'];

const modules = {
	...import.meta.glob<Record<string, unknown>>('../**/+server.ts', { eager: true }),
	// Export du tableau blanc vers Classroom : hors de /api/google, même interrupteur
	...import.meta.glob<Record<string, unknown>>('../../whiteboard/export-to-classroom/+server.ts', {
		eager: true
	})
};

const handlers = Object.entries(modules)
	.filter(([path]) => !OPEN_ROUTES.some((open) => path.endsWith(open)))
	.flatMap(([path, mod]) =>
		METHODS.filter((m) => typeof mod[m] === 'function').map(
			(m) => [`${m} ${path}`, mod[m] as (event: RequestEvent) => unknown] as const
		)
	);

describe('interrupteur Google Classroom coupé', () => {
	it('le parcours trouve les routes gardées', () => {
		expect(handlers.length).toBeGreaterThanOrEqual(24);
	});

	it.each(handlers)('%s répond 403', async (_name, handler) => {
		// Aucun compte connecté : sans le garde, la route répondrait 401 (ou planterait).
		const event = { locals: {}, params: {}, url: new URL('http://localhost/') } as RequestEvent;
		const caught = await Promise.resolve()
			.then(() => handler(event))
			.then(
				() => null,
				(e: unknown) => e
			);
		expect(isHttpError(caught) ? caught.status : caught).toBe(403);
	});
});
