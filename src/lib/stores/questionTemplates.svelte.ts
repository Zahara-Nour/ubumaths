/**
 * Question Templates Cache Store
 * ================================
 *
 * Client-side cache for published question templates to avoid repeated API/DB calls.
 * Used by automaths pages (public access) for instant template lookups.
 *
 * Features:
 * - Public access (no authentication required)
 * - Caches all published templates
 * - Can be initialized from server data (SSR support)
 * - Provides instant filtering by category
 * - Manual invalidation (no TTL - cache until explicitly refreshed)
 * - Separate from questionCategories cache (different scope & data)
 *
 * Usage:
 * ```typescript
 * import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';
 *
 * // Initialize from server data (SSR)
 * questionTemplatesCache.initializeFromServer(data.templates);
 *
 * // Get all templates
 * const templates = questionTemplatesCache.templates;
 *
 * // Filter by category
 * const filtered = questionTemplatesCache.getTemplatesByCategory({
 *   theme: 'Algèbre',
 *   domain: 'Équations',
 *   subdomain: null,
 *   level: 1
 * });
 *
 * // Find by ID
 * const template = questionTemplatesCache.getTemplateById('abc-123');
 *
 * // Invalidate after admin creates/updates template
 * questionTemplatesCache.invalidate();
 * ```
 */

import type { QuestionTemplate } from '$lib/questions/types';

/**
 * Category filter for finding templates
 */
export interface TemplateCategory {
	theme: string;
	domain: string;
	subdomain: string | null;
	level: number;
}

/**
 * Cache storage structure
 */
interface TemplatesCache {
	templates: QuestionTemplate[];
	lastFetched: number | null;
	isLoading: boolean;
	error: string | null;
}

class QuestionTemplatesStore {
	private cache = $state<TemplatesCache>({
		templates: [],
		lastFetched: null,
		isLoading: false,
		error: null
	});

	/**
	 * Get all cached templates
	 */
	get templates(): QuestionTemplate[] {
		return this.cache.templates;
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
		return this.cache.templates.length === 0;
	}

	/**
	 * Initialize cache from server data (for SSR hydration)
	 *
	 * This allows pages to use server-loaded data for initial render,
	 * then benefit from client-side cache for subsequent navigations.
	 *
	 * @param templates - Templates from server load function
	 */
	initializeFromServer(templates: QuestionTemplate[]): void {
		// Only initialize if cache is empty (first load)
		if (this.cache.templates.length === 0 && templates.length > 0) {
			this.cache.templates = templates;
			this.cache.lastFetched = Date.now();
			this.cache.error = null;
		}
	}

	/**
	 * Fetch templates from API and update cache
	 *
	 * Fetches all published templates from the server.
	 * Skips if already loading to prevent duplicate requests.
	 *
	 * @param force - Force refetch even if recently fetched
	 */
	async fetchTemplates(force = false): Promise<void> {
		// Skip if already loading
		if (this.cache.isLoading && !force) {
			return;
		}

		// Skip if already fetched and not forced
		// Note: No TTL - cache persists until invalidated
		if (!force && this.cache.lastFetched && this.cache.templates.length > 0) {
			return;
		}

		// Skip if there was a recent error (likely offline)
		// Don't retry immediately to avoid error spam
		if (!force && this.cache.error) {
			console.log('[Templates Cache] Skipping fetch due to previous error (likely offline)');
			return;
		}

		this.cache.isLoading = true;
		this.cache.error = null;

		try {
			const response = await fetch('/api/questions/templates/all');

			if (!response.ok) {
				throw new Error('Failed to fetch templates');
			}

			const data = await response.json();

			this.cache.templates = data.templates || [];
			this.cache.lastFetched = Date.now();
		} catch (err) {
			this.cache.error = err instanceof Error ? err.message : 'Unknown error';
			console.error('[Templates Cache] Fetch error (likely offline):', this.cache.error);
		} finally {
			this.cache.isLoading = false;
		}
	}

	/**
	 * Get template by ID
	 *
	 * @param id - Template ID to find
	 * @returns Template or undefined if not found
	 */
	getTemplateById(id: string): QuestionTemplate | undefined {
		return this.cache.templates.find((t) => t.id === id);
	}

	/**
	 * Get all templates matching a category
	 *
	 * Useful for filtering templates in automaths pages.
	 *
	 * @param category - Category filter (theme, domain, subdomain, level)
	 * @returns Array of matching templates
	 */
	getTemplatesByCategory(category: TemplateCategory): QuestionTemplate[] {
		return this.cache.templates.filter(
			(t) =>
				t.theme === category.theme &&
				t.domain === category.domain &&
				(t.subdomain || null) === category.subdomain &&
				t.level === category.level
		);
	}

	/**
	 * Get all templates matching partial category (without level)
	 *
	 * Useful for finding all levels within a subdomain.
	 *
	 * @param category - Partial category (theme, domain, subdomain)
	 * @returns Array of matching templates
	 */
	getTemplatesByPartialCategory(category: Omit<TemplateCategory, 'level'>): QuestionTemplate[] {
		return this.cache.templates.filter(
			(t) =>
				t.theme === category.theme &&
				t.domain === category.domain &&
				(t.subdomain || null) === category.subdomain
		);
	}

	/**
	 * Get unique themes from cached templates
	 *
	 * @returns Array of unique theme names
	 */
	getThemes(): string[] {
		const themes = new Set(this.cache.templates.map((t) => t.theme));
		return Array.from(themes).sort();
	}

	/**
	 * Get unique domains for a theme
	 *
	 * @param theme - Theme name
	 * @returns Array of unique domain names
	 */
	getDomains(theme: string): string[] {
		const domains = new Set(
			this.cache.templates.filter((t) => t.theme === theme).map((t) => t.domain)
		);
		return Array.from(domains).sort();
	}

	/**
	 * Get unique subdomains for a theme and domain
	 *
	 * @param theme - Theme name
	 * @param domain - Domain name
	 * @returns Array of unique subdomain names (may include null)
	 */
	getSubdomains(theme: string, domain: string): (string | null)[] {
		const subdomains = new Set(
			this.cache.templates
				.filter((t) => t.theme === theme && t.domain === domain)
				.map((t) => t.subdomain || null)
		);
		return Array.from(subdomains).sort((a, b) => {
			// Sort null last
			if (a === null) return 1;
			if (b === null) return -1;
			return a.localeCompare(b);
		});
	}

	/**
	 * Invalidate cache (force refresh on next fetch)
	 *
	 * Call this after admin creates/updates/deletes templates
	 * to ensure fresh data on next access.
	 */
	invalidate(): void {
		this.cache.lastFetched = null;
	}

	/**
	 * Clear cache entirely
	 *
	 * Removes all cached templates and resets state.
	 * Next access will trigger a fresh fetch.
	 */
	clear(): void {
		this.cache.templates = [];
		this.cache.lastFetched = null;
		this.cache.error = null;
	}
}

// Export singleton instance
export const questionTemplatesCache = new QuestionTemplatesStore();
