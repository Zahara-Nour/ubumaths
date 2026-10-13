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
 * Une page publique volontairement absente du plan, avec sa raison.
 *
 * `pattern` est un chemin de route, paramètres compris (`/cahier/[token]`) :
 * - `*` remplace n'importe quelle suite de caractères dans UN segment (`/test-*`) ;
 * - un `/**` final couvre la route elle-même et tout ce qui vit dessous.
 */
export interface SitemapExclusion {
	pattern: string;
	reason: string;
}

/**
 * Route dynamique dont les URL sont générées à la requête par `sitemap.xml`.
 * `source` dit d'où viennent les URL, pour qui lit la garde.
 */
export interface SitemapDynamicRoute {
	route: string;
	source: string;
}

/**
 * Uniquement les pages **publiques et pérennes**. Tout ce qui vit sous
 * `(protected)` est hors d'atteinte d'un robot ; toute autre page doit figurer
 * ici, dans `SITEMAP_DYNAMIC_ROUTES` ou dans `SITEMAP_EXCLUSIONS` avec sa
 * raison — le test `sitemap-pages.test.ts` parcourt le disque et l'exige.
 *
 * ⚠️ Chaque chemin doit correspondre à une page réellement rendue. `/legal` et
 * `/exercice` n'en sont pas : ce sont des dossiers de routes, seules leurs pages
 * filles existent. Le test associé vérifie ce point sur le disque.
 */
export const SITEMAP_PAGES: SitemapPage[] = [
	{ path: '/', title: 'Accueil', priority: 1.0, changefreq: 'weekly' },
	{ path: '/royaume', title: 'Le Tour du Royaume', priority: 0.9, changefreq: 'monthly' },
	{ path: '/eleves', title: 'Pour les élèves', priority: 0.8, changefreq: 'monthly' },
	{ path: '/parents', title: 'Pour les parents', priority: 0.8, changefreq: 'monthly' },
	{ path: '/professeurs', title: 'Pour les professeurs', priority: 0.8, changefreq: 'monthly' },
	{ path: '/automaths', title: 'Automaths', priority: 0.9, changefreq: 'weekly' },
	{ path: '/python', title: 'Python', priority: 0.8, changefreq: 'monthly' },
	{
		path: '/python-exercises',
		title: 'Corvées Python',
		priority: 0.5,
		changefreq: 'monthly'
	},
	{ path: '/games', title: 'Jeux', priority: 0.8, changefreq: 'monthly' },
	{ path: '/games/trio', title: 'Trio', priority: 0.6, changefreq: 'monthly' },
	{ path: '/games/mathemo', title: 'Mathémo', priority: 0.6, changefreq: 'monthly' },
	{ path: '/games/minesweeper', title: 'Démineur', priority: 0.6, changefreq: 'monthly' },
	{ path: '/games/2048', title: '2048', priority: 0.6, changefreq: 'monthly' },
	{ path: '/glossaire', title: 'Glossaire', priority: 0.7, changefreq: 'monthly' },
	{ path: '/atelier', title: 'Atelier', priority: 0.8, changefreq: 'monthly' },
	{ path: '/grapheur', title: 'Grapheur', priority: 0.7, changefreq: 'monthly' },
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

/**
 * Routes dynamiques couvertes par le plan : leurs URL viennent d'une source,
 * pas de cette liste. Un brouillon ou un article à paraître n'y entre jamais
 * (filtre `publishedArticles` dans `routes/sitemap.xml/+server.ts`), ni un
 * exercice que son auteur n'a pas coché « Afficher sur Google ».
 */
export const SITEMAP_DYNAMIC_ROUTES: SitemapDynamicRoute[] = [
	{ route: '/shtam/[slug]', source: 'articles du Shtam parus (publishedArticles)' },
	{
		route: '/exercice/[slug]',
		source:
			'exercices publics cochés « Afficher sur Google », lus en anonyme (fetchIndexedExercises)'
	}
];

const DEMO = 'démonstration ou mise au point, sans intérêt pour un visiteur';
const LOGIN_REQUIRED = 'renvoie un visiteur anonyme vers la connexion';

/**
 * Pages publiques volontairement absentes du plan. Par familles :
 * démos, parcours d'authentification, pages à compte ou à jeton, routes
 * dynamiques sans source. Chaque motif doit couvrir au moins une page
 * existante : une exclusion périmée échoue au test.
 */
export const SITEMAP_EXCLUSIONS: SitemapExclusion[] = [
	// « Ne pas mettre en avant » (docs/systeme/carte-des-fonctionnalites.md)
	{ pattern: '/games/evoland', reason: 'jeu en sommeil, sans lien depuis /games' },
	// Démos et mise au point
	{ pattern: '/demo/**', reason: DEMO },
	{ pattern: '/geometry-demo/**', reason: DEMO },
	{ pattern: '/construction-demo', reason: DEMO },
	{ pattern: '/test-*', reason: DEMO },
	{ pattern: '/blockly/**', reason: DEMO },
	{ pattern: '/slides/**', reason: DEMO },

	// Parcours d'authentification et de consentement
	{ pattern: '/auth/**', reason: 'étape du parcours de connexion, pas une destination' },
	{
		pattern: '/consent/**',
		reason: 'consentement parental ouvert par un jeton envoyé par courriel'
	},

	// Pages à compte, à jeton ou au contenu personnel
	{
		pattern: '/automaths/panier',
		reason: 'panier du visiteur, gardé dans son navigateur : vide pour un robot'
	},
	{
		pattern: '/automaths/test',
		reason: 'lance la série décrite par l’adresse ; sans elle, renvoie au panier'
	},
	{ pattern: '/cahier/[token]/**', reason: 'cahier de textes ouvert par le jeton du professeur' },
	{ pattern: '/cours/[token]/**', reason: 'cours d’une classe ouvert par le jeton du professeur' },
	{
		pattern: '/figures/[id]',
		reason: 'figure géométrique partagée par lien, en noindex (ADR 0027)'
	},
	{ pattern: '/python-exercises/mine', reason: LOGIN_REQUIRED },
	{ pattern: '/python-exercises/my-progress', reason: LOGIN_REQUIRED },
	{ pattern: '/python-exercises/new', reason: LOGIN_REQUIRED },
	{ pattern: '/python-exercises/[id]/edit', reason: LOGIN_REQUIRED },
	{
		pattern: '/python-exercises/[id]/results/**',
		reason: `${LOGIN_REQUIRED} ; résultats d’élèves`
	},
	{
		pattern: '/python-exercises/students/[student_id]',
		reason: `${LOGIN_REQUIRED} ; progression d’un élève`
	},

	// Guides calculatrices : tout est « Bientôt » en production tant que David n'a pas relu
	// les séquences sur la machine (docs/systeme/guides-calculatrices.md). À lister dès la
	// PR qui publie les premières séquences relues.
	{
		pattern: '/calculatrices',
		reason: 'aucun guide relu sur la machine : la page n’annonce que « Bientôt »'
	},
	{
		pattern: '/calculatrices/**',
		reason: 'aucun guide relu sur la machine : la page n’annonce que « Bientôt »'
	},

	// Routes dynamiques sans source dans le plan
	{
		pattern: '/python-exercises/[id]',
		reason: 'route dynamique : aucune source ne liste les corvées publiques'
	}
];

/** Le chemin de route `route` est-il couvert par le motif `pattern` ? */
export function matchesExclusion(route: string, pattern: string): boolean {
	const recursive = pattern.endsWith('/**');
	const base = recursive ? pattern.slice(0, -3) : pattern;
	const body = base
		.split('*')
		.map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
		.join('[^/]*');
	return new RegExp(`^${body}${recursive ? '(?:/.*)?' : ''}$`).test(route);
}
