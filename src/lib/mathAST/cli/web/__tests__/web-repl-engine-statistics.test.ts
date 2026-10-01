/**
 * `.stats` et `.linreg` : une seule source de calcul.
 *
 * Chantier outils statistiques, lot 1 (2026-10-01) : le moteur ne calcule plus
 * lui-même, il délègue à `src/lib/statistics/`. Sa sortie ne change pas —
 * `statistics-commands.golden.json` a été capturé AVANT le rebranchement.
 *
 * Écarts voulus, figés ci-dessous :
 * - `.stats 0.1, 0.1, 0.1` affichait un écart type de `1.38778e-17` (moyenne
 *   flottante ≠ 0,1) ; il affiche maintenant `0` (dans le golden) ;
 * - `Infinity` (que `parseFloat` accepte) est refusé par `.stats` et `.linreg`
 *   au lieu d'afficher `Infinity` ou `NaN` ;
 * - `.linreg` sur des abscisses petites mais distinctes (1e-6, 2e-6, 3e-6)
 *   ajuste au lieu d'annoncer « valeurs X toutes identiques » (ancien seuil
 *   absolu de 1e-10).
 */

import { describe, it, expect, vi } from 'vitest';
import { WebReplEngine } from '../web-repl-engine';
import * as describeModule from '../../../../statistics/describe';
import * as fitModule from '../../../../statistics/fit';
import golden from './statistics-commands.golden.json';

vi.mock('../../../../statistics/describe', async (importOriginal) => {
	const original = await importOriginal<typeof import('../../../../statistics/describe')>();
	return { ...original, summarizeList: vi.fn(original.summarizeList) };
});

vi.mock('../../../../statistics/fit', async (importOriginal) => {
	const original = await importOriginal<typeof import('../../../../statistics/fit')>();
	return { ...original, fitAffine: vi.fn(original.fitAffine) };
});

describe('sortie inchangée par le rebranchement', () => {
	it.each(golden)('$command', ({ command, success, output, outputHtml, latex }) => {
		const result = new WebReplEngine().execute(command);

		expect(result.success).toBe(success);
		expect(result.output).toBe(output);
		expect(result.outputHtml).toBe(outputHtml);
		expect(result.latex ?? null).toBe(latex);
	});
});

describe('le calcul vient du module statistique', () => {
	it('.stats délègue à summarizeList', () => {
		vi.mocked(describeModule.summarizeList).mockClear();

		new WebReplEngine().execute('.stats 12, 15, 9');

		expect(describeModule.summarizeList).toHaveBeenCalledWith([12, 15, 9]);
	});

	it('.linreg délègue à fitAffine', () => {
		vi.mocked(fitModule.fitAffine).mockClear();

		new WebReplEngine().execute('.linreg 1,2,3 : 2,4,6');

		expect(fitModule.fitAffine).toHaveBeenCalledWith([1, 2, 3], [2, 4, 6]);
	});

	it('.linreg garde son erreur de longueurs, sans appeler le module', () => {
		vi.mocked(fitModule.fitAffine).mockClear();

		const result = new WebReplEngine().execute('.linreg 1,2,3 : 4,5');

		expect(result.success).toBe(false);
		expect(result.output).toContain('different de Y');
		expect(fitModule.fitAffine).not.toHaveBeenCalled();
	});
});

describe('écarts voulus par rapport à l’ancien moteur', () => {
	it.each(['.stats 1, Infinity', '.linreg 1,Infinity : 1,2'])('%s : refusé', (command) => {
		const result = new WebReplEngine().execute(command);

		expect(result.success).toBe(false);
		expect(result.output).toBe('Erreur: certaines valeurs ne sont pas des nombres valides');
	});

	it('.linreg ajuste des abscisses petites mais distinctes', () => {
		const result = new WebReplEngine().execute('.linreg 0.000001,0.000002,0.000003 : 1,2,3');

		expect(result.success).toBe(true);
		expect(result.output).toContain('R²: 1');
	});
});
