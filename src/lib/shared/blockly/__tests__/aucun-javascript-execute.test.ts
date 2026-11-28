/**
 * Garde de l'ADR 0039 : les blocs sont interprétés par Chiphre, jamais exécutés en JavaScript.
 *
 * Le sandbox JavaScript de `/dev/blockly` s'évadait (`(() => {}).constructor('return this')()`)
 * ; il a été retiré avec la page. Ce test empêche qu'un exécuteur de code généré revienne
 * sous un autre nom : aucun fichier de `src/` ne doit le recréer ni l'importer.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// =============================================================================
// Constantes
// =============================================================================

const RACINE = join(__dirname, '../../../../..');
const CE_FICHIER = relative(RACINE, __filename);
const MARQUES_INTERDITES = ['js-sandbox', 'JsExecutor', 'BlocklyExecutor', 'blockly/execution'];

// =============================================================================
// Fonctions
// =============================================================================

/** Chemins relatifs de tous les fichiers source (.ts, .svelte, .js) de `src/` */
function fichiersSource(): string[] {
	return readdirSync(join(RACINE, 'src'), { recursive: true, encoding: 'utf8' })
		.filter((f) => /\.(ts|svelte|js)$/.test(f))
		.map((f) => join('src', f));
}

describe('ADR 0039 : aucun exécuteur du JavaScript généré par Blockly', () => {
	it('aucun fichier ne porte le nom du sandbox JavaScript', () => {
		expect(fichiersSource().filter((f) => f.includes('js-sandbox'))).toEqual([]);
	});

	it('aucun fichier ne nomme ni n’importe l’exécuteur', () => {
		const fautifs = fichiersSource()
			.filter((f) => f !== CE_FICHIER)
			.filter((f) => {
				const source = readFileSync(join(RACINE, f), 'utf8');
				return MARQUES_INTERDITES.some((marque) => source.includes(marque));
			});
		expect(fautifs).toEqual([]);
	});
});
