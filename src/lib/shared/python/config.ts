/**
 * Shared Python Module Configuration
 *
 * CDN URLs, timeouts, and constants for Pyodide execution.
 */

import type { LoadingStage } from './types';

// =============================================================================
// Pyodide CDN Configuration
// =============================================================================

/**
 * Pyodide CDN configuration
 */
export const PYODIDE_CONFIG = {
	/** CDN URL for Pyodide v0.26.2 (stable, tested with this project) */
	CDN_URL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
	/** Initial packages to preload (empty for lazy loading) */
	INITIAL_PACKAGES: [] as const,
	/** Execution timeout in milliseconds (30 seconds) */
	TIMEOUT_MS: 30000,
	/** Maximum code length in characters (100KB) */
	MAX_CODE_LENGTH: 100_000,
	/** Maximum number of lines per execution */
	MAX_LINES: 5000
} as const;

// =============================================================================
// Loading Stages
// =============================================================================

/**
 * Predefined loading stages for Pyodide initialization (lazy loading mode)
 * Note: Package loading stages are now handled dynamically via packages-loading message
 */
export const LOADING_STAGES: readonly LoadingStage[] = [
	{ percent: 0, stage: 'Initialisation...' },
	{ percent: 50, stage: 'Telechargement de Python...' },
	{ percent: 100, stage: 'Pret !' }
] as const;

// =============================================================================
// Context Configuration
// =============================================================================

/**
 * Default context configuration
 */
export const CONTEXT_CONFIG = {
	/** Maximum number of concurrent contexts */
	MAX_CONTEXTS: 10,
	/** Context idle timeout in milliseconds (5 minutes) */
	IDLE_TIMEOUT_MS: 5 * 60 * 1000,
	/** Default context ID for playground mode */
	DEFAULT_PLAYGROUND_CONTEXT: '__playground__',
	/** Prefix for notebook context IDs */
	NOTEBOOK_CONTEXT_PREFIX: 'notebook_'
} as const;

// =============================================================================
// Validation Configuration
// =============================================================================

/**
 * Default validation configuration
 */
export const DEFAULT_VALIDATION_CONFIG = {
	checkSyntax: true,
	checkUndefined: false,
	checkUnusedImports: false,
	maxCodeLength: PYODIDE_CONFIG.MAX_CODE_LENGTH,
	maxLines: PYODIDE_CONFIG.MAX_LINES,
	forbiddenPatterns: [] as string[]
} as const;

// =============================================================================
// Error Messages (French)
// =============================================================================

/**
 * French error messages for user-facing errors
 */
export const ERROR_MESSAGES = {
	TIMEOUT: "L'execution a depasse le delai maximum",
	CODE_TOO_LONG: 'Le code depasse la limite de caracteres autorisee',
	TOO_MANY_LINES: 'Le code depasse le nombre de lignes autorise',
	INVALID_SYNTAX: 'Erreur de syntaxe Python',
	CONTEXT_NOT_FOUND: 'Contexte non trouve',
	MAX_CONTEXTS_REACHED: 'Nombre maximum de contextes atteint',
	PYODIDE_NOT_READY: "Python n'est pas encore pret"
} as const;
