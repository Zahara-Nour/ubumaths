/**
 * Outils communs aux scripts qui écrivent des modèles de questions
 * ================================================================
 *
 * - client Supabase service_role, avec GARDE sur la base visée : en écriture,
 *   seules la prod (projet EU) et une base locale sont acceptées ;
 * - relecteur = l'unique profil admin (modèle mono-professeur : David) ;
 * - sauvegarde JSON des lignes visées AVANT toute écriture (dossier ignoré par git).
 */

import 'dotenv/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Database } from '../../src/lib/types/database';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Projet Supabase de production (EU, eu-west-3) */
const PROD_PROJECT_REF = 'cnevnzsvixxpnurautls';
const BACKUP_DIR = 'data/migration-output/backups';

// ============================================================================
// ARGUMENTS
// ============================================================================

export function hasFlag(flag: string): boolean {
	return process.argv.includes(flag);
}

export function argValue(flag: string): string | undefined {
	const index = process.argv.indexOf(flag);
	return index === -1 ? undefined : process.argv[index + 1];
}

/** `--index 12,13,20` → [12, 13, 20] ; lève une erreur sur une valeur non entière */
export function parseIndexList(value: string | undefined): number[] | undefined {
	if (value === undefined) return undefined;
	return value.split(',').map((part) => {
		const n = Number(part.trim());
		if (!Number.isInteger(n) || n < 0) throw new Error(`index invalide : « ${part} »`);
		return n;
	});
}

// ============================================================================
// SUPABASE
// ============================================================================

export interface ScriptClient {
	supabase: SupabaseClient<Database>;
	target: string;
}

/** Client service_role ; en écriture, refuse toute base autre que la prod ou le local */
export function createScriptClient(publish: boolean): ScriptClient {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) {
		throw new Error('PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis (fichier .env)');
	}
	const host = new URL(url).hostname;
	const isProd = host === `${PROD_PROJECT_REF}.supabase.co`;
	const isLocal = host === 'localhost' || host === '127.0.0.1';
	const target = isProd
		? `PRODUCTION (${host})`
		: isLocal
			? `LOCAL (${host})`
			: `INCONNUE (${host})`;
	if (publish && !isProd && !isLocal) {
		throw new Error(`base visée inconnue (${host}) : écriture refusée`);
	}
	return {
		supabase: createClient<Database>(url, key, {
			auth: { persistSession: false, autoRefreshToken: false }
		}),
		target
	};
}

/** L'unique admin (modèle mono-professeur) : relecteur, éditeur et auteur des imports */
export async function findReviewerId(supabase: SupabaseClient<Database>): Promise<string> {
	const { data, error } = await supabase.from('profiles').select('id').eq('role', 'admin');
	if (error) throw new Error(`lecture des admins : ${error.message}`);
	if (!data || data.length !== 1) {
		throw new Error(`il faut exactement 1 profil admin, trouvé ${data?.length ?? 0}`);
	}
	return data[0].id;
}

/** Sauvegarde des lignes visées, avant écriture ; renvoie le chemin */
export async function backupRows(
	supabase: SupabaseClient<Database>,
	label: string,
	hashes: string[]
): Promise<string> {
	const [tracking, edits] = await Promise.all([
		supabase.from('migration_tracking').select('*').in('old_question_hash', hashes),
		supabase.from('migration_edits').select('*').in('old_question_hash', hashes)
	]);
	if (tracking.error) throw new Error(`sauvegarde du suivi : ${tracking.error.message}`);
	if (edits.error) throw new Error(`sauvegarde des corrections : ${edits.error.message}`);

	mkdirSync(BACKUP_DIR, { recursive: true });
	const path = join(BACKUP_DIR, `${label}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
	writeFileSync(
		path,
		JSON.stringify({ migration_tracking: tracking.data, migration_edits: edits.data }, null, 2)
	);
	return path;
}
