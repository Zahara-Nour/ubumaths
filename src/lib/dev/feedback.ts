/**
 * Bouton « signaler » du serveur de dev : ce que partagent la page et le serveur
 * ==============================================================================
 *
 * Le bouton (`SignalerButton.svelte`) envoie un retour à une route qui n'existe
 * que sur le serveur de dev de Vite (`scripts/retours/plugin.ts`) : rien de tout
 * cela n'est dans le build. Doc : docs/pratiques/signaler-depuis-la-page.md.
 */

// Types

export type FeedbackErrorType = 'console' | 'error' | 'unhandledrejection';

export interface FeedbackError {
	type: FeedbackErrorType;
	message: string;
	/** Date ISO du moment où l'erreur a été vue */
	at: string;
}

export interface FeedbackPayload {
	note: string;
	/** Adresse complète de la page */
	url: string;
	viewport: { width: number; height: number; dpr: number };
	userAgent: string;
	/** Compte fictif connecté, `null` pour un visiteur */
	account: { email: string; role: string } | null;
	errors: FeedbackError[];
	/** Erreurs plus anciennes, écartées faute de place */
	droppedErrors: number;
}

// Constantes

/** Adresse de la route, servie par le serveur de dev de Vite seulement. */
export const FEEDBACK_ENDPOINT = '/__dev/retours';

export const MAX_NOTE = 2000;
export const MAX_ERRORS = 50;
export const MAX_ERROR_MESSAGE = 2000;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
/** Le Mac mini joint par le tailnet (tester-sur-un-autre-appareil.md) : base locale aussi. */
const TAILNET_SUFFIX = '.ts.net';

// Functions

/** Vrai si cette adresse de Supabase est la base locale (au moindre doute : faux). */
export function isLocalSupabaseUrl(url: string | undefined): boolean {
	if (!url) return false;
	try {
		const host = new URL(url).hostname;
		return LOCAL_HOSTS.has(host) || host.endsWith(TAILNET_SUFFIX);
	} catch {
		return false;
	}
}
