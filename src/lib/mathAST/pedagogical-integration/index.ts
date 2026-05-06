/**
 * Pedagogical Integration — Public Barrel
 *
 * Public surface of the pedagogical integration module. External callers
 * (`questions/generator/correction-generator.ts`, demo scripts, debug pages)
 * should import from here rather than reaching into individual files.
 *
 * @module mathAST/pedagogical-integration
 */

export { generatePedagogicalIntegrationSteps } from './pipeline';

export { PedagogicalIntegrationRenderer } from './renderer';
export type { IntegrationRenderOptions } from './renderer';

export { EXPLANATIONS, TITLES, getDefaultDescription } from './descriptions-fr';
export type { ExplainFn, TitleFn } from './descriptions-fr';

export { PedagogicalIntegrationNotImplemented, STRATEGIES_INTEGRATION } from './types';

export type {
	IntegrationBindings,
	IntegrationGenerationStrategy,
	IntegrationSchoolLevel,
	PedagogicalIntegrationOptions,
	PedagogicalIntegrationResult,
	PedagogicalIntegrationRule,
	PedagogicalIntegrationStep
} from './types';
