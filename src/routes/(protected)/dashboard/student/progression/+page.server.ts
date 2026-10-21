/**
 * Ma progression — page élève à deux onglets
 * ==========================================
 *
 * Fusionne les deux anciennes pages « Mes objectifs » et « Mes compétences
 * math », qui vivaient côte à côte sans que rien ne dise ce qui les
 * distinguait. Les deux axes restent distincts — ce sont deux onglets, pas un
 * mélange :
 *   · « Ce que je sais faire »        → programme de son niveau, par branche > notion
 *   · « Ma façon de faire des maths » → les 6 compétences transversales du socle
 *
 * Les deux jeux de chiffres viennent de `$lib/server/progression`, la même
 * source que la tuile du dashboard : c'est ce qui les empêche de diverger.
 *
 * Spec : docs/archive/wip/progression-eleve-progress.md §D
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import {
	getNotionsProgression,
	getCompetencesProgression
} from '$lib/server/progression/student-progression';

/**
 * Onglets adressables par `?onglet=` — les anciennes URL redirigent dessus.
 * « objectifs » nomme l'onglet du programme, même depuis le passage aux notions :
 * c'est l'adresse des favoris et des redirections.
 */
export type ProgressionTab = 'objectifs' | 'competences';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user, profile } = await requireRole(locals, 'student');

	const [notions, competences] = await Promise.all([
		getNotionsProgression(locals.supabase, user.id, profile.grade),
		getCompetencesProgression(locals.supabase, user.id)
	]);

	// Onglet demandé explicitement (lien profond, redirection d'une ancienne URL).
	const requested = url.searchParams.get('onglet');
	const requestedTab: ProgressionTab | null =
		requested === 'objectifs' || requested === 'competences' ? requested : null;

	// Sinon : le programme par défaut — c'est l'axe que l'élève peut consulter
	// même sans aucune acquisition, puisqu'il y lit le programme de son année.
	// On ne bascule sur les compétences que si le programme n'a RIEN à montrer
	// (élève sans niveau) alors que les compétences, si.
	const defaultTab: ProgressionTab =
		!notions.hasProgramme && competences.stats.with_data > 0 ? 'competences' : 'objectifs';

	return {
		notions,
		competences,
		activeTab: requestedTab ?? defaultTab
	};
};
