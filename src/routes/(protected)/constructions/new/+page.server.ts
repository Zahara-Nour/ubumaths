import type { PageServerLoad } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { CONSTRUCTION_AUTHOR_ROLES } from '$lib/server/constructions-access';

export const load: PageServerLoad = async ({ locals }) => {
	await requireRoles(locals, CONSTRUCTION_AUTHOR_ROLES);
	return {};
};
