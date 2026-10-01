/**
 * Bloc ```figure → Typst : chaque producteur de PDF inscrit le rendu réel
 *
 * `typst-generator.ts` ne connaît le rendu des figures que par un registre
 * (`figure-typst-registry.ts`) : l'importer directement mettrait l'interpréteur
 * de geometry-core dans le chunk des pages Markdown. Un module qui appelle
 * `generateTypst` sans importer `figure-typst-setup` produirait des PDF où
 * chaque figure devient « Figure indisponible », SANS erreur : ce test l'interdit.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(process.cwd(), 'src');

function files(dir: string): string[] {
	return readdirSync(dir).flatMap((f) => {
		const p = join(dir, f);
		if (statSync(p).isDirectory()) return f === '__tests__' ? [] : files(p);
		return /\.(ts|svelte)$/.test(f) && !f.endsWith('.test.ts') ? [p] : [];
	});
}

describe('figure → Typst : rendu inscrit par les producteurs de PDF', () => {
	const callers = files(SRC).filter((f) => {
		if (f.endsWith('ubumark/generators/typst-generator.ts')) return false;
		return /\bgenerateTypst\(/.test(readFileSync(f, 'utf8'));
	});

	it('les producteurs connus sont trouvés', () => {
		expect(callers.length).toBeGreaterThanOrEqual(4);
	});

	it.each(callers.map((f) => [f.replace(SRC, 'src')]))('%s importe figure-typst-setup', (rel) => {
		const source = readFileSync(join(process.cwd(), rel), 'utf8');
		expect(source).toContain("import '$lib/ubumark/generators/figure-typst-setup';");
	});

	it('le générateur Typst du baril n’importe PAS le rendu lourd', () => {
		const source = readFileSync(join(SRC, 'lib/ubumark/generators/typst-generator.ts'), 'utf8');
		expect(source).not.toMatch(/^import .*(\/figure-typst'|figure-typst-setup|geometry-core)/m);
	});
});
