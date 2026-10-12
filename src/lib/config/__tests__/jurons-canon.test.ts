/**
 * Les jurons du Père Ubu viennent du canon (Compendium, voir
 * docs/systeme/univers-chiphre.md) : « Hornphynance », « Hornstrompe » et
 * « palotron » n'y sont pas (écart D15, décision de David du 2026-10-12).
 * Le mot de Jarry est « palotin ».
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const HORS_CANON = /hornphynance|hornstrompe|palotron/i;

function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path);
		return /\.(ts|svelte)$/.test(name) ? [path] : [];
	});
}

describe('jurons du Père Ubu', () => {
	it("aucun juron hors canon dans le code de l'application", () => {
		const fautifs = sourceFiles('src').filter((file) =>
			HORS_CANON.test(readFileSync(file, 'utf8'))
		);
		expect(fautifs).toEqual([]);
	});
});
