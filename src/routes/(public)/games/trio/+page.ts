import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { user, profile } = await parent();
	return { user, profile };
};
