/**
 * La correction tourne sous Node : l'interpréteur, la notation et le jugement du programme de
 * calcul ne doivent jamais charger Blockly, même par un import indirect (`blocs.ts` l'importe,
 * lui ; journal `docs/wip/blockly-progress.md`, piège de la PR 5a).
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const RACINE = resolve('src/lib/shared/blockly/calcul');
const IMPORT = /^\s*(?:import|export)\s[^;]*?from\s+'([^']+)'/gms;

/** Modules importés (relatifs suivis, `$lib/` compris), à partir d'un fichier */
function importsDe(fichier: string, vus = new Set<string>()): string[] {
	if (vus.has(fichier)) return [];
	vus.add(fichier);
	const source = readFileSync(fichier, 'utf8');
	const trouves: string[] = [];
	for (const [, cible] of source.matchAll(IMPORT)) {
		trouves.push(cible);
		const local = cible.startsWith('.')
			? resolve(dirname(fichier), cible)
			: cible.startsWith('$lib/')
				? resolve('src/lib', cible.slice(5))
				: null;
		const fichierLocal = local && [`${local}.ts`, `${local}/index.ts`].find((f) => existsSync(f));
		if (fichierLocal) trouves.push(...importsDe(fichierLocal, vus));
	}
	return trouves;
}

describe('programme de calcul : la correction sans Blockly', () => {
	it.each(['interpreteur.ts', 'notation.ts', 'jugement.ts'])('%s n’importe pas Blockly', (f) => {
		const imports = importsDe(resolve(RACINE, f));
		expect(imports.length).toBeGreaterThan(0);
		expect(
			imports.filter((i) => i === 'blockly' || i.startsWith('blockly/') || i.endsWith('/blocs'))
		).toEqual([]);
	});

	it('témoin : blocs.ts, lui, importe Blockly', () => {
		expect(importsDe(resolve(RACINE, 'blocs.ts'))).toContain('blockly');
	});
});
