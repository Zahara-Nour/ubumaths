import type { PageLoad } from './$types';
import { loadMonitor } from '$lib/utils/loadTracer';

export const load: PageLoad = loadMonitor.traceClientLoad(async (event) => {
	const { parent } = event;

	const { user, profile } = await parent();
	return { user, profile };
});
