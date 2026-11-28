/**
 * Catégorie, notions et titre d'une fiche : lecture et enregistrement (ADR 0041)
 * ==============================================================================
 *
 * La route `PUT /api/worksheets/[id]` enregistre en deux temps :
 * 1. `prepareClassification` lit ce qu'il faut, vérifie les notions (connues,
 *    sans doublon) et compose le titre ; rien n'est écrit, un refus rend un
 *    message ;
 * 2. `applyClassification` écrit : notions retirées, PUIS fiche mise à jour
 *    (catégorie, type), PUIS notions écrites. Une fiche a autant de notions
 *    qu'on veut, quels que soient son type et sa catégorie (ADR 0041, amendé
 *    le 2026-11-19 : la garde « une seule notion » de la base est retirée).
 *
 * `title` reste toujours rempli : sans titre libre, le titre composé
 * (« Suites · Entraînement technique ») y est réécrit à chaque enregistrement,
 * ce qui suit aussi une notion renommée. Deux notions ou plus d'une même
 * branche → la branche en titre (« Suites · Entraînement technique », ADR 0041
 * amendé le 2026-11-20) : la branche se lit dans l'arbre, lisible de tous.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, TablesUpdate } from '#lib/types/database.ts';
import {
	WORKSHEET_TYPES,
	type WorksheetClassificationView,
	type WorksheetType
} from '#lib/types/worksheets.ts';
import {
	branchNodeOf,
	composedTitle,
	englishName,
	isWorksheetCategory,
	type TitleNotion,
	type TitleTreeNode,
	type WorksheetCategory
} from '#lib/worksheets/worksheet-title.ts';

// ============================================================================
// Types
// ============================================================================

type SB = SupabaseClient<Database>;

/** La branche d'une notion : son nom, et son nom anglais (ADR 0043) */
export interface BranchName {
	name: string;
	name_en: string | null;
}

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

/** Niveaux lus au-dessus d'une notion pour trouver sa branche (sous-notion → notion → branche) */
const TREE_LEVELS = 3;

/** Longueur maximale d'un titre (contrainte `worksheets_title_check`) */
const TITLE_MAX_LENGTH = 255;

const MESSAGES = {
	categoryType: 'Seule une fiche d’exercices a une catégorie.',
	unknownNode: 'Choisis une notion ou une sous-notion de l’arbre.',
	duplicate: 'Une même notion ne peut pas être choisie deux fois.',
	titleTooLong:
		'Le titre composé de ces notions est trop long (255 caractères au plus) : retire une notion, ou écris un titre libre.',
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
 * La branche de chaque nœud demandé, avec son nom anglais, lue dans l'arbre en
 * remontant les parents (une requête par niveau, trois au plus). Une seule
 * notion a aussi besoin de sa branche : son nom anglais titre la fiche anglaise
 * quand la notion n'a pas le sien (V111).
 *
 * @throws si la lecture échoue
 */
export async function loadBranches(
	supabase: SB,
	nodeIds: readonly string[]
): Promise<Map<string, BranchName | null>> {
	const branches = new Map<string, BranchName | null>();
	if (nodeIds.length === 0) return branches;

	const tree = new Map<string, TitleTreeNode>();
	let toRead = [...new Set(nodeIds)];
	for (let level = 0; level < TREE_LEVELS && toRead.length > 0; level++) {
		const { data, error } = await supabase
			.from('classification_nodes')
			.select('id, name, kind, parent_id, translations')
			.in('id', toRead);
		if (error) throw new Error(`arbre des notions illisible : ${error.message}`);
		for (const node of data ?? []) tree.set(node.id, node);
		toRead = (data ?? [])
			.filter((node) => node.kind !== 'branch' && node.parent_id && !tree.has(node.parent_id))
			.map((node) => node.parent_id as string);
	}
	for (const id of nodeIds) {
		const branch = branchNodeOf(id, tree);
		branches.set(
			id,
			branch ? { name: branch.name, name_en: englishName(branch.translations) } : null
		);
	}
	return branches;
}

/**
 * Ajoute à chaque notion le nom de sa branche (`loadBranches`), et les noms
 * anglais de la notion (tiré de ses traductions) et de sa branche (ADR 0043).
 * Pour un chemin qui imprime sans écrire (lien de partage) : une lecture en
 * échec laisse les notions sans branche, le titre imprimé reprend alors les
 * notions.
 */
export async function withBranches<T extends { node_id: string; translations?: unknown }>(
	supabase: SB,
	notions: T[]
): Promise<
	Array<
		Omit<T, 'translations'> & {
			branch?: string | null;
			name_en: string | null;
			branch_en?: string | null;
		}
	>
> {
	// Le nom anglais seul : le jsonb brut du nœud ne part pas vers la page (lien public)
	const named = notions.map(({ translations, ...notion }) => ({
		...notion,
		name_en: englishName(translations)
	}));
	try {
		const branches = await loadBranches(
			supabase,
			notions.map((notion) => notion.node_id)
		);
		return named.map((notion) => {
			const branch = branches.get(notion.node_id) ?? null;
			return { ...notion, branch: branch?.name ?? null, branch_en: branch?.name_en ?? null };
		});
	} catch {
		return named;
	}
}

/**
 * Les notions d'une fiche avec leur nom et leur branche, dans l'ordre
 * d'impression. Lues sous la RLS de l'appelant : on voit les notions d'une
 * fiche quand on voit la fiche ; l'arbre est lisible de tous.
 *
 * @throws si la lecture échoue : jamais de liste partielle
 */
export async function loadWorksheetClassifications(
	supabase: SB,
	worksheetId: string
): Promise<WorksheetClassificationView[]> {
	const { data, error } = await supabase
		.from('worksheet_classifications')
		.select('node_id, position, node:classification_nodes (name, kind, translations)')
		.eq('worksheet_id', worksheetId)
		.order('position', { ascending: true });
	if (error) throw new Error(`notions de la fiche illisibles : ${error.message}`);

	const rows = data ?? [];
	// Arbre illisible : la fiche s'affiche quand même, le titre reprend les notions
	const branches = await loadBranches(
		supabase,
		rows.map((row) => row.node_id)
	).catch(() => new Map<string, BranchName | null>());
	return rows
		.map((row) => {
			const branch = branches.get(row.node_id) ?? null;
			return {
				node_id: row.node_id,
				name: row.node?.name ?? '',
				kind: row.node?.kind ?? '',
				branch: branch?.name ?? null,
				name_en: englishName(row.node?.translations),
				branch_en: branch?.name_en ?? null,
				position: row.position
			};
		})
		.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'fr'));
}

/** Nom et branche des nœuds demandés ; `null` si l'un manque ou n'est pas une notion */
async function titleNotions(supabase: SB, ids: string[]): Promise<Map<string, TitleNotion> | null> {
	if (ids.length === 0) return new Map();
	const { data, error } = await supabase
		.from('classification_nodes')
		.select('id, name, kind')
		.in('id', ids);
	if (error) throw new Error(`arbre des notions illisible : ${error.message}`);
	const names = new Map(
		(data ?? []).filter((n) => CLASSIFIABLE_KINDS.has(n.kind)).map((n) => [n.id, n.name])
	);
	if (!ids.every((id) => names.has(id))) return null;
	const branches = await loadBranches(supabase, ids);
	return new Map(
		ids.map((id) => [id, { name: names.get(id) ?? '', branch: branches.get(id)?.name ?? null }])
	);
}

/**
 * Prépare l'enregistrement : la fiche visée (type, catégorie, case, notions),
 * les notions (connues, sans doublon), le titre composé. N'écrit rien.
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

	// Noms relus en base (et non pris du client) : le titre composé suit l'arbre
	const known = await titleNotions(supabase, notions);
	if (!known) return { ok: false, message: MESSAGES.unknownNode };
	const ordered = notions.map((id) => known.get(id) ?? { name: '' });

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
		// Titre devenu libre : les notions en toutes lettres, pas leur branche, car
		// une évaluation n'imprime que son titre
		const notionsTitle = composedTitle(
			null,
			ordered.map((notion) => ({ name: notion.name }))
		);
		if (request.title === undefined && notionsTitle !== '') update.title = notionsTitle;
	}

	if (type === 'worksheet' && !customTitle) {
		const title = composedTitle(category, ordered);
		if (title === '') return { ok: false, message: MESSAGES.emptyTitle };
		if (title.length > TITLE_MAX_LENGTH) return { ok: false, message: MESSAGES.titleTooLong };
		update.title = title;
	}

	return { ok: true, update, notions: request.notions ?? null, current };
}

/**
 * Écrit : notions retirées, fiche mise à jour (`updateWorksheet`, par la route), notions
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
				throw new Error(`notions non retirées : ${error?.message ?? 'refus silencieux'}`);
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
