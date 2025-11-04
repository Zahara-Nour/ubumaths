/**
 * VIP Card Admin TypeScript Types
 * ================================
 *
 * Type definitions for VIP card administration system
 */

/**
 * Database table types
 * Note: These should be imported from database.ts once regenerated
 * For now, we define them manually
 */

/**
 * VIP Card Template (from vip_card_templates table)
 */
export interface VipCardTemplate {
	id: string;
	name: string;
	description: string;
	rarity: 'common' | 'rare' | 'epic' | 'legendary';
	category: 'bonus' | 'privilege' | 'social' | 'power';
	image_path: string;
	is_enabled: boolean;
	action: {
		type: 'draw_cards' | 'remove_warnings' | 'exchange_cards' | 'add_gidouilles';
		count?: number;
		amount?: number;
	} | null;
	sort_order: number;
	created_at: string;
}

/**
 * VIP Card Config (from vip_card_config table)
 */
export interface VipCardConfig {
	id: number;
	config_name: string;
	common_probability: number;
	rare_probability: number;
	epic_probability: number;
	legendary_probability: number;
	is_active: boolean;
	description: string | null;
	valid_from: string | null;
	valid_until: string | null;
	created_at: string;
	updated_at: string;
}

/**
 * Teacher VIP Card Override (from teacher_vip_card_overrides table)
 */
export interface TeacherVipCardOverride {
	id: number;
	teacher_id: string;
	card_id: string;
	is_enabled: boolean;
	created_at: string;
	updated_at: string;
}

/**
 * API Request/Response Types
 */

/**
 * Request body for creating a VIP card template
 */
export interface CreateTemplateRequest {
	id: string;
	name: string;
	description: string;
	rarity: 'common' | 'rare' | 'epic' | 'legendary';
	category: 'bonus' | 'privilege' | 'social' | 'power';
	isEnabled: boolean;
	imagePath: string;
	action?: {
		type: 'draw_cards' | 'remove_warnings' | 'exchange_cards' | 'add_gidouilles';
		count?: number;
		amount?: number;
	};
	sortOrder?: number;
}

/**
 * Request body for updating a VIP card template (partial)
 */
export type UpdateTemplateRequest = Partial<Omit<CreateTemplateRequest, 'id'>>;

/**
 * Response when creating or fetching a template
 */
export interface TemplateResponse {
	id: string;
	name: string;
	description: string;
	rarity: 'common' | 'rare' | 'epic' | 'legendary';
	category: 'bonus' | 'privilege' | 'social' | 'power';
	imagePath: string;
	isEnabled: boolean;
	action: {
		type: 'draw_cards' | 'remove_warnings' | 'exchange_cards' | 'add_gidouilles';
		count?: number;
		amount?: number;
	} | null;
	sortOrder: number;
	createdAt: string;
}

/**
 * Request body for creating a VIP card config
 */
export interface CreateConfigRequest {
	configName: string;
	commonProbability: number;
	rareProbability: number;
	epicProbability: number;
	legendaryProbability: number;
	description?: string | null;
	validFrom?: string | null;
	validUntil?: string | null;
}

/**
 * Request body for updating a VIP card config (partial)
 */
export type UpdateConfigRequest = Partial<CreateConfigRequest>;

/**
 * Response when creating or fetching a config
 */
export interface ConfigResponse {
	id: number;
	configName: string;
	commonProbability: number;
	rareProbability: number;
	epicProbability: number;
	legendaryProbability: number;
	isActive: boolean;
	description: string | null;
	validFrom: string | null;
	validUntil: string | null;
	createdAt: string;
	updatedAt: string;
}

/**
 * Individual teacher override
 */
export interface TeacherOverride {
	cardId: string;
	cardName: string;
	isEnabled: boolean;
}

/**
 * Request body for bulk updating teacher overrides
 */
export interface UpdateOverridesRequest {
	overrides: Array<{
		cardId: string;
		isEnabled: boolean;
	}>;
}

/**
 * Response when fetching teacher overrides
 */
export interface TeacherOverridesResponse {
	overrides: TeacherOverride[];
	templates: TemplateResponse[];
}

/**
 * Response for image upload
 */
export interface UploadImageResponse {
	publicUrl: string;
	imagePath: string;
}

/**
 * Standard success response
 */
export interface SuccessResponse {
	success: true;
	message: string;
}

/**
 * Utility: Convert database row to API response
 */

/**
 * Convert vip_card_templates row (snake_case) to TemplateResponse (camelCase)
 */
export function templateToResponse(template: VipCardTemplate): TemplateResponse {
	return {
		id: template.id,
		name: template.name,
		description: template.description,
		rarity: template.rarity,
		category: template.category,
		imagePath: template.image_path,
		isEnabled: template.is_enabled,
		action: template.action,
		sortOrder: template.sort_order,
		createdAt: template.created_at
	};
}

/**
 * Convert vip_card_config row (snake_case) to ConfigResponse (camelCase)
 */
export function configToResponse(config: VipCardConfig): ConfigResponse {
	return {
		id: config.id,
		configName: config.config_name,
		commonProbability: config.common_probability,
		rareProbability: config.rare_probability,
		epicProbability: config.epic_probability,
		legendaryProbability: config.legendary_probability,
		isActive: config.is_active,
		description: config.description,
		validFrom: config.valid_from,
		validUntil: config.valid_until,
		createdAt: config.created_at,
		updatedAt: config.updated_at
	};
}

/**
 * Convert TemplateResponse (camelCase) to vip_card_templates row (snake_case)
 */
export function responseToTemplate(response: TemplateResponse): VipCardTemplate {
	return {
		id: response.id,
		name: response.name,
		description: response.description,
		rarity: response.rarity,
		category: response.category,
		image_path: response.imagePath,
		is_enabled: response.isEnabled,
		action: response.action,
		sort_order: response.sortOrder,
		created_at: response.createdAt
	};
}
