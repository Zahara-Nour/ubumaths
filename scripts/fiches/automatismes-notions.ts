/**
 * Catégorie et notions d'une fiche d'automatismes (ADR 0011, ADR 0041)
 * ===================================================================
 *
 * Les scripts `scripts/create-automatismes-*.ts` fabriquent une fiche d'automatismes ;
 * ils posent eux-mêmes la catégorie « Automatismes » et les notions de la fiche
 * (décidé par David le 2026-11-19, chantier categorie-fiche). Le titre reste libre
 * (« Automatismes : nombres (1) ») : le numéro de la série compte.
 *
 * Partie pure (`problemesNotions`) testée ; les deux fonctions de lecture et
 * d'écriture vérifient chaque réponse de la base.
 */
import type { createClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import type { WorksheetCategory } from '#lib/worksheets/worksheet-title.ts';

// ============================================================================
// Types
// ============================================================================

type Client = ReturnType<typeof createClient<Database>>;

/** Nœud de l'arbre, juste ce qu'il faut pour le vérifier */
export interface NoeudLu {
	name: string;
	kind: string;
	archived: boolean;
}

// ============================================================================
// Constantes
// ============================================================================

export const CATEGORIE_AUTOMATISMES: WorksheetCategory = 'automatisms';

/** On classe sous des notions ou sous-notions, jamais sous une branche (ADR 0041) */
const KINDS_ACCEPTES = new Set(['notion', 'subnotion']);

// ============================================================================
// Functions
// ============================================================================

/** Ce qui empêche de poser ces notions ; liste vide = rien */
export function problemesNotions(notions: string[], noeuds: Map<string, NoeudLu>): string[] {
	if (notions.length === 0) return ['aucune notion'];
	const problemes: string[] = [];
	const vues = new Set<string>();
	for (const id of notions) {
		if (vues.has(id)) {
			problemes.push(`notion en double : ${id}`);
			continue;
		}
		vues.add(id);
		const noeud = noeuds.get(id);
		if (!noeud) problemes.push(`nœud introuvable : ${id}`);
		else if (!KINDS_ACCEPTES.has(noeud.kind))
			problemes.push(`« ${noeud.name} » n’est pas une notion`);
		else if (noeud.archived) problemes.push(`notion archivée : « ${noeud.name} »`);
	}
	return problemes;
}

/** Lit les notions dans l'arbre et les vérifie ; rend leurs noms, dans l'ordre */
export async function lireNotions(supabase: Client, notions: string[]): Promise<string[]> {
	const { data, error } = await supabase
		.from('classification_nodes')
		.select('id, name, kind, archived_at')
		.in('id', notions);
	if (error) throw new Error(`Lecture des notions impossible : ${error.message}`);
	const noeuds = new Map<string, NoeudLu>(
		data.map((n) => [n.id, { name: n.name, kind: n.kind, archived: n.archived_at !== null }])
	);
	const problemes = problemesNotions(notions, noeuds);
	if (problemes.length > 0) throw new Error(`Notions refusées : ${problemes.join(' ; ')}`);
	return notions.map((id) => noeuds.get(id)!.name);
}

/** Pose les notions de la fiche, dans l'ordre d'impression ; chaque ligne relue */
export async function poserNotions(
	supabase: Client,
	ficheId: string,
	notions: string[]
): Promise<void> {
	const { data, error } = await supabase
		.from('worksheet_classifications')
		.insert(notions.map((node_id, position) => ({ worksheet_id: ficheId, node_id, position })))
		.select('node_id');
	if (error || data?.length !== notions.length)
		throw new Error(
			`Notions refusées (${data?.length ?? 0}/${notions.length}) : ${error?.message ?? ''}`
		);
}
