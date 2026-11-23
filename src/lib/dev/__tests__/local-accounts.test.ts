/**
 * Comptes fictifs du serveur de dev : ordre des essais
 * ====================================================
 *
 * - le premier compte qui se connecte arrête les essais ;
 * - élève : `eleve01` d'abord, `student` si la base n'est pas remplie ;
 * - tous refusés : le message du dernier essai, pas une réussite.
 */
import { describe, expect, it } from 'vitest';
import {
	LOCAL_ACCOUNTS,
	signInWithFirst,
	type LocalAccount,
	type SignInAttempt
} from '../local-accounts.ts';

function attemptThatAccepts(accepted: string[]) {
	const tried: string[] = [];
	const attempt = async (account: LocalAccount): Promise<SignInAttempt<string>> => {
		tried.push(account.email);
		return accepted.includes(account.email)
			? { ok: true, result: `session de ${account.email}` }
			: { ok: false, message: `refus de ${account.email}` };
	};
	return { tried, attempt };
}

describe('signInWithFirst', () => {
	it('premier compte accepté : un seul essai', async () => {
		const { tried, attempt } = attemptThatAccepts(['eleve01@local.test', 'student@local.test']);
		const result = await signInWithFirst(LOCAL_ACCOUNTS.eleve, attempt);
		expect(result).toEqual({
			ok: true,
			email: 'eleve01@local.test',
			result: 'session de eleve01@local.test'
		});
		expect(tried).toEqual(['eleve01@local.test']);
	});

	it('base non remplie : eleve01 refusé, student essayé ensuite', async () => {
		const { tried, attempt } = attemptThatAccepts(['student@local.test']);
		const result = await signInWithFirst(LOCAL_ACCOUNTS.eleve, attempt);
		expect(result).toEqual({
			ok: true,
			email: 'student@local.test',
			result: 'session de student@local.test'
		});
		expect(tried).toEqual(['eleve01@local.test', 'student@local.test']);
	});

	it('tous refusés : échec avec le message du dernier essai', async () => {
		const { tried, attempt } = attemptThatAccepts([]);
		const result = await signInWithFirst(LOCAL_ACCOUNTS.eleve, attempt);
		expect(result).toEqual({ ok: false, message: 'refus de student@local.test' });
		expect(tried).toHaveLength(2);
	});

	it('aucun compte : échec, aucun essai', async () => {
		const { tried, attempt } = attemptThatAccepts(['x']);
		const result = await signInWithFirst([], attempt);
		expect(result.ok).toBe(false);
		expect(tried).toEqual([]);
	});
});

describe('LOCAL_ACCOUNTS', () => {
	it('que des adresses fictives du domaine local.test', () => {
		const emails = Object.values(LOCAL_ACCOUNTS)
			.flat()
			.map((account) => account.email);
		expect(emails.length).toBeGreaterThanOrEqual(4);
		for (const email of emails) expect(email).toMatch(/@local\.test$/);
	});
});
