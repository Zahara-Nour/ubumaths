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
 * Les CINQ tables republiées ici. La sixième, `user_presence`, est réservée
 * (voir plus bas). Relever la liste : grep -rn -A6 "'postgres_changes'" src
 */
const TABLES_ECOUTEES = [
	'messages',
	'minesweeper_multiplayer_game_state',
	'minesweeper_multiplayer_matches',
	'notifications',
	'student_achievements'
] as const;

/**
 * `user_presence` porte elle aussi un `postgres_changes`, mais elle n'est PAS
 * publiée, et c'est délibéré : sa clé primaire est `user_id`. Comme les DELETE
 * échappent à la fois à la RLS et au filtre d'abonnement, la publier
 * diffuserait l'UUID d'un compte supprimé à tout abonné. En attente d'un
 * arbitrage de David. Ce test rend la décision visible : si quelqu'un publie la
 * table sans trancher, il rougit.
 */
const TABLES_RESERVEES = ['user_presence'] as const;

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

	// Toute la sécurité de la republication tient à ce `default`. En `full`, une
	// table publiée diffuserait l'ANCIENNE LIGNE ENTIÈRE à chaque UPDATE et
	// DELETE, là où `default` s'en tient à la clé primaire. Un passage en `full`
	// au Dashboard élargirait donc les charges utiles en silence : rien dans le
	// code applicatif ne changerait, et aucun autre test ne broncherait.
	it.each([...TABLES_ECOUTEES, ...TABLES_RESERVEES])(
		'garde %s en replica identity default',
		async (table) => {
			const pg = await getPostgresClient();
			const { rows } = await pg.query<{ relreplident: string }>(
				`select c.relreplident
			   from pg_class c
			   join pg_namespace n on n.oid = c.relnamespace
			  where n.nspname = 'public' and c.relname = $1`,
				[table]
			);
			expect(rows[0]?.relreplident).toBe('d');
		}
	);

	it('ne publie rien que le code n’écoute — chaque table publiée coûte du trafic', () => {
		const superflues = publiees.filter((t) => !(TABLES_ECOUTEES as readonly string[]).includes(t));
		expect(superflues).toEqual([]);
	});
});
