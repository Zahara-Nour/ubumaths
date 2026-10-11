/**
 * Lien du cours — actions de la page Cours d'une classe (professeur)
 * ==================================================================
 *
 *  - `requireRole` est refait dans CHAQUE action : un non-professeur est refusé
 *    avant toute écriture ;
 *  - l'identifiant de classe (paramètre de route) est un UUID (Zod) ;
 *  - créer / renouveler = rotation ; révoquer = désactivation relue : zéro ligne
 *    désactivée n'est PAS un succès (la RLS échoue en silence).
 *
 * Le module d'écriture est simulé ; son comportement sous RLS est prouvé par
 * `tests/integration/class-course-share-token.test.ts`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { error } from '@sveltejs/kit';

const requireRole = vi.fn();
const rotate = vi.fn();
const revoke = vi.fn();

vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: (...a: unknown[]) => requireRole(...a)
}));
vi.mock('$lib/server/course-share-tokens', () => ({
	rotateCourseShareToken: (...a: unknown[]) => rotate(...a),
	revokeCourseShareToken: (...a: unknown[]) => revoke(...a),
	getActiveCourseShareToken: vi.fn()
}));

const { actions } = await import('../+page.server');

const CLASSE = '11111111-1111-4111-8111-111111111111';

type ActionEvent = Parameters<NonNullable<typeof actions.shareCourseLink>>[0];

function evenement(classId = CLASSE): ActionEvent {
	return {
		request: new Request('http://localhost/x', { method: 'POST', body: new FormData() }),
		locals: { supabase: { marque: 'requete' } },
		params: { classId }
	} as unknown as ActionEvent;
}

function statut(resultat: unknown): number | null {
	const r = resultat as { status?: number };
	return typeof r?.status === 'number' ? r.status : null;
}

beforeEach(() => {
	requireRole.mockReset();
	requireRole.mockResolvedValue({ user: { id: 'prof' } });
	rotate.mockReset();
	revoke.mockReset();
});

describe('shareCourseLink', () => {
	it('refuse un non-professeur avant toute écriture', async () => {
		requireRole.mockImplementation(async () => {
			// `error()` lève : c'est ce que fait le vrai `requireRole`.
			error(403, 'Interdit');
		});
		await expect(actions.shareCourseLink!(evenement())).rejects.toMatchObject({ status: 403 });
		expect(requireRole).toHaveBeenCalledWith(expect.anything(), 'teacher');
		expect(rotate).not.toHaveBeenCalled();
	});

	it('classe invalide → 400 sans écriture', async () => {
		const r = await actions.shareCourseLink!(evenement('pas-un-uuid'));
		expect(statut(r)).toBe(400);
		expect(rotate).not.toHaveBeenCalled();
	});

	it('crée / renouvelle le lien', async () => {
		rotate.mockResolvedValue({ token: { id: 't' }, error: null });
		const r = await actions.shareCourseLink!(evenement());
		expect(statut(r)).toBeNull();
		expect(r).toMatchObject({ success: true, action: 'shareCourseLink' });
		expect(rotate).toHaveBeenCalledWith({ marque: 'requete' }, CLASSE, 'prof');
	});

	it('échec d’écriture → 500, jamais un succès', async () => {
		rotate.mockResolvedValue({ token: null, error: 'Impossible' });
		expect(statut(await actions.shareCourseLink!(evenement()))).toBe(500);
	});
});

describe('revokeCourseLink', () => {
	it('refuse un non-professeur avant toute écriture', async () => {
		requireRole.mockImplementation(async () => {
			// `error()` lève : c'est ce que fait le vrai `requireRole`.
			error(403, 'Interdit');
		});
		await expect(actions.revokeCourseLink!(evenement())).rejects.toMatchObject({ status: 403 });
		expect(revoke).not.toHaveBeenCalled();
	});

	it('révoque le lien actif', async () => {
		revoke.mockResolvedValue({ revoked: 1, error: null });
		const r = await actions.revokeCourseLink!(evenement());
		expect(r).toMatchObject({ success: true, action: 'revokeCourseLink' });
		expect(revoke).toHaveBeenCalledWith({ marque: 'requete' }, CLASSE);
	});

	it('zéro ligne désactivée → 404, pas un faux succès', async () => {
		revoke.mockResolvedValue({ revoked: 0, error: null });
		expect(statut(await actions.revokeCourseLink!(evenement()))).toBe(404);
	});

	it('échec d’écriture → 500', async () => {
		revoke.mockResolvedValue({ revoked: 0, error: 'Impossible' });
		expect(statut(await actions.revokeCourseLink!(evenement()))).toBe(500);
	});
});
