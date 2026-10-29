/**
 * Export des tables de suivi de l'import TinyMath (`migration_tracking`, `migration_edits`)
 * en JSON dans `data/import-tinymath/`, avant leur suppression (lot 5 de figure-et-choix).
 *
 * Lecture seule. Usage : pnpm tsx scripts/export-import-tinymath.ts
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/types/database';

const OUT_DIR = 'data/import-tinymath';
const TABLES = ['migration_tracking', 'migration_edits'] as const;

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant');

const supabase = createClient<Database>(url, key);
mkdirSync(OUT_DIR, { recursive: true });

for (const table of TABLES) {
	const { data, error } = await supabase.from(table).select('*').order('created_at').limit(5000);
	if (error) throw new Error(`lecture de ${table} : ${error.message}`);
	writeFileSync(`${OUT_DIR}/${table}.json`, JSON.stringify(data, null, '\t') + '\n');
	console.log(`${table} : ${data.length} lignes → ${OUT_DIR}/${table}.json`);
}
