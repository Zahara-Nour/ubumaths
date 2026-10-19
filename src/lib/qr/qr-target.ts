/**
 * L'adresse d'un QR code écrite par l'auteur
 * ==========================================
 *
 * Bloc ubumark ```qr (lot 2, `docs/wip/qr-codes-phase0.md`) : l'auteur écrit
 * une adresse du site en court (`/glossaire`, `chiph.re/shtam`) ou l'adresse
 * d'un site extérieur. Le QR porte toujours l'adresse complète, avec `www`
 * pour le site (mesuré le 2026-10-19 : `chiph.re` redirige en 308 vers
 * `www.chiph.re`).
 *
 * Module pur et LÉGER (aucun import de `uqr`) : le parseur ubumark l'importe,
 * et il est dans le chunk de toutes les pages Markdown.
 *
 * @module qr/qr-target
 */

import { canonicalUrl } from '$lib/seo/site';

// ============================================================================
// TYPES
// ============================================================================

export type QrTarget = { readonly url: string } | { readonly error: string };

// ============================================================================
// CONSTANTES
// ============================================================================

/** `chiph.re`, avec ou sans schéma ni `www`, suivi d'un chemin ou de rien */
const SITE_HOST = /^(?:https?:\/\/)?(?:www\.)?chiph\.re(?=[/?#]|$)/i;

/** Un site extérieur : https, un nom d'hôte avec un point */
const EXTERNAL_HTTPS = /^https:\/\/[^/?#]+\.[^/?#]+/i;

// ============================================================================
// FONCTIONS
// ============================================================================

/**
 * L'adresse que portera le QR code, ou la raison du refus (en français).
 *
 * ⚠️ `http://` est refusé pour un site extérieur : un téléphone avertit avant
 * d'ouvrir un site non sécurisé, ce qui arrête l'élève devant le QR. Pour le
 * site lui-même, `http://chiph.re` devient simplement `https://www.chiph.re`.
 */
export function normalizeQrTarget(raw: string): QrTarget {
	const text = raw.trim();
	if (text === '') return { error: 'adresse manquante' };
	if (/\s/.test(text)) return { error: `l'adresse « ${text} » contient une espace` };

	// Chemin du site (`//autre.site` n'en est pas un : c'est un autre site sans schéma)
	if (text.startsWith('/') && !text.startsWith('//')) return { url: canonicalUrl(text) };

	const site = SITE_HOST.exec(text);
	if (site) return { url: canonicalUrl(text.slice(site[0].length) || '/') };

	if (EXTERNAL_HTTPS.test(text)) {
		try {
			new URL(text);
			// L'adresse telle qu'écrite : c'est elle que l'auteur a vérifiée
			return { url: text };
		} catch {
			return { error: `adresse « ${text} » illisible` };
		}
	}

	if (/^http:\/\//i.test(text)) {
		return { error: `adresse « ${text} » en http:// : écris-la en https://` };
	}
	return {
		error: `adresse « ${text} » non reconnue : commence-la par https://, ou par / pour une page du site (ex. /glossaire)`
	};
}
