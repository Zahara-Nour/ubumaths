import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Inventory is always accessible - students can view their items
	// even when the marketplace is disabled
	return {};
};
