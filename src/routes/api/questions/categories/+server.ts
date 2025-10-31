/**
 * Question Categories API
 * ========================
 *
 * GET /api/questions/categories - Get distinct categories from existing questions
 *
 * Returns:
 * {
 *   themes: string[],
 *   domains: string[],
 *   subdomains: string[]
 * }
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';

export const GET: RequestHandler = async ({ locals }) => {
	await requireRole(locals, 'teacher');
	const supabase = locals.supabase;

	try {
		// Fetch all templates to extract unique categories
		const { data: templates, error: queryError } = await supabase
			.from('question_templates')
			.select('theme, domain, subdomain');

		if (queryError) {
			console.error('Error fetching templates:', queryError);
			throw error(500, 'Failed to fetch templates');
		}

		// Extract unique values for each category
		const themesSet = new Set<string>();
		const domainsSet = new Set<string>();
		const subdomainsSet = new Set<string>();

		templates?.forEach((template) => {
			if (template.theme) themesSet.add(template.theme);
			if (template.domain) domainsSet.add(template.domain);
			if (template.subdomain) subdomainsSet.add(template.subdomain);
		});

		// Convert sets to sorted arrays
		const themes = Array.from(themesSet).sort();
		const domains = Array.from(domainsSet).sort();
		const subdomains = Array.from(subdomainsSet).sort();

		return json({
			themes,
			domains,
			subdomains
		});
	} catch (err) {
		console.error('Error in GET /api/questions/categories:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Internal server error');
	}
};
