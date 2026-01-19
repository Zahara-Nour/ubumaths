/**
 * Whiteboard Template Service
 *
 * Client-side service for fetching and caching whiteboard templates.
 * Provides in-memory caching with TTL to reduce API calls.
 *
 * @module whiteboard/services/template-service
 */

import type {
	WhiteboardTemplate,
	WhiteboardTemplateCategory,
	WhiteboardTemplateWithFavorite,
	CreateTemplatePayload,
	TemplateFont
} from '../types/templates';
import { PAGE_FORMATS, type BackgroundStyle, type PageFormatKey } from '../types/document';

// =============================================================================
// Constants
// =============================================================================

/** Cache TTL in milliseconds (5 minutes) */
const CACHE_TTL_MS = 5 * 60 * 1000;

// =============================================================================
// Types
// =============================================================================

interface CacheEntry {
	templates: WhiteboardTemplateWithFavorite[];
	timestamp: number;
}

interface FetchResult {
	success: boolean;
	templates?: WhiteboardTemplateWithFavorite[];
	error?: string;
}

interface FavoriteResult {
	success: boolean;
	error?: string;
}

/**
 * Input for creating a template from the modal form
 */
export interface CreateFromModalInput {
	name: string;
	description?: string | null;
	category: WhiteboardTemplateCategory;
	format: PageFormatKey;
	backgroundColor: string;
	backgroundStyle: BackgroundStyle;
	gridSpacing?: number;
	font?: TemplateFont;
}

interface FetchOneResult {
	success: boolean;
	template?: WhiteboardTemplate;
	error?: string;
}

interface CreateResult {
	success: boolean;
	template?: WhiteboardTemplate;
	error?: string;
}

interface DeleteResult {
	success: boolean;
	error?: string;
}

// =============================================================================
// Template Service
// =============================================================================

class TemplateService {
	/** Cache by category (null = all categories) */
	private cache = new Map<WhiteboardTemplateCategory | null, CacheEntry>();

	/**
	 * Check if cache entry is still valid
	 */
	private isCacheValid(entry: CacheEntry | undefined): entry is CacheEntry {
		if (!entry) return false;
		return Date.now() - entry.timestamp < CACHE_TTL_MS;
	}

	/**
	 * Invalidate all caches
	 * Call this after creating or deleting templates
	 */
	invalidateCache(): void {
		this.cache.clear();
	}

	/**
	 * Fetch templates from API
	 *
	 * @param category - Optional category filter
	 * @param forceRefresh - Bypass cache if true
	 * @returns Promise with templates (including favorite status) or error
	 */
	async getTemplates(
		category?: WhiteboardTemplateCategory,
		forceRefresh = false
	): Promise<FetchResult> {
		const cacheKey = category ?? null;

		// Check cache first
		if (!forceRefresh) {
			const cached = this.cache.get(cacheKey);
			if (this.isCacheValid(cached)) {
				return { success: true, templates: cached.templates };
			}
		}

		try {
			const url = new URL('/api/whiteboard/templates', window.location.origin);
			if (category) {
				url.searchParams.set('category', category);
			}

			const response = await fetch(url.toString());

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				const message = errorData.message || `Erreur ${response.status}`;
				return { success: false, error: message };
			}

			const data = await response.json();
			const templates = data.templates as WhiteboardTemplateWithFavorite[];

			// Update cache
			this.cache.set(cacheKey, {
				templates,
				timestamp: Date.now()
			});

			return { success: true, templates };
		} catch (err) {
			console.error('[TemplateService] Fetch error:', err);
			return {
				success: false,
				error: 'Erreur de connexion au serveur'
			};
		}
	}

	/**
	 * Fetch a single template by ID
	 *
	 * @param id - Template UUID
	 * @returns Promise with template or error
	 */
	async getTemplate(id: string): Promise<FetchOneResult> {
		try {
			const response = await fetch(`/api/whiteboard/templates/${id}`);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				const message = errorData.message || `Erreur ${response.status}`;
				return { success: false, error: message };
			}

			const data = await response.json();
			return { success: true, template: data.template as WhiteboardTemplate };
		} catch (err) {
			console.error('[TemplateService] Fetch single error:', err);
			return {
				success: false,
				error: 'Erreur de connexion au serveur'
			};
		}
	}

	/**
	 * Create a new template
	 *
	 * @param payload - Template data
	 * @returns Promise with created template or error
	 */
	async createTemplate(payload: CreateTemplatePayload): Promise<CreateResult> {
		try {
			const response = await fetch('/api/whiteboard/templates', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				const message = errorData.message || `Erreur ${response.status}`;
				return { success: false, error: message };
			}

			const data = await response.json();

			// Invalidate cache after creation
			this.invalidateCache();

			return { success: true, template: data.template as WhiteboardTemplate };
		} catch (err) {
			console.error('[TemplateService] Create error:', err);
			return {
				success: false,
				error: 'Erreur de connexion au serveur'
			};
		}
	}

	/**
	 * Delete a template
	 *
	 * @param id - Template UUID
	 * @returns Promise with success status or error
	 */
	async deleteTemplate(id: string): Promise<DeleteResult> {
		try {
			const response = await fetch(`/api/whiteboard/templates/${id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				const message = errorData.message || `Erreur ${response.status}`;
				return { success: false, error: message };
			}

			// Invalidate cache after deletion
			this.invalidateCache();

			return { success: true };
		} catch (err) {
			console.error('[TemplateService] Delete error:', err);
			return {
				success: false,
				error: 'Erreur de connexion au serveur'
			};
		}
	}

	/**
	 * Get templates grouped by category
	 *
	 * @param forceRefresh - Bypass cache if true
	 * @returns Promise with templates grouped by category
	 */
	async getTemplatesByCategory(forceRefresh = false): Promise<{
		success: boolean;
		grouped?: Record<WhiteboardTemplateCategory, WhiteboardTemplateWithFavorite[]>;
		error?: string;
	}> {
		const result = await this.getTemplates(undefined, forceRefresh);

		if (!result.success || !result.templates) {
			return { success: false, error: result.error };
		}

		// Group templates by category
		const grouped: Record<WhiteboardTemplateCategory, WhiteboardTemplateWithFavorite[]> = {
			grids: [],
			graphs: [],
			geometry: [],
			algebra: [],
			blank: []
		};

		for (const template of result.templates) {
			grouped[template.category].push(template);
		}

		return { success: true, grouped };
	}

	/**
	 * Toggle a template's favorite status
	 *
	 * @param templateId - Template UUID
	 * @param isFavorite - Whether to add (true) or remove (false) from favorites
	 * @returns Promise with success status or error
	 */
	async toggleFavorite(templateId: string, isFavorite: boolean): Promise<FavoriteResult> {
		try {
			const method = isFavorite ? 'POST' : 'DELETE';
			const url = isFavorite
				? '/api/whiteboard/templates/favorites'
				: `/api/whiteboard/templates/favorites?template_id=${encodeURIComponent(templateId)}`;

			const options: RequestInit = {
				method,
				...(isFavorite && {
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ templateId })
				})
			};

			const response = await fetch(url, options);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				const message = errorData.message || `Erreur ${response.status}`;
				return { success: false, error: message };
			}

			// Invalidate cache so next fetch gets updated favorite status
			this.invalidateCache();

			return { success: true };
		} catch (err) {
			console.error('[TemplateService] Toggle favorite error:', err);
			return {
				success: false,
				error: 'Erreur de connexion au serveur'
			};
		}
	}

	/**
	 * Create a template from the modal form data
	 *
	 * @param input - Form data from the create template modal
	 * @returns Promise with created template or error
	 */
	async createFromModal(input: CreateFromModalInput): Promise<CreateResult> {
		const {
			name,
			description,
			category,
			format,
			backgroundColor,
			backgroundStyle,
			gridSpacing,
			font
		} = input;

		// Build the page data from form inputs
		const formatDimensions = PAGE_FORMATS[format];
		const pageData: CreateTemplatePayload['pageData'] = {
			elements: [],
			background: {
				type: 'plain',
				style: backgroundStyle,
				color: backgroundColor,
				...(gridSpacing && backgroundStyle !== 'plain' ? { gridSpacing } : {})
			},
			width: formatDimensions.width,
			height: formatDimensions.height,
			...(font ? { font } : {})
		};

		const payload: CreateTemplatePayload = {
			name,
			description: description ?? null,
			category,
			pageData
		};

		return this.createTemplate(payload);
	}
}

// =============================================================================
// Singleton Export
// =============================================================================

/**
 * Singleton instance of TemplateService
 * Use this for all template operations
 */
export const templateService = new TemplateService();
