#!/usr/bin/env tsx

/**
 * Reprise des modèles à snapshot — ADR 0029, étape 4
 * ===================================================
 *
 * Donne à un modèle de chapitre son contenu EN TABLES, copié de son chapitre
 * d'origine, et répare les chapitres créés depuis lui par l'ancien code (faux
 * liens `storage://`). Le travail est fait par `migrateSnapshotTemplate`
 * (src/lib/server/chapter-template-reprise.ts) ; ce script choisit la base,
 * sauvegarde l'état avant écriture et imprime le compte rendu.
 *
 * Contrainte : les élèves gardent l'accès aux documents publiés à tout instant.
 * Aucune suppression de fichier ni de document publié ; les anciens fichiers
 * `chapters/…` restent (nettoyage = étape 5, à part).
 *
 * Usage :
 *   pnpm exec tsx scripts/reprise-modeles-adr0029.ts --modele <uuid> --source <uuid>
 *       → ESSAI sur la base LOCALE (.env.local) : n'écrit rien
 *   … --appliquer                    → écrit (base locale)
 *   … --cible=prod                   → base de PRODUCTION (.env), essai
 *   … --cible=prod --appliquer       → écrit en PRODUCTION (sauvegarde JSON d'abord)
 *
 * Production, 2026-10-14 : --modele f74e72c8-008e-4869-9a06-05047c3d73c8
 *                          --source 1c997492-9dbc-4937-9862-3a81a39424a9
 *
 * Code de sortie : 0 si tout est vérifié, 1 sinon (arrêt ou vérification en échec).
 */

import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { z } from 'zod';
import type { Database } from '$lib/types/database';
import { migrateSnapshotTemplate } from '$lib/server/chapter-template-reprise';

// Constantes
const PROJET_PROD = 'cnevnzsvixxpnurautls';
const HOTES_LOCAUX = ['127.0.0.1', 'localhost'];

const argsSchema = z.object({
	modele: z.string().uuid('--modele : un UUID de modèle'),
	source: z.string().uuid('--source : un UUID de chapitre'),
	appliquer: z.boolean(),
	prod: z.boolean()
});

// Functions
function valeur(nom: string): string | undefined {
	const i = process.argv.indexOf(nom);
	return i >= 0 ? process.argv[i + 1] : undefined;
}

/** La base visée : locale par défaut, la production seulement sur `--cible=prod`. */
function client(prod: boolean): { supabase: SupabaseClient<Database>; url: string } {
	// La production lit `.env` SEUL ; la locale lit `.env.local` SEUL (jamais de repli
	// silencieux vers `.env`, qui vise la production).
	const env: Record<string, string | undefined> = {};
	config({ path: prod ? '.env' : '.env.local', processEnv: env, quiet: true });
	const url = env.PUBLIC_SUPABASE_URL;
	const cle = env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !cle) {
		throw new Error(
			`PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans ${prod ? '.env' : '.env.local'}`
		);
	}
	const hote = new URL(url).hostname;
	if (prod && !url.includes(PROJET_PROD)) {
		throw new Error(`--cible=prod : base inattendue ${url} (attendu : ${PROJET_PROD})`);
	}
	if (!prod && !HOTES_LOCAUX.includes(hote)) {
		throw new Error(`Base locale attendue, trouvé ${url} : arrêt (la prod exige --cible=prod)`);
	}
	return {
		supabase: createClient<Database>(url, cle, {
			auth: { persistSession: false, autoRefreshToken: false }
		}),
		url
	};
}

/** L'état touché par la reprise, sauvegardé en JSON avant toute écriture. */
async function sauvegarder(supabase: SupabaseClient<Database>, modele: string): Promise<string> {
	const { data: template, error: e1 } = await supabase
		.from('chapter_templates')
		.select('*')
		.eq('id', modele)
		.maybeSingle();
	const { data: insts, error: e2 } = await supabase
		.from('chapter_template_instantiations')
		.select('*')
		.eq('template_id', modele);
	const chapitres = (insts ?? []).map((i) => i.chapter_id);
	const tables = [
		'chapter_sections',
		'chapter_documents',
		'chapter_checklist_items',
		'chapter_exercises',
		'chapter_worksheets',
		'chapter_series'
	] as const;
	const lignes: Record<string, unknown[]> = {};
	for (const t of tables) {
		const { data, error } = await supabase.from(t).select('*').in('chapter_id', chapitres);
		if (error) throw new Error(`Sauvegarde ${t} impossible : ${error.message}`);
		lignes[t] = data ?? [];
	}
	if (e1 || e2) throw new Error(`Sauvegarde impossible : ${(e1 ?? e2)?.message}`);

	const chemin = join(tmpdir(), `reprise-modeles-adr0029-${modele}-${Date.now()}.json`);
	writeFileSync(chemin, JSON.stringify({ template, instantiations: insts, ...lignes }, null, 2));
	return chemin;
}

async function main(): Promise<number> {
	const args = argsSchema.safeParse({
		modele: valeur('--modele'),
		source: valeur('--source'),
		appliquer: process.argv.includes('--appliquer'),
		prod: process.argv.includes('--cible=prod')
	});
	if (!args.success) {
		console.error(`Arguments invalides : ${args.error.issues[0].message}`);
		console.error('Usage : --modele <uuid> --source <uuid> [--appliquer] [--cible=prod]');
		return 1;
	}
	const { modele, source, appliquer, prod } = args.data;
	const { supabase, url } = client(prod);

	console.log(
		`${appliquer ? 'ÉCRITURE' : 'ESSAI'} — ${prod ? 'PRODUCTION' : 'base locale'} ${url}`
	);
	console.log(`Modèle ${modele}, chapitre source ${source}\n`);

	if (appliquer)
		console.log(`Sauvegarde avant écriture : ${await sauvegarder(supabase, modele)}\n`);

	const { data, error } = await migrateSnapshotTemplate(modele, source, supabase, {
		dryRun: !appliquer
	});
	if (error) {
		for (const l of error.lines) console.log(l);
		console.error(`\nARRÊT : ${error.message}`);
		return 1;
	}
	if (!data) return 1;

	for (const l of data.lines) console.log(l);
	console.log('');
	for (const l of data.verification.lines) console.log(l);
	console.log(
		`\n${data.verification.ok ? 'OK' : 'VÉRIFICATION EN ÉCHEC'} — ` +
			{
				dry_run: 'essai, rien écrit (relancer avec --appliquer pour écrire)',
				done: 'reprise appliquée',
				nothing_to_do: 'rien à faire, reprise déjà passée'
			}[data.outcome]
	);
	return data.verification.ok ? 0 : 1;
}

main()
	.then((code) => process.exit(code))
	.catch((err: unknown) => {
		console.error(err instanceof Error ? err.message : err);
		process.exit(1);
	});
