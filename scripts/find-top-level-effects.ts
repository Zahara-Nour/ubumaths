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
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

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
