import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Check teacher or admin role
	if (!locals.user || (locals.user.role !== 'teacher' && locals.user.role !== 'admin')) {
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

	// Fetch teacher's overrides
	const { data: overrides, error: overridesError } = await locals.supabase
		.from('teacher_vip_card_overrides')
		.select('*')
		.eq('teacher_id', locals.user.id);

	if (overridesError) {
		console.error('Error loading teacher overrides:', overridesError);
		throw error(500, 'Échec du chargement de vos préférences');
	}

	// Fetch active global config
	const { data: globalConfig, error: configError } = await locals.supabase
		.from('vip_card_config')
		.select('*')
		.eq('is_active', true)
		.single();

	// It's OK if no active config exists (PGRST116 = no rows returned)
	if (configError && configError.code !== 'PGRST116') {
		console.error('Error loading global config:', configError);
		throw error(500, 'Échec du chargement de la configuration globale');
	}

	return {
		templates: templates ?? [],
		overrides: overrides ?? [],
		globalConfig: globalConfig ?? null
	};
};
