/**
 * Convertit les imports `$lib/…` / `$tests/…` d'une branche partie avant #2826
 * vers `#lib/…` / `#tests/…`, extension écrite — même règle que #2826.
 *
 *   pnpm migrer:diese                  # fichiers de la branche (depuis origin/main) + non suivis
 *   pnpm migrer:diese <fichier…>       # fichiers donnés
 *   pnpm migrer:diese --essai [...]    # montre sans écrire
 *
 * Règle : `'$lib/x'` → `'#lib/x.ts'` (ou `.js`, `/index.ts`, `/index.js`, selon
 * le fichier qui existe) ; chemin déjà complet, `?raw`/`?inline`, motif à `*` :
 * seul le préfixe change. Seuls les imports sont touchés (`from`, `import(`,
 * `vi.mock(`, `importActual(`, `import.meta.glob(`), hors lignes commentées ; une
 * autre chaîne `'$lib/…'` est laissée (à revoir à la main si besoin). Convention : docs/pratiques/svelte-typescript.md.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Types
export type Conversion = { source: string; changes: number; introuvables: string[] };

// Constantes
const DOSSIERS = { lib: 'src/lib', tests: 'tests' } as const;
const CODE = /\.(ts|js|mjs|svelte)$/;
const SUFFIXES = ['', '.ts', '.js', '/index.ts', '/index.js'];
// Spécificateur '$lib/…' ou "$lib/…" en position d'import (même contextes que la
// garde imports-lib-avec-extension, plus import.meta.glob).
const CHAINE =
	/((?:from\s+|import\s*\(\s*|import\s+|mock\(\s*|importActual\(\s*|glob\(\s*)(['"]))\$(lib|tests)\/([^'"\n]*)\2/g;
const COMMENTAIRE = /^\s*(\/\/|\*|\/\*)/;
// Le script et son test citent `$lib` dans leurs exemples : jamais convertis.
const EXCLUS = /(^|\/)migrer-diese(\.test)?\.ts$/;

// Functions
function estFichier(chemin: string): boolean {
	return existsSync(chemin) && statSync(chemin).isFile();
}

/** Convertit une source ; `existe(dossier, chemin)` dit si le fichier existe. */
export function convertir(
	source: string,
	existe: (dossier: 'lib' | 'tests', chemin: string) => boolean
): Conversion {
	let changes = 0;
	const introuvables: string[] = [];
	const convertirLigne = (ligne: string) =>
		ligne.replace(CHAINE, (_m, avant: string, q: string, d: 'lib' | 'tests', reste: string) => {
			changes++;
			const [chemin, requete] = reste.split(/(?=\?)/);
			const prefixeSeul = `${avant}#${d}/${reste}${q}`;
			if (requete !== undefined || chemin === '' || chemin.endsWith('/') || chemin.includes('*'))
				return prefixeSeul;
			const suffixe = SUFFIXES.find((s) => existe(d, chemin + s));
			if (suffixe === undefined) {
				introuvables.push(`#${d}/${chemin}`);
				return prefixeSeul;
			}
			return `${avant}#${d}/${chemin}${suffixe}${q}`;
		});
	const resultat = source
		.split('\n')
		.map((l) => (COMMENTAIRE.test(l) ? l : convertirLigne(l)))
		.join('\n');
	return { source: resultat, changes, introuvables };
}

function fichiersDeLaBranche(racine: string): string[] {
	const git = (...args: string[]) =>
		execFileSync('git', args, { cwd: racine, encoding: 'utf8' }).split('\n').filter(Boolean);
	return [
		...git('diff', '--name-only', '--diff-filter=AMR', 'origin/main...HEAD'),
		...git('diff', '--name-only', '--diff-filter=AMR', 'HEAD'),
		...git('ls-files', '--others', '--exclude-standard')
	];
}

function main(): void {
	const racine = process.cwd();
	const args = process.argv.slice(2);
	const essai = args.includes('--essai');
	const donnes = args.filter((a) => a !== '--essai');
	const fichiers = [...new Set(donnes.length ? donnes : fichiersDeLaBranche(racine))].filter(
		(f) => CODE.test(f) && !EXCLUS.test(f) && estFichier(join(racine, f))
	);
	const enConflit = execFileSync('git', ['diff', '--name-only', '--diff-filter=U'], {
		cwd: racine,
		encoding: 'utf8'
	})
		.split('\n')
		.filter(Boolean);
	for (const f of enConflit)
		console.log(`⚠️ en conflit, non traité (résoudre puis relancer) : ${f}`);
	const existe = (d: 'lib' | 'tests', chemin: string) =>
		estFichier(join(racine, DOSSIERS[d], chemin));

	let total = 0;
	for (const f of fichiers) {
		const avant = readFileSync(join(racine, f), 'utf8');
		const { source, changes, introuvables } = convertir(avant, existe);
		if (changes === 0) continue;
		total += changes;
		console.log(`${f} : ${changes} import(s)`);
		for (const i of introuvables) console.log(`  ⚠️ introuvable, préfixe seul : ${i}`);
		if (!essai) writeFileSync(join(racine, f), source);
	}
	console.log(
		`${fichiers.length} fichier(s) lus, ${total} import(s) ${essai ? 'à convertir (--essai)' : 'convertis'}.`
	);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
