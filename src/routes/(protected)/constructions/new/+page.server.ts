import type { PageServerLoad } from './$types';
import { requireRoles } from '#lib/server/middleware/auth.ts';
import { CONSTRUCTION_AUTHOR_ROLES } from '#lib/server/constructions-access.ts';

export const load: PageServerLoad = async ({ locals }) => {
	await requireRoles(locals, CONSTRUCTION_AUTHOR_ROLES);
	return {};
};
