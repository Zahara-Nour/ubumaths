/**
 * Template Validator
 * ==================
 *
 * Validates question template structure and syntax.
 *
 * @module questions/validators/template-validator
 */

import type { QuestionTemplate } from '../types';

/**
 * Validate a question template
 *
 * Checks:
 * - Required fields are present
 * - Type-specific fields are valid
 * - Syntax of special expressions
 * - Field consistency
 *
 * @param template - Question template to validate
 * @returns Array of error messages (empty if valid)
 */
export function validateTemplate(template: QuestionTemplate): string[] {
  const errors: string[] = [];

  // Required fields
  if (!template.type) {
    errors.push('Missing required field: type');
  }

  if (!template.statement || template.statement.length === 0) {
    errors.push('Missing required field: statement');
  }

  if (!template.answer) {
    errors.push('Missing required field: answer');
  }

  if (!template.grades || template.grades.length === 0) {
    errors.push('Missing required field: grades');
  }

  // Categorization fields
  if (!template.theme || template.theme.trim() === '') {
    errors.push('Missing required field: theme');
  }

  if (!template.domain || template.domain.trim() === '') {
    errors.push('Missing required field: domain');
  }

  if (!template.level || template.level <= 0) {
    errors.push('level must be a positive integer');
  }

  // Type-specific validation
  switch (template.type) {
    case 'algebraic_transform':
      if (!template.transformType) {
        errors.push('algebraic_transform requires transformType');
      }
      break;

    case 'fill_in_blanks':
      if (!template.blanks || template.blanks.length === 0) {
        errors.push('fill_in_blanks requires at least one blank');
      }
      break;

    case 'multiple_choice':
      if (!template.choices || template.choices.length < 2) {
        errors.push('multiple_choice requires at least 2 choices');
      }

      // Check that at least one choice is correct
      if (template.choices) {
        const hasCorrect = template.choices.some((choice) => choice.isCorrect);
        if (!hasCorrect) {
          errors.push('multiple_choice requires at least one correct choice');
        }
      }
      break;
  }

  // Validate delay (if present)
  if (template.delay !== undefined && template.delay <= 0) {
    errors.push('delay must be positive');
  }

  // Validate precision (if present)
  if (template.precision) {
    const precision = template.precision;

    if (precision.type === 'decimal' || precision.type === 'significant' || precision.type === 'magnitude') {
      if (!('digits' in precision) || precision.digits <= 0) {
        errors.push(`${precision.type} precision requires positive digits`);
      }
    }

    if (precision.type === 'tolerance') {
      if (!('tolerance' in precision) || precision.tolerance <= 0) {
        errors.push('tolerance precision requires positive tolerance value');
      }
      if (!('mode' in precision)) {
        errors.push('tolerance precision requires mode (absolute or relative)');
      }
    }
  }

  // Validate content fields
  for (const field of template.statement) {
    if (field.type === 'text' && !field.content) {
      errors.push('Text content field cannot be empty');
    }
    if (field.type === 'image' && !field.url) {
      errors.push('Image field requires url');
    }
  }

  // Validate correction fields (if present and not empty array)
  if (template.correction && template.correction.length > 0) {
    for (const field of template.correction) {
      if (field.type === 'text' && !field.content) {
        errors.push('Correction text field cannot be empty');
      }
      if (field.type === 'image' && !field.url) {
        errors.push('Correction image field requires url');
      }
    }
  }

  // Validate variable names (no duplicates)
  if (template.variables) {
    const varNames = new Set<string>();
    for (const variable of template.variables) {
      if (!variable.name) {
        errors.push('Variable must have a name');
      } else if (varNames.has(variable.name)) {
        errors.push(`Duplicate variable name: ${variable.name}`);
      } else {
        varNames.add(variable.name);
      }

      if (!variable.expression) {
        errors.push(`Variable "${variable.name}" must have an expression`);
      }
    }
  }

  return errors;
}

/**
 * Check if template is valid (no errors)
 */
export function isValidTemplate(template: QuestionTemplate): boolean {
  return validateTemplate(template).length === 0;
}
