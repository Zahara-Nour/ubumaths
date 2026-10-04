/**
 * `.stats` et `.linreg` : une seule source de calcul.
 *
 * Chantier outils statistiques, lot 1 (2026-10-01) : le moteur ne calcule plus
 * lui-même, il délègue à `src/lib/statistics/`. Lot 5 (Q38) : sa sortie passe
 * en français ; `statistics-commands.golden.json` a été RECAPTURÉ après ce
 * changement voulu, il fige désormais la sortie française.
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
import * as bivariateModule from '../../../../statistics/bivariate';
import { Fraction } from '../../../../statistics/fraction';
import golden from './statistics-commands.golden.json';

vi.mock('../../../../statistics/describe', async (importOriginal) => {
	const original = await importOriginal<typeof import('../../../../statistics/describe')>();
	return {
		...original,
		summarizeList: vi.fn(original.summarizeList),
		summarizeTable: vi.fn(original.summarizeTable)
	};
});

vi.mock('../../../../statistics/bivariate', async (importOriginal) => {
	const original = await importOriginal<typeof import('../../../../statistics/bivariate')>();
	return { ...original, bivariateFit: vi.fn(original.bivariateFit) };
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

	// PR c (Q173) : le calcul EXACT du bloc ```nuage, plus `fitAffine` (flottants)
	it('.linreg délègue à bivariateFit, en valeurs exactes', () => {
		vi.mocked(bivariateModule.bivariateFit).mockClear();

		new WebReplEngine().execute('.linreg 1,2,3 : 2,4,6');

		const exact = (values: number[]) => values.map((v) => new Fraction(BigInt(v)));
		expect(bivariateModule.bivariateFit).toHaveBeenCalledWith(exact([1, 2, 3]), exact([2, 4, 6]));
	});

	it('.linreg garde son erreur de longueurs, sans appeler le module', () => {
		vi.mocked(bivariateModule.bivariateFit).mockClear();

		const result = new WebReplEngine().execute('.linreg 1,2,3 : 4,5');

		expect(result.success).toBe(false);
		expect(result.output).toContain('different de Y');
		expect(bivariateModule.bivariateFit).not.toHaveBeenCalled();
	});
});

describe('écarts voulus par rapport à l’ancien moteur', () => {
	it.each(['.stats 1, Infinity', '.linreg 1,Infinity : 1,2'])('%s : refusé', (command) => {
		const result = new WebReplEngine().execute(command);

		expect(result.success).toBe(false);
		// Le message de `.stats` ajoute depuis le lot 5 comment séparer les valeurs
		expect(result.output).toMatch(/^Erreur: certaines valeurs ne sont pas des nombres valides/);
	});

	it('.linreg ajuste des abscisses petites mais distinctes', () => {
		const result = new WebReplEngine().execute('.linreg 0.000001,0.000002,0.000003 : 1,2,3');

		expect(result.success).toBe(true);
		expect(result.output).toContain('r = 1');
	});
});

// =============================================================================
// Lot 5 (Q38) : sortie française, séparateur « ; », effectifs
// =============================================================================

describe('`.stats` en français', () => {
	const lines = (command: string) => new WebReplEngine().execute(command).output.split('\n');

	it('les lignes du module de mise en forme, accentuées', () => {
		const output = lines('.stats 12 ; 15 ; 9');

		expect(output).toContain('Effectif : 3');
		expect(output).toContain('Moyenne = 12');
		expect(output).toContain('Médiane = 12');
		expect(output).toContain('Variance = 6');
		expect(output.join('\n')).not.toMatch(/mean|stdev|Mediane\b/);
	});

	it('avec « ; », la virgule est décimale', () => {
		const output = lines('.stats 12,5 ; 3');

		expect(output).toContain('Effectif : 2');
		expect(output).toContain('Moyenne = 7,75');
	});

	it('la forme avec virgules reste acceptée', () => {
		expect(lines('.stats 12,15,9')).toContain('Effectif : 3');
	});

	it('valeurs : effectifs', () => {
		vi.mocked(describeModule.summarizeTable).mockClear();

		const output = lines('.stats 1 ; 2 ; 3 : 5 ; 8 ; 4');

		expect(output).toContain('Effectif : 17');
		expect(describeModule.summarizeTable).toHaveBeenCalledWith([1, 2, 3], [5, 8, 4]);
	});

	// Revue du lot 5 : ces trois écritures donnaient des statistiques FAUSSES, sans erreur
	it.each(['.stats 1,2,3 ; 4', '.stats 3abc ; 4', '.stats 12 15 9'])('%s : refusé', (command) => {
		expect(new WebReplEngine().execute(command).success).toBe(false);
	});

	// `3,4` après « : » était lu 3 et 4 alors que la virgule est décimale à gauche
	it('un « ; » fixe la convention pour tout l’argument, effectifs compris', () => {
		expect(lines('.stats 1 ; 2 : 3,5 ; 4')).toContain('Effectif : 7,5');
		// 3,4 est UN effectif (décimal) : un seul pour deux valeurs, refusé
		expect(new WebReplEngine().execute('.stats 1 ; 2 : 3,4').success).toBe(false);
	});

	it('le message d’usage montre « ; » et les effectifs', () => {
		const usage = new WebReplEngine().execute('.stats').output;

		expect(usage).toContain('12 ; 15 ; 9');
		expect(usage).toContain(':');
	});

	it('valeurs et effectifs de longueurs différentes : refusé', () => {
		const result = new WebReplEngine().execute('.stats 1 ; 2 : 5');

		expect(result.success).toBe(false);
	});
});

describe('`.ajustement` en français', () => {
	it('coefficient directeur, ordonnée à l’origine, r, virgule décimale', () => {
		const result = new WebReplEngine().execute('.linreg 1,2,3,4,5 : 1,3,2,4,5');

		expect(result.output).toContain('Ajustement affine');
		expect(result.output).toContain('Coefficient directeur a = 0,9');
		expect(result.output).toContain('Ordonnée à l’origine b = 0,3');
		expect(result.output).toContain('r = 0,9');
		expect(result.output).not.toMatch(/Regression|Ordonnee|R²/);
	});

	it('le LaTeX de l’équation est inchangé', () => {
		expect(new WebReplEngine().execute('.linreg 0,1,2 : 1,3,5').latex).toBe('y = 2x + 1');
	});
});

// =============================================================================
// Manche 15, PR c (Q173-Q177) : r, point moyen, prévisions, changement de variable
// =============================================================================

describe('`.ajustement` complété : mêmes calculs et mêmes textes que le bloc ```nuage', () => {
	const lines = (command: string) => new WebReplEngine().execute(command).output.split('\n');
	const SERIES = '.linreg 1,2,3,4,5,6 : 12,15,19,22,27,30';
	const EXPONENTIAL = '.linreg 0,1,2,3,4,5 : 2.1,3,4.6,6.9,10.2,15.4';

	it('point moyen, droite arrondie au millième, r (plus de R²)', () => {
		const output = lines(SERIES);

		expect(output).toContain('  Point moyen : G(3,5 ; 20,833)');
		expect(output).toContain('  y = 3,686x + 7,933');
		expect(output).toContain('  Coefficient directeur a ≈ 3,686');
		expect(output).toContain('  Ordonnée à l’origine b ≈ 7,933');
		expect(output).toContain('  Coefficient de corrélation : r ≈ 0,998');
		expect(output.join('\n')).not.toContain('R²');
	});

	it('r exact quand r² est un carré (r = 0,9)', () => {
		expect(lines('.linreg 1,2,3,4,5 : 1,3,2,4,5')).toContain(
			'  Coefficient de corrélation : r = 0,9'
		);
	});

	it('prévision en x : extrapolation', () => {
		expect(lines(`${SERIES} ; x = 8`)).toContain('  Pour x = 8 : y ≈ 37,419 (extrapolation)');
	});

	it('prévision en x : interpolation, et prévision en y', () => {
		const output = lines(`${SERIES} ; x = 4,5 ; y = 25`);

		expect(output).toContain('  Pour x = 4,5 : y ≈ 24,519 (interpolation)');
		expect(
			output.some((line) => /^ {2}Pour y = 25 : x ≈ [\d,]+ \(interpolation\)$/.test(line))
		).toBe(true);
	});

	it('changement de variable z = ln(y) : droite en z, relation, prévision', () => {
		const output = lines(`${EXPONENTIAL} ; z = ln(y) ; x = 7`);

		expect(output).toContain('  z = 0,401x + 0,723');
		expect(output).toContain(
			'  Relation entre x et y : y = e^(0,723) × e^(0,401x) ≈ 2,061 × e^(0,401x)'
		);
		expect(output).toContain('  Pour x = 7 : y ≈ 34,152 (extrapolation)');
		expect(
			output.some((line) => line.startsWith('  Point moyen du nuage (x ; z) : G(2,5 ; '))
		).toBe(true);
	});

	it('le LaTeX donne la droite ajustée (z en fonction de x)', () => {
		expect(new WebReplEngine().execute(`${EXPONENTIAL} ; z = ln(y)`).latex).toBe(
			'z = 0.401x + 0.723'
		);
	});

	it('changement de variable sur x : t = ln(x)', () => {
		const output = lines('.linreg 1,2,3,4 : 1,2,3,4 ; t = ln(x)');

		expect(output.some((line) => /^ {2}y = [\d,]+t [+−] [\d,]+$/.test(line))).toBe(true);
		expect(output.some((line) => line.startsWith('  Relation entre x et y : y = '))).toBe(true);
	});

	it('forme inconnue : la liste des huit formes', () => {
		const result = new WebReplEngine().execute(`${SERIES} ; z = exp(y)`);

		expect(result.success).toBe(false);
		expect(result.output).toContain('z = ln(y), z = y², z = √y, z = 1/y');
		expect(result.output).toContain('t = ln(x), t = x², t = √x, t = 1/x');
	});

	it('hors du domaine : le point fautif', () => {
		const result = new WebReplEngine().execute('.linreg 1,2,3 : 2,-1,4 ; z = ln(y)');

		expect(result.success).toBe(false);
		expect(result.output).toContain('ln(y) : y = -1 au point 2 n’est pas strictement positif');
	});

	it('option illisible : refusée, en français', () => {
		const result = new WebReplEngine().execute(`${SERIES} ; x = abc`);

		expect(result.success).toBe(false);
		expect(result.output).toContain('« abc » n’est pas un nombre');
	});

	it('deux changements de variable : refusé', () => {
		const result = new WebReplEngine().execute(`${SERIES} ; z = ln(y) ; t = ln(x)`);

		expect(result.success).toBe(false);
	});
});
