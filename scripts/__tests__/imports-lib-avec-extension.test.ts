/**
 * Garde : chaque spécificateur `#lib/…` / `#tests/…` du code nomme un fichier
 * qui existe tel quel (extension écrite). Les `paths` de `tsconfig.json`
 * rendent TypeScript tolérant à l'extension oubliée ; Node (scripts `tsx`)
 * ne l'est pas. Convention : docs/pratiques/svelte-typescript.md.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RACINE = process.cwd();
const DOSSIERS = { lib: 'src/lib', tests: 'tests' } as const;
const CODE = /\.(ts|js|mjs|svelte)$/;
// Ces tests citent des imports fictifs (dépôt jetable, exemples) dans leurs données.
const EXCLUS = new Set([
	'scripts/__tests__/migrer-diese.test.ts',
	'scripts/__tests__/ci-integration-touches.test.ts'
]);
// Chaîne entre guillemets simples ou doubles, après from / import( / vi.mock( …
const SPEC =
	/(?:from\s+|import\s*\(\s*|import\s+|mock\(\s*|importActual\(\s*)['"]#(lib|tests)\/([^'"?]+)(?:\?[^'"]*)?['"]/g;

function fichiers(): string[] {
	return execFileSync('git', ['ls-files', 'src', 'tests', 'scripts'], {
		cwd: RACINE,
		encoding: 'utf8'
	})
		.split('\n')
		.filter((f) => CODE.test(f) && !EXCLUS.has(f) && existsSync(join(RACINE, f)));
}

describe('imports #lib / #tests', () => {
	it('nomment un fichier existant, extension comprise', () => {
		const fautifs: string[] = [];
		let vus = 0;
		for (const f of fichiers()) {
			// Lignes commentées ignorées (imports désactivés de modules disparus).
			const source = readFileSync(join(RACINE, f), 'utf8').replace(/^\s*(\/\/|\*).*$/gm, '');
			for (const [, dossier, chemin] of source.matchAll(SPEC)) {
				vus++;
				const cible = join(RACINE, DOSSIERS[dossier as keyof typeof DOSSIERS], chemin);
				if (!existsSync(cible) || !statSync(cible).isFile())
					fautifs.push(`${f} → #${dossier}/${chemin}`);
			}
		}
		// Témoin : la garde voit bien les imports (des milliers).
		expect(vus).toBeGreaterThan(10_000);
		expect(fautifs, 'écrire l’extension : #lib/x.ts, #lib/x.svelte.ts, #lib/dir/index.ts').toEqual(
			[]
		);
	}, 60_000);
});
