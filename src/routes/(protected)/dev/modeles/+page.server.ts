/**
 * Revue des modèles de questions (`/dev/modeles`) — chargement serveur et verdicts
 * ================================================================================
 *
 * Vue d'ensemble de TOUS les modèles en base, rangés programme > branche > notion > sous-notion,
 * avec le verdict de relecture de chacun. Les fiches complètes (variations comprises) ne sont
 * chargées que pour le nœud choisi (`?noeud=`), ou pour tout ce qui passe les filtres quand un
 * filtre est posé sans nœud — les `MAX_SHEETS` premières.
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
	loadReviewSheets,
	MAX_SHEETS,
	saveReview
} from '$lib/server/template-review';
import {
	buildReviewTree,
	countTemplates,
	DEFAULT_FILTERS,
	findReviewNode,
	matchesFilters,
	nodeChain,
	parseFilters,
	reviewNodePath,
	summaryAlerts,
	templatesUnder
} from '$lib/questions/template-review';

// Constantes

const NODE_KEY = z
	.string()
	.max(120)
	.regex(/^[A-Za-z0-9_-]+(~[A-Za-z0-9-]+)?$/);

const SAVE_SCHEMA = z.object({
	templateId: z.string().uuid(),
	verdict: z.enum(['valide', 'a_revoir']),
	comment: z.string().max(4000)
});

const DELETE_SCHEMA = z.object({ templateId: z.string().uuid() });

// Functions

function sameFilters(a: typeof DEFAULT_FILTERS, b: typeof DEFAULT_FILTERS): boolean {
	return a.verdict === b.verdict && a.status === b.status && a.alertsOnly === b.alertsOnly;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const { supabase } = await requireAdmin(locals);
	const filters = parseFilters(url.searchParams);
	const rawKey = url.searchParams.get('noeud');
	const parsedKey = rawKey === null ? null : NODE_KEY.safeParse(rawKey);
	if (parsedKey && !parsedKey.success) throw error(400, 'Nœud invalide');
	const nodeKey = parsedKey?.data ?? null;

	const overview = await loadReviewOverview(supabase);
	const tree = buildReviewTree(overview.templates, overview.nodes);
	const byId = new Map(overview.templates.map((t) => [t.id, t]));

	// Ce que la page montre en fiches : le nœud choisi, sinon tout ce que les filtres retiennent
	const node = nodeKey ? findReviewNode(tree, nodeKey) : null;
	const candidates = node
		? templatesUnder(node)
		: sameFilters(filters, DEFAULT_FILTERS)
			? []
			: overview.templates.map((t) => t.id);
	const selected = candidates.filter((id) => {
		const t = byId.get(id);
		return t !== undefined && matchesFilters(t, filters);
	});
	const tooMany = selected.length > MAX_SHEETS;

	let sheets: Awaited<ReturnType<typeof loadReviewSheets>> = { rows: [], points: {} };
	let sheetsError: string | null = null;
	try {
		// Au-delà du plafond : les premières seulement (la page le dit)
		sheets = await loadReviewSheets(supabase, selected.slice(0, MAX_SHEETS));
	} catch (err) {
		sheetsError = err instanceof Error ? err.message : 'Lecture des fiches en échec';
	}

	return {
		tree,
		totals: countTemplates(overview.templates),
		pointBoundsCount: POINT_BOUNDS.size,
		filters,
		nodeKey,
		nodeFound: nodeKey === null || node !== null,
		path: nodeKey ? reviewNodePath(tree, nodeKey).map((n) => ({ key: n.key, name: n.name })) : [],
		selectedCount: selected.length,
		tooMany,
		maxSheets: MAX_SHEETS,
		sheetsError,
		sheets: sheets.rows.map((row) => {
			const summary = byId.get(row.id);
			return {
				row,
				points: sheets.points[row.id] ?? [],
				review: summary?.review ?? null,
				alerts: summary ? summaryAlerts(summary) : [],
				nodePath: summary?.nodeId
					? nodeChain(summary.nodeId, overview.nodes).map((n) => n.name)
					: []
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
