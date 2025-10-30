/**
 * API Endpoint: /api/messages/templates/stats
 *
 * Get template usage statistics
 *
 * GET - Get overall stats or specific template stats
 * Query params:
 *   - template_id: Get stats for specific template
 *   - period: 'week', 'month', 'year', 'all' (default: 'month')
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { templateStatsQuerySchema } from '$lib/server/validation/message-templates';

export const GET: RequestHandler = async ({ locals, url }) => {
	const { supabase, user } = locals;

	if (!user) {
		return error(401, 'Non authentifié');
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || (profile.role !== 'admin' && profile.role !== 'teacher')) {
		return error(403, 'Permissions insuffisantes');
	}

	// ✅ SECURITY: Validate query parameters with Zod
	const validation = templateStatsQuerySchema.safeParse({
		template_id: url.searchParams.get('template_id'),
		period: url.searchParams.get('period')
	});
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { template_id: templateId, period } = validation.data;

	// Calculate date filter
	const now = new Date();
	let dateFilter: Date | null = null;

	switch (period) {
		case 'week':
			dateFilter = new Date(now.setDate(now.getDate() - 7));
			break;
		case 'month':
			dateFilter = new Date(now.setMonth(now.getMonth() - 1));
			break;
		case 'year':
			dateFilter = new Date(now.setFullYear(now.getFullYear() - 1));
			break;
		default:
			dateFilter = null;
	}

	if (templateId) {
		// Get stats for specific template
		const { data, error: statsError } = await supabase.rpc('get_template_statistics', {
			p_template_id: templateId
		});

		if (statsError) {
			console.error('Error fetching template stats:', statsError);
			return error(500, 'Erreur lors de la récupération des statistiques');
		}

		return json({ stats: data?.[0] || null });
	} else {
		// Get overall stats
		let query = supabase
			.from('template_usage_stats')
			.select('*, message_templates!inner(title, trigger_type, scope)');

		if (profile.role === 'teacher') {
			// Teachers only see stats for their templates
			query = query.or(
				`message_templates.created_by.eq.${user.id},message_templates.scope.eq.system`
			);
		}

		if (dateFilter) {
			query = query.gte('used_at', dateFilter.toISOString());
		}

		const { data: usageData, error: usageError } = await query;

		if (usageError) {
			console.error('Error fetching usage stats:', usageError);
			return error(500, 'Erreur lors de la récupération des statistiques');
		}

		// Aggregate data
		const stats = {
			total_usage: usageData?.length || 0,
			completed: usageData?.filter((u) => u.completed).length || 0,
			completion_rate:
				usageData && usageData.length > 0
					? ((usageData.filter((u) => u.completed).length / usageData.length) * 100).toFixed(2)
					: 0,
			unique_users: new Set(usageData?.map((u) => u.user_id)).size,
			by_trigger_type: {} as Record<string, number>,
			most_used_templates: [] as Array<{ template_id: string; title: string; count: number }>
		};

		// Group by trigger type
		usageData?.forEach((usage) => {
			const triggerType = usage.message_templates.trigger_type;
			stats.by_trigger_type[triggerType] = (stats.by_trigger_type[triggerType] || 0) + 1;
		});

		// Get most used templates
		const templateCounts = new Map<string, { title: string; count: number }>();
		usageData?.forEach((usage) => {
			const templateId = usage.template_id;
			const title = usage.message_templates.title;
			const current = templateCounts.get(templateId) || { title, count: 0 };
			templateCounts.set(templateId, { ...current, count: current.count + 1 });
		});

		stats.most_used_templates = Array.from(templateCounts.entries())
			.map(([template_id, { title, count }]) => ({ template_id, title, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		return json({ stats });
	}
};
