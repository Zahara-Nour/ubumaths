/**
 * Relecture des questions TinyMath — écritures en base
 * ====================================================
 *
 * Deux gestes, chacun en simulation tant que `dryRun` est vrai :
 * - `recordReview` : reporte un verdict (fichier de relecture) dans
 *   `migration_tracking` et, s'il y a un template, `migration_edits` ;
 * - `importReviewedQuestion` : importe une question APPROUVÉE, non encore
 *   importée, dans `question_templates` — toujours en brouillon.
 *
 * Garde-fous :
 * - aucun template n'est écrit sans passer `checkTemplate` (specs + tirages) ;
 * - une correction existante (celles de David) n'est pas écrasée sans
 *   `allowReplaceEdit` ;
 * - chaque écriture est relue (`.select()`) : un refus RLS rend zéro ligne
 *   sans erreur, et un update sans ligne ne doit pas passer pour un succès ;
 * - l'import relie le suivi sous condition `new_template_id IS NULL` : rejouer
 *   ne crée pas de doublon.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { toJson } from '$lib/types/database-helpers';
import type { QuestionTemplate } from '$lib/questions/types';
import type { QuestionWithMigration } from '$lib/migration/old-question-types';
import { transformQuestion } from '$lib/migration/question-transformer';
import { checkTemplate } from '$lib/migration/review/check-template';
import { toTemplateInsertRow } from '$lib/migration/review/template-insert-row';
import {
	buildEditNotes,
	buildTrackingReviewUpdate,
	draftTemplate,
	type ReviewFile
} from '$lib/migration/review/review-file';
import { generateStableQuestionHash } from './hash-utils';

// ============================================================================
// TYPES
// ============================================================================

export interface ReviewDbContext {
	supabase: SupabaseClient<Database>;
	/** Profil inscrit comme relecteur, éditeur et auteur (David) */
	reviewerId: string;
	/** Instant ISO des écritures */
	now: string;
	dryRun: boolean;
	/** Remplacer une version corrigée ou un verdict existants et différents */
	allowReplaceEdit?: boolean;
	/** Tirages par variation pour `checkTemplate` (défaut : 50) */
	instances?: number;
}

export interface ReviewOutcome {
	globalIndex: number;
	status: 'written' | 'planned' | 'refused';
	reasons: string[];
}

export interface ImportOutcome {
	globalIndex: number;
	status: 'imported' | 'planned' | 'refused' | 'skipped';
	templateId?: string;
	reasons: string[];
}

export interface ImportCandidate {
	globalIndex: number;
	hash: string;
	trackingId: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function hashOf(oldQuestion: QuestionWithMigration): string {
	return generateStableQuestionHash(oldQuestion as unknown as Record<string, unknown>);
}

function globalIndexOf(oldQuestion: QuestionWithMigration): number {
	return oldQuestion._migration.globalIndex;
}

/** JSON à clés triées : jsonb réordonne les clés, la comparaison doit l'ignorer */
function canonicalJson(value: unknown): string {
	return JSON.stringify(value, (_key, inner: unknown) => {
		if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
			return Object.fromEntries(
				Object.entries(inner as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
			);
		}
		return inner;
	});
}

/** Même contenu, à l'ordre des clés, au statut et à l'`id` près */
function sameContent(a: object, b: object): boolean {
	const normalize = (value: object) => ({ ...value, id: undefined, status: 'draft' });
	return canonicalJson(normalize(a)) === canonicalJson(normalize(b));
}

// ============================================================================
// REPORT D'UN VERDICT
// ============================================================================

export async function recordReview(
	ctx: ReviewDbContext,
	oldQuestion: QuestionWithMigration,
	review: ReviewFile
): Promise<ReviewOutcome> {
	const { supabase } = ctx;
	const globalIndex = globalIndexOf(oldQuestion);
	const refused = (reasons: string[]): ReviewOutcome => ({
		globalIndex,
		status: 'refused',
		reasons
	});

	if (review.globalIndex !== globalIndex) {
		return refused([`le verdict vise #${review.globalIndex}, la question est #${globalIndex}`]);
	}

	const template = draftTemplate(review);
	if (template) {
		const report = checkTemplate(template, { instances: ctx.instances });
		if (!report.passed) return refused(report.reasons);
	}

	const hash = hashOf(oldQuestion);
	const { data: tracking, error: trackingError } = await supabase
		.from('migration_tracking')
		.select('id, old_question_index, migration_status, new_template_id, review_status')
		.eq('old_question_hash', hash)
		.maybeSingle();
	if (trackingError) throw new Error(`#${globalIndex} lecture du suivi : ${trackingError.message}`);
	// 12 paires TinyMath partagent la même empreinte (doublons) : une seule ligne
	// de suivi possible par paire, jamais celle de l'autre question
	if (tracking && tracking.old_question_index !== globalIndex) {
		return refused([`même empreinte que #${tracking.old_question_index} (doublon TinyMath)`]);
	}
	if (tracking?.new_template_id) {
		return refused([`déjà importée (template ${tracking.new_template_id})`]);
	}
	const newStatus = buildTrackingReviewUpdate(review, ctx.reviewerId, ctx.now).review_status;
	const decided = tracking?.review_status === 'approved' || tracking?.review_status === 'rejected';
	if (decided && tracking.review_status !== newStatus && !ctx.allowReplaceEdit) {
		return refused([
			`verdict existant « ${tracking.review_status} » différent (--remplacer pour le changer)`
		]);
	}

	if (template) {
		const { data: edit, error: editError } = await supabase
			.from('migration_edits')
			.select('edited_json')
			.eq('old_question_hash', hash)
			.maybeSingle();
		if (editError)
			throw new Error(`#${globalIndex} lecture de la correction : ${editError.message}`);
		const differs = edit && canonicalJson(edit.edited_json) !== canonicalJson(template);
		if (differs && !ctx.allowReplaceEdit) {
			return refused(['correction existante différente (--remplacer pour l’écraser)']);
		}
	}

	if (ctx.dryRun) return { globalIndex, status: 'planned', reasons: [] };

	// 1. Ligne de suivi (créée si absente, comme l'interface de relecture)
	let trackingId = tracking?.id;
	if (!trackingId) {
		const meta = oldQuestion._migration;
		const { data: created, error } = await supabase
			.from('migration_tracking')
			.insert({
				old_question_hash: hash,
				old_question_index: globalIndex,
				old_description: (oldQuestion.description || `Question #${globalIndex}`).slice(0, 500),
				migration_status: 'pending',
				phase: 4,
				theme: meta.theme,
				domain: meta.domain,
				subdomain: meta.subdomain,
				level: meta.level
			})
			.select('id')
			.single();
		if (error || !created) {
			throw new Error(`#${globalIndex} création du suivi : ${error?.message ?? 'aucune ligne'}`);
		}
		trackingId = created.id;
	}

	// 2. Version corrigée
	if (template) {
		const notes = buildEditNotes(review);
		const { data: edits, error } = await supabase
			.from('migration_edits')
			.upsert(
				{
					migration_tracking_id: trackingId,
					old_question_hash: hash,
					edited_json: toJson(template),
					editor_id: ctx.reviewerId,
					...(notes !== undefined && { edit_notes: notes })
				},
				{ onConflict: 'old_question_hash' }
			)
			.select('id');
		if (error || edits?.length !== 1) {
			throw new Error(
				`#${globalIndex} correction non écrite : ${error?.message ?? 'aucune ligne'}`
			);
		}
	}

	// 3. Verdict. Un `validated` de l'ancien schéma (verdict humain rangé dans
	// la colonne technique) redevient `pending` : rien n'a été importé.
	const { data: updated, error: updateError } = await supabase
		.from('migration_tracking')
		.update({
			...buildTrackingReviewUpdate(review, ctx.reviewerId, ctx.now),
			...(tracking?.migration_status === 'validated' && { migration_status: 'pending' })
		})
		.eq('id', trackingId)
		.is('new_template_id', null)
		.select('id');
	if (updateError || updated?.length !== 1) {
		throw new Error(
			`#${globalIndex} verdict non écrit : ${updateError?.message ?? 'aucune ligne'}`
		);
	}

	return { globalIndex, status: 'written', reasons: [] };
}

// ============================================================================
// IMPORT
// ============================================================================

/** Questions approuvées et pas encore importées (option : restreindre aux index donnés) */
export async function listImportCandidates(
	supabase: SupabaseClient<Database>,
	indices?: number[]
): Promise<ImportCandidate[]> {
	let query = supabase
		.from('migration_tracking')
		.select('id, old_question_index, old_question_hash')
		.eq('review_status', 'approved')
		.is('new_template_id', null)
		.order('old_question_index');
	if (indices) query = query.in('old_question_index', indices);

	const { data, error } = await query;
	if (error) throw new Error(`lecture des candidats : ${error.message}`);
	return (data ?? []).map((row) => ({
		globalIndex: row.old_question_index,
		hash: row.old_question_hash,
		trackingId: row.id
	}));
}

/**
 * @param expected - le template RELU (fichier de verdict validé par David) :
 *   s'il est fourni, la version en base doit lui être identique
 */
export async function importReviewedQuestion(
	ctx: ReviewDbContext,
	oldQuestion: QuestionWithMigration,
	expected?: Omit<QuestionTemplate, 'id'>
): Promise<ImportOutcome> {
	const { supabase } = ctx;
	const globalIndex = globalIndexOf(oldQuestion);
	const hash = hashOf(oldQuestion);

	const { data: tracking, error: trackingError } = await supabase
		.from('migration_tracking')
		.select('id, old_question_index, review_status, new_template_id')
		.eq('old_question_hash', hash)
		.maybeSingle();
	if (trackingError) throw new Error(`#${globalIndex} lecture du suivi : ${trackingError.message}`);
	if (tracking && tracking.old_question_index !== globalIndex) {
		return {
			globalIndex,
			status: 'refused',
			reasons: [`même empreinte que #${tracking.old_question_index} (doublon TinyMath)`]
		};
	}
	if (!tracking || tracking.review_status !== 'approved') {
		return { globalIndex, status: 'skipped', reasons: ['non approuvée'] };
	}
	if (tracking.new_template_id) {
		return { globalIndex, status: 'skipped', reasons: ['déjà importée'] };
	}

	// Version corrigée si elle existe, sinon transformation actuelle
	const { data: edit, error: editError } = await supabase
		.from('migration_edits')
		.select('edited_json')
		.eq('old_question_hash', hash)
		.maybeSingle();
	if (editError) throw new Error(`#${globalIndex} lecture de la correction : ${editError.message}`);

	let source: Omit<QuestionTemplate, 'id'>;
	if (edit) {
		source = edit.edited_json as unknown as QuestionTemplate;
	} else {
		const transformed = transformQuestion(oldQuestion, globalIndex);
		if (!transformed.success || !transformed.template) {
			return { globalIndex, status: 'refused', reasons: ['transformation impossible'] };
		}
		source = transformed.template;
	}
	const template: Omit<QuestionTemplate, 'id'> = { ...source, status: 'draft' };
	if (expected && !sameContent(template, expected)) {
		return {
			globalIndex,
			status: 'refused',
			reasons: ['la version en base diffère du fichier relu (relancer relecture:verdicts)']
		};
	}

	const report = checkTemplate(template, { instances: ctx.instances });
	if (!report.passed) return { globalIndex, status: 'refused', reasons: report.reasons };

	if (ctx.dryRun) return { globalIndex, status: 'planned', reasons: [] };

	const { data: inserted, error: insertError } = await supabase
		.from('question_templates')
		.insert(toTemplateInsertRow(template, ctx.reviewerId))
		.select('id, status')
		.single();
	if (insertError || !inserted) {
		throw new Error(`#${globalIndex} insertion : ${insertError?.message ?? 'aucune ligne'}`);
	}

	const { data: linked, error: linkError } = await supabase
		.from('migration_tracking')
		.update({
			new_template_id: inserted.id,
			migration_status: 'imported',
			imported_at: ctx.now
		})
		.eq('id', tracking.id)
		.is('new_template_id', null)
		.select('id');
	if (linkError || linked?.length !== 1) {
		// Le template existe mais n'est pas relié : relancer créerait un doublon
		throw new Error(
			`#${globalIndex} template ${inserted.id} créé mais suivi NON relié ` +
				`(${linkError?.message ?? 'aucune ligne'}) — relier à la main avant toute relance`
		);
	}

	return { globalIndex, status: 'imported', templateId: inserted.id, reasons: [] };
}
