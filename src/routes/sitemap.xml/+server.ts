/**
 * sitemap.xml — plan du site pour les moteurs de recherche
 *
 * Généré plutôt que statique : les URL restent synchronisées avec les routes
 * sans qu'on ait à penser à un fichier séparé. La liste des pages vit dans
 * `$lib/seo/sitemap-pages` — SvelteKit n'autorise ici que les exports de
 * méthodes HTTP, et l'y déclarer casse le build.
 *
 * Son absence produisait un 404 à chaque passage de robot, qui alimentait le
 * bruit du monitoring de production.
 *
 * @module routes/sitemap.xml
 */
import { SITEMAP_PAGES } from '$lib/seo/sitemap-pages';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	// L'origine réelle de la requête : évite de coder en dur un domaine qui
	// changerait (chiph.re, www.chiph.re, une préproduction…).
	const origin = url.origin;
	const lastmod = new Date().toISOString().slice(0, 10);

	const entries = SITEMAP_PAGES.map(
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
