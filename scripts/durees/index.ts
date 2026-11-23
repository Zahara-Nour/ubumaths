/**
 * `pnpm durees` : les durées de la CI, des PR, de la mise en prod et du Mac mini
 * ==============================================================================
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
 * au moins 5 mesures (mise en prod et suite d'intégration de la nuit : les 5
 * dernières, s'il y en a eu une dans la journée). Une seule PR lente ne déclenche rien.
 *
 * Sources :
 *   - GitHub : les exécutions de quality.yml sur les PR et leurs jobs, les PR
 *     mergées, les exécutions de nightly-integration.yml (la nuit et sur les PR ;
 *     seule une suite entière compte) ;
 *   - le Mac mini, sous ~/.local/state/durees/ : `mises-en-prod.csv`, tenu par
 *     `pnpm deploy:prod`, et `local.csv`, où `check:incremental`, `test:server`,
 *     `test:client`, `test:integration`, le pre-push et `pnpm pr:merger` notent
 *     leur durée quand ils sont verts et ont tout joué (scripts/durees/noter.sh).
 * Les jobs d'une exécution finie ne changent plus : ils sont gardés dans
 * ~/.local/state/durees/runs-v1/, seules les exécutions nouvelles sont lues chez GitHub.
 *
 * Sorties : 0 fait · 1 erreur (GitHub illisible, référence absente).
 * Règles et tests : logique.ts, scripts/__tests__/durees.test.ts.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	comparer,
	estComplete,
	estRare,
	lireArguments,
	lireJournalLocal,
	lireJournalProd,
	lireReference,
	mesuresDeLaPr,
	mesuresDuRun,
	mesuresIntegration,
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
/** Tenu par scripts/durees/noter.sh. */
const JOURNAL_LOCAL = join(ETAT, 'local.csv');
const CHAMPS_RUN =
	'databaseId,event,headBranch,headSha,conclusion,status,attempt,createdAt,updatedAt';
/** La suite de la nuit : une par jour, on lit les dernières quel que soit leur âge. */
const NUITS_LUES = 10;
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

function chargerReference(): Reference {
	if (!existsSync(FICHIER_REFERENCE)) arreter(`⛔ Référence absente : ${FICHIER_REFERENCE}`);
	const reference = lireReference(readFileSync(FICHIER_REFERENCE, 'utf8'));
	if (reference === null) {
		arreter(
			`⛔ Référence mal formée : ${FICHIER_REFERENCE}`,
			'   Attendu : { "depuis": date ISO, "phases": { "<phase>": secondes entières } }'
		);
	}
	return reference;
}

/** Ce qui est gardé d'une exécution, ou `null` : absent, ou illisible (écriture interrompue). */
function lireCache(fichier: string): RunLu | null {
	if (!existsSync(fichier)) return null;
	try {
		const lu: unknown = JSON.parse(readFileSync(fichier, 'utf8'));
		if (typeof lu === 'object' && lu !== null && 'complete' in lu && 'mesures' in lu) {
			return lu as RunLu;
		}
	} catch {
		// relu chez GitHub
	}
	return null;
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
		CHAMPS_RUN
	);
	return JSON.parse(sortie) as Run[];
}

/**
 * Les exécutions de nightly-integration.yml : celles des PR créées depuis
 * `depuis` (AAAA-MM-JJ), et les dernières de la nuit.
 */
function lireRunsIntegration(depuis: string): Run[] {
	const lister = (...filtre: string[]) =>
		JSON.parse(
			gh('run', 'list', '--workflow', 'nightly-integration.yml', ...filtre, '--json', CHAMPS_RUN)
		) as Run[];
	return [
		...lister('--event', 'pull_request', '--created', `>=${depuis}`, '--limit', '2000'),
		...lister('--event', 'schedule', '--limit', String(NUITS_LUES))
	];
}

function lireJobs(run: Run): Job[] {
	return gh(
		'api',
		'--paginate',
		`repos/{owner}/{repo}/actions/runs/${run.databaseId}/jobs?per_page=100`,
		'--jq',
		'.jobs[]'
	)
		.split('\n')
		.filter(Boolean)
		.map((ligne) => JSON.parse(ligne) as Job);
}

/** Écrit à côté puis renommé : une écriture interrompue ne laisse pas un fichier tronqué. */
function garder(fichier: string, lu: RunLu): void {
	writeFileSync(`${fichier}.tmp`, JSON.stringify(lu));
	renameSync(`${fichier}.tmp`, fichier);
}

/** Les mesures d'une exécution finie, lues chez GitHub la première fois seulement. */
function lireRun(run: Run): RunLu {
	const fichier = join(CACHE, `${run.databaseId}-${run.attempt}.json`);
	const garde = lireCache(fichier);
	if (garde !== null) return garde;
	const jobs = lireJobs(run);
	const lu: RunLu = { complete: estComplete(run, jobs), mesures: mesuresDuRun(run, jobs) };
	garder(fichier, lu);
	return lu;
}

/** Pareil pour une exécution finie de la suite d'intégration (`complete` = suite entière). */
function lireRunIntegration(run: Run): Mesure[] {
	const fichier = join(CACHE, `integration-${run.databaseId}-${run.attempt}.json`);
	const garde = lireCache(fichier);
	if (garde !== null) return garde.mesures;
	const mesures = mesuresIntegration(run, lireJobs(run));
	garder(fichier, { complete: mesures.length > 0, mesures });
	return mesures;
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

/**
 * Les mesures de la CI, des PR et du Mac mini prises depuis `depuis` (ISO 8601),
 * et TOUTES celles des phases rares (mise en prod, suite de la nuit) : la règle
 * lit leurs 5 dernières (`comparer` écarte ce qui précède la référence).
 */
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
	for (const run of lireRunsIntegration(jour)) {
		// Une exécution rouge, annulée ou relancée n'est jamais une mesure : pas lue.
		if (run.status !== 'completed' || run.conclusion !== 'success' || run.attempt !== 1) continue;
		mesures.push(...lireRunIntegration(run));
	}
	if (existsSync(JOURNAL_PROD))
		mesures.push(...lireJournalProd(readFileSync(JOURNAL_PROD, 'utf8')));
	if (existsSync(JOURNAL_LOCAL))
		mesures.push(...lireJournalLocal(readFileSync(JOURNAL_LOCAL, 'utf8')));
	return mesures.filter((m) => estRare(m.phase) || m.date >= depuis);
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
	const ancienne = chargerReference();
	const depuis = depuisDemande ?? fenetre(ancienne, 7);
	// Phases rares : depuis la date demandée, sinon depuis celle de la référence (pas 7 jours).
	const depuisProd = depuisDemande ?? ancienne.depuis;
	const { reference, gardees } = nouvelleReference(
		ancienne,
		lireMesures(depuis),
		depuis,
		depuisProd
	);
	writeFileSync(FICHIER_REFERENCE, `${JSON.stringify(reference, null, '\t')}\n`);
	console.log(`✅ Référence refaite sur les mesures prises depuis le ${depuis.slice(0, 10)}.`);
	if (gardees.length > 0) {
		console.log(`   Moins de 5 mesures, ancienne valeur gardée : ${gardees.join(', ')}`);
	}
	console.log('   À commiter par une PR : scripts/durees/reference.json');
}

async function main(): Promise<void> {
	const demande = lireArguments(process.argv.slice(2));
	if (demande === null) {
		arreter('Usage : pnpm durees [--releve [--essai]] | --reference [--depuis AAAA-MM-JJ]');
	}
	if (demande.mode === 'reference') {
		refaireLaReference(demande.depuis);
		return;
	}
	const reference = chargerReference();
	const lignes = comparer(lireMesures(fenetre(reference, 7)), reference, new Date());
	if (demande.mode === 'tableau') {
		console.log(tableau(lignes));
		console.log(
			`\nRéférence : scripts/durees/reference.json, mesures depuis le ${reference.depuis.slice(0, 10)}.`
		);
		return;
	}
	const message = messageAlerte(lignes);
	if (message === null) console.log('RAS');
	else if (demande.essai) console.log(`ENVOI : ${message}`);
	else await envoyer(message);
}

await main();
