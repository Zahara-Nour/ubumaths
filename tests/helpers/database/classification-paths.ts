/**
 * Chemins de l'arbre des notions « branche > notion > sous-notion », lus en base
 * ============================================================================
 *
 * Les migrations de données de l'arbre désignent les nœuds par leur chemin ; les tests qui
 * les rejouent ont besoin des deux sens : identifiant → chemin (pour comparer un état à une
 * fixture) et chemin → identifiant (pour poser un décor). Les nœuds archivés sont compris.
 */
import type { Client } from 'pg';

// ============================================================================
// TYPES
// ============================================================================

export interface NodePath {
	path: string;
	kind: string;
	archived: boolean;
	/** Nom de la branche racine (les suites « itest- » ont leurs propres racines). */
	root: string;
}

// ============================================================================
// FONCTIONS
// ============================================================================

/** Tous les nœuds, archivés compris : identifiant → chemin, genre, archivage, racine. */
export async function readNodePaths(pg: Client): Promise<Map<string, NodePath>> {
	const { rows } = await pg.query<{
		id: string;
		parent_id: string | null;
		name: string;
		kind: string;
		archived_at: Date | null;
	}>('select id, parent_id, name, kind, archived_at from public.classification_nodes');
	const byId = new Map(rows.map((r) => [r.id, r]));
	const paths = new Map<string, NodePath>();
	for (const row of rows) {
		const parts: string[] = [];
		let root = row;
		for (
			let node: typeof row | undefined = row;
			node;
			node = node.parent_id ? byId.get(node.parent_id) : undefined
		) {
			parts.unshift(node.name);
			root = node;
		}
		paths.set(row.id, {
			path: parts.join(' > '),
			kind: row.kind,
			archived: row.archived_at !== null,
			root: root.name
		});
	}
	return paths;
}

/** Résout un chemin en identifiant de nœud (archivés compris) ; échoue s'il est introuvable. */
export async function nodeIdByPath(pg: Client, path: string): Promise<string> {
	for (const [id, node] of await readNodePaths(pg)) {
		if (node.path === path) return id;
	}
	throw new Error(`chemin introuvable dans l'arbre : ${path}`);
}
