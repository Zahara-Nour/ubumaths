/**
 * Révisions d'une séance de série → FSRS, traces, paquet Programme
 * =================================================================
 *
 * Chemin commun à `/api/tests/save` (verdict du navigateur : Entraînement libre,
 * Course libre, flash-cards, ADR 0001) et à l'envoi d'une évaluation (verdict du
 * SERVEUR, Q39, ADR 0015). Extrait tel quel de `/api/tests/save`.
 *
 * - FSRS AVANT la trace, par réponse : pas de FSRS, pas d'attempt (invariant de
 *   `/api/skill-attempts`). Une carte qui échoue n'empêche pas les autres.
 * - Auto-évaluation (flash-cards, carte de cours) : la fiche ne garde que le
 *   MEILLEUR résultat du jour (ADR 0016), trace `student_self`. Réponse corrigée
 *   par l'application (Entraînement, Course, évaluation) : révision ordinaire,
 *   trace `auto`.
 * - Modèle tagué à un point de programme → ajouté au paquet Programme, sauf
 *   question de cours ou brouillon (`entersProgrammeDeck`, Q113) et les modèles
 *   de `neverInDeck` (cartes de cours lues par le serveur, décision 2026-09-28).
 *
 * Non bloquant : la séance est déjà enregistrée ; les échecs se journalisent.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { FSRS } from '$lib/srs/fsrs';
import { Grade } from '$lib/srs/types';
import { applyFsrsReview } from '$lib/server/srs/fsrs-actions';
import { ensureProgrammeDeckCard } from '$lib/server/srs/programme-deck';
import { entersProgrammeDeck } from '$lib/server/srs/programme-deck-rule';

// Types
export interface SeriesReview {
	templateId: string;
	success: boolean;
	/** Auto-évaluation de l'élève (flash-cards, carte de cours) */
	selfAssessed: boolean;
}

// Functions
export async function recordSeriesReviews(
	supabase: SupabaseClient<Database>,
	userId: string,
	reviews: readonly SeriesReview[],
	options: { neverInDeck?: ReadonlySet<string>; logLabel?: string } = {}
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
			console.error(`${label} question_template_points illisible :`, linksError);
		} else {
			for (const link of links ?? []) {
				if (entersProgrammeDeck(link.question_templates)) taggedTemplates.add(link.template_id);
			}
		}
	}

	const now = new Date();
	const fsrs = new FSRS();
	const attemptsToInsert: {
		student_id: string;
		template_id: string;
		success: boolean;
		grade: Grade;
		source: 'auto' | 'student_self';
		with_help: boolean;
	}[] = [];

	for (const review of reviews) {
		const grade: Grade = review.success ? Grade.GOOD : Grade.AGAIN;

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
			console.error(`${label} FSRS update failed, attempt non inséré :`, {
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
			with_help: false
		});
	}

	if (attemptsToInsert.length > 0) {
		// `.select()` : vérifie que toutes les lignes ont été écrites
		const { data: attemptsRows, error: attemptsError } = await supabase
			.from('skill_attempts')
			.insert(attemptsToInsert)
			.select('id');

		if (attemptsError) {
			console.error(`${label} skill_attempts INSERT failed:`, attemptsError);
		} else if ((attemptsRows?.length ?? 0) !== attemptsToInsert.length) {
			console.error(`${label} skill_attempts : lignes écrites ≠ lignes envoyées`, {
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
			console.error(`${label} Programme deck add failed:`, progErr);
		}
	}
}
