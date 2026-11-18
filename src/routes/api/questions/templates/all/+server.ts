/**
 * GET /api/questions/templates/all — tous les modèles publiés
 * ===========================================================
 *
 * Liste publique (sans authentification) qui remplit le cache des modèles du
 * navigateur (`questionTemplatesCache`) : catalogue Automaths, panier, test.
 * Elle porte aussi l'arbre des notions (nœuds non archivés, colonnes du
 * rangement seulement), qui range le catalogue : même cache, une seule requête.
 * Et, pour la recherche du catalogue, les intitulés des points du programme de
 * chaque modèle (`pointNames`, points archivés exclus) ; leur lecture en échec
 * ne prive pas du catalogue : il est servi sans eux.
 *
 * Gardée 5 min par Vercel (`s-maxage=300`), puis servie périmée pendant qu'il
 * la relit en arrière-plan : la base n'est plus relue à chaque visite. Un
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

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerLogger } from '#lib/utils/logger.ts';
import { readAllRows } from '#lib/server/read-all-rows.ts';
import { createAnonymousSupabase } from '#lib/server/anonymous-supabase.ts';
import type { Database } from '#lib/types/database.ts';

type TemplateColumn = keyof Database['public']['Tables']['question_templates']['Row'];

/** Colonnes du modèle que la liste envoie : toutes, sauf les cas de test */
const TEMPLATE_COLUMN_LIST = [
	'id',
	'title',
	'description',
	'type',
	'status',
	'grades',
	'level',
	'classification_node_id',
	'shared',
	'variations',
	'options',
	'precision',
	'delay',
	'default_display_options',
	'exercise_instruction',
	'created_at',
	'updated_at',
	'created_by'
] as const satisfies readonly TemplateColumn[];

/**
 * Garde de compilation : une colonne ajoutée à `question_templates` doit être
 * rangée ici, dans la liste ou parmi les exclues — sinon `pnpm check` échoue.
 */
type ForgottenColumn = Exclude<
	TemplateColumn,
	(typeof TEMPLATE_COLUMN_LIST)[number] | 'test_specs'
>;
const NO_FORGOTTEN_COLUMN: [ForgottenColumn] extends [never] ? true : ForgottenColumn = true;
void NO_FORGOTTEN_COLUMN;

const TEMPLATE_COLUMNS = TEMPLATE_COLUMN_LIST.join(', ');

/** Colonnes de l'arbre dont le catalogue a besoin (`CatalogueNode`) */
const NODE_COLUMNS = 'id, kind, name, parent_id, position';

/** Intitulés des points du programme, par modèle (recherche du catalogue) */
type PointNames = Record<string, string[]>;

const logger = createServerLogger('api/questions/templates/all/+server');

/**
 * 5 min chez Vercel, puis servie périmée (5 min au plus) pendant la relecture :
 * un modèle dépublié (réponse fausse…) disparaît en 10 min au pire.
 */
const CACHE_CONTROL = 'public, max-age=0, s-maxage=300, stale-while-revalidate=300';

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
	const pointNames = await readPointNames(supabase, publishedIds);

	setHeaders({ 'cache-control': CACHE_CONTROL });
	return json({ templates, nodes, pointNames });
};

/** `id` d'une ligne lue, ou `null` */
function rowId(row: unknown): string | null {
	return typeof row === 'object' && row !== null && 'id' in row && typeof row.id === 'string'
		? row.id
		: null;
}

/**
 * Intitulés des points non archivés de chaque modèle publié (la RLS d'`anon`
 * ne rend que les liens des modèles publiés). Lecture en échec : aucun
 * intitulé, la recherche porte alors sur les titres et les notions seulement.
 */
async function readPointNames(
	supabase: ReturnType<typeof createAnonymousSupabase>,
	publishedIds: ReadonlySet<string>
): Promise<PointNames> {
	try {
		const [links, points] = await Promise.all([
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
						.select('id, name')
						.is('archived_at', null)
						.order('id')
						.range(from, to),
				'des points du programme'
			)
		]);
		const nameById = new Map(points.map((p) => [p.id, p.name]));
		const pointNames: PointNames = {};
		for (const link of links) {
			// La RLS ne rend que les liens des publiés ; le filtre le garantit aussi
			// si la lecture passait un jour par un autre client
			const name = nameById.get(link.point_id);
			if (!name || !publishedIds.has(link.template_id)) continue;
			(pointNames[link.template_id] ??= []).push(name);
		}
		return pointNames;
	} catch (readError) {
		logger.warn('[GET /api/questions/templates/all] Points des modèles illisibles :', readError);
		return {};
	}
}
