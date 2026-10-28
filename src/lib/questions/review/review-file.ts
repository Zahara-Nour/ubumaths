/**
 * Fichier de verdict de relecture (`data/relecture/<lot>/<globalIndex>.json`)
 * ==========================================================================
 *
 * Les 632 questions TinyMath relues (import terminé, ADR 0033 lot 5) restent
 * versionnées : elles servent de CORPUS aux gardes de non-régression
 * (`corpus-relecture`, complexité des réponses, neutralisation des réponses
 * d'élèves). Ce module ne fait plus que les lire.
 *
 * Verdicts :
 * - `approved`  : approuvée telle que transformée (le template porte les specs) ;
 * - `corrected` : corrigée puis approuvée (`editNotes` dit quoi et pourquoi) ;
 * - `rejected`  : rejetée (`reason` obligatoire) ;
 * - `arbitrate` : doute pédagogique, à trancher par David (`question` obligatoire).
 */

import { z } from 'zod';
import type { QuestionTemplate } from '$lib/questions/types';

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

/** Nombre total de questions TinyMath (index 0 à 632) */
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

/**
 * Le template d'un verdict qui en porte un (`approved` / `corrected`), toujours
 * en brouillon (David publie lui-même). Un rejet ou un arbitrage n'écrit jamais
 * de version corrigée, même si le fichier contient un template.
 */
export function draftTemplate(review: ReviewFile): QuestionTemplate | undefined {
	const carriesTemplate = review.verdict === 'approved' || review.verdict === 'corrected';
	return carriesTemplate && review.template ? { ...review.template, status: 'draft' } : undefined;
}
