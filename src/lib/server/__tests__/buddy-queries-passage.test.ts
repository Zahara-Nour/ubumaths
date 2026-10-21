/**
 * Présence de l'élève et retour à fêter (Palotin triste au retour)
 * =================================================================
 *
 * `record_student_visit` est appelée au client service, avec l'identité de la
 * session et le jour UTC calculé par le serveur. Au retour d'une longue
 * absence, le jour du retour est noté ; le layout le lit sans rien écrire, le
 * widget l'efface une fois la bulle montrée
 * (docs/wip/palotins-presence-progress.md).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { utcDay } from '$lib/utils/buddy-constance';

// Client service factice : `rpc` et une chaîne `from()` qui note ses appels
const service = vi.hoisted(() => {
	const calls: { method: string; args: unknown[] }[] = [];
	let result: { data: unknown; error: unknown } = { data: null, error: null };
	const chain: Record<string, unknown> = {};
	for (const method of ['from', 'update', 'select', 'eq', 'not', 'maybeSingle']) {
		chain[method] = (...args: unknown[]) => {
			calls.push({ method, args });
			return chain;
		};
	}
	chain.then = (resolve: (value: unknown) => void) => resolve(result);
	return {
		rpc: vi.fn(),
		from: chain.from as (table: string) => unknown,
		calls,
		setResult(next: { data: unknown; error: unknown }) {
			result = next;
		}
	};
});
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => service
}));

import {
	acknowledgeWelcomeBack,
	isWelcomeBackPending,
	recordStudentPresence
} from '../buddy-queries';

// Constantes
const STUDENT = '11111111-1111-4111-8111-111111111111';
const DAY_MS = 86_400_000;

// Functions
function daysAgo(days: number): string {
	return utcDay(new Date(Date.now() - days * DAY_MS));
}

function called(method: string): unknown[][] {
	return service.calls.filter((call) => call.method === method).map((call) => call.args);
}

beforeEach(() => {
	service.rpc.mockReset();
	service.calls.length = 0;
	service.setResult({ data: [{ student_id: STUDENT }], error: null });
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('recordStudentPresence', () => {
	it('appelle la fonction au client service, identité et jour UTC du serveur', async () => {
		service.rpc.mockResolvedValue({ data: daysAgo(1), error: null });
		await recordStudentPresence(STUDENT);
		expect(service.rpc).toHaveBeenCalledWith('record_student_visit', {
			p_student_id: STUDENT,
			p_today: utcDay()
		});
	});

	it('dernier passage il y a 21 jours : note le retour à fêter, aujourd’hui', async () => {
		service.rpc.mockResolvedValue({ data: daysAgo(21), error: null });
		await recordStudentPresence(STUDENT);
		expect(called('from')).toEqual([['student_last_visits']]);
		expect(called('update')).toEqual([[{ welcome_back_on: utcDay() }]]);
		expect(called('eq')).toEqual([['student_id', STUDENT]]);
	});

	it('dernier passage il y a 20 jours : rien à fêter', async () => {
		service.rpc.mockResolvedValue({ data: daysAgo(20), error: null });
		await recordStudentPresence(STUDENT);
		expect(called('update')).toEqual([]);
	});

	it('tout premier passage (aucun jour enregistré) : rien à fêter', async () => {
		service.rpc.mockResolvedValue({ data: null, error: null });
		await recordStudentPresence(STUDENT);
		expect(called('update')).toEqual([]);
	});

	it('présence non enregistrée : ne lève pas, rien à fêter', async () => {
		service.rpc.mockResolvedValue({ data: null, error: { message: 'panne' } });
		await expect(recordStudentPresence(STUDENT)).resolves.toBeUndefined();
		expect(called('update')).toEqual([]);
	});

	it('retour non noté (aucune ligne rendue) : journalisé, ne lève pas', async () => {
		service.rpc.mockResolvedValue({ data: daysAgo(30), error: null });
		service.setResult({ data: [], error: null });
		await expect(recordStudentPresence(STUDENT)).resolves.toBeUndefined();
		expect(console.error).toHaveBeenCalled();
	});
});

describe('isWelcomeBackPending', () => {
	it('lit la ligne de l’élève de la session, sans rien écrire', async () => {
		service.setResult({ data: { welcome_back_on: utcDay() }, error: null });
		expect(await isWelcomeBackPending(STUDENT)).toBe(true);
		expect(called('eq')).toEqual([['student_id', STUDENT]]);
		expect(called('update')).toEqual([]);
	});

	it('retour d’il y a 6 jours : encore à fêter ; 7 jours : oublié', async () => {
		service.setResult({ data: { welcome_back_on: daysAgo(6) }, error: null });
		expect(await isWelcomeBackPending(STUDENT)).toBe(true);
		service.setResult({ data: { welcome_back_on: daysAgo(7) }, error: null });
		expect(await isWelcomeBackPending(STUDENT)).toBe(false);
	});

	it('rien à fêter, aucune ligne, ou lecture en échec : faux', async () => {
		service.setResult({ data: { welcome_back_on: null }, error: null });
		expect(await isWelcomeBackPending(STUDENT)).toBe(false);
		service.setResult({ data: null, error: null });
		expect(await isWelcomeBackPending(STUDENT)).toBe(false);
		service.setResult({ data: null, error: { message: 'panne' } });
		expect(await isWelcomeBackPending(STUDENT)).toBe(false);
	});
});

describe('acknowledgeWelcomeBack', () => {
	it('efface le retour de l’élève de la session, s’il y en a un', async () => {
		expect(await acknowledgeWelcomeBack(STUDENT)).toBe(true);
		expect(called('update')).toEqual([[{ welcome_back_on: null }]]);
		expect(called('eq')).toEqual([['student_id', STUDENT]]);
		expect(called('not')).toEqual([['welcome_back_on', 'is', null]]);
	});

	it('rien à effacer : faux', async () => {
		service.setResult({ data: [], error: null });
		expect(await acknowledgeWelcomeBack(STUDENT)).toBe(false);
	});

	it('écriture en échec : lève', async () => {
		service.setResult({ data: null, error: { message: 'panne' } });
		await expect(acknowledgeWelcomeBack(STUDENT)).rejects.toThrow('panne');
	});
});
