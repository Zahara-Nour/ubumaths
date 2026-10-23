/**
 * `/construction-demo` : sans le dossier d'exemples XML (instrumenpoche, retiré
 * du dépôt), la page doit s'ouvrir sans exemples, pas répondre 500.
 * `canAuthor` masque « Sauvegarder » / « Supprimer » à qui n'est ni prof ni admin.
 */
import { describe, expect, it } from 'vitest';
import { load } from '../+page.server';

type LoadEvent = Parameters<typeof load>[0];

function eventWithRole(role: string | null): LoadEvent {
	return { locals: { profile: role ? { role } : null } } as unknown as LoadEvent;
}

describe('/construction-demo — chargement', () => {
	it('ouvre la page sans exemples quand le dossier est absent', async () => {
		const result = await load(eventWithRole(null));
		expect(result).toMatchObject({ fixtures: [] });
	});

	it.each([
		['teacher', true],
		['admin', true],
		['student', false],
		[null, false]
	])('rôle %s → canAuthor = %s', async (role, attendu) => {
		const result = await load(eventWithRole(role));
		expect(result).toMatchObject({ canAuthor: attendu });
	});
});
