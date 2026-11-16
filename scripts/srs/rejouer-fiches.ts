/**
 * Rejeu des fiches de mémoire (`srs_card_stats`) avec l'algorithme FSRS-6 actuel
 * ==============================================================================
 *
 * ⚠️ SIMULATION PAR DÉFAUT : rien n'est écrit sans `--publier`.
 * ⚠️ `--cible prod --publier` : sur demande explicite de David seulement.
 *
 * Usage :
 *   pnpm srs:rejouer-fiches --cible local               (simulation sur la base locale)
 *   pnpm srs:rejouer-fiches --cible local --publier
 *   pnpm srs:rejouer-fiches --cible prod                (simulation : avant → après + sauvegarde)
 *   pnpm srs:rejouer-fiches --cible prod --publier
 *
 * Le calcul (`rejouer-fiches-calcul.ts`) est décrit là-bas. Avant toute écriture :
 * 1. sauvegarde des lignes lues, telles quelles, HORS DU DÉPÔT (identifiants d'élèves
 *    mineurs) : `~/Downloads/chiphre-srs-card-stats-avant-rejeu-<cible>.json`. Jamais écrasée
 *    par un état différent : c'est le retour arrière. `--publier` refuse si elle ne garde pas
 *    l'état lu de chaque fiche à écrire ;
 * 2. écriture fiche par fiche sous condition `updated_at` inchangé depuis la lecture : une
 *    fiche révisée entre-temps rend 0 ligne, le script s'arrête et dit ce qui est fait ;
 * 3. relancer la même commande saute les fiches déjà rejouées.
 *
 * L'affichage ne montre ni élève ni question : le début de l'identifiant de la fiche seulement.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { parse } from 'dotenv';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Database, Json } from '../../src/lib/types/database';
import { FSRS } from '../../src/lib/srs/fsrs';
import { rejouerFiche, type FicheLue, type ValeursRejouees } from './rejouer-fiches-calcul';

// ============================================================================
// CONSTANTES
// ============================================================================

const PROD_HOST = 'cnevnzsvixxpnurautls.supabase.co';
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);
const COLUMNS =
	'id, user_id, card_reference_type, card_reference_id, difficulty, stability, state, last_review, next_review, total_reviews, review_history, updated_at';

// ============================================================================
// FONCTIONS
// ============================================================================

function argValue(flag: string): string | undefined {
	const index = process.argv.indexOf(flag);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

function clientFrom(file: string, urlKey: string, expected: (host: string) => boolean) {
	const env = parse(readFileSync(file));
	const url = env[urlKey];
	const key = env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) throw new Error(`${urlKey} et SUPABASE_SERVICE_ROLE_KEY requis (${file})`);
	const host = new URL(url).hostname;
	if (!expected(host)) throw new Error(`${file} vise ${host} : base inattendue, arrêt`);
	return createClient<Database>(url, key, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

async function lireFiches(supabase: SupabaseClient<Database>): Promise<FicheLue[]> {
	const { data, error } = await supabase.from('srs_card_stats').select(COLUMNS).order('id');
	if (error) throw new Error(`lecture des fiches : ${error.message}`);
	return data ?? [];
}

function ecrireSauvegarde(fichier: string, fiches: FicheLue[]): void {
	const contenu = JSON.stringify(fiches, null, '\t') + '\n';
	if (existsSync(fichier) && readFileSync(fichier, 'utf8') !== contenu) {
		console.log(`  sauvegarde déjà présente et différente, gardée telle quelle : ${fichier}`);
		return;
	}
	writeFileSync(fichier, contenu, { mode: 0o600 });
	console.log(`  sauvegarde : ${fichier}`);
}

/** Fiches à écrire dont la sauvegarde ne garde pas l'état lu (retour arrière incomplet) */
function absentesDeLaSauvegarde(fichier: string, fiches: FicheLue[]): string[] {
	const lu: unknown = existsSync(fichier) ? JSON.parse(readFileSync(fichier, 'utf8')) : [];
	const sauvees = new Map<string, unknown>(
		Array.isArray(lu)
			? lu.flatMap((s: unknown) =>
					s && typeof s === 'object' && 'id' in s && typeof s.id === 'string' ? [[s.id, s]] : []
				)
			: []
	);
	return fiches
		.filter((f) => {
			const s = sauvees.get(f.id);
			return !(s && typeof s === 'object' && 'updated_at' in s && s.updated_at === f.updated_at);
		})
		.map((f) => court(f.id));
}

function court(id: string): string {
	return id.slice(0, 8);
}

function decrire(f: FicheLue, apres: ValeursRejouees): string {
	const jour = (iso: string) => new Date(iso).toISOString().slice(0, 10);
	return (
		`D ${f.difficulty.toFixed(2)} → ${apres.difficulty.toFixed(2)}, ` +
		`S ${f.stability.toFixed(2)} → ${apres.stability.toFixed(2)} j, ` +
		`${f.state} → ${apres.state}, ` +
		`prochaine ${jour(f.next_review)} → ${jour(apres.next_review)} ` +
		`(${f.total_reviews} révision${f.total_reviews > 1 ? 's' : ''})`
	);
}

async function ecrireFiche(
	supabase: SupabaseClient<Database>,
	fiche: FicheLue,
	apres: ValeursRejouees
): Promise<void> {
	const { data, error } = await supabase
		.from('srs_card_stats')
		.update({
			difficulty: apres.difficulty,
			stability: apres.stability,
			state: apres.state,
			next_review: apres.next_review,
			review_history: apres.review_history as unknown as Json
		})
		.eq('id', fiche.id)
		.eq('updated_at', fiche.updated_at)
		.select('id');
	if (error) throw new Error(`${court(fiche.id)} : ${error.message}`);
	if ((data ?? []).length !== 1) {
		throw new Error(
			`${court(fiche.id)} : 0 ligne écrite (révisée entre la lecture et l'écriture ?)`
		);
	}
}

async function main(): Promise<void> {
	const cible = argValue('--cible');
	if (cible !== 'local' && cible !== 'prod') throw new Error('--cible local|prod requis');
	const publier = process.argv.includes('--publier');

	const supabase =
		cible === 'prod'
			? clientFrom('.env', 'PUBLIC_SUPABASE_URL', (h) => h === PROD_HOST)
			: clientFrom('.env.local', 'SUPABASE_URL', (h) => LOCAL_HOSTS.has(h));
	const sauvegarde = join(
		homedir(),
		'Downloads',
		`chiphre-srs-card-stats-avant-rejeu-${cible}.json`
	);

	const fiches = await lireFiches(supabase);
	console.log(
		`Cible : ${cible === 'prod' ? 'PRODUCTION' : 'base locale'}${publier ? '' : ' (simulation)'}, ` +
			`${fiches.length} fiches lues`
	);
	ecrireSauvegarde(sauvegarde, fiches);

	const fsrs = new FSRS();
	const aEcrire: { fiche: FicheLue; apres: ValeursRejouees }[] = [];
	const compte = { 'sans-historique': 0, inchangee: 0, refusee: 0 };
	for (const fiche of fiches) {
		const r = rejouerFiche(fiche, fsrs);
		if (r.kind === 'rejouee') {
			aEcrire.push({ fiche, apres: r.apres });
			console.log(`  → ${court(fiche.id)} : ${decrire(fiche, r.apres)}`);
		} else {
			compte[r.kind] += 1;
			if (r.kind === 'refusee') console.log(`  ✗ ${court(fiche.id)} : ${r.raison} (non touchée)`);
		}
	}
	console.log(
		`${aEcrire.length} à rejouer, ${compte.inchangee} déjà rejouée(s), ` +
			`${compte['sans-historique']} sans historique, ${compte.refusee} refusée(s).`
	);

	if (!publier) {
		console.log('Simulation : rien n’est écrit. Relancer avec --publier.');
		return;
	}
	const nonSauvees = absentesDeLaSauvegarde(
		sauvegarde,
		aEcrire.map((a) => a.fiche)
	);
	if (nonSauvees.length > 0) {
		throw new Error(
			`sauvegarde ${sauvegarde} sans l'état lu de : ${nonSauvees.join(', ')} ; rien n'est écrit ` +
				'(elle garde un état plus ancien : la mettre de côté, relancer la simulation, puis --publier)'
		);
	}

	let faites = 0;
	try {
		for (const { fiche, apres } of aEcrire) {
			await ecrireFiche(supabase, fiche, apres);
			faites += 1;
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(
			`${message} — ${faites} fiche(s) écrite(s) avant l'arrêt ; relancer la même commande : ` +
				'les fiches déjà rejouées sont sautées'
		);
	}
	console.log(`${faites} fiche(s) écrite(s).`);
}

// ============================================================================
// EXÉCUTION
// ============================================================================

main().catch((err: unknown) => {
	console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
	process.exit(1);
});
