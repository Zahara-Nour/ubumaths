/**
 * Tableau blanc : réservé au prof (et à l'admin) — décision D5 de David, 2026-10-11
 *
 * Outil de projection en classe, mono-utilisateur. Le lien n'était montré qu'au
 * prof, mais la page admettait les élèves (atteignable par l'adresse, à moitié
 * cassée pour eux : le panneau de fichiers appelle des routes réservées au
 * prof). Un tableau PARTAGÉ en direct pour les élèves est une autre fonctionnalité,
 * à penser avec le projet visio.
 */
import { describe, it, expect } from 'vitest';
import { load } from '../+page.server';

type Role = 'student' | 'teacher' | 'admin';

async function loadAs(role: Role) {
	const parent = async () => ({ profile: { role } });
	return load({ parent } as never);
}

describe('tableau blanc : qui y a droit', () => {
	it('un élève est refusé (403)', async () => {
		await expect(loadAs('student')).rejects.toMatchObject({ status: 403 });
	});

	it.each(['teacher', 'admin'] as const)('%s : accès', async (role) => {
		await expect(loadAs(role)).resolves.toBeDefined();
	});
});
