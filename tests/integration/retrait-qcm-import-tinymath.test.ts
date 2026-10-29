/**
 * Fin du QCM de modèle et de l'import TinyMath (nécessite une base locale)
 * =========================================================================
 *
 * Migration : 20261029203000_figure_et_choix_retrait_qcm_import_tinymath.sql
 * Spécification : docs/wip/figure-et-choix-progress.md (§ 2.12)
 *
 * - `question_templates_type_check` refuse `multiple_choice` et admet toujours les autres types ;
 * - les tables, la vue et la fonction du suivi de l'import TinyMath n'existent plus.
 *
 * @vitest-environment node
 */
import { describe, it, expect, afterAll } from 'vitest';
import { createServiceRoleClient } from '../helpers/database/trigger-test-helpers';
import { getPostgresClient } from '../helpers/database/postgres-client';

const QCM_ID = '0a11f0e0-0000-4000-8000-0000000dd001';
const CASES_ID = '0a11f0e0-0000-4000-8000-0000000dd002';

function template(id: string, type: string) {
	return {
		id,
		type,
		title: `Retrait du QCM — ${type}`,
		theme: 'Test',
		domain: 'QCM',
		level: 1,
		grades: ['6'],
		status: 'draft',
		variations: [{ statement: 'Capitale de la France ?' }]
	};
}

async function scalar(sql: string, params: unknown[] = []): Promise<unknown> {
	const client = await getPostgresClient();
	const result = await client.query(sql, params);
	return Object.values(result.rows[0] ?? {})[0];
}

describe('question_templates.type — plus de multiple_choice', () => {
	const service = createServiceRoleClient();

	afterAll(async () => {
		await service.from('question_templates').delete().in('id', [QCM_ID, CASES_ID]);
	});

	it('un modèle de type multiple_choice est refusé par la contrainte', async () => {
		const { error } = await service
			.from('question_templates')
			.insert(template(QCM_ID, 'multiple_choice'));
		expect(error?.message ?? '').toMatch(/question_templates_type_check/);

		const { data } = await service.from('question_templates').select('id').eq('id', QCM_ID);
		expect(data).toEqual([]);
	});

	it('un modèle à cases s’enregistre toujours', async () => {
		await service.from('question_templates').delete().eq('id', CASES_ID);
		const { error } = await service
			.from('question_templates')
			.insert(template(CASES_ID, 'fill_in_blanks'));
		expect(error).toBeNull();

		const { data } = await service
			.from('question_templates')
			.select('id, type')
			.eq('id', CASES_ID)
			.single();
		expect(data?.type).toBe('fill_in_blanks');
	});
});

describe('suivi de l’import TinyMath supprimé', () => {
	it.each(['migration_tracking', 'migration_edits', 'migration_review_tree'])(
		'%s n’existe plus',
		async (relation) => {
			expect(await scalar('select to_regclass($1) as rel', [`public.${relation}`])).toBeNull();
		}
	);

	it('la fonction update_migration_tracking_updated_at() n’existe plus', async () => {
		expect(
			await scalar('select to_regprocedure($1) as fn', [
				'public.update_migration_tracking_updated_at()'
			])
		).toBeNull();
	});
});
