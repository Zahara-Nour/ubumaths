/**
 * Lecture de l'arbre des notions (nœuds non archivés)
 * ===================================================
 *
 * Alimente le champ « Rangé dans » de l'éditeur de modèle, les filtres de la
 * liste admin et les chemins des étiquettes. Lu page par page : PostgREST
 * tronque à 1000 lignes.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { TreeNode } from '$lib/questions/classification-tree';
import { readAllRows } from '$lib/server/read-all-rows';

/** @throws si une page de la lecture échoue : jamais d'arbre partiel */
export async function loadActiveNodes(supabase: SupabaseClient<Database>): Promise<TreeNode[]> {
	return readAllRows(
		(from, to) =>
			supabase
				.from('classification_nodes')
				.select('id, kind, name, parent_id, position')
				.is('archived_at', null)
				.order('id')
				.range(from, to),
		"de l'arbre des notions"
	);
}
