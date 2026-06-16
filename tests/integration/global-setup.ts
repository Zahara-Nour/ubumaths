/**
 * Global setup for integration tests — single-teacher refactor.
 *
 * Migration `015_seed_voltaire_test_data.sql` seeds 4 demo teachers, but the
 * `enforce_single_teacher` trigger (refactor mono-professeur) now forbids more
 * than one `teacher` account. We therefore remove **every** teacher from the
 * LOCAL test database once, before the suite runs, so each test can create its
 * own teacher (cleaned between tests by the per-suite cleanup helpers).
 *
 * Local test DB only (port 54322) — never production. Runs once per
 * `pnpm test:integration` invocation.
 */
import { Client } from 'pg';

function makeClient(): Client {
	return new Client({
		host: process.env.SUPABASE_DB_HOST || 'localhost',
		port: parseInt(process.env.SUPABASE_DB_PORT || '54322'),
		database: process.env.SUPABASE_DB_NAME || 'postgres',
		user: process.env.SUPABASE_DB_USER || 'postgres',
		password: process.env.SUPABASE_DB_PASSWORD || 'postgres'
	});
}

export async function setup(): Promise<void> {
	const client = makeClient();
	await client.connect();
	try {
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
