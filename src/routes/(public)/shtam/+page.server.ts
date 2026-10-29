import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { allArticles, publishedArticles } from '$lib/server/shtam/articles';
import {
	ARTICLES_PER_PAGE,
	UNE_TEASERS,
	pageCountFor,
	pageOfArticle,
	toArticleView,
	toEdition,
	toFrontArticle,
	toSummary,
	todayIsoInParis
} from '$lib/server/shtam/present';
import type { PageServerLoad } from './$types';

// Jamais prérendue : un article daté de demain doit paraître demain, pas au prochain build.
export const prerender = false;

// Page 1 = la une ; les suivantes portent les articles en entier
const pageSchema = z.coerce.number().int().min(1).max(10_000);

export const load: PageServerLoad = ({ url }) => {
	const raw = url.searchParams.get('page');
	const parsed = raw === null ? { success: true as const, data: 1 } : pageSchema.safeParse(raw);
	const today = todayIsoInParis();
	const articles = publishedArticles(allArticles(), today);
	const pageCount = pageCountFor(articles.length);
	if (!parsed.success || parsed.data > pageCount) {
		throw error(404, 'Cette page du Shtam n’existe pas (ou pas encore).');
	}
	const page = parsed.data;
	const edition = toEdition(today, articles.length);

	if (page === 1) {
		const [first, ...others] = articles;
		return {
			kind: 'une' as const,
			edition,
			page,
			pageCount,
			une: first ? { ...toFrontArticle(first), page: pageOfArticle(0) } : null,
			teasers: others
				.slice(0, UNE_TEASERS)
				.map((a, i) => ({ ...toSummary(a), page: pageOfArticle(i + 1) }))
		};
	}

	const start = (page - 2) * ARTICLES_PER_PAGE;
	return {
		kind: 'interieur' as const,
		edition,
		page,
		pageCount,
		articles: articles.slice(start, start + ARTICLES_PER_PAGE).map(toArticleView)
	};
};
