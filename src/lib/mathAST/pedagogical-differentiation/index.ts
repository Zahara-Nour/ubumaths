/**
 * Pedagogical Differentiation — Public Barrel
 *
 * Public surface of the pedagogical differentiation module. External callers
 * (`questions/generator/correction-generator.ts`, demo scripts, debug pages)
 * should import from here rather than reaching into individual files.
 *
 * @module mathAST/pedagogical-differentiation
 */

export {
	generatePedagogicalDifferentiationSteps,
	isTrivialWrtVariable,
	differentiateNode,
	PedagogicalDifferentiationNotImplemented
} from './pipeline';

export { PedagogicalDifferentiationRenderer } from './renderer';

export type { DifferentiationNotation, DifferentiationRenderOptions } from './renderer';

export type {
	DifferentiationBindings,
	PedagogicalDifferentiationOptions,
	PedagogicalDifferentiationResult,
	PedagogicalDifferentiationRule,
	PedagogicalDifferentiationStep
} from './types';

export { TRIVIAL_RULES } from './types';

export { EXPLANATIONS, TITLES, getDefaultDescription } from './descriptions-fr';

export type { ExplainFn, TitleFn } from './descriptions-fr';
