/**
 * Relais de Supabase local par le serveur de dev : ce que partagent la page et le serveur
 * =======================================================================================
 *
 * En dev, sur la base locale, le navigateur ne joint plus Supabase par une
 * deuxième adresse (`http://127.0.0.1:54321`, qui ne désigne le Mac mini que sur
 * le Mac mini) : il passe par le serveur de dev, qui relaie tout ce qui arrive
 * sous `SUPABASE_RELAY_PATH` (`scripts/relais/plugin.ts`). Un seul port à
 * publier, la même page marche sur le Mac mini, par le tunnel SSH et par le lien
 * du tailnet. Le serveur, lui, garde l'adresse directe.
 *
 * Rien de tout cela n'existe hors de `pnpm dev` : toutes les fonctions rendent
 * l'adresse telle quelle quand `dev` est faux ou que la base n'est pas locale.
 * Doc : docs/pratiques/tester-sur-un-autre-appareil.md.
 */

// Constantes

/** Chemin du serveur de dev relayé vers Supabase local. */
export const SUPABASE_RELAY_PATH = '/__dev/supabase';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

// Functions

/**
 * L'origine de Supabase si c'est la base locale du Mac (adresse de bouclage, en
 * HTTP), sinon `null`. Jamais de relais vers une base distante : la prod ne se
 * joint pas à travers un lien de test.
 */
export function relayTarget(supabaseUrl: string | undefined): string | null {
	if (!supabaseUrl) return null;
	try {
		const url = new URL(supabaseUrl);
		return url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname) ? url.origin : null;
	} catch {
		return null;
	}
}

/** Le relais sert-il ? En dev seulement, et sur la base locale seulement. */
export function isRelayed(supabaseUrl: string | undefined, dev: boolean): boolean {
	return dev && relayTarget(supabaseUrl) !== null;
}

/**
 * Adresse de Supabase pour le client du navigateur : le relais, sur l'origine
 * de la page (celle par laquelle l'appareil joint déjà le serveur de dev).
 */
export function relayedSupabaseUrl(supabaseUrl: string, pageOrigin: string, dev: boolean): string {
	return isRelayed(supabaseUrl, dev) ? `${pageOrigin}${SUPABASE_RELAY_PATH}` : supabaseUrl;
}

/**
 * Nom du cookie de session que `supabase-js` déduit d'une adresse de Supabase
 * (`sb-<premier morceau du nom d'hôte>-auth-token`). Le navigateur, qui passe
 * par le relais, doit garder le nom que le serveur déduit de l'adresse directe :
 * sinon chacun lit un cookie que l'autre n'écrit pas, et la connexion « ne fait rien ».
 */
export function sessionCookieName(supabaseUrl: string): string {
	return `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
}

/**
 * Une adresse du stockage de Supabase local (image, pièce jointe, lien signé),
 * réécrite pour le navigateur : chemin du relais, sans origine, donc valable sur
 * tous les appareils. Toute autre adresse est rendue telle quelle.
 */
export function relayedAddress(address: string, supabaseUrl: string, dev: boolean): string {
	const target = isRelayed(supabaseUrl, dev) ? relayTarget(supabaseUrl) : null;
	if (target === null || !address.startsWith(`${target}/`)) return address;
	return `${SUPABASE_RELAY_PATH}${address.slice(target.length)}`;
}

/**
 * L'inverse, pour ce qui s'ENREGISTRE (image envoyée depuis le navigateur, dont
 * le client fabrique l'adresse par le relais) : l'adresse directe de Supabase
 * local, la même quel que soit l'appareil qui a envoyé le fichier.
 */
export function directAddress(
	address: string,
	supabaseUrl: string,
	pageOrigin: string,
	dev: boolean
): string {
	const target = isRelayed(supabaseUrl, dev) ? relayTarget(supabaseUrl) : null;
	const relay = `${pageOrigin}${SUPABASE_RELAY_PATH}/`;
	if (target === null || !address.startsWith(relay)) return address;
	return `${target}/${address.slice(relay.length)}`;
}
