/**
 * Configuration du module Blockly partagé : options de l'espace de blocs et messages.
 * Les médias servis par Chiphre sont vérifiés par media.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { BLOCKLY_CONFIG, DEFAULT_WORKSPACE_OPTIONS, ERROR_MESSAGES } from '../config';

describe('DEFAULT_WORKSPACE_OPTIONS', () => {
	it('affiche corbeille et zoom, coupe les sons (pas de bruit en classe)', () => {
		expect(DEFAULT_WORKSPACE_OPTIONS.trashcan).toBe(true);
		expect(DEFAULT_WORKSPACE_OPTIONS.zoom.controls).toBe(true);
		expect(DEFAULT_WORKSPACE_OPTIONS.sounds).toBe(false);
	});

	it("ne limite pas le nombre de blocs dans l'espace (la limite d'une question est jugée à part)", () => {
		expect(DEFAULT_WORKSPACE_OPTIONS.maxBlocks).toBe(0);
		expect(BLOCKLY_CONFIG.MAX_BLOCKS).toBe(0);
	});
});

describe('ERROR_MESSAGES', () => {
	it('sont en français, accents compris', () => {
		expect(ERROR_MESSAGES.CODE_GENERATION_FAILED).toBe('Échec de la génération du code');
		expect(ERROR_MESSAGES.WORKSPACE_NOT_INITIALIZED).toBe(
			"L'espace de travail n'est pas initialisé"
		);
	});
});
