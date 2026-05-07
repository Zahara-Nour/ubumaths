/**
 * Pedagogical Domain — Public Barrel
 *
 * Public surface of the pedagogical domain module. External callers
 * (`questions/generator/correction-generator.ts`, demo scripts, debug pages)
 * should import from here rather than reaching into individual files.
 *
 * @module mathAST/pedagogical-domain
 */

export { PedagogicalDomainNotImplemented, STRATEGIES_DOMAIN, V1_MVP_RULES } from './types';

export type {
	DomainGenerationStrategy,
	PedagogicalDomainOptions,
	PedagogicalDomainResult,
	PedagogicalDomainSchoolLevel
} from './types';

// Dispatch (typed + LaTeX-string entry points)
export { generatePedagogicalDomainSteps, dispatchPedagogicalDomain } from './dispatch';
export type { PedagogicalDomainDispatchOptions } from './dispatch';

// Renderer + descriptions
export { PedagogicalDomainRenderer } from './renderer';
export { EXPLANATIONS, TITLES, getDefaultTitle } from './descriptions-fr';
export type { ExplainFn, TitleFn } from './descriptions-fr';

// Demo helpers (consumed by snapshot tests + CLI)
export { presentDomain } from './demo-helpers';
export type { DemoCase, DemoCategory, DemoFormat } from './demo-helpers';
export { ALL_CATEGORIES } from './demo-cases';
