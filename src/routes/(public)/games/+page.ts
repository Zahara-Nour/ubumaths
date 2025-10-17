import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { session, user, profile } = await parent();

	return {
		session,
		user,
		profile
	};
};
