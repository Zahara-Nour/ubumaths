/**
 * Whiteboard Template Types
 *
 * Type definitions for the template system that allows users to create
 * new pages from pre-defined templates with elements and backgrounds.
 *
 * @module whiteboard/types/templates
 */

import type { WhiteboardElement, PageBackground } from './document';

// =============================================================================
// Template Fonts
// =============================================================================

/**
 * Available fonts for whiteboard templates.
 * These fonts are available in the application for TextBlocks.
 */
export type TemplateFont = 'Inter' | 'Excalifont' | 'Shantell Sans' | 'Linux Libertine';

/** All available template fonts for iteration */
export const TEMPLATE_FONTS: readonly TemplateFont[] = [
	'Inter',
	'Excalifont',
	'Shantell Sans',
	'Linux Libertine'
] as const;

/** Font labels for UI display */
export const TEMPLATE_FONT_LABELS: Record<TemplateFont, string> = {
	Inter: 'Inter (défaut)',
	Excalifont: 'Excalifont (manuscrit)',
	'Shantell Sans': 'Shantell Sans (marqueur)',
	'Linux Libertine': 'Linux Libertine (académique)'
} as const;

// =============================================================================
// Template Category
// =============================================================================

/**
 * Categories for organizing whiteboard templates.
 * Must match the PostgreSQL enum: whiteboard_template_category
 */
export type WhiteboardTemplateCategory = 'geometry' | 'algebra' | 'graphs' | 'grids' | 'blank';

/** Category labels for UI display */
export const TEMPLATE_CATEGORY_LABELS: Record<WhiteboardTemplateCategory, string> = {
	geometry: 'Géométrie',
	algebra: 'Algèbre',
	graphs: 'Graphiques',
	grids: 'Quadrillages',
	blank: 'Vierge'
} as const;

/** Category icons for UI (lucide icon names) */
export const TEMPLATE_CATEGORY_ICONS: Record<WhiteboardTemplateCategory, string> = {
	geometry: 'shapes',
	algebra: 'function-square',
	graphs: 'axis-3d',
	grids: 'grid-3x3',
	blank: 'file'
} as const;

/** All template categories for iteration */
export const TEMPLATE_CATEGORIES: readonly WhiteboardTemplateCategory[] = [
	'grids',
	'graphs',
	'geometry',
	'algebra',
	'blank'
] as const;

// =============================================================================
// Template Page Data
// =============================================================================

/**
 * Page data stored in a template.
 * Contains all information needed to create a new page.
 */
export interface TemplatePageData {
	/** Elements to place on the page (deep cloned when applied) */
	readonly elements: readonly WhiteboardElement[];
	/** Background configuration */
	readonly background: PageBackground;
	/** Page width in pixels */
	readonly width: number;
	/** Page height in pixels */
	readonly height: number;
	/** Default font for TextBlocks created on this page (optional) */
	readonly font?: TemplateFont;
}

// =============================================================================
// Whiteboard Template
// =============================================================================

/**
 * A whiteboard template stored in the database.
 * Used to create new pages with pre-defined content.
 */
export interface WhiteboardTemplate {
	/** Unique identifier (UUID) */
	readonly id: string;
	/** Display name */
	readonly name: string;
	/** Optional description */
	readonly description: string | null;
	/** Category for organization */
	readonly category: WhiteboardTemplateCategory;
	/** Page content data */
	readonly pageData: TemplatePageData;
	/** Optional preview thumbnail (base64 or URL) */
	readonly thumbnail: string | null;
	/** Whether this is a system template (cannot be deleted) */
	readonly isSystem: boolean;
	/** Creation timestamp */
	readonly createdAt: string;
}

/**
 * Template creation payload.
 * Used when creating a new template via the API.
 */
export interface CreateTemplatePayload {
	/** Display name (1-100 chars) */
	readonly name: string;
	/** Optional description (max 500 chars) */
	readonly description?: string | null;
	/** Category */
	readonly category: WhiteboardTemplateCategory;
	/** Page content data */
	readonly pageData: TemplatePageData;
	/** Optional thumbnail */
	readonly thumbnail?: string | null;
}

/**
 * Template with favorite status.
 * Used in the template picker to show favorite state.
 */
export interface WhiteboardTemplateWithFavorite extends WhiteboardTemplate {
	/** Whether this template is in the user's favorites */
	readonly isFavorite: boolean;
}

/**
 * Database row format for whiteboard_templates table.
 * Uses snake_case to match PostgreSQL column names.
 */
export interface WhiteboardTemplateRow {
	readonly id: string;
	readonly name: string;
	readonly description: string | null;
	readonly category: WhiteboardTemplateCategory;
	readonly page_data: TemplatePageData;
	readonly thumbnail: string | null;
	readonly created_by: string | null;
	readonly is_system: boolean;
	readonly is_public: boolean;
	readonly created_at: string;
	readonly updated_at: string;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert a database row to a WhiteboardTemplate.
 */
export function rowToTemplate(row: WhiteboardTemplateRow): WhiteboardTemplate {
	return {
		id: row.id,
		name: row.name,
		description: row.description,
		category: row.category,
		pageData: row.page_data,
		thumbnail: row.thumbnail,
		isSystem: row.is_system,
		createdAt: row.created_at
	};
}

/**
 * Convert a WhiteboardTemplate to database insert format.
 */
export function templateToInsert(
	template: CreateTemplatePayload,
	createdBy: string | null = null
): Omit<WhiteboardTemplateRow, 'id' | 'created_at' | 'updated_at'> {
	return {
		name: template.name,
		description: template.description ?? null,
		category: template.category,
		page_data: template.pageData,
		thumbnail: template.thumbnail ?? null,
		created_by: createdBy,
		is_system: false,
		is_public: true
	};
}

/**
 * Convert a database row to a WhiteboardTemplateWithFavorite.
 */
export function rowToTemplateWithFavorite(
	row: WhiteboardTemplateRow,
	isFavorite: boolean
): WhiteboardTemplateWithFavorite {
	return {
		...rowToTemplate(row),
		isFavorite
	};
}
