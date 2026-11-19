/**
 * Garde : tout nom importé de `mathlive` existe dans sa version serveur.
 *
 * Côté serveur, `mathlive` résout (condition `node`) vers `mathlive-ssr.min.mjs`,
 * qui n'exporte que quelques fonctions de conversion. Un `import { MathfieldElement }
 * from 'mathlive'` passe en dev et dans les tests (Vite réécrit l'import), mais le
 * build serveur le lie nativement : toute page qui rend le composant planterait.
 * Revue de #2423, 2026-11-06. Les imports `type` sont effacés : autorisés.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RACINE = join(process.cwd(), 'src');
const SSR = join(process.cwd(), 'node_modules/mathlive/mathlive-ssr.min.mjs');

function fichiers(dossier: string): string[] {
	return readdirSync(dossier).flatMap((nom) => {
		const chemin = join(dossier, nom);
		if (statSync(chemin).isDirectory()) return nom === '__tests__' ? [] : fichiers(chemin);
		return /\.(svelte|ts)$/.test(nom) ? [chemin] : [];
	});
}

/** Noms de valeurs (pas de types) importés de 'mathlive' dans un source. */
function nomsImportes(source: string): string[] {
	const noms: string[] = [];
	for (const m of source.matchAll(/import\s+(type\s+)?\{([^}]*)\}\s*from\s*['"]mathlive['"]/g)) {
		if (m[1]) continue;
		for (const brut of m[2].split(',')) {
			const nom = brut.trim();
			if (nom === '' || nom.startsWith('type ')) continue;
			noms.push(nom.split(/\s+as\s+/)[0]);
		}
	}
	return noms;
}

describe('imports de mathlive', () => {
	it('chaque nom importé existe dans mathlive-ssr', async () => {
		const exportes = new Set(Object.keys(await import(/* @vite-ignore */ SSR)));
		const fautifs = fichiers(RACINE).flatMap((f) =>
			nomsImportes(readFileSync(f, 'utf8'))
				.filter((nom) => !exportes.has(nom))
				.map((nom) => `${relative(process.cwd(), f)} : ${nom}`)
		);
		expect(fautifs).toEqual([]);
	});

	it('repère un import nommé absent du serveur', () => {
		expect(nomsImportes("import { MathfieldElement } from 'mathlive';")).toEqual([
			'MathfieldElement'
		]);
		expect(
			nomsImportes("import { convertLatexToMarkup, type MathfieldElement } from 'mathlive';")
		).toEqual(['convertLatexToMarkup']);
		expect(nomsImportes("import type { MathfieldElement } from 'mathlive';")).toEqual([]);
	});
});
