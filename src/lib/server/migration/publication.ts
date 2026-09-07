/**
 * Décision de publication d'une question migrée.
 *
 * La publication ne peut pas se contenter d'une plage d'index : elle doit
 * respecter le verdict de relecture, et ne rien publier deux fois. Ces deux
 * règles vivaient nulle part — le script publiait tout ce qui tombait dans la
 * plage, y compris les questions écartées et celles déjà en base.
 *
 * Elles sont ici, pures et testables, plutôt que noyées dans le script.
 */
import type { ReviewStatus } from '$lib/types/migration';

/** Ce que le suivi sait d'une question au moment de publier. */
export interface DecisionDeRelecture {
	reviewStatus: ReviewStatus | string;
	/** Renseigné dès qu'un template a été créé pour cette question. */
	newTemplateId: string | null;
}

/** Pourquoi une question n'est pas publiée — pour pouvoir le dire à l'opérateur. */
export type MotifExclusion = 'jamais-relue' | 'non-approuvee' | 'deja-publiee';

/**
 * Une question est publiable si l'enseignant l'a approuvée et qu'elle n'a pas
 * déjà produit un template.
 *
 * @returns `null` si elle est publiable, sinon le motif de son exclusion.
 */
export function motifDeNonPublication(
	decision: DecisionDeRelecture | undefined
): MotifExclusion | null {
	// Aucune ligne de suivi : la question n'est jamais passée en relecture.
	if (!decision) return 'jamais-relue';

	// Déjà publiée : republier créerait un second template pour la même question.
	// Ce test passe AVANT celui du verdict, parce qu'une question publiée puis
	// re-relue ne doit pas non plus repartir en base.
	if (decision.newTemplateId) return 'deja-publiee';

	if (decision.reviewStatus !== 'approved') return 'non-approuvee';

	return null;
}
