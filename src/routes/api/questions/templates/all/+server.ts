/**
 * GET /api/questions/templates/all — tous les modèles publiés
 * ===========================================================
 *
 * Liste publique (sans authentification) qui remplit le cache des modèles du
 * navigateur (`questionTemplatesCache`) : catalogue Automaths, panier, test.
 * Elle porte aussi l'arbre des notions (nœuds non archivés, colonnes du
 * rangement seulement), qui range le catalogue : même cache, une seule requête.
 * Et le programme : les points non archivés de tous les niveaux (`points`, pour
 * la vue « Programme » du catalogue) et les points de chaque modèle publié
 * (`templatePoints`, ids ; la recherche y lit leurs intitulés). Leur lecture en
 * échec ne prive pas du catalogue : il est servi sans eux.
 *
 * Gardée 5 min par Vercel (`Vercel-CDN-Cache-Control`), puis servie périmée
 * pendant qu'il la relit en arrière-plan : la base n'est plus relue à chaque
 * visite. Le navigateur, lui, la relit toujours (`max-age=0`, rien d'autre :
 * un `stale-while-revalidate` dans `Cache-Control` lui resservait une liste
 * périmée, E85 ; Vercel le retirait en prod, pas le serveur de dev). Un
 * modèle tout juste publié (ou dépublié) l'est pour les élèves en 5 à 10 min ;
 * l'onglet qui vient de l'éditer contourne le cache (`?frais=…`, cf.
 * `questionTemplatesCache.invalidate()`).
 *
 * ⚠️ Une réponse en cache est servie à TOUS les visiteurs : elle est lue par un
 * client ANONYME, jamais par la session de l'appelant. Un échec répond 500,
 * sans en-tête de cache (une liste vide ne doit pas être servie 5 min).
 *
 * Les cas de test des modèles (`test_specs`, ~31 % du poids) ne sont pas lus :
 * seul l'éditeur s'en sert, et il charge le modèle complet par son id. Type de
 * la liste côté navigateur : `CatalogueTemplate`.
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerLogger } from '#lib/utils/logger.ts';
import { readAllRows } from '#lib/server/read-all-rows.ts';
import { createAnonymousSupabase } from '#lib/server/anonymous-supabase.ts';
import { TEMPLATE_COLUMNS } from '#lib/server/question-template-columns.ts';
import type { CatalogueProgrammePoint } from '#lib/questions/catalogue-programme.ts';

/** Colonnes de l'arbre dont le catalogue a besoin (`CatalogueNode`) */
const NODE_COLUMNS = 'id, kind, name, parent_id, position';

/** Colonnes d'un point du programme dont le catalogue a besoin (`CatalogueProgrammePoint`) */
const POINT_COLUMNS = 'id, name, grade, rubrique, display_order, node_id';

/** Points du programme, et ids des points de chaque modèle publié */
interface Programme {
	points: CatalogueProgrammePoint[];
	templatePoints: Record<string, string[]>;
}

const logger = createServerLogger('api/questions/templates/all/+server');

/** Navigateur : relit à chaque fois (le cache de Vercel répond vite) */
const CACHE_CONTROL = 'public, max-age=0';

/**
 * Cache de Vercel seul (il ne transmet pas cet en-tête) : 5 min, puis servie
 * périmée (5 min au plus) pendant la relecture ; un modèle dépublié (réponse
 * fausse…) disparaît en 10 min au pire.
 */
const VERCEL_CDN_CACHE_CONTROL = 'max-age=300, stale-while-revalidate=300';

export const GET: RequestHandler = async ({ setHeaders }) => {
	const supabase = createAnonymousSupabase();

	// Tous les modèles publiés, et l'arbre qui les range, page par page
	// (PostgREST tronque à 1000 lignes). Lus en parallèle, pas au même instant :
	// un nœud créé entre les deux lectures laisse ses modèles « Non classés »
	// jusqu'à la prochaine relecture (5 à 10 min), sans en perdre aucun.
	let templates;
	let nodes;
	try {
		[templates, nodes] = await Promise.all([
			readAllRows(
				(from, to) =>
					supabase
						.from('question_templates')
						.select(TEMPLATE_COLUMNS)
						.eq('status', 'published')
						.order('id')
						.range(from, to),
				'des modèles publiés'
			),
			readAllRows(
				(from, to) =>
					supabase
						.from('classification_nodes')
						.select(NODE_COLUMNS)
						.is('archived_at', null)
						.order('id')
						.range(from, to),
				"de l'arbre des notions"
			)
		]);
	} catch (readError) {
		logger.error('[GET /api/questions/templates/all] Error fetching templates:', readError);
		throw error(500, 'Impossible de charger les modèles');
	}

	// Colonnes jointes en une chaîne : PostgREST ne type pas les lignes, on lit l'id à la main
	const publishedIds = new Set(templates.flatMap((row: unknown) => rowId(row) ?? []));
	const { points, templatePoints } = await readProgramme(supabase, publishedIds);

	setHeaders({
		'cache-control': CACHE_CONTROL,
		'vercel-cdn-cache-control': VERCEL_CDN_CACHE_CONTROL
	});
	return Response.json({ templates, nodes, points, templatePoints });
};

/** `id` d'une ligne lue, ou `null` */
function rowId(row: unknown): string | null {
	return typeof row === 'object' && row !== null && 'id' in row && typeof row.id === 'string'
		? row.id
		: null;
}

/**
 * Points non archivés (avec un niveau) et liens des modèles publiés vers eux
 * (la RLS d'`anon` ne rend que les liens des modèles publiés). Lecture en
 * échec : programme vide, la recherche porte alors sur les titres et les
 * notions seulement, et la vue « Programme » ne s'affiche pas.
 */
async function readProgramme(
	supabase: ReturnType<typeof createAnonymousSupabase>,
	publishedIds: ReadonlySet<string>
): Promise<Programme> {
	try {
		const [links, rows] = await Promise.all([
			readAllRows(
				(from, to) =>
					supabase
						.from('question_template_points')
						.select('template_id, point_id')
						// Tri stable (clé du lien) : `readAllRows` lit page par page
						.order('template_id')
						.order('point_id')
						.range(from, to),
				'des points des modèles'
			),
			readAllRows(
				(from, to) =>
					supabase
						.from('curriculum_points')
						.select(POINT_COLUMNS)
						.is('archived_at', null)
						.not('grade', 'is', null)
						.order('id')
						.range(from, to),
				'des points du programme'
			)
		]);
		const points = rows.flatMap((p) => (p.grade === null ? [] : [{ ...p, grade: p.grade }]));
		const pointIds = new Set(points.map((p) => p.id));
		const templatePoints: Record<string, string[]> = {};
		for (const link of links) {
			// La RLS ne rend que les liens des publiés ; le filtre le garantit aussi
			// si la lecture passait un jour par un autre client
			if (!pointIds.has(link.point_id) || !publishedIds.has(link.template_id)) continue;
			(templatePoints[link.template_id] ??= []).push(link.point_id);
		}
		return { points, templatePoints };
	} catch (readError) {
		logger.warn('[GET /api/questions/templates/all] Programme illisible :', readError);
		return { points: [], templatePoints: {} };
	}
}
