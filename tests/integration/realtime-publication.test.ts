/**
 * Les tables écoutées en realtime sont publiées (base locale requise)
 * ===================================================================
 *
 * Le 2026-06-16, le schéma a été rebaselisé par un `pg_dump` après la bascule
 * vers le projet EU. `pg_dump` n'emporte pas les publications : la ligne
 * `ALTER PUBLICATION supabase_realtime ADD TABLE messages` de la migration
 * 20251230162731 s'est perdue avec les 618 autres, et les ~19 tables activées
 * au Dashboard avec elle. Résultat mesuré en production : `pg_publication_tables`
 * ne contenait plus AUCUNE table de `public`, et tout `postgres_changes` était
 * inerte — chat, notifications, présence, succès, multijoueur.
 *
 * Rien ne l'a signalé pendant trois mois : un abonnement à une table non
 * publiée réussit, il ne reçoit simplement jamais d'événement. C'est
 * exactement le silence que ce test casse. Il échoue tant que la publication
 * ne couvre pas les six tables réellement écoutées par le code client.
 *
 * La liste ci-dessous est fermée volontairement : chaque table publiée coûte
 * du trafic à chaque client connecté. Elle doit rester le miroir exact des
 * `postgres_changes` du code — d'où le second test, qui refuse aussi les
 * tables publiées que personne n'écoute.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { getPostgresClient } from '../helpers/database/postgres-client';

/**
 * Les six tables portant un `postgres_changes` dans `src/lib/stores/`.
 * Relever la liste : grep -rn -A6 "'postgres_changes'" src --include='*.ts'
 */
const TABLES_ECOUTEES = [
	'messages',
	'minesweeper_multiplayer_game_state',
	'minesweeper_multiplayer_matches',
	'notifications',
	'student_achievements',
	'user_presence'
] as const;

describe('publication supabase_realtime', () => {
	let publiees: string[] = [];

	beforeAll(async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query<{ tablename: string }>(
			`select tablename from pg_publication_tables
			  where pubname = 'supabase_realtime' and schemaname = 'public'
			  order by tablename`
		);
		publiees = rows.map((r) => r.tablename);
	});

	it.each(TABLES_ECOUTEES)('publie %s, écoutée par un store', (table) => {
		expect(publiees).toContain(table);
	});

	it('ne publie rien que le code n’écoute — chaque table publiée coûte du trafic', () => {
		const superflues = publiees.filter((t) => !(TABLES_ECOUTEES as readonly string[]).includes(t));
		expect(superflues).toEqual([]);
	});
});
