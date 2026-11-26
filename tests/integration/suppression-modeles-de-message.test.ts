/**
 * Suppression des modèles de message — intégration
 * ================================================
 *
 * Migration `20261126224009_suppression_modeles_de_message.sql` (DESTRUCTIVE,
 * écart M60 du registre, décidée par David le 2026-11-26 ; cinq tables vides en
 * prod, plus aucun code appelant depuis #3191).
 * Ce qu'on prouve : les cinq tables et les huit fonctions n'existent plus, plus
 * aucune fonction de `public` ne les cite, et la suppression de compte (RGPD
 * art. 17) ne lit plus `template_audit_log`. Que la suppression de compte
 * marche encore de bout en bout : `suppression-compte-art17.test.ts`.
 *
 * DOIT échouer sans la migration (catalogue).
 * `pnpm test:integration tests/integration/suppression-modeles-de-message.test.ts`.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { getPostgresClient } from '../helpers/database/postgres-client';

// Constantes
const TABLES = [
	'message_templates',
	'message_template_versions',
	'template_usage_stats',
	'template_audit_log',
	'user_favorite_templates'
];

const FONCTIONS = [
	'get_templates_for_context',
	'get_template_statistics',
	'get_user_frequent_templates',
	'duplicate_template',
	'log_template_action',
	'auto_log_template_changes',
	'save_template_version',
	'update_message_template_updated_at'
];

// Functions
async function catalogValue(sql: string, params: unknown[] = []): Promise<unknown> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(sql, params);
	return rows[0]?.value;
}

describe('suppression des modèles de message (20261126224009)', () => {
	it.each(TABLES)('la table public.%s n’existe plus', async (table) => {
		expect(await catalogValue(`select to_regclass($1)::text as value`, [`public.${table}`])).toBe(
			null
		);
	});

	it.each(FONCTIONS)('la fonction public.%s n’existe plus', async (fonction) => {
		expect(
			await catalogValue(
				`select count(*)::int as value from pg_proc p
				 join pg_namespace n on n.oid = p.pronamespace
				 where n.nspname = 'public' and p.proname = $1`,
				[fonction]
			)
		).toBe(0);
	});

	it('plus aucune fonction de public ne cite ces tables ni ces fonctions', async () => {
		const motif = `(${[...TABLES, ...FONCTIONS].join('|')})`;
		expect(
			await catalogValue(
				`select coalesce(string_agg(p.proname, ', ' order by p.proname), '') as value
				 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
				 where n.nspname = 'public' and p.prosrc ~* $1`,
				[motif]
			)
		).toBe('');
	});

	it('la suppression de compte existe toujours, réservée au serveur', async () => {
		expect(
			await catalogValue(
				`select has_function_privilege('service_role', 'public.delete_user_account(uuid)', 'execute')
				    and not has_function_privilege('authenticated', 'public.delete_user_account(uuid)', 'execute')
				    and not has_function_privilege('anon', 'public.delete_user_account(uuid)', 'execute') as value`
			)
		).toBe(true);
	});
});
