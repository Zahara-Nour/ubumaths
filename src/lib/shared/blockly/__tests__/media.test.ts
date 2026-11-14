import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { BLOCKLY_MEDIA_PATH, DEFAULT_WORKSPACE_OPTIONS } from '../config';

// Les médias Blockly sont servis par nous (static/blockly/media) : aucune requête vers un CDN
// depuis le navigateur des élèves. Une montée de Blockly doit recopier le dossier :
//   rm -r static/blockly/media && cp -R node_modules/blockly/media static/blockly/media
const PAQUET = join(process.cwd(), 'node_modules/blockly/media');
const COPIE = join(process.cwd(), 'static', BLOCKLY_MEDIA_PATH);

describe('médias Blockly servis par Chiphre', () => {
	it('la configuration pointe vers notre copie, pas vers un CDN', () => {
		expect(DEFAULT_WORKSPACE_OPTIONS.media).toBe(BLOCKLY_MEDIA_PATH);
		expect(BLOCKLY_MEDIA_PATH.startsWith('/')).toBe(true);
	});

	it('la copie de static/ est identique aux médias du paquet installé', () => {
		const fichiers = readdirSync(PAQUET).sort();
		expect(readdirSync(COPIE).sort()).toEqual(fichiers);
		for (const f of fichiers) {
			expect(readFileSync(join(COPIE, f)).equals(readFileSync(join(PAQUET, f))), f).toBe(true);
		}
	});
});
