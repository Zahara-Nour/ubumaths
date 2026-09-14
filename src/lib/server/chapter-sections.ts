/**
 * Sections d'un chapitre — opérations serveur
 *
 * Une section range les ressources d'un chapitre par MOMENT du cours plutôt
 * que par type. Elle appartient à UN chapitre : renommable, réordonnable,
 * supprimable sans effet sur les autres chapitres.
 *
 * ⚠️ Toutes ces fonctions passent par le client de la requête (`locals.supabase`),
 * donc SOUS RLS. Aucune ne doit être appelée avec le service role : la policy
 * professeur est la garde réelle, ces fonctions ne font que rendre les erreurs
 * lisibles.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { SectionContentKind } from './validation/chapter-sections';

type ChapterSection = Database['public']['Tables']['chapter_sections']['Row'];

/**
 * Les quatre tables qu'une section peut ranger.
 *
 * ⚠️ Miroir du tableau de la migration `20260915260000` : ajouter un type de
 * contenu demande de toucher les deux, sinon le nouveau type ne sera jamais
 * rangeable et rien ne le signalera.
 */
const CONTENT_TABLES: Record<SectionContentKind, string> = {
	document: 'chapter_documents',
	exercise: 'chapter_exercises',
	checklistItem: 'chapter_checklist_items',
	worksheet: 'chapter_worksheets'
};

export type SectionOrderUpdate = { id: string; displayOrder: number };

export type SectionAssignment = {
	kind: SectionContentKind;
	id: string;
	sectionOrder: number;
};

/**
 * Liste les sections d'un chapitre, dans l'ordre du professeur.
 */
export async function listSections(
	chapterId: string,
	supabase: SupabaseClient<Database>
): Promise<{ data: ChapterSection[]; error: Error | null }> {
	const { data, error } = await supabase
		.from('chapter_sections')
		.select('*')
		.eq('chapter_id', chapterId)
		.order('display_order');

	if (error) {
		console.error('[listSections] Erreur :', error);
		return { data: [], error: new Error(error.message) };
	}

	return { data: data ?? [], error: null };
}

/**
 * Crée une section, placée en dernier si aucun ordre n'est donné.
 */
export async function createSection(
	chapterId: string,
	title: string,
	displayOrder: number | undefined,
	supabase: SupabaseClient<Database>
): Promise<{ data: ChapterSection | null; error: Error | null }> {
	let ordre = displayOrder;

	if (ordre === undefined) {
		// Placée après la dernière. `maybeSingle` et non `single` : un chapitre
		// dont toutes les sections ont été supprimées est un cas normal, pas une
		// panne.
		const { data: derniere, error: erreurOrdre } = await supabase
			.from('chapter_sections')
			.select('display_order')
			.eq('chapter_id', chapterId)
			.order('display_order', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (erreurOrdre) {
			console.error('[createSection] Ordre illisible :', erreurOrdre);
			return { data: null, error: new Error(erreurOrdre.message) };
		}

		ordre = (derniere?.display_order ?? 0) + 1;
	}

	const { data, error } = await supabase
		.from('chapter_sections')
		.insert({ chapter_id: chapterId, title, display_order: ordre })
		.select('*')
		.single();

	if (error) {
		console.error('[createSection] Erreur :', error);
		return { data: null, error: new Error(error.message) };
	}

	return { data, error: null };
}

/**
 * Renomme une section. Le chapitre est exigé en plus de l'identifiant : sans
 * lui, un identifiant deviné renommerait la section d'un autre chapitre.
 */
export async function renameSection(
	chapterId: string,
	sectionId: string,
	title: string,
	supabase: SupabaseClient<Database>
): Promise<{ data: ChapterSection | null; error: Error | null }> {
	const { data, error } = await supabase
		.from('chapter_sections')
		.update({ title })
		.eq('id', sectionId)
		.eq('chapter_id', chapterId)
		.select('*')
		.maybeSingle();

	if (error) {
		console.error('[renameSection] Erreur :', error);
		return { data: null, error: new Error(error.message) };
	}

	return { data, error: null };
}

/**
 * Supprime une section.
 *
 * ⚠️ Les ressources qu'elle contenait ne sont PAS supprimées : la clé
 * étrangère est `on delete set null (section_id)`, elles retombent en
 * « Non classé ». C'est la garde qui empêche un clic d'effacer le travail du
 * professeur, et elle vit en base, pas ici.
 */
export async function deleteSection(
	chapterId: string,
	sectionId: string,
	supabase: SupabaseClient<Database>
): Promise<{ data: { id: string } | null; error: Error | null }> {
	const { data, error } = await supabase
		.from('chapter_sections')
		.delete()
		.eq('id', sectionId)
		.eq('chapter_id', chapterId)
		.select('id')
		.maybeSingle();

	if (error) {
		console.error('[deleteSection] Erreur :', error);
		return { data: null, error: new Error(error.message) };
	}

	return { data, error: null };
}

/**
 * Réordonne les sections d'un chapitre.
 *
 * Séquentiel et non transactionnel, comme `reorderChapters` : un ordre
 * partiellement appliqué reste un ordre valide, et le professeur est seul.
 */
export async function reorderSections(
	chapterId: string,
	orderUpdates: SectionOrderUpdate[],
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }> {
	for (const update of orderUpdates) {
		const { error } = await supabase
			.from('chapter_sections')
			.update({ display_order: update.displayOrder })
			.eq('id', update.id)
			.eq('chapter_id', chapterId);

		if (error) {
			console.error('[reorderSections] Erreur :', error);
			return { error: new Error(error.message) };
		}
	}

	return { error: null };
}

/**
 * Range des ressources dans une section (ou les en sort si `sectionId` vaut
 * `null`), et fixe leur ordre à l'intérieur.
 *
 * ⚠️ `section_order` et non `display_order` : les quatre types vivent dans quatre
 * tables, et leur `display_order` est un ordre PAR TYPE. Seul `section_order`
 * traverse les tables.
 *
 * La clé étrangère composite refuse une section d'un autre chapitre — c'est
 * elle qui garantit l'invariant, le `.eq('chapter_id', …)` ci-dessous ne fait
 * que rendre l'erreur lisible et empêcher de toucher la ressource d'un voisin.
 */
export async function assignToSection(
	chapterId: string,
	sectionId: string | null,
	items: SectionAssignment[],
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }> {
	for (const item of items) {
		const table = CONTENT_TABLES[item.kind];

		const { error } = await supabase
			.from(table as never)
			.update({ section_id: sectionId, section_order: item.sectionOrder } as never)
			.eq('id', item.id)
			.eq('chapter_id', chapterId);

		if (error) {
			console.error(`[assignToSection] ${table} :`, error);
			return { error: new Error(error.message) };
		}
	}

	return { error: null };
}

/**
 * Range UNE ressource qui vient d'être créée, à la fin d'une section.
 *
 * ⚠️ Le rang se calcule sur les QUATRE tables, pas seulement sur celle de la
 * ressource : une section les mélange, et compter sur une seule donnerait le
 * même `section_order` à deux ressources de types différents. Elles
 * s'afficheraient alors dans un ordre arbitraire, que le professeur ne
 * pourrait pas corriger autrement qu'en les déplaçant toutes.
 */
export async function placeInSection(
	chapterId: string,
	sectionId: string,
	kind: SectionContentKind,
	itemId: string,
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }> {
	let dernier = -1;

	for (const table of Object.values(CONTENT_TABLES)) {
		// `maybeSingle` : une section encore vide pour ce type est le cas normal.
		const { data, error } = await supabase
			.from(table as never)
			.select('section_order')
			.eq('chapter_id', chapterId)
			.eq('section_id', sectionId)
			.order('section_order', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (error) {
			console.error(`[placeInSection] Rang suivant illisible (${table}) :`, error);
			return { error: new Error(error.message) };
		}

		const rang = (data as { section_order: number | null } | null)?.section_order;
		if (typeof rang === 'number' && rang > dernier) dernier = rang;
	}

	return assignToSection(
		chapterId,
		sectionId,
		[{ kind, id: itemId, sectionOrder: dernier + 1 }],
		supabase
	);
}
