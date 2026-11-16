/**
 * Configuration du module Blockly partagé : limites, options de l'espace de blocs, thème,
 * messages d'erreur.
 */

import * as Blockly from 'blockly';

// =============================================================================
// Limites
// =============================================================================

/** Limites de l'espace de blocs et du code généré pour l'aperçu */
export const BLOCKLY_CONFIG = {
	/** Longueur maximale du code généré, en caractères (100 Ko) */
	MAX_CODE_LENGTH: 100_000,
	/** Nombre maximal de blocs dans l'espace (0 = sans limite) */
	MAX_BLOCKS: 0
} as const;

// =============================================================================
// Workspace Configuration
// =============================================================================

/** Dossier des médias Blockly sous static/ (copie de node_modules/blockly/media) */
export const BLOCKLY_MEDIA_PATH = '/blockly/media/';

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
	// Sons coupés : pas de bruit en classe
	sounds: false,
	// Médias (corbeille, sprites, icônes) servis par nous : aucune requête vers un tiers depuis le
	// navigateur des élèves. Copie de node_modules/blockly/media, gardée à jour par media.test.ts.
	media: BLOCKLY_MEDIA_PATH,
	// Renderer explicite : Blockly 13 a changé celui par défaut
	renderer: 'thrasos',
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
export const CHIPHRE_THEME = Blockly.Theme.defineTheme('chiphre', {
	name: 'chiphre',
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
// Messages d'erreur
// =============================================================================

/** Messages d'erreur de la génération de code et de l'espace de blocs */
export const ERROR_MESSAGES = {
	CODE_TOO_LONG: 'Le code généré dépasse la limite de caractères autorisée',
	CODE_GENERATION_FAILED: 'Échec de la génération du code',
	WORKSPACE_NOT_INITIALIZED: "L'espace de travail n'est pas initialisé",
	INVALID_LANGUAGE: 'Langage non pris en charge',
	WORKSPACE_LOAD_FAILED: "Échec du chargement de l'espace de travail"
} as const;
