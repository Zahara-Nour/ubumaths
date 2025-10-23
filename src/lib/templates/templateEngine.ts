/**
 * Template Engine
 *
 * Core engine for finding, rendering, and validating message templates.
 * Handles placeholder replacement and variable validation.
 */

import type {
	MessageTemplate,
	RenderedTemplate,
	TemplateContext,
	TemplateMatch,
	TemplateValidationResult,
	TemplateValidationError,
	TemplateValidationWarning,
	Placeholder
} from '$lib/types/messageTemplates';
import {
	getVariablesForTrigger,
	getUserInputVariables,
	isValidVariable,
	extractVariableName
} from './templateVariables';
import {
	renderAdvancedTemplate,
	hasAdvancedFeatures,
	validateConditionals,
	validateFilters
} from './advancedEngine';

// =====================================================
// Template Rendering
// =====================================================

/**
 * Render a template with provided data
 *
 * Replaces all {{placeholders}} with actual values from data.
 * Returns rendered subject and body, plus info about pending variables.
 *
 * @param template - The template to render
 * @param data - Variable values (key-value pairs)
 * @returns Rendered template with completion status
 */
export function renderTemplate(
	template: MessageTemplate,
	data: Record<string, string | number | null | undefined>
): RenderedTemplate {
	// Get user input variables for this trigger type
	const userInputVars = getUserInputVariables(template.trigger_type);
	const pendingVariables = userInputVars.filter((v) => !data[v.name] || data[v.name] === '');

	// Check if template uses advanced features
	const subjectHasAdvanced = hasAdvancedFeatures(template.subject_template);
	const bodyHasAdvanced = hasAdvancedFeatures(template.body_template);

	let subject: string;
	let body: string;

	// Clean data (remove null/undefined)
	const cleanData: Record<string, any> = {};
	Object.entries(data).forEach(([key, value]) => {
		if (value !== null && value !== undefined) {
			cleanData[key] = value;
		}
	});

	// Render subject
	if (subjectHasAdvanced.hasConditionals || subjectHasAdvanced.hasFilters) {
		subject = renderAdvancedTemplate(template.subject_template, cleanData);
	} else {
		// Simple replacement
		subject = template.subject_template;
		Object.entries(cleanData).forEach(([key, value]) => {
			const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
			subject = subject.replace(placeholder, String(value));
		});
	}

	// Render body
	if (bodyHasAdvanced.hasConditionals || bodyHasAdvanced.hasFilters) {
		body = renderAdvancedTemplate(template.body_template, cleanData);
	} else {
		// Simple replacement
		body = template.body_template;
		Object.entries(cleanData).forEach(([key, value]) => {
			const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
			body = body.replace(placeholder, String(value));
		});
	}

	// Check if all required variables are filled
	const isComplete = pendingVariables.length === 0;

	return {
		subject,
		body,
		pendingVariables,
		isComplete
	};
}

/**
 * Create a preview of a template with example data
 *
 * @param template - The template to preview
 * @param customData - Optional custom data to override examples
 * @returns Preview with subject and body
 */
export function previewTemplate(
	template: MessageTemplate,
	customData?: Record<string, string | number>
): { subject: string; body: string; missingVariables: string[] } {
	const variables = getVariablesForTrigger(template.trigger_type);

	// Build data from examples
	const exampleData: Record<string, string> = {};
	variables.forEach((v) => {
		exampleData[v.name] = v.example;
	});

	// Override with custom data
	const data = { ...exampleData, ...customData };

	// Extract all placeholders from template
	const allPlaceholders = [
		...extractPlaceholders(template.subject_template),
		...extractPlaceholders(template.body_template)
	];

	// Find missing variables
	const missingVariables = allPlaceholders
		.map((p) => p.variableName)
		.filter((name) => !data[name])
		.filter((name, index, self) => self.indexOf(name) === index); // Unique

	// Render with available data
	let subject = template.subject_template;
	let body = template.body_template;

	Object.entries(data).forEach(([key, value]) => {
		const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
		subject = subject.replace(placeholder, String(value));
		body = body.replace(placeholder, String(value));
	});

	return { subject, body, missingVariables };
}

// =====================================================
// Template Matching
// =====================================================

/**
 * Create a template match with context data
 *
 * Analyzes which variables can be auto-filled from context
 * and which require user input.
 *
 * @param template - The matched template
 * @param context - The context data
 * @returns Template match with separated data
 */
export function createTemplateMatch(
	template: MessageTemplate,
	context: TemplateContext
): TemplateMatch {
	const allVariables = getVariablesForTrigger(template.trigger_type);
	const userInputVars = getUserInputVariables(template.trigger_type);

	// Separate context data (auto-filled) from user input
	const contextData: Record<string, string | number> = {};

	Object.entries(context.data).forEach(([key, value]) => {
		if (value !== null && value !== undefined) {
			contextData[key] = value;
		}
	});

	return {
		template,
		contextData,
		userInputVariables: userInputVars
	};
}

// =====================================================
// Template Validation
// =====================================================

/**
 * Validate a template before saving
 *
 * Checks for:
 * - Required fields
 * - Valid placeholder syntax
 * - Unknown variables
 * - Missing required variables
 *
 * @param template - The template to validate
 * @returns Validation result with errors and warnings
 */
export function validateTemplate(template: {
	title: string;
	subject_template: string;
	body_template: string;
	trigger_type: string;
}): TemplateValidationResult {
	const errors: TemplateValidationError[] = [];
	const warnings: TemplateValidationWarning[] = [];

	// Check required fields
	if (!template.title || template.title.trim().length === 0) {
		errors.push({
			field: 'title',
			message: 'Le titre est requis'
		});
	}

	if (template.title && template.title.length > 100) {
		errors.push({
			field: 'title',
			message: 'Le titre ne doit pas dépasser 100 caractères'
		});
	}

	if (!template.subject_template || template.subject_template.trim().length === 0) {
		errors.push({
			field: 'subject_template',
			message: 'Le sujet est requis'
		});
	}

	if (template.subject_template && template.subject_template.length > 200) {
		errors.push({
			field: 'subject_template',
			message: 'Le sujet ne doit pas dépasser 200 caractères'
		});
	}

	if (!template.body_template || template.body_template.trim().length === 0) {
		errors.push({
			field: 'body_template',
			message: 'Le corps du message est requis'
		});
	}

	// Check placeholder syntax
	const subjectPlaceholders = extractPlaceholders(template.subject_template);
	const bodyPlaceholders = extractPlaceholders(template.body_template);
	const allPlaceholders = [...subjectPlaceholders, ...bodyPlaceholders];

	// Check for malformed placeholders
	const malformedSubject = findMalformedPlaceholders(template.subject_template);
	const malformedBody = findMalformedPlaceholders(template.body_template);

	if (malformedSubject.length > 0) {
		errors.push({
			field: 'subject_template',
			message: `Placeholders mal formés dans le sujet: ${malformedSubject.join(', ')}`
		});
	}

	if (malformedBody.length > 0) {
		errors.push({
			field: 'body_template',
			message: `Placeholders mal formés dans le corps: ${malformedBody.join(', ')}`
		});
	}

	// Check for unknown variables
	const unknownVars = allPlaceholders
		.map((p) => p.variableName)
		.filter((name) => !isValidVariable(template.trigger_type as any, name))
		.filter((name, index, self) => self.indexOf(name) === index); // Unique

	if (unknownVars.length > 0) {
		warnings.push({
			field: 'variables',
			message: `Variables inconnues: ${unknownVars.map((v) => `{{${v}}}`).join(', ')}`
		});
	}

	// Warn if no placeholders used
	if (allPlaceholders.length === 0) {
		warnings.push({
			field: 'variables',
			message: 'Aucun placeholder utilisé. Considérez d\'ajouter des variables dynamiques.'
		});
	}

	// Validate conditional syntax
	const conditionalValidation = validateConditionals(template.body_template);
	if (!conditionalValidation.valid) {
		conditionalValidation.errors.forEach(err => {
			errors.push({
				field: 'body_template',
				message: err
			});
		});
	}

	// Validate filters
	const filterValidation = validateFilters(template.body_template);
	if (!filterValidation.valid) {
		filterValidation.errors.forEach(err => {
			warnings.push({
				field: 'body_template',
				message: err
			});
		});
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

// =====================================================
// Placeholder Extraction
// =====================================================

/**
 * Extract all placeholders from text
 *
 * Finds all {{variable_name}} patterns in text.
 *
 * @param text - Text to search
 * @returns Array of placeholder objects
 */
export function extractPlaceholders(text: string): Placeholder[] {
	const placeholders: Placeholder[] = [];
	const regex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
	let match: RegExpExecArray | null;

	while ((match = regex.exec(text)) !== null) {
		placeholders.push({
			match: match[0],
			variableName: match[1],
			startIndex: match.index,
			endIndex: match.index + match[0].length
		});
	}

	return placeholders;
}

/**
 * Find malformed placeholders (e.g., {variable}, {{variable}, etc.)
 *
 * @param text - Text to check
 * @returns Array of malformed placeholders
 */
export function findMalformedPlaceholders(text: string): string[] {
	const malformed: string[] = [];

	// Single braces
	const singleBraces = text.match(/\{[^{}\s]+\}/g);
	if (singleBraces) {
		malformed.push(...singleBraces);
	}

	// Unbalanced braces
	const unbalanced = text.match(/(\{\{[^}]*\}(?!\}))|(\{(?!\{)[^}]*\}\})/g);
	if (unbalanced) {
		malformed.push(...unbalanced);
	}

	// Spaces inside braces
	const withSpaces = text.match(/\{\{\s+[^}]+\s+\}\}/g);
	if (withSpaces) {
		malformed.push(...withSpaces);
	}

	return malformed;
}

/**
 * Get unique variable names from text
 *
 * @param text - Text to analyze
 * @returns Array of unique variable names
 */
export function getVariableNames(text: string): string[] {
	const placeholders = extractPlaceholders(text);
	const names = placeholders.map((p) => p.variableName);
	return Array.from(new Set(names)); // Unique
}

/**
 * Check if text contains a specific variable
 *
 * @param text - Text to check
 * @param variableName - Variable name to look for
 * @returns True if variable is used
 */
export function containsVariable(text: string, variableName: string): boolean {
	const placeholder = `{{${variableName}}}`;
	return text.includes(placeholder);
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Format date for French locale
 *
 * @param date - Date to format
 * @param short - Use short format (DD/MM/YYYY)
 * @returns Formatted date string
 */
export function formatDate(date: Date, short = false): string {
	if (short) {
		return date.toLocaleDateString('fr-FR');
	}
	return date.toLocaleDateString('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
}

/**
 * Format time for display
 *
 * @param date - Date to format
 * @returns Time string (HH:MM)
 */
export function formatTime(date: Date): string {
	return date.toLocaleTimeString('fr-FR', {
		hour: '2-digit',
		minute: '2-digit'
	});
}

/**
 * Get current school year
 *
 * @returns School year string (e.g., "2025-2026")
 */
export function getCurrentSchoolYear(): string {
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth();

	// School year starts in September (month 8)
	if (currentMonth >= 8) {
		return `${currentYear}-${currentYear + 1}`;
	} else {
		return `${currentYear - 1}-${currentYear}`;
	}
}

/**
 * Build global context data for current user
 *
 * Helper to create common global variables.
 *
 * @param user - Current user profile
 * @returns Global variable data
 */
export function buildGlobalContext(user: {
	full_name: string;
	first_name?: string;
}): Record<string, string> {
	const now = new Date();

	return {
		student_name: user.full_name,
		student_first_name: user.first_name || user.full_name.split(' ')[0] || '',
		today_date: formatDate(now),
		today_date_short: formatDate(now, true),
		time: formatTime(now),
		year: getCurrentSchoolYear()
	};
}
