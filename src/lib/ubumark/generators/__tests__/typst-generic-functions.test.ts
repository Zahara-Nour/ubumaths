/**
 * Fonctions déclarées par l'exercice (`exercises.generic_functions`) dans le PDF.
 *
 * À l'écran, `C'(x)` s'affiche « C′(x) » quand l'exercice déclare `C` comme
 * fonction. Le PDF ne recevait pas cette déclaration : le parseur voyait `C`
 * comme une variable, butait sur l'apostrophe et imprimait en rouge
 * « Unexpected token: ' » (mesuré le 2026-09-24).
 */

import { describe, it, expect } from 'vitest';
import { generateTypst } from '../typst-generator';
import { parseMarkdown } from '$lib/ubumark';
import { genericFunctionsConfig } from '$lib/components/markdown/utils/math-utils';

const C_DECLARED = { names: ['C'], allowDerivatives: true, allowInverse: true };

describe('generateTypst — fonctions déclarées', () => {
	it('sans déclaration, C n’est pas une fonction : l’erreur apparaît (témoin)', () => {
		const typst = generateTypst(parseMarkdown("On a ~C'(x)=2x~."), { includeSetup: false });
		expect(typst).toContain('Unexpected token');
	});

	it('avec C déclaré, C′(x) est rendu en math inline, sans erreur', () => {
		const typst = generateTypst(parseMarkdown("On a ~C'(x)=2x~."), {
			includeSetup: false,
			genericFunctions: C_DECLARED
		});
		expect(typst).not.toContain('Unexpected token');
		expect(typst).toMatch(/C\s*'|C\s*prime|C\^\(prime\)|C\s*′/);
	});

	it('avec C déclaré, un bloc math ~~…~~ est rendu sans erreur', () => {
		const typst = generateTypst(parseMarkdown("~~C'(x)=2x~~"), {
			includeSetup: false,
			genericFunctions: C_DECLARED
		});
		expect(typst).not.toContain('Unexpected token');
	});
});

describe('genericFunctionsConfig', () => {
	it('undefined ou null → undefined (défauts du parseur, comme à l’écran)', () => {
		expect(genericFunctionsConfig(undefined)).toBeUndefined();
		expect(genericFunctionsConfig(null)).toBeUndefined();
	});

	it('une liste → configuration avec dérivées et réciproques', () => {
		expect(genericFunctionsConfig(['C', 'u'])).toEqual({
			names: ['C', 'u'],
			allowDerivatives: true,
			allowInverse: true
		});
	});
});
