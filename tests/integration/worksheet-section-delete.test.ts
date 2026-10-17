/**
 * `DELETE /api/worksheets/[id]/sections/[sectionId]`
 * ==================================================
 *
 * Supprimer une section fait passer ses exercices dans « Sans section ». Mais
 * `position` redémarre à 1 dans chaque groupe, et l'index unique
 * `idx_worksheet_exercises_unique_position` porte sur
 * `(worksheet_id, COALESCE(section_id, 0…0), position)` : tous les exercices
 * hors section partagent la même clé de groupe. Sortir des exercices de rangs
 * 1, 2 vers un « Sans section » qui a déjà ses propres rangs 1, 2 heurtait
 * l'index (23505) — la suppression échouait, alors que la confirmation
 * promettait « elles passeront dans Sans section ». (Signalé par la revue du
 * 2026-10-16, chantier `fiche-liste-unique-sections`.)
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';

import { DELETE as deleteSection } from '../../src/routes/api/worksheets/[id]/sections/[sectionId]/+server';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';

const service = createServiceRoleClient();

/**
 * Les `locals` d'un professeur CONNECTÉ : son propre client, RLS active.
 * Le client service-role contournerait la RLS, et ne prouverait rien sur ce
 * que la route laisse faire à un vrai professeur.
 */
async function localsOf(teacher: { id: string; email: string }): Promise<App.Locals> {
	const user = { id: teacher.id } as User;
	return {
		supabase: (await createAuthenticatedClient(teacher.email)) as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user }),
		user,
		requestId: crypto.randomUUID()
	} as unknown as App.Locals;
}

describe('supprimer une section : ses exercices passent dans « Sans section »', () => {
	let locals: App.Locals;
	let teacherId: string;
	let worksheetId: string;
	let sectionId: string;
	/** Les jonctions de la section, dans leur ordre (rangs 1, 2). */
	const inSection: string[] = [];
	/** Les jonctions déjà hors section (rangs 1, 2). */
	const unsectioned: string[] = [];

	async function link(section: string | null, position: number): Promise<string> {
		const exercise = (await TestData.exercise(teacherId).create()) as { id: string };
		const { data, error } = await service
			.from('worksheet_exercises')
			.insert({
				worksheet_id: worksheetId,
				exercise_id: exercise.id,
				section_id: section,
				position
			})
			.select('id')
			.single();
		if (error) throw new Error(`jonction : ${error.message}`);
		return data.id;
	}

	beforeAll(async () => {
		await cleanupAllTestData();

		const teacher = await TestData.profile().withRole('teacher').create();
		teacherId = teacher.id;
		locals = await localsOf(teacher);

		const { data: ws, error: wsError } = await service
			.from('worksheets')
			.insert({
				title: 'Fiche à supprimer',
				type: 'worksheet',
				status: 'draft',
				created_by: teacherId
			})
			.select('id')
			.single();
		if (wsError) throw new Error(`fiche : ${wsError.message}`);
		worksheetId = ws.id;

		const { data: section, error: sectionError } = await service
			.from('worksheet_sections')
			.insert({ worksheet_id: worksheetId, title: 'Calcul', position: 1 })
			.select('id')
			.single();
		if (sectionError) throw new Error(`section : ${sectionError.message}`);
		sectionId = section.id;

		// Rangs 1, 2 des deux côtés : la collision réelle.
		for (const position of [1, 2]) inSection.push(await link(sectionId, position));
		for (const position of [1, 2]) unsectioned.push(await link(null, position));
	});

	afterAll(async () => {
		await service.from('worksheets').delete().eq('id', worksheetId);
		await cleanupAllTestData();
	});

	it('supprime la section et range ses exercices APRÈS ceux déjà hors section', async () => {
		const response = await deleteSection({
			locals,
			params: { id: worksheetId, sectionId }
		} as never);
		expect(response.status).toBe(200);

		const { data: section } = await service
			.from('worksheet_sections')
			.select('id')
			.eq('id', sectionId)
			.maybeSingle();
		expect(section).toBeNull();

		const { data: rows } = await service
			.from('worksheet_exercises')
			.select('id, section_id, position')
			.eq('worksheet_id', worksheetId)
			.order('position');
		expect(rows).toEqual([
			{ id: unsectioned[0], section_id: null, position: 1 },
			{ id: unsectioned[1], section_id: null, position: 2 },
			{ id: inSection[0], section_id: null, position: 3 },
			{ id: inSection[1], section_id: null, position: 4 }
		]);
	});
});
