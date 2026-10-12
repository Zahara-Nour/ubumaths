/**
 * Durée de vie des cookies de session Supabase (`sb-*`)
 * =====================================================
 *
 * SECURITY (finding H3) : `@supabase/ssr` écrit ses cookies avec un `maxAge` de
 * 400 jours, et ignore un `cookieOptions.maxAge` fourni (il le remet à sa valeur
 * par défaut). Le plafond se pose donc dans nos propres `setAll` :
 * - serveur : `src/lib/server/supabase.ts` (réponses qui posent un cookie) ;
 * - navigateur : `browserCookieMethods` ci-dessous, branché sur `createBrowserClient`
 *   (`src/routes/+layout.ts`). Sans lui, un rafraîchissement de session fait par le
 *   navigateur réécrivait le cookie pour 400 jours (finding A1, 2026-10-12).
 *
 * Module sans dépendance : `+layout.ts` le charge statiquement (Safari TDZ, cf.
 * docs/pratiques/safari-webkit-tdz.md).
 *
 * @module utils/session-cookies
 */

// Types

/** Ce que le plafond lit dans les options d'écriture d'un cookie. */
type WithMaxAge = { maxAge?: number };

type CookieToSet<O extends WithMaxAge> = { name: string; value: string; options: O };

type CookieCodec<O extends WithMaxAge> = {
	parse: (header: string) => { name: string; value?: string }[];
	serialize: (name: string, value: string, options: O) => string;
};

// Constantes

/** Durée de vie maximale d'une session : 30 jours, en secondes. */
export const MAX_SESSION_AGE = 60 * 60 * 24 * 30;

// Functions

/**
 * Plafonne `maxAge` à 30 jours. Un effacement (`maxAge: 0`) ou un cookie plus court
 * passe tel quel ; sans `maxAge`, rien n'est ajouté.
 */
export function capSessionCookieOptions<T extends WithMaxAge>(options: T): T {
	if (options.maxAge == null || options.maxAge <= MAX_SESSION_AGE) return options;
	return { ...options, maxAge: MAX_SESSION_AGE };
}

/**
 * `getAll` / `setAll` pour `createBrowserClient`, sur `document.cookie`, avec le
 * plafond de 30 jours. `codec` = `parseCookieHeader` / `serializeCookieHeader` de
 * `@supabase/ssr` (passés par l'appelant : ce module ne l'importe pas).
 */
export function browserCookieMethods<O extends WithMaxAge>(
	codec: CookieCodec<O>,
	doc: { cookie: string } = document
) {
	return {
		getAll: () => codec.parse(doc.cookie).map(({ name, value }) => ({ name, value: value ?? '' })),
		setAll: (cookiesToSet: CookieToSet<O>[]) => {
			for (const { name, value, options } of cookiesToSet) {
				doc.cookie = codec.serialize(name, value, capSessionCookieOptions(options));
			}
		}
	};
}
