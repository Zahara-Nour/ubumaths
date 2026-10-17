/**
 * Modèle système « Evaluation » renommé « Contrôle »
 * =================================================
 *
 * En local, le seed recrée la ligne APRÈS les migrations : l'UPDATE n'y touche
 * rien. Ce test fabrique donc l'état de la production (la ligne au nom
 * « Evaluation ») puis rejoue la migration depuis son fichier, telle qu'elle
 * sera jouée en production.
 *
 * @vitest-environment node
 */
import { describe, it, expect, afterAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createServiceRoleClient } from '../helpers/database/trigger-test-helpers';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { ASSESSMENT_TEMPLATE } from '../../src/lib/typst/templates/default-templates';

const MIGRATION = 'supabase/migrations/20261016100100_modele_systeme_controle.sql';
const ID = '00000000-0000-4000-8000-000000000002';

const service = createServiceRoleClient();

async function ligne() {
	const { data, error } = await service
		.from('worksheet_templates')
		.select('name, description, template_content')
		.eq('id', ID)
		.single();
	expect(error).toBeNull();
	return data;
}

describe('modèle système « Contrôle »', () => {
	afterAll(async () => {
		// La ligne reste telle que le seed la pose, pour les tests suivants.
		const pg = await getPostgresClient();
		await pg.query(await readFile(MIGRATION, 'utf8'));
	});

	it('la migration renomme la ligne de production sans toucher au contenu Typst', async () => {
		const pg = await getPostgresClient();
		await pg.query(
			`UPDATE public.worksheet_templates
			 SET name = 'Evaluation',
			     description = 'Mise en page formelle pour evaluation avec section notation'
			 WHERE id = $1`,
			[ID]
		);
		const avant = await ligne();
		expect(avant?.name).toBe('Evaluation');

		await pg.query(await readFile(MIGRATION, 'utf8'));

		const apres = await ligne();
		expect(apres?.name).toBe('Contrôle');
		expect(apres?.description).toBe('Mise en page formelle pour contrôle avec section notation');
		expect(apres?.template_content).toBe(avant?.template_content);
	});

	it('la base, le seed et le code disent le même nom', async () => {
		const actuelle = await ligne();
		expect(actuelle?.name).toBe(ASSESSMENT_TEMPLATE.name);
		expect(actuelle?.description).toBe(ASSESSMENT_TEMPLATE.description);
	});
});
