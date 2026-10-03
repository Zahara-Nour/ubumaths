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
