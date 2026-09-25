/**
 * Garde : un `render` de vitest-browser-svelte qui n'est pas attendu
 * ==================================================================
 *
 * Depuis vitest-browser-svelte 3 (#431), `render` rend une `Promise`. Un appel
 * sans `await` est un échec SILENCIEUX : le composant est quand même monté (le
 * montage précède le premier `await` dans `render`), donc le test tourne et
 * passe. Le typecheck ne le voit que si le test lit le résultat
 * (`screen.container` sur une Promise) — et encore, la CI exclut les tests du
 * typecheck. Seule une relecture l'attrapait.
 *
 * Ce n'est pas une hypothèse : pendant #431, `ListNode-trig.svelte.test.ts`,
 * écrit en parallèle sur main avec un `render` synchrone, a fait rougir la CI.
 *
 * La règle est simple, sans exception : chaque appel à `render` importé de
 * `vitest-browser-svelte` est l'opérande direct d'un `await`
 * (`await render(…)`, `(await render(…)).container`, `return await render(…)`).
 * Même chose pour `x.unmount()` et `x.rerender(…)` sur un résultat de `render`
 * — reconnus par leur nom, faute de résoudre les types.
 *
 * On lit l'AST (TypeScript), pas le texte : un appel sur plusieurs lignes ou
 * un import renommé (`render as r`) échapperaient à un grep.
 *
 * Usage : npx tsx scripts/check-await-render.ts
 */

import ts from 'typescript';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

export interface UnawaitedCall {
	line: number;
	text: string;
}

/** Les appels `render(…)` (et `unmount`/`rerender`) de vitest-browser-svelte non attendus. */
export function findUnawaitedRender(source: string, fileName = 'test.ts'): UnawaitedCall[] {
	const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	const renderNames = new Set<string>();
	// Un `unmount` importé (de 'svelte', par exemple) n'est pas celui de `render`.
	const importedElsewhere = new Set<string>();
	for (const s of sf.statements) {
		if (
			ts.isImportDeclaration(s) &&
			ts.isStringLiteral(s.moduleSpecifier) &&
			s.moduleSpecifier.text !== 'vitest-browser-svelte' &&
			s.importClause?.namedBindings &&
			ts.isNamedImports(s.importClause.namedBindings)
		) {
			for (const e of s.importClause.namedBindings.elements) importedElsewhere.add(e.name.text);
		}
		if (
			ts.isImportDeclaration(s) &&
			ts.isStringLiteral(s.moduleSpecifier) &&
			s.moduleSpecifier.text === 'vitest-browser-svelte' &&
			s.importClause?.namedBindings &&
			ts.isNamedImports(s.importClause.namedBindings)
		) {
			for (const e of s.importClause.namedBindings.elements) {
				if ((e.propertyName ?? e.name).text === 'render') renderNames.add(e.name.text);
			}
		}
	}
	// Sans import de render, `unmount`/`rerender` appartiennent à autre chose.
	if (renderNames.size === 0) return [];

	const found: UnawaitedCall[] = [];
	function awaited(call: ts.CallExpression): boolean {
		let p: ts.Node = call.parent;
		while (ts.isParenthesizedExpression(p)) p = p.parent;
		return ts.isAwaitExpression(p);
	}
	function visit(n: ts.Node) {
		if (ts.isCallExpression(n)) {
			const e = n.expression;
			const isRender = ts.isIdentifier(e) && renderNames.has(e.text);
			const isLifecycle =
				(ts.isPropertyAccessExpression(e) && ['unmount', 'rerender'].includes(e.name.text)) ||
				(ts.isIdentifier(e) &&
					['unmount', 'rerender'].includes(e.text) &&
					!importedElsewhere.has(e.text));
			if ((isRender || isLifecycle) && !awaited(n)) {
				const { line } = sf.getLineAndCharacterOfPosition(n.getStart(sf));
				found.push({ line: line + 1, text: n.getText(sf).split('\n')[0].slice(0, 80) });
			}
		}
		ts.forEachChild(n, visit);
	}
	visit(sf);
	return found;
}

function testFiles(dir: string): string[] {
	return (readdirSync(dir, { recursive: true }) as string[])
		.filter((f) => /\.svelte\.(test|spec)\.ts$/.test(f))
		.map((f) => join(dir, f));
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
	const ROOT = resolve(import.meta.dirname, '..');
	let total = 0;
	for (const file of testFiles(join(ROOT, 'src'))) {
		for (const c of findUnawaitedRender(readFileSync(file, 'utf8'), file)) {
			console.log(`  ${relative(ROOT, file)}:${c.line}  ${c.text}`);
			total++;
		}
	}
	if (total > 0) {
		console.log(`\n❌ ${total} appel(s) à render/unmount/rerender sans \`await\`.`);
		console.log('   vitest-browser-svelte 3 : écrire `await render(…)`. Un oubli monte quand même');
		console.log('   le composant — aucun test ne rougirait. Voir docs/ref/tests/architecture.md.');
		process.exit(1);
	}
	console.log('✅ Tous les render de vitest-browser-svelte sont attendus.');
}
