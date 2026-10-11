/**
 * Référencement : domaine canonique, balises de partage et données structurées.
 *
 * Toutes les URL publiées aux moteurs et aux réseaux (canonique, og:url, og:image,
 * sitemap) partent du domaine de production, même quand la page est servie par
 * une préproduction : sinon Google indexerait l'adresse d'un déploiement de test.
 *
 * @module lib/seo/site
 */

// Constantes

export const SITE_URL = 'https://www.chiph.re';
export const SITE_NAME = 'Chiphre';
/** Logo de la marque (gidouille, 512 × 512) pour les données structurées ; source : `static/logo.svg` */
export const SITE_LOGO = '/logo.png';
/** Image de partage par défaut (1200 × 630), dans `static/` */
export const DEFAULT_OG_IMAGE = '/og-image.png';

/** Commandes LaTeX courantes d'un chapeau ou d'un titre, rendues en caractères */
const LATEX_SYMBOLS: Record<string, string> = {
	pi: 'π',
	varphi: 'φ',
	phi: 'φ',
	sqrt: '√',
	times: '×',
	approx: '≈',
	infty: '∞',
	ldots: '…',
	leq: '≤',
	geq: '≥',
	neq: '≠'
};

// Functions

export function absoluteUrl(path: string): string {
	return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Balise `<script type="application/ld+json">` prête à injecter. `<`, `>` et `&`
 * sont échappés en `\u00XX` : le JSON reste identique une fois relu, mais aucun
 * texte (un titre d'article…) ne peut fermer la balise ni ouvrir un commentaire.
 */
export function toJsonLdScript(data: Record<string, unknown>): string {
	const json = JSON.stringify(data)
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/&/g, '\\u0026');
	return `<script type="application/ld+json">${json}</script>`;
}

function mathToPlain(math: string): string {
	return math
		.replace(/\\([a-zA-Z]+)/g, (_, name: string) => LATEX_SYMBOLS[name] ?? name)
		.replace(/[{}]/g, '')
		.trim();
}

/** Texte ubumark → texte brut lisible (description, données structurées) */
export function toPlainText(text: string): string {
	return text
		.replace(/~([^~]+)~/g, (_, math: string) => mathToPlain(math))
		.replace(/\$([^$]+)\$/g, (_, math: string) => mathToPlain(math))
		.replace(/\*\*(.+?)\*\*/g, '$1')
		.replace(/\s+/g, ' ')
		.trim();
}
