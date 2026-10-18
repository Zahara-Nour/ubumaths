/**
 * Écritures du Palotin : client service, identité de session, 0 ligne traité
 * ==========================================================================
 *
 * PR 2 de docs/wip/palotin-boucle-progress.md : plus aucune écriture de
 * `student_buddies` ne passe par le client de l'élève (la PR suivante lui
 * retire ce droit ; une écriture restée sur son client rendrait alors 0 ligne,
 * sans erreur). Les fonctions d'écriture ne reçoivent plus ce client : elles
 * écrivent au client service, `studentId` venant de la session.
 *
 * Chaque lire-modifier-écrire porte un verrou optimiste sur `updated_at`.
 * Changement de Palotin : prix juste (gratuit la 1re fois, 50 ensuite), et
 * débit et changement ne se désynchronisent jamais.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buddyRow, createFakeBuddyDb, type FakeBuddyDb } from './helpers/fake-buddy-db';
import { called, type RecordedQuery } from './helpers/fake-supabase';

const service = vi.hoisted(() => ({ current: null as unknown }));
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => service.current
}));

import {
	createStudentBuddy,
	changeStudentPalotin,
	updateStreak,
	resetLostStreak,
	isStreakLost,
	MAX_WRITE_ATTEMPTS,
	PALOTIN_CHANGE_COST
} from '../buddy-queries';

// Constantes
const STUDENT = '11111111-1111-4111-8111-111111111111';
const TODAY = new Date().toISOString().split('T')[0];
const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
const LONG_AGO = '2026-01-01';

// Variables
let db: FakeBuddyDb;
let fake: ReturnType<typeof createFakeBuddyDb>;

// Functions
function setup(buddy: FakeBuddyDb['buddy'], gidouilles: number | null = 0) {
	db = { buddy, profile: { id: STUDENT, gidouilles } };
	fake = createFakeBuddyDb(db);
	service.current = fake.client;
}

function writesOn(table: string): RecordedQuery[] {
	return fake
		.on(table)
		.filter((q) => q.calls[0]?.method === 'update' || q.calls[0]?.method === 'insert');
}

function hasUpdatedAtLock(query: RecordedQuery): boolean {
	return query.calls.some((c) => c.method === 'eq' && c.args[0] === 'updated_at');
}

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('createStudentBuddy', () => {
	it('insère au client service, avec l’identité de la session, et rend la ligne écrite', async () => {
		setup(null);
		const buddy = await createStudentBuddy(STUDENT, 'cotice');

		expect(buddy?.palotin_type).toBe('cotice');
		const [insert] = writesOn('student_buddies');
		expect(insert.calls[0].args[0]).toEqual({ student_id: STUDENT, palotin_type: 'cotice' });
		expect(insert.calls.some((c) => c.method === 'select')).toBe(true);
	});

	it('Palotin déjà choisi (envoi simultané, unicité) : null', async () => {
		setup(buddyRow(STUDENT));
		expect(await createStudentBuddy(STUDENT, 'giron')).toBeNull();
	});
});

describe('changeStudentPalotin', () => {
	it('1er changement gratuit : type et compteur en UNE écriture verrouillée, aucun débit', async () => {
		setup(buddyRow(STUDENT, { palotin_type: 'pile', change_count: 0 }), 10);
		const result = await changeStudentPalotin(STUDENT, 'giron');

		expect(result).toMatchObject({ status: 'changed', cost: 0 });
		expect(db.buddy).toMatchObject({ palotin_type: 'giron', change_count: 1 });
		const [change] = writesOn('student_buddies');
		expect(change.calls[0].args[0]).toEqual({ palotin_type: 'giron', change_count: 1 });
		expect(called(change, 'eq', 'student_id', STUDENT)).toBe(true);
		expect(hasUpdatedAtLock(change)).toBe(true);
		expect(writesOn('profiles')).toEqual([]);
		expect(db.profile.gidouilles).toBe(10);
	});

	it('changement suivant : 50 gidouilles débitées au client service, verrou sur le solde lu', async () => {
		setup(buddyRow(STUDENT, { palotin_type: 'pile', change_count: 1 }), 80);
		const result = await changeStudentPalotin(STUDENT, 'cotice');

		expect(result).toMatchObject({ status: 'changed', cost: PALOTIN_CHANGE_COST });
		expect(db.buddy).toMatchObject({ palotin_type: 'cotice', change_count: 2 });
		expect(db.profile.gidouilles).toBe(30);
		const [debit] = writesOn('profiles');
		expect(debit.calls[0].args[0]).toEqual({ gidouilles: 30 });
		expect(called(debit, 'eq', 'id', STUDENT)).toBe(true);
		expect(called(debit, 'eq', 'gidouilles', 80)).toBe(true);
	});

	it('solde insuffisant : rien n’est écrit', async () => {
		setup(buddyRow(STUDENT, { palotin_type: 'pile', change_count: 1 }), 49);
		expect(await changeStudentPalotin(STUDENT, 'cotice')).toEqual({
			status: 'insufficient',
			cost: PALOTIN_CHANGE_COST
		});
		expect(writesOn('student_buddies')).toEqual([]);
		expect(writesOn('profiles')).toEqual([]);
	});

	it('solde dépensé entre-temps (débit impossible) : le changement est ANNULÉ', async () => {
		setup(buddyRow(STUDENT, { palotin_type: 'pile', change_count: 1 }), 60);
		// Juste après le changement, un achat simultané vide le solde
		db.beforeWrite = (table, index) => {
			if (table === 'profiles' && index === 1) db.profile.gidouilles = 5;
		};
		const result = await changeStudentPalotin(STUDENT, 'cotice');

		expect(result).toEqual({ status: 'insufficient', cost: PALOTIN_CHANGE_COST });
		expect(db.buddy).toMatchObject({ palotin_type: 'pile', change_count: 1 });
		expect(db.profile.gidouilles).toBe(5);
		const [, revert] = writesOn('student_buddies');
		expect(revert.calls[0].args[0]).toEqual({ palotin_type: 'pile', change_count: 1 });
		expect(called(revert, 'eq', 'palotin_type', 'cotice')).toBe(true);
		expect(called(revert, 'eq', 'change_count', 2)).toBe(true);
	});

	it('débit en erreur : le changement est annulé, l’erreur remonte', async () => {
		setup(buddyRow(STUDENT, { palotin_type: 'pile', change_count: 1 }), 60);
		db.failNextWrite = { table: 'profiles', error: { message: 'panne' } };

		await expect(changeStudentPalotin(STUDENT, 'cotice')).rejects.toMatchObject({
			message: 'panne'
		});
		expect(db.buddy).toMatchObject({ palotin_type: 'pile', change_count: 1 });
		expect(db.profile.gidouilles).toBe(60);
	});

	it('deux changements simultanés : le second ne profite pas de la gratuité du premier', async () => {
		setup(buddyRow(STUDENT, { palotin_type: 'pile', change_count: 0 }), 100);
		// Un autre changement (gratuit) passe entre notre lecture et notre écriture
		db.beforeWrite = (table, index) => {
			if (table === 'student_buddies' && index === 1 && db.buddy) {
				db.buddy.palotin_type = 'giron';
				db.buddy.change_count = 1;
				db.buddy.updated_at = 'modifiée-par-l-autre-envoi';
			}
		};
		const result = await changeStudentPalotin(STUDENT, 'cotice');

		// Relecture : ce changement-ci est le 2e, il coûte 50
		expect(result).toMatchObject({ status: 'changed', cost: PALOTIN_CHANGE_COST });
		expect(db.buddy).toMatchObject({ palotin_type: 'cotice', change_count: 2 });
		expect(db.profile.gidouilles).toBe(50);
	});

	it('ligne modifiée à chaque essai : conflit, ni changement ni débit', async () => {
		setup(buddyRow(STUDENT, { palotin_type: 'pile', change_count: 1 }), 100);
		db.beforeWrite = (table, index) => {
			if (table === 'student_buddies' && db.buddy) db.buddy.updated_at = `autre-${index}`;
		};
		expect(await changeStudentPalotin(STUDENT, 'cotice')).toEqual({ status: 'conflict' });
		expect(writesOn('student_buddies')).toHaveLength(MAX_WRITE_ATTEMPTS);
		expect(writesOn('profiles')).toEqual([]);
		expect(db.profile.gidouilles).toBe(100);
	});

	it('même Palotin, ou aucun Palotin : rien n’est écrit', async () => {
		setup(buddyRow(STUDENT, { palotin_type: 'pile' }), 100);
		expect(await changeStudentPalotin(STUDENT, 'pile')).toEqual({ status: 'same' });
		setup(null, 100);
		expect(await changeStudentPalotin(STUDENT, 'pile')).toEqual({ status: 'missing' });
		expect(writesOn('student_buddies')).toEqual([]);
	});
});

describe('updateStreak', () => {
	it('première activité du jour : série + 1, au client service, verrou sur updated_at', async () => {
		setup(
			buddyRow(STUDENT, { current_streak: 4, longest_streak: 4, last_activity_date: YESTERDAY })
		);
		expect(await updateStreak(STUDENT)).toEqual({ newStreak: 5, wasUpdated: true });

		const [write] = writesOn('student_buddies');
		expect(write.calls[0].args[0]).toEqual({
			current_streak: 5,
			longest_streak: 5,
			last_activity_date: TODAY
		});
		expect(called(write, 'eq', 'student_id', STUDENT)).toBe(true);
		expect(hasUpdatedAtLock(write)).toBe(true);
	});

	it('deux envois simultanés : la série n’avance qu’une fois', async () => {
		setup(
			buddyRow(STUDENT, { current_streak: 4, longest_streak: 9, last_activity_date: YESTERDAY })
		);
		// L'autre envoi fait avancer la série avant notre écriture
		db.beforeWrite = (table, index) => {
			if (table === 'student_buddies' && index === 1 && db.buddy) {
				db.buddy.current_streak = 5;
				db.buddy.last_activity_date = TODAY;
				db.buddy.updated_at = 'modifiée-par-l-autre-envoi';
			}
		};
		expect(await updateStreak(STUDENT)).toEqual({ newStreak: 5, wasUpdated: false });
		expect(db.buddy?.current_streak).toBe(5);
	});

	it('ligne modifiée à chaque essai : pas de série annoncée, journalisé', async () => {
		setup(buddyRow(STUDENT, { last_activity_date: YESTERDAY }));
		db.beforeWrite = (table, index) => {
			if (table === 'student_buddies' && db.buddy) db.buddy.updated_at = `autre-${index}`;
		};
		expect((await updateStreak(STUDENT)).wasUpdated).toBe(false);
		expect(console.error).toHaveBeenCalled();
	});

	it('déjà actif aujourd’hui : aucune écriture', async () => {
		setup(buddyRow(STUDENT, { current_streak: 2, last_activity_date: TODAY }));
		expect(await updateStreak(STUDENT)).toEqual({ newStreak: 2, wasUpdated: false });
		expect(writesOn('student_buddies')).toEqual([]);
	});
});

describe('resetLostStreak', () => {
	it('série perdue : remise à 0 au client service, verrou sur updated_at', async () => {
		setup(buddyRow(STUDENT, { current_streak: 6, last_activity_date: LONG_AGO }));
		expect(await resetLostStreak(STUDENT)).toBe(true);
		expect(db.buddy?.current_streak).toBe(0);
		const [write] = writesOn('student_buddies');
		expect(write.calls[0].args[0]).toEqual({ current_streak: 0 });
		expect(called(write, 'eq', 'student_id', STUDENT)).toBe(true);
		expect(hasUpdatedAtLock(write)).toBe(true);
	});

	it('activité arrivée entre-temps : la série n’est pas effacée', async () => {
		setup(buddyRow(STUDENT, { current_streak: 6, last_activity_date: LONG_AGO }));
		db.beforeWrite = (table, index) => {
			if (table === 'student_buddies' && index === 1 && db.buddy) {
				db.buddy.current_streak = 1;
				db.buddy.last_activity_date = TODAY;
				db.buddy.updated_at = 'modifiée-par-l-autre-envoi';
			}
		};
		expect(await resetLostStreak(STUDENT)).toBe(false);
		expect(db.buddy?.current_streak).toBe(1);
	});

	it('écriture à 0 ligne à chaque essai : pas annoncée comme faite', async () => {
		setup(buddyRow(STUDENT, { current_streak: 6, last_activity_date: LONG_AGO }));
		db.beforeWrite = (table, index) => {
			if (table === 'student_buddies' && db.buddy) db.buddy.updated_at = `autre-${index}`;
		};
		expect(await resetLostStreak(STUDENT)).toBe(false);
	});

	it('règle inchangée : perdue au-delà d’un jour d’écart, série en cours', () => {
		const now = new Date();
		expect(isStreakLost({ current_streak: 3, last_activity_date: YESTERDAY }, now)).toBe(false);
		expect(isStreakLost({ current_streak: 3, last_activity_date: LONG_AGO }, now)).toBe(true);
		expect(isStreakLost({ current_streak: 0, last_activity_date: LONG_AGO }, now)).toBe(false);
		expect(isStreakLost({ current_streak: 3, last_activity_date: null }, now)).toBe(false);
	});
});
