/**
 * Rendu serveur du markdown : jsdom n'est pas chargé
 * ==================================================
 *
 * `isomorphic-dompurify` charge jsdom côté serveur (~640 modules, ~140 ms, ~70 Mo
 * mesurés le 2026-11-21). Les composants de markdown n'en ont pas besoin : ils
 * n'utilisent que `sanitizeUrl`. Tant que cette fonction vivait dans `sanitize.ts`
 * (qui importe DOMPurify), 79 pages sur 338 chargeaient jsdom à leur rendu serveur,
 * dont l'Atelier, Automaths, les exercices publics et le Shtam.
 *
 * Ce test suit les imports statiques depuis `MarkdownRenderer.svelte` et échoue,
 * en nommant le chemin, si l'un d'eux mène à `isomorphic-dompurify`. Un `import()`
 * dynamique ne compte pas : il ne charge rien au rendu.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const LIB = join(ROOT, 'src/lib');
const HEAVY_PACKAGE = 'isomorphic-dompurify';

/** Imports et ré-exports statiques, hors `import type` */
const STATIC_IMPORT =
	/^\s*(?:import|export)\s+(?!type\b)[^;]*?from\s+['"]([^'"]+)['"]|^\s*import\s+['"]([^'"]+)['"]/gm;

function specifiersOf(file: string): string[] {
	const source = readFileSync(file, 'utf8');
	return [...source.matchAll(STATIC_IMPORT)].map((match) => match[1] ?? match[2]);
}

function resolveLocal(from: string, specifier: string): string | undefined {
	let base: string;
	if (specifier.startsWith('#lib/')) base = join(LIB, specifier.slice('#lib/'.length));
	else if (specifier.startsWith('.')) base = resolve(dirname(from), specifier);
	else return undefined;

	const candidates = [
		base,
		`${base}.ts`,
		`${base}.svelte`,
		`${base}.svelte.ts`,
		`${base}.js`,
		join(base, 'index.ts')
	];
	return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
}

/** Premier chemin d'imports statiques de `entry` jusqu'à `HEAVY_PACKAGE`, s'il existe */
function pathToHeavyPackage(entry: string): string[] | undefined {
	const seen = new Set<string>();

	function visit(file: string, trail: string[]): string[] | undefined {
		if (seen.has(file)) return undefined;
		seen.add(file);
		const here = [...trail, relative(ROOT, file)];
		for (const specifier of specifiersOf(file)) {
			if (specifier === HEAVY_PACKAGE) return [...here, HEAVY_PACKAGE];
			const next = resolveLocal(file, specifier);
			const found = next && visit(next, here);
			if (found) return found;
		}
		return undefined;
	}

	return visit(entry, []);
}

describe('imports statiques du markdown', () => {
	it('le parcours sait trouver isomorphic-dompurify (sanitize.ts y mène)', () => {
		const found = pathToHeavyPackage(join(LIB, 'utils/sanitize.ts'));

		expect(found).toEqual(['src/lib/utils/sanitize.ts', HEAVY_PACKAGE]);
	});

	it('MarkdownRenderer ne mène pas à isomorphic-dompurify', () => {
		const found = pathToHeavyPackage(join(LIB, 'components/markdown/MarkdownRenderer.svelte'));

		expect(found?.join(' → ')).toBeUndefined();
	});

	it('sanitize-url.ts n’importe rien', () => {
		expect(specifiersOf(join(LIB, 'utils/sanitize-url.ts'))).toEqual([]);
	});
});
