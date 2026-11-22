/**
 * Enregistrer la réponse d'un élève à une question (per-template)
 * ===============================================================
 *
 * Cœur commun de `POST /api/skill-attempts` (séries libres) et des réponses en
 * combat de la Descente de la Vistule : une réponse en combat compte comme une
 * réponse faite ailleurs dans Chiphre (décision 5a, docs/wip/navadra-progress.md).
 *
 * Effets, dans l'ordre :
 *   1. modèle lu aux droits du SERVEUR (un modèle repassé en brouillon pendant la
 *      série garde sa trace, décision de David du 2026-09-28) ;
 *   2. fiche FSRS mise à jour (fail-loud : sans elle, pas de trace) ;
 *   3. une ligne `skill_attempts` ; le trigger recalcule ensuite le suivi des
 *      points du programme liés au modèle ;
 *   4. modèle tagué : ajouté au deck Programme (non bloquant).
 *
 * `insertClient` : le client qui écrit la trace. Par défaut celui de l'élève (la
 * policy élève admet les lieux des séries libres) ; le client SERVICE pour un
 * lieu que l'élève ne peut pas écrire (`descente`), après vérification par
 * l'appelant que `studentId` est l'élève de la session.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import { FSRS } from '#lib/srs/fsrs.ts';
import type { Grade } from '#lib/srs/types.ts';
import { answerGrade } from '#lib/server/srs/answer-grade.ts';
import { ensureProgrammeDeckCard } from '#lib/server/srs/programme-deck.ts';
import { entersProgrammeDeck } from '#lib/server/srs/programme-deck-rule.ts';
import { applyFsrsReview } from '#lib/server/srs/fsrs-actions.ts';
import { attemptSourceForTemplate } from '#lib/server/course-card-attempts.ts';
import { createServiceRoleClient } from '#lib/server/serviceRoleClient.ts';
import type { PhaseBlocage } from '#lib/types/skills.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

// Types
type SB = SupabaseClient<Database>;

/** Lieux d'une trace écrite par cette voie (ADR 0038). */
export type RecordedAttemptPlace =
	'flash_cards' | 'typing' | 'mock_test' | 'number_race' | 'descente';

export interface AttemptInput {
	studentId: string;
	templateId: string;
	success: boolean;
	/** Coup de pouce ouvert (idée 5) : demi-réussite pour FSRS, trace « avec indice » */
	withHelp: boolean;
	phaseBlocage?: PhaseBlocage;
	place: RecordedAttemptPlace;
	seed?: number;
	responseMs?: number;
	allottedMs?: number;
	endReason?: 'validated' | 'timeout';
	answerParts: string[] | null;
	partVerdicts: boolean[] | null;
	/** Posée en QCM depuis ses erreurs prévues (idée 4) : demi-réussite pour FSRS */
	answeredAsChoice?: boolean;
}

export type AttemptFailure =
	'template_check_failed' | 'template_not_found' | 'fsrs_update_failed' | 'insert_failed';

export type AttemptResult =
	{ ok: true; pointIds: string[] } | { ok: false; reason: AttemptFailure };

// Constantes
const logger = createServerLogger('server/skill-attempts/record-attempt');

// Functions
/**
 * Enregistre la réponse. `studentClient` : client de l'élève (FSRS, deck
 * Programme) ; `insertClient` : client qui écrit la trace (voir l'en-tête).
 */
export async function recordStudentAttempt(
	studentClient: SB,
	input: AttemptInput,
	insertClient: SB = studentClient
): Promise<AttemptResult> {
	const { studentId, templateId, success } = input;

	// 1. Modèle et points tagués, en un aller-retour, aux droits du serveur
	const { data: templateRow, error: templateError } = await createServiceRoleClient()
		.from('question_templates')
		.select('id, options, status, question_template_points(point_id)')
		.eq('id', templateId)
		.maybeSingle();

	if (templateError) {
		logger.error('[skill-attempts] Failed to verify template:', templateError);
		return { ok: false, reason: 'template_check_failed' };
	}
	if (!templateRow) return { ok: false, reason: 'template_not_found' };

	type LinkRow = { point_id: string };
	const links = (templateRow.question_template_points ?? []) as unknown as LinkRow[];
	const pointIds = links.map((l) => l.point_id);

	// 2. FSRS AVANT la trace (fail-loud) : sinon désynchro durable fiche ↔ suivi.
	// Auto-évaluation (« déclaré ») : carte de cours (#617) ou Flash-cards (ADR 0038),
	// fiche au MEILLEUR résultat du jour (décision de David, 2026-09-30).
	const selfAssessed =
		input.place === 'flash_cards' || attemptSourceForTemplate(templateRow) === 'student_self';
	// Réussi → Good, raté → Again (spec §1.1) ; réussi en QCM (idée 4) ou après un
	// coup de pouce (idée 5) → Hard.
	// Jamais « en QCM » pour une auto-évaluation (carte de cours) : la base le
	// refuse (source `student_self`), et FSRS serait écrit avant une trace refusée.
	const answeredAsChoice = input.answeredAsChoice === true && !selfAssessed;
	const grade: Grade = answerGrade(success, answeredAsChoice || input.withHelp);
	try {
		if (selfAssessed) {
			await applyFsrsReview(
				studentClient,
				new FSRS(),
				studentId,
				'template',
				templateId,
				grade,
				undefined,
				{ bestOfDay: { now: new Date() }, verifyWrite: true }
			);
		} else {
			await applyFsrsReview(studentClient, new FSRS(), studentId, 'template', templateId, grade);
		}
	} catch (fsrsErr) {
		logger.error('[skill-attempts] FSRS update failed (fail-loud):', {
			userId: studentId,
			templateId,
			grade,
			err: fsrsErr
		});
		return { ok: false, reason: 'fsrs_update_failed' };
	}

	// 3. La trace. `.select()` : un INSERT refusé lève (42501), mais on vérifie
	// quand même qu'une ligne a été écrite.
	const { data: insertedRows, error: insertError } = await insertClient
		.from('skill_attempts')
		.insert({
			student_id: studentId,
			template_id: templateId,
			success,
			grade,
			with_help: input.withHelp,
			source: selfAssessed ? 'student_self' : 'auto',
			...(input.phaseBlocage !== undefined ? { phase_blocage: input.phaseBlocage } : {}),
			// Contenu d'une trace (ADR 0038) : absent → NULL ; aucune case → NULL
			place: input.place,
			seed: input.seed ?? null,
			response_ms: input.responseMs ?? null,
			allotted_ms: input.allottedMs ?? null,
			end_reason: input.endReason ?? null,
			answer_parts: input.answerParts,
			part_verdicts: input.partVerdicts,
			answered_as_choice: answeredAsChoice
		})
		.select('id');

	if (insertError) {
		// Code et message seulement : `details` d'une violation de CHECK contient la
		// ligne entière, réponse tapée par l'élève comprise (texte libre de mineur)
		logger.error('[skill-attempts] INSERT failed:', {
			code: insertError.code,
			message: insertError.message
		});
		return { ok: false, reason: 'insert_failed' };
	}
	if (!insertedRows || insertedRows.length !== 1) {
		logger.error('[skill-attempts] INSERT sans ligne écrite', {
			userId: studentId,
			templateId,
			written: insertedRows?.length ?? 0
		});
		return { ok: false, reason: 'insert_failed' };
	}

	// 4. Deck Programme (Q113) : jamais une question de cours, ni un brouillon
	if (pointIds.length > 0 && entersProgrammeDeck(templateRow)) {
		try {
			await ensureProgrammeDeckCard(studentClient, studentId, templateId);
		} catch (progErr) {
			logger.error('[skill-attempts] Programme deck add failed:', progErr);
			// Non bloquant : la trace est déjà enregistrée.
		}
	}

	return { ok: true, pointIds };
}
