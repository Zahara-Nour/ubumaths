import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { ShopItemTemplate } from '$lib/types/shop';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	// Check authentication and admin role
	if (!locals.profile) {
		throw error(401, 'Non authentifié');
	}

	if (locals.profile.role !== 'admin') {
		throw error(403, 'Accès réservé aux administrateurs');
	}

	try {
		// Fetch initial data in parallel
		const [itemsResponse, analyticsResponse] = await Promise.all([
			// Fetch all shop items (no pagination for admin view)
			fetch('/api/admin/shop/items?limit=100'),
			// Fetch analytics for last 30 days
			fetch('/api/admin/shop/analytics')
		]);

		if (!itemsResponse.ok) {
			console.error('Failed to fetch shop items:', await itemsResponse.text());
			throw error(500, 'Erreur lors du chargement des articles');
		}

		if (!analyticsResponse.ok) {
			console.error('Failed to fetch analytics:', await analyticsResponse.text());
			throw error(500, 'Erreur lors du chargement des statistiques');
		}

		const itemsData = await itemsResponse.json();
		const analyticsData = await analyticsResponse.json();

		return {
			items: itemsData.items as ShopItemTemplate[],
			analytics: analyticsData
		};
	} catch (err) {
		console.error('Error loading admin shop dashboard:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Erreur lors du chargement du tableau de bord');
	}
};
