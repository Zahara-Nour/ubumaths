/**
 * Adresses envoyées à l'analytique de Vercel ou écrites au journal des
 * erreurs : le jeton d'un lien personnel n'en sort jamais.
 *
 * Un lien du carnet de liaison (ADR 0040) donne, à qui le détient, le suivi
 * d'un élève mineur : son jeton est un secret. L'analytique reçoit
 * `/carnet/[token]` à la place, jamais le jeton.
 */

// Constantes

/** `/carnet/<jeton>` et `/carnet/confirmer/<jeton>` ; jeton en base64url. */
const SECRET_PATH = /\/carnet\/(confirmer\/)?[A-Za-z0-9_-]+/g;

// Functions

export function redactSecretUrl(url: string): string {
	return url.replace(SECRET_PATH, (_m, confirmer: string | undefined) =>
		confirmer ? '/carnet/confirmer/[token]' : '/carnet/[token]'
	);
}

/** À passer en `beforeSend` à Analytics et à Speed Insights. */
export function redactAnalyticsEvent<T extends { url: string }>(event: T): T {
	return { ...event, url: redactSecretUrl(event.url) };
}
