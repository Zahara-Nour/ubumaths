/**
 * Fichier de verdict de relecture (`docs/relecture/<lot>/<globalIndex>.json`)
 * ==========================================================================
 *
 * Un fichier par question relue. Il reste dans le dépôt (lisible par David)
 * jusqu'à son feu vert ; `scripts/record-review.ts` le reporte alors en base.
 *
 * Verdicts :
 * - `approved`  : approuvée telle que transformée (le template porte les specs) ;
 * - `corrected` : corrigée puis approuvée (`editNotes` dit quoi et pourquoi) ;
 * - `rejected`  : rejetée (`reason` obligatoire) ;
 * - `arbitrate` : doute pédagogique, à trancher par David (`question` obligatoire).
 *
 * `reviewer: 'david'` reporte un verdict DÉJÀ rendu par David (ses 41 questions) :
 * pas de marqueur « Relu par Claude », et son horodatage d'origine est conservé.
 */

import { z } from 'zod';
import type { QuestionTemplate } from '$lib/questions/types';
import type { TablesUpdate } from '$lib/types/database';

// ============================================================================
// TYPES
// ============================================================================

export type ReviewVerdict = 'approved' | 'corrected' | 'rejected' | 'arbitrate';

export interface ReviewFile {
	globalIndex: number;
	verdict: ReviewVerdict;
	reviewer: 'claude' | 'david';
	/** Date du verdict (ISO) ; par défaut, l'instant de l'écriture en base */
	reviewedAt?: string;
	reason?: string;
	question?: string;
	editNotes?: string;
	template?: QuestionTemplate;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Nombre total de questions TinyMath (`.claude/old-questions.json`) */
const OLD_QUESTION_COUNT = 633;

const reviewFileSchema = z
	.object({
		globalIndex: z
			.number()
			.int()
			.min(0)
			.max(OLD_QUESTION_COUNT - 1),
		verdict: z.enum(['approved', 'corrected', 'rejected', 'arbitrate']),
		reviewer: z.enum(['claude', 'david']),
		reviewedAt: z.string().datetime({ offset: true }).optional(),
		reason: z.string().min(1).max(2000).optional(),
		question: z.string().min(1).max(2000).optional(),
		editNotes: z.string().min(1).max(4000).optional(),
		// Contenu vérifié par `checkTemplate` (schéma strict + specs + tirages)
		template: z.record(z.string(), z.unknown()).optional()
	})
	.strict()
	.superRefine((file, ctx) => {
		const needsTemplate = file.verdict === 'approved' || file.verdict === 'corrected';
		if (needsTemplate && !file.template) {
			ctx.addIssue({ code: 'custom', path: ['template'], message: 'template obligatoire' });
		}
		if (file.verdict === 'corrected' && !file.editNotes) {
			ctx.addIssue({
				code: 'custom',
				path: ['editNotes'],
				message: 'une correction doit dire quoi et pourquoi'
			});
		}
		if (file.verdict === 'rejected' && !file.reason) {
			ctx.addIssue({ code: 'custom', path: ['reason'], message: 'raison du rejet obligatoire' });
		}
		if (file.verdict === 'arbitrate' && !file.question) {
			ctx.addIssue({
				code: 'custom',
				path: ['question'],
				message: 'question précise à poser à David obligatoire'
			});
		}
	});

// ============================================================================
// FUNCTIONS
// ============================================================================

/** Valide un fichier de verdict ; lève une erreur lisible sinon */
export function parseReviewFile(raw: unknown, source = 'fichier'): ReviewFile {
	const result = reviewFileSchema.safeParse(raw);
	if (!result.success) {
		const detail = result.error.issues
			.map((issue) => `${issue.path.join('.') || '(racine)'} : ${issue.message}`)
			.join(' ; ');
		throw new Error(`${source} invalide — ${detail}`);
	}
	return result.data as ReviewFile;
}

/** Date AAAA-MM-JJ d'un instant ISO */
function isoDate(iso: string): string {
	return iso.slice(0, 10);
}

/** Note de suivi (`migration_tracking.conversion_notes`) ; undefined = ne pas toucher */
export function buildConversionNote(review: ReviewFile, now: string): string | undefined {
	if (review.reviewer === 'david') return undefined;
	const prefix = `Relu par Claude le ${isoDate(review.reviewedAt ?? now)}`;
	switch (review.verdict) {
		case 'approved':
			return `${prefix} — approuvée telle que transformée.`;
		case 'corrected':
			return `${prefix} — corrigée : ${review.editNotes}`;
		case 'rejected':
			return `${prefix} — rejetée : ${review.reason}`;
		case 'arbitrate':
			return `${prefix} — À ARBITRER : ${review.question}`;
	}
}

/** Champs de relecture à écrire dans `migration_tracking` */
export function buildTrackingReviewUpdate(
	review: ReviewFile,
	reviewerId: string,
	now: string
): TablesUpdate<'migration_tracking'> {
	const note = buildConversionNote(review, now);
	const decided = review.verdict !== 'arbitrate';
	return {
		review_status:
			review.verdict === 'rejected'
				? 'rejected'
				: review.verdict === 'arbitrate'
					? 'pending'
					: 'approved',
		reviewed_by: decided ? reviewerId : null,
		reviewed_at: decided ? (review.reviewedAt ?? now) : null,
		...(note !== undefined && { conversion_notes: note })
	};
}

/** Note de la version corrigée (`migration_edits.edit_notes`) ; undefined = ne pas toucher */
export function buildEditNotes(review: ReviewFile): string | undefined {
	if (review.reviewer === 'david') return undefined;
	if (review.verdict === 'corrected') return `[Claude] ${review.editNotes}`;
	if (review.verdict === 'approved') {
		return '[Claude] Approuvée telle que transformée ; specs de test ajoutées.';
	}
	return undefined;
}

/** Le template d'un verdict, toujours en brouillon (David publie lui-même) */
export function draftTemplate(review: ReviewFile): QuestionTemplate | undefined {
	return review.template ? { ...review.template, status: 'draft' } : undefined;
}
