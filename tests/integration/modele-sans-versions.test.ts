/**
 * L'ancien système « snapshot + versions » a disparu (base locale requise)
 * ========================================================================
 *
 * ADR 0029, étape 5B (accord de David du 2026-10-14) : la table des versions, la
 * photo figée du modèle et les numéros de version des chapitres liés sont
 * supprimés, avec le déclencheur qui créait une « version 1 » à chaque modèle.
 * Créer un modèle et lier un chapitre marchent sans eux.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';

const service = createServiceRoleClient() as unknown as SupabaseClient;

async function insert(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service.from(table).insert(row).select('id').single();
	if (error) throw new Error(`${table}: ${error.message}`);
	return (data as { id: string }).id;
}

async function colonnes(table: string): Promise<string[]> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ column_name: string }>(
		`select column_name from information_schema.columns
		 where table_schema = 'public' and table_name = $1`,
		[table]
	);
	return rows.map((r) => r.column_name);
}

describe('ADR 0029 — plus d’ancien système de versions', () => {
	let profId: string;
	let chapitre: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		profId = (await TestData.profile().withRole('teacher').create()).id;
		const ecole = await insert('schools', {
			name: 'Lycée sans versions YY',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: 'Année sans versions YY',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		const classe = await insert('classes', {
			name: '1SPE sans versions YY',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'YYSVE1',
			is_active: true
		});
		chapitre = await insert('class_chapters', {
			class_id: classe,
			title: 'Chapitre sans versions YY',
			display_order: 1
		});
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('la table des versions n’existe plus', async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query(`select to_regclass('public.chapter_template_versions') as t`);
		expect(rows[0].t).toBeNull();
	});

	it('le modèle n’a plus de photo figée ni de numéro de version', async () => {
		const c = await colonnes('chapter_templates');
		expect(c).not.toContain('content_snapshot');
		expect(c).not.toContain('current_version');
	});

	it('un chapitre lié n’a plus de numéros de version', async () => {
		const c = await colonnes('chapter_template_instantiations');
		expect(c).not.toContain('template_version');
		expect(c).not.toContain('current_template_version');
		expect(c).not.toContain('last_migrated_at');
	});

	it('créer un modèle puis lier un chapitre marche toujours', async () => {
		const modele = await insert('chapter_templates', {
			created_by: profId,
			title: 'Modèle sans versions YY'
		});
		await insert('chapter_sections', { template_id: modele, title: 'Cours', display_order: 0 });
		const { error } = await service.rpc('link_chapter_to_template', {
			p_chapter_id: chapitre,
			p_template_id: modele
		});
		expect(error).toBeNull();
		const { data } = await service
			.from('chapter_sections')
			.select('id')
			.eq('chapter_id', chapitre)
			.not('source_id', 'is', null);
		expect(data).toHaveLength(1);
	});
});
