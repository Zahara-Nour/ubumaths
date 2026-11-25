/**
 * `pnpm nuit` : la tâche de nuit unique
 * =====================================
 *
 *   pnpm nuit                    le bilan de la dernière nuit
 *   pnpm nuit --lancer           joue la nuit (launchd, 2 h, installé par
 *                                `pnpm surveillance:installer`)
 *   pnpm nuit --lancer --essai   joue tout sans rien barrer, commiter, garder
 *                                comme veille ni notifier
 *
 * Trois étapes, dans un worktree à elle (`../ubumaths-wt-nuit`, détaché sur
 * `origin/main`, remis à jour chaque nuit ; jamais le dépôt principal) :
 *
 *   1. preuves des écarts : `pnpm ecarts rejouer --barrer` ; les lignes à preuve
 *      verte sont barrées et poussées sur `main` (commit de doc, seul commit de la
 *      tâche : elle ne merge rien, n'ouvre aucune PR) ;
 *   2. vérifications à l'écran : `pnpm test:verifs:tout` (six navigateurs, serveur
 *      de dev du worktree, base locale) ;
 *   3. gardes de doc : liens, renvois vers le code, couverture.
 *
 * Bilan : un fichier par nuit, hors dépôt (`~/.local/state/nuit/AAAA-MM-JJ.json`).
 * David n'est prévenu (`pnpm prevenir`) que d'un rouge NOUVEAU par rapport aux
 * nuits d'avant ; une étape qui n'a pas pu tourner en est un.
 *
 * Variables : `NUIT_ETAT` (dossier des bilans), `NUIT_WORKTREE`, `NUIT_PORT`
 * (5190), `NUIT_REF` (`origin/main` ; une branche pour essayer avant un merge),
 * `NUIT_VERIFS` (arguments de Playwright en plus : un fichier, pour un essai court).
 * Sorties : 0 fait (même avec des rouges : c'est le bilan qui le dit) · 1 une
 * autre nuit tourne déjà · 2 usage.
 * Règles et tests : logique.ts, scripts/__tests__/nuit.test.ts.
 * Doc : docs/pratiques/tache-de-nuit.md.
 */

import { spawnSync } from 'node:child_process';
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { createConnection } from 'node:net';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	formatSummary,
	isNight,
	newReds,
	parseArgs,
	playwrightTests,
	type BrokenProof,
	type Guard,
	type Night,
	type ProofsData,
	type Step,
	type VerifsData
} from './logique.ts';

// ============================================================================
// Types
// ============================================================================

interface Run {
	status: number | null;
	output: string;
}

// ============================================================================
// Constantes
// ============================================================================

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const STATE = process.env.NUIT_ETAT ?? join(homedir(), '.local/state/nuit');
const LOCK = join(STATE, 'verrou');
const OUTPUTS = join(STATE, 'sorties');
const PORT = Number(process.env.NUIT_PORT ?? 5190);
const REF = process.env.NUIT_REF ?? 'origin/main';
/** Pour essayer sans jouer toute la suite : `NUIT_VERIFS="carnet.spec.ts"` (arguments de Playwright). */
const VERIFS_FILTER = (process.env.NUIT_VERIFS ?? '').split(' ').filter((a) => a !== '');
const REGISTRY = 'docs/ecarts/registre.md';
const NIGHT_FILE = /^\d{4}-\d{2}-\d{2}\.json$/;
const NIGHTS_KEPT = 60;
const MINUTE = 60_000;
const GUARDS: Array<[string, string[]]> = [
	['docs:check-links', ['docs:check-links']],
	['docs:check-refs', ['docs:check-refs', '--strict']],
	['docs:check-a-jour', ['docs:check-a-jour', '--couverture']]
];
const USAGE = 'Usage : pnpm nuit [--lancer [--essai]]';

// ============================================================================
// Fonctions : outils
// ============================================================================

function run(
	command: string,
	args: string[],
	cwd: string,
	options: { minutes: number; env?: NodeJS.ProcessEnv }
): Run {
	const result = spawnSync(command, args, {
		cwd,
		encoding: 'utf8',
		timeout: options.minutes * MINUTE,
		maxBuffer: 256 * 1024 * 1024,
		env: { ...process.env, ...options.env }
	});
	return { status: result.status, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

function lastLines(text: string, count: number): string {
	return text
		.split('\n')
		.map((line) => line.trimEnd())
		.filter((line) => line !== '')
		.slice(-count)
		.join('\n');
}

/** La cause d'un échec, en une ligne : délai dépassé, ou la dernière ligne dite. */
function cause(result: Run): string {
	if (result.status === null) return 'arrêtée (délai dépassé)';
	return lastLines(result.output, 1) || `sortie ${result.status}`;
}

function portBusy(port: number): Promise<boolean> {
	return new Promise((done) => {
		const socket = createConnection({ port, host: 'localhost' });
		socket.once('connect', () => {
			socket.destroy();
			done(true);
		});
		socket.once('error', () => done(false));
	});
}

/** Le dépôt principal, même lancé depuis un worktree. */
function mainRepository(): string {
	const common = run('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], ROOT, {
		minutes: 1
	});
	return dirname(common.output.trim());
}

function readNight(file: string): Night | null {
	try {
		const value: unknown = JSON.parse(readFileSync(file, 'utf8'));
		return isNight(value) ? value : null;
	} catch {
		return null;
	}
}

/** Les nuits gardées, la plus récente d'abord ; un fichier abîmé est ignoré. */
function pastNights(before?: string): Night[] {
	if (!existsSync(STATE)) return [];
	return readdirSync(STATE)
		.filter((name) => NIGHT_FILE.test(name) && (before === undefined || name < `${before}.json`))
		.sort()
		.reverse()
		.map((name) => readNight(join(STATE, name)))
		.filter((night): night is Night => night !== null);
}

// ============================================================================
// Fonctions : étapes
// ============================================================================

/** Met le worktree de la nuit sur `REF`, à neuf. Rend la cause d'un échec, ou `null`. */
function prepare(depot: string, worktree: string): string | null {
	// Sans `.env.local`, le serveur de dev parlerait à la base DISTANTE : on n'y va pas.
	if (!existsSync(join(depot, '.env.local'))) return '.env.local absent du dépôt principal';

	const fetched = run('git', ['fetch', '--quiet', 'origin', 'main'], depot, { minutes: 5 });
	if (fetched.status !== 0) return `git fetch : ${cause(fetched)}`;

	if (!existsSync(worktree)) {
		const added = run('git', ['worktree', 'add', '--detach', worktree, REF], depot, { minutes: 5 });
		if (added.status !== 0) return `git worktree add : ${cause(added)}`;
	} else {
		const dirty = run('git', ['status', '--porcelain'], worktree, { minutes: 1 });
		if (dirty.status !== 0) return `git status : ${cause(dirty)}`;
		// Jamais de ménage à l'aveugle : ce qui traîne là se regarde à la main.
		if (dirty.output.trim() !== '') return `${worktree} n'est pas propre (git status)`;
		const moved = run('git', ['checkout', '--quiet', '--detach', REF], worktree, { minutes: 5 });
		if (moved.status !== 0) return `git checkout : ${cause(moved)}`;
	}

	for (const name of ['.env', '.env.local']) {
		if (existsSync(join(depot, name))) copyFileSync(join(depot, name), join(worktree, name));
	}
	const installed = run('pnpm', ['install', '--prefer-offline', '--frozen-lockfile'], worktree, {
		minutes: 20
	});
	return installed.status === 0 ? null : `pnpm install : ${cause(installed)}`;
}

/** Pousse le commit du registre sur `main` ; une seule reprise si `main` a bougé entre-temps. */
function pushRegistry(worktree: string): string | null {
	const push = (): Run => run('git', ['push', 'origin', 'HEAD:main'], worktree, { minutes: 15 });
	const first = push();
	if (first.status === 0) return null;
	const fetched = run('git', ['fetch', '--quiet', 'origin', 'main'], worktree, { minutes: 5 });
	const rebased = run('git', ['rebase', 'origin/main'], worktree, { minutes: 5 });
	if (fetched.status !== 0 || rebased.status !== 0) {
		run('git', ['rebase', '--abort'], worktree, { minutes: 1 });
		return cause(first);
	}
	const second = push();
	return second.status === 0 ? null : cause(second);
}

function isReplayLine(value: unknown): value is { id: string; outcome: string; detail?: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		'id' in value &&
		typeof value.id === 'string' &&
		'outcome' in value &&
		typeof value.outcome === 'string'
	);
}

function proofsStep(worktree: string, trial: boolean): Step<ProofsData> {
	const file = join(OUTPUTS, 'ecarts.json');
	rmSync(file, { force: true });
	const args = ['--silent', 'ecarts', 'rejouer', `--json=${file}`, ...(trial ? [] : ['--barrer'])];
	const replay = run('pnpm', args, worktree, { minutes: 30 });
	if (replay.status !== 0 || !existsSync(file)) return { ok: false, failure: cause(replay) };

	let lines: unknown;
	try {
		lines = JSON.parse(readFileSync(file, 'utf8'));
	} catch {
		return { ok: false, failure: 'bilan du rejeu illisible' };
	}
	if (!Array.isArray(lines) || !lines.every(isReplayLine)) {
		return { ok: false, failure: 'bilan du rejeu illisible' };
	}
	const broken: BrokenProof[] = lines
		.filter((line) => line.outcome === 'broken')
		.map((line) => ({ id: line.id, detail: line.detail ?? 'preuve cassée' }));
	const data: ProofsData = {
		struck: [],
		pushFailure: null,
		broken,
		open: lines.map((line) => line.id)
	};

	// Ce que la commande dit avoir barré fait foi (elle relit le registre avant d'écrire).
	const struck = /^Barré dans le registre : (.+?)\. À commiter/m.exec(replay.output);
	if (struck === null) return { ok: true, data };
	data.struck = struck[1].split(', ');

	const message = `docs(ecarts): preuves vertes de la nuit, ${data.struck.length} écart(s) barré(s)`;
	const commit = run('git', ['commit', '-m', message, '--', REGISTRY], worktree, { minutes: 10 });
	data.pushFailure =
		commit.status === 0 ? pushRegistry(worktree) : `commit refusé : ${cause(commit)}`;
	return { ok: true, data };
}

async function verifsStep(worktree: string): Promise<Step<VerifsData>> {
	// Un serveur déjà là serait réutilisé par Playwright : ce ne serait pas le code de `main`.
	if (await portBusy(PORT)) return { ok: false, failure: `le port ${PORT} est déjà pris` };

	const file = join(OUTPUTS, 'verifs.json');
	rmSync(file, { force: true });
	const played = run(
		'pnpm',
		[
			'--silent',
			'test:verifs:tout',
			'--reporter=json',
			`--output=${join(OUTPUTS, 'verifs')}`,
			...VERIFS_FILTER
		],
		worktree,
		{
			minutes: 240,
			env: { VERIFS_PORT: String(PORT), PLAYWRIGHT_JSON_OUTPUT_NAME: file }
		}
	);
	// Sortie non nulle = des tests rouges, ou rien de joué : c'est le compte rendu qui tranche.
	if (!existsSync(file)) return { ok: false, failure: cause(played) };
	let report: unknown;
	try {
		report = JSON.parse(readFileSync(file, 'utf8'));
	} catch {
		return { ok: false, failure: 'compte rendu de Playwright illisible' };
	}
	const tests = playwrightTests(report);
	if (tests === null) return { ok: false, failure: `aucun test joué (${cause(played)})` };
	if (played.status === null) return { ok: false, failure: 'arrêtées (délai dépassé)' };
	return { ok: true, data: { tests } };
}

function guardsStep(worktree: string): Step<Guard[]> {
	return {
		ok: true,
		data: GUARDS.map(([name, args]): Guard => {
			const result = run('pnpm', ['--silent', ...args], worktree, { minutes: 10 });
			const ok = result.status === 0;
			return { name, ok, detail: ok ? '' : lastLines(result.output, 8) || cause(result) };
		})
	};
}

// ============================================================================
// Fonctions : commandes
// ============================================================================

/** `false` si une autre nuit tourne ; un verrou laissé par un processus mort est repris. */
function takeLock(): boolean {
	mkdirSync(OUTPUTS, { recursive: true });
	if (existsSync(LOCK)) {
		const pid = Number(readFileSync(LOCK, 'utf8').trim());
		try {
			if (Number.isInteger(pid) && pid > 0) {
				process.kill(pid, 0);
				return false;
			}
		} catch {
			// Processus disparu : le verrou est périmé.
		}
	}
	writeFileSync(LOCK, `${process.pid}\n`);
	return true;
}

function forget(): void {
	const files = readdirSync(STATE)
		.filter((name) => NIGHT_FILE.test(name))
		.sort()
		.reverse();
	for (const name of files.slice(NIGHTS_KEPT)) rmSync(join(STATE, name), { force: true });
}

async function launch(trial: boolean): Promise<void> {
	if (!takeLock()) {
		console.error('⛔ Une nuit tourne déjà.');
		process.exit(1);
	}
	try {
		const depot = mainRepository();
		const worktree = process.env.NUIT_WORKTREE ?? join(dirname(depot), 'ubumaths-wt-nuit');
		const date = new Date().toLocaleDateString('sv-SE');
		const failure = prepare(depot, worktree);

		let night: Night;
		if (failure !== null) {
			const down = { ok: false, failure: `préparation : ${failure}` } as const;
			night = { date, commit: 'inconnu', proofs: down, verifs: down, guards: down };
		} else {
			const head = run('git', ['rev-parse', '--short', 'HEAD'], worktree, { minutes: 1 });
			night = {
				date,
				commit: head.output.trim() || 'inconnu',
				proofs: proofsStep(worktree, trial),
				verifs: await verifsStep(worktree),
				guards: guardsStep(worktree)
			};
		}

		const previous = pastNights(date);
		writeFileSync(
			join(STATE, trial ? 'essai.json' : `${date}.json`),
			`${JSON.stringify(night, null, '\t')}\n`
		);
		console.log(formatSummary(night, previous));
		if (trial) {
			console.log('\n(essai : rien de barré, rien de commité, pas de notification)');
			return;
		}
		forget();
		if (newReds(previous, night).length > 0) {
			// Le message ne dit rien du contenu : David lit le bilan par `pnpm nuit`.
			const sent = run(
				'pnpm',
				['--silent', 'prevenir', 'geste', 'bilan de la nuit à lire', '--session', 'tache-de-nuit'],
				ROOT,
				{ minutes: 2 }
			);
			console.log(lastLines(sent.output, 1));
		}
	} finally {
		rmSync(LOCK, { force: true });
	}
}

function show(): void {
	const [latest, ...previous] = pastNights();
	if (latest === undefined) {
		console.log(`Aucune nuit jouée (${STATE}). Installation : pnpm surveillance:installer`);
		return;
	}
	console.log(formatSummary(latest, previous));
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	if (args === null) {
		console.error(USAGE);
		process.exit(2);
	}
	if (args.command === 'show') show();
	else await launch(args.trial);
}

await main();
