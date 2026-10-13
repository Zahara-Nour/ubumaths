import { formatMedium, toPataphysicalDate } from '$lib/almanach/calendar';
import { ambianceMonthIndex } from '$lib/almanach/palettes';
import { allArticles, pickRandomArticle, publishedArticles } from '$lib/server/shtam/articles';
import { toSummary, todayIsoInParis } from '$lib/server/shtam/present';
import type { PageServerLoad } from './$types';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(public)/royaume/+page.server');

// Types

/** La dépêche du jour : de quoi donner envie de lire, pas l'article */
export interface TourDispatch {
	slug: string;
	title: string;
	lede: string;
	byline: string;
}

// Constantes

// Jamais prérendue : la date et l'ambiance suivent le jour de la requête (Paris),
// pas celui du build ; la dépêche du Shtam est tirée à chaque visite.
export const prerender = false;

// Functions

export const load: PageServerLoad = () => {
	const now = new Date();
	const today = toPataphysicalDate(now);
	return {
		ambianceMonth: ambianceMonthIndex(today),
		almanachDate: formatMedium(today),
		shtam: pickDispatch(now)
	};
};

/** Décoratif : un article du Shtam mal formé ne doit jamais faire tomber la visite */
function pickDispatch(now: Date): TourDispatch | null {
	try {
		const article = pickRandomArticle(publishedArticles(allArticles(), todayIsoInParis(now)));
		if (!article) return null;
		const { slug, title, lede, byline } = toSummary(article);
		return { slug, title, lede, byline };
	} catch (err) {
		logger.error('[royaume] Shtam illisible, dépêche masquée :', err);
		return null;
	}
}
