/**
 * Révisions d'une séance de série → FSRS, traces, paquet Programme
 * =================================================================
 *
 * Chemin de l'envoi d'une évaluation (verdict du SERVEUR, Q39, ADR 0015).
 * Extrait de l'ancien `/api/tests/save`, qui ne l'appelle plus : depuis le
 * chantier `formes-de-serie` (PR 4), une série libre envoie une trace par
 * question à `/api/skill-attempts` (ADR 0038).
 *
 * - FSRS AVANT la trace, par réponse : pas de FSRS, pas d'attempt (invariant de
 *   `/api/skill-attempts`). Une carte qui échoue n'empêche pas les autres.
 * - Auto-évaluation (flash-cards, carte de cours) : la fiche ne garde que le
 *   MEILLEUR résultat du jour (ADR 0016), trace `student_self`. Réponse corrigée
 *   par l'application (évaluation) : révision ordinaire,
 *   trace `auto`.
 * - Modèle tagué à un point de programme → ajouté au paquet Programme, sauf
 *   question de cours ou brouillon (`entersProgrammeDeck`, Q113) et les modèles
 *   de `neverInDeck` (cartes de cours lues par le serveur, décision 2026-09-28).
 *
 * - Question posée en QCM depuis ses erreurs prévues (idée 4 du chantier
 *   `idees-format`) : réussite = demi-réussite (« Difficile »), trace « en QCM ».
 * - Traces d'un contrôle (PR 4 bis) : colonnes du lieu `evaluation` (durées,
 *   fin) portées par chaque révision, écrites au client `attemptsClient`
 *   (service : la policy élève refuse ce lieu). FSRS et paquet restent au
 *   client passé en premier.
 *
 * Non bloquant : la séance est déjà enregistrée ; les échecs se journalisent.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import { FSRS } from '#lib/srs/fsrs.ts';
import type { Grade } from '#lib/srs/types.ts';
import { answerGrade } from '#lib/server/srs/answer-grade.ts';
import { applyFsrsReview } from '#lib/server/srs/fsrs-actions.ts';
import { ensureProgrammeDeckCard } from '#lib/server/srs/programme-deck.ts';
import { entersProgrammeDeck } from '#lib/server/srs/programme-deck-rule.ts';
import type { EvaluationTraceColumns } from '#lib/server/evaluation-trace.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('server/srs/record-series-reviews');

// Types
export interface SeriesReview {
	templateId: string;
	success: boolean;
	/** Auto-évaluation de l'élève (flash-cards, carte de cours) */
	selfAssessed: boolean;
	/** Colonnes de trace d'une question de contrôle (lieu, durées, fin) */
	trace?: EvaluationTraceColumns;
	/** Posée en QCM depuis ses erreurs prévues (idée 4) : demi-réussite, trace « en QCM » */
	answeredAsChoice?: boolean;
}

// Functions
export async function recordSeriesReviews(
	supabase: SupabaseClient<Database>,
	userId: string,
	reviews: readonly SeriesReview[],
	options: {
		neverInDeck?: ReadonlySet<string>;
		logLabel?: string;
		/** Client qui écrit les traces (défaut : `supabase`) ; service pour un contrôle */
		attemptsClient?: SupabaseClient<Database>;
	} = {}
): Promise<void> {
	const label = options.logLabel ?? '[series-reviews]';
	const templateIds = [...new Set(reviews.map((review) => review.templateId))];

	// Quels modèles tagués à un point de programme peuvent entrer dans le paquet ?
	// Une requête pour le lot : le modèle (options, statut) vient avec le lien.
	// Règle partagée (Q113) : ni question de cours, ni brouillon (caché par la RLS).
	const taggedTemplates = new Set<string>();
	if (templateIds.length > 0) {
		const { data: links, error: linksError } = await supabase
			.from('question_template_points')
			.select('template_id, question_templates(options, status)')
			.in('template_id', templateIds);

		if (linksError) {
			logger.error(`${label} question_template_points illisible :`, linksError);
		} else {
			for (const link of links ?? []) {
				if (entersProgrammeDeck(link.question_templates)) taggedTemplates.add(link.template_id);
			}
		}
	}

	const now = new Date();
	const fsrs = new FSRS();
	const attemptsToInsert: Array<
		{
			student_id: string;
			template_id: string;
			success: boolean;
			grade: Grade;
			source: 'auto' | 'student_self';
			with_help: boolean;
			answered_as_choice: boolean;
		} & Partial<EvaluationTraceColumns>
	> = [];

	for (const review of reviews) {
		const answeredAsChoice = review.answeredAsChoice === true;
		const grade: Grade = answerGrade(review.success, answeredAsChoice);

		try {
			if (review.selfAssessed) {
				await applyFsrsReview(
					supabase,
					fsrs,
					userId,
					'template',
					review.templateId,
					grade,
					undefined,
					{ bestOfDay: { now }, verifyWrite: true }
				);
			} else {
				await applyFsrsReview(supabase, fsrs, userId, 'template', review.templateId, grade);
			}
		} catch (fsrsErr) {
			logger.error(`${label} FSRS update failed, attempt non inséré :`, {
				userId,
				templateId: review.templateId,
				grade,
				err: fsrsErr
			});
			continue;
		}

		attemptsToInsert.push({
			student_id: userId,
			template_id: review.templateId,
			success: review.success,
			grade,
			source: review.selfAssessed ? 'student_self' : 'auto',
			with_help: false,
			answered_as_choice: answeredAsChoice,
			...review.trace
		});
	}

	if (attemptsToInsert.length > 0) {
		// `.select()` : vérifie que toutes les lignes ont été écrites
		const { data: attemptsRows, error: attemptsError } = await (options.attemptsClient ?? supabase)
			.from('skill_attempts')
			.insert(attemptsToInsert)
			.select('id');

		if (attemptsError) {
			logger.error(`${label} skill_attempts INSERT failed:`, attemptsError);
		} else if ((attemptsRows?.length ?? 0) !== attemptsToInsert.length) {
			logger.error(`${label} skill_attempts : lignes écrites ≠ lignes envoyées`, {
				sent: attemptsToInsert.length,
				written: attemptsRows?.length ?? 0
			});
		}
	}

	for (const templateId of taggedTemplates) {
		if (options.neverInDeck?.has(templateId)) continue;
		try {
			await ensureProgrammeDeckCard(supabase, userId, templateId);
		} catch (progErr) {
			logger.error(`${label} Programme deck add failed:`, progErr);
		}
	}
}
