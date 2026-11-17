/**
 * GET /api/questions/templates/all — tous les modèles publiés
 * ===========================================================
 *
 * Liste publique (sans authentification) qui remplit le cache des modèles du
 * navigateur (`questionTemplatesCache`) : catalogue Automaths, panier, test.
 * Elle porte aussi l'arbre des notions (nœuds non archivés, colonnes du
 * rangement seulement), qui range le catalogue : même cache, une seule requête.
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
import { createServerLogger } from '$lib/utils/logger';
import { readAllRows } from '$lib/server/read-all-rows';
import { createAnonymousSupabase } from '$lib/server/anonymous-supabase';
import type { Database } from '$lib/types/database';

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

	setHeaders({ 'cache-control': CACHE_CONTROL });
	return json({ templates, nodes });
};
