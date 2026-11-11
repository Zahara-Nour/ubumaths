/**
 * La liste des modules qui agissent au chargement
 * ===============================================
 *
 * Le build client déclare sans effet de bord tout module `.ts` de `src/lib`
 * hors de `MODULES_WITH_SIDE_EFFECTS`. Un module qui enregistre quelque chose
 * au chargement et manque à la liste serait retiré du build EN SILENCE : les
 * tests (vitest, sans élagage) passeraient, la prod casserait. D'où la garde.
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { MODULES_WITH_SIDE_EFFECTS, moduleSideEffects } from '../side-effect-modules';
import {
	findBareImports,
	findTopLevelEffects,
	listBareImportTargets,
	listModulesWithTopLevelEffects
} from '../find-top-level-effects';

const SRC = resolve(__dirname, '../../src');
const LIB = join(SRC, 'lib');

describe('findTopLevelEffects', () => {
	it('voit un appel nu, une affectation, une boucle, un if, un try', () => {
		const src = [
			"register('a', a);",
			'self.onmessage = () => {};',
			'for (const x of xs) map.set(x, 1);',
			'if (cond) init();',
			'try { setup(); } catch {}'
		].join('\n');
		expect(findTopLevelEffects(src)).toHaveLength(5);
	});

	it('voit un import nu : il ne sert que son effet (CSS, enregistrement)', () => {
		// `utils/mathlive-styles.ts` n'est que `import 'mathlive/static.css'` :
		// élagué, les polices de MathLive disparaissaient du build (2026-11-11).
		expect(findTopLevelEffects("import 'mathlive/static.css';")).toEqual([
			"import 'mathlive/static.css';"
		]);
	});

	it("n'accuse ni une déclaration, ni un appel dans une fonction, ni une constante construite", () => {
		const src = [
			"import { P } from './p';",
			"import type { T } from './t';",
			'export const RULES = [createRule(P.add(1, 2))];',
			'const SEEN = new Set([1, 2]);',
			'export function f() { register(1); }',
			'export class C { m() { init(); } }',
			'export type T = string;',
			'export default RULES;'
		].join('\n');
		expect(findTopLevelEffects(src)).toEqual([]);
	});
});

describe('findBareImports', () => {
	it('rend la cible des imports nus, pas celle des imports nommés', () => {
		const src = ["import '$lib/utils/mathlive-styles';", "import { x } from './x';"].join('\n');
		expect(findBareImports(src)).toEqual(['$lib/utils/mathlive-styles']);
	});
});

describe('moduleSideEffects', () => {
	it('déclare sans effet un module .ts de src/lib hors liste', () => {
		expect(moduleSideEffects('/repo/src/lib/mathAST/tidy/collect.ts')).toBe(false);
		expect(moduleSideEffects('/repo/src/lib/atelier/desk.svelte.ts')).toBe(false);
	});

	it('garde les effets des modules de la liste', () => {
		expect(moduleSideEffects('/repo/src/lib/zod-locale.ts')).toBe(true);
		expect(moduleSideEffects('/repo/src/lib/constructions/instruments/ruler.ts')).toBe(true);
	});

	it('ne touche ni aux composants, ni aux dépendances, ni aux modules virtuels', () => {
		expect(moduleSideEffects('/repo/src/lib/components/MathField.svelte')).toBe(true);
		expect(moduleSideEffects('/repo/node_modules/mathlive/mathlive.mjs')).toBe(true);
		expect(moduleSideEffects('/repo/src/lib/components/X.svelte?svelte&type=style&lang.css')).toBe(
			true
		);
		expect(moduleSideEffects('/repo/src/routes/+layout.ts')).toBe(true);
	});
});

describe('la liste face au code', () => {
	it('contient chaque module de src/lib qui agit au chargement', () => {
		const missing = listModulesWithTopLevelEffects(LIB).filter(
			(path) => !MODULES_WITH_SIDE_EFFECTS.has(path)
		);
		expect(missing, 'à ajouter dans scripts/side-effect-modules.ts').toEqual([]);
	});

	it('contient chaque module de src/lib visé par un import nu, .svelte et routes compris', () => {
		// `import '$lib/utils/mathlive-styles'` est écrit dans des composants : un
		// module ainsi importé n'a aucun export utilisé, le build le retirerait.
		const missing = listBareImportTargets(SRC).filter(
			(path) => !MODULES_WITH_SIDE_EFFECTS.has(path)
		);
		expect(missing, 'à ajouter dans scripts/side-effect-modules.ts').toEqual([]);
	});

	it('ne nomme que des fichiers qui existent', () => {
		const gone = [...MODULES_WITH_SIDE_EFFECTS].filter((path) => !existsSync(join(LIB, path)));
		expect(gone).toEqual([]);
	});
});
