/**
 * RLS — lecture anonyme des liens question → point du programme (base locale)
 * ============================================================================
 *
 * La recherche du catalogue Automaths (page publique) cherche aussi dans les
 * intitulés des points du programme rattachés à chaque question. Un visiteur
 * sans compte lit donc le lien « question publiée → point » ; jamais celui d'un
 * brouillon (question d'accès tranchée par David le 2026-11-18).
 *
 * Migration : 20261118204254_automaths_anon_lit_points_des_modeles.sql
 *
 * Client anon réel, sans session : c'est le cas `auth.uid()` NULL qu'on teste,
 * chaque assertion porte sur des lignes rendues, jamais sur l'absence d'erreur
 * seule.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import type { Database } from '#lib/types/database.ts';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const PUBLISHED_ID = '0a11f0e0-0000-4000-8000-00000000b001';
const DRAFT_ID = '0a11f0e0-0000-4000-8000-00000000b002';

/** Un client anon sans session — exactement ce dont dispose un inconnu. */
function anonClient(): SupabaseClient<Database> {
	return createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

function template(id: string, status: 'published' | 'draft', nodeId: string) {
	return {
		id,
		// Un lien vers un point exige le modèle rangé sur le nœud du point
		classification_node_id: nodeId,
		type: 'fill_in_blanks',
		title: `RLS anon points — ${status}`,
		level: 1,
		grades: ['6'],
		status,
		variations: [{ statement: 'Combien font $$1+1$$ ? ____', blanks: [{ expectedAnswer: '2' }] }]
	};
}

describe('RLS — /automaths, lecture anonyme des points des modèles', () => {
	const service = createServiceRoleClient();
	let pointId: string;
	let nodeId: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		await service.from('question_templates').delete().in('id', [PUBLISHED_ID, DRAFT_ID]);

		const { data: point, error: pointError } = await service
			.from('curriculum_points')
			.select('id, node_id')
			.is('archived_at', null)
			.limit(1)
			.single();
		expect(pointError).toBeNull();
		pointId = point!.id;
		nodeId = point!.node_id;

		const { error } = await service
			.from('question_templates')
			.insert([template(PUBLISHED_ID, 'published', nodeId), template(DRAFT_ID, 'draft', nodeId)]);
		expect(error).toBeNull();

		const { error: linkError } = await service.from('question_template_points').insert([
			{ template_id: PUBLISHED_ID, point_id: pointId },
			{ template_id: DRAFT_ID, point_id: pointId }
		]);
		expect(linkError).toBeNull();
	});

	afterAll(async () => {
		await service
			.from('question_template_points')
			.delete()
			.in('template_id', [PUBLISHED_ID, DRAFT_ID]);
		await service.from('question_templates').delete().in('id', [PUBLISHED_ID, DRAFT_ID]);
		await cleanupAllTestData();
	});

	it("un visiteur anonyme lit le point d'une question publiée", async () => {
		const { data, error } = await anonClient()
			.from('question_template_points')
			.select('template_id, point_id')
			.eq('template_id', PUBLISHED_ID);

		expect(error).toBeNull();
		expect(data).toEqual([{ template_id: PUBLISHED_ID, point_id: pointId }]);
	});

	it("un visiteur anonyme ne voit pas le point d'un brouillon", async () => {
		const { data, error } = await anonClient()
			.from('question_template_points')
			.select('template_id')
			.eq('template_id', DRAFT_ID);

		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	it('un embed vers les modèles ne fait remonter aucun lien de brouillon', async () => {
		const { data, error } = await anonClient()
			.from('question_template_points')
			.select('template_id, question_templates(id, status)')
			.in('template_id', [PUBLISHED_ID, DRAFT_ID]);

		expect(error).toBeNull();
		expect(data?.map((l) => l.template_id)).toEqual([PUBLISHED_ID]);
	});

	it('anon ne lit pas la date de rattachement (colonnes du lien seulement)', async () => {
		const { data, error } = await anonClient()
			.from('question_template_points')
			.select('created_at')
			.eq('template_id', PUBLISHED_ID);

		expect(data ?? []).toEqual([]);
		expect(error?.code).toBe('42501');
	});

	it('anon ne peut pas modifier un lien', async () => {
		await anonClient()
			.from('question_template_points')
			.update({ template_id: DRAFT_ID })
			.eq('template_id', PUBLISHED_ID);

		const { data } = await service
			.from('question_template_points')
			.select('template_id')
			.eq('template_id', PUBLISHED_ID);
		expect(data).toHaveLength(1);
	});

	it('modèle publié repassé en brouillon : son lien disparaît', async () => {
		await service.from('question_templates').update({ status: 'draft' }).eq('id', PUBLISHED_ID);
		try {
			const { data, error } = await anonClient()
				.from('question_template_points')
				.select('template_id')
				.eq('template_id', PUBLISHED_ID);

			expect(error).toBeNull();
			expect(data).toEqual([]);
		} finally {
			await service
				.from('question_templates')
				.update({ status: 'published' })
				.eq('id', PUBLISHED_ID);
		}
	});

	it('un visiteur anonyme ne peut ni créer ni retirer un lien', async () => {
		const { error: insertError } = await anonClient()
			.from('question_template_points')
			.insert({ template_id: DRAFT_ID, point_id: pointId });
		expect(insertError).not.toBeNull();

		await anonClient().from('question_template_points').delete().eq('template_id', PUBLISHED_ID);
		const { data } = await service
			.from('question_template_points')
			.select('template_id')
			.eq('template_id', PUBLISHED_ID);
		expect(data).toHaveLength(1);
	});
});
