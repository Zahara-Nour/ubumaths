/**
 * Shared Blockly Module Configuration
 *
 * Timeouts, limits, and constants for Blockly visual programming.
 */

import * as Blockly from 'blockly';
import type { LoadingStage } from './types';

// =============================================================================
// Execution Configuration
// =============================================================================

/**
 * Blockly execution configuration
 */
export const BLOCKLY_CONFIG = {
	/** JavaScript execution timeout in milliseconds (10 seconds) */
	JS_TIMEOUT_MS: 10_000,
	/** Python execution timeout in milliseconds (30 seconds, via Pyodide) */
	PYTHON_TIMEOUT_MS: 30_000,
	/** Maximum generated code length in characters (100KB) */
	MAX_CODE_LENGTH: 100_000,
	/** Maximum number of output lines to keep */
	MAX_OUTPUT_LINES: 1000,
	/** Maximum number of blocks in workspace (0 = unlimited) */
	MAX_BLOCKS: 0,
	/** Debounce delay for code generation (ms) */
	CODE_GEN_DEBOUNCE_MS: 300
} as const;

// =============================================================================
// Loading Stages
// =============================================================================

/**
 * Predefined loading stages for Blockly initialization
 */
export const LOADING_STAGES: readonly LoadingStage[] = [
	{ percent: 0, stage: 'Initialisation...' },
	{ percent: 33, stage: 'Chargement de Blockly...' },
	{ percent: 66, stage: "Initialisation de l'espace de travail..." },
	{ percent: 100, stage: 'Pret !' }
] as const;

// =============================================================================
// Workspace Configuration
// =============================================================================

/**
 * Default Blockly workspace options
 */
export const DEFAULT_WORKSPACE_OPTIONS = {
	grid: {
		spacing: 20,
		length: 3,
		colour: '#ccc',
		snap: true
	},
	zoom: {
		controls: true,
		wheel: true,
		startScale: 1.0,
		maxScale: 3,
		minScale: 0.3,
		scaleSpeed: 1.2
	},
	trashcan: true,
	maxBlocks: BLOCKLY_CONFIG.MAX_BLOCKS,
	// Disable sounds to avoid CSP issues (Blockly loads from external CDN)
	sounds: false,
	// Use unpkg CDN for Blockly media files (trashcan, sprites, etc.)
	media: 'https://unpkg.com/blockly/media/',
	move: {
		scrollbars: true,
		drag: true,
		wheel: true
	}
} as const;

// =============================================================================
// Custom Theme
// =============================================================================

/**
 * Custom Blockly theme with dark category text for better contrast
 */
export const UBUMATHS_THEME = Blockly.Theme.defineTheme('ubumaths', {
	name: 'ubumaths',
	base: Blockly.Themes.Classic,
	componentStyles: {
		// Toolbox category text color - black for better contrast on colored backgrounds
		// Uses British spelling as per Blockly API
		toolboxForegroundColour: '#000000',
		// Keep workspace background light
		workspaceBackgroundColour: '#ffffff'
	}
});

// =============================================================================
// Error Messages (French)
// =============================================================================

/**
 * French error messages for user-facing errors
 */
export const ERROR_MESSAGES = {
	TIMEOUT_JS: "L'execution JavaScript a depasse le delai maximum (10s)",
	TIMEOUT_PYTHON: "L'execution Python a depasse le delai maximum (30s)",
	CODE_TOO_LONG: 'Le code genere depasse la limite de caracteres autorisee',
	TOO_MANY_OUTPUT_LINES: 'Trop de lignes de sortie (limite : 1000)',
	EXECUTION_ERROR: "Erreur lors de l'execution du code",
	CODE_GENERATION_FAILED: 'Echec de la generation du code',
	WORKSPACE_NOT_INITIALIZED: "L'espace de travail n'est pas initialise",
	BLOCKLY_NOT_LOADED: "Blockly n'est pas charge",
	INVALID_LANGUAGE: 'Langage non supporte',
	MAX_BLOCKS_REACHED: 'Nombre maximum de blocs atteint',
	WORKSPACE_LOAD_FAILED: "Echec du chargement de l'espace de travail"
} as const;

// =============================================================================
// Code Templates
// =============================================================================

/**
 * Code templates for wrapping generated code
 */
export const CODE_TEMPLATES = {
	/** JavaScript execution wrapper with timeout protection */
	JAVASCRIPT_WRAPPER: `
(function() {
	'use strict';
	const output = [];
	const console_log = console.log;
	console.log = function(...args) {
		output.push(args.join(' '));
	};
	try {
		%CODE%
		return { success: true, output };
	} catch (error) {
		return { success: false, error: error.message, output };
	} finally {
		console.log = console_log;
	}
})();
`.trim(),

	/** Python execution setup (imports, etc.) */
	PYTHON_SETUP: `
import sys
from io import StringIO
`.trim()
} as const;

// =============================================================================
// Display Constants
// =============================================================================

/**
 * UI display constants
 */
export const DISPLAY_CONFIG = {
	/** Maximum characters to display per output line */
	MAX_LINE_LENGTH: 1000,
	/** Truncation suffix for long lines */
	TRUNCATION_SUFFIX: '...',
	/** Default syntax highlighting language */
	DEFAULT_HIGHLIGHT_LANGUAGE: 'javascript',
	/** Output panel height (CSS value) */
	OUTPUT_PANEL_HEIGHT: '300px'
} as const;
