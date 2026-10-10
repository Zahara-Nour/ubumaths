/**
 * Publication par lot des modèles de questions
 * =============================================
 *
 * Publier : chaque modèle repasse dans `templatePublicationErrors`, le contrôle
 * partagé avec la publication d'un modèle seul (`checkTemplate` : structure,
 * schéma strict, specs vertes, une spec « correct » par variation, 50 tirages
 * par variation). Un modèle qui échoue reste en brouillon.
 * Une collision de catégorie (thème, domaine, sous-domaine, niveau) avec un
 * modèle déjà publié OU avec un autre modèle de la sélection est refusée : pas
 * de décalage automatique du niveau (décision de David, 2026-09-29).
 *
 * Repasser en brouillon : aucun contrôle.
 *
 * La RLS échoue en silence (docs/pratiques/rls-echecs-silencieux.md) : une mise à
 * jour refusée rend zéro ligne sans erreur. Seules les lignes RENDUES par
 * `.update().select()` comptent comme changées ; les autres sont des refus.
 */

import { error } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { QuestionTemplate } from '$lib/questions/types';
import { toQuestionTemplate, type QuestionTemplateRow } from '$lib/types/question-template';
import { templatePublicationErrors } from '$lib/server/template-publication';
import {
	templateCategoryKey,
	type BulkPublishResult,
	type BulkTemplateEntry,
	type BulkTemplateRefusal,
	type BulkUnpublishResult
} from '$lib/questions/bulk-status';

// ============================================================================
// TYPES
// ============================================================================

type Client = SupabaseClient<Database>;

interface CategoryRow {
	id: string;
	title: string;
	theme: string;
	domain: string;
	subdomain: string | null;
	level: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * `.in('id', …)` part dans l'URL : 700 UUID ≈ 26 Ko de query string, au-delà de
 * ce que les proxys acceptent. On découpe.
 */
const ID_CHUNK_SIZE = 100;
/** Plafond de lignes par requête côté PostgREST */
const PAGE_SIZE = 1000;

const NOT_FOUND = 'modèle introuvable';
const NOT_SAVED = "la modification n'a pas été enregistrée par la base (droits insuffisants ?)";
const UNIQUE_VIOLATION = '23505';

// ============================================================================
// FUNCTIONS
// ============================================================================

function chunk<T>(items: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let start = 0; start < items.length; start += size) {
		chunks.push(items.slice(start, start + size));
	}
	return chunks;
}

/**
 * `toQuestionTemplate` porte les horodatages de la ligne ; le schéma strict de
 * `checkTemplate` (celui de l'éditeur) les refuse comme clés inconnues. Sans ce
 * retrait, TOUS les modèles seraient refusés pour « 1 erreur(s) de schéma ».
 */
export function withoutDbMetadata(template: QuestionTemplate): QuestionTemplate {
	const {
		created_at: _createdAt,
		updated_at: _updatedAt,
		created_by: _createdBy,
		...rest
	} = template;
	return rest;
}

function describeCategory(row: Pick<CategoryRow, 'theme' | 'domain' | 'subdomain' | 'level'>) {
	const subdomain = row.subdomain ? ` / ${row.subdomain}` : '';
	return `${row.theme} / ${row.domain}${subdomain}, niveau ${row.level}`;
}

async function fetchTemplates(supabase: Client, ids: string[]): Promise<QuestionTemplateRow[]> {
	const rows: QuestionTemplateRow[] = [];
	for (const part of chunk(ids, ID_CHUNK_SIZE)) {
		const { data, error: readError } = await supabase
			.from('question_templates')
			.select('*')
			.in('id', part);
		if (readError) {
			console.error('Lecture des modèles impossible :', readError);
			throw error(500, 'Impossible de lire les modèles');
		}
		rows.push(...(data ?? []));
	}
	return rows;
}

/** Modèles déjà publiés dans les thèmes concernés (pour les collisions) */
async function fetchPublishedCategories(
	supabase: Client,
	themes: string[]
): Promise<CategoryRow[]> {
	const rows: CategoryRow[] = [];
	if (themes.length === 0) return rows;
	for (let from = 0; ; from += PAGE_SIZE) {
		const { data, error: readError } = await supabase
			.from('question_templates')
			.select('id, title, theme, domain, subdomain, level')
			.eq('status', 'published')
			.in('theme', themes)
			.order('id')
			.range(from, from + PAGE_SIZE - 1);
		if (readError) {
			console.error('Lecture des modèles publiés impossible :', readError);
			throw error(500, 'Impossible de vérifier les catégories publiées');
		}
		rows.push(...(data ?? []));
		if (!data || data.length < PAGE_SIZE) return rows;
	}
}

/**
 * Passe `ids` au statut `status` (seulement depuis `from`) et rend les lignes
 * réellement modifiées. Un conflit d'unicité (course avec une autre publication)
 * refuse tout le paquet : on le signale au lieu de planter.
 */
async function updateStatus(
	supabase: Client,
	ids: string[],
	from: 'draft' | 'published',
	to: 'draft' | 'published'
): Promise<{ updated: BulkTemplateEntry[]; conflicts: string[] }> {
	const updated: BulkTemplateEntry[] = [];
	const conflicts: string[] = [];
	for (const part of chunk(ids, ID_CHUNK_SIZE)) {
		const { data, error: updateError } = await supabase
			.from('question_templates')
			.update({ status: to })
			.in('id', part)
			.eq('status', from)
			.select('id, title');
		if (updateError) {
			if (updateError.code === UNIQUE_VIOLATION) {
				conflicts.push(...part);
				continue;
			}
			console.error('Mise à jour du statut impossible :', updateError);
			throw error(500, 'Impossible de modifier le statut des modèles');
		}
		updated.push(...(data ?? []).map((row) => ({ id: row.id, title: row.title })));
	}
	return { updated, conflicts };
}

/** Répartit le résultat d'une mise à jour : lignes rendues = changées, le reste = refus */
function settle(
	candidates: QuestionTemplateRow[],
	updated: BulkTemplateEntry[],
	conflicts: string[]
): { changed: BulkTemplateEntry[]; refused: BulkTemplateRefusal[] } {
	const updatedIds = new Set(updated.map((entry) => entry.id));
	const conflictIds = new Set(conflicts);
	const refused: BulkTemplateRefusal[] = [];
	for (const row of candidates) {
		if (updatedIds.has(row.id)) continue;
		refused.push({
			id: row.id,
			title: row.title,
			reasons: [
				conflictIds.has(row.id)
					? 'la base a refusé le lot : une catégorie est devenue occupée entre-temps, réessaie'
					: NOT_SAVED
			]
		});
	}
	return { changed: updated, refused };
}

export async function publishTemplates(
	supabase: Client,
	ids: string[]
): Promise<BulkPublishResult> {
	const uniqueIds = [...new Set(ids)];
	const rows = await fetchTemplates(supabase, uniqueIds);
	const byId = new Map(rows.map((row) => [row.id, row]));
	const refused: BulkTemplateRefusal[] = [];

	// 1. Contrôle complet de chaque modèle
	const checked: QuestionTemplateRow[] = [];
	for (const id of uniqueIds) {
		const row = byId.get(id);
		if (!row) {
			refused.push({ id, title: '', reasons: [NOT_FOUND] });
			continue;
		}
		if (row.status === 'published') {
			refused.push({ id, title: row.title, reasons: ['déjà publié'] });
			continue;
		}
		// `toQuestionTemplate` ramène un statut inconnu à « draft » : sans ce garde,
		// un modèle archivé passerait le contrôle puis échouerait en « droits insuffisants ? »
		if (row.status !== 'draft') {
			refused.push({
				id,
				title: row.title,
				reasons: [`statut « ${row.status} » : seul un brouillon peut être publié`]
			});
			continue;
		}
		const reasons = templatePublicationErrors(withoutDbMetadata(toQuestionTemplate(row)));
		if (reasons.length > 0) {
			refused.push({ id, title: row.title, reasons });
			continue;
		}
		checked.push(row);
	}

	// 2. Collisions de catégorie : avec les publiés, puis au sein de la sélection
	const published = await fetchPublishedCategories(supabase, [
		...new Set(checked.map((row) => row.theme))
	]);
	const publishedByKey = new Map(published.map((row) => [templateCategoryKey(row), row]));
	const batchByKey = new Map<string, QuestionTemplateRow[]>();
	for (const row of checked) {
		const key = templateCategoryKey(row);
		batchByKey.set(key, [...(batchByKey.get(key) ?? []), row]);
	}

	const candidates: QuestionTemplateRow[] = [];
	for (const row of checked) {
		const key = templateCategoryKey(row);
		const occupant = publishedByKey.get(key);
		if (occupant) {
			refused.push({
				id: row.id,
				title: row.title,
				reasons: [
					`catégorie déjà occupée (${describeCategory(row)}) par « ${occupant.title} » : change le niveau`
				]
			});
			continue;
		}
		const rivals = (batchByKey.get(key) ?? []).filter((other) => other.id !== row.id);
		if (rivals.length > 0) {
			const names = rivals.map((other) => `« ${other.title} »`).join(', ');
			refused.push({
				id: row.id,
				title: row.title,
				reasons: [
					`même catégorie (${describeCategory(row)}) que ${names} dans la sélection : change le niveau`
				]
			});
			continue;
		}
		candidates.push(row);
	}

	// 3. Écriture, vérifiée ligne à ligne
	if (candidates.length === 0) return { published: [], refused };
	const { updated, conflicts } = await updateStatus(
		supabase,
		candidates.map((row) => row.id),
		'draft',
		'published'
	);
	const settled = settle(candidates, updated, conflicts);
	return { published: settled.changed, refused: [...refused, ...settled.refused] };
}

export async function unpublishTemplates(
	supabase: Client,
	ids: string[]
): Promise<BulkUnpublishResult> {
	const uniqueIds = [...new Set(ids)];
	const rows = await fetchTemplates(supabase, uniqueIds);
	const byId = new Map(rows.map((row) => [row.id, row]));
	const refused: BulkTemplateRefusal[] = [];
	const candidates: QuestionTemplateRow[] = [];

	for (const id of uniqueIds) {
		const row = byId.get(id);
		if (!row) {
			refused.push({ id, title: '', reasons: [NOT_FOUND] });
		} else if (row.status === 'draft') {
			refused.push({ id, title: row.title, reasons: ['déjà en brouillon'] });
		} else if (row.status !== 'published') {
			refused.push({
				id,
				title: row.title,
				reasons: [`statut « ${row.status} » : seul un modèle publié peut repasser en brouillon`]
			});
		} else {
			candidates.push(row);
		}
	}

	if (candidates.length === 0) return { unpublished: [], refused };
	const { updated, conflicts } = await updateStatus(
		supabase,
		candidates.map((row) => row.id),
		'published',
		'draft'
	);
	const settled = settle(candidates, updated, conflicts);
	return { unpublished: settled.changed, refused: [...refused, ...settled.refused] };
}
