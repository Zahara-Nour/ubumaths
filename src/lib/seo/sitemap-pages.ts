/**
 * Pages publiques listées dans `sitemap.xml`.
 *
 * Extrait de la route parce que SvelteKit n'autorise, dans un `+server.ts`, que
 * les exports de méthodes HTTP (ou préfixés par `_`) : y exporter cette liste
 * casse le build. Un module dédié la rend importable par la route ET par son
 * test, sans contourner la règle.
 *
 * @module lib/seo/sitemap-pages
 */

export interface SitemapPage {
	/** Chemin absolu, tel qu'il apparaîtra dans le plan. */
	path: string;
	/** Priorité relative, entre 0 et 1 (protocole sitemaps.org). */
	priority: number;
	/** Fréquence de mise à jour annoncée aux robots. */
	changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

/**
 * Uniquement les pages **publiques et pérennes**. Sont exclues, volontairement :
 *
 * - tout ce qui vit sous `(protected)` — hors d'atteinte d'un robot ;
 * - les pages de démonstration et de mise au point (`demo`, `*-demo`,
 *   `test-font`, `blockly`) — sans intérêt pour un visiteur ;
 * - `auth` et `consent` — des étapes de parcours, pas des destinations.
 *
 * ⚠️ Chaque chemin doit correspondre à une page réellement rendue. `/legal` et
 * `/exercice` n'en sont pas : ce sont des dossiers de routes, seules leurs pages
 * filles existent. Le test associé vérifie ce point sur le disque.
 */
export const SITEMAP_PAGES: SitemapPage[] = [
	{ path: '/', priority: 1.0, changefreq: 'weekly' },
	{ path: '/automaths', priority: 0.9, changefreq: 'weekly' },
	{ path: '/python', priority: 0.8, changefreq: 'monthly' },
	{ path: '/games', priority: 0.8, changefreq: 'monthly' },
	{ path: '/glossaire', priority: 0.7, changefreq: 'monthly' },
	{ path: '/calc', priority: 0.6, changefreq: 'monthly' },
	{ path: '/upsilon', priority: 0.6, changefreq: 'monthly' },
	{ path: '/presques-evaluations', priority: 0.4, changefreq: 'monthly' },
	{ path: '/pere-ubu', priority: 0.4, changefreq: 'yearly' },
	{ path: '/legal/mentions-legales', priority: 0.3, changefreq: 'yearly' },
	{ path: '/legal/confidentialite', priority: 0.3, changefreq: 'yearly' },
	{ path: '/legal/cgu', priority: 0.3, changefreq: 'yearly' }
];
