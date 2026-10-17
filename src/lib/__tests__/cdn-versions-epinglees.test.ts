/**
 * Garde (écart T10, chantier K11) : toute URL de CDN npm dans `src/` nomme une version.
 *
 * `CorrectionManager.svelte` chargeait typst.ts et ses WASM depuis jsDelivr sans
 * version : chaque publication du paquet partait aussitôt chez les professeurs
 * (chaîne d'approvisionnement), et pouvait remplacer le `window.$typst` épinglé
 * du compilateur partagé.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(process.cwd(), 'src');
const CDN_URL = /https:\/\/(?:cdn\.jsdelivr\.net\/npm|unpkg\.com)\/((?:@[^/'"`\s]+\/)?[^/'"`\s]+)/g;

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(path);
		return /\.(ts|js|svelte)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [path] : [];
	});
}

describe('URL de CDN dans src/', () => {
	it('nomment toutes une version', () => {
		const unpinned: string[] = [];
		for (const file of sourceFiles(SRC)) {
			for (const match of readFileSync(file, 'utf8').matchAll(CDN_URL)) {
				// `@scope/paquet@1.2.3` ou `paquet@1.2.3` : la version suit le nom du paquet
				const pkg = match[1];
				const nameAndVersion = pkg.startsWith('@') ? pkg.split('/')[1] : pkg;
				if (!nameAndVersion.includes('@'))
					unpinned.push(`${file.slice(SRC.length + 1)} : ${match[0]}`);
			}
		}
		expect(unpinned).toEqual([]);
	});
});
