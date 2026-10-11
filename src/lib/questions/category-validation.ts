/**
 * Question Template Category Validation
 * ======================================
 *
 * Utilities for validating category uniqueness and finding available difficulty levels.
 *
 * Category Uniqueness Rules:
 * - A category is defined by: theme + domain + subdomain + level
 * - Only 'published' templates enforce uniqueness (drafts can have duplicates)
 * - When creating/updating, check if category combination already exists
 * - When creating, auto-adjust level to next available if collision detected
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

/**
 * Category identifier (theme, domain, subdomain, level)
 */
export interface QuestionCategory {
	templateId?: string; // Optional template ID for client-side exclusion during updates
	theme: string;
	domain: string;
	subdomain?: string | null;
	level: number;
}

/**
 * Result of category uniqueness check
 */
export interface CategoryCheckResult {
	isUnique: boolean;
	existingTemplateId?: string;
}

/**
 * Check if a category combination is unique among published templates
 *
 * @param supabase - Supabase client instance
 * @param category - Category to check (theme, domain, subdomain, level)
 * @param excludeTemplateId - Optional template ID to exclude from check (for updates)
 * @returns Promise<CategoryCheckResult> - Whether category is unique
 *
 * @example
 * const result = await checkCategoryUniqueness(supabase, {
 *   theme: 'Algèbre',
 *   domain: 'Équations',
 *   subdomain: 'Linéaires',
 *   level: 1
 * });
 *
 * if (!result.isUnique) {
 *   console.log('Category already exists:', result.existingTemplateId);
 * }
 */
export async function checkCategoryUniqueness(
	supabase: SupabaseClient<Database>,
	category: QuestionCategory,
	excludeTemplateId?: string
): Promise<CategoryCheckResult> {
	try {
		// Query for published templates with same category
		let query = supabase
			.from('question_templates')
			.select('id')
			.eq('status', 'published')
			.eq('theme', category.theme)
			.eq('domain', category.domain)
			.eq('level', category.level);

		// Handle subdomain (can be null)
		if (category.subdomain) {
			query = query.eq('subdomain', category.subdomain);
		} else {
			query = query.is('subdomain', null);
		}

		// Exclude specific template ID (for update operations)
		if (excludeTemplateId) {
			query = query.neq('id', excludeTemplateId);
		}

		// Lecture en liste, sans `.single()` : l'absence de doublon est le cas normal,
		// et `.single()` la faisait répondre en 406 (PGRST116) dans les logs
		const { data, error } = await query.limit(1);

		if (error) throw error;

		const existing = data?.[0];
		if (!existing) return { isUnique: true };

		// Found existing template with same category
		return {
			isUnique: false,
			existingTemplateId: existing.id
		};
	} catch (error) {
		console.error('Error checking category uniqueness:', error);
		throw error;
	}
}

/**
 * Refus d'une publication dans une catégorie déjà occupée : jamais de décalage
 * automatique du niveau (décision de David du 2026-09-29, étendue à la création
 * le 2026-10-10). Même message pour la création et la modification.
 */
export function categoryTakenMessage(category: QuestionCategory): string {
	const subdomain = category.subdomain ? `, Sous-domaine: ${category.subdomain}` : '';
	return `Cette catégorie existe déjà (Thème: ${category.theme}, Domaine: ${category.domain}${subdomain}, Niveau: ${category.level}). Veuillez choisir un niveau différent.`;
}

/**
 * Get all existing levels in a category (for display/debugging)
 *
 * @param supabase - Supabase client instance
 * @param category - Category (theme, domain, subdomain) to check
 * @returns Promise<number[]> - Array of existing levels (sorted ascending)
 */
export async function getExistingLevels(
	supabase: SupabaseClient<Database>,
	category: Omit<QuestionCategory, 'level'>
): Promise<number[]> {
	try {
		let query = supabase
			.from('question_templates')
			.select('level')
			.eq('status', 'published')
			.eq('theme', category.theme)
			.eq('domain', category.domain);

		if (category.subdomain) {
			query = query.eq('subdomain', category.subdomain);
		} else {
			query = query.is('subdomain', null);
		}

		const { data, error } = await query.order('level', { ascending: true });

		if (error) {
			throw error;
		}

		return data?.map((row) => row.level) || [];
	} catch (error) {
		console.error('Error getting existing levels:', error);
		throw error;
	}
}
