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
 *      de dev du worktree lancé par la tâche, base locale), puis un second essai
 *      des seuls rouges, deux à la fois : un vert au second essai est « instable » ;
 *   3. gardes de doc : liens, renvois vers le code, couverture.
 *
 * Bilan : un fichier par nuit, hors dépôt (`~/.local/state/nuit/AAAA-MM-JJ.json`).
 * David n'est prévenu (`pnpm prevenir`) que d'un rouge NOUVEAU par rapport aux
 * nuits d'avant ; une étape qui n'a pas pu tourner en est un, rappelé tous les
 * 7 jours tant qu'elle dure. Un second `--lancer` le même jour est refusé.
 *
 * Variables : `NUIT_ETAT` (dossier des bilans), `NUIT_WORKTREE`, `NUIT_PORT`
 * (5190), `NUIT_REF` (`origin/main` ; une branche pour essayer avant un merge),
 * `NUIT_VERIFS` (arguments de Playwright en plus : un fichier, pour un essai court).
 * Sorties : 0 fait (même avec des rouges : c'est le bilan qui le dit) · 1 une
 * autre nuit tourne déjà, ou celle du jour est déjà jouée · 2 usage.
 * Règles et tests : logique.ts, scripts/__tests__/nuit.test.ts.
 * Doc : docs/pratiques/tache-de-nuit.md.
 */

import { spawn, spawnSync } from 'node:child_process';
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	openSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync
} from 'node:fs';
import { createConnection } from 'node:net';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	LOAD_ERROR,
	deliveredNotice,
	formatSummary,
	isNight,
	lockIsStale,
	mergeReplay,
	notificationPhrase,
	notifiedOutages,
	parseArgs,
	playwrightTests,
	processTree,
	readReplay,
	redsToNotify,
	staleDays,
	struckIds,
	type BrokenProof,
	type Guard,
	type Night,
	type ProofsData,
	type Step,
	type TestStatus,
	type VerifsData
} from './logique.ts';

// ============================================================================
// Types
// ============================================================================

interface Run {
	/** `null` : arrêtée au délai. */
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
/** Les rouges de la suite, pour son second essai (`--last-failed`). */
const LAST_RUN = join(OUTPUTS, 'dernier-passage.json');
const PORT = Number(process.env.NUIT_PORT ?? 5190);
const REF = process.env.NUIT_REF ?? 'origin/main';
/** Pour essayer sans jouer toute la suite : `NUIT_VERIFS="carnet.spec.ts"` (arguments de Playwright). */
const VERIFS_FILTER = (process.env.NUIT_VERIFS ?? '').split(' ').filter((a) => a !== '');
const REGISTRY = 'docs/ecarts/registre.md';
const NIGHT_FILE = /^\d{4}-\d{2}-\d{2}\.json$/;
const NIGHTS_KEPT = 60;
const MINUTE = 60_000;
/** Ce qui est gardé de la sortie d'une commande : la fin suffit à dire la cause. */
const OUTPUT_KEPT = 200_000;
/** Démarrage à froid du serveur de dev (migrations locales comprises). */
const SERVER_START_MS = 5 * MINUTE;
const GUARDS: Array<[string, string[]]> = [
	['docs:check-links', ['docs:check-links']],
	['docs:check-refs', ['docs:check-refs', '--strict']],
	['docs:check-a-jour', ['docs:check-a-jour', '--couverture']]
];
const USAGE = 'Usage : pnpm nuit [--lancer [--essai]]';

// ============================================================================
// Fonctions : outils
// ============================================================================

/**
 * Arrête des processus et toute leur descendance. Arrêter un groupe ne suffit
 * pas : pnpm met chaque script dans le sien (vu à l'essai du 2026-11-25, le
 * serveur de dev survivait à Playwright).
 */
function stopTrees(roots: number[]): void {
	const ps = spawnSync('ps', ['-axo', 'pid=,ppid='], { encoding: 'utf8' }).stdout ?? '';
	const pids = [...new Set(roots.flatMap((root) => processTree(ps, root)))];
	const signalAll = (signal: NodeJS.Signals): void => {
		for (const pid of pids) {
			try {
				process.kill(pid, signal);
			} catch {
				// Déjà parti.
			}
		}
	};
	signalAll('SIGTERM');
	setTimeout(() => signalAll('SIGKILL'), 5_000).unref();
}

/**
 * Lance une commande ; au délai, elle et toute sa descendance sont arrêtées
 * (pnpm, Playwright, navigateurs).
 */
function run(
	command: string,
	args: string[],
	cwd: string,
	options: { minutes: number; env?: NodeJS.ProcessEnv }
): Promise<Run> {
	return new Promise((done) => {
		let output = '';
		let timedOut = false;
		const child = spawn(command, args, {
			cwd,
			detached: true,
			stdio: ['ignore', 'pipe', 'pipe'],
			env: { ...process.env, ...options.env }
		});
		const keep = (chunk: Buffer): void => {
			output = `${output}${chunk.toString('utf8')}`.slice(-OUTPUT_KEPT);
		};
		child.stdout.on('data', keep);
		child.stderr.on('data', keep);

		const timer = setTimeout(() => {
			timedOut = true;
			if (child.pid !== undefined) stopTrees([child.pid]);
		}, options.minutes * MINUTE);

		child.once('error', (error) => {
			clearTimeout(timer);
			done({ status: 127, output: `${output}${error.message}` });
		});
		// `exit` et non `close` : un petit-enfant resté en vie garde les tuyaux ouverts, et
		// `close` n'arriverait jamais. Un court délai laisse arriver la fin de la sortie.
		child.once('exit', (status) => {
			clearTimeout(timer);
			setTimeout(() => done({ status: timedOut ? null : (status ?? 1), output }), 300);
		});
	});
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
async function mainRepository(): Promise<string> {
	const common = await run(
		'git',
		['rev-parse', '--path-format=absolute', '--git-common-dir'],
		ROOT,
		{ minutes: 1 }
	);
	if (common.status !== 0) throw new Error(`dépôt principal introuvable : ${cause(common)}`);
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

function today(): string {
	return new Date().toLocaleDateString('sv-SE');
}

// ============================================================================
// Fonctions : étapes
// ============================================================================

/** Met le worktree de la nuit sur `REF`, à neuf. Rend la cause d'un échec, ou `null`. */
async function prepare(depot: string, worktree: string): Promise<string | null> {
	// Sans `.env.local`, le serveur de dev parlerait à la base DISTANTE : on n'y va pas.
	if (!existsSync(join(depot, '.env.local'))) return '.env.local absent du dépôt principal';

	const fetched = await run('git', ['fetch', '--quiet', 'origin', 'main'], depot, { minutes: 5 });
	if (fetched.status !== 0) return `git fetch : ${cause(fetched)}`;

	if (!existsSync(worktree)) {
		const added = await run('git', ['worktree', 'add', '--detach', worktree, REF], depot, {
			minutes: 5
		});
		if (added.status !== 0) return `git worktree add : ${cause(added)}`;
	} else {
		const dirty = await run('git', ['status', '--porcelain'], worktree, { minutes: 1 });
		if (dirty.status !== 0) return `git status : ${cause(dirty)}`;
		// Jamais de ménage à l'aveugle : ce qui traîne là se regarde à la main.
		if (dirty.output.trim() !== '') return `${worktree} n'est pas propre (git status)`;
		const moved = await run('git', ['checkout', '--quiet', '--detach', REF], worktree, {
			minutes: 5
		});
		if (moved.status !== 0) return `git checkout : ${cause(moved)}`;
	}

	for (const name of ['.env', '.env.local']) {
		if (existsSync(join(depot, name))) copyFileSync(join(depot, name), join(worktree, name));
	}
	const installed = await run(
		'pnpm',
		['install', '--prefer-offline', '--frozen-lockfile'],
		worktree,
		{ minutes: 20 }
	);
	return installed.status === 0 ? null : `pnpm install : ${cause(installed)}`;
}

/** Pousse le commit du registre sur `main` ; une seule reprise si `main` a bougé entre-temps. */
async function pushRegistry(worktree: string): Promise<string | null> {
	const push = (): Promise<Run> =>
		run('git', ['push', 'origin', 'HEAD:main'], worktree, { minutes: 15 });
	const first = await push();
	if (first.status === 0) return null;
	const fetched = await run('git', ['fetch', '--quiet', 'origin', 'main'], worktree, {
		minutes: 5
	});
	if (fetched.status !== 0) return cause(first);
	const rebased = await run('git', ['rebase', 'origin/main'], worktree, { minutes: 5 });
	if (rebased.status !== 0) {
		await run('git', ['rebase', '--abort'], worktree, { minutes: 1 });
		return cause(first);
	}
	const second = await push();
	return second.status === 0 ? null : cause(second);
}

async function proofsStep(worktree: string, trial: boolean): Promise<Step<ProofsData>> {
	const file = join(OUTPUTS, 'ecarts.json');
	rmSync(file, { force: true });
	const args = ['--silent', 'ecarts', 'rejouer', `--json=${file}`, ...(trial ? [] : ['--barrer'])];
	const replay = await run('pnpm', args, worktree, { minutes: 30 });
	if (replay.status !== 0 || !existsSync(file)) return { ok: false, failure: cause(replay) };

	let lines: ReturnType<typeof readReplay> = null;
	try {
		lines = readReplay(JSON.parse(readFileSync(file, 'utf8')));
	} catch {
		// Fichier illisible : dit juste en dessous.
	}
	if (lines === null) return { ok: false, failure: 'bilan du rejeu illisible' };

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
	const struck = struckIds(replay.output);
	if (struck === null) return { ok: true, data };
	data.struck = struck;

	const message = `docs(ecarts): preuves vertes de la nuit, ${data.struck.length} écart(s) barré(s)`;
	const commit = await run('git', ['commit', '-m', message, '--', REGISTRY], worktree, {
		minutes: 10
	});
	if (commit.status === 0) {
		data.pushFailure = await pushRegistry(worktree);
	} else {
		data.pushFailure = `commit refusé : ${cause(commit)}`;
		// Le registre barré ne reste pas modifié : le worktree sale bloquerait toutes les nuits
		// suivantes. Les lignes seront barrées de nouveau au prochain rejeu.
		await run('git', ['restore', '--staged', '--worktree', '--', REGISTRY], worktree, {
			minutes: 1
		});
	}
	return { ok: true, data };
}

/**
 * Lance le serveur de dev du worktree et attend qu'il réponde. Rend de quoi
 * l'arrêter, ou la cause de l'échec. La tâche le lance elle-même : Playwright
 * ne sait pas arrêter celui qu'il lance par pnpm (il attend sans fin).
 */
async function startServer(worktree: string): Promise<{ stop: () => void } | string> {
	const logFile = join(OUTPUTS, 'serveur.log');
	const log = openSync(logFile, 'w');
	const child = spawn('pnpm', ['dev', '--port', String(PORT), '--strictPort'], {
		cwd: worktree,
		detached: true,
		// Un fichier, pas un tuyau : rien ne retient la tâche quand elle s'arrête.
		stdio: ['ignore', log, log]
	});
	child.unref();
	let exited = false;
	child.once('exit', () => {
		exited = true;
	});
	child.once('error', () => {
		exited = true;
	});

	const stop = (): void => {
		// Ce qui écoute encore sur le port est le nôtre : il était libre avant le lancement.
		const listening = spawnSync('lsof', ['-ti', `tcp:${PORT}`, '-sTCP:LISTEN'], {
			encoding: 'utf8'
		});
		const listeners = (listening.stdout ?? '')
			.split('\n')
			.map(Number)
			.filter((pid) => Number.isInteger(pid) && pid > 0);
		stopTrees([...(child.pid === undefined ? [] : [child.pid]), ...listeners]);
	};

	const deadline = Date.now() + SERVER_START_MS;
	while (Date.now() < deadline) {
		if (await portBusy(PORT)) return { stop };
		if (exited) break;
		await new Promise((resolve) => setTimeout(resolve, 1_000));
	}
	stop();
	const said = existsSync(logFile) ? lastLines(readFileSync(logFile, 'utf8'), 1) : '';
	return `le serveur de dev ne démarre pas${said === '' ? '' : ` (${said})`}`;
}

async function verifsStep(worktree: string): Promise<Step<VerifsData>> {
	// Un serveur déjà là ne serait pas le code de `main`.
	if (await portBusy(PORT)) return { ok: false, failure: `le port ${PORT} est déjà pris` };
	const server = await startServer(worktree);
	if (typeof server === 'string') return { ok: false, failure: server };
	try {
		return await playVerifs(worktree);
	} finally {
		server.stop();
		// Le temps que le port se libère avant la fin de la tâche (SIGKILL à 5 s).
		await new Promise((resolve) => setTimeout(resolve, 6_000));
	}
}

/**
 * Joue la suite (ou, `again`, ses seuls rouges de la fois d'avant, deux à la fois)
 * et lit son compte rendu. Chaque passage a son dossier : `--output` efface celui
 * qu'il reçoit, le second essai garderait sinon les traces des seuls rouges.
 */
async function playSuite(
	worktree: string,
	again: boolean
): Promise<Step<Record<string, TestStatus>>> {
	const name = again ? 'verifs-second-essai' : 'verifs';
	const file = join(OUTPUTS, `${name}.json`);
	rmSync(file, { force: true });
	const played = await run(
		'pnpm',
		[
			'--silent',
			'test:verifs:tout',
			'--reporter=json',
			`--output=${join(OUTPUTS, name)}`,
			...(again ? ['--last-failed', '--workers=2'] : []),
			...VERIFS_FILTER
		],
		worktree,
		{
			minutes: again ? 120 : 240,
			env: {
				VERIFS_PORT: String(PORT),
				PLAYWRIGHT_JSON_OUTPUT_NAME: file,
				// Les rouges du premier passage, relus par `--last-failed` au second.
				PLAYWRIGHT_LAST_RUN_OUTPUT_FILE: LAST_RUN
			}
		}
	);
	if (played.status === null) return { ok: false, failure: 'arrêtées (délai dépassé)' };
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
	return { ok: true, data: tests };
}

/** La suite, puis un second essai de ses rouges : un vert au second essai est « instable ». */
async function playVerifs(worktree: string): Promise<Step<VerifsData>> {
	rmSync(LAST_RUN, { force: true });
	const first = await playSuite(worktree, false);
	if (!first.ok) return first;
	const tests = first.data;
	// Un fichier qui ne se charge pas n'a aucun test à rejouer : seuls les vrais rouges comptent.
	const replayable = Object.entries(tests).some(
		([name, status]) => status === 'red' && !name.startsWith(LOAD_ERROR)
	);
	if (!replayable) return { ok: true, data: { tests } };
	const again = await playSuite(worktree, true);
	if (!again.ok) return { ok: true, data: { tests, replay: again.failure } };
	return { ok: true, data: { tests: mergeReplay(tests, again.data) } };
}

async function guardsStep(worktree: string): Promise<Step<Guard[]>> {
	const guards: Guard[] = [];
	for (const [name, args] of GUARDS) {
		const result = await run('pnpm', ['--silent', ...args], worktree, { minutes: 10 });
		const ok = result.status === 0;
		guards.push({ name, ok, detail: ok ? '' : lastLines(result.output, 8) || cause(result) });
	}
	return { ok: true, data: guards };
}

// ============================================================================
// Fonctions : commandes
// ============================================================================

/**
 * `false` si une autre nuit tourne. Un verrou dont le processus a disparu, ou
 * plus vieux qu'une nuit (machine éteinte en route, PID repris par un autre
 * processus), est périmé : il est repris.
 */
function takeLock(): boolean {
	mkdirSync(OUTPUTS, { recursive: true });
	if (existsSync(LOCK)) {
		const pid = Number(readFileSync(LOCK, 'utf8').trim());
		const ageMs = Date.now() - statSync(LOCK).mtimeMs;
		let alive = false;
		try {
			if (Number.isInteger(pid) && pid > 0) {
				process.kill(pid, 0);
				alive = true;
			}
		} catch {
			// Processus disparu.
		}
		if (!lockIsStale({ alive, ageMs })) return false;
		rmSync(LOCK, { force: true });
	}
	try {
		// `wx` : deux lancements au même instant, un seul écrit le verrou.
		writeFileSync(LOCK, `${process.pid}\n`, { flag: 'wx' });
		return true;
	} catch {
		return false;
	}
}

function forget(): void {
	const files = readdirSync(STATE)
		.filter((name) => NIGHT_FILE.test(name))
		.sort()
		.reverse();
	for (const name of files.slice(NIGHTS_KEPT)) rmSync(join(STATE, name), { force: true });
}

/** Joue les trois étapes. Une erreur imprévue donne une nuit « tout en panne », jamais un silence. */
async function play(date: string, trial: boolean): Promise<Night> {
	try {
		const depot = await mainRepository();
		const worktree = process.env.NUIT_WORKTREE ?? join(dirname(depot), 'ubumaths-wt-nuit');
		const failure = await prepare(depot, worktree);
		if (failure !== null) {
			const down = { ok: false, failure: `préparation : ${failure}` } as const;
			return { date, commit: 'inconnu', proofs: down, verifs: down, guards: down };
		}
		const head = await run('git', ['rev-parse', '--short', 'HEAD'], worktree, { minutes: 1 });
		return {
			date,
			commit: head.output.trim() || 'inconnu',
			proofs: await proofsStep(worktree, trial),
			verifs: await verifsStep(worktree),
			guards: await guardsStep(worktree)
		};
	} catch (error) {
		const detail = error instanceof Error ? error.message.split('\n')[0] : String(error);
		const down = { ok: false, failure: `erreur imprévue : ${detail}` } as const;
		return { date, commit: 'inconnu', proofs: down, verifs: down, guards: down };
	}
}

async function launch(trial: boolean): Promise<void> {
	// Le bilan de 2 h ne s'écrase pas : il sert de veille à la nuit suivante.
	if (!trial && existsSync(join(STATE, `${today()}.json`))) {
		console.error(
			`⛔ La nuit du ${today()} est déjà jouée (pnpm nuit pour la lire). Pour rejouer sans rien effacer : pnpm nuit --lancer --essai`
		);
		process.exit(1);
	}
	if (!takeLock()) {
		console.error('⛔ Une nuit tourne déjà.');
		process.exit(1);
	}
	try {
		const date = today();
		const night = await play(date, trial);
		const previous = pastNights(date);
		console.log(formatSummary(night, previous));
		if (trial) {
			writeFileSync(join(STATE, 'essai.json'), `${JSON.stringify(night, null, '\t')}\n`);
			console.log('\n(essai : rien de barré, rien de commité, pas de notification)');
			return;
		}

		const reds = redsToNotify(previous, night);
		const outages = notifiedOutages(previous, night);
		if (outages.length > 0) night.outages = outages;
		if (reds.length > 0) {
			// Le message dit combien, rien du contenu : David lit le bilan par `pnpm nuit`.
			const sent = await run(
				'pnpm',
				['--silent', 'prevenir', 'geste', notificationPhrase(reds), '--session', 'tache-de-nuit'],
				ROOT,
				{ minutes: 2 }
			);
			const line = lastLines(sent.output, 1);
			console.log(line);
			if (!deliveredNotice(sent.status, line)) night.pending = reds;
		}
		writeFileSync(join(STATE, `${date}.json`), `${JSON.stringify(night, null, '\t')}\n`);
		forget();
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
	const missed = staleDays(latest.date, today());
	if (missed > 0) {
		console.log(
			`⚠️ Aucune nuit jouée depuis le ${latest.date} (${missed} manquée${missed > 1 ? 's' : ''}) : voir ${join(STATE, 'launchd.log')}\n`
		);
	}
	console.log(formatSummary(latest, previous));
	if (latest.pending !== undefined && latest.pending.length > 0) {
		console.log('\n⚠️ La notification de cette nuit n’est pas partie.');
	}
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
