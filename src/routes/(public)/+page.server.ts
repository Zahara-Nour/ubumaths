import { toPataphysicalDate } from '$lib/almanach/calendar';
import { allArticles, pickRandomArticle, publishedArticles } from '$lib/server/shtam/articles';
import { todayIsoInParis } from '$lib/server/shtam/present';
import type { PageServerLoad } from './$types';

// Jamais prérendue : la date pataphysique doit être celle du jour de la requête,
// pas celle du build ; l'article du Shtam est tiré à chaque visite.
export const prerender = false;

export const load: PageServerLoad = () => {
	const now = new Date();
	const article = pickRandomArticle(publishedArticles(allArticles(), todayIsoInParis(now)));
	return {
		almanach: toPataphysicalDate(now),
		shtam: article ? { slug: article.slug, title: article.title } : null
	};
};
