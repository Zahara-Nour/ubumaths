/**
 * Message Template System Types
 *
 * Defines types for the message template system that allows creating
 * reusable message templates with dynamic placeholders.
 */

// =====================================================
// Core Types
// =====================================================

/**
 * Types of triggers that can activate a template
 */
export type TriggerType =
	| 'assessment_question' // Questions about assessments
	| 'srs_help' // Help with SRS decks
	| 'system_notification' // System notifications
	| 'enigma_answer' // Enigma answers (future feature)
	| 'general'; // General purpose template

/**
 * Scope of template availability
 */
export type TemplateScope = 'system' | 'class';

/**
 * Variable definition for template placeholders
 */
export interface TemplateVariable {
	/** Variable name (without braces, e.g., "student_name") */
	name: string;
	/** Human-readable label for UI */
	label: string;
	/** Example value for preview */
	example: string;
	/** Whether this variable is required */
	required?: boolean;
	/** Whether this variable requires user input (vs auto-filled) */
	userInput?: boolean;
	/** Description/help text */
	description?: string;
}

/**
 * Template configuration in database
 */
export interface MessageTemplate {
	id: string;
	title: string;
	description: string | null;
	subject_template: string;
	body_template: string;
	trigger_type: TriggerType;
	trigger_config: Record<string, unknown> | null;
	scope: TemplateScope;
	created_by: string;
	class_id: string | null;
	variables: TemplateVariable[] | null;
	tags: string[] | null;
	is_active: boolean;
	approval_status: string | null;
	reviewed_by: string | null;
	reviewed_at: string | null;
	review_notes: string | null;
	created_at: string;
	updated_at: string;
}

/**
 * Template creation/update payload
 */
export interface MessageTemplateInput {
	title: string;
	description?: string;
	subject_template: string;
	body_template: string;
	trigger_type: TriggerType;
	trigger_config?: Record<string, unknown>;
	scope: TemplateScope;
	class_id?: string | null;
	variables?: TemplateVariable[];
	is_active?: boolean;
}

// =====================================================
// Template Context & Rendering
// =====================================================

/**
 * Context information for finding and rendering templates
 */
export interface TemplateContext {
	/** Type of trigger */
	type: TriggerType;
	/** ID of the related entity (assessment, deck, etc.) */
	entityId?: string;
	/** Class context */
	classId?: string;
	/** Data for placeholder replacement */
	data: Record<string, string | number | null>;
	/** Recipient user ID */
	recipientId?: string;
}

/**
 * Rendered template output
 */
export interface RenderedTemplate {
	subject: string;
	body: string;
	/** Variables that still need user input */
	pendingVariables: TemplateVariable[];
	/** Whether all required variables are filled */
	isComplete: boolean;
}

/**
 * Template match result
 */
export interface TemplateMatch {
	template: MessageTemplate;
	/** Variables available from context */
	contextData: Record<string, string | number>;
	/** Variables that need user input */
	userInputVariables: TemplateVariable[];
}

// =====================================================
// Template Management
// =====================================================

/**
 * Template list item for UI
 */
export interface TemplateListItem {
	id: string;
	title: string;
	description: string | null;
	trigger_type: TriggerType;
	scope: TemplateScope;
	class_name?: string | null;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

/**
 * Template statistics
 */
export interface TemplateStats {
	total: number;
	system: number;
	class: number;
	active: number;
	inactive: number;
	byTriggerType: Record<TriggerType, number>;
}

// =====================================================
// Template Validation
// =====================================================

/**
 * Validation result for template
 */
export interface TemplateValidationResult {
	valid: boolean;
	errors: TemplateValidationError[];
	warnings: TemplateValidationWarning[];
}

export interface TemplateValidationError {
	field: 'title' | 'subject_template' | 'body_template' | 'variables';
	message: string;
}

export interface TemplateValidationWarning {
	field: string;
	message: string;
}

// =====================================================
// Helper Types
// =====================================================

/**
 * Placeholder in template text
 */
export interface Placeholder {
	/** Full match including braces, e.g., "{{student_name}}" */
	match: string;
	/** Variable name without braces, e.g., "student_name" */
	variableName: string;
	/** Start index in text */
	startIndex: number;
	/** End index in text */
	endIndex: number;
}

/**
 * Template preview data
 */
export interface TemplatePreview {
	subject: string;
	body: string;
	missingVariables: string[];
}
