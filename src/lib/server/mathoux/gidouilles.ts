/**
 * Gidouilles des étapes de la Chatterie — `pay_mathou_milestones`
 * ================================================================
 *
 * Décisions de David du 2026-10-24 (docs/wip/mathoux-accessoires-progress.md,
 * lot A) : naissance +3, matou +5, grand matou +10, étoile +5, une fois chacune.
 * La fonction SQL (migration 20261024210000) paie l'écart entre la mémoire
 * (`best_stage`, `starred_grades`) et ce qui a été payé (`rewarded_*`), sous
 * verrou : l'appeler deux fois, ou en même temps, ne paie jamais deux fois.
 *
 * Client SERVICE seulement (droits d'exécution retirés à tous les autres),
 * pour l'élève de la SESSION. Appelée APRÈS l'écriture de la mémoire : le
 * versement change `updated_at`, ce qui ferait rejouer le comparer-et-échanger
 * de `rememberMathoux` s'il passait avant.
 *
 * Une panne est journalisée et ne casse rien : ce qui n'a pas été payé le sera
 * au calcul suivant (la mémoire reste « non payée »).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/mathoux/gidouilles');

/** Nom affiché des Mathoux, par notion : le libellé du journal (« Naissance de Tangentin »). */
export type MathouNames = Record<string, string>;

/**
 * Verse les étapes pas encore payées de `studentId`.
 *
 * @param service client SERVICE.
 * @param studentId l'élève de la SESSION (jamais une entrée client).
 * @returns les gidouilles versées par CET appel (0 s'il n'y avait rien à payer,
 *   ou en cas de panne, journalisée).
 */
export async function payMathouMilestones(
	service: SupabaseClient<Database>,
	studentId: string,
	names: MathouNames
): Promise<number> {
	const { data, error } = await service.rpc('pay_mathou_milestones', {
		p_student_id: studentId,
		p_names: names
	});
	if (error) {
		logger.error(`[mathoux] gidouilles des étapes non versées :`, error);
		return 0;
	}
	return (data ?? []).reduce((sum, payment) => sum + payment.delta, 0);
}
