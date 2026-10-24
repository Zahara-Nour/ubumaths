/**
 * Nouveautés de la Chatterie, demandées en fin de séance
 * ======================================================
 *
 * Appelé APRÈS l'enregistrement de la séance (Entraînement, Course, révision) :
 * l'acquisition des points est alors à jour, et le calcul de la collection
 * (`GET /api/student/mathoux`) écrit en mémoire ce qui est nouveau et le rend.
 * Jamais après une évaluation : la nouveauté reste pour la bulle du Palotin.
 *
 * Ne lève jamais : compte non élève (403), panne ou réponse inattendue → `null`,
 * les résultats de la séance restent affichés tels quels.
 */

import { mathouxSummarySchema } from '$lib/mathoux/summary';
import { hasNews, type MathouNews } from '$lib/mathoux/news';

/** Les nouveautés de ce calcul, ou `null` s'il n'y a rien à annoncer. */
export async function fetchMathouNews(): Promise<MathouNews | null> {
	try {
		const response = await fetch('/api/student/mathoux');
		if (!response.ok) return null;
		const parsed = mathouxSummarySchema.safeParse(await response.json());
		if (!parsed.success) return null;
		const { news } = parsed.data;
		return hasNews(news) ? news : null;
	} catch (error) {
		console.error('Nouveautés de la Chatterie illisibles :', error);
		return null;
	}
}
