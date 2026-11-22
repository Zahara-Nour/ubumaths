/**
 * `pnpm lien` : ce qui se décide sans Tailscale
 * =============================================
 *
 * Options, lecture de l'état de Tailscale Serve, port HTTPS libre, lien de
 * Supabase (partagé, jamais retiré), registre des liens par chantier, liens à
 * retirer, serveur périmé, ce qui manque pour se connecter depuis un autre
 * appareil. Les commandes `tailscale` sont dans `index.ts`.
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

export type Missing = 'hote' | 'supabase';

// Constantes

/** Port local de l'API de Supabase (base de dev). */
export const SUPABASE_LOCAL_PORT = 54321;
/** Port HTTPS du tailnet réservé à Supabase local, partagé par tous les chantiers. */
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

/** Les liens de `tailscale serve status --json` (handler `/` seulement), par port HTTPS. */
export function parseServeStatus(json: unknown): ServeLink[] {
	const parsed = serveStatusSchema.safeParse(json);
	if (!parsed.success) return [];
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

/** Le lien de Supabase local : celui qui existe, sinon à publier sur 8443. */
export function supabasePlan(links: ServeLink[]): { publish: boolean; httpsPort: number } {
	const existing = links.find((link) => link.localPort === SUPABASE_LOCAL_PORT);
	if (existing) return { publish: false, httpsPort: existing.httpsPort };
	const squatter = links.find((link) => link.httpsPort === SUPABASE_HTTPS_PORT);
	if (squatter)
		throw new LienError(
			`Le port ${SUPABASE_HTTPS_PORT} du tailnet, réservé à Supabase local, mène à ${squatter.target} : ` +
				'le lien d’une autre session sans doute. À voir avec David, rien n’est retiré.'
		);
	return { publish: true, httpsPort: SUPABASE_HTTPS_PORT };
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
			chantier: isSupabase ? 'Supabase local (partagé)' : owner ? chantierName(owner) : '?',
			up: isSupabase || servers.some((s) => s.port === link.localPort)
		};
	});
}

/**
 * Ports HTTPS à retirer pour `--stop` : les liens de CE worktree seulement,
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
 * Date (secondes) du dernier pull, merge ou rebase du worktree, lue dans
 * `git reflog --date=unix --format='%gd%x09%gs'`. Un serveur lancé avant sert
 * des modules périmés (« Failed to fetch dynamically imported module »).
 */
export function lastSync(reflog: string): number | null {
	for (const line of reflog.split('\n')) {
		const match = /^HEAD@\{(\d+)\}\t(?:pull|merge|rebase)\b/.exec(line);
		if (match) return Number(match[1]);
	}
	return null;
}

/**
 * Ce qui manque au serveur pour qu'on s'y connecte depuis un autre appareil :
 * le nom du Mac autorisé par Vite (`hote`, sans lui aucune page ne répond) et
 * l'adresse de Supabase du tailnet (`supabase`, sans elle la connexion échoue).
 *
 * @param serverEnv environnement du process serveur (`ps eww`)
 */
export function missingForRemoteLogin(
	serverEnv: string,
	hostname: string,
	supabaseOrigin: string
): Missing[] {
	const read = (name: string) =>
		new RegExp(`(?:^|\\s)${name}=(\\S+)`).exec(serverEnv)?.[1]?.replace(/^["']|["']$/g, '') ?? '';
	const missing: Missing[] = [];
	const hosts = read('__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS').split(',');
	if (!hosts.includes(hostname)) missing.push('hote');
	let origin = '';
	try {
		origin = new URL(read('PUBLIC_SUPABASE_URL')).origin;
	} catch {
		// Variable absente
	}
	if (origin !== supabaseOrigin) missing.push('supabase');
	return missing;
}

export function relaunchCommand(hostname: string, supabaseOrigin: string, port: number): string {
	return (
		`PUBLIC_SUPABASE_URL=${supabaseOrigin} __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=${hostname} ` +
		`pnpm dev --port ${port} --strictPort`
	);
}
