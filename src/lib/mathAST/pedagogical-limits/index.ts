/**
 * Pedagogical Limits — Public Barrel
 *
 * Public surface of the pedagogical limits module. External callers
 * (`questions/generator/correction-generator.ts`, demo scripts, debug pages)
 * should import from here rather than reaching into individual files.
 *
 * @module mathAST/pedagogical-limits
 */

export {
	PedagogicalLimitNotImplemented,
	STRATEGIES_LIMITS,
	FACTORISATION_CLUSTER_RULES
} from './types';

export type {
	LimitBindings,
	LimitGenerationStrategy,
	LimitsSchoolLevel,
	PedagogicalLimitOptions,
	PedagogicalLimitResult,
	PedagogicalLimitRule,
	PedagogicalLimitStatus,
	PedagogicalLimitStep
} from './types';
