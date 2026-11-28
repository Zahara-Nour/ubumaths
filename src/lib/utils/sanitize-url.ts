/**
 * Lien sûr, sans DOMPurify
 * ========================
 *
 * `sanitizeUrl` vit à part de `sanitize.ts` : ce dernier importe `isomorphic-dompurify`,
 * donc jsdom côté serveur (~640 modules, ~140 ms, ~70 Mo mesurés le 2026-11-21). Les
 * composants de markdown n'ont besoin que de cette fonction ; importée de `sanitize.ts`,
 * elle faisait charger jsdom au rendu serveur de toute page qui affiche du markdown.
 *
 * Ce fichier n'importe rien, et doit le rester.
 */

/** Schémas d'URL autorisés dans un lien ; un lien relatif (sans schéma) passe aussi */
const SAFE_URL_SCHEMES: ReadonlySet<string> = new Set(['http', 'https', 'mailto']);

/**
 * Un lien sûr, ou '#' : schémas autorisés (`SAFE_URL_SCHEMES`) ou lien relatif.
 *
 * @param url - URL string to sanitize
 * @returns The URL unchanged if safe, '#' otherwise
 */
export function sanitizeUrl(url: string | undefined): string {
	if (!url || typeof url !== 'string') {
		return '#';
	}

	// Ce que le NAVIGATEUR lira : il retire espaces et caractères de contrôle en
	// tête, et tabulations / retours à la ligne partout (`java\nscript:` devient
	// `javascript:`). On décide sur cette forme-là, pas sur la chaîne écrite.
	// eslint-disable-next-line no-control-regex
	const normalized = url.replace(/^[\u0000-\u0020]+/, '').replace(/[\t\n\r]/g, '');

	// Un schéma explicite (`xxx:`) doit être dans la liste BLANCHE. Une liste
	// noire (`javascript:`, `data:`…) laisse passer ce qu'on n'a pas prévu.
	const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(normalized)?.[1].toLowerCase();
	if (scheme !== undefined && !SAFE_URL_SCHEMES.has(scheme)) {
		return '#';
	}

	return url;
}
