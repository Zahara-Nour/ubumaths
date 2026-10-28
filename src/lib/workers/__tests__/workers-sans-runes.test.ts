/**
 * Un worker n'atteint aucun fichier Svelte
 * ========================================
 *
 * Les workers (`new Worker(new URL(…))`) sont empaquetés sans le plugin Svelte :
 * un `.svelte.ts` atteint par leurs imports garde ses runes telles quelles et
 * le worker meurt au chargement (« $state is not defined »). Sous Vite 7,
 * Rollup élaguait le module s'il n'était pas utilisé ; Rolldown (Vite 8) garde
 * tout module à effet de bord, comme un store instancié au niveau du module.
 *
 * Ce test suit les imports de VALEUR (les `import type` / `export type`
 * disparaissent à la compilation), les `import('…')` à chemin littéral et les
 * ré-exports des barrels, sans élagage : l'hypothèse la plus prudente, celle
 * de Rolldown.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';

const RACINE = resolve(__dirname, '../../../..');
const LIB = join(RACINE, 'src/lib');
const WORKERS = join(LIB, 'workers');

const IMPORT_DE_VALEUR =
	/(?:^|\n)\s*(?:import|export)\s+(?!type\b)(?:[^'";]*?\bfrom\s+)?['"]([^'"]+)['"]/g;
/** `import('…')` à chemin littéral : Rolldown le suit aussi (chunk du worker). */
const IMPORT_DYNAMIQUE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function resoudre(depuis: string, specifier: string): string | null {
	let base: string;
	if (specifier.startsWith('$lib/')) base = join(LIB, specifier.slice('$lib/'.length));
	else if (specifier.startsWith('.')) base = resolve(dirname(depuis), specifier);
	else return null; // paquet de node_modules : hors périmètre
	const candidats = [
		base,
		// `./foo.js` qui désigne `./foo.ts` (résolution à la TypeScript)
		base.replace(/\.js$/, '.ts'),
		`${base}.ts`,
		`${base}.js`,
		`${base}.svelte.ts`,
		join(base, 'index.ts'),
		join(base, 'index.js')
	];
	return candidats.find((c) => existsSync(c) && statSync(c).isFile()) ?? null;
}

/** Fichiers Svelte atteints depuis `entree`, avec le chemin d'imports qui y mène. */
function fichiersSvelteAtteints(entree: string): string[] {
	const vus = new Map<string, string[]>([[entree, [entree]]]);
	const file = [entree];
	const trouves: string[] = [];
	while (file.length > 0) {
		const courant = file.shift()!;
		const chemin = vus.get(courant)!;
		if (/\.svelte(\.ts|\.js)?$/.test(courant)) {
			trouves.push(chemin.map((f) => f.replace(`${RACINE}/`, '')).join('\n  → '));
			continue;
		}
		const source = readFileSync(courant, 'utf8');
		for (const m of [...source.matchAll(IMPORT_DE_VALEUR), ...source.matchAll(IMPORT_DYNAMIQUE)]) {
			const cible = resoudre(courant, m[1]);
			if (cible && !vus.has(cible)) {
				vus.set(cible, [...chemin, cible]);
				file.push(cible);
			}
		}
	}
	return trouves;
}

const workers = readdirSync(WORKERS).filter((f) => f.endsWith('.worker.ts'));

describe('workers : aucun import de valeur ne mène à un fichier Svelte', () => {
	it('trouve les workers', () => {
		expect(workers).toContain('pyodide.worker.ts');
		expect(workers).toContain('js-sandbox.worker.ts');
	});

	it.each(workers)('%s', (worker) => {
		expect(fichiersSvelteAtteints(join(WORKERS, worker))).toEqual([]);
	});
});
