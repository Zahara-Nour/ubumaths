/**
 * Revue des modèles de questions (`/dev/modeles`) — chargement serveur et verdicts
 * ================================================================================
 *
 * Vue d'ensemble de TOUS les modèles en base, rangés programme > branche > notion > sous-notion,
 * avec le verdict de relecture de chacun. Les fiches complètes (variations comprises) ne sont
 * chargées que pour la série choisie (`?serie=`, dans son ordre, à la place du nœud), le nœud
 * choisi (`?noeud=`), ou pour tout ce qui passe les filtres quand un filtre est posé sans nœud —
 * les `MAX_SHEETS` premières. Filtres : verdict, statut, alertes, titre (`?titre=`), point
 * (`?point=`).
 *
 * SECURITY : admin seul (`requireAdmin`, en plus de la garde de `/dev`) ; entrées validées par Zod.
 */

import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/middleware/auth';
import { POINT_BOUNDS } from '$lib/server/point-bounds';
import {
	deleteReview,
	loadReviewOverview,
	loadReviewSeries,
	loadReviewSheets,
	MAX_SHEETS,
	saveReview
} from '$lib/server/template-review';
import {
	buildReviewTree,
	countTemplates,
	findReviewNode,
	isDefaultFilters,
	matchesFilters,
	MAX_TITLE_SEARCH,
	nodeChain,
	parseFilters,
	parsePointCode,
	reviewNodePath,
	seriesOptions,
	seriesSelection,
	summaryAlerts,
	templatesUnder,
	type SeriesSheetEntry
} from '$lib/questions/template-review';

// Constantes

const NODE_KEY = z
	.string()
	.max(120)
	.regex(/^[A-Za-z0-9_-]+(~[A-Za-z0-9-]+)?$/);

/** Les paramètres d'adresse bornés : un dépassement est une erreur (400), pas un défaut */
const QUERY_SCHEMA = z.object({
	noeud: NODE_KEY.nullable(),
	titre: z.string().max(MAX_TITLE_SEARCH).nullable(),
	point: z
		.string()
		.max(20)
		.refine((v) => parsePointCode(v) !== null)
		.nullable(),
	serie: z.string().uuid().nullable()
});

const SAVE_SCHEMA = z.object({
	templateId: z.string().uuid(),
	verdict: z.enum(['valide', 'a_revoir']),
	comment: z.string().max(4000)
});

const DELETE_SCHEMA = z.object({ templateId: z.string().uuid() });

// Functions

export const load: PageServerLoad = async ({ locals, url }) => {
	const { supabase } = await requireAdmin(locals);
	const params = url.searchParams;
	const query = QUERY_SCHEMA.safeParse({
		noeud: params.get('noeud'),
		titre: params.get('titre'),
		// Un point vide vaut « pas de filtre »
		point: params.get('point') || null,
		serie: params.get('serie') || null
	});
	if (!query.success) {
		const field = query.error.issues[0]?.path[0];
		throw error(
			400,
			field === 'noeud'
				? 'Nœud invalide'
				: field === 'titre'
					? `Recherche trop longue (${MAX_TITLE_SEARCH} caractères au plus)`
					: field === 'point'
						? 'Code de point invalide (forme attendue : 1SPE-213)'
						: 'Série invalide'
		);
	}
	const filters = parseFilters(params);
	const nodeKey = query.data.noeud;
	const seriesId = query.data.serie;

	const [overview, allSeries] = await Promise.all([
		loadReviewOverview(supabase),
		loadReviewSeries(supabase)
	]);
	const tree = buildReviewTree(overview.templates, overview.nodes);
	const byId = new Map(overview.templates.map((t) => [t.id, t]));
	const series = seriesId ? (allSeries.find((s) => s.id === seriesId) ?? null) : null;

	// Ce que la page montre : la série choisie (dans son ordre), sinon le nœud choisi, sinon tout
	// ce que les filtres retiennent. La série remplace le nœud, gardé dans l'adresse.
	const node = nodeKey ? findReviewNode(tree, nodeKey) : null;
	let entries: SeriesSheetEntry[];
	if (seriesId) {
		entries = series?.lines ? seriesSelection(series.lines, byId, filters) : [];
	} else {
		const candidates = node
			? templatesUnder(node)
			: isDefaultFilters(filters)
				? []
				: overview.templates.map((t) => t.id);
		entries = candidates
			.filter((id) => {
				const t = byId.get(id);
				return t !== undefined && matchesFilters(t, filters);
			})
			.map((id) => ({ templateId: id, quantity: 0, delay: 0, key: id, found: true }));
	}
	const tooMany = entries.length > MAX_SHEETS;
	const shown = entries.slice(0, MAX_SHEETS);

	let sheets: Awaited<ReturnType<typeof loadReviewSheets>> = { rows: [], points: {} };
	let sheetsError: string | null = null;
	try {
		// Au-delà du plafond : les premières seulement (la page le dit)
		const ids = [...new Set(shown.filter((e) => e.found).map((e) => e.templateId))];
		sheets = await loadReviewSheets(supabase, ids);
	} catch (err) {
		sheetsError = err instanceof Error ? err.message : 'Lecture des fiches en échec';
	}
	const rowById = new Map(sheets.rows.map((r) => [r.id, r]));

	return {
		tree,
		totals: countTemplates(overview.templates),
		pointBoundsCount: POINT_BOUNDS.size,
		filters,
		pointUnknown: filters.point !== null && !overview.pointCodes.has(filters.point),
		seriesItems: seriesOptions(allSeries),
		seriesId,
		series: series ? { title: series.title, readable: series.lines !== null } : null,
		nodeKey,
		nodeFound: nodeKey === null || node !== null,
		path: nodeKey ? reviewNodePath(tree, nodeKey).map((n) => ({ key: n.key, name: n.name })) : [],
		selectedCount: entries.length,
		tooMany,
		maxSheets: MAX_SHEETS,
		sheetsError,
		sheets: shown.map((entry) => {
			const row = entry.found ? rowById.get(entry.templateId) : undefined;
			const seriesLine = seriesId ? { quantity: entry.quantity, delay: entry.delay } : null;
			// Lecture des fiches en échec : la page le dit déjà, pas de « introuvable » en plus
			if (!row) return { key: entry.key, templateId: entry.templateId, sheet: null, seriesLine };
			const summary = byId.get(row.id);
			return {
				key: entry.key,
				templateId: entry.templateId,
				seriesLine,
				sheet: {
					row,
					points: sheets.points[row.id] ?? [],
					review: summary?.review ?? null,
					alerts: summary ? summaryAlerts(summary) : [],
					nodePath: summary?.nodeId
						? nodeChain(summary.nodeId, overview.nodes).map((n) => n.name)
						: []
				}
			};
		})
	};
};

export const actions: Actions = {
	saveReview: async ({ locals, request }) => {
		const { supabase } = await requireAdmin(locals);
		const form = await request.formData();
		const parsed = SAVE_SCHEMA.safeParse({
			templateId: form.get('templateId'),
			verdict: form.get('verdict'),
			comment: form.get('comment') ?? ''
		});
		if (!parsed.success) return fail(400, { message: 'Verdict invalide' });
		try {
			const review = await saveReview(supabase, parsed.data);
			return { saved: parsed.data.templateId, review };
		} catch (err) {
			return fail(500, { message: err instanceof Error ? err.message : 'Verdict non enregistré' });
		}
	},

	deleteReview: async ({ locals, request }) => {
		const { supabase } = await requireAdmin(locals);
		const form = await request.formData();
		const parsed = DELETE_SCHEMA.safeParse({ templateId: form.get('templateId') });
		if (!parsed.success) return fail(400, { message: 'Modèle invalide' });
		try {
			const removed = await deleteReview(supabase, parsed.data.templateId);
			if (!removed) return fail(404, { message: 'Aucun verdict à retirer' });
			return { deleted: parsed.data.templateId };
		} catch (err) {
			return fail(500, { message: err instanceof Error ? err.message : 'Verdict non retiré' });
		}
	}
};
