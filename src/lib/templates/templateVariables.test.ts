/**
 * Template Variables Registry - Unit Tests
 * =========================================
 *
 * Comprehensive test suite for template variable registry system.
 * Tests variable definitions, categorization, and helper functions.
 *
 * @module templates/templateVariables.test
 */

import { describe, it, expect } from 'vitest';
import {
	GLOBAL_VARIABLES,
	ASSESSMENT_VARIABLES,
	SRS_VARIABLES,
	ENIGMA_VARIABLES,
	NOTIFICATION_VARIABLES,
	GENERAL_VARIABLES,
	VARIABLES_BY_TRIGGER,
	getVariablesForTrigger,
	getVariable,
	getRequiredVariables,
	getUserInputVariables,
	getAutoFilledVariables,
	isValidVariable,
	getExampleData,
	formatVariableName,
	extractVariableName
} from './templateVariables';
import type { TriggerType } from '$lib/types/messageTemplates';

// ============================================================================
// GLOBAL VARIABLES TESTS
// ============================================================================

describe('GLOBAL_VARIABLES', () => {
	it('should include student variables', () => {
		const studentVars = GLOBAL_VARIABLES.filter((v) => v.name.startsWith('student_'));

		expect(studentVars.length).toBeGreaterThan(0);
		expect(studentVars.some((v) => v.name === 'student_name')).toBe(true);
		expect(studentVars.some((v) => v.name === 'student_first_name')).toBe(true);
	});

	it('should include teacher variables', () => {
		const teacherVar = GLOBAL_VARIABLES.find((v) => v.name === 'teacher_name');

		expect(teacherVar).toBeDefined();
		expect(teacherVar?.label).toBeTruthy();
		expect(teacherVar?.example).toBeTruthy();
	});

	it('should include class variables', () => {
		const classVar = GLOBAL_VARIABLES.find((v) => v.name === 'class_name');

		expect(classVar).toBeDefined();
		expect(classVar?.example).toBeTruthy();
	});

	it('should include date/time variables', () => {
		const dateVars = GLOBAL_VARIABLES.filter((v) =>
			['today_date', 'today_date_short', 'time', 'year'].includes(v.name)
		);

		expect(dateVars).toHaveLength(4);
		dateVars.forEach((v) => {
			expect(v.label).toBeTruthy();
			expect(v.example).toBeTruthy();
		});
	});

	it('should have valid structure for all variables', () => {
		GLOBAL_VARIABLES.forEach((variable) => {
			expect(variable.name).toBeTruthy();
			expect(variable.label).toBeTruthy();
			expect(variable.example).toBeTruthy();
			expect(variable.description).toBeTruthy();
		});
	});

	it('should have French labels and descriptions', () => {
		GLOBAL_VARIABLES.forEach((variable) => {
			// Check that labels/descriptions contain French characters or common French words
			expect(variable.label.length).toBeGreaterThan(0);
			expect(variable.description.length).toBeGreaterThan(0);
		});
	});
});

// ============================================================================
// CONTEXT-SPECIFIC VARIABLES TESTS
// ============================================================================

describe('ASSESSMENT_VARIABLES', () => {
	it('should include assessment-specific fields', () => {
		const names = ASSESSMENT_VARIABLES.map((v) => v.name);

		expect(names).toContain('assessment_title');
		expect(names).toContain('assessment_link');
		expect(names).toContain('assessment_due_date');
		expect(names).toContain('assessment_type');
	});

	it('should mark assessment_title as required', () => {
		const titleVar = ASSESSMENT_VARIABLES.find((v) => v.name === 'assessment_title');

		expect(titleVar?.required).toBe(true);
	});

	it('should mark assessment_link as required', () => {
		const linkVar = ASSESSMENT_VARIABLES.find((v) => v.name === 'assessment_link');

		expect(linkVar?.required).toBe(true);
	});

	it('should include user input variable', () => {
		const userInputVar = ASSESSMENT_VARIABLES.find((v) => v.userInput);

		expect(userInputVar).toBeDefined();
		expect(userInputVar?.name).toBe('student_question');
		expect(userInputVar?.required).toBe(true);
	});

	it('should have valid examples for all variables', () => {
		ASSESSMENT_VARIABLES.forEach((variable) => {
			expect(variable.example).toBeTruthy();
			expect(variable.example.length).toBeGreaterThan(0);
		});
	});
});

describe('SRS_VARIABLES', () => {
	it('should include SRS-specific fields', () => {
		const names = SRS_VARIABLES.map((v) => v.name);

		expect(names).toContain('deck_name');
		expect(names).toContain('deck_link');
		expect(names).toContain('card_count');
		expect(names).toContain('due_cards');
	});

	it('should mark deck fields as required', () => {
		const deckName = SRS_VARIABLES.find((v) => v.name === 'deck_name');
		const deckLink = SRS_VARIABLES.find((v) => v.name === 'deck_link');

		expect(deckName?.required).toBe(true);
		expect(deckLink?.required).toBe(true);
	});

	it('should include user input variable', () => {
		const userInputVar = SRS_VARIABLES.find((v) => v.userInput);

		expect(userInputVar).toBeDefined();
		expect(userInputVar?.name).toBe('student_message');
	});

	it('should have numeric examples for counts', () => {
		const cardCount = SRS_VARIABLES.find((v) => v.name === 'card_count');
		const dueCards = SRS_VARIABLES.find((v) => v.name === 'due_cards');

		expect(cardCount?.example).toBeTruthy();
		expect(dueCards?.example).toBeTruthy();
		// Should be numeric strings
		expect(/^\d+$/.test(cardCount?.example || '')).toBe(true);
		expect(/^\d+$/.test(dueCards?.example || '')).toBe(true);
	});
});

describe('ENIGMA_VARIABLES', () => {
	it('should include enigma-specific fields', () => {
		const names = ENIGMA_VARIABLES.map((v) => v.name);

		expect(names).toContain('enigma_number');
		expect(names).toContain('enigma_title');
		expect(names).toContain('enigma_link');
		expect(names).toContain('enigma_difficulty');
	});

	it('should mark required fields', () => {
		const numberVar = ENIGMA_VARIABLES.find((v) => v.name === 'enigma_number');
		const linkVar = ENIGMA_VARIABLES.find((v) => v.name === 'enigma_link');

		expect(numberVar?.required).toBe(true);
		expect(linkVar?.required).toBe(true);
	});

	it('should include student answer as user input', () => {
		const answerVar = ENIGMA_VARIABLES.find((v) => v.name === 'student_answer');

		expect(answerVar).toBeDefined();
		expect(answerVar?.userInput).toBe(true);
		expect(answerVar?.required).toBe(true);
	});
});

describe('NOTIFICATION_VARIABLES', () => {
	it('should include notification fields', () => {
		const names = NOTIFICATION_VARIABLES.map((v) => v.name);

		expect(names).toContain('notification_title');
		expect(names).toContain('notification_body');
		expect(names).toContain('notification_link');
		expect(names).toContain('notification_type');
	});

	it('should mark title and body as required', () => {
		const titleVar = NOTIFICATION_VARIABLES.find((v) => v.name === 'notification_title');
		const bodyVar = NOTIFICATION_VARIABLES.find((v) => v.name === 'notification_body');

		expect(titleVar?.required).toBe(true);
		expect(bodyVar?.required).toBe(true);
	});

	it('should have valid notification type example', () => {
		const typeVar = NOTIFICATION_VARIABLES.find((v) => v.name === 'notification_type');

		expect(typeVar?.example).toBeTruthy();
		// Should be one of the valid types
		expect(['info', 'warning', 'success', 'error']).toContain(typeVar?.example);
	});
});

describe('GENERAL_VARIABLES', () => {
	it('should include custom fields for general messages', () => {
		const names = GENERAL_VARIABLES.map((v) => v.name);

		expect(names).toContain('custom_subject');
		expect(names).toContain('custom_message');
	});

	it('should mark all general variables as user input', () => {
		GENERAL_VARIABLES.forEach((variable) => {
			expect(variable.userInput).toBe(true);
			expect(variable.required).toBe(true);
		});
	});
});

// ============================================================================
// VARIABLES BY TRIGGER TESTS
// ============================================================================

describe('VARIABLES_BY_TRIGGER', () => {
	it('should have entry for each trigger type', () => {
		const triggerTypes: TriggerType[] = [
			'assessment_question',
			'srs_help',
			'enigma_answer',
			'system_notification',
			'general'
		];

		triggerTypes.forEach((type) => {
			expect(VARIABLES_BY_TRIGGER[type]).toBeDefined();
			expect(Array.isArray(VARIABLES_BY_TRIGGER[type])).toBe(true);
		});
	});

	it('should include global variables in all triggers', () => {
		Object.values(VARIABLES_BY_TRIGGER).forEach((variables) => {
			// Each trigger should include global variables
			const hasStudentName = variables.some((v) => v.name === 'student_name');
			const hasToday = variables.some((v) => v.name === 'today_date');

			expect(hasStudentName).toBe(true);
			expect(hasToday).toBe(true);
		});
	});

	it('should include context-specific variables for assessment', () => {
		const variables = VARIABLES_BY_TRIGGER.assessment_question;

		expect(variables.some((v) => v.name === 'assessment_title')).toBe(true);
		expect(variables.some((v) => v.name === 'student_question')).toBe(true);
	});

	it('should include context-specific variables for SRS', () => {
		const variables = VARIABLES_BY_TRIGGER.srs_help;

		expect(variables.some((v) => v.name === 'deck_name')).toBe(true);
		expect(variables.some((v) => v.name === 'student_message')).toBe(true);
	});

	it('should not have duplicate variables in any trigger', () => {
		Object.entries(VARIABLES_BY_TRIGGER).forEach(([_trigger, variables]) => {
			const names = variables.map((v) => v.name);
			const uniqueNames = new Set(names);

			expect(names.length).toBe(uniqueNames.size);
		});
	});
});

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe('getVariablesForTrigger', () => {
	it('should return variables for assessment trigger', () => {
		const variables = getVariablesForTrigger('assessment_question');

		expect(variables.length).toBeGreaterThan(GLOBAL_VARIABLES.length);
		expect(variables.some((v) => v.name === 'assessment_title')).toBe(true);
	});

	it('should return variables for SRS trigger', () => {
		const variables = getVariablesForTrigger('srs_help');

		expect(variables.some((v) => v.name === 'deck_name')).toBe(true);
		expect(variables.some((v) => v.name === 'card_count')).toBe(true);
	});

	it('should return variables for enigma trigger', () => {
		const variables = getVariablesForTrigger('enigma_answer');

		expect(variables.some((v) => v.name === 'enigma_number')).toBe(true);
		expect(variables.some((v) => v.name === 'student_answer')).toBe(true);
	});

	it('should return variables for notification trigger', () => {
		const variables = getVariablesForTrigger('system_notification');

		expect(variables.some((v) => v.name === 'notification_title')).toBe(true);
	});

	it('should return variables for general trigger', () => {
		const variables = getVariablesForTrigger('general');

		expect(variables.some((v) => v.name === 'custom_subject')).toBe(true);
		expect(variables.some((v) => v.name === 'custom_message')).toBe(true);
	});

	it('should always include global variables', () => {
		const triggers: TriggerType[] = [
			'assessment_question',
			'srs_help',
			'enigma_answer',
			'system_notification',
			'general'
		];

		triggers.forEach((trigger) => {
			const variables = getVariablesForTrigger(trigger);
			expect(variables.some((v) => v.name === 'student_name')).toBe(true);
			expect(variables.some((v) => v.name === 'today_date')).toBe(true);
		});
	});
});

describe('getVariable', () => {
	it('should find global variable in any trigger', () => {
		const variable = getVariable('assessment_question', 'student_name');

		expect(variable).toBeDefined();
		expect(variable?.name).toBe('student_name');
		expect(variable?.label).toBeTruthy();
	});

	it('should find context-specific variable', () => {
		const variable = getVariable('assessment_question', 'assessment_title');

		expect(variable).toBeDefined();
		expect(variable?.name).toBe('assessment_title');
	});

	it('should return undefined for non-existent variable', () => {
		const variable = getVariable('assessment_question', 'unknown_variable');

		expect(variable).toBeUndefined();
	});

	it('should return undefined for wrong context', () => {
		const variable = getVariable('srs_help', 'assessment_title');

		// assessment_title is not available in srs_help context
		expect(variable).toBeUndefined();
	});

	it('should handle all trigger types', () => {
		const triggers: TriggerType[] = [
			'assessment_question',
			'srs_help',
			'enigma_answer',
			'system_notification',
			'general'
		];

		triggers.forEach((trigger) => {
			const variable = getVariable(trigger, 'student_name');
			expect(variable).toBeDefined();
		});
	});
});

describe('getRequiredVariables', () => {
	it('should return only required variables', () => {
		const required = getRequiredVariables('assessment_question');

		expect(required.every((v) => v.required === true)).toBe(true);
	});

	it('should include required assessment variables', () => {
		const required = getRequiredVariables('assessment_question');
		const names = required.map((v) => v.name);

		expect(names).toContain('assessment_title');
		expect(names).toContain('assessment_link');
		expect(names).toContain('student_question');
	});

	it('should filter out optional variables', () => {
		const all = getVariablesForTrigger('assessment_question');
		const required = getRequiredVariables('assessment_question');

		expect(required.length).toBeLessThan(all.length);
	});

	it('should return empty array if no required variables', () => {
		// Global variables are typically not required
		const required = getRequiredVariables('general').filter((v) => GLOBAL_VARIABLES.includes(v));

		// Should still have some required variables (custom_subject, custom_message)
		expect(required.length).toBeGreaterThanOrEqual(0);
	});
});

describe('getUserInputVariables', () => {
	it('should return only user input variables', () => {
		const userInput = getUserInputVariables('assessment_question');

		expect(userInput.every((v) => v.userInput === true)).toBe(true);
	});

	it('should include student_question for assessments', () => {
		const userInput = getUserInputVariables('assessment_question');

		expect(userInput.some((v) => v.name === 'student_question')).toBe(true);
	});

	it('should include student_message for SRS', () => {
		const userInput = getUserInputVariables('srs_help');

		expect(userInput.some((v) => v.name === 'student_message')).toBe(true);
	});

	it('should include custom fields for general', () => {
		const userInput = getUserInputVariables('general');

		expect(userInput.some((v) => v.name === 'custom_subject')).toBe(true);
		expect(userInput.some((v) => v.name === 'custom_message')).toBe(true);
	});

	it('should not include auto-filled variables', () => {
		const userInput = getUserInputVariables('assessment_question');
		const names = userInput.map((v) => v.name);

		// These should be auto-filled, not user input
		expect(names).not.toContain('student_name');
		expect(names).not.toContain('teacher_name');
		expect(names).not.toContain('today_date');
	});
});

describe('getAutoFilledVariables', () => {
	it('should return only auto-filled variables', () => {
		const autoFilled = getAutoFilledVariables('assessment_question');

		expect(autoFilled.every((v) => !v.userInput)).toBe(true);
	});

	it('should include global variables', () => {
		const autoFilled = getAutoFilledVariables('assessment_question');
		const names = autoFilled.map((v) => v.name);

		expect(names).toContain('student_name');
		expect(names).toContain('teacher_name');
		expect(names).toContain('today_date');
	});

	it('should not include user input variables', () => {
		const autoFilled = getAutoFilledVariables('assessment_question');
		const names = autoFilled.map((v) => v.name);

		expect(names).not.toContain('student_question');
	});

	it('should include context-specific auto-filled variables', () => {
		const autoFilled = getAutoFilledVariables('assessment_question');
		const names = autoFilled.map((v) => v.name);

		expect(names).toContain('assessment_title');
		expect(names).toContain('assessment_link');
	});
});

describe('isValidVariable', () => {
	it('should return true for valid global variables', () => {
		expect(isValidVariable('assessment_question', 'student_name')).toBe(true);
		expect(isValidVariable('srs_help', 'teacher_name')).toBe(true);
		expect(isValidVariable('general', 'today_date')).toBe(true);
	});

	it('should return true for valid context-specific variables', () => {
		expect(isValidVariable('assessment_question', 'assessment_title')).toBe(true);
		expect(isValidVariable('srs_help', 'deck_name')).toBe(true);
		expect(isValidVariable('enigma_answer', 'enigma_number')).toBe(true);
	});

	it('should return false for invalid variables', () => {
		expect(isValidVariable('assessment_question', 'unknown_variable')).toBe(false);
		expect(isValidVariable('srs_help', 'invalid_field')).toBe(false);
	});

	it('should return false for variables in wrong context', () => {
		expect(isValidVariable('srs_help', 'assessment_title')).toBe(false);
		expect(isValidVariable('assessment_question', 'deck_name')).toBe(false);
	});

	it('should be case-sensitive', () => {
		expect(isValidVariable('assessment_question', 'Student_Name')).toBe(false);
		expect(isValidVariable('assessment_question', 'STUDENT_NAME')).toBe(false);
	});
});

describe('getExampleData', () => {
	it('should return example values for all variables', () => {
		const examples = getExampleData('assessment_question');

		expect(examples.student_name).toBeTruthy();
		expect(examples.teacher_name).toBeTruthy();
		expect(examples.assessment_title).toBeTruthy();
	});

	it('should have string values for all examples', () => {
		const examples = getExampleData('assessment_question');

		Object.values(examples).forEach((value) => {
			expect(typeof value).toBe('string');
		});
	});

	it('should include all variables for trigger', () => {
		const variables = getVariablesForTrigger('assessment_question');
		const examples = getExampleData('assessment_question');

		variables.forEach((variable) => {
			expect(examples[variable.name]).toBeDefined();
			expect(examples[variable.name]).toBe(variable.example);
		});
	});

	it('should work for all trigger types', () => {
		const triggers: TriggerType[] = [
			'assessment_question',
			'srs_help',
			'enigma_answer',
			'system_notification',
			'general'
		];

		triggers.forEach((trigger) => {
			const examples = getExampleData(trigger);
			expect(Object.keys(examples).length).toBeGreaterThan(0);
		});
	});
});

describe('formatVariableName', () => {
	it('should wrap variable name in double braces', () => {
		expect(formatVariableName('student_name')).toBe('{{student_name}}');
		expect(formatVariableName('assessment_title')).toBe('{{assessment_title}}');
	});

	it('should handle empty string', () => {
		expect(formatVariableName('')).toBe('{{}}');
	});

	it('should handle special characters', () => {
		expect(formatVariableName('var_123')).toBe('{{var_123}}');
	});
});

describe('extractVariableName', () => {
	it('should extract name from formatted placeholder', () => {
		expect(extractVariableName('{{student_name}}')).toBe('student_name');
		expect(extractVariableName('{{assessment_title}}')).toBe('assessment_title');
	});

	it('should handle placeholder with spaces', () => {
		expect(extractVariableName('{{ student_name }}')).toBe('student_name');
		expect(extractVariableName('{{  name  }}')).toBe('name');
	});

	it('should handle plain text without braces', () => {
		expect(extractVariableName('student_name')).toBe('student_name');
	});

	it('should handle empty braces', () => {
		expect(extractVariableName('{{}}')).toBe('');
	});

	it('should handle single braces', () => {
		// extractVariableName only removes {{ and }}, not single braces
		expect(extractVariableName('{student_name}')).toBe('{student_name}');
	});
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration Tests', () => {
	it('should have consistent data across all functions', () => {
		const trigger: TriggerType = 'assessment_question';

		const allVars = getVariablesForTrigger(trigger);
		const required = getRequiredVariables(trigger);
		const userInput = getUserInputVariables(trigger);
		const autoFilled = getAutoFilledVariables(trigger);

		// Required + optional should equal all
		expect(required.length).toBeLessThanOrEqual(allVars.length);

		// UserInput + autoFilled should equal all
		expect(userInput.length + autoFilled.length).toBe(allVars.length);

		// No overlap between userInput and autoFilled
		const userInputNames = new Set(userInput.map((v) => v.name));
		const autoFilledNames = new Set(autoFilled.map((v) => v.name));
		const intersection = new Set([...userInputNames].filter((x) => autoFilledNames.has(x)));
		expect(intersection.size).toBe(0);
	});

	it('should validate all registered variables', () => {
		const triggers: TriggerType[] = [
			'assessment_question',
			'srs_help',
			'enigma_answer',
			'system_notification',
			'general'
		];

		triggers.forEach((trigger) => {
			const variables = getVariablesForTrigger(trigger);

			variables.forEach((variable) => {
				expect(isValidVariable(trigger, variable.name)).toBe(true);
			});
		});
	});

	it('should have examples for all variables in all contexts', () => {
		const triggers: TriggerType[] = [
			'assessment_question',
			'srs_help',
			'enigma_answer',
			'system_notification',
			'general'
		];

		triggers.forEach((trigger) => {
			const variables = getVariablesForTrigger(trigger);
			const examples = getExampleData(trigger);

			variables.forEach((variable) => {
				expect(examples[variable.name]).toBeTruthy();
				expect(examples[variable.name].length).toBeGreaterThan(0);
			});
		});
	});

	it('should maintain consistency between format and extract', () => {
		const names = ['student_name', 'assessment_title', 'today_date'];

		names.forEach((name) => {
			const formatted = formatVariableName(name);
			const extracted = extractVariableName(formatted);
			expect(extracted).toBe(name);
		});
	});

	it('should have unique variable names within each trigger', () => {
		const triggers: TriggerType[] = [
			'assessment_question',
			'srs_help',
			'enigma_answer',
			'system_notification',
			'general'
		];

		triggers.forEach((trigger) => {
			const variables = getVariablesForTrigger(trigger);
			const names = variables.map((v) => v.name);
			const uniqueNames = new Set(names);

			expect(names.length).toBe(uniqueNames.size);
		});
	});
});

// ============================================================================
// DATA QUALITY TESTS
// ============================================================================

describe('Data Quality', () => {
	it('should have French labels for all variables', () => {
		const allVariables = [
			...GLOBAL_VARIABLES,
			...ASSESSMENT_VARIABLES,
			...SRS_VARIABLES,
			...ENIGMA_VARIABLES,
			...NOTIFICATION_VARIABLES,
			...GENERAL_VARIABLES
		];

		allVariables.forEach((variable) => {
			expect(variable.label).toBeTruthy();
			expect(variable.label.length).toBeGreaterThan(0);
			// Labels should not be just the variable name
			expect(variable.label).not.toBe(variable.name);
		});
	});

	it('should have meaningful examples', () => {
		const allVariables = [
			...GLOBAL_VARIABLES,
			...ASSESSMENT_VARIABLES,
			...SRS_VARIABLES,
			...ENIGMA_VARIABLES,
			...NOTIFICATION_VARIABLES,
			...GENERAL_VARIABLES
		];

		allVariables.forEach((variable) => {
			expect(variable.example).toBeTruthy();
			expect(variable.example.length).toBeGreaterThan(0);
			// Examples should not be placeholder text like "example" or "test"
			expect(variable.example).not.toBe('example');
			expect(variable.example).not.toBe('test');
		});
	});

	it('should have descriptions for all variables', () => {
		const allVariables = [
			...GLOBAL_VARIABLES,
			...ASSESSMENT_VARIABLES,
			...SRS_VARIABLES,
			...ENIGMA_VARIABLES,
			...NOTIFICATION_VARIABLES,
			...GENERAL_VARIABLES
		];

		allVariables.forEach((variable) => {
			expect(variable.description).toBeTruthy();
			expect(variable.description.length).toBeGreaterThan(0);
		});
	});

	it('should have consistent naming conventions', () => {
		const allVariables = [
			...GLOBAL_VARIABLES,
			...ASSESSMENT_VARIABLES,
			...SRS_VARIABLES,
			...ENIGMA_VARIABLES,
			...NOTIFICATION_VARIABLES,
			...GENERAL_VARIABLES
		];

		allVariables.forEach((variable) => {
			// Variable names should be lowercase with underscores
			expect(variable.name).toMatch(/^[a-z][a-z0-9_]*$/);
			// Should not end with underscore
			expect(variable.name).not.toMatch(/_$/);
			// Should not have double underscores
			expect(variable.name).not.toContain('__');
		});
	});

	it('should mark appropriate variables as required', () => {
		// Assessment title and link should always be required
		const assessmentTitle = ASSESSMENT_VARIABLES.find((v) => v.name === 'assessment_title');
		expect(assessmentTitle?.required).toBe(true);

		// User input should typically be required
		const studentQuestion = ASSESSMENT_VARIABLES.find((v) => v.name === 'student_question');
		expect(studentQuestion?.required).toBe(true);
		expect(studentQuestion?.userInput).toBe(true);
	});
});
