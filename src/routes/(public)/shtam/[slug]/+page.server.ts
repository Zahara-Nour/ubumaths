import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { SLUG_PATTERN, allArticles, findPublishedArticle } from '$lib/server/shtam/articles';
import { toArticleView, todayIsoInParis } from '$lib/server/shtam/present';
import type { PageServerLoad } from './$types';

// Jamais prérendue : un article daté de demain doit rester introuvable jusqu'à demain.
export const prerender = false;

const slugSchema = z.string().max(120).regex(SLUG_PATTERN);

export const load: PageServerLoad = ({ params }) => {
	const slug = slugSchema.safeParse(params.slug);
	// Brouillon, article futur et slug inconnu : même 404, rien ne trahit leur existence
	const article = slug.success
		? findPublishedArticle(allArticles(), slug.data, todayIsoInParis())
		: null;
	if (!article) throw error(404, 'Cet article du Shtam n’existe pas (ou pas encore).');
	return { article: toArticleView(article) };
};
