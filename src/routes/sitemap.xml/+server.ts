/**
 * sitemap.xml — plan du site pour les moteurs de recherche
 *
 * Généré plutôt que statique : les URL restent synchronisées avec les routes
 * sans qu'on ait à penser à un fichier séparé.
 *
 * Périmètre : uniquement les pages **publiques et pérennes**. Sont exclues,
 * volontairement :
 *   - tout ce qui est sous `(protected)` — hors d'atteinte d'un robot ;
 *   - les pages de démonstration et de mise au point (`demo`, `*-demo`,
 *     `test-font`, `blockly`) — sans intérêt pour un visiteur ;
 *   - `auth` et `consent` — des étapes de parcours, pas des destinations.
 *
 * Son absence produisait un 404 à chaque passage de robot, qui alimentait le
 * bruit du monitoring de production.
 *
 * @module routes/sitemap.xml
 */
import type { RequestHandler } from './$types';

/** Pages publiques dignes d'être indexées, avec leur priorité relative. */
export const PAGES: Array<{ path: string; priority: number; changefreq: string }> = [
	{ path: '/', priority: 1.0, changefreq: 'weekly' },
	{ path: '/automaths', priority: 0.9, changefreq: 'weekly' },
	{ path: '/python', priority: 0.8, changefreq: 'monthly' },
	{ path: '/games', priority: 0.8, changefreq: 'monthly' },
	{ path: '/glossaire', priority: 0.7, changefreq: 'monthly' },
	{ path: '/calc', priority: 0.6, changefreq: 'monthly' },
	{ path: '/upsilon', priority: 0.6, changefreq: 'monthly' },
	{ path: '/presques-evaluations', priority: 0.4, changefreq: 'monthly' },
	{ path: '/pere-ubu', priority: 0.4, changefreq: 'yearly' },
	// `/legal` et `/exercice` ne sont que des dossiers de routes : seules leurs
	// pages filles existent. Les lister produirait des 404 dans notre propre plan.
	{ path: '/legal/mentions-legales', priority: 0.3, changefreq: 'yearly' },
	{ path: '/legal/confidentialite', priority: 0.3, changefreq: 'yearly' },
	{ path: '/legal/cgu', priority: 0.3, changefreq: 'yearly' }
];

export const GET: RequestHandler = ({ url }) => {
	// L'origine réelle de la requête : évite de coder en dur un domaine qui
	// changerait (chiph.re, www.chiph.re, une préproduction…).
	const origin = url.origin;
	const lastmod = new Date().toISOString().slice(0, 10);

	const entries = PAGES.map(
		({ path, priority, changefreq }) => `	<url>
		<loc>${origin}${path}</loc>
		<lastmod>${lastmod}</lastmod>
		<changefreq>${changefreq}</changefreq>
		<priority>${priority.toFixed(1)}</priority>
	</url>`
	).join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			// Un robot repasse rarement : une heure de cache suffit largement.
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
