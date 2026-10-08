/**
 * Aucun test ni module ne lit un fichier sous docs/
 * ===================================================
 *
 * Un changement 100 % documentaire se commite directement sur main, et la CI
 * ne tourne pas sur un push qui ne touche que docs/ (`paths-ignore`). Un test
 * qui lit un fichier de docs/ casse donc en silence : le 2026-10-08, le JSON
 * de travail de l'arbre des notions (docs/wip/arbre-notions/arbre-notions.json)
 * est passé en version .15 par un commit de doc, et le test d'intégration du
 * seed a échoué sur TOUTES les PR suivantes.
 *
 * Règle : un fichier dont dépend un test vit sous tests/ (copie figée,
 * mise à jour avec la migration ou le code qui la justifie) : tests/fixtures/
 * (relecture) ou tests/integration/fixtures/ (seeds).
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// ============================================================================
// CONSTANTES
// ============================================================================

const ROOTS = ['src', 'tests', 'scripts'];

/**
 * Exceptions voulues : ces tests VALIDENT le contenu de docs/ lui-même.
 * - corrections.test.ts : aucun identifiant d'utilisateur dans les instantanés
 *   commités de docs/corrections (RGPD).
 * - ce fichier : ses propres exemples.
 */
const ALLOWED = new Set([
	'scripts/corrections/__tests__/corrections.test.ts',
	'src/lib/__tests__/tests-sans-lecture-de-docs.test.ts'
]);

/** Lecture de fichier dont le chemin, littéral, commence par docs/ (ou ../docs/). */
const READS_DOCS = /(?:readFileSync|readFile|createReadStream|new URL)\(\s*[`'"](?:\.\.\/)*docs\//;

// ============================================================================
// FONCTIONS
// ============================================================================

function sourceFiles(dir: string): string[] {
	const files: string[] = [];
	for (const name of readdirSync(dir)) {
		if (name === 'node_modules' || name.startsWith('.')) continue;
		const path = join(dir, name);
		if (statSync(path).isDirectory()) files.push(...sourceFiles(path));
		else if (/\.(ts|js|svelte)$/.test(name)) files.push(path);
	}
	return files;
}

describe('aucun test ni module ne lit docs/', () => {
	it('les fichiers lus vivent sous tests/, jamais sous docs/', () => {
		const offenders = ROOTS.flatMap(sourceFiles)
			.filter((file) => READS_DOCS.test(readFileSync(file, 'utf-8')))
			.map((file) => relative(process.cwd(), file))
			.filter((file) => !ALLOWED.has(file));
		expect(offenders).toEqual([]);
	});

	it('la règle détecte bien une lecture de docs/', () => {
		expect(READS_DOCS.test("readFileSync('docs/wip/x.json', 'utf-8')")).toBe(true);
		expect(READS_DOCS.test('readFileSync(`docs/relecture/${p}.json`)')).toBe(true);
		expect(READS_DOCS.test("new URL('../../docs/a.json', import.meta.url)")).toBe(true);
		expect(READS_DOCS.test("readFileSync('tests/integration/fixtures/a.json')")).toBe(false);
	});
});
