/**
 * Détection des modules qui agissent au chargement
 * ================================================
 *
 * Sert la garde de `scripts/side-effect-modules.ts` : une instruction de
 * niveau module qui n'est pas une déclaration (appel nu, affectation, boucle,
 * `if`, `try`, bloc) agit au chargement, de même qu'un import nu
 * (`import 'x.css';`). Un tel module doit être dans
 * `MODULES_WITH_SIDE_EFFECTS`, sinon le build client peut le retirer.
 *
 * On lit l'AST (TypeScript), pas le texte. Séparé de `side-effect-modules.ts`
 * pour que `vite.config.ts` n'importe pas le compilateur TypeScript.
 */

import ts from 'typescript';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

/** Première ligne de chaque instruction de niveau module qui agit au chargement. */
export function findTopLevelEffects(source: string): string[] {
	const sf = ts.createSourceFile('x.ts', source, ts.ScriptTarget.Latest, true);
	return sf.statements
		.filter(
			(s) =>
				// `import 'x';` ne sert que l'effet de `x` (CSS, enregistrement) : le
				// module qui le porte doit le garder.
				(ts.isImportDeclaration(s) && s.importClause === undefined) ||
				ts.isExpressionStatement(s) ||
				ts.isIfStatement(s) ||
				ts.isForStatement(s) ||
				ts.isForOfStatement(s) ||
				ts.isForInStatement(s) ||
				ts.isWhileStatement(s) ||
				ts.isDoStatement(s) ||
				ts.isTryStatement(s) ||
				ts.isBlock(s)
		)
		.map((s) => s.getText(sf).split('\n')[0]);
}

/**
 * Les modules `.ts` de `libDir` qui agissent au chargement, relatifs à `libDir`.
 * Hors tests, `.d.ts` et `server/` : SvelteKit interdit `$lib/server` au client.
 */
export function listModulesWithTopLevelEffects(libDir: string): string[] {
	const found: string[] = [];
	const walk = (dir: string) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const path = join(dir, entry.name);
			if (entry.isDirectory()) {
				if (entry.name !== '__tests__' && entry.name !== 'server') walk(path);
				continue;
			}
			if (!entry.name.endsWith('.ts') || /\.(test|spec)\.ts$|\.d\.ts$/.test(entry.name)) continue;
			if (findTopLevelEffects(readFileSync(path, 'utf8')).length > 0) {
				found.push(relative(libDir, path).replaceAll('\\', '/'));
			}
		}
	};
	walk(libDir);
	return found.sort();
}

/** Les cibles des imports nus (`import 'x';`) d'un source TypeScript. */
export function findBareImports(source: string): string[] {
	const sf = ts.createSourceFile('x.ts', source, ts.ScriptTarget.Latest, true);
	return sf.statements
		.filter((s) => ts.isImportDeclaration(s) && s.importClause === undefined)
		.map((s) => ((s as ts.ImportDeclaration).moduleSpecifier as ts.StringLiteral).text);
}

/**
 * Les modules `.ts` de `src/lib` visés par un import nu, où qu'il soit écrit
 * (`.ts`, `<script>` d'un `.svelte`, routes) : un import nu ne sert que l'effet
 * de sa cible, qui doit donc être dans la liste. Chemins relatifs à `src/lib`.
 */
export function listBareImportTargets(srcDir: string): string[] {
	const libDir = join(srcDir, 'lib');
	const targets = new Set<string>();
	const resolveTarget = (from: string, spec: string): string | null => {
		let base: string;
		if (spec.startsWith('$lib/')) base = join(libDir, spec.slice(5));
		else if (spec.startsWith('.')) base = resolve(dirname(from), spec);
		else return null;
		for (const candidate of [base, `${base}.ts`, join(base, 'index.ts')]) {
			if (candidate.endsWith('.ts') && existsSync(candidate)) return candidate;
		}
		return null;
	};
	const walk = (dir: string) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const path = join(dir, entry.name);
			if (entry.isDirectory()) {
				if (entry.name !== '__tests__') walk(path);
				continue;
			}
			if (/\.(test|spec)\.ts$|\.d\.ts$/.test(entry.name)) continue;
			let source: string;
			if (entry.name.endsWith('.svelte')) {
				const text = readFileSync(path, 'utf8');
				source = [...text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
					.map((m) => m[1])
					.join('\n');
			} else if (entry.name.endsWith('.ts')) {
				source = readFileSync(path, 'utf8');
			} else continue;
			for (const spec of findBareImports(source)) {
				const target = resolveTarget(path, spec);
				if (target !== null && target.startsWith(libDir + '/')) {
					targets.add(relative(libDir, target).replaceAll('\\', '/'));
				}
			}
		}
	};
	walk(srcDir);
	return [...targets].sort();
}
