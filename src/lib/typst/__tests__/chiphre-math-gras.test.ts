/**
 * Chiphre Math : le gras mathématique existe (réponses en gras d'un corrigé)
 * ===========================================================================
 *
 * `\mathbf{3}` devient `bold(3)` en Typst, qui écrit le caractère « chiffre gras
 * mathématique » (U+1D7D1). Chiphre Math, police des formules du corrigé, ne
 * l'avait pas : le PDF dessinait un carré vide, sans erreur ni avertissement (les
 * réponses des fiches d'automatismes, 2026-11-03). Typst ne signale pas un glyphe
 * absent : on lit donc la table `cmap` de la police.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Les points de code d'une police TrueType (sous-table `cmap` de format 12) */
function codepoints(fichier: string): Set<number> {
	const octets = readFileSync(resolve(fichier));
	const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
	const tables = vue.getUint16(4);
	let cmap = -1;
	for (let i = 0; i < tables; i++) {
		const entree = 12 + 16 * i;
		const tag = String.fromCharCode(...octets.subarray(entree, entree + 4));
		if (tag === 'cmap') cmap = vue.getUint32(entree + 8);
	}
	if (cmap < 0) throw new Error('pas de table cmap');
	const trouves = new Set<number>();
	const sousTables = vue.getUint16(cmap + 2);
	for (let i = 0; i < sousTables; i++) {
		const debut = cmap + vue.getUint32(cmap + 4 + 8 * i + 4);
		if (vue.getUint16(debut) !== 12) continue;
		const groupes = vue.getUint32(debut + 12);
		for (let g = 0; g < groupes; g++) {
			const premier = vue.getUint32(debut + 16 + 12 * g);
			const dernier = vue.getUint32(debut + 16 + 12 * g + 4);
			for (let c = premier; c <= dernier; c++) trouves.add(c);
		}
	}
	return trouves;
}

const POLICE = 'static/fonts/chiphre-math-typst/ChiphreMath.ttf';
const suite = (debut: number, n: number) => Array.from({ length: n }, (_, i) => debut + i);

describe('Chiphre Math — gras mathématique', () => {
	const cmap = codepoints(POLICE);

	it('témoin : le lecteur trouve les lettres italiques déjà présentes (U+1D44E…)', () => {
		expect(cmap.has(0x1d44e)).toBe(true);
	});

	it.each([
		['chiffres gras, U+1D7CE…', suite(0x1d7ce, 10)],
		['capitales grasses, U+1D400…', suite(0x1d400, 26)],
		['minuscules grasses, U+1D41A…', suite(0x1d41a, 26)],
		['capitales grasses italiques, U+1D468…', suite(0x1d468, 26)],
		['minuscules grasses italiques, U+1D482…', suite(0x1d482, 26)]
	])('%s', (_nom, attendus) => {
		const manquants = attendus.filter((c) => !cmap.has(c)).map((c) => c.toString(16));
		expect(manquants).toEqual([]);
	});
});
