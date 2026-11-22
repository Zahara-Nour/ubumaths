/**
 * Base locale remplie, chantier `seed-complet`, PR 3 — mémoire des Mathoux des élèves fictifs.
 *
 * La liste d'une classe, côté prof, ne compte que la MÉMOIRE (`student_mathoux`,
 * `#lib/server/mathoux/teacher.ts`) : sans elle, aucun Mathou n'y paraît tant que l'élève n'a pas
 * ouvert sa chatterie. Le seed l'écrit donc, avec la VRAIE règle de l'appli
 * (`buildMathouCollection` puis `memoryUpdates`, `#lib/mathoux/collection-logic.ts`) sur les points
 * acquis inventés par `suivi.ts`. `index.ts` charge les données comme
 * `#lib/server/mathoux/collection.ts` (parcours, points tagués par un modèle publié, arbre, états).
 *
 * Deux écarts, sans effet sur ce que l'élève verra : aucune sieste (le badge FSRS n'est pas
 * recalculé ici ; la première visite de l'élève endort qui doit l'être) et aucune étape payée
 * (`rewarded_stage` nul : la première visite verse les Gidouilles des étapes, comme pour un vrai
 * élève qui revient après avoir travaillé).
 * Tests : scripts/__tests__/db-seed-jeux.test.ts.
 */

import {
	buildMathouCollection,
	isPointLost,
	memoryUpdates,
	type CollectionTreeNode,
	type PointProgress,
	type WorkablePoint
} from '#lib/mathoux/collection-logic.ts';

export interface EtatPoint {
	point_id: string;
	is_acquired: boolean;
	total_successes: number;
	distinct_template_successes: number;
	last_success_at: string | null;
}

export interface EntreeMathoux {
	eleve: string;
	/** Points du parcours de l'élève tagués par au moins un modèle publié, et leur régime. */
	points: (WorkablePoint & { regime: string })[];
	noeuds: CollectionTreeNode[];
	etats: EtatPoint[];
	maintenant: Date;
}

/** Lignes de `student_mathoux` que la première visite de l'élève aurait écrites. */
export function memoireMathoux(e: EntreeMathoux): Record<string, unknown>[] {
	if (e.points.length === 0) return [];
	const regimes = new Map(e.points.map((p) => [p.id, p.regime]));
	const progress = new Map<string, PointProgress>();
	for (const s of e.etats) {
		progress.set(s.point_id, {
			isAcquired: s.is_acquired,
			hasSuccess: s.total_successes > 0 || s.last_success_at !== null,
			lost: isPointLost(regimes.get(s.point_id) ?? 'diversite', {
				isAcquired: s.is_acquired,
				totalSuccesses: s.total_successes,
				distinctTemplateSuccesses: s.distinct_template_successes
			})
		});
	}
	const collection = buildMathouCollection({
		points: e.points.map(({ id, nodeId, grade }) => ({ id, nodeId, grade })),
		nodes: e.noeuds,
		progress,
		nappingPointIds: new Set(),
		memory: new Map()
	});
	const quand = e.maintenant.toISOString();
	return memoryUpdates(collection, new Map()).map((m) => ({
		student_id: e.eleve,
		notion_id: m.notionId,
		best_stage: m.bestStage,
		starred_grades: m.starredGrades,
		asleep: m.asleep,
		first_seen_at: quand
	}));
}
