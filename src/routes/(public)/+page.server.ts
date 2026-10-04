import { toPataphysicalDate } from '$lib/almanach/calendar';
import type { PageServerLoad } from './$types';

// Jamais prérendue : la date pataphysique doit être celle du jour de la requête,
// pas celle du build.
export const prerender = false;

export const load: PageServerLoad = () => {
	return { almanach: toPataphysicalDate(new Date()) };
};
