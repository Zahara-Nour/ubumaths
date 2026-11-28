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
 * Série choisie, affichage « parcours » (par défaut ; `?vue=fiches` pour l'affichage d'avant) : en
 * plus des modèles de la série, ceux des mêmes notions et du même niveau qui n'y sont pas, et les
 * points de ces notions sans aucun modèle (chantier parcours-serie).
 *
 * SECURITY : admin seul (`requireAdmin`, en plus de la garde de `/dev`) ; entrées validées par Zod.
 */

import { logServerError } from '#lib/server/utils/error-handler.ts';
import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { requireAdmin } from '#lib/server/middleware/auth.ts';
import { POINT_BOUNDS } from '#lib/server/point-bounds.ts';
import {
	deleteReview,
	loadReviewOverview,
	loadReviewSeries,
	loadReviewSheets,
	loadSeriesLines,
	MAX_SHEETS,
	saveReview
} from '#lib/server/template-review.ts';
import {
	buildReviewTree,
	countTemplates,
	findReviewNode,
	isDefaultFilters,
	formatSeriesDuration,
	matchesFilters,
	MAX_POINT_INPUT,
	neighbourTemplates,
	MAX_TITLE_SEARCH,
	nodeChain,
	parseFilters,
	parsePointCode,
	parseReviewView,
	pointsWithoutTemplate,
	programmeName,
	reviewNodePath,
	seriesNotions,
	seriesOptions,
	seriesSelection,
	seriesTotals,
	summaryAlerts,
	templatesUnder,
	type SeriesSheetEntry
} from '#lib/questions/template-review.ts';

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
		.max(MAX_POINT_INPUT)
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
		// Rognés comme dans `parseFilters` : vide ou espaces = pas de filtre
		titre: params.get('titre')?.trim() || null,
		point: params.get('point')?.trim() || null,
		serie: params.get('serie')?.trim() || null
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
	const seriesLines = series ? await loadSeriesLines(supabase, series.id) : null;

	// Ce que la page montre : la série choisie (dans son ordre), sinon le nœud choisi, sinon tout
	// ce que les filtres retiennent. La série remplace le nœud, gardé dans l'adresse.
	const node = nodeKey ? findReviewNode(tree, nodeKey) : null;
	let entries: SeriesSheetEntry[];
	if (seriesId) {
		entries = seriesLines?.lines ? seriesSelection(seriesLines.lines, byId, filters) : [];
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

	// Parcours : les mêmes notions, au niveau de la série, hors de la série
	const view = parseReviewView(params);
	const lines = seriesLines?.lines ?? null;
	let parcours = null;
	let neighbourShown: SeriesSheetEntry[] = [];
	if (series && lines && view === 'parcours') {
		const seriesIds = lines.map((l) => l.templateId);
		const notions = seriesNotions(seriesIds, byId, overview.nodes);
		const notionIds = notions.map((n) => n.id);
		const neighbours = neighbourTemplates({
			seriesTemplateIds: seriesIds,
			notionIds,
			templates: overview.templates,
			nodes: overview.nodes,
			grade: series.grade,
			filters
		});
		// Le plafond des fiches vaut pour la page entière : la série d'abord
		neighbourShown = neighbours
			.slice(0, Math.max(0, MAX_SHEETS - shown.length))
			.map((id) => ({ templateId: id, quantity: 0, delay: 0, key: `voisin-${id}`, found: true }));
		const totals = seriesTotals(lines);
		parcours = {
			questions: totals.questions,
			duration: formatSeriesDuration(totals.seconds),
			grade: programmeName(series.grade),
			notions: notions.map((n) => n.name),
			neighbourCount: neighbours.length,
			missingPoints: pointsWithoutTemplate(overview.points, notionIds, overview.nodes, series.grade)
		};
	}

	let sheets: Awaited<ReturnType<typeof loadReviewSheets>> = { rows: [], points: {} };
	let sheetsError: string | null = null;
	try {
		// Au-delà du plafond : les premières seulement (la page le dit)
		const ids = [
			...new Set([...shown, ...neighbourShown].filter((e) => e.found).map((e) => e.templateId))
		];
		sheets = await loadReviewSheets(supabase, ids);
	} catch (err) {
		sheetsError = err instanceof Error ? err.message : 'Lecture des fiches en échec';
	}
	const rowById = new Map(sheets.rows.map((r) => [r.id, r]));

	/** Une entrée de la vue, avec sa fiche (null : introuvable, ou lecture des fiches en échec) */
	function toSheet(entry: SeriesSheetEntry, inSeries: boolean) {
		const row = entry.found ? rowById.get(entry.templateId) : undefined;
		const seriesLine = inSeries ? { quantity: entry.quantity, delay: entry.delay } : null;
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
	}

	return {
		tree,
		totals: countTemplates(overview.templates),
		pointBoundsCount: POINT_BOUNDS.size,
		filters,
		pointUnknown: filters.point !== null && !overview.pointCodes.has(filters.point),
		seriesItems: seriesOptions(allSeries),
		seriesId,
		series: series ? { title: series.title, readable: Boolean(seriesLines?.lines) } : null,
		nodeKey,
		nodeFound: nodeKey === null || node !== null,
		path: nodeKey ? reviewNodePath(tree, nodeKey).map((n) => ({ key: n.key, name: n.name })) : [],
		selectedCount: entries.length,
		tooMany,
		maxSheets: MAX_SHEETS,
		sheetsError,
		sheets: shown.map((entry) => toSheet(entry, seriesId !== null)),
		view,
		parcours,
		neighbourSheets: neighbourShown.map((entry) => toSheet(entry, false))
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
			logServerError('dev/modeles/saveReview', err);
			return fail(500, { message: 'Verdict non enregistré' });
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
			logServerError('dev/modeles/deleteReview', err);
			return fail(500, { message: 'Verdict non retiré' });
		}
	}
};
