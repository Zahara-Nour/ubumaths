import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/middleware/auth';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(protected)/dashboard/admin/vip-cards/+page.server');

export const load: PageServerLoad = async ({ locals }) => {
	// Check admin (real admin login OR step-up elevation)
	const { supabase } = await requireAdmin(locals);

	// Fetch all VIP card templates
	const { data: templates, error: templatesError } = await supabase
		.from('vip_card_templates')
		.select('*')
		.order('rarity', { ascending: true })
		.order('sort_order', { ascending: true });

	if (templatesError) {
		logger.error('Error loading VIP card templates:', templatesError);
		throw error(500, 'Échec du chargement des cartes VIP');
	}

	// Fetch all VIP card configs
	const { data: configs, error: configsError } = await supabase
		.from('vip_card_config')
		.select('*')
		.order('is_active', { ascending: false })
		.order('created_at', { ascending: false });

	if (configsError) {
		logger.error('Error loading VIP card configs:', configsError);
		throw error(500, 'Échec du chargement des configurations');
	}

	return {
		templates: templates ?? [],
		configs: configs ?? []
	};
};
