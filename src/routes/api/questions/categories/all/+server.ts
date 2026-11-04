/**
 * Question Categories API - Get All Categories
 * =============================================
 *
 * GET /api/questions/categories/all - Get all published question categories
 *
 * Returns an array of categories (theme, domain, subdomain, level) for
 * client-side caching and duplicate detection.
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { createServerLogger } from '$lib/utils/logger';
import { readAllRows } from '$lib/server/read-all-rows';

const logger = createServerLogger('api/questions/categories/all/+server');

/**
 * GET /api/questions/categories/all
 *
 * Fetch all unique categories from published question templates.
 * Used for client-side caching to avoid repeated API calls.
 *
 * Returns: { categories: QuestionCategory[] }
 */
export const GET: RequestHandler = async ({ locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);
	const supabase = locals.supabase;

	try {
		// Tous les modèles publiés (id compris, pour l'exclusion), page par page :
		// PostgREST tronque à 1000 lignes. `id` départage pour une pagination stable.
		let templates;
		try {
			templates = await readAllRows(
				(from, to) =>
					supabase
						.from('question_templates')
						.select('id, theme, domain, subdomain, level')
						.eq('status', 'published')
						.order('theme')
						.order('domain')
						.order('subdomain')
						.order('level')
						.order('id')
						.range(from, to),
				'des catégories'
			);
		} catch (queryError) {
			logger.error('Error fetching categories:', queryError);
			throw error(500, 'Failed to fetch categories');
		}

		// Map to include templateId for client-side exclusion during updates
		const categories = templates.map((t) => ({
			templateId: t.id,
			theme: t.theme,
			domain: t.domain,
			subdomain: t.subdomain,
			level: t.level
		}));

		// Return categories (duplicates are already unique by DB constraint)
		return json({
			categories
		});
	} catch (err) {
		logger.error('Error in GET /api/questions/categories/all:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Internal server error');
	}
};
