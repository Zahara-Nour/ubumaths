/**
 * `pnpm lien` : un lien de test en une commande
 * =============================================
 *
 * Publie le serveur de dev de CE worktree en HTTPS sur le tailnet (Tailscale
 * Serve), sur un port libre, et rend le lien, un QR code et le rappel des
 * comptes fictifs. Un seul port publié : Supabase local est relayé par le
 * serveur de dev (`scripts/relais/plugin.ts`), il n'a plus de lien à lui.
 *
 * `--stop` retire le lien de ce worktree seulement ; `--liste` montre tous les
 * liens et le chantier de chacun ; `--port <n>` choisit le serveur quand deux
 * tournent dans le worktree.
 *
 * Ne lance ni ne relance jamais de serveur, ne publie jamais un serveur qui
 * vise la prod, ne fait jamais `funnel` (Internet) ni `serve reset` (qui
 * couperait les liens des autres sessions), ne retire jamais l'ancien lien de
 * Supabase (port 8443). Doc : docs/pratiques/tester-sur-un-autre-appareil.md.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderUnicodeCompact } from 'uqr';
import { z } from 'zod';
import { ACCOUNTS, VoirError, isLocalEnv, pickPort } from '../voir/logique';
import { listDevServers, readEnvFiles, readServerEnv, worktreeRoot } from '../voir/serveurs';
import { SUPABASE_RELAY_PATH } from '../../src/lib/dev/supabase-relay.ts';
import {
	LienError,
	accountLines,
	anonKey,
	isMainRepo,
	lastSync,
	linkUrl,
	linksToStop,
	listing,
	launchedTheOldWay,
	parseArgs,
	parseRegistry,
	parseServeStatus,
	pickHttpsPort,
	pruneRegistry,
	relaunchCommand,
	relayState,
	servedPorts,
	type Registry,
	type ServeLink
} from './logique';

// Constantes

const REGISTRY_FILE = 'liens-tailnet.json';
const TAILSCALE_TIMEOUT = 20_000;
const RELAY_TIMEOUT_SECONDS = 15;

const tailscaleStatusSchema = z.object({ Self: z.object({ DNSName: z.string().min(1) }) });

// Functions

function tailscale(args: string[]): string {
	try {
		return execFileSync('tailscale', args, {
			encoding: 'utf8',
			timeout: TAILSCALE_TIMEOUT,
			stdio: ['ignore', 'pipe', 'pipe']
		});
	} catch (error) {
		const detail = error instanceof Error ? error.message.split('\n')[0] : String(error);
		throw new LienError(`tailscale ${args.join(' ')} a échoué : ${detail}`);
	}
}

function git(args: string[]): string {
	return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

/** Nom du Mac sur le tailnet (`machine.xxx.ts.net`). */
function tailnetHostname(): string {
	const parsed = tailscaleStatusSchema.safeParse(JSON.parse(tailscale(['status', '--json'])));
	if (!parsed.success) throw new LienError('Nom du Mac sur le tailnet introuvable.');
	return parsed.data.Self.DNSName.replace(/\.$/, '');
}

function serveStatus(): unknown {
	const out = tailscale(['serve', 'status', '--json']).trim();
	if (!out) return {};
	try {
		return JSON.parse(out);
	} catch {
		throw new LienError('État de Tailscale Serve illisible : rien n’est publié ni retiré.');
	}
}

function serveLinks(): ServeLink[] {
	return parseServeStatus(serveStatus());
}

/**
 * Publie un port, après avoir relu l'état : une autre session a pu prendre le
 * port HTTPS entre le choix et la commande, et Serve écraserait son lien.
 */
function serve(httpsPort: number, localPort: number): void {
	const status = serveStatus();
	const current = parseServeStatus(status).find((link) => link.httpsPort === httpsPort);
	if (current?.localPort === localPort) return;
	if (current || servedPorts(status).includes(httpsPort))
		throw new LienError(
			`Le port ${httpsPort} du tailnet vient d'être pris par une autre session : relancer pnpm lien.`
		);
	tailscale(['serve', '--bg', `--https=${httpsPort}`, `http://localhost:${localPort}`]);
}

/** Tous les ports TCP où un programme du Mac écoute. */
function listeningPorts(): number[] {
	try {
		const listing = execFileSync('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN', '-Fn'], {
			encoding: 'utf8'
		});
		return listing
			.split('\n')
			.filter((line) => line.startsWith('n'))
			.map((line) => Number(line.slice(line.lastIndexOf(':') + 1)))
			.filter((port) => Number.isInteger(port));
	} catch {
		return [];
	}
}

/** Dossier git commun à tous les worktrees : le registre des liens y vit. */
function commonGitDir(): string {
	return realpathSync(git(['rev-parse', '--path-format=absolute', '--git-common-dir']));
}

function readRegistry(): Registry {
	try {
		return parseRegistry(readFileSync(join(commonGitDir(), REGISTRY_FILE), 'utf8'));
	} catch {
		return {};
	}
}

function writeRegistry(registry: Registry): void {
	writeFileSync(join(commonGitDir(), REGISTRY_FILE), `${JSON.stringify(registry, null, '\t')}\n`);
}

function refuseMainRepo(): void {
	const gitDir = realpathSync(git(['rev-parse', '--absolute-git-dir']));
	if (isMainRepo(gitDir, commonGitDir()))
		throw new LienError(
			'Refusé dans le dépôt principal : un lien se publie depuis un worktree, où tourne le serveur de dev.'
		);
}

/** Le serveur a-t-il été lancé avant le dernier pull, merge ou rebase du worktree ? */
function isStale(pid: number | undefined): boolean {
	if (pid === undefined) return false;
	try {
		const started = execFileSync('ps', ['-o', 'lstart=', '-p', String(pid)], {
			encoding: 'utf8',
			env: { ...process.env, LC_ALL: 'C' }
		});
		const startedAt = new Date(started.trim()).getTime();
		const sync = lastSync(git(['reflog', '--date=unix', '--format=%gd%x09%gs', 'HEAD']));
		return sync !== null && Number.isFinite(startedAt) && startedAt < sync * 1000;
	} catch {
		return false;
	}
}

/** Vérifie après coup que le lien mène au bon port et reste « tailnet only ». */
function assertPublished(httpsPort: number, localPort: number): void {
	const link = serveLinks().find((l) => l.httpsPort === httpsPort);
	if (!link || link.localPort !== localPort)
		throw new LienError(
			`Le lien du port ${httpsPort} ne mène pas à localhost:${localPort} après publication : pnpm lien --liste.`
		);
	if (link.funnel) {
		tailscale(['serve', `--https=${httpsPort}`, 'off']);
		throw new LienError(
			`Le port ${httpsPort} était ouvert à Internet (Funnel) : lien retiré. À voir avec David.`
		);
	}
}

/**
 * Code HTTP de Supabase local joint à travers le relais du serveur de dev ;
 * `null` si rien ne répond dans le délai.
 */
function relayStatus(port: number): number | null {
	try {
		const code = execFileSync(
			'curl',
			[
				'-s',
				'-o',
				'/dev/null',
				'-m',
				String(RELAY_TIMEOUT_SECONDS),
				'-w',
				'%{http_code}',
				`http://localhost:${port}${SUPABASE_RELAY_PATH}/auth/v1/health`
			],
			{ encoding: 'utf8' }
		);
		return Number(code) || null;
	} catch {
		return null;
	}
}

/** Le compte fictif se connecte-t-il à Supabase local, à travers le relais ? */
function signsIn(port: number, key: string, account: { email: string; password: string }): boolean {
	try {
		const code = execFileSync(
			'curl',
			[
				'-s',
				'-o',
				'/dev/null',
				'-m',
				String(RELAY_TIMEOUT_SECONDS),
				'-w',
				'%{http_code}',
				'-X',
				'POST',
				'-H',
				`apikey: ${key}`,
				'-H',
				'content-type: application/json',
				'-d',
				JSON.stringify(account),
				`http://localhost:${port}${SUPABASE_RELAY_PATH}/auth/v1/token?grant_type=password`
			],
			{ encoding: 'utf8' }
		);
		return code === '200';
	} catch {
		return false;
	}
}

function publish(wantedPort: number | null): void {
	refuseMainRepo();
	const root = worktreeRoot();
	const servers = listDevServers();
	const port = pickPort(servers, root, wantedPort);
	const pid = servers.find((server) => server.port === port)?.pid;
	const hostname = tailnetHostname();

	const serverEnv = readServerEnv(pid);
	if (serverEnv !== null && launchedTheOldWay(serverEnv, hostname))
		throw new LienError(
			'Serveur lancé à l’ancienne, avec l’adresse de Supabase du tailnet : il n’a pas le relais ' +
				`de Supabase. L’arrêter, puis le relancer sans variable :\n   ${relaunchCommand(port)}`
		);
	if (serverEnv === null || !isLocalEnv(readEnvFiles(root), serverEnv))
		throw new LienError(
			'Refusé : rien ne prouve que le serveur de ce dossier vise la base locale (.env.local ' +
				'absent, ou une adresse de Supabase distante dans ses fichiers .env ou dans la commande ' +
				'qui l’a lancé). Jamais de lien vers un serveur branché sur la prod.'
		);

	const notes: string[] = [];
	const relay = relayState(relayStatus(port));
	if (relay === 'supabase-arrete')
		notes.push(
			'⚠️  Supabase local ne répond pas : pnpm db:start. Les pages publiques marchent, pas la connexion.'
		);
	else if (relay === 'sans-relais')
		notes.push(
			'⚠️  Ce serveur n’a pas le relais de Supabase (branche en retard sur main) : les pages ' +
				'publiques marchent, pas la connexion. Mettre la branche à jour, puis relancer le serveur.'
		);

	const status = serveStatus();
	const links = parseServeStatus(status);
	const existing = links.find((link) => link.localPort === port);
	const httpsPort = existing?.httpsPort ?? pickHttpsPort(servedPorts(status), listeningPorts());
	if (!existing) serve(httpsPort, port);
	assertPublished(httpsPort, port);

	const registry = pruneRegistry(readRegistry(), serveLinks());
	registry[String(httpsPort)] = { root, localPort: port, date: new Date().toISOString() };
	writeRegistry(registry);

	if (isStale(pid))
		notes.push(
			'⚠️  Serveur périmé : lancé avant le dernier pull ou merge de la branche. Le relancer ' +
				'(sinon « Failed to fetch dynamically imported module »).'
		);

	const url = linkUrl(hostname, httpsPort);
	const key = relay === 'ok' ? anonKey(readEnvFiles(root)) : null;
	const accounts = accountLines(
		ACCOUNTS,
		key === null ? null : (account) => signsIn(port, key, account)
	).join('\n');
	console.log(
		[
			`${existing ? 'Lien (déjà publié)' : 'Lien'} : ${url}`,
			`Serveur : http://localhost:${port} (${root})`,
			'',
			renderUnicodeCompact(url, { border: 2 }),
			'',
			'Comptes fictifs (base locale) :',
			accounts,
			...(notes.length > 0 ? ['', ...notes] : []),
			'',
			'Retirer ce lien : pnpm lien --stop'
		].join('\n')
	);
}

function stop(): void {
	refuseMainRepo();
	const root = worktreeRoot();
	const links = serveLinks();
	const ports = linksToStop(links, readRegistry(), listDevServers(), root);
	if (ports.length === 0) {
		console.log('Aucun lien publié pour ce worktree.');
		return;
	}
	const hostname = tailnetHostname();
	for (const httpsPort of ports) {
		tailscale(['serve', `--https=${httpsPort}`, 'off']);
		console.log(`Lien retiré : ${linkUrl(hostname, httpsPort)}`);
	}
	writeRegistry(pruneRegistry(readRegistry(), serveLinks()));
}

function list(): void {
	const links = serveLinks();
	if (links.length === 0) {
		console.log('Aucun lien publié.');
		return;
	}
	const rows = listing(links, readRegistry(), listDevServers(), tailnetHostname());
	const width = Math.max(...rows.map((row) => row.url.length));
	for (const [index, row] of rows.entries()) {
		const funnel = links[index]?.funnel ? '  ⛔ OUVERT À INTERNET (Funnel)' : '';
		console.log(
			`${row.url.padEnd(width)}  →  ${row.target.padEnd(22)}  ${row.chantier}` +
				`${row.up ? '' : '  (serveur arrêté)'}${funnel}`
		);
	}
}

try {
	const options = parseArgs(process.argv.slice(2));
	if (options.action === 'liste') list();
	else if (options.action === 'stop') stop();
	else publish(options.port);
} catch (error) {
	if (error instanceof LienError || error instanceof VoirError) {
		console.error(`⛔ ${error.message}`);
		process.exit(1);
	}
	throw error;
}
