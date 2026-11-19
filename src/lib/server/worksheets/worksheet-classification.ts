/**
 * Catégorie, notions et titre d'une fiche : lecture et enregistrement (ADR 0041)
 * ==============================================================================
 *
 * La route `PUT /api/worksheets/[id]` enregistre en deux temps :
 * 1. `prepareClassification` lit ce qu'il faut, applique la règle du nombre de
 *    notions et compose le titre ; rien n'est écrit, un refus rend un message ;
 * 2. `applyClassification` écrit dans l'ordre qui passe la garde de la base
 *    (trigger différé, vérifié à la fin de chaque requête) : notions en trop
 *    retirées, PUIS fiche mise à jour (catégorie, type), PUIS notions écrites.
 *    Dans l'autre ordre, passer de Révisions (trois notions) à Applications
 *    (une) serait refusé (23514).
 *
 * `title` reste toujours rempli : sans titre libre, le titre composé
 * (« Suites · Entraînement technique ») y est réécrit à chaque enregistrement,
 * ce qui suit aussi une notion renommée.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, TablesUpdate } from '#lib/types/database.ts';
import {
	WORKSHEET_TYPES,
	type WorksheetClassificationView,
	type WorksheetType
} from '#lib/types/worksheets.ts';
import {
	allowsSeveralNotions,
	composedTitle,
	isWorksheetCategory,
	type WorksheetCategory
} from '#lib/worksheets/worksheet-title.ts';

// ============================================================================
// Types
// ============================================================================

type SB = SupabaseClient<Database>;

/** Ce que la requête demande ; un champ absent n'est pas touché */
export interface ClassificationRequest {
	type?: WorksheetType;
	category?: WorksheetCategory | null;
	custom_title?: boolean;
	/** Identifiants des notions, dans l'ordre d'impression ; absent : inchangées */
	notions?: string[];
	/** Titre envoyé (gardé tel quel s'il est libre) */
	title?: string;
}

/** La fiche telle qu'elle est en base, avant la requête */
export interface ExistingClassification {
	id: string;
	type: string;
	category: string | null;
	custom_title: boolean;
}

export type ClassificationPlan =
	| {
			ok: true;
			/** Colonnes de `worksheets` à écrire (catégorie, case, titre composé) */
			update: Pick<TablesUpdate<'worksheets'>, 'category' | 'custom_title' | 'title'>;
			/** Notions à écrire, dans l'ordre ; `null` : inchangées */
			notions: string[] | null;
			/** Notions en base avant la requête */
			current: string[];
	  }
	| { ok: false; message: string };

// ============================================================================
// Constantes
// ============================================================================

/** Ce qu'une fiche peut porter : une notion ou une sous-notion, jamais une branche */
const CLASSIFIABLE_KINDS = new Set(['notion', 'subnotion']);

const MESSAGES = {
	oneNotion:
		'Une seule notion pour cette fiche : plusieurs notions seulement en Révisions et en Automatismes.',
	categoryType: 'Seule une fiche d’exercices a une catégorie.',
	unknownNode: 'Choisis une notion ou une sous-notion de l’arbre.',
	duplicate: 'Une même notion ne peut pas être choisie deux fois.',
	emptyTitle:
		'Sans titre libre, la fiche a besoin d’une notion ou d’une catégorie : choisis-en une, ou écris un titre.'
} as const;

// ============================================================================
// Fonctions
// ============================================================================

function asWorksheetType(value: string): WorksheetType {
	return WORKSHEET_TYPES.find((type) => type === value) ?? 'worksheet';
}

/**
 * Les notions d'une fiche avec leur nom, dans l'ordre d'impression. Lues sous
 * la RLS de l'appelant : on voit les notions d'une fiche quand on voit la fiche.
 *
 * @throws si la lecture échoue : jamais de liste partielle
 */
export async function loadWorksheetClassifications(
	supabase: SB,
	worksheetId: string
): Promise<WorksheetClassificationView[]> {
	const { data, error } = await supabase
		.from('worksheet_classifications')
		.select('node_id, position, node:classification_nodes (name, kind)')
		.eq('worksheet_id', worksheetId)
		.order('position', { ascending: true });
	if (error) throw new Error(`notions de la fiche illisibles : ${error.message}`);

	return (data ?? [])
		.map((row) => ({
			node_id: row.node_id,
			name: row.node?.name ?? '',
			kind: row.node?.kind ?? '',
			position: row.position
		}))
		.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'fr'));
}

/** Nom des nœuds demandés ; `null` si l'un manque ou n'est pas une notion */
async function notionNames(supabase: SB, ids: string[]): Promise<Map<string, string> | null> {
	if (ids.length === 0) return new Map();
	const { data, error } = await supabase
		.from('classification_nodes')
		.select('id, name, kind')
		.in('id', ids);
	if (error) throw new Error(`arbre des notions illisible : ${error.message}`);
	const names = new Map(
		(data ?? []).filter((n) => CLASSIFIABLE_KINDS.has(n.kind)).map((n) => [n.id, n.name])
	);
	return ids.every((id) => names.has(id)) ? names : null;
}

/**
 * Prépare l'enregistrement : la fiche visée (type, catégorie, case, notions),
 * la règle du nombre de notions, le titre composé. N'écrit rien.
 *
 * @throws si une lecture échoue (erreur serveur, pas un refus)
 */
export async function prepareClassification(
	supabase: SB,
	existing: ExistingClassification,
	request: ClassificationRequest
): Promise<ClassificationPlan> {
	const type = request.type ?? asWorksheetType(existing.type);
	const existingCategory = isWorksheetCategory(existing.category) ? existing.category : null;

	if (request.category && type !== 'worksheet')
		return { ok: false, message: MESSAGES.categoryType };
	const category =
		type !== 'worksheet'
			? null
			: request.category !== undefined
				? request.category
				: existingCategory;
	const customTitle = request.custom_title ?? existing.custom_title;

	const currentRows = await loadWorksheetClassifications(supabase, existing.id);
	const current = currentRows.map((row) => row.node_id);
	const notions = request.notions ?? current;
	if (new Set(notions).size !== notions.length) return { ok: false, message: MESSAGES.duplicate };
	if (notions.length > 1 && !allowsSeveralNotions(type, category)) {
		return { ok: false, message: MESSAGES.oneNotion };
	}

	// Noms relus en base (et non pris du client) : le titre composé suit l'arbre
	const names = await notionNames(supabase, notions);
	if (!names) return { ok: false, message: MESSAGES.unknownNode };

	const update: Extract<ClassificationPlan, { ok: true }>['update'] = {};
	if (category !== existingCategory) update.category = category;
	if (request.custom_title !== undefined) update.custom_title = request.custom_title;
	// Une fiche d'exercices au titre composé change de type : les autres types
	// n'ont pas de titre composé ni de catégorie (ADR 0041). Le titre devient
	// libre ; sans titre envoyé, celui des notions seules, sans la catégorie.
	const leavesExerciseSheet =
		type !== 'worksheet' && asWorksheetType(existing.type) === 'worksheet';
	if (leavesExerciseSheet && !customTitle) {
		update.custom_title = true;
		const notionsTitle = composedTitle(
			null,
			notions.map((id) => names.get(id) ?? '')
		);
		if (request.title === undefined && notionsTitle !== '') update.title = notionsTitle;
	}

	if (type === 'worksheet' && !customTitle) {
		const title = composedTitle(
			category,
			notions.map((id) => names.get(id) ?? '')
		);
		if (title === '') return { ok: false, message: MESSAGES.emptyTitle };
		update.title = title;
	}

	return { ok: true, update, notions: request.notions ?? null, current };
}

/**
 * Écrit dans l'ordre qui passe la garde de la base : notions en trop
 * retirées, fiche mise à jour (`updateWorksheet`, par la route), notions
 * écrites avec leur position. Chaque écriture est vérifiée (la RLS échoue en
 * silence).
 *
 * @throws si une écriture échoue ou ne touche pas les lignes attendues
 */
export async function applyClassification(
	supabase: SB,
	worksheetId: string,
	plan: Extract<ClassificationPlan, { ok: true }>,
	updateWorksheet: () => Promise<void>
): Promise<void> {
	const target = plan.notions;

	if (target) {
		const removed = plan.current.filter((id) => !target.includes(id));
		if (removed.length > 0) {
			const { data, error } = await supabase
				.from('worksheet_classifications')
				.delete()
				.eq('worksheet_id', worksheetId)
				.in('node_id', removed)
				.select('node_id');
			if (error || data?.length !== removed.length) {
				throw new Error(`notions en trop non retirées : ${error?.message ?? 'refus silencieux'}`);
			}
		}
	}

	await updateWorksheet();

	if (target && target.length > 0) {
		const { data, error } = await supabase
			.from('worksheet_classifications')
			.upsert(
				target.map((nodeId, position) => ({
					worksheet_id: worksheetId,
					node_id: nodeId,
					position
				})),
				{ onConflict: 'worksheet_id,node_id' }
			)
			.select('node_id');
		if (error || data?.length !== target.length) {
			throw new Error(`notions non écrites : ${error?.message ?? 'refus silencieux'}`);
		}
	}
}
