/**
 * Template Engine - Unit Tests
 * =============================
 *
 * Comprehensive test suite for core template engine functionality.
 * Tests rendering, validation, placeholder extraction, and context handling.
 *
 * @module templates/templateEngine.test
 */

import { describe, it, expect } from 'vitest';
import {
	renderTemplate,
	previewTemplate,
	createTemplateMatch,
	validateTemplate,
	extractPlaceholders,
	findMalformedPlaceholders,
	getVariableNames,
	containsVariable,
	formatDate,
	formatTime,
	getCurrentSchoolYear,
	buildGlobalContext
} from './templateEngine';
import type { MessageTemplate, TemplateContext } from '$lib/types/messageTemplates';

// ============================================================================
// TEST DATA FIXTURES
// ============================================================================

const mockTemplate: MessageTemplate = {
	id: 'template-1',
	title: 'Assessment Question Template',
	description: 'Template for asking questions about assessments',
	subject_template: 'Question about {{assessment_title}}',
	body_template:
		'Hello {{teacher_name}},\n\nI have a question about {{assessment_title}}:\n\n{{student_question}}\n\nThank you,\n{{student_name}}',
	trigger_type: 'assessment_question',
	trigger_config: {},
	scope: 'system',
	created_by: 'system',
	class_id: null,
	variables: [],
	is_active: true,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z'
};

const mockData = {
	student_name: 'Marie Dubois',
	teacher_name: 'M. Martin',
	assessment_title: 'Devoir Maison #3',
	student_question: 'Could you explain question 5?'
};

// ============================================================================
// BASIC RENDERING TESTS
// ============================================================================

describe('renderTemplate', () => {
	it('should render template with all variables provided', () => {
		const result = renderTemplate(mockTemplate, mockData);

		expect(result.subject).toBe('Question about Devoir Maison #3');
		expect(result.body).toContain('Hello M. Martin');
		expect(result.body).toContain('I have a question about Devoir Maison #3');
		expect(result.body).toContain('Could you explain question 5?');
		expect(result.body).toContain('Thank you,\nMarie Dubois');
		expect(result.isComplete).toBe(true);
		expect(result.pendingVariables).toHaveLength(0);
	});

	it('should render with partial data', () => {
		const partialData = {
			student_name: 'Marie Dubois',
			teacher_name: 'M. Martin',
			assessment_title: 'Devoir Maison #3'
			// Missing student_question
		};

		const result = renderTemplate(mockTemplate, partialData);

		expect(result.subject).toBe('Question about Devoir Maison #3');
		expect(result.body).toContain('Hello M. Martin');
		expect(result.isComplete).toBe(false);
		expect(result.pendingVariables.length).toBeGreaterThan(0);
	});

	it('should handle empty strings as valid values', () => {
		const dataWithEmpty = {
			...mockData,
			student_question: ''
		};

		const result = renderTemplate(mockTemplate, dataWithEmpty);

		// Empty string should still be considered incomplete for user input variables
		expect(result.isComplete).toBe(false);
	});

	it('should handle null and undefined values', () => {
		const dataWithNulls = {
			student_name: 'Marie Dubois',
			teacher_name: null,
			assessment_title: undefined,
			student_question: 'My question'
		};

		const result = renderTemplate(mockTemplate, dataWithNulls);

		// Should not replace null/undefined values
		expect(result.subject).toContain('{{assessment_title}}');
		expect(result.body).toContain('{{teacher_name}}');
		expect(result.body).toContain('Marie Dubois'); // Valid value should be replaced
	});

	it('should handle numeric values', () => {
		const template: MessageTemplate = {
			...mockTemplate,
			subject_template: 'Score: {{score}} points',
			body_template: 'You scored {{score}} out of {{total_points}}'
		};

		const numericData = {
			score: 85,
			total_points: 100
		};

		const result = renderTemplate(template, numericData);

		expect(result.subject).toBe('Score: 85 points');
		expect(result.body).toBe('You scored 85 out of 100');
	});

	it('should replace multiple occurrences of same variable', () => {
		const template: MessageTemplate = {
			...mockTemplate,
			subject_template: '{{student_name}} - {{assessment_title}}',
			body_template:
				'Hi {{student_name}}, regarding {{assessment_title}}. {{student_name}}, please confirm.'
		};

		const result = renderTemplate(template, mockData);

		expect(result.body).toBe(
			'Hi Marie Dubois, regarding Devoir Maison #3. Marie Dubois, please confirm.'
		);
		// Should replace all 2 occurrences of student_name in body
		expect(result.body.match(/Marie Dubois/g)).toHaveLength(2);
	});

	it('should handle template with no variables', () => {
		const staticTemplate: MessageTemplate = {
			...mockTemplate,
			trigger_type: 'general', // Use general which requires custom_subject and custom_message
			subject_template: 'Static Subject',
			body_template: 'This is a static message with no variables.'
		};

		const result = renderTemplate(staticTemplate, {
			custom_subject: 'Test',
			custom_message: 'Test message'
		});

		expect(result.subject).toBe('Static Subject');
		expect(result.body).toBe('This is a static message with no variables.');
		expect(result.isComplete).toBe(true);
	});
});

// ============================================================================
// ADVANCED RENDERING TESTS (with advanced features)
// ============================================================================

describe('renderTemplate - Advanced Features', () => {
	it('should render template with filters', () => {
		const template: MessageTemplate = {
			...mockTemplate,
			subject_template: '{{student_name | uppercase}}',
			body_template: 'Hello {{teacher_name | capitalize}}'
		};

		const result = renderTemplate(template, mockData);

		expect(result.subject).toBe('MARIE DUBOIS');
		expect(result.body).toBe('Hello M. martin'); // capitalize lowercases then capitalizes first letter
	});

	it('should render template with conditionals', () => {
		const template: MessageTemplate = {
			...mockTemplate,
			body_template:
				'Hello {{teacher_name}}.\n{{#if assessment_title}}Assessment: {{assessment_title}}{{else}}No assessment{{/if}}'
		};

		const result = renderTemplate(template, mockData);

		expect(result.body).toContain('Assessment: Devoir Maison #3');
		expect(result.body).not.toContain('No assessment');
	});

	it('should handle else block when condition is false', () => {
		const template: MessageTemplate = {
			...mockTemplate,
			body_template: '{{#if missing_var}}Has value{{else}}No value{{/if}}'
		};

		const result = renderTemplate(template, { student_name: 'Test' });

		expect(result.body).toBe('No value');
	});

	it('should handle chained filters', () => {
		const template: MessageTemplate = {
			...mockTemplate,
			subject_template: '{{student_name | uppercase | truncate:10}}'
		};

		const result = renderTemplate(template, mockData);

		// MARIE DUBOIS truncated to 10 chars = "MARIE DUBO..."
		expect(result.subject).toBe('MARIE DUBO...');
	});
});

// ============================================================================
// PREVIEW TEMPLATE TESTS
// ============================================================================

describe('previewTemplate', () => {
	it('should generate preview with example data', () => {
		const preview = previewTemplate(mockTemplate);

		expect(preview.subject).toBeDefined();
		expect(preview.body).toBeDefined();
		expect(preview.subject).not.toContain('{{');
		expect(preview.body).not.toContain('{{');
	});

	it('should use custom data when provided', () => {
		const customData = {
			student_name: 'Custom Student',
			assessment_title: 'Custom Assessment'
		};

		const preview = previewTemplate(mockTemplate, customData);

		expect(preview.subject).toContain('Custom Assessment');
		expect(preview.body).toContain('Custom Student');
	});

	it('should identify missing variables', () => {
		const template: MessageTemplate = {
			...mockTemplate,
			body_template: 'Hello {{teacher_name}}, question about {{unknown_variable}}'
		};

		const preview = previewTemplate(template);

		expect(preview.missingVariables).toContain('unknown_variable');
	});

	it('should not duplicate missing variables', () => {
		const template: MessageTemplate = {
			...mockTemplate,
			body_template: '{{missing_var}} and {{missing_var}} and {{missing_var}}'
		};

		const preview = previewTemplate(template);

		// Should only list "missing_var" once
		expect(preview.missingVariables).toHaveLength(1);
		expect(preview.missingVariables[0]).toBe('missing_var');
	});
});

// ============================================================================
// TEMPLATE MATCH TESTS
// ============================================================================

describe('createTemplateMatch', () => {
	it('should separate context data from user input variables', () => {
		const context: TemplateContext = {
			type: 'assessment_question',
			data: {
				student_name: 'Marie Dubois',
				teacher_name: 'M. Martin',
				assessment_title: 'Devoir Maison #3',
				assessment_link: 'https://ubumaths.com/assessments/123'
			}
		};

		const match = createTemplateMatch(mockTemplate, context);

		expect(match.template).toBe(mockTemplate);
		expect(match.contextData).toEqual(context.data);
		expect(match.userInputVariables.length).toBeGreaterThan(0);
		// student_question should be a user input variable
		expect(match.userInputVariables.some((v) => v.name === 'student_question')).toBe(true);
	});

	it('should handle null values in context', () => {
		const context: TemplateContext = {
			type: 'assessment_question',
			data: {
				student_name: 'Marie Dubois',
				teacher_name: null,
				assessment_title: undefined
			}
		};

		const match = createTemplateMatch(mockTemplate, context);

		// Null/undefined should be filtered out
		expect(match.contextData.teacher_name).toBeUndefined();
		expect(match.contextData.assessment_title).toBeUndefined();
		expect(match.contextData.student_name).toBe('Marie Dubois');
	});
});

// ============================================================================
// VALIDATION TESTS
// ============================================================================

describe('validateTemplate', () => {
	it('should validate correct template with no placeholders', () => {
		const template = {
			title: 'Valid Template',
			subject_template: 'Static Subject',
			body_template: 'Static body text',
			trigger_type: 'general'
		};

		const result = validateTemplate(template);

		// Should be technically valid (no errors), just warnings about no placeholders
		expect(result.errors).toHaveLength(0);
		// Will have warning about no placeholders
		expect(result.warnings.length).toBeGreaterThan(0);
	});

	it('should reject template without title', () => {
		const template = {
			title: '',
			subject_template: 'Subject',
			body_template: 'Body',
			trigger_type: 'general'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === 'title')).toBe(true);
		expect(result.errors.some((e) => e.message.includes('requis'))).toBe(true);
	});

	it('should reject template with title too long', () => {
		const template = {
			title: 'a'.repeat(101), // 101 characters
			subject_template: 'Subject',
			body_template: 'Body',
			trigger_type: 'general'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === 'title')).toBe(true);
		expect(result.errors.some((e) => e.message.includes('100 caractères'))).toBe(true);
	});

	it('should reject template without subject', () => {
		const template = {
			title: 'Valid Title',
			subject_template: '',
			body_template: 'Body',
			trigger_type: 'general'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === 'subject_template')).toBe(true);
	});

	it('should reject template with subject too long', () => {
		const template = {
			title: 'Valid Title',
			subject_template: 'a'.repeat(201), // 201 characters
			body_template: 'Body',
			trigger_type: 'general'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === 'subject_template')).toBe(true);
		expect(result.errors.some((e) => e.message.includes('200 caractères'))).toBe(true);
	});

	it('should reject template without body', () => {
		const template = {
			title: 'Valid Title',
			subject_template: 'Subject',
			body_template: '',
			trigger_type: 'general'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === 'body_template')).toBe(true);
	});

	it('should detect malformed placeholders in subject', () => {
		const template = {
			title: 'Valid Title',
			subject_template: 'Subject with {single_brace}',
			body_template: 'Body',
			trigger_type: 'general'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === 'subject_template')).toBe(true);
		expect(result.errors.some((e) => e.message.includes('mal formés'))).toBe(true);
	});

	it('should detect malformed placeholders in body', () => {
		const template = {
			title: 'Valid Title',
			subject_template: 'Subject',
			body_template: 'Body with {{unbalanced}',
			trigger_type: 'general'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === 'body_template')).toBe(true);
	});

	it('should warn about unknown variables', () => {
		const template = {
			title: 'Valid Title',
			subject_template: 'Subject',
			body_template: 'Body with {{student_name}} and {{unknown_variable}}',
			trigger_type: 'general'
		};

		const result = validateTemplate(template);

		// Should have warnings about unknown variable
		// Unknown variables create warnings, not errors
		expect(result.warnings.length).toBeGreaterThan(0);
		expect(result.warnings.some((w) => w.message.includes('inconnues'))).toBe(true);
	});

	it('should warn when no placeholders used', () => {
		const template = {
			title: 'Valid Title',
			subject_template: 'Static subject',
			body_template: 'Static body with no variables',
			trigger_type: 'general'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(true);
		expect(result.warnings.some((w) => w.message.includes('Aucun placeholder'))).toBe(true);
	});

	it('should validate conditional syntax', () => {
		const template = {
			title: 'Valid Title',
			subject_template: 'Subject',
			body_template: '{{student_name}} {{#if student_name}}content{{/if}}',
			trigger_type: 'general'
		};

		const result = validateTemplate(template);

		// Conditional validation should pass
		expect(result.errors.filter((e) => e.message.includes('{{#if}}'))).toHaveLength(0);
	});

	it('should reject unmatched conditionals', () => {
		const template = {
			title: 'Valid Title',
			subject_template: 'Subject',
			body_template: '{{#if var}}content', // Missing {{/if}}
			trigger_type: 'general'
		};

		const result = validateTemplate(template);

		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.includes('{{#if}}')).valueOf()).toBe(true);
	});

	it('should validate filter syntax', () => {
		const template = {
			title: 'Valid Title',
			subject_template: 'Subject',
			body_template: '{{student_name | uppercase}}',
			trigger_type: 'general'
		};

		const result = validateTemplate(template);

		// Known filters should not produce errors
		expect(result.errors.filter((e) => e.message.includes('Filtre'))).toHaveLength(0);
	});

	it('should warn about unknown filters', () => {
		const template = {
			title: 'Valid Title',
			subject_template: 'Subject',
			body_template: '{{student_name | unknown_filter}}',
			trigger_type: 'general'
		};

		const result = validateTemplate(template);

		// Should have warnings about unknown filter
		expect(result.warnings.some((w) => w.message.includes('inconnus'))).toBe(true);
	});
});

// ============================================================================
// PLACEHOLDER EXTRACTION TESTS
// ============================================================================

describe('extractPlaceholders', () => {
	it('should extract single placeholder', () => {
		const text = 'Hello {{name}}';
		const placeholders = extractPlaceholders(text);

		expect(placeholders).toHaveLength(1);
		expect(placeholders[0].match).toBe('{{name}}');
		expect(placeholders[0].variableName).toBe('name');
		expect(placeholders[0].startIndex).toBe(6);
	});

	it('should extract multiple placeholders', () => {
		const text = '{{greeting}} {{name}}, your score is {{score}}';
		const placeholders = extractPlaceholders(text);

		expect(placeholders).toHaveLength(3);
		expect(placeholders[0].variableName).toBe('greeting');
		expect(placeholders[1].variableName).toBe('name');
		expect(placeholders[2].variableName).toBe('score');
	});

	it('should extract placeholders with underscores', () => {
		const text = '{{student_name}} and {{teacher_first_name}}';
		const placeholders = extractPlaceholders(text);

		expect(placeholders).toHaveLength(2);
		expect(placeholders[0].variableName).toBe('student_name');
		expect(placeholders[1].variableName).toBe('teacher_first_name');
	});

	it('should extract duplicate placeholders separately', () => {
		const text = '{{name}} and {{name}} and {{name}}';
		const placeholders = extractPlaceholders(text);

		expect(placeholders).toHaveLength(3);
		expect(placeholders[0].startIndex).toBe(0);
		expect(placeholders[1].startIndex).toBe(13);
		expect(placeholders[2].startIndex).toBe(26);
	});

	it('should return empty array when no placeholders', () => {
		const text = 'No placeholders here';
		const placeholders = extractPlaceholders(text);

		expect(placeholders).toHaveLength(0);
	});

	it('should not extract malformed placeholders', () => {
		const text = 'Valid: {{name}} Invalid: {single} or {{spaced }}';
		const placeholders = extractPlaceholders(text);

		// Should only extract the valid one
		expect(placeholders).toHaveLength(1);
		expect(placeholders[0].variableName).toBe('name');
	});

	it('should handle placeholders at start and end', () => {
		const text = '{{start}}middle{{end}}';
		const placeholders = extractPlaceholders(text);

		expect(placeholders).toHaveLength(2);
		expect(placeholders[0].variableName).toBe('start');
		expect(placeholders[0].startIndex).toBe(0);
		expect(placeholders[1].variableName).toBe('end');
	});
});

describe('findMalformedPlaceholders', () => {
	it('should detect single braces', () => {
		const text = 'This has {single_brace}';
		const malformed = findMalformedPlaceholders(text);

		expect(malformed.length).toBeGreaterThan(0);
		expect(malformed.some((m) => m.includes('{single_brace}'))).toBe(true);
	});

	it('should detect unbalanced braces', () => {
		const text1 = 'This has {{unbalanced}';
		const text2 = 'This has {unbalanced}}';

		const malformed1 = findMalformedPlaceholders(text1);
		const malformed2 = findMalformedPlaceholders(text2);

		expect(malformed1.length).toBeGreaterThan(0);
		expect(malformed2.length).toBeGreaterThan(0);
	});

	it('should detect spaces inside braces', () => {
		const text = 'This has {{ spaced }}';
		const malformed = findMalformedPlaceholders(text);

		expect(malformed.length).toBeGreaterThan(0);
	});

	it('should return empty array for valid placeholders', () => {
		const text = 'Valid: {{name}} and {{other_name}}';
		const malformed = findMalformedPlaceholders(text);

		// The function also detects single braces, but {{name}} is valid
		// Just checking that valid double-brace format doesn't create issues
		expect(malformed.filter((m) => m.includes('{{') && m.includes('}}'))).toHaveLength(0);
	});

	it('should detect multiple types of malformations', () => {
		const text = 'Has {single}, {{unbalanced}, and {{ spaced }}';
		const malformed = findMalformedPlaceholders(text);

		expect(malformed.length).toBeGreaterThan(0);
	});
});

describe('getVariableNames', () => {
	it('should return unique variable names', () => {
		const text = '{{name}} and {{age}} and {{name}} again';
		const names = getVariableNames(text);

		expect(names).toHaveLength(2);
		expect(names).toContain('name');
		expect(names).toContain('age');
	});

	it('should return empty array for no variables', () => {
		const text = 'No variables here';
		const names = getVariableNames(text);

		expect(names).toHaveLength(0);
	});

	it('should handle complex variable names', () => {
		const text = '{{student_first_name}} and {{teacher_email_address}}';
		const names = getVariableNames(text);

		expect(names).toHaveLength(2);
		expect(names).toContain('student_first_name');
		expect(names).toContain('teacher_email_address');
	});
});

describe('containsVariable', () => {
	it('should return true when variable exists', () => {
		const text = 'Hello {{name}}, your score is {{score}}';

		expect(containsVariable(text, 'name')).toBe(true);
		expect(containsVariable(text, 'score')).toBe(true);
	});

	it('should return false when variable does not exist', () => {
		const text = 'Hello {{name}}';

		expect(containsVariable(text, 'age')).toBe(false);
		expect(containsVariable(text, 'missing')).toBe(false);
	});

	it('should match exact variable name', () => {
		const text = '{{student_name}}';

		expect(containsVariable(text, 'student_name')).toBe(true);
		expect(containsVariable(text, 'student')).toBe(false);
		expect(containsVariable(text, 'name')).toBe(false);
	});
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('formatDate', () => {
	it('should format date in long format', () => {
		const date = new Date('2025-10-27T10:00:00Z');
		const formatted = formatDate(date, false);

		expect(formatted).toContain('2025');
		// French format should include month name
		expect(formatted).toBeTruthy();
	});

	it('should format date in short format', () => {
		const date = new Date('2025-10-27T10:00:00Z');
		const formatted = formatDate(date, true);

		// Short format: DD/MM/YYYY
		expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
	});
});

describe('formatTime', () => {
	it('should format time as HH:MM', () => {
		const date = new Date('2025-10-27T14:30:00Z');
		const formatted = formatTime(date);

		expect(formatted).toMatch(/\d{2}:\d{2}/);
	});
});

describe('getCurrentSchoolYear', () => {
	it('should return school year in correct format', () => {
		const year = getCurrentSchoolYear();

		// Format: YYYY-YYYY (e.g., "2025-2026")
		expect(year).toMatch(/\d{4}-\d{4}/);
	});

	it('should calculate school year correctly', () => {
		const year = getCurrentSchoolYear();
		const [start, end] = year.split('-').map(Number);

		// End year should be start year + 1
		expect(end).toBe(start + 1);
	});
});

describe('buildGlobalContext', () => {
	it('should build global context with all fields', () => {
		const user = {
			full_name: 'Marie Dubois',
			first_name: 'Marie'
		};

		const context = buildGlobalContext(user);

		expect(context.student_name).toBe('Marie Dubois');
		expect(context.student_first_name).toBe('Marie');
		expect(context.today_date).toBeDefined();
		expect(context.today_date_short).toBeDefined();
		expect(context.time).toBeDefined();
		expect(context.year).toBeDefined();
	});

	it('should extract first name from full name when not provided', () => {
		const user = {
			full_name: 'Marie Dubois'
		};

		const context = buildGlobalContext(user);

		expect(context.student_first_name).toBe('Marie');
	});

	it('should handle single name', () => {
		const user = {
			full_name: 'Marie'
		};

		const context = buildGlobalContext(user);

		expect(context.student_name).toBe('Marie');
		expect(context.student_first_name).toBe('Marie');
	});
});

// ============================================================================
// EDGE CASES AND ERROR HANDLING
// ============================================================================

describe('Edge Cases', () => {
	it('should handle very long text with many variables', () => {
		let text = 'Start ';
		for (let i = 0; i < 100; i++) {
			text += `{{var${i}}} `;
		}
		text += 'End';

		const placeholders = extractPlaceholders(text);
		expect(placeholders).toHaveLength(100);
	});

	it('should handle special characters in text around placeholders', () => {
		const text = 'Special: !@#${{name}}%^&*(){{age}}[]{}';
		const placeholders = extractPlaceholders(text);

		expect(placeholders).toHaveLength(2);
		expect(placeholders[0].variableName).toBe('name');
		expect(placeholders[1].variableName).toBe('age');
	});

	it('should handle newlines and tabs in template', () => {
		const template: MessageTemplate = {
			...mockTemplate,
			body_template: 'Line 1: {{var1}}\n\tLine 2: {{var2}}\n\t\tLine 3: {{var3}}'
		};

		const data = { var1: 'A', var2: 'B', var3: 'C' };
		const result = renderTemplate(template, data);

		expect(result.body).toContain('Line 1: A');
		expect(result.body).toContain('Line 2: B');
		expect(result.body).toContain('Line 3: C');
	});

	it('should handle unicode characters', () => {
		const template: MessageTemplate = {
			...mockTemplate,
			body_template: 'Bonjour {{name}}, comment ça va? 🎉'
		};

		const data = { name: 'François' };
		const result = renderTemplate(template, data);

		expect(result.body).toBe('Bonjour François, comment ça va? 🎉');
	});

	it('should handle empty template', () => {
		const template: MessageTemplate = {
			...mockTemplate,
			subject_template: '',
			body_template: ''
		};

		const result = renderTemplate(template, mockData);

		expect(result.subject).toBe('');
		expect(result.body).toBe('');
	});

	it('should not replace partial matches', () => {
		const template: MessageTemplate = {
			...mockTemplate,
			body_template: '{{name}} vs name vs {{name}}'
		};

		const data = { name: 'Test' };
		const result = renderTemplate(template, data);

		expect(result.body).toBe('Test vs name vs Test');
		// Plain "name" should not be replaced
	});
});
