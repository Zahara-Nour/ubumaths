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
	/** Nom court, affiché par la page d'erreur dans « Tu cherchais peut-être… ». */
	title: string;
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
 *   `test-font`, `test-erreur`, `blockly`) — sans intérêt pour un visiteur ;
 * - `auth` et `consent` — des étapes de parcours, pas des destinations.
 *
 * ⚠️ Chaque chemin doit correspondre à une page réellement rendue. `/legal` et
 * `/exercice` n'en sont pas : ce sont des dossiers de routes, seules leurs pages
 * filles existent. Le test associé vérifie ce point sur le disque.
 */
export const SITEMAP_PAGES: SitemapPage[] = [
	{ path: '/', title: 'Accueil', priority: 1.0, changefreq: 'weekly' },
	{ path: '/royaume', title: 'Le Tour du Royaume', priority: 0.9, changefreq: 'monthly' },
	{ path: '/automaths', title: 'Automaths', priority: 0.9, changefreq: 'weekly' },
	{ path: '/python', title: 'Python', priority: 0.8, changefreq: 'monthly' },
	{ path: '/games', title: 'Jeux', priority: 0.8, changefreq: 'monthly' },
	{ path: '/glossaire', title: 'Glossaire', priority: 0.7, changefreq: 'monthly' },
	{ path: '/calc', title: 'Calculatrice', priority: 0.6, changefreq: 'monthly' },
	{
		path: '/upsilon',
		title: 'Calculatrice graphique Upsilon',
		priority: 0.6,
		changefreq: 'monthly'
	},
	{
		path: '/presques-evaluations',
		title: 'Les presques évaluations',
		priority: 0.4,
		changefreq: 'monthly'
	},
	{ path: '/pere-ubu', title: 'Père Ubu', priority: 0.4, changefreq: 'yearly' },
	{ path: '/almanach', title: 'L’Almanach des Chiphres', priority: 0.4, changefreq: 'daily' },
	{ path: '/chiffrement', title: 'Le Cabinet Noir', priority: 0.7, changefreq: 'monthly' },
	{
		path: '/chiffrement/depeches',
		title: 'Le Cabinet Noir : dépêches',
		priority: 0.6,
		changefreq: 'monthly'
	},
	{ path: '/chiffrement/cesar', title: 'Chiffre de César', priority: 0.6, changefreq: 'monthly' },
	{ path: '/chiffrement/atbash', title: 'Chiffre Atbash', priority: 0.5, changefreq: 'monthly' },
	{
		path: '/chiffrement/substitution',
		title: 'Chiffre par substitution',
		priority: 0.6,
		changefreq: 'monthly'
	},
	{ path: '/chiffrement/scytale', title: 'Scytale', priority: 0.5, changefreq: 'monthly' },
	{ path: '/chiffrement/polybe', title: 'Carré de Polybe', priority: 0.5, changefreq: 'monthly' },
	{
		path: '/chiffrement/vigenere',
		title: 'Chiffre de Vigenère',
		priority: 0.6,
		changefreq: 'monthly'
	},
	{ path: '/chiffrement/affine', title: 'Chiffre affine', priority: 0.6, changefreq: 'monthly' },
	{ path: '/chiffrement/hill', title: 'Chiffre de Hill', priority: 0.6, changefreq: 'monthly' },
	{ path: '/chiffrement/rsa', title: 'RSA', priority: 0.6, changefreq: 'monthly' },
	{ path: '/shtam', title: 'Le Shtam', priority: 0.7, changefreq: 'daily' },
	{ path: '/a-propos', title: 'Chiphre, c’est quoi ?', priority: 0.5, changefreq: 'yearly' },
	{
		path: '/legal/mentions-legales',
		title: 'Mentions légales',
		priority: 0.3,
		changefreq: 'yearly'
	},
	{ path: '/legal/confidentialite', title: 'Confidentialité', priority: 0.3, changefreq: 'yearly' },
	{ path: '/legal/cgu', title: 'Conditions d’utilisation', priority: 0.3, changefreq: 'yearly' }
];
