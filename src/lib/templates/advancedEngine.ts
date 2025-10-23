/**
 * Advanced Template Engine
 *
 * Extends the basic template engine with:
 * - Conditional blocks ({{#if}}...{{/if}})
 * - Variable formatting ({{var | filter:arg}})
 * - Nested conditions
 * - Multiple filters chaining
 */

import { formatDate, formatTime } from './templateEngine';

// =====================================================
// FILTERS (Variable Formatting)
// =====================================================

export type FilterFunction = (value: any, ...args: string[]) => any;

export const TEMPLATE_FILTERS: Record<string, FilterFunction> = {
	/**
	 * Convert to uppercase
	 * Usage: {{name | uppercase}}
	 */
	uppercase: (value: string) => String(value).toUpperCase(),

	/**
	 * Convert to lowercase
	 * Usage: {{name | lowercase}}
	 */
	lowercase: (value: string) => String(value).toLowerCase(),

	/**
	 * Capitalize first letter
	 * Usage: {{name | capitalize}}
	 */
	capitalize: (value: string) => {
		const str = String(value);
		return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
	},

	/**
	 * Truncate text to length
	 * Usage: {{description | truncate:100}}
	 */
	truncate: (value: string, length: string = '50') => {
		const str = String(value);
		const maxLength = parseInt(length, 10);
		if (str.length <= maxLength) return str;
		return str.substring(0, maxLength) + '...';
	},

	/**
	 * Format as currency
	 * Usage: {{amount | currency:EUR}}
	 */
	currency: (value: number, code: string = 'EUR') => {
		const num = parseFloat(String(value));
		if (isNaN(num)) return value;

		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: code
		}).format(num);
	},

	/**
	 * Format number with separator
	 * Usage: {{count | number}}
	 */
	number: (value: number) => {
		const num = parseFloat(String(value));
		if (isNaN(num)) return value;

		return new Intl.NumberFormat('fr-FR').format(num);
	},

	/**
	 * Format date
	 * Usage: {{date | date:DD/MM/YYYY}}
	 */
	date: (value: string | Date, format: string = 'long') => {
		const date = value instanceof Date ? value : new Date(value);
		if (isNaN(date.getTime())) return value;

		if (format === 'short') {
			return formatDate(date, true);
		} else if (format === 'long') {
			return formatDate(date, false);
		} else {
			// Custom format
			return formatDate(date, false);
		}
	},

	/**
	 * Format time
	 * Usage: {{timestamp | time}}
	 */
	time: (value: string | Date) => {
		const date = value instanceof Date ? value : new Date(value);
		if (isNaN(date.getTime())) return value;

		return formatTime(date);
	},

	/**
	 * Pluralize based on count
	 * Usage: {{count | pluralize:élève:élèves}}
	 */
	pluralize: (count: number, singular: string, plural: string) => {
		const num = parseFloat(String(count));
		return num <= 1 ? singular : plural;
	},

	/**
	 * Default value if empty
	 * Usage: {{description | default:Aucune description}}
	 */
	default: (value: any, defaultValue: string = '') => {
		return value || defaultValue;
	},

	/**
	 * Join array with separator
	 * Usage: {{tags | join:, }}
	 */
	join: (value: any[], separator: string = ', ') => {
		if (!Array.isArray(value)) return value;
		return value.join(separator);
	},

	/**
	 * First N items from array
	 * Usage: {{items | first:3}}
	 */
	first: (value: any[], count: string = '1') => {
		if (!Array.isArray(value)) return value;
		const n = parseInt(count, 10);
		return value.slice(0, n);
	},

	/**
	 * Last N items from array
	 * Usage: {{items | last:3}}
	 */
	last: (value: any[], count: string = '1') => {
		if (!Array.isArray(value)) return value;
		const n = parseInt(count, 10);
		return value.slice(-n);
	},

	/**
	 * Escape HTML
	 * Usage: {{html | escape}}
	 */
	escape: (value: string) => {
		const str = String(value);
		const htmlEscapes: Record<string, string> = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#x27;'
		};
		return str.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
	},

	/**
	 * Strip HTML tags
	 * Usage: {{html | striptags}}
	 */
	striptags: (value: string) => {
		const str = String(value);
		return str.replace(/<[^>]*>/g, '');
	},

	/**
	 * Add percentage sign
	 * Usage: {{rate | percent}}
	 */
	percent: (value: number) => {
		const num = parseFloat(String(value));
		if (isNaN(num)) return value;
		return `${num}%`;
	}
};

// =====================================================
// FILTER APPLICATION
// =====================================================

/**
 * Apply a single filter with arguments
 */
export function applyFilter(value: any, filterExpr: string): any {
	const parts = filterExpr.split(':');
	const filterName = parts[0].trim();
	const args = parts.slice(1).map((arg) => arg.trim());

	const filter = TEMPLATE_FILTERS[filterName];
	if (!filter) {
		console.warn(`Unknown filter: ${filterName}`);
		return value;
	}

	try {
		return filter(value, ...args);
	} catch (error) {
		console.error(`Error applying filter ${filterName}:`, error);
		return value;
	}
}

/**
 * Apply chained filters
 * Example: {{name | uppercase | truncate:20}}
 */
export function applyFilters(value: any, filtersExpr: string): any {
	const filters = filtersExpr.split('|').map((f) => f.trim());

	return filters.reduce((result, filter) => {
		return applyFilter(result, filter);
	}, value);
}

// =====================================================
// CONDITIONAL BLOCKS
// =====================================================

export interface ConditionalBlock {
	variable: string;
	ifContent: string;
	elseContent: string | null;
}

/**
 * Parse conditional blocks from template
 * Supports: {{#if variable}}...{{else}}...{{/if}}
 */
export function parseConditionals(template: string): ConditionalBlock[] {
	const blocks: ConditionalBlock[] = [];
	const regex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g;

	let match: RegExpExecArray | null;
	while ((match = regex.exec(template)) !== null) {
		blocks.push({
			variable: match[1],
			ifContent: match[2],
			elseContent: match[3] || null
		});
	}

	return blocks;
}

/**
 * Render conditional blocks
 */
export function renderConditionals(template: string, data: Record<string, any>): string {
	const regex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g;

	return template.replace(regex, (match, variable, ifBlock, elseBlock = '') => {
		const value = data[variable];

		// Truthy check
		const isTruthy = value !== null && value !== undefined && value !== false && value !== '';

		return isTruthy ? ifBlock : elseBlock;
	});
}

// =====================================================
// ADVANCED RENDERING
// =====================================================

/**
 * Render template with conditionals and filters
 */
export function renderAdvancedTemplate(template: string, data: Record<string, any>): string {
	let result = template;

	// Step 1: Handle conditional blocks
	result = renderConditionals(result, data);

	// Step 2: Handle variables with filters
	// Pattern: {{variable | filter1:arg | filter2}}
	const varWithFiltersRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*(?:\s*\|\s*[^}]+)?)\}\}/g;

	result = result.replace(varWithFiltersRegex, (match, expr) => {
		// Split variable and filters
		const parts = expr.split('|').map((p: string) => p.trim());
		const variableName = parts[0];
		const filtersExpr = parts.slice(1).join('|').trim();

		// Get value
		let value = data[variableName];

		// Apply filters if any
		if (filtersExpr && value !== undefined && value !== null) {
			value = applyFilters(value, filtersExpr);
		}

		// Return value or empty string
		return value !== undefined && value !== null ? String(value) : '';
	});

	return result;
}

// =====================================================
// VALIDATION
// =====================================================

/**
 * Validate conditional syntax
 */
export function validateConditionals(template: string): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Check matching {{#if}} and {{/if}}
	const ifCount = (template.match(/\{\{#if\s+\w+\}\}/g) || []).length;
	const endifCount = (template.match(/\{\{\/if\}\}/g) || []).length;

	if (ifCount !== endifCount) {
		errors.push(
			`Nombre de {{#if}} (${ifCount}) ne correspond pas au nombre de {{/if}} (${endifCount})`
		);
	}

	// Check for malformed conditionals
	const malformedIf = template.match(/\{\{#if\s*\}\}/g);
	if (malformedIf) {
		errors.push('Conditionnels mal formés: {{#if}} sans variable');
	}

	// Check for nested conditionals (not supported yet)
	const nested = /\{\{#if\s+\w+\}\}[\s\S]*?\{\{#if\s+\w+\}\}/.test(template);
	if (nested) {
		errors.push('Conditionnels imbriqués non supportés pour le moment');
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Validate filter syntax
 */
export function validateFilters(template: string): {
	valid: boolean;
	errors: string[];
	unknownFilters: string[];
} {
	const errors: string[] = [];
	const unknownFilters: string[] = [];

	// Extract all filter expressions
	const filterRegex = /\{\{[a-zA-Z_][a-zA-Z0-9_]*\s*\|\s*([^}]+)\}\}/g;
	let match: RegExpExecArray | null;

	while ((match = filterRegex.exec(template)) !== null) {
		const filtersExpr = match[1];
		const filters = filtersExpr.split('|').map((f) => f.trim());

		filters.forEach((filter) => {
			const filterName = filter.split(':')[0].trim();

			if (!TEMPLATE_FILTERS[filterName]) {
				if (!unknownFilters.includes(filterName)) {
					unknownFilters.push(filterName);
				}
			}
		});
	}

	if (unknownFilters.length > 0) {
		errors.push(`Filtres inconnus: ${unknownFilters.join(', ')}`);
	}

	return {
		valid: errors.length === 0,
		errors,
		unknownFilters
	};
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Get list of all available filters with descriptions
 */
export function getAvailableFilters(): Array<{
	name: string;
	description: string;
	example: string;
}> {
	return [
		{ name: 'uppercase', description: 'Convertir en majuscules', example: '{{name | uppercase}}' },
		{ name: 'lowercase', description: 'Convertir en minuscules', example: '{{name | lowercase}}' },
		{
			name: 'capitalize',
			description: 'Première lettre en majuscule',
			example: '{{name | capitalize}}'
		},
		{ name: 'truncate', description: 'Tronquer le texte', example: '{{text | truncate:50}}' },
		{ name: 'currency', description: 'Formater en devise', example: '{{price | currency:EUR}}' },
		{ name: 'number', description: 'Formater nombre', example: '{{count | number}}' },
		{ name: 'date', description: 'Formater date', example: '{{date | date:short}}' },
		{ name: 'time', description: 'Formater heure', example: '{{timestamp | time}}' },
		{
			name: 'pluralize',
			description: 'Pluraliser selon quantité',
			example: '{{count | pluralize:élève:élèves}}'
		},
		{
			name: 'default',
			description: 'Valeur par défaut si vide',
			example: '{{desc | default:Aucune}}'
		},
		{ name: 'join', description: 'Joindre tableau', example: '{{tags | join:, }}' },
		{ name: 'escape', description: 'Échapper HTML', example: '{{html | escape}}' },
		{ name: 'striptags', description: 'Retirer balises HTML', example: '{{html | striptags}}' },
		{ name: 'percent', description: 'Ajouter signe %', example: '{{rate | percent}}' }
	];
}

/**
 * Check if template uses advanced features
 */
export function hasAdvancedFeatures(template: string): {
	hasConditionals: boolean;
	hasFilters: boolean;
} {
	return {
		hasConditionals: /\{\{#if\s+\w+\}\}/.test(template),
		hasFilters: /\{\{[a-zA-Z_][a-zA-Z0-9_]*\s*\|/.test(template)
	};
}
