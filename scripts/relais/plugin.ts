/**
 * Relais de Supabase local : une règle de proxy du serveur de dev de Vite
 * =======================================================================
 *
 * Tout ce qui arrive sous `/__dev/supabase` (API, auth, stockage, temps réel par
 * WebSocket) part vers Supabase local, préfixe retiré. Le navigateur n'a plus
 * qu'une adresse à joindre, celle du serveur de dev : un seul port à publier sur
 * le tailnet (`pnpm lien`), un seul port dans le tunnel SSH.
 *
 * Le relais n'existe que sur le serveur de dev (`appliesTo`), jamais dans le
 * build, `vite preview` ni la prod, et seulement quand l'adresse de Supabase est celle de la
 * base locale : un worktree sans `.env.local` (adresse de la prod) n'a aucun
 * relais. Le nom du Mac sur le tailnet (`*.ts.net`) est accepté dans le même cas.
 *
 * Partagé avec la page : `src/lib/dev/supabase-relay.ts`.
 * Tests : `scripts/__tests__/relais.test.ts`.
 */

import type { ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { SUPABASE_RELAY_PATH, relayTarget } from '../../src/lib/dev/supabase-relay.ts';

// Types

/** Ce que le relais écoute de l'objet proxy de Vite : ses erreurs seulement. */
interface ProxyEvents {
	on(event: 'error', listener: (error: Error, req: unknown, res: unknown) => void): unknown;
}

interface RelayRule {
	target: string;
	changeOrigin: boolean;
	ws: boolean;
	rewrite: (path: string) => string;
	configure: (proxy: ProxyEvents) => void;
}

export interface RelayServerConfig {
	proxy: Record<string, RelayRule>;
	allowedHosts: string[];
}

// Constantes

/**
 * Règle de proxy de Vite (une clé qui commence par `^` est une expression
 * régulière) : le chemin du relais exactement, pas tout ce qui commence pareil.
 */
export const RELAY_RULE = `^${SUPABASE_RELAY_PATH}(/|$)`;

/** Noms d'hôte acceptés en plus de `localhost` : les machines du tailnet. */
const TAILNET_HOSTS = ['.ts.net'];

// Functions

/**
 * Le serveur de dev seulement : ni le build, ni `vite preview` (qui reprendrait
 * le proxy et les noms acceptés du serveur de dev pour servir le site construit).
 */
export function appliesTo(
	_config: unknown,
	env: { command: string; isPreview?: boolean }
): boolean {
	return env.command === 'serve' && env.isPreview !== true;
}

/** Réponse quand Supabase local ne répond pas (pile arrêtée). */
export function relayErrorBody(): { message: string } {
	return { message: 'Supabase local ne répond pas : pnpm db:start' };
}

function isHttpResponse(res: unknown): res is ServerResponse {
	return typeof res === 'object' && res !== null && 'writeHead' in res && 'headersSent' in res;
}

/**
 * Supabase injoignable : une erreur lisible plutôt qu'un échec muet. Pour un
 * WebSocket (`res` est alors une socket), Vite ferme la connexion lui-même.
 */
function onRelayError(_error: Error, _req: unknown, res: unknown): void {
	if (!isHttpResponse(res) || res.headersSent || res.writableEnded) return;
	res.writeHead(502, {
		'content-type': 'application/json; charset=utf-8',
		'cache-control': 'no-store'
	});
	res.end(JSON.stringify(relayErrorBody()));
}

/** Réglages du serveur de dev pour cette adresse de Supabase ; `null` si elle n'est pas locale. */
export function relayServerConfig(supabaseUrl: string | undefined): RelayServerConfig | null {
	const target = relayTarget(supabaseUrl);
	if (target === null) return null;
	return {
		proxy: {
			[RELAY_RULE]: {
				target,
				changeOrigin: true,
				ws: true,
				rewrite: (path) => path.slice(SUPABASE_RELAY_PATH.length) || '/',
				configure: (proxy) => {
					proxy.on('error', onRelayError);
				}
			}
		},
		allowedHosts: TAILNET_HOSTS
	};
}

/**
 * @param supabaseUrl adresse de Supabase du serveur (`PUBLIC_SUPABASE_URL`), lue au démarrage
 */
export function supabaseRelay(
	supabaseUrl: () => string | undefined = () => process.env.PUBLIC_SUPABASE_URL
): Plugin {
	return {
		name: 'supabase-relais-dev',
		apply: appliesTo,
		config() {
			const relay = relayServerConfig(supabaseUrl());
			return relay ? { server: relay } : undefined;
		}
	};
}
