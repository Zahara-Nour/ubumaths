import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { profile } = locals;

	// Check admin role
	if (!profile || profile.role !== 'admin') {
		throw redirect(303, '/dashboard');
	}

	// Fetch all VIP card templates
	const { data: templates, error: templatesError } = await locals.supabase
		.from('vip_card_templates')
		.select('*')
		.order('rarity', { ascending: true })
		.order('sort_order', { ascending: true });

	if (templatesError) {
		console.error('Error loading VIP card templates:', templatesError);
		throw error(500, 'Échec du chargement des cartes VIP');
	}

	// Fetch all VIP card configs
	const { data: configs, error: configsError } = await locals.supabase
		.from('vip_card_config')
		.select('*')
		.order('is_active', { ascending: false })
		.order('created_at', { ascending: false });

	if (configsError) {
		console.error('Error loading VIP card configs:', configsError);
		throw error(500, 'Échec du chargement des configurations');
	}

	return {
		templates: templates ?? [],
		configs: configs ?? []
	};
};
