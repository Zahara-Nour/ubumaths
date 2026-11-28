/**
 * `pnpm voir` : ce qui se décide sans navigateur
 * ==============================================
 *
 * Options, adresse, port du serveur de ce worktree, garde de `--compte`,
 * hauteur de l'image, nom des fichiers. Le pilotage du navigateur est dans
 * `index.ts`. Tests : `scripts/__tests__/voir.test.ts`.
 */

import { LOCAL_ACCOUNTS } from '../../src/lib/dev/local-accounts.ts';

// Types

export type AccountName = 'prof' | 'eleve' | 'admin';

export interface VoirOptions {
	/** Chemin (`/carnet`) ou adresse complète du serveur local */
	target: string;
	/** Grand écran au lieu du format iPhone */
	desktop: boolean;
	/** Petit téléphone (iPhone SE, 375 px de large) au lieu de l'iPhone courant */
	small: boolean;
	/** Chromium au lieu de WebKit (le moteur de Safari) */
	chromium: boolean;
	account: AccountName | null;
	/** Port imposé par `--port`, sinon celui du serveur de ce worktree */
	port: number | null;
}

/** Un serveur de dev qui écoute : son port et le dossier d'où il a été lancé. */
export interface DevServer {
	port: number;
	cwd: string;
	pid?: number;
}

// Constantes

/** Comptes fictifs de la base locale : source unique dans `src/lib/dev/local-accounts.ts`. */
export const ACCOUNTS = LOCAL_ACCOUNTS;

/** Hauteur maximale de l'image, en pixels CSS : au-delà, l'image est coupée. */
export const MAX_HEIGHT = 6000;

/** Hauteur d'une tranche : une image plus haute est illisible une fois réduite pour être lue. */
export const SLICE_HEIGHT = 1600;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const USAGE =
	'Usage : pnpm voir <page> [--ordi | --petit] [--chrome] [--compte prof|eleve|admin] [--port <n>]';

// Functions

/** Erreur attendue : son message s'affiche tel quel, sans pile d'appels. */
export class VoirError extends Error {}

function isAccountName(value: string): value is AccountName {
	return Object.hasOwn(ACCOUNTS, value);
}

export function parseArgs(argv: string[]): VoirOptions {
	const options: VoirOptions = {
		target: '',
		desktop: false,
		small: false,
		chromium: false,
		account: null,
		port: null
	};
	const targets: string[] = [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i] as string;
		if (arg === '--ordi') options.desktop = true;
		else if (arg === '--petit') options.small = true;
		else if (arg === '--chrome') options.chromium = true;
		else if (arg === '--compte') {
			const value = argv[++i] ?? '';
			if (!isAccountName(value))
				throw new VoirError(`--compte attend prof, eleve ou admin (reçu : « ${value} »).`);
			options.account = value;
		} else if (arg === '--port') {
			const value = Number(argv[++i]);
			if (!Number.isInteger(value) || value < 1 || value > 65535)
				throw new VoirError('--port attend un numéro de port.');
			options.port = value;
		} else if (arg.startsWith('--')) throw new VoirError(`Option inconnue : ${arg}\n${USAGE}`);
		else targets.push(arg);
	}
	if (targets.length !== 1) throw new VoirError(USAGE);
	if (options.desktop && options.small)
		throw new VoirError('Choisir --petit ou --ordi, pas les deux.');
	options.target = targets[0] as string;
	return options;
}

/**
 * Refuse tout ce qui n'est pas une page d'un serveur local (autre site,
 * `//hôte`, `javascript:`), avant même de chercher le serveur.
 */
export function assertLocalTarget(target: string): void {
	const refusal = new VoirError(
		`Refusé : « ${target} » mène à un autre site que le serveur local.`
	);
	if (target.startsWith('/')) {
		if (new URL(target, 'http://localhost').host !== 'localhost') throw refusal;
		return;
	}
	const notAPage = new VoirError(
		`« ${target} » n'est pas une page : donner un chemin, comme /carnet.`
	);
	let url: URL;
	try {
		url = new URL(target);
	} catch {
		throw notAPage;
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') throw notAPage;
	if (url.protocol !== 'http:' || !LOCAL_HOSTS.has(url.hostname)) throw refusal;
}

/** L'adresse à ouvrir, toujours sur le serveur local de ce worktree (son port). */
export function resolveTarget(target: string, port: number): string {
	assertLocalTarget(target);
	const origin = `http://localhost:${port}`;
	const url = new URL(target, origin);
	if (url.port !== String(port))
		throw new VoirError(
			`Refusé : « ${target} » mène à un autre site que le serveur de ce worktree (${origin}).`
		);
	return `${origin}${url.pathname}${url.search}${url.hash}`;
}

/** Le port du serveur de dev lancé depuis CE worktree. N'en lance jamais. */
export function pickPort(servers: DevServer[], root: string, wanted: number | null): number {
	const mine = servers.filter((server) => server.cwd === root);
	if (wanted !== null) {
		const server = servers.find((s) => s.port === wanted);
		if (!server) throw new VoirError(`Aucun serveur de dev n'écoute sur le port ${wanted}.`);
		if (server.cwd !== root)
			throw new VoirError(
				`Le port ${wanted} est le serveur d'un autre dossier (${server.cwd}), pas de ce worktree.`
			);
		return wanted;
	}
	if (mine.length === 0)
		throw new VoirError(
			`Aucun serveur de dev lancé depuis ${root}.\n` +
				'Le lancer d’abord (dans un worktree) : pnpm dev --port 5176 --strictPort (port libre à partir de 5176).'
		);
	if (mine.length > 1)
		throw new VoirError(
			`Plusieurs serveurs dans ce worktree (ports ${mine.map((s) => s.port).join(', ')}) : choisir avec --port.`
		);
	return (mine[0] as DevServer).port;
}

/** Fichiers d'environnement que Vite lit en dev et qui passent devant `.env` (la prod). */
export const ENV_FILES = ['.env.local', '.env.development', '.env.development.local'];

/**
 * Le serveur de dev vise-t-il la base locale ? Jamais de connexion automatique
 * sinon. Refus prudent : TOUTES les adresses de Supabase trouvées doivent être
 * locales, et il en faut au moins une dans les fichiers (sans elle, c'est
 * `.env`, la prod, qui s'applique).
 *
 * @param envFiles contenu des fichiers de `ENV_FILES` qui existent
 * @param serverEnv environnement du process serveur (`ps eww`) : une variable
 *   posée au lancement (`PUBLIC_SUPABASE_URL=… pnpm dev`) passe devant les fichiers
 */
export function isLocalEnv(envFiles: string[], serverEnv = ''): boolean {
	const inFiles = envFiles.flatMap((content) =>
		[...content.matchAll(/^\s*(?:export\s+)?(?:PUBLIC_)?SUPABASE_URL\s*=(.*)$/gm)].map((m) =>
			(m[1] ?? '').trim().replace(/^["']|["']$/g, '')
		)
	);
	const publicInFiles = envFiles.some((content) =>
		/^\s*(?:export\s+)?PUBLIC_SUPABASE_URL\s*=/m.test(content)
	);
	if (!publicInFiles) return false;
	const inProcess = [...serverEnv.matchAll(/(?:^|\s)(?:PUBLIC_)?SUPABASE_URL=(\S+)/g)].map(
		(m) => m[1] ?? ''
	);
	return [...inFiles, ...inProcess].every((raw) => {
		try {
			const url = new URL(raw);
			return LOCAL_HOSTS.has(url.hostname);
		} catch {
			return false;
		}
	});
}

/** Une navigation de la page vers cette adresse reste-t-elle sur le serveur local ? */
export function isSameServer(address: string, origin: string): boolean {
	try {
		return new URL(address).origin === origin;
	} catch {
		return false;
	}
}

export function captureHeight(pageHeight: number): { height: number; cut: boolean } {
	if (pageHeight > MAX_HEIGHT) return { height: MAX_HEIGHT, cut: true };
	return { height: pageHeight, cut: false };
}

/**
 * Les tranches d'une image haute, de haut en bas. Une image qui tient dans une
 * tranche n'est pas découpée (liste vide).
 */
export function slices(height: number): { y: number; height: number }[] {
	if (height <= SLICE_HEIGHT) return [];
	const parts: { y: number; height: number }[] = [];
	for (let y = 0; y < height; y += SLICE_HEIGHT)
		parts.push({ y, height: Math.min(SLICE_HEIGHT, height - y) });
	return parts;
}

/** La page demandée a-t-elle renvoyé vers la connexion ? */
export function isLoginRedirect(requested: string, final: string): boolean {
	const isLogin = (address: string) => new URL(address).pathname.startsWith('/auth/login');
	return isLogin(final) && !isLogin(requested);
}

/** Nom du format d'écran : `ordi`, `iphone` ou `iphone-se` (`--petit`) */
export function formatName(options: Pick<VoirOptions, 'desktop' | 'small'>): string {
	if (options.desktop) return 'ordi';
	return options.small ? 'iphone-se' : 'iphone';
}

export function captureName(
	date: Date,
	target: string,
	options: Pick<VoirOptions, 'desktop' | 'small' | 'chromium' | 'account'>
): string {
	const two = (n: number) => String(n).padStart(2, '0');
	const stamp =
		`${date.getFullYear()}${two(date.getMonth() + 1)}${two(date.getDate())}` +
		`-${two(date.getHours())}${two(date.getMinutes())}${two(date.getSeconds())}`;
	const path = new URL(target, 'http://localhost').pathname;
	const slug =
		path
			.replace(/[^a-zA-Z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 60) || 'accueil';
	const parts = [stamp, slug, formatName(options), options.chromium ? 'chrome' : 'safari'];
	if (options.account) parts.push(options.account);
	return parts.join('-');
}
