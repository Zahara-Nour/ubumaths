/**
 * Thème du programme d'une question, pour le bonus « nouveau thème » du Palotin
 * ==============================================================================
 *
 * Le thème d'une réponse est la BRANCHE de l'arbre des notions où se range le
 * point que valide la question : `question_template_points` → `curriculum_points`
 * → nœud (sous-notion ou notion) → branche. On retient l'IDENTIFIANT de la
 * branche (stable, contrairement à son nom) ; il est rangé tel quel dans
 * `student_buddies.themes_explored`.
 *
 * Une question qui valide des points de plusieurs branches en reçoit UNE seule,
 * toujours la même (le plus petit identifiant) : la réponse garde un seul thème,
 * comme le calcul d'XP l'attend, et le choix ne dépend pas de l'ordre de lecture.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { createServerLogger } from '$lib/utils/logger';
import { loadNodesWithAncestors } from '$lib/server/programme-tree';
import { placeOfNode } from '$lib/utils/programme-tree';

const logger = createServerLogger('server/buddy-themes');

/**
 * Branche du programme de chaque question, en deux lectures pour toute la séance
 * (les tags, puis les nœuds et leurs ancêtres).
 *
 * Une question sans point neuf est absente de la carte rendue. Une panne de
 * lecture ne lève pas : elle rend une carte vide (aucun bonus de thème), le gain
 * de base reste dû.
 */
export async function fetchTemplateThemeIds(
	supabase: SupabaseClient<Database>,
	templateIds: string[]
): Promise<Map<string, string>> {
	const themes = new Map<string, string>();
	if (templateIds.length === 0) return themes;

	// Jointure à gauche (pas de `!inner`) : un point masqué ne fait pas
	// disparaître la ligne, il laisse seulement la question sans thème.
	const { data, error } = await supabase
		.from('question_template_points')
		.select('template_id, curriculum_points(node_id)')
		.in('template_id', templateIds);

	if (error) {
		logger.error('Thèmes des questions illisibles :', error);
		return themes;
	}

	const links = (data ?? []).flatMap((link) => {
		const nodeId = link.curriculum_points?.node_id;
		return nodeId ? [{ templateId: link.template_id, nodeId }] : [];
	});
	if (links.length === 0) return themes;

	let nodeById;
	try {
		const nodes = await loadNodesWithAncestors(
			supabase,
			links.map((l) => l.nodeId)
		);
		nodeById = new Map(nodes.map((n) => [n.id, n]));
	} catch (err) {
		logger.error('Arbre des notions illisible :', err);
		return themes;
	}

	for (const { templateId, nodeId } of links) {
		const branchId = placeOfNode(nodeId, nodeById)?.branch.id;
		if (!branchId) continue;
		const current = themes.get(templateId);
		if (current === undefined || branchId < current) themes.set(templateId, branchId);
	}

	return themes;
}
