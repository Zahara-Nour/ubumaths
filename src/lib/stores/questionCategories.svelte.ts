/**
 * Question Categories Cache Store
 * ================================
 *
 * Client-side cache for question template categories to avoid repeated API calls.
 * Similar to teacher students cache system.
 *
 * Features:
 * - Fetches all published question categories on init
 * - Provides instant lookup for category uniqueness validation
 * - Automatically refreshes after create/update/delete operations
 */

import type { QuestionCategory } from '$lib/questions/category-validation';

interface CategoriesCache {
	categories: QuestionCategory[];
	lastFetched: number | null;
	isLoading: boolean;
	error: string | null;
}

class QuestionCategoriesStore {
	private cache = $state<CategoriesCache>({
		categories: [],
		lastFetched: null,
		isLoading: false,
		error: null
	});

	/**
	 * Get all cached categories
	 */
	get categories(): QuestionCategory[] {
		return this.cache.categories;
	}

	/**
	 * Check if cache is currently loading
	 */
	get isLoading(): boolean {
		return this.cache.isLoading;
	}

	/**
	 * Get error message if any
	 */
	get error(): string | null {
		return this.cache.error;
	}

	/**
	 * Check if cache is empty
	 */
	get isEmpty(): boolean {
		return this.cache.categories.length === 0;
	}

	/**
	 * Fetch categories from API and update cache
	 */
	async fetchCategories(force = false): Promise<void> {
		// Skip if already loading
		if (this.cache.isLoading && !force) {
			return;
		}

		// Skip if recently fetched (within 5 minutes) and not forced
		const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
		if (!force && this.cache.lastFetched && Date.now() - this.cache.lastFetched < CACHE_DURATION) {
			return;
		}

		this.cache.isLoading = true;
		this.cache.error = null;

		try {
			const response = await fetch('/api/questions/categories/all');

			if (!response.ok) {
				throw new Error('Failed to fetch categories');
			}

			const data = await response.json();

			this.cache.categories = data.categories || [];
			this.cache.lastFetched = Date.now();
		} catch (err) {
			this.cache.error = err instanceof Error ? err.message : 'Unknown error';
			console.error('Error fetching question categories:', err);
		} finally {
			this.cache.isLoading = false;
		}
	}

	/**
	 * Check if a category already exists in cache
	 *
	 * @param category - Category to check (theme, domain, subdomain, level)
	 * @param excludeTemplateId - Optional template ID to exclude from check (for updates)
	 * @returns true if category exists (duplicate), false if unique
	 */
	categoryExists(category: QuestionCategory, excludeTemplateId?: string): boolean {
		return this.cache.categories.some(
			(c) =>
				c.theme === category.theme &&
				c.domain === category.domain &&
				(c.subdomain || null) === (category.subdomain || null) &&
				c.level === category.level &&
				// Exclude specific template ID if provided (for update operations)
				(!excludeTemplateId || c.templateId !== excludeTemplateId)
		);
	}

	/**
	 * Get the next available level for a category (max + 1)
	 *
	 * @param category - Category without level (theme, domain, subdomain)
	 * @returns Next available level (1 if no existing levels)
	 */
	getNextAvailableLevel(category: Omit<QuestionCategory, 'level'>): number {
		const matchingLevels = this.cache.categories
			.filter(
				(c) =>
					c.theme === category.theme &&
					c.domain === category.domain &&
					(c.subdomain || null) === (category.subdomain || null)
			)
			.map((c) => c.level);

		if (matchingLevels.length === 0) {
			return 1;
		}

		return Math.max(...matchingLevels) + 1;
	}

	/**
	 * Get all existing levels for a category
	 *
	 * @param category - Category without level (theme, domain, subdomain)
	 * @returns Array of existing levels (sorted ascending)
	 */
	getExistingLevels(category: Omit<QuestionCategory, 'level'>): number[] {
		return this.cache.categories
			.filter(
				(c) =>
					c.theme === category.theme &&
					c.domain === category.domain &&
					(c.subdomain || null) === (category.subdomain || null)
			)
			.map((c) => c.level)
			.sort((a, b) => a - b);
	}

	/**
	 * Invalidate cache (force refresh on next fetch)
	 */
	invalidate(): void {
		this.cache.lastFetched = null;
	}

	/**
	 * Clear cache entirely
	 */
	clear(): void {
		this.cache.categories = [];
		this.cache.lastFetched = null;
		this.cache.error = null;
	}
}

// Export singleton instance
export const questionCategoriesCache = new QuestionCategoriesStore();
