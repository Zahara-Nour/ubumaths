/**
 * Chaque `var(--x)` des blocs du lot 3 doit exister : déclarée dans app.css, ou
 * localement dans le `<style>` du composant. Une variable absente est jetée en
 * silence par le navigateur (cf. docs/ref/css-color-tokens.md) : avant le lot,
 * les quatre composants lisaient `--foreground`, `--border`… qui n'existent pas,
 * et ne tenaient que par leurs couleurs de repli codées en dur.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const appCss = readFileSync(resolve(root, 'src/app.css'), 'utf8');

const COMPONENTS = [
	'src/lib/components/markdown/nodes/NumberLine.svelte',
	'src/lib/components/markdown/nodes/TrigCircle.svelte',
	'src/lib/components/markdown/nodes/VariationTable.svelte',
	'src/lib/components/markdown/nodes/ProbabilityTree.svelte'
];

/** Noms déclarés : `--nom:` (CSS) ou `style:--nom=` (directive Svelte) */
function declared(css: string): Set<string> {
	return new Set([...css.matchAll(/(?:style:)?(--[a-zA-Z0-9-]+)\s*[:=]/g)].map((m) => m[1]));
}

/** Noms lus (`var(--nom`) dans un texte, y compris dans les chaînes du script */
function used(source: string): string[] {
	return [...new Set([...source.matchAll(/var\((--[a-zA-Z0-9-]+)/g)].map((m) => m[1]))];
}

const global = declared(appCss);

describe('variables CSS des blocs du lot 3', () => {
	for (const file of COMPONENTS) {
		it(`${file.split('/').pop()} : toutes les variables lues existent`, () => {
			const source = readFileSync(resolve(root, file), 'utf8');
			const local = declared(source.replace(/var\([^)]*\)/g, ''));
			const missing = used(source).filter((name) => !global.has(name) && !local.has(name));
			expect(missing).toEqual([]);
		});

		it(`${file.split('/').pop()} : pas de forme Tailwind 3 \`hsl(var(--x))\``, () => {
			const source = readFileSync(resolve(root, file), 'utf8');
			expect(source).not.toMatch(/hsl\(var\(--/);
		});
	}
});
