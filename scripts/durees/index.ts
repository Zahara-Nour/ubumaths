/**
 * `pnpm durees` : les durées de la CI, des PR et de la mise en prod
 * =================================================================
 *
 * Compare la durée de chaque phase à la référence écrite dans
 * scripts/durees/reference.json, pour voir une phase devenue nettement plus lente.
 *
 *   pnpm durees                  le tableau : référence, dernières 24 heures,
 *                                7 derniers jours (entre parenthèses, le nombre
 *                                de mesures)
 *   pnpm durees --releve         le relevé de la nuit (launchd, installé par
 *                                `pnpm surveillance:installer`) : une notification
 *                                ntfy par le canal de la surveillance du Mac mini
 *                                si une phase est lente, rien sinon
 *   pnpm durees --releve --essai affiche ce qui serait envoyé, n'envoie rien
 *   pnpm durees --reference [--depuis AAAA-MM-JJ]
 *                                refait la référence sur les mesures prises
 *                                depuis cette date (par défaut : celle de la
 *                                référence actuelle, au plus 7 jours) et réécrit
 *                                le fichier, à commiter par une PR. DAVID SEUL :
 *                                jamais d'ajustement automatique, une lenteur
 *                                installée deviendrait la normale.
 *
 * Alerte : médiane des dernières 24 heures d'au moins 1,5 fois la référence, sur
 * au moins 5 mesures (mise en prod : les 5 dernières, s'il y en a eu une dans la
 * journée). Une seule PR lente ne déclenche rien.
 *
 * Sources : les exécutions de quality.yml sur les PR et leurs jobs (GitHub), les
 * PR mergées, et le journal que `pnpm deploy:prod` tient sur le Mac mini
 * (~/.local/state/durees/mises-en-prod.csv). Les jobs d'une exécution finie ne
 * changent plus : ils sont gardés dans ~/.local/state/durees/runs-v1/, seules
 * les exécutions nouvelles sont lues chez GitHub.
 *
 * Sorties : 0 fait · 1 erreur (GitHub illisible, référence absente).
 * Règles et tests : logique.ts, scripts/__tests__/durees.test.ts.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	comparer,
	estComplete,
	lireJournalProd,
	mesuresDeLaPr,
	mesuresDuRun,
	messageAlerte,
	nouvelleReference,
	tableau,
	type Job,
	type Mesure,
	type PrMergee,
	type Reference,
	type Run
} from './logique.ts';

// ============================================================================
// Types
// ============================================================================

/** Ce qui est gardé d'une exécution finie. */
type RunLu = { complete: boolean; mesures: Mesure[] };

// ============================================================================
// Constantes
// ============================================================================

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FICHIER_REFERENCE = join(RACINE, 'scripts/durees/reference.json');
const ETAT = process.env.DUREES_ETAT ?? join(homedir(), '.local/state/durees');
/** `v1` : à changer si `mesuresDuRun` change, les mesures gardées seraient fausses. */
const CACHE = join(ETAT, 'runs-v1');
const JOURNAL_PROD = join(ETAT, 'mises-en-prod.csv');
/** Le canal de la surveillance du Mac mini (scripts/surveillance-machine.sh). */
const CANAL =
	process.env.DUREES_CANAL ?? join(homedir(), '.config/surveillance-machine/ntfy-topic');
const NTFY_SERVEUR = process.env.NTFY_SERVEUR ?? 'https://ntfy.sh';
const JOUR_MS = 24 * 3600 * 1000;

// ============================================================================
// Fonctions
// ============================================================================

function arreter(...lignes: string[]): never {
	for (const l of lignes) console.error(l);
	process.exit(1);
}

function gh(...args: string[]): string {
	const r = spawnSync('gh', args, { cwd: RACINE, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
	if (r.status !== 0) arreter('⛔ GitHub illisible :', `${r.stdout ?? ''}${r.stderr ?? ''}`.trim());
	return r.stdout;
}

function lireReference(): Reference {
	if (!existsSync(FICHIER_REFERENCE)) arreter(`⛔ Référence absente : ${FICHIER_REFERENCE}`);
	return JSON.parse(readFileSync(FICHIER_REFERENCE, 'utf8')) as Reference;
}

/** Les exécutions de quality.yml sur les PR, créées depuis `depuis` (AAAA-MM-JJ). */
function lireRuns(depuis: string): Run[] {
	const sortie = gh(
		'run',
		'list',
		'--workflow',
		'quality.yml',
		'--event',
		'pull_request',
		'--created',
		`>=${depuis}`,
		'--limit',
		'2000',
		'--json',
		'databaseId,headBranch,headSha,conclusion,status,attempt,createdAt,updatedAt'
	);
	return JSON.parse(sortie) as Run[];
}

/** Les mesures d'une exécution finie, lues chez GitHub la première fois seulement. */
function lireRun(run: Run): RunLu {
	const fichier = join(CACHE, `${run.databaseId}-${run.attempt}.json`);
	if (existsSync(fichier)) return JSON.parse(readFileSync(fichier, 'utf8')) as RunLu;
	const sortie = gh(
		'api',
		'--paginate',
		`repos/{owner}/{repo}/actions/runs/${run.databaseId}/jobs?per_page=100`,
		'--jq',
		'.jobs[]'
	);
	const jobs = sortie
		.split('\n')
		.filter(Boolean)
		.map((ligne) => JSON.parse(ligne) as Job);
	const lu: RunLu = { complete: estComplete(run, jobs), mesures: mesuresDuRun(run, jobs) };
	writeFileSync(fichier, JSON.stringify(lu));
	return lu;
}

function lirePrMergees(depuis: string): PrMergee[] {
	const sortie = gh(
		'pr',
		'list',
		'--state',
		'merged',
		'--search',
		`merged:>=${depuis}`,
		'--limit',
		'1000',
		'--json',
		'number,createdAt,mergedAt,headRefName'
	);
	return JSON.parse(sortie) as PrMergee[];
}

/** Toutes les mesures prises depuis `depuis` (ISO 8601). */
function lireMesures(depuis: string): Mesure[] {
	mkdirSync(CACHE, { recursive: true });
	const jour = depuis.slice(0, 10);
	const runs = lireRuns(jour);
	const mesures: Mesure[] = [];
	const completes = new Set<number>();
	for (const run of runs) {
		if (run.status !== 'completed') continue;
		const lu = lireRun(run);
		if (lu.complete) completes.add(run.databaseId);
		mesures.push(...lu.mesures);
	}
	for (const pr of lirePrMergees(jour)) mesures.push(...mesuresDeLaPr(pr, runs, completes));
	if (existsSync(JOURNAL_PROD))
		mesures.push(...lireJournalProd(readFileSync(JOURNAL_PROD, 'utf8')));
	return mesures.filter((m) => m.date >= depuis);
}

/** Le plus récent de : la date de la référence, il y a `jours` jours. */
function fenetre(reference: Reference, jours: number): string {
	const limite = new Date(Date.now() - jours * JOUR_MS).toISOString();
	return reference.depuis > limite ? reference.depuis : limite;
}

async function envoyer(message: string): Promise<void> {
	if (!existsSync(CANAL)) arreter(`⛔ Pas de canal ntfy (${CANAL}) : pnpm surveillance:installer`);
	const canal = readFileSync(CANAL, 'utf8').trim();
	const reponse = await fetch(`${NTFY_SERVEUR}/${canal}`, {
		method: 'POST',
		headers: { Title: 'Mac mini', Tags: 'hourglass' },
		body: message,
		signal: AbortSignal.timeout(10_000)
	});
	if (!reponse.ok) arreter(`⛔ Échec de l'envoi ntfy (${reponse.status}).`);
}

function refaireLaReference(depuisDemande: string | undefined): void {
	const ancienne = lireReference();
	let depuis = fenetre(ancienne, 7);
	if (depuisDemande !== undefined) {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(depuisDemande) || Number.isNaN(Date.parse(depuisDemande))) {
			arreter('⛔ --depuis attend une date AAAA-MM-JJ.');
		}
		depuis = new Date(depuisDemande).toISOString();
	}
	const { reference, gardees } = nouvelleReference(ancienne, lireMesures(depuis), depuis);
	writeFileSync(FICHIER_REFERENCE, `${JSON.stringify(reference, null, '\t')}\n`);
	console.log(`✅ Référence refaite sur les mesures prises depuis le ${depuis.slice(0, 10)}.`);
	if (gardees.length > 0) {
		console.log(`   Moins de 5 mesures, ancienne valeur gardée : ${gardees.join(', ')}`);
	}
	console.log('   À commiter par une PR : scripts/durees/reference.json');
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const connues = new Set(['--releve', '--essai', '--reference', '--depuis']);
	const iDepuis = args.indexOf('--depuis');
	const inconnue = args.find((a, i) => !connues.has(a) && i !== iDepuis + 1);
	if (inconnue !== undefined || (iDepuis >= 0 && !args.includes('--reference'))) {
		arreter('Usage : pnpm durees [--releve [--essai]] | --reference [--depuis AAAA-MM-JJ]');
	}
	if (args.includes('--reference')) {
		refaireLaReference(iDepuis >= 0 ? args[iDepuis + 1] : undefined);
		return;
	}
	const reference = lireReference();
	const lignes = comparer(lireMesures(fenetre(reference, 7)), reference, new Date());
	if (!args.includes('--releve')) {
		console.log(tableau(lignes));
		console.log(
			`\nRéférence : scripts/durees/reference.json, mesures depuis le ${reference.depuis.slice(0, 10)}.`
		);
		return;
	}
	const message = messageAlerte(lignes);
	if (message === null) console.log('RAS');
	else if (args.includes('--essai')) console.log(`ENVOI : ${message}`);
	else await envoyer(message);
}

await main();
