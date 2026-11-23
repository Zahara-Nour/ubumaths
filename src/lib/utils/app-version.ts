/**
 * Onglet resté ouvert pendant un déploiement
 * ==========================================
 *
 * Après un `deploy:prod`, un onglet ouvert garde l'ancien code : ses fichiers JS chargés à la
 * demande n'existent plus, et les données du nouveau serveur peuvent avoir changé de forme.
 * Deux gardes :
 * - `checkAppVersion` : avant le rafraîchissement horaire du jeton (`+layout.ts`), on ne recharge
 *   pas les données si une nouvelle version existe ;
 * - `shouldReloadOnNavigate` : sur un lien ou Précédent / Suivant, la page suivante se charge en
 *   entier avec le nouveau code (`+layout.svelte`). Jamais sur un `goto` (en pleine activité).
 *
 * Module sans dépendance : importé statiquement par `+layout.ts` (pas de chaîne, Safari TDZ).
 */

// Types
export type VersionState = 'same' | 'new' | 'unknown';

export interface NavigateInfo {
	updated: boolean;
	willUnload: boolean;
	type: string;
	to: { url: URL } | null;
}

// Constantes
const VERSION_URL = '/_app/version.json';
const RELOAD_TYPES = new Set(['link', 'popstate']);

// Functions

/**
 * Compare la version de l'onglet à celle du dernier déploiement.
 * Fichier illisible (hors ligne, dev, contenu inattendu) → `unknown` : l'appelant fait comme avant.
 */
export async function checkAppVersion(
	current: string,
	fetchFn: typeof fetch = fetch
): Promise<VersionState> {
	try {
		const response = await fetchFn(VERSION_URL, { cache: 'no-cache' });
		if (!response.ok) return 'unknown';
		const body: unknown = await response.json();
		if (typeof body !== 'object' || body === null || !('version' in body)) return 'unknown';
		const deployed = body.version;
		if (typeof deployed !== 'string') return 'unknown';
		return deployed === current ? 'same' : 'new';
	} catch {
		return 'unknown';
	}
}

/** Une nouvelle version existe et l'utilisateur change de page lui-même : rechargement complet */
export function shouldReloadOnNavigate({ updated, willUnload, type, to }: NavigateInfo): boolean {
	return updated && !willUnload && to !== null && RELOAD_TYPES.has(type);
}
