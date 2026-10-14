/**
 * Sections d'un chapitre — opérations serveur
 *
 * Une section range les ressources d'un chapitre par MOMENT du cours plutôt
 * que par type. Elle appartient à UN chapitre : renommable, réordonnable,
 * supprimable sans effet sur les autres chapitres.
 *
 * Depuis l'ADR 0029, un MODÈLE a aussi ses sections : chaque fonction prend un
 * propriétaire (`ContentOwner`), et une chaîne seule désigne un chapitre. Une
 * section du modèle renommée l'est dans chaque chapitre lié (la base recopie) ;
 * supprimée, elle reste aux chapitres comme section propre.
 *
 * ⚠️ Toutes ces fonctions passent par le client de la requête (`locals.supabase`),
 * donc SOUS RLS. Aucune ne doit être appelée avec le service role : la policy
 * professeur est la garde réelle, ces fonctions ne font que rendre les erreurs
 * lisibles.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { SectionContentKind } from './validation/chapter-sections';
import { ownerColumn, ownerInsert, toOwner, type ContentOwner } from './content-owner';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/chapter-sections');

type ChapterSection = Database['public']['Tables']['chapter_sections']['Row'];

/**
 * Les cinq tables qu'une section peut ranger.
 *
 * ⚠️ Miroir du tableau de la migration `20260915260000` (plus `chapter_series`,
 * créée avec ces colonnes en `20261002100000`) : ajouter un type de
 * contenu demande de toucher les deux, sinon le nouveau type ne sera jamais
 * rangeable et rien ne le signalera.
 */
const CONTENT_TABLES: Record<SectionContentKind, string> = {
	document: 'chapter_documents',
	exercise: 'chapter_exercises',
	checklistItem: 'chapter_checklist_items',
	worksheet: 'chapter_worksheets',
	// Séries de chapitre (migration `20261002100000`) : mêmes colonnes et même
	// clé composite que les quatre autres.
	series: 'chapter_series'
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
	owner: ContentOwner | string,
	supabase: SupabaseClient<Database>
): Promise<{ data: ChapterSection[]; error: Error | null }> {
	const proprietaire = toOwner(owner);
	const { data, error } = await supabase
		.from('chapter_sections')
		.select('*')
		.eq(ownerColumn(proprietaire), proprietaire.id)
		.order('display_order');

	if (error) {
		logger.error('[listSections] Erreur :', error);
		return { data: [], error: new Error(error.message) };
	}

	return { data: data ?? [], error: null };
}

/**
 * Crée une section, placée en dernier si aucun ordre n'est donné.
 */
export async function createSection(
	owner: ContentOwner | string,
	title: string,
	displayOrder: number | undefined,
	supabase: SupabaseClient<Database>
): Promise<{ data: ChapterSection | null; error: Error | null }> {
	const proprietaire = toOwner(owner);
	let ordre = displayOrder;

	if (ordre === undefined) {
		// Placée après la dernière. `maybeSingle` et non `single` : un chapitre
		// dont toutes les sections ont été supprimées est un cas normal, pas une
		// panne.
		const { data: derniere, error: erreurOrdre } = await supabase
			.from('chapter_sections')
			.select('display_order')
			.eq(ownerColumn(proprietaire), proprietaire.id)
			.order('display_order', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (erreurOrdre) {
			logger.error('[createSection] Ordre illisible :', erreurOrdre);
			return { data: null, error: new Error(erreurOrdre.message) };
		}

		ordre = (derniere?.display_order ?? 0) + 1;
	}

	const { data, error } = await supabase
		.from('chapter_sections')
		.insert({ ...ownerInsert(proprietaire), title, display_order: ordre })
		.select('*')
		.single();

	if (error) {
		logger.error('[createSection] Erreur :', error);
		return { data: null, error: new Error(error.message) };
	}

	return { data, error: null };
}

/**
 * Renomme une section. Le chapitre est exigé en plus de l'identifiant : sans
 * lui, un identifiant deviné renommerait la section d'un autre chapitre.
 */
export async function renameSection(
	owner: ContentOwner | string,
	sectionId: string,
	title: string,
	supabase: SupabaseClient<Database>
): Promise<{ data: ChapterSection | null; error: Error | null }> {
	const proprietaire = toOwner(owner);
	const { data, error } = await supabase
		.from('chapter_sections')
		.update({ title })
		.eq('id', sectionId)
		.eq(ownerColumn(proprietaire), proprietaire.id)
		.select('*')
		.maybeSingle();

	if (error) {
		logger.error('[renameSection] Erreur :', error);
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
	owner: ContentOwner | string,
	sectionId: string,
	supabase: SupabaseClient<Database>
): Promise<{ data: { id: string } | null; error: Error | null }> {
	const proprietaire = toOwner(owner);
	const { data, error } = await supabase
		.from('chapter_sections')
		.delete()
		.eq('id', sectionId)
		.eq(ownerColumn(proprietaire), proprietaire.id)
		.select('id')
		.maybeSingle();

	if (error) {
		logger.error('[deleteSection] Erreur :', error);
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
	owner: ContentOwner | string,
	orderUpdates: SectionOrderUpdate[],
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }> {
	const proprietaire = toOwner(owner);
	for (const update of orderUpdates) {
		const { error } = await supabase
			.from('chapter_sections')
			.update({ display_order: update.displayOrder })
			.eq('id', update.id)
			.eq(ownerColumn(proprietaire), proprietaire.id);

		if (error) {
			logger.error('[reorderSections] Erreur :', error);
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
	owner: ContentOwner | string,
	sectionId: string | null,
	items: SectionAssignment[],
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null; notFound?: boolean }> {
	const proprietaire = toOwner(owner);
	for (const item of items) {
		const table = CONTENT_TABLES[item.kind];

		const { data, error } = await supabase
			.from(table as never)
			.update({ section_id: sectionId, section_order: item.sectionOrder } as never)
			.eq('id', item.id)
			.eq(ownerColumn(proprietaire), proprietaire.id)
			.select('id');

		if (error) {
			logger.error(`[assignToSection] ${table} :`, error);
			return { error: new Error(error.message) };
		}

		// La RLS échoue en silence : un rangement refusé (ou une ressource d'un
		// autre chapitre) rend zéro ligne SANS erreur. Sans ce contrôle, l'écran
		// annonçait « rangé » et le rechargement montrait l'ancien plan.
		if (!data || (data as unknown[]).length !== 1) {
			logger.error(`[assignToSection] ${table} : aucune ligne rangée pour ${item.id}`);
			return { error: new Error('Ressource introuvable dans ce chapitre'), notFound: true };
		}
	}

	return { error: null };
}

/**
 * Le rang suivant à la fin d'une section : le plus haut `section_order` des cinq
 * tables, plus un.
 *
 * ⚠️ Le rang se calcule sur TOUTES les tables, pas seulement sur celle de la
 * ressource : une section les mélange, et compter sur une seule donnerait le
 * même `section_order` à deux ressources de types différents. Elles
 * s'afficheraient alors dans un ordre arbitraire, que le professeur ne
 * pourrait pas corriger autrement qu'en les déplaçant toutes.
 */
export async function nextSectionOrder(
	owner: ContentOwner | string,
	sectionId: string,
	supabase: SupabaseClient<Database>
): Promise<{ data: number | null; error: Error | null }> {
	const proprietaire = toOwner(owner);
	let dernier = -1;

	for (const table of Object.values(CONTENT_TABLES)) {
		// `maybeSingle` : une section encore vide pour ce type est le cas normal.
		const { data, error } = await supabase
			.from(table as never)
			.select('section_order')
			.eq(ownerColumn(proprietaire), proprietaire.id)
			.eq('section_id', sectionId)
			.order('section_order', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (error) {
			logger.error(`[nextSectionOrder] Rang suivant illisible (${table}) :`, error);
			return { data: null, error: new Error(error.message) };
		}

		const rang = (data as { section_order: number | null } | null)?.section_order;
		if (typeof rang === 'number' && rang > dernier) dernier = rang;
	}

	return { data: dernier + 1, error: null };
}

/**
 * Range UNE ressource qui vient d'être créée, à la fin d'une section.
 *
 * ⚠️ Pas pour un élément de MODÈLE : ses lignes de lien sont créées par la base à
 * l'insertion, avec la section qu'il a À CE MOMENT-LÀ. Un modèle passe la section
 * dans l'insertion même (`nextSectionOrder`, puis `insert*` avec `placement`).
 */
export async function placeInSection(
	owner: ContentOwner | string,
	sectionId: string,
	kind: SectionContentKind,
	itemId: string,
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }> {
	const proprietaire = toOwner(owner);
	const { data: rang, error } = await nextSectionOrder(proprietaire, sectionId, supabase);
	if (error || rang === null) return { error: error ?? new Error('Rang illisible') };

	return assignToSection(
		proprietaire,
		sectionId,
		[{ kind, id: itemId, sectionOrder: rang }],
		supabase
	);
}
