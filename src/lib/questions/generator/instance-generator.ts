/**
 * Question Instance Generator
 * ===========================
 *
 * Main orchestrator for generating question instances from templates.
 * Handles complete resolution pipeline:
 * 1. Template validation
 * 2. Circular dependency detection
 * 3. Variable resolution
 * 4. Content resolution
 * 5. Choice shuffling (for QCM)
 *
 * @module questions/generator/instance-generator
 */

import type { QuestionTemplate, QuestionInstance, GenerationResult } from '../types';
import { validateTemplate } from '../validators/template-validator';
import { detectCircularDependencies } from '../validators/circular-dependency';
import { resolveVariables } from './variable-resolver';
import { resolveContentFields, resolveAnswer, resolveExpression } from './content-resolver';
import { shuffleChoices } from './choice-shuffler';

/**
 * Generate a question instance from a template
 *
 * @param template - Question template
 * @param seed - Optional seed for reproducible generation
 * @returns Generation result (success with instance or failure with errors)
 *
 * @example
 * ```typescript
 * const template: QuestionTemplate = {
 *   id: 'uuid',
 *   type: 'numerical_exact',
 *   statement: [{ type: 'text', content: 'Calculate $${@:a} + {@:b}$$' }],
 *   variables: [
 *     { name: 'a', expression: '{#:1-10}' },
 *     { name: 'b', expression: '{#:1-10}' }
 *   ],
 *   answer: '{eval:{@:a}+{@:b}}',
 *   grades: ['6'],
 *   delay: 30
 * };
 *
 * const result = generateInstance(template, 42);
 * if (result.success) {
 *   console.log(result.instance.statement[0].content);  // "Calculate $$7 + 3$$"
 *   console.log(result.instance.answer);                 // "10"
 * }
 * ```
 */
export function generateInstance(
  template: QuestionTemplate,
  seed?: number
): GenerationResult {
  try {
    // 1. Validate template structure
    const validationErrors = validateTemplate(template);
    if (validationErrors.length > 0) {
      return {
        success: false,
        errors: validationErrors
      };
    }

    // 2. Detect circular dependencies
    const circularErrors = detectCircularDependencies(template.variables);
    if (circularErrors.length > 0) {
      return {
        success: false,
        errors: circularErrors
      };
    }

    // 3. Resolve variables in declaration order
    const resolvedVariables = resolveVariables(template.variables, seed);

    // 4. Resolve content fields
    const resolvedStatement = resolveContentFields(
      template.statement,
      resolvedVariables,
      seed
    );

    const resolvedAnswer = resolveAnswer(
      template.answer,
      resolvedVariables,
      seed
    );

    const resolvedCorrection = template.correction
      ? resolveContentFields(template.correction, resolvedVariables, seed)
      : undefined;

    // 5. Resolve type-specific fields
    let resolvedChoices;
    let shuffledChoices;
    let resolvedBlanks;

    if (template.type === 'multiple_choice' && template.choices) {
      // Resolve choice content
      resolvedChoices = template.choices.map((choice) => ({
        content: resolveContentFields([choice.content], resolvedVariables, seed)[0],
        isCorrect: choice.isCorrect
      }));

      // Shuffle choices
      shuffledChoices = shuffleChoices(resolvedChoices, seed);
    }

    if (template.type === 'fill_in_blanks' && template.blanks) {
      resolvedBlanks = template.blanks.map((blank) => ({
        position: blank.position,
        expectedAnswer: resolveExpression(
          blank.expectedAnswer,
          resolvedVariables,
          seed
        )
      }));
    }

    // 6. Construct instance
    const instance: QuestionInstance = {
      templateId: template.id,
      type: template.type,
      statement: resolvedStatement,
      resolvedVariables,
      answer: resolvedAnswer,
      options: template.options,
      precision: template.precision,
      grades: template.grades,
      delay: template.delay,
      correction: resolvedCorrection,
      transformType: template.transformType,
      blanks: resolvedBlanks,
      choices: resolvedChoices,
      shuffledChoices,
      multipleAnswers: template.multipleAnswers,
      generatedAt: new Date().toISOString(),
      seed
    };

    return {
      success: true,
      instance
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        error instanceof Error
          ? error.message
          : `Unknown error: ${String(error)}`
      ]
    };
  }
}

/**
 * Generate multiple instances from a template
 *
 * Useful for creating practice sets or test banks.
 *
 * @param template - Question template
 * @param count - Number of instances to generate
 * @param baseSeed - Base seed (instances will use baseSeed + index)
 * @returns Array of generation results
 */
export function generateMultipleInstances(
  template: QuestionTemplate,
  count: number,
  baseSeed?: number
): GenerationResult[] {
  const results: GenerationResult[] = [];

  for (let i = 0; i < count; i++) {
    const seed = baseSeed !== undefined ? baseSeed + i : undefined;
    results.push(generateInstance(template, seed));
  }

  return results;
}
