/**
 * Garde : le filtre `paths` de nightly-integration.yml suit la suite
 * ==================================================================
 *
 * Le workflow d'intégration ne tourne sur une PR que si un fichier modifié
 * correspond à son filtre `pull_request.paths`. Ce filtre a été calculé une
 * fois (#515) à partir des imports de la suite ; les imports, eux, bougent.
 * Deux dérives passent inaperçues :
 *
 *   1. un fichier atteint par la suite qu'aucun motif ne couvre : une PR qui
 *      le modifie ne lance pas les tests d'intégration ;
 *   2. un motif qui ne correspond à AUCUN fichier suivi : il ne protège rien.
 *      C'est arrivé dans #515 — 29 motifs `?server.ts`, écrits avec la
 *      sémantique d'un glob classique, alors que chez GitHub `?` veut dire
 *      « zéro ou une fois le caractère précédent ».
 *
 * Pourquoi ce contrôle vit DANS nightly-integration.yml : pour qu'un fichier
 * entre dans la suite, il faut qu'un fichier déjà atteint l'importe. Une PR
 * qui change le périmètre modifie donc un fichier couvert, et déclenche ce
 * workflow — donc cette garde.
 *
 * Le périmètre est la fermeture transitive des imports des tests
 * (`tests/integration/**`) et du global-setup, calculée par esbuild en mode
 * analyse (rien n'est exécuté). `$lib` est résolu vers `src/lib` ; les modules
 * virtuels de SvelteKit (`$env`, `$app`) et les paquets npm sont exclus.
 *
 * Usage : pnpm check:integration-paths
 */

import { build, type Plugin } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { globSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';

const WORKFLOW = '.github/workflows/nightly-integration.yml';

/**
 * Un motif de filtre GitHub en RegExp, selon la doc (« Filter pattern cheat
 * sheet ») : `*` sans `/`, `**` avec, `?` et `+` portent sur l'élément
 * PRÉCÉDENT (zéro-ou-un, un-ou-plus), `[]` un caractère, `\` échappe.
 * Le `!` de négation se traite à part (cf. `uncoveredFiles`).
 */
export function githubPathPattern(pattern: string): RegExp {
	const atoms: string[] = [];
	for (let i = 0; i < pattern.length; i++) {
		const c = pattern[i];
		if (c === '\\' && i + 1 < pattern.length) {
			atoms.push(escapeRegExp(pattern[++i]));
		} else if (c === '*' && pattern[i + 1] === '*') {
			atoms.push('.*');
			i++;
		} else if (c === '*') {
			atoms.push('[^/]*');
		} else if ((c === '?' || c === '+') && atoms.length > 0) {
			atoms.push(`(?:${atoms.pop()})${c}`);
		} else if (c === '[') {
			const end = pattern.indexOf(']', i + 1);
			if (end === -1) {
				atoms.push(escapeRegExp(c));
			} else {
				atoms.push(`[${pattern.slice(i + 1, end)}]`);
				i = end;
			}
		} else {
			atoms.push(escapeRegExp(c));
		}
	}
	return new RegExp(`^${atoms.join('')}$`);
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/** Un fichier est couvert si le DERNIER motif qui le concerne est positif (règle de GitHub). */
function isCovered(file: string, patterns: string[]): boolean {
	let covered = false;
	for (const p of patterns) {
		const negated = p.startsWith('!');
		if (githubPathPattern(negated ? p.slice(1) : p).test(file)) covered = !negated;
	}
	return covered;
}

/** Les fichiers atteints par la suite qu'aucun motif du filtre ne couvre. */
export function uncoveredFiles(files: string[], patterns: string[]): string[] {
	return files.filter((f) => !isCovered(f, patterns));
}

/** Les motifs positifs qui ne correspondent à aucun fichier suivi par git. */
export function deadPatterns(patterns: string[], tracked: string[]): string[] {
	return patterns
		.filter((p) => !p.startsWith('!'))
		.filter((p) => {
			const re = githubPathPattern(p);
			return !tracked.some((f) => re.test(f));
		});
}

/** Fermeture transitive des imports de la suite d'intégration (chemins relatifs à `root`). */
export async function integrationClosure(root: string): Promise<string[]> {
	const entries = [
		...globSync('tests/integration/**/*.{test,spec}.{js,ts}', { cwd: root }),
		'tests/integration/global-setup.ts'
	].map((f) => join(root, f));

	const unresolved: string[] = [];
	const sveltekit: Plugin = {
		name: 'sveltekit-aliases',
		setup(b) {
			b.onResolve({ filter: /^\$lib(\/|$)/ }, async (args) => {
				const target = args.path.replace(/^\$lib/, join(root, 'src/lib'));
				const r = await b.resolve(target, { kind: args.kind, resolveDir: root });
				if (r.errors.length) {
					unresolved.push(args.path);
					return { path: args.path, external: true };
				}
				return { path: r.path };
			});
			// Modules virtuels fournis par le plugin SvelteKit : pas des fichiers.
			b.onResolve({ filter: /^\$(env|app|service-worker)\// }, (args) => ({
				path: args.path,
				external: true
			}));
			// Un composant compte comme fichier atteint, sans être compilé.
			b.onLoad({ filter: /\.svelte$/ }, () => ({ contents: '', loader: 'js' }));
		}
	};

	const result = await build({
		entryPoints: entries,
		absWorkingDir: root,
		bundle: true,
		write: false,
		metafile: true,
		outdir: 'out',
		platform: 'node',
		format: 'esm',
		packages: 'external',
		logLevel: 'silent',
		plugins: [sveltekit],
		loader: { '.sql': 'text', '.json': 'json' }
	});
	if (unresolved.length > 0) {
		throw new Error(`Imports $lib non résolus : ${unresolved.join(', ')}`);
	}
	return Object.keys(result.metafile.inputs).sort();
}

function pathsFilter(root: string): string[] {
	const workflow = parse(readFileSync(join(root, WORKFLOW), 'utf8'));
	const paths: unknown = workflow?.on?.pull_request?.paths;
	if (!Array.isArray(paths) || !paths.every((p) => typeof p === 'string')) {
		throw new Error(`${WORKFLOW} : on.pull_request.paths introuvable ou mal formé`);
	}
	return paths;
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
	const ROOT = resolve(import.meta.dirname, '..');
	const patterns = pathsFilter(ROOT);
	const reached = await integrationClosure(ROOT);
	const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
		.split('\n')
		.filter(Boolean);

	const uncovered = uncoveredFiles(reached, patterns);
	const dead = deadPatterns(patterns, tracked);

	console.log(`${reached.length} fichiers atteints par la suite ; ${patterns.length} motifs.`);
	for (const f of uncovered) console.log(`  non couvert : ${f}`);
	for (const p of dead) console.log(`  motif mort  : ${p}`);

	if (uncovered.length > 0 || dead.length > 0) {
		console.log(`\n❌ Le filtre \`paths\` de ${WORKFLOW} ne suit plus la suite d'intégration.`);
		if (uncovered.length > 0) {
			console.log(
				'   Non couvert : une PR qui modifie ce fichier ne lancerait pas les tests. Ajouter un motif.'
			);
		}
		if (dead.length > 0) {
			console.log(
				'   Motif mort : il ne correspond à aucun fichier suivi. Sémantique GitHub : `?` et `+`'
			);
			console.log(
				'   portent sur le caractère PRÉCÉDENT ; `[`, `]`, `+`, `?` s’échappent avec `\\`.'
			);
		}
		process.exit(1);
	}
	console.log('✅ Le filtre couvre toute la suite, et chaque motif correspond à un fichier.');
}
