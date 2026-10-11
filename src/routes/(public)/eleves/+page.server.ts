import { toPataphysicalDate } from '$lib/almanach/calendar';
import { ambianceMonthIndex } from '$lib/almanach/palettes';
import type { PageServerLoad } from './$types';

// Jamais prérendue : l'ambiance de Père Ubu suit le mois du jour de la requête
export const prerender = false;

export const load: PageServerLoad = () => ({
	ambianceMonth: ambianceMonthIndex(toPataphysicalDate(new Date()))
});
