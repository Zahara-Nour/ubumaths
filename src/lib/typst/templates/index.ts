/**
 * Typst templates for worksheet PDF generation
 * Re-exports all templates and utilities from default-templates.ts
 */

export {
	// Individual template constants
	STANDARD_TEMPLATE,
	ASSESSMENT_TEMPLATE,
	EXAM_TEMPLATE,
	HOMEWORK_TEMPLATE,
	QUIZ_TEMPLATE,
	MINIMAL_TEMPLATE,
	MODERN_TEMPLATE,
	TWO_COLUMNS_TEMPLATE,
	LANDSCAPE_TEMPLATE,
	MAGAZINE_TEMPLATE,
	SCIENTIFIC_TEMPLATE,
	// Template collections
	DEFAULT_TEMPLATES,
	DEFAULT_TEMPLATE_IDS,
	COMMON_PLACEHOLDERS,
	SAMPLE_PREVIEW_DATA,
	// Utility functions
	getDefaultTemplate,
	getDefaultTemplatesByType,
	renderTemplate
} from './default-templates';

export type { DefaultTemplate } from './default-templates';
