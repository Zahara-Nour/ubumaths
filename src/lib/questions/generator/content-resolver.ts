/**
 * Content Field Resolver
 * ======================
 *
 * Resolves ContentField arrays by replacing variables and generating
 * random values in text content.
 *
 * @module questions/generator/content-resolver
 */

import type { ContentField, ResolvedVariable } from '../types';
import { resolveVariableExpression } from './variable-resolver';

/**
 * Resolve a single content field
 *
 * - Text fields: Resolves variables, random expressions, and eval expressions
 * - Image fields: Resolves variables in URLs
 *
 * @param field - Content field to resolve
 * @param resolvedVariables - Already resolved variables
 * @param seed - Optional seed for random generation
 * @returns Resolved content field
 */
export function resolveContentField(
  field: ContentField,
  resolvedVariables: ResolvedVariable[],
  seed?: number
): ContentField {
  // Resolve content for both text and image fields (image URLs may contain variables)
  const resolvedContent = resolveVariableExpression(
    field.content,
    resolvedVariables,
    seed
  );

  return {
    type: field.type,
    content: resolvedContent
  };
}

/**
 * Resolve an array of content fields
 *
 * @param fields - Array of content fields
 * @param resolvedVariables - Already resolved variables
 * @param seed - Optional seed for random generation
 * @returns Array of resolved content fields
 */
export function resolveContentFields(
  fields: ContentField[],
  resolvedVariables: ResolvedVariable[],
  seed?: number
): ContentField[] {
  return fields.map((field) => resolveContentField(field, resolvedVariables, seed));
}

/**
 * Resolve a string expression (for answers, blanks, etc.)
 *
 * @param expression - Expression string
 * @param resolvedVariables - Already resolved variables
 * @param seed - Optional seed for random generation
 * @returns Resolved string
 */
export function resolveExpression(
  expression: string,
  resolvedVariables: ResolvedVariable[],
  seed?: number
): string {
  return resolveVariableExpression(expression, resolvedVariables, seed);
}

/**
 * Resolve answer (can be string or array of strings)
 *
 * @param answer - Answer from template
 * @param resolvedVariables - Already resolved variables
 * @param seed - Optional seed for random generation
 * @returns Resolved answer
 */
export function resolveAnswer(
  answer: string | string[],
  resolvedVariables: ResolvedVariable[],
  seed?: number
): string | string[] {
  if (Array.isArray(answer)) {
    return answer.map((ans) => resolveExpression(ans, resolvedVariables, seed));
  }

  return resolveExpression(answer, resolvedVariables, seed);
}
