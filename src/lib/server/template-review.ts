/**
 * Revue des modèles de questions (`/dev/modeles`) — lectures et écritures en base
 * ================================================================================
 *
 * Vue d'ensemble : tous les modèles (sans leurs variations), leurs points, leurs verdicts et
 * l'arbre des notions. Fiches : les lignes complètes des modèles d'un nœud, avec le libellé et
 * les bornes de leurs points. Client de l'admin seulement (`requireAdmin`) : la table des
 * verdicts n'est lisible et modifiable que par lui (RLS).
 *
 * PostgREST plafonne une lecture à 1000 lignes : chaque table entière est lue par pages.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { QuestionTemplateRow } from '$lib/types/question-template';
import type {
	SheetPoint,
	TemplateReview,
	TemplateSummary,
	TreeNodeRow,
	Verdict
} from '$lib/questions/template-review';
import { POINT_BOUNDS } from '$lib/server/point-bounds';

// Types

type Client = SupabaseClient<Database>;

export interface ReviewOverview {
	templates: TemplateSummary[];
	nodes: Map<string, TreeNodeRow>;
}

// Constantes

const PAGE_SIZE = 1000;
/** Au-delà, la page demande de choisir un nœud plus fin (aperçus générés dans le navigateur) */
export const MAX_SHEETS = 80;
const SHEET_COLS =
	'id, title, description, theme, domain, subdomain, level, status, grades, delay, variations, shared, options, default_display_options, test_specs, exercise_instruction, created_at, updated_at, created_by';

// Functions

/** Toutes les lignes d'une lecture, page par page */
async function readAll<T>(
	read: (
		from: number,
		to: number
	) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
	what: string
): Promise<T[]> {
	const rows: T[] = [];
	for (let from = 0; ; from += PAGE_SIZE) {
		const { data, error } = await read(from, from + PAGE_SIZE - 1);
		if (error) throw new Error(`lecture ${what} impossible — ${error.message}`);
		rows.push(...(data ?? []));
		if (!data || data.length < PAGE_SIZE) return rows;
	}
}

function isVerdict(v: string): v is Verdict {
	return v === 'valide' || v === 'a_revoir';
}

/** Tous les modèles, leurs points, leurs verdicts, et l'arbre des notions */
export async function loadReviewOverview(supabase: Client): Promise<ReviewOverview> {
	const [templates, tags, points, nodes, reviews] = await Promise.all([
		readAll(
			(from, to) =>
				supabase
					.from('question_templates')
					.select('id, title, status, level, classification_node_id, updated_at')
					.order('title')
					.order('id')
					.range(from, to),
			'des modèles'
		),
		readAll(
			(from, to) =>
				supabase
					.from('question_template_points')
					.select('template_id, point_id')
					.order('template_id')
					.order('point_id')
					.range(from, to),
			'des tags'
		),
		readAll(
			(from, to) =>
				supabase.from('curriculum_points').select('id, code, grade').order('id').range(from, to),
			'des points'
		),
		readAll(
			(from, to) =>
				supabase
					.from('classification_nodes')
					.select('id, name, parent_id, position')
					.order('id')
					.range(from, to),
			"de l'arbre"
		),
		readAll(
			(from, to) =>
				supabase
					.from('question_template_reviews')
					.select('template_id, verdict, comment, reviewed_at')
					.order('template_id')
					.range(from, to),
			'des verdicts'
		)
	]);

	const pointById = new Map(points.map((p) => [p.id, { code: p.code, grade: p.grade }]));
	const pointsByTemplate = new Map<string, { code: string; grade: string | null }[]>();
	for (const t of tags) {
		const point = pointById.get(t.point_id);
		if (!point) continue;
		const list = pointsByTemplate.get(t.template_id) ?? [];
		list.push(point);
		pointsByTemplate.set(t.template_id, list);
	}
	const reviewByTemplate = new Map<string, TemplateReview>();
	for (const r of reviews) {
		if (!isVerdict(r.verdict)) continue;
		reviewByTemplate.set(r.template_id, {
			verdict: r.verdict,
			comment: r.comment,
			reviewedAt: r.reviewed_at
		});
	}

	return {
		templates: templates.map((t) => ({
			id: t.id,
			title: t.title,
			status: t.status,
			level: t.level,
			nodeId: t.classification_node_id,
			updatedAt: t.updated_at,
			points: (pointsByTemplate.get(t.id) ?? []).sort((a, b) => a.code.localeCompare(b.code)),
			review: reviewByTemplate.get(t.id) ?? null
		})),
		nodes: new Map(nodes.map((n) => [n.id, n]))
	};
}

/** Les lignes complètes des modèles `ids` (dans cet ordre) et les points de chacun */
export async function loadReviewSheets(
	supabase: Client,
	ids: readonly string[]
): Promise<{ rows: QuestionTemplateRow[]; points: Record<string, SheetPoint[]> }> {
	if (ids.length === 0) return { rows: [], points: {} };
	const { data: rows, error } = await supabase
		.from('question_templates')
		.select(SHEET_COLS)
		.in('id', [...ids]);
	if (error) throw new Error(`lecture des fiches impossible — ${error.message}`);

	const { data: tags, error: tagsError } = await supabase
		.from('question_template_points')
		.select('template_id, curriculum_points (code, grade, name, archived_at)')
		.in('template_id', [...ids]);
	if (tagsError) throw new Error(`lecture des points impossible — ${tagsError.message}`);

	const points: Record<string, SheetPoint[]> = {};
	for (const t of tags ?? []) {
		const p = t.curriculum_points;
		if (!p) continue;
		const bounds = POINT_BOUNDS.get(p.code);
		(points[t.template_id] ??= []).push({
			code: p.code,
			grade: p.grade,
			name: p.name,
			archived: p.archived_at !== null,
			bounds: bounds
				? [...bounds.bornes.map((b) => b.borne), ...(bounds.remarque ? [bounds.remarque] : [])]
				: [],
			missingBounds: !bounds
		});
	}
	for (const list of Object.values(points)) list.sort((a, b) => a.code.localeCompare(b.code));

	// L'ordre de la vue (celui de l'arbre), pas celui de la base
	const order = new Map(ids.map((id, i) => [id, i]));
	return {
		rows: (rows ?? []).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)),
		points
	};
}

/** Pose (ou remplace) le verdict d'un modèle ; la RLS refuse en silence : la ligne rendue est vérifiée */
export async function saveReview(
	supabase: Client,
	input: { templateId: string; verdict: Verdict; comment: string }
): Promise<TemplateReview> {
	const { data, error } = await supabase
		.from('question_template_reviews')
		.upsert({ template_id: input.templateId, verdict: input.verdict, comment: input.comment })
		.select('verdict, comment, reviewed_at');
	if (error) throw new Error(`verdict non enregistré — ${error.message}`);
	const row = data?.[0];
	if (!row || !isVerdict(row.verdict)) throw new Error('verdict non enregistré (accès refusé)');
	return { verdict: row.verdict, comment: row.comment, reviewedAt: row.reviewed_at };
}

/** Retire le verdict d'un modèle ; faux si aucune ligne n'a été retirée */
export async function deleteReview(supabase: Client, templateId: string): Promise<boolean> {
	const { data, error } = await supabase
		.from('question_template_reviews')
		.delete()
		.eq('template_id', templateId)
		.select('template_id');
	if (error) throw new Error(`verdict non retiré — ${error.message}`);
	return (data ?? []).length > 0;
}
