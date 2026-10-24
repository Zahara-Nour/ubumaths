/**
 * L'image de la vitrine `/demo/corriges` est bien dans `static/`, aux dimensions
 * annoncées à la page.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { CORRIGE_IMAGE } from '../corriges';

describe('CORRIGE_IMAGE', () => {
	const fichier = join(process.cwd(), 'static', CORRIGE_IMAGE.src);

	it('pointe vers une image présente dans static/', () => {
		expect(existsSync(fichier)).toBe(true);
	});

	it('annonce les dimensions réelles du WebP', () => {
		// En-tête VP8 (sans perte : VP8L) : largeur et hauteur sur 14 bits
		const octets = readFileSync(fichier);
		expect(octets.subarray(0, 4).toString('ascii')).toBe('RIFF');
		expect(octets.subarray(12, 16).toString('ascii')).toBe('VP8 ');
		const largeur = octets.readUInt16LE(26) & 0x3fff;
		const hauteur = octets.readUInt16LE(28) & 0x3fff;
		expect({ largeur, hauteur }).toEqual({
			largeur: CORRIGE_IMAGE.width,
			hauteur: CORRIGE_IMAGE.height
		});
	});
});
