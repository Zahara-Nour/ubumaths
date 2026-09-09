/**
 * `GET /api/worksheets/[id]/exercise-number/[number]`
 * ===================================================
 *
 * Traduit « exercice 3 de cette fiche » en identifiant de jonction — ce que
 * `[[exos:derivees#3]]` insère.
 *
 * Le cas qui compte est celui des fiches à SECTIONS, où
 * `worksheet_exercises.position` redémarre à 1 : le numéro 3 n'y est pas
 * l'exercice de position 3, mais le troisième dans l'ordre affiché. Se tromper
 * ici ferait pointer la référence du professeur vers un autre exercice que
 * celui qu'il désigne.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';

import { GET as exerciseAtNumber } from '../../src/routes/api/worksheets/[id]/exercise-number/[number]/+server';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';

const service = createServiceRoleClient();

function buildLocals(user: User): App.Locals {
	return {
		supabase: service as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user }),
		user,
		requestId: crypto.randomUUID()
	} as unknown as App.Locals;
}

describe('numéro d’exercice → identifiant de jonction', () => {
	let locals: App.Locals;
	let worksheetId: string;
	/** Les jonctions dans l'ordre AFFICHÉ : A1, A2, B1, B2. */
	const junctions: string[] = [];

	beforeAll(async () => {
		await cleanupAllTestData();

		const teacher = await TestData.profile().withRole('teacher').create();
		locals = buildLocals({ id: teacher.id } as User);

		const { data: ws, error: wsError } = await service
			.from('worksheets')
			.insert({
				title: 'Fiche à deux sections',
				type: 'worksheet',
				status: 'draft',
				created_by: teacher.id
			})
			.select('id')
			.single();
		if (wsError) throw new Error(`fiche : ${wsError.message}`);
		worksheetId = ws.id;

		const sectionIds: string[] = [];
		for (const [index, title] of ['Section A', 'Section B'].entries()) {
			const { data: section, error: sectionError } = await service
				.from('worksheet_sections')
				.insert({ worksheet_id: worksheetId, title, position: index + 1 })
				.select('id')
				.single();
			if (sectionError) throw new Error(`section : ${sectionError.message}`);
			sectionIds.push(section.id);
		}

		// Positions 1 et 2 dans CHAQUE section : c'est la collision réelle.
		for (const sectionId of sectionIds) {
			for (const position of [1, 2]) {
				const exercise = (await TestData.exercise(teacher.id).create()) as { id: string };
				const { data: link, error: linkError } = await service
					.from('worksheet_exercises')
					.insert({
						worksheet_id: worksheetId,
						exercise_id: exercise.id,
						section_id: sectionId,
						position
					})
					.select('id')
					.single();
				if (linkError) throw new Error(`jonction : ${linkError.message}`);
				junctions.push(link.id);
			}
		}
	});

	afterAll(async () => {
		await service.from('worksheets').delete().eq('id', worksheetId);
		await cleanupAllTestData();
	});

	async function resolve(number: string) {
		return exerciseAtNumber({
			locals,
			params: { id: worksheetId, number },
			url: new URL('http://localhost/x')
		} as never);
	}

	it('numérote en continu à travers les sections', async () => {
		// Positions en base : 1, 2, 1, 2. Numéros affichés : 1, 2, 3, 4.
		for (const [index, junctionId] of junctions.entries()) {
			const response = await resolve(String(index + 1));
			expect(response.status).toBe(200);

			const payload = await response.json();
			expect(payload.worksheet_exercise_id).toBe(junctionId);
			expect(payload.number).toBe(index + 1);
			expect(payload.total).toBe(4);
		}
	});

	it('le numéro 3 n’est PAS l’exercice de position 3', async () => {
		// Il n'existe aucune position 3 dans cette fiche — seulement des 1 et des 2.
		// C'est tout l'objet de cette route.
		const { data: positions } = await service
			.from('worksheet_exercises')
			.select('position')
			.eq('worksheet_id', worksheetId);
		expect(new Set((positions ?? []).map((p) => p.position))).toEqual(new Set([1, 2]));

		const payload = await (await resolve('3')).json();
		expect(payload.worksheet_exercise_id).toBe(junctions[2]);
	});

	it('refuse un numéro hors de la fiche', async () => {
		// L'éditeur retombera alors sur une référence vers la fiche entière plutôt
		// que d'inventer un exercice.
		await expect(resolve('5')).rejects.toMatchObject({ status: 404 });
	});

	it('refuse un numéro absurde', async () => {
		await expect(resolve('0')).rejects.toMatchObject({ status: 400 });
		await expect(resolve('abc')).rejects.toMatchObject({ status: 400 });
	});
});
