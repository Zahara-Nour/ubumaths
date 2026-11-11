/**
 * Routes d'écriture admin hors de `/api/admin` : le prof en mode administration passe
 * ======================================================================================
 *
 * Le 2026-11-11, la suppression d'un brouillon depuis `/dashboard/admin/questions`
 * répondait 403 au prof élevé : ces routes vérifiaient le rôle du compte CONNECTÉ
 * (`requireRole(locals, 'admin')`, toujours « teacher ») au lieu de `requireAdmin`,
 * qui lit le mode administration et rend le client admin (la RLS réserve l'écriture
 * des modèles au compte admin). Ce fichier passe par la VRAIE garde, sans doublure.
 *
 * Pour chaque route : sans élévation → 403 ; avec élévation → la garde laisse passer
 * (un corps invalide répond alors 400 ou 404, jamais 401/403).
 * Pour la suppression d'un modèle : écrite par le client admin, pas celui du prof ;
 * zéro ligne rendue (refus RLS silencieux) → 404.
 */
import { describe, it, expect, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { createFakeSupabase } from '$lib/server/__tests__/helpers/fake-supabase';

vi.mock('$lib/server/serviceRoleClient', () => ({ createServiceRoleClient: vi.fn(() => ({})) }));
vi.mock('$lib/server/errorMonitoring', async (importActual) => ({
	...(await importActual<object>()),
	deleteAllResolvedErrors: vi.fn(async () => ({ success: true, count: 0 }))
}));

import * as modele from '../../../../routes/api/questions/templates/[id]/+server';
import * as modeles from '../../../../routes/api/questions/templates/+server';
import * as lot from '../../../../routes/api/questions/templates/bulk-status/+server';
import * as approbation from '../../../../routes/api/messages/templates/[id]/approve/+server';
import * as signalements from '../../../../routes/api/bug-reports/config/+server';
import * as resoudre from '../../../../routes/api/errors/bulk-resolve/+server';
import * as purger from '../../../../routes/api/errors/delete-resolved/+server';

// ============================================================================
// CONSTANTES
// ============================================================================

const PROF_ID = '550e8400-e29b-41d4-a716-446655440001';
const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440002';
const MODELE_ID = '22222222-2222-4222-8222-222222222222';

type Handler = (event: RequestEvent) => Promise<Response>;

/** Les 8 routes, chacune avec un corps invalide (la garde passe, Zod refuse). */
const ROUTES: { nom: string; handler: Handler; corpsInvalide: boolean }[] = [
	{ nom: 'PUT modèle', handler: modele.PUT as unknown as Handler, corpsInvalide: true },
	{ nom: 'DELETE modèle', handler: modele.DELETE as unknown as Handler, corpsInvalide: false },
	{ nom: 'POST modèles', handler: modeles.POST as unknown as Handler, corpsInvalide: true },
	{ nom: 'POST bulk-status', handler: lot.POST as unknown as Handler, corpsInvalide: true },
	{ nom: 'POST approve', handler: approbation.POST as unknown as Handler, corpsInvalide: true },
	{
		nom: 'PATCH bug-reports/config',
		handler: signalements.PATCH as unknown as Handler,
		corpsInvalide: true
	},
	{
		nom: 'POST errors/bulk-resolve',
		handler: resoudre.POST as unknown as Handler,
		corpsInvalide: true
	},
	{
		nom: 'POST errors/delete-resolved',
		handler: purger.POST as unknown as Handler,
		corpsInvalide: false
	}
];

// ============================================================================
// FONCTIONS
// ============================================================================

/** Client du prof : il ne doit JAMAIS servir à écrire sur ces routes. */
function clientDuProfInterdit() {
	return {
		from: vi.fn(() => {
			throw new Error('client du prof utilisé pour une route admin');
		}),
		rpc: vi.fn(() => {
			throw new Error('client du prof utilisé pour une route admin');
		})
	};
}

function evenement(eleve: boolean, adminClient: unknown, corps: unknown = { invalide: 1 }) {
	return {
		params: { id: MODELE_ID },
		request: new Request('http://localhost/x', { method: 'POST', body: JSON.stringify(corps) }),
		url: new URL('http://localhost/x'),
		locals: {
			user: { id: PROF_ID },
			profile: { id: PROF_ID, role: 'teacher' },
			supabase: clientDuProfInterdit(),
			adminElevation: eleve
				? { active: true, adminUserId: ADMIN_ID, expiresAt: Date.now() + 3600_000 }
				: null,
			adminSupabase: eleve ? adminClient : undefined
		}
	} as unknown as RequestEvent;
}

async function statut(promesse: Response | Promise<Response>): Promise<number> {
	try {
		return (await promesse).status;
	} catch (err) {
		return (err as { status?: number }).status ?? -1;
	}
}

// ============================================================================
// TESTS
// ============================================================================

describe('routes d’écriture admin : la garde lit le mode administration', () => {
	it.each(ROUTES)('$nom : prof sans mode administration → 403', async ({ handler }) => {
		expect(await statut(handler(evenement(false, undefined)))).toBe(403);
	});

	it.each(ROUTES.filter((r) => r.corpsInvalide))(
		'$nom : prof en mode administration → la garde passe (ni 401 ni 403)',
		async ({ handler }) => {
			vi.spyOn(console, 'error').mockImplementation(() => {});
			const admin = createFakeSupabase(() => ({ data: null }));
			const code = await statut(handler(evenement(true, admin.client)));
			expect([401, 403]).not.toContain(code);
			expect(code).toBeGreaterThanOrEqual(200);
		}
	);

	it('purge des erreurs résolues : prof en mode administration → 200', async () => {
		expect(await statut(purger.POST(evenement(true, {}) as never))).toBe(200);
	});
});

describe('DELETE d’un modèle par le prof en mode administration', () => {
	it('supprime avec le client admin → 200', async () => {
		const admin = createFakeSupabase((_table, calls) =>
			calls.some((c) => c.method === 'delete')
				? { data: [{ id: MODELE_ID }] }
				: { data: { id: MODELE_ID } }
		);

		expect(await statut(modele.DELETE(evenement(true, admin.client) as never))).toBe(200);
		expect(admin.queries.some((q) => q.calls.some((c) => c.method === 'delete'))).toBe(true);
	});

	it('zéro ligne supprimée (refus RLS silencieux) → 404, jamais « supprimé »', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const admin = createFakeSupabase((_table, calls) =>
			calls.some((c) => c.method === 'delete') ? { data: [] } : { data: { id: MODELE_ID } }
		);

		expect(await statut(modele.DELETE(evenement(true, admin.client) as never))).toBe(404);
	});
});
