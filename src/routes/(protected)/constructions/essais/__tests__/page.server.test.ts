/**
 * `/constructions/essais` (ancienne `/construction-demo`, chantier demo-debug, phase 8) :
 * l'éditeur d'essais est réservé au prof ; l'élève et l'admin reçoivent 403, le
 * visiteur 401 (le layout `(protected)` l'envoie d'abord vers la connexion).
 * Sans le dossier d'exemples XML (instrumenpoche, retiré du dépôt), la page s'ouvre
 * sans exemples, pas en 500.
 */
import { describe, expect, it } from 'vitest';
import { load } from '../+page.server';

type LoadEvent = Parameters<typeof load>[0];

function eventWithRole(role: string | null): LoadEvent {
	const user = role ? { id: '00000000-0000-4000-8000-000000000001' } : null;
	const single = async () => ({ data: role ? { role } : null, error: null });
	const supabase = { from: () => ({ select: () => ({ eq: () => ({ single }) }) }) };
	return {
		locals: { safeGetSession: async () => ({ user }), supabase, profile: role ? { role } : null }
	} as unknown as LoadEvent;
}

async function statusOf(promise: Promise<unknown>): Promise<number | null> {
	try {
		await promise;
		return null;
	} catch (e) {
		return (e as { status?: number }).status ?? null;
	}
}

describe('/constructions/essais — chargement', () => {
	it('ouvre la page au prof, sans exemples quand le dossier est absent', async () => {
		const result = await load(eventWithRole('teacher'));
		expect(result).toMatchObject({ fixtures: [] });
	});

	it.each([
		['student', 403],
		['admin', 403],
		[null, 401]
	])('rôle %s → %s', async (role, status) => {
		expect(await statusOf(Promise.resolve(load(eventWithRole(role))))).toBe(status);
	});
});
