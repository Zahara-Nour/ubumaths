import { toPataphysicalDate } from '$lib/almanach/calendar';
import { ambianceMonthIndex } from '$lib/almanach/palettes';
import { allArticles, pickRandomArticle, publishedArticles } from '$lib/server/shtam/articles';
import { todayIsoInParis } from '$lib/server/shtam/present';
import type { PageServerLoad } from './$types';

// Jamais prérendue : l'ambiance suit le mois pataphysique du jour de la requête,
// pas celui du build ; l'article du Shtam est tiré à chaque visite.
export const prerender = false;

export const load: PageServerLoad = () => {
	const now = new Date();
	// Seule l'ambiance du mois est envoyée : la date elle-même vit dans l'en-tête du tableau de bord
	return { ambianceMonth: ambianceMonthIndex(toPataphysicalDate(now)), shtam: pickShtamLink(now) };
};

/** Lien décoratif : un article du Shtam mal formé ne doit jamais faire tomber l'accueil */
function pickShtamLink(now: Date): { slug: string; title: string } | null {
	try {
		const article = pickRandomArticle(publishedArticles(allArticles(), todayIsoInParis(now)));
		return article ? { slug: article.slug, title: article.title } : null;
	} catch (err) {
		console.error('[accueil] Shtam illisible, lien masqué :', err);
		return null;
	}
}
