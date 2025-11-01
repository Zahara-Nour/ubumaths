import type { PageLoad } from './$types';
import { loadMonitor } from '$lib/utils/loadTracer';

export const load: PageLoad = loadMonitor.traceClientLoad(async (event) => {
	const { user, profile } = await event.parent();

	return {
		user,
		profile
	};
});
