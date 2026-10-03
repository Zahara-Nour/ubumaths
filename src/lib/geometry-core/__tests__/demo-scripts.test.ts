/**
 * Les scripts DSL des pages de démo de géométrie s'exécutent sans erreur.
 *
 * Une démo dont le script n'est plus à jour avec le DSL plante la page entière,
 * sans qu'aucun test ne le voie : `/geometry-demo/circles` utilisait encore la
 * déstructuration `(P1, P2, s) = corde(c, d)`, refusée depuis.
 */
import { globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runDsl } from '..';

const DEMO_DIR = resolve(process.cwd(), 'src/routes/(public)/geometry-demo');

/** Chaque `const nom = \`…\`` sans interpolation d'une page de démo */
function demoScripts(): Array<{ page: string; name: string; script: string }> {
	return globSync('**/+page.svelte', { cwd: DEMO_DIR }).flatMap((page) => {
		const source = readFileSync(resolve(DEMO_DIR, page), 'utf8');
		return (
			[...source.matchAll(/const (\w+) = `([^`]*)`/g)]
				.filter(([, , script]) => !script.includes('${'))
				// Le source porte la forme ÉCHAPPÉE du gabarit (`\\pi`) : on rend la
				// chaîne telle que JavaScript la produit à l'exécution (`\pi`).
				.map(([, name, raw]) => ({ page, name, script: raw.replace(/\\([\\`$])/g, '$1') }))
		);
	});
}

describe('scripts des démos de géométrie', () => {
	const scripts = demoScripts();

	it('en trouve', () => {
		expect(scripts.length).toBeGreaterThan(20);
	});

	it.each(scripts.map((s) => [`${s.page} › ${s.name}`, s.script]))('%s s’exécute', (_, script) => {
		expect(() => runDsl(script as string)).not.toThrow();
	});
});
