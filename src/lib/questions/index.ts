/**
 * Question Bank System - Public API
 * ==================================
 *
 * Main entry point for the question bank system.
 *
 * @module questions
 */

// Types
export type * from './types';

// Parsers
export { tokenize, findTokensByType, type Token, type TokenType } from './parser/tokenizer';

export { parseRandomExpression, parseNumberOrVariable } from './parser/random-parser';

export {
	extractVariableReferences,
	hasVariableReferences,
	getVariableNames,
	type VariableRef
} from './parser/variable-parser';

export { extractEvalExpressions, hasEvalExpressions, type EvalExpr } from './parser/eval-parser';

// Generators
export { generateInstance, generateMultipleInstances } from './generator/instance-generator';

export { resolveVariables, resolveVariableExpression } from './generator/variable-resolver';

export {
	generateRandomNumber,
	randomInt,
	randomDecimalByDigits,
	randomDecimalByRange,
	resolveNumberOrVariable
} from './generator/random-generator';

export { resolveExpression, resolveAnswer } from './generator/content-resolver';

export { shuffleChoices, type ShuffledChoice } from './generator/choice-shuffler';

// Validators
export { validateTemplate, isValidTemplate } from './validators/template-validator';

export { detectCircularDependencies } from '$lib/shared/parameterization/validator/circular-dependency';

// Compute Engine
export {
	evaluateExpression,
	simplifyExpression,
	areEquivalent,
	isValidLatex
} from './compute-engine/wrapper';
