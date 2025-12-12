/**
 * @deprecated Import from '$lib/typst/templates' instead of '$lib/worksheets/default-templates'
 * This file is kept for backward compatibility during migration.
 */

// Re-export everything from new location
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
} from '$lib/typst/templates';

export type { DefaultTemplate } from '$lib/typst/templates';

// Log deprecation warning in development
if (import.meta.env.DEV) {
	console.warn(
		'[DEPRECATED] Import from "$lib/typst/templates" instead of "$lib/worksheets/default-templates"'
	);
}
