/**
 * Le bouton retour ne lit jamais l'historique du navigateur
 * ==========================================================
 *
 * Règle tranchée le 2026-10-11 (docs/pratiques/composants-ui.md § BackLink) :
 * le retour mène à la page parente, lue dans l'adresse de la page. Après un
 * lien partagé, dans un nouvel onglet ou après un rechargement, `history.back()`
 * sort du site ou ne mène nulle part, et son libellé ne peut pas dire où il va.
 * Revenir là où on était, c'est le rôle du bouton retour du navigateur.
 *
 * Exception voulue : la page d'erreur, qui n'a pas de page parente connue et
 * propose « Page précédente » sous ce nom.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// ============================================================================
// CONSTANTES
// ============================================================================

const ROOTS = ['src/routes', 'src/lib'];

const ALLOWED = new Set(['src/routes/+error.svelte']);

/** `history.back()`, `window.history.back()`, `history.go(-1)` */
const READS_HISTORY = /\bhistory\.(?:back\(\)|go\(\s*-\s*1\s*\))/;

// ============================================================================
// FONCTIONS
// ============================================================================

function sourceFiles(dir: string): string[] {
	const files: string[] = [];
	for (const name of readdirSync(dir)) {
		if (name === '__tests__' || name.startsWith('.')) continue;
		const path = join(dir, name);
		if (statSync(path).isDirectory()) files.push(...sourceFiles(path));
		else if (/\.(ts|js|svelte)$/.test(name) && !name.endsWith('.test.ts')) files.push(path);
	}
	return files;
}

describe('bouton retour : jamais l’historique du navigateur', () => {
	it('aucune page ni composant n’appelle history.back(), hors page d’erreur', () => {
		const offenders = ROOTS.flatMap(sourceFiles)
			.filter((file) => READS_HISTORY.test(readFileSync(file, 'utf-8')))
			.map((file) => relative(process.cwd(), file))
			.filter((file) => !ALLOWED.has(file));
		expect(offenders).toEqual([]);
	});

	it('la règle détecte bien un retour par l’historique', () => {
		expect(READS_HISTORY.test('onclick={() => history.back()}')).toBe(true);
		expect(READS_HISTORY.test('window.history.back();')).toBe(true);
		expect(READS_HISTORY.test('history.go(-1)')).toBe(true);
		expect(READS_HISTORY.test('history.replaceState({}, "", url)')).toBe(false);
		expect(READS_HISTORY.test('history.go(1)')).toBe(false);
	});
});
