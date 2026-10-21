/**
 * Présence de l'élève, notée sur toute page vue (docs/wip/palotins-presence-progress.md)
 * =======================================================================================
 *
 * Élève connecté, toute page hors `/api/*` : présence notée une fois par jour
 * (mémoire du serveur, sans cookie). Ni prof, ni anonyme, ni API.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/server/buddy-queries', () => ({ recordStudentPresence: vi.fn() }));

import { recordStudentPresence } from '$lib/server/buddy-queries';
import { forgetPresences, studentPresenceHandle } from '../studentPresenceHandle';

// Constantes
const STUDENT = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

// Functions
function makeEvent(options: {
	routeId: string | null;
	role?: 'student' | 'teacher' | 'admin';
	userId?: string;
}) {
	const set = vi.fn();
	const userId = options.userId ?? STUDENT;
	const event = {
		route: { id: options.routeId },
		cookies: { get: vi.fn(), set },
		locals: options.role
			? { user: { id: userId }, profile: { id: userId, role: options.role } }
			: { user: null, profile: null }
	} as unknown as RequestEvent;
	return { event, set };
}

async function run(event: RequestEvent) {
	const resolve = vi.fn().mockResolvedValue(new Response('ok'));
	await studentPresenceHandle({ event, resolve });
	expect(resolve).toHaveBeenCalledTimes(1);
}

beforeEach(() => {
	forgetPresences();
	vi.mocked(recordStudentPresence).mockReset();
	vi.mocked(recordStudentPresence).mockResolvedValue(undefined);
});

afterEach(() => {
	vi.useRealTimers();
});

describe('studentPresenceHandle', () => {
	it('élève sur une page hors tableau de bord : présence notée, sans cookie', async () => {
		const { event, set } = makeEvent({ routeId: '/(public)/cours/[token]', role: 'student' });
		await run(event);
		expect(recordStudentPresence).toHaveBeenCalledWith(STUDENT);
		expect(set).not.toHaveBeenCalled();
	});

	it('deuxième page le même jour : rien à écrire', async () => {
		await run(makeEvent({ routeId: '/(protected)/dashboard', role: 'student' }).event);
		await run(makeEvent({ routeId: '/(public)/automaths', role: 'student' }).event);
		expect(recordStudentPresence).toHaveBeenCalledTimes(1);
	});

	it('le lendemain : présence notée de nouveau', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-10-21T23:59:00Z'));
		await run(makeEvent({ routeId: '/(protected)/dashboard', role: 'student' }).event);
		vi.setSystemTime(new Date('2026-10-22T00:01:00Z'));
		await run(makeEvent({ routeId: '/(protected)/dashboard', role: 'student' }).event);
		expect(recordStudentPresence).toHaveBeenCalledTimes(2);
	});

	it('deux élèves sur le même poste : chacun sa présence', async () => {
		await run(makeEvent({ routeId: '/(protected)/dashboard', role: 'student' }).event);
		await run(
			makeEvent({ routeId: '/(protected)/dashboard', role: 'student', userId: OTHER }).event
		);
		expect(recordStudentPresence).toHaveBeenCalledWith(STUDENT);
		expect(recordStudentPresence).toHaveBeenCalledWith(OTHER);
	});

	it.each([
		['une API', '/api/notifications', 'student'],
		['une route inconnue (404)', null, 'student'],
		['un prof', '/(protected)/dashboard', 'teacher'],
		['un admin', '/(protected)/dashboard', 'admin'],
		['un visiteur anonyme', '/(public)/automaths', undefined]
	] as const)('%s : rien', async (_name, routeId, role) => {
		await run(makeEvent({ routeId, role }).event);
		expect(recordStudentPresence).not.toHaveBeenCalled();
	});
});
