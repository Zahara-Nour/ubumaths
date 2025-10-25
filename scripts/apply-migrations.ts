/**
 * Script to apply database migrations to Supabase
 *
 * Usage:
 *   1. Set SUPABASE_SERVICE_ROLE_KEY in your .env file
 *   2. Run: npx tsx scripts/apply-migrations.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('❌ Missing required environment variables:');
	console.error('   - PUBLIC_SUPABASE_URL');
	console.error('   - SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

async function applyMigrations() {
	const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});

	console.log('🚀 Starting database migrations...\n');

	// Read migration files
	const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
	const migrations = ['001_initial_schema.sql', '002_create_admin_user.sql'];

	for (const migrationFile of migrations) {
		const filePath = join(migrationsDir, migrationFile);
		console.log(`📄 Applying migration: ${migrationFile}`);

		try {
			const sql = readFileSync(filePath, 'utf-8');

			// Execute the SQL
			const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).single();

			if (error) {
				// Try direct execution using REST API instead
				console.log('   Attempting direct SQL execution...');

				// Split the SQL into individual statements and execute them
				const statements = sql
					.split(';')
					.map((s) => s.trim())
					.filter((s) => s.length > 0 && !s.startsWith('--'));

				for (const statement of statements) {
					if (statement) {
						const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
							method: 'POST',
							headers: {
								apikey: supabaseServiceKey!,
								Authorization: `Bearer ${supabaseServiceKey}`,
								'Content-Type': 'application/json'
							},
							body: JSON.stringify({ query: statement + ';' })
						});

						if (!response.ok) {
							const errorText = await response.text();
							console.error(`   ❌ Error executing statement: ${errorText}`);
							console.error(`   Statement: ${statement.substring(0, 100)}...`);
						}
					}
				}
			}

			console.log(`   ✅ Applied successfully\n`);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			console.error(`   ❌ Failed to apply migration: ${message}\n`);
			console.log('⚠️  Please apply this migration manually through the Supabase SQL Editor:');
			console.log(
				`   1. Go to: ${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}/sql`
			);
			console.log(`   2. Copy the contents of: ${filePath}`);
			console.log(`   3. Paste and run in the SQL Editor\n`);
		}
	}

	console.log('✅ Migration process completed!');
	console.log(
		'\n📝 Note: If any migrations failed, please apply them manually via the Supabase SQL Editor.'
	);
	console.log(
		`   Dashboard: ${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}/sql`
	);
}

applyMigrations().catch((error) => {
	console.error('❌ Error:', error.message);
	process.exit(1);
});
