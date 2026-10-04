import { civilDateIn, civilToPataphysical } from '$lib/almanach/calendar';
import type { PageServerLoad } from './$types';

// Jamais prérendue : la date du jour doit être celle de la requête, pas du build.
export const prerender = false;

const pad = (n: number): string => String(n).padStart(2, '0');

export const load: PageServerLoad = () => {
	const civil = civilDateIn(new Date(), 'Europe/Paris');
	return {
		almanach: civilToPataphysical(civil.year, civil.month, civil.day),
		/** Jour civil à Paris, `YYYY-MM-DD` : valeur initiale du convertisseur */
		todayIso: `${civil.year}-${pad(civil.month)}-${pad(civil.day)}`
	};
};
