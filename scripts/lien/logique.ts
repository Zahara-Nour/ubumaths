/**
 * `pnpm lien` : ce qui se décide sans Tailscale
 * =============================================
 *
 * Options, lecture de l'état de Tailscale Serve, port HTTPS libre, registre des
 * liens par chantier, liens à retirer, serveur périmé, serveur lancé à
 * l'ancienne, état du relais de Supabase. Les commandes `tailscale` sont dans
 * `index.ts`.
 *
 * Supabase local n'a plus de lien à lui : le serveur de dev le relaie
 * (`scripts/relais/plugin.ts`). L'ancien lien (port 8443) n'est plus publié ;
 * s'il existe encore, il n'est ni repris ni retiré.
 * Tests : `scripts/__tests__/lien.test.ts`.
 */

import { basename } from 'node:path';
import { z } from 'zod';
import type { DevServer } from '../voir/logique';

// Types

export type Action = 'publier' | 'stop' | 'liste';

export interface LienOptions {
	action: Action;
	/** Port imposé par `--port`, sinon celui du serveur de ce worktree */
	port: number | null;
}

/** Un lien de Tailscale Serve : un port HTTPS du tailnet vers une adresse du Mac. */
export interface ServeLink {
	httpsPort: number;
	/** Port de `localhost` visé, `null` si la cible est autre chose */
	localPort: number | null;
	target: string;
	/** Ouvert à Internet (Funnel) : ne doit jamais arriver */
	funnel: boolean;
}

export interface ListingRow {
	url: string;
	target: string;
	chantier: string;
	/** Un programme écoute-t-il encore derrière le lien ? */
	up: boolean;
}

/** Ce que répond Supabase local à travers le relais du serveur de dev. */
export type RelayState = 'ok' | 'supabase-arrete' | 'sans-relais';

// Constantes

/** Port local de l'API de Supabase (base de dev). */
export const SUPABASE_LOCAL_PORT = 54321;
/**
 * Port HTTPS du tailnet de l'ancien lien vers Supabase local (avant le relais) :
 * jamais repris pour un serveur, jamais retiré par `--stop`.
 */
export const SUPABASE_HTTPS_PORT = 8443;
const FIRST_HTTPS_PORT = 8444;
const LAST_HTTPS_PORT = 8499;
const WORKTREE_PREFIX = 'ubumaths-wt-';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const USAGE = 'Usage : pnpm lien [--stop | --liste] [--port <n>]';

const registrySchema = z.record(
	z.string().regex(/^\d+$/),
	z.object({
		root: z.string().min(1).max(1024),
		localPort: z.number().int().min(1).max(65535),
		date: z.string().max(40)
	})
);

/** Registre des liens publiés par `pnpm lien` : port HTTPS → worktree qui l'a publié. */
export type Registry = z.infer<typeof registrySchema>;

const serveStatusSchema = z.object({
	TCP: z.record(z.string(), z.unknown()).optional(),
	Web: z
		.record(
			z.string(),
			z.object({
				Handlers: z.record(z.string(), z.object({ Proxy: z.string().optional() })).optional()
			})
		)
		.optional(),
	AllowFunnel: z.record(z.string(), z.boolean()).optional()
});

// Functions

/** Erreur attendue : son message s'affiche tel quel, sans pile d'appels. */
export class LienError extends Error {}

export function parseArgs(argv: string[]): LienOptions {
	const options: LienOptions = { action: 'publier', port: null };
	let actions = 0;
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i] as string;
		if (arg === '--stop' || arg === '--liste') {
			options.action = arg === '--stop' ? 'stop' : 'liste';
			actions++;
		} else if (arg === '--port') {
			const value = Number(argv[++i]);
			if (!Number.isInteger(value) || value < 1 || value > 65535)
				throw new LienError('--port attend un numéro de port.');
			options.port = value;
		} else throw new LienError(`Option inconnue : ${arg}\n${USAGE}`);
	}
	if (actions > 1) throw new LienError(USAGE);
	return options;
}

/** Dans le dépôt principal, le dossier git du dossier courant est le dossier commun. */
export function isMainRepo(gitDir: string, commonDir: string): boolean {
	return gitDir === commonDir;
}

/** Nom du chantier d'un worktree : `…/ubumaths-wt-carnet` → `carnet`. */
export function chantierName(root: string): string {
	const name = basename(root);
	return name.startsWith(WORKTREE_PREFIX) ? name.slice(WORKTREE_PREFIX.length) : name;
}

function localPortOf(target: string): number | null {
	try {
		const url = new URL(target);
		if (url.protocol !== 'http:' || !LOCAL_HOSTS.has(url.hostname)) return null;
		const port = Number(url.port || 80);
		return Number.isInteger(port) ? port : null;
	} catch {
		return null;
	}
}

/**
 * État de Serve d'une forme inconnue : on s'arrête. Le lire comme « aucun
 * lien » ferait publier par-dessus les liens des autres sessions.
 */
function readServeStatus(json: unknown): z.infer<typeof serveStatusSchema> {
	if (json === null || json === undefined) return {};
	const parsed = serveStatusSchema.safeParse(json);
	if (!parsed.success)
		throw new LienError(
			'État de Tailscale Serve illisible (tailscale serve status --json a changé de forme) : rien n’est publié ni retiré.'
		);
	return parsed.data;
}

/**
 * Tous les ports du tailnet que Serve occupe, liens HTTPS, TCP bruts et
 * chemins autres que `/` compris : aucun n'est à reprendre.
 */
export function servedPorts(json: unknown): number[] {
	const status = readServeStatus(json);
	const ports = [...Object.keys(status.TCP ?? {}), ...Object.keys(status.Web ?? {})]
		.map((key) => Number(key.slice(key.lastIndexOf(':') + 1)))
		.filter((port) => Number.isInteger(port));
	return [...new Set(ports)].sort((a, b) => a - b);
}

/** Les liens de `tailscale serve status --json` (handler `/` seulement), par port HTTPS. */
export function parseServeStatus(json: unknown): ServeLink[] {
	const parsed = { data: readServeStatus(json) };
	const links: ServeLink[] = [];
	for (const [hostPort, web] of Object.entries(parsed.data.Web ?? {})) {
		const httpsPort = Number(hostPort.slice(hostPort.lastIndexOf(':') + 1));
		const target = web.Handlers?.['/']?.Proxy;
		if (!Number.isInteger(httpsPort) || !target) continue;
		links.push({
			httpsPort,
			localPort: localPortOf(target),
			target,
			funnel: parsed.data.AllowFunnel?.[hostPort] === true
		});
	}
	return links.sort((a, b) => a.httpsPort - b.httpsPort);
}

export function linkUrl(hostname: string, httpsPort: number): string {
	return httpsPort === 443 ? `https://${hostname}/` : `https://${hostname}:${httpsPort}/`;
}

/**
 * Premier port HTTPS libre à partir de 8444 : ni déjà publié par Serve, ni
 * écouté par un programme du Mac.
 */
export function pickHttpsPort(served: number[], listening: number[]): number {
	const taken = new Set([...served, ...listening, SUPABASE_HTTPS_PORT]);
	for (let port = FIRST_HTTPS_PORT; port <= LAST_HTTPS_PORT; port++)
		if (!taken.has(port)) return port;
	throw new LienError(
		`Aucun port HTTPS libre entre ${FIRST_HTTPS_PORT} et ${LAST_HTTPS_PORT} : retirer des liens (pnpm lien --liste).`
	);
}

export function parseRegistry(content: string | null): Registry {
	if (content === null) return {};
	try {
		const parsed = registrySchema.safeParse(JSON.parse(content));
		return parsed.success ? parsed.data : {};
	} catch {
		return {};
	}
}

/** Le registre sans les liens qui n'existent plus ou qui mènent maintenant ailleurs. */
export function pruneRegistry(registry: Registry, links: ServeLink[]): Registry {
	const kept: Registry = {};
	for (const [httpsPort, entry] of Object.entries(registry)) {
		const link = links.find((l) => String(l.httpsPort) === httpsPort);
		if (link && link.localPort === entry.localPort) kept[httpsPort] = entry;
	}
	return kept;
}

/** À quel dossier appartient un lien : le serveur qui écoute derrière, sinon le registre. */
function ownerOf(link: ServeLink, registry: Registry, servers: DevServer[]): string | null {
	const server = servers.find((s) => s.port === link.localPort);
	if (server) return server.cwd;
	const entry = registry[String(link.httpsPort)];
	return entry && entry.localPort === link.localPort ? entry.root : null;
}

export function listing(
	links: ServeLink[],
	registry: Registry,
	servers: DevServer[],
	hostname: string
): ListingRow[] {
	return links.map((link) => {
		const isSupabase = link.localPort === SUPABASE_LOCAL_PORT;
		const owner = ownerOf(link, registry, servers);
		return {
			url: linkUrl(hostname, link.httpsPort),
			target: link.target,
			chantier: isSupabase ? 'Supabase local (ancien lien)' : owner ? chantierName(owner) : '?',
			up: isSupabase || servers.some((s) => s.port === link.localPort)
		};
	});
}

/**
 * Ports HTTPS à retirer pour `--stop` : les liens de CE worktree seulement
 * (publiés par `pnpm lien` ou à la main, dès qu'ils mènent à son serveur),
 * jamais celui de Supabase (d'autres chantiers s'en servent).
 */
export function linksToStop(
	links: ServeLink[],
	registry: Registry,
	servers: DevServer[],
	root: string
): number[] {
	return links
		.filter(
			(link) =>
				link.localPort !== SUPABASE_LOCAL_PORT &&
				link.httpsPort !== SUPABASE_HTTPS_PORT &&
				ownerOf(link, registry, servers) === root
		)
		.map((link) => link.httpsPort);
}

/**
 * Date (secondes) du dernier pull, merge, rebase ou reset du worktree, lue dans
 * `git reflog --date=unix --format='%gd%x09%gs'`. Un serveur lancé avant sert
 * des modules périmés (« Failed to fetch dynamically imported module »).
 */
export function lastSync(reflog: string): number | null {
	for (const line of reflog.split('\n')) {
		const match = /^HEAD@\{(\d+)\}\t(?:pull|merge|rebase|reset)\b/.exec(line);
		if (match) return Number(match[1]);
	}
	return null;
}

/**
 * Le serveur a-t-il été lancé à l'ancienne, avec l'adresse de Supabase du
 * tailnet (`PUBLIC_SUPABASE_URL=https://<mac>.ts.net:8443 pnpm dev`) ? Il n'a
 * alors pas de relais : à relancer sans variable.
 *
 * @param serverEnv environnement du process serveur (`ps eww`)
 */
export function launchedTheOldWay(serverEnv: string, hostname: string): boolean {
	const raw = /(?:^|\s)PUBLIC_SUPABASE_URL=(\S+)/.exec(serverEnv)?.[1]?.replace(/^["']|["']$/g, '');
	if (!raw) return false;
	try {
		return new URL(raw).hostname === hostname;
	} catch {
		return false;
	}
}

export function relaunchCommand(port: number): string {
	return `pnpm dev --port ${port} --strictPort`;
}

/**
 * État du relais, d'après le code HTTP de `/__dev/supabase/auth/v1/health` sur
 * le serveur de dev (`null` : pas de réponse). Supabase répond 200, ou 401 sans
 * clé. Toute autre réponse (404, redirection, page de l'appli) vient du serveur
 * de dev lui-même : il tourne sur un code d'avant le relais.
 */
export function relayState(status: number | null): RelayState {
	if (status === null || status === 502) return 'supabase-arrete';
	return status === 200 || status === 401 ? 'ok' : 'sans-relais';
}

/** Clé publique de Supabase local, lue dans les fichiers d'environnement de dev. */
export function anonKey(envFiles: string[]): string | null {
	for (const content of envFiles) {
		const match = /^\s*(?:export\s+)?PUBLIC_SUPABASE_ANON_KEY\s*=(.*)$/m.exec(content);
		const key = match?.[1]?.trim().replace(/^["']|["']$/g, '');
		if (key) return key;
	}
	return null;
}

/**
 * Le rappel des comptes fictifs : pour chaque rôle, le premier compte qui se
 * connecte vraiment (`eleveNN@local.test` n'existe qu'après `pnpm db:neuf`).
 *
 * @param signsIn le compte se connecte-t-il ? `null` : impossible de le savoir
 *   (Supabase arrêté, relais absent), le premier compte est alors donné tel quel
 */
export function accountLines(
	accounts: Record<string, { email: string; password: string }[]>,
	signsIn: ((account: { email: string; password: string }) => boolean) | null
): string[] {
	return Object.entries(accounts).map(([role, list]) => {
		const label = `  ${role.padEnd(5)} : `;
		const account = signsIn ? list.find(signsIn) : list[0];
		if (!account) return `${label}aucun compte ne se connecte (pnpm db:neuf les crée)`;
		return `${label}${account.email} / ${account.password}${signsIn ? '' : ' (non vérifié)'}`;
	});
}
