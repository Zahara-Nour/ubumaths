/**
 * `/construction-demo` : sans le dossier d'exemples XML (instrumenpoche, retiré
 * du dépôt), la page doit s'ouvrir sans exemples, pas répondre 500.
 */
import { describe, expect, it } from 'vitest';
import { load } from '../+page.server';

type LoadEvent = Parameters<typeof load>[0];

describe('/construction-demo — chargement', () => {
	it('ouvre la page sans exemples quand le dossier est absent', async () => {
		const result = await load({} as LoadEvent);
		expect(result).toEqual({ fixtures: [] });
	});
});
