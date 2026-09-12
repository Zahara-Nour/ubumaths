/**
 * Le vocabulaire de `notifications.target_type` (nécessite une base locale)
 * ========================================================================
 *
 * La contrainte `notifications_target_type_check` n'accepte que quatre
 * valeurs : `all`, `role` (SINGULIER), `classes` et `users` (PLURIEL). Le type
 * TypeScript acceptait les deux formes de chacune, si bien que trois
 * vocabulaires coexistaient sans que le compilateur puisse s'en apercevoir :
 *
 *   - `getUnreadNotifications` filtrait `target_type.eq.roles` au pluriel :
 *     la condition ne correspondait à RIEN. Or « nouvel utilisateur en
 *     attente », « nouveau signalement » et les alertes d'erreur ciblent tous
 *     `role` — les administrateurs ne les voyaient donc jamais ;
 *   - l'écran d'administration posait `value="class"` au singulier, que le
 *     schéma Zod rejetait : envoyer une annonce à une classe était
 *     impossible ;
 *   - deux notificateurs écrivaient `'class'`, valeur que la contrainte
 *     refuse.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import { getUnreadNotifications } from '../../src/lib/server/notifications';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

const service = createServiceRoleClient();

describe('vocabulaire de notifications.target_type', () => {
	let adminId: string;
	let studentId: string;
	let classId: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const teacher = await TestData.profile().withRole('teacher').create();
		classId = (await TestData.class().withName('2nde vocab ZZ').create()).id;
		const admin = await TestData.profile().withRole('admin').create();
		adminId = admin.id;
		const student = await TestData.profile().withRole('student').create();
		studentId = student.id;
		expect(teacher.id).toBeTruthy();

		const { error } = await service
			.from('class_members')
			.insert({ class_id: classId, student_id: studentId, status: 'active' });
		expect(error).toBeNull();
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	async function seed(row: Record<string, unknown>): Promise<string> {
		const { data, error } = await service
			.from('notifications')
			.insert({
				title: 'Annonce ZZ',
				message: '<p>Contenu</p>',
				type: 'info',
				is_system: true,
				system_event_type: 'test_zz',
				expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
				...row
			} as never)
			.select('id')
			.single();
		if (error) throw new Error(error.message);
		return (data as { id: string }).id;
	}

	it('la base refuse les formes au mauvais nombre', async () => {
		// C'est la contrainte qui fait foi : le type TypeScript doit s'y plier,
		// et non l'inverse.
		for (const invalide of ['class', 'roles', 'user']) {
			const { error } = await service.from('notifications').insert({
				title: 'Invalide ZZ',
				message: '<p>x</p>',
				type: 'info',
				target_type: invalide,
				is_system: true,
				system_event_type: 'test_zz',
				expires_at: new Date(Date.now() + 86_400_000).toISOString()
			} as never);
			expect(error?.code, `target_type='${invalide}' aurait dû être refusé`).toBe('23514');
		}
	});

	it('l’administrateur voit enfin les notifications qui ciblent son RÔLE', async () => {
		// Le filtre cherchait `roles` au pluriel : cette notification, créée par
		// « nouveau signalement » et consorts, n'atteignait jamais la cloche.
		const id = await seed({ target_type: 'role', target_roles: ['admin'] });

		const result = await getUnreadNotifications(
			service as unknown as SupabaseClient<Database>,
			adminId,
			{ page: 1, limit: 50 }
		);
		expect(result.notifications.map((n) => n.id)).toContain(id);
	});

	it('et l’élève ne les voit pas', async () => {
		const result = await getUnreadNotifications(
			service as unknown as SupabaseClient<Database>,
			studentId,
			{ page: 1, limit: 50 }
		);
		const roleTargeted = result.notifications.filter((n) => n.target_type === 'role');
		expect(roleTargeted).toHaveLength(0);
	});

	it('une annonce de CLASSE atteint l’élève de cette classe', async () => {
		const id = await seed({ target_type: 'classes', target_class_ids: [classId] });

		const result = await getUnreadNotifications(
			service as unknown as SupabaseClient<Database>,
			studentId,
			{ page: 1, limit: 50 }
		);
		expect(result.notifications.map((n) => n.id)).toContain(id);
	});
});
