/**
 * PATCH /api/admin/users/[id]/status — prévenir le professeur d'un élève approuvé
 *
 * La colonne `classes.teacher_id` a disparu avec le passage au modèle mono-professeur
 * (migration 20260620090000). La route la lisait encore : PostgREST refusait la
 * requête (42703), et l'approbation finissait en 500 après avoir déjà approuvé le
 * compte et prévenu l'élève. Le faux client refuse donc toute lecture de
 * `teacher_id`, comme la base.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireRolesMock = vi.fn();
const createSystemNotificationMock = vi.fn();

vi.mock('$lib/server/middleware/auth', () => ({
	requireRoles: (...args: unknown[]) => requireRolesMock(...args)
}));
vi.mock('$lib/server/notifications', () => ({
	createSystemNotification: (...args: unknown[]) => createSystemNotificationMock(...args)
}));

import { PATCH } from '../+server';

const USER_ID = '22222222-2222-4222-8222-222222222222';

type PatchEvent = Parameters<typeof PATCH>[0];

/** Faux client : profil en attente, élève membre des classes `classNames`. */
function fakeClient(classNames: string[]) {
	return {
		from: vi.fn((table: string) => {
			if (table === 'class_members') {
				return {
					select: (columns: string) => ({
						eq: async () =>
							columns.includes('teacher_id')
								? {
										data: null,
										error: { code: '42703', message: 'column classes_1.teacher_id does not exist' }
									}
								: {
										data: classNames.map((name, i) => ({
											class_id: `c${i}`,
											classes: { id: `c${i}`, name }
										})),
										error: null
									}
					})
				};
			}
			return {
				select: () => ({
					eq: () => ({
						maybeSingle: async () => ({
							data: {
								id: USER_ID,
								email: 'e@example.com',
								firstname: 'Ada',
								lastname: 'Lovelace',
								status: 'pending',
								is_test: false
							},
							error: null
						}),
						single: async () => ({ data: { id: USER_ID }, error: null })
					})
				}),
				update: () => ({ eq: async () => ({ error: null }) })
			};
		})
	};
}

function event(client: ReturnType<typeof fakeClient>): PatchEvent {
	return {
		request: new Request('http://localhost/api/admin/users/x/status', {
			method: 'PATCH',
			body: JSON.stringify({ status: 'approved' })
		}),
		locals: { supabase: client, adminSupabase: null },
		params: { id: USER_ID }
	} as unknown as PatchEvent;
}

/** Notifications envoyées, par type d'événement. */
const sentEvents = () =>
	createSystemNotificationMock.mock.calls.map(
		([n]) => (n as { system_event_type: string }).system_event_type
	);

describe('PATCH /api/admin/users/[id]/status — professeur prévenu', () => {
	beforeEach(() => {
		requireRolesMock.mockReset();
		createSystemNotificationMock.mockReset();
		createSystemNotificationMock.mockResolvedValue({ success: true });
		requireRolesMock.mockResolvedValue({ profile: { id: 'prof', role: 'teacher' } });
	});

	it('approuve un élève inscrit dans une classe et prévient le professeur', async () => {
		const response = await PATCH(event(fakeClient(['5e A', '5e B'])));

		expect(response.status).toBe(200);
		expect(sentEvents()).toEqual(['user_approved', 'student_approved']);
		const [teacherNotice] = createSystemNotificationMock.mock.calls[1] as [Record<string, unknown>];
		expect(teacherNotice).toMatchObject({
			target_type: 'role',
			target_roles: ['teacher'],
			message: expect.stringContaining('les classes 5e A, 5e B')
		});
		expect(teacherNotice.action_url).toBe(`/dashboard/teacher/welcome-email?student_id=${USER_ID}`);
	});

	it('ne prévient pas le professeur pour un compte sans classe', async () => {
		const response = await PATCH(event(fakeClient([])));

		expect(response.status).toBe(200);
		expect(sentEvents()).toEqual(['user_approved']);
	});
});
