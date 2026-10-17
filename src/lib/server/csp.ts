/**
 * Sources de la Content-Security-Policy qui dépendent de la configuration.
 */

/**
 * L'origine EXACTE du projet Supabase, pour `img-src` : jamais `*.supabase.co`,
 * qui admettrait le projet de n'importe qui (audit de sécurité du 2026-10-03).
 */
export function supabaseCspSource(supabaseUrl: string): string {
	return new URL(supabaseUrl).origin;
}

/**
 * Notre projet Supabase pour `connect-src` : API (http/https) et temps réel
 * (ws/wss). En prod, déjà couvert par `*.supabase.co` ; en dev sur la base
 * locale (`http://127.0.0.1:54321`), sans lui, le navigateur ne pouvait joindre
 * ni l'auth (rafraîchissement de session) ni l'API.
 */
export function supabaseConnectSources(supabaseUrl: string): [string, string] {
	const url = new URL(supabaseUrl);
	const socketProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
	return [url.origin, `${socketProtocol}//${url.host}`];
}
