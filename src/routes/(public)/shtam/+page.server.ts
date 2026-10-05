import { allArticles, publishedArticles } from '$lib/server/shtam/articles';
import { toSummary, todayIsoInParis } from '$lib/server/shtam/present';
import type { PageServerLoad } from './$types';

// Jamais prérendue : un article daté de demain doit paraître demain, pas au prochain build.
export const prerender = false;

export const load: PageServerLoad = () => {
	return { articles: publishedArticles(allArticles(), todayIsoInParis()).map(toSummary) };
};
