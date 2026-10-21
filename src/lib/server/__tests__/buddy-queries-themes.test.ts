/**
 * Thèmes explorés du Palotin : une écriture par séance, vérifiée, sans course
 * ===========================================================================
 *
 * - Écriture au client SERVICE, identité de la session (la PR suivante retire à
 *   l'élève le droit d'écrire sa ligne : une écriture restée sur son client
 *   échouerait en silence).
 * - La RLS échoue en silence (docs/pratiques/rls-echecs-silencieux.md) : un
 *   thème n'est « nouveau » (et ne rapporte son bonus) que si la ligne relue
 *   le contient vraiment.
 * - Verrou optimiste sur `updated_at` : deux envois simultanés ne perdent aucun
 *   thème, et un thème n'est rendu « nouveau » qu'à un seul des deux.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buddyRow, createFakeBuddyDb, type FakeBuddyDb } from './helpers/fake-buddy-db';
import { called } from './helpers/fake-supabase';

const service = vi.hoisted(() => ({ current: null as unknown }));
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => service.current
}));

import {
	addExploredThemes,
	addExploredTheme,
	removeExploredThemes,
	MAX_WRITE_ATTEMPTS
} from '../buddy-queries';

// Constantes
const STUDENT = '11111111-1111-4111-8111-111111111111';

// Variables
let db: FakeBuddyDb;
let fake: ReturnType<typeof createFakeBuddyDb>;

// Functions
function setup(themes: string[]) {
	db = {
		buddy: buddyRow(STUDENT, { themes_explored: themes }),
		profile: { id: STUDENT, gidouilles: 0 }
	};
	fake = createFakeBuddyDb(db);
	service.current = fake.client;
}

function buddyUpdates() {
	return fake.on('student_buddies').filter((q) => q.calls[0]?.method === 'update');
}

describe('addExploredThemes', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		setup(['t1']);
	});

	it('ajoute les seuls thèmes nouveaux, en une écriture au client service, et les rend', async () => {
		const added = await addExploredThemes(STUDENT, ['t1', 't2', 't3', 't2']);

		expect([...added].sort()).toEqual(['t2', 't3']);
		const updates = buddyUpdates();
		expect(updates).toHaveLength(1);
		expect(updates[0].calls[0].args[0]).toEqual({ themes_explored: ['t1', 't2', 't3'] });
		// Identité de la session, verrou optimiste, lignes rendues vérifiées
		expect(called(updates[0], 'eq', 'student_id', STUDENT)).toBe(true);
		expect(updates[0].calls.some((c) => c.method === 'eq' && c.args[0] === 'updated_at')).toBe(
			true
		);
		expect(updates[0].calls.some((c) => c.method === 'select')).toBe(true);
		expect(db.buddy?.themes_explored).toEqual(['t1', 't2', 't3']);
	});

	it('rien de nouveau : aucune écriture', async () => {
		const added = await addExploredThemes(STUDENT, ['t1']);
		expect(added.size).toBe(0);
		expect(buddyUpdates()).toEqual([]);
	});

	it('écriture à 0 ligne à chaque essai : aucun thème nouveau, abandon borné et journalisé', async () => {
		// Chaque écriture trouve la ligne déjà modifiée par un autre envoi
		db.beforeWrite = (table, index) => {
			if (table === 'student_buddies' && db.buddy) db.buddy.updated_at = `autre-${index}`;
		};
		const added = await addExploredThemes(STUDENT, ['t2']);

		expect(added.size).toBe(0);
		expect(buddyUpdates()).toHaveLength(MAX_WRITE_ATTEMPTS);
		expect(console.error).toHaveBeenCalled();
	});

	it('envoi simultané entre lecture et écriture : relecture, aucun thème perdu, bonus à un seul', async () => {
		// L'autre envoi ajoute t2 et t3 juste avant notre première écriture
		db.beforeWrite = (table, index) => {
			if (table === 'student_buddies' && index === 1 && db.buddy) {
				db.buddy.themes_explored = [...db.buddy.themes_explored, 't2', 't3'];
				db.buddy.updated_at = 'modifiée-par-l-autre-envoi';
			}
		};
		const added = await addExploredThemes(STUDENT, ['t2', 't4']);

		// t2 a été ajouté par l'autre envoi : pas « nouveau » ici ; t4 l'est
		expect([...added]).toEqual(['t4']);
		expect(db.buddy?.themes_explored).toEqual(['t1', 't2', 't3', 't4']);
		expect(buddyUpdates()).toHaveLength(2);
	});

	it('élève sans Palotin : rien', async () => {
		db.buddy = null;
		expect((await addExploredThemes(STUDENT, ['t2'])).size).toBe(0);
		expect(buddyUpdates()).toEqual([]);
	});

	it('addExploredTheme : vrai seulement si CET appel a ajouté le thème', async () => {
		expect(await addExploredTheme(STUDENT, 't2')).toBe(true);
		expect(await addExploredTheme(STUDENT, 't2')).toBe(false);
	});
});

describe('removeExploredThemes (compensation)', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		setup(['t1', 't2', 't3']);
	});

	it('retire les thèmes donnés, au client service, sous verrou optimiste', async () => {
		await removeExploredThemes(STUDENT, ['t2']);
		expect(db.buddy?.themes_explored).toEqual(['t1', 't3']);
		const [update] = buddyUpdates();
		expect(called(update, 'eq', 'student_id', STUDENT)).toBe(true);
		expect(update.calls.some((c) => c.method === 'eq' && c.args[0] === 'updated_at')).toBe(true);
	});

	it('thème absent : aucune écriture', async () => {
		await removeExploredThemes(STUDENT, ['t9']);
		expect(buddyUpdates()).toEqual([]);
	});
});
