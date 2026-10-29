/**
 * sitemap.xml — plan du site pour les moteurs de recherche
 *
 * Généré plutôt que statique : les URL restent synchronisées avec les routes
 * sans qu'on ait à penser à un fichier séparé. La liste des pages fixes vit dans
 * `$lib/seo/sitemap-pages` — SvelteKit n'autorise ici que les exports de
 * méthodes HTTP, et l'y déclarer casse le build.
 *
 * Les URL partent du domaine canonique (`SITE_URL`), même servies depuis une
 * préproduction. Seuls les articles du Shtam (date de parution) et les exercices
 * (date de dernière modification) portent un `lastmod` : dater les pages fixes
 * du jour de la requête apprend à Google à ignorer ce signal.
 *
 * Glossaire : une page par terme visible (`/glossaire/<slug>`), datée de la dernière
 * modification de l'entrée ; les renvois nus, qui redirigent, n'y sont pas.
 *
 * Exercices : seuls ceux que leur auteur a cochés « Afficher sur Google »
 * (`is_public AND search_indexed`), lus avec un client ANONYME. Une panne de la
 * base sert le plan sans eux, jamais une 500.
 *
 * Son absence produisait un 404 à chaque passage de robot, qui alimentait le
 * bruit du monitoring de production.
 *
 * @module routes/sitemap.xml
 */
import { SITEMAP_PAGES } from '$lib/seo/sitemap-pages';
import { absoluteUrl } from '$lib/seo/site';
import { allArticles, publishedArticles } from '$lib/server/shtam/articles';
import { todayIsoInParis } from '$lib/server/shtam/present';
import { createAnonymousSupabase } from '$lib/server/anonymous-supabase';
import { fetchIndexedExercises } from '$lib/server/sitemap-exercises';
import { fetchGlossaryPages } from '$lib/server/sitemap-glossary';
import type { RequestHandler } from './$types';

interface Entry {
	path: string;
	priority: number;
	changefreq: string;
	lastmod?: string;
}

function toXml({ path, priority, changefreq, lastmod }: Entry): string {
	return `	<url>
		<loc>${absoluteUrl(path)}</loc>${lastmod ? `\n\t\t<lastmod>${lastmod}</lastmod>` : ''}
		<changefreq>${changefreq}</changefreq>
		<priority>${priority.toFixed(1)}</priority>
	</url>`;
}

export const GET: RequestHandler = async () => {
	// Articles parus seulement : un brouillon ou un article daté de demain reste secret
	const articles: Entry[] = publishedArticles(allArticles(), todayIsoInParis()).map((a) => ({
		path: `/shtam/${a.slug}`,
		priority: 0.6,
		changefreq: 'yearly',
		lastmod: a.date
	}));

	// Exercices cochés « Afficher sur Google » ; liste vide en cas de panne
	const exercises: Entry[] = (await fetchIndexedExercises(createAnonymousSupabase())).map((e) => ({
		path: e.path,
		priority: 0.5,
		changefreq: 'monthly',
		lastmod: e.lastmod
	}));

	// Termes du glossaire ; liste vide en cas de panne
	const glossary: Entry[] = (await fetchGlossaryPages(createAnonymousSupabase())).map((g) => ({
		path: g.path,
		priority: 0.5,
		changefreq: 'monthly',
		lastmod: g.lastmod
	}));

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...SITEMAP_PAGES, ...articles, ...glossary, ...exercises].map(toXml).join('\n')}
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
