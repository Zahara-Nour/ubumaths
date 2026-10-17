/**
 * Une instanciation se crée sans numéro de version (base locale requise)
 * ======================================================================
 *
 * ADR 0029, étape 5 : l'ancien système de versions disparaît. Le code cesse
 * d'écrire `template_version` avant que la colonne ne soit supprimée : la base
 * doit donc accepter une instanciation qui ne le donne pas.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';

/** Sans le schéma généré : la colonne y est encore obligatoire avant `db:types`. */
const service = createServiceRoleClient() as unknown as SupabaseClient;

async function insert(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service.from(table).insert(row).select('id').single();
	if (error) throw new Error(`${table}: ${error.message}`);
	return (data as { id: string }).id;
}

describe('ADR 0029 — instanciation sans numéro de version', () => {
	let chapitre: string;
	let modele: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const prof = await TestData.profile().withRole('teacher').create();
		const ecole = await insert('schools', {
			name: 'Lycée version YY',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: 'Année version YY',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		const classe = await insert('classes', {
			name: '1SPE version YY',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'YYVER1',
			is_active: true
		});
		chapitre = await insert('class_chapters', {
			class_id: classe,
			title: 'Chapitre version YY',
			display_order: 1
		});
		modele = await insert('chapter_templates', {
			created_by: prof.id,
			title: 'Modèle version YY'
		});
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('accepte une instanciation qui ne donne pas template_version', async () => {
		const { data, error } = await service
			.from('chapter_template_instantiations')
			.insert({ template_id: modele, chapter_id: chapitre })
			.select('id')
			.single();
		expect(error).toBeNull();
		expect(data?.id).toBeTruthy();
	});
});
