/**
 * Global setup for integration tests — single-teacher refactor.
 *
 * Migration `015_seed_voltaire_test_data.sql` seeds 4 demo teachers, but the
 * `enforce_single_teacher` trigger (refactor mono-professeur) now forbids more
 * than one `teacher` account. We therefore remove **every** teacher from the
 * LOCAL test database once, before the suite runs, so each test can create its
 * own teacher (cleaned between tests by the per-suite cleanup helpers).
 *
 * Pile de TEST seulement (port 55322 en local, pile jetable en CI) — jamais la base de dev,
 * jamais la prod. Runs once per `pnpm test:integration` invocation.
 */
import { Client } from 'pg';
import { PORT_DB, TABLE_EMPREINTES } from '../../scripts/pile-de-test/regles';
import { purgeTemplatesOf } from '../helpers/database/purge-modeles';

function makeClient(): Client {
	return new Client({
		host: process.env.SUPABASE_DB_HOST || 'localhost',
		port: parseInt(process.env.SUPABASE_DB_PORT || '54322'),
		database: process.env.SUPABASE_DB_NAME || 'postgres',
		user: process.env.SUPABASE_DB_USER || 'postgres',
		password: process.env.SUPABASE_DB_PASSWORD || 'postgres'
	});
}

/**
 * En local, la suite ne tourne QUE sur la pile de test (`pnpm test:integration`,
 * scripts/pile-de-test/). Lancée à la main sur la base de dev (`vitest --config …` sans le
 * lanceur), elle supprimerait le prof de dev et les classes du seed-riche : on refuse avant de
 * supprimer quoi que ce soit. La CI n'a qu'une pile, jetable : rien à vérifier. On la reconnaît à
 * `GITHUB_ACTIONS`, pas à `CI`, qu'un outil peut exporter sur le poste.
 */
async function refuserHorsPileDeTest(client: Client): Promise<void> {
	if (process.env.GITHUB_ACTIONS) return;
	const { rows } = await client.query<{ present: boolean }>(
		`select to_regclass('${TABLE_EMPREINTES}') is not null as present`
	);
	if (client.port !== PORT_DB || !rows[0]?.present) {
		throw new Error(
			`Tests d'intégration refusés : la base visée (port ${client.port}) n'est pas la pile de test. ` +
				'Lance `pnpm test:integration [fichier]`, qui la démarre et la met à jour.'
		);
	}
}

export async function setup(): Promise<void> {
	const client = makeClient();
	await client.connect();
	try {
		await refuserHorsPileDeTest(client);

		// ADR 0029 : un modèle relié par un chapitre bloque la cascade (lignes de
		// lien en RESTRICT) — les classes, elles, ne sont pas purgées ici. Les
		// lignes de lien vers les modèles d'un professeur, puis ses modèles, sont
		// donc supprimées AVANT les comptes (incident du 2026-10-14).
		await purgeTemplatesOf(client, `select id from public.profiles where role = 'teacher'`);

		// Les liens de partage gardent leur auteur (`created_by`, clé sans
		// `ON DELETE`) et ne suivent pas la cascade : une classe n'appartient à
		// aucun compte. Un lien créé par le prof de dev bloquait la suppression
		// des profs (23503, liens du cahier de texte du 2026-11-20).
		for (const table of [
			'class_journal_share_tokens',
			'class_course_share_tokens',
			'exercise_share_tokens'
		]) {
			await client.query(
				`DELETE FROM public.${table}
				 WHERE created_by IN (select id from public.profiles where role = 'teacher')`
			);
		}

		// Deleting from auth.users cascades to profiles → classes → class_members,
		// clearing the seeded demo teachers (and any leftover teacher from a prior run).
		await client.query(
			`DELETE FROM auth.users u
			 USING public.profiles p
			 WHERE p.id = u.id AND p.role = 'teacher'`
		);
	} finally {
		await client.end();
	}
}
