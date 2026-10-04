/**
 * Bloc ```nuage (manche 15, PR a, Q166-Q172) : nuage de points, point moyen,
 * droite des moindres carrés, r, prévisions.
 *
 * Valeurs de référence calculées en Python (fractions) :
 * `docs/wip/bloc-nuage-progress.md`.
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent, isStatChartBlockStart } from '../../parser/stat-chart-parser';
import { buildStatChartScene, type ScatterScene } from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import { parseMarkdown } from '$lib/ubumark';

// =============================================================================
// Helpers
// =============================================================================

const DATA = 'x: 1 ; 2 ; 3 ; 4 ; 5 ; 6\ny: 12 ; 15 ; 19 ; 22 ; 27 ; 30';
const FULL = `${DATA}\najustement: affine\nindicateurs: point moyen ; équation ; r\nprévoir: x = 4,5 ; x = 8 ; y = 25`;

function sceneOf(source: string, locale: 'fr' | 'en' = 'fr'): ScatterScene {
	const node = parseStatChartContent('nuage', source);
	expect(node.errors).toEqual([]);
	return buildStatChartScene(node.spec!, { locale }) as ScatterScene;
}

function errorsOf(source: string): string[] {
	const node = parseStatChartContent('nuage', source);
	expect(node.spec).toBeNull();
	return node.errors.map((e) => e.message);
}

const count = (text: string, marker: string) => text.split(marker).length - 1;

// =============================================================================
// Analyse
// =============================================================================

describe('```nuage — analyse', () => {
	it('le bloc est reconnu, dans un document aussi', () => {
		expect(isStatChartBlockStart('```nuage')).toBe('nuage');
		const doc = parseMarkdown(`Texte\n\n\`\`\`nuage\n${DATA}\n\`\`\`\n`);
		const node = doc.children.find((child) => child.type === 'stat-chart');
		expect(node).toMatchObject({ type: 'stat-chart', kind: 'nuage' });
	});

	it('nuage seul : valeurs telles qu’écrites, options par défaut', () => {
		const spec = parseStatChartContent('nuage', DATA).spec!;
		expect(spec.scatter).toEqual({
			xs: ['1', '2', '3', '4', '5', '6'],
			ys: ['12', '15', '19', '22', '27', '30'],
			names: { x: null, y: null },
			fit: false,
			indicators: [],
			predictions: [],
			places: 3,
			origin: false
		});
	});

	it('toutes les options', () => {
		const spec = parseStatChartContent(
			'nuage',
			`titre: Production\nnom x: Rang\nnom y: Tonnes\n${FULL}\narrondi: 2\norigine: oui`
		).spec!;
		expect(spec.title).toBe('Production');
		expect(spec.scatter).toMatchObject({
			names: { x: 'Rang', y: 'Tonnes' },
			fit: true,
			indicators: ['point-moyen', 'equation', 'r'],
			predictions: [
				{ axis: 'x', value: '4,5' },
				{ axis: 'x', value: '8' },
				{ axis: 'y', value: '25' }
			],
			places: 2,
			origin: true
		});
	});

	it('nombres : virgule, point, signe moins, fraction', () => {
		const spec = parseStatChartContent('nuage', 'x: -1 ; 0,5 ; 2.5 ; 1/3\ny: −2 ; 1 ; 3 ; 4').spec!;
		expect(spec.scatter!.xs).toEqual(['-1', '0,5', '2.5', '1/3']);
		expect(spec.scatter!.ys).toEqual(['−2', '1', '3', '4']);
	});
});

describe('```nuage — erreurs situées', () => {
	it('longueurs différentes', () => {
		expect(errorsOf('x: 1 ; 2 ; 3\ny: 1 ; 2')).toEqual([
			'Ligne 2 : x et y n’ont pas le même nombre de valeurs (3 et 2)'
		]);
	});

	it('moins de 2 points, plus de 100', () => {
		expect(errorsOf('x: 1\ny: 2')[0]).toBe('Ligne 1 : au moins 2 points');
		const many = Array.from({ length: 101 }, (_, i) => i).join(' ; ');
		expect(errorsOf(`x: ${many}\ny: ${many}`)[0]).toBe('Ligne 1 : au plus 100 points');
	});

	it('abscisses toutes égales', () => {
		expect(errorsOf('x: 2 ; 2 ; 2\ny: 1 ; 2 ; 3')[0]).toMatch(
			/^Ligne 1 : toutes les abscisses sont égales/
		);
	});

	it('x ou y manquant', () => {
		expect(errorsOf('x: 1 ; 2')[0]).toMatch(/écrire x: … et y: …/);
	});

	it('valeur qui n’est pas un nombre', () => {
		expect(errorsOf('x: 1 ; a\ny: 1 ; 2')).toEqual(['Ligne 1 : « a » n’est pas un nombre']);
		expect(errorsOf('x: 1 ; 25 %\ny: 1 ; 2')).toEqual(['Ligne 1 : « 25 % » n’est pas un nombre']);
	});

	it('indicateur inconnu, r² refusé', () => {
		expect(errorsOf(`${DATA}\nindicateurs: pente`)).toEqual([
			'Ligne 3 : indicateur « pente » inconnu (choisir : point moyen, équation, r)'
		]);
		expect(errorsOf(`${DATA}\nindicateurs: r²`)[0]).toBe(
			'Ligne 3 : r seulement : le coefficient de corrélation'
		);
		expect(errorsOf(`${DATA}\nindicateurs: r^2`)[0]).toContain('r seulement');
	});

	it('prévoir sans ajustement, prévoir mal écrit', () => {
		expect(errorsOf(`${DATA}\nprévoir: x = 2`)[0]).toBe(
			'Ligne 3 : prévoir : seulement avec ajustement: affine'
		);
		expect(errorsOf(`${DATA}\najustement: affine\nprévoir: z = 2`)[0]).toMatch(
			/^Ligne 4 : prévoir : écrire x = … ou y = …/
		);
	});

	it('ajustement autre qu’affine', () => {
		expect(errorsOf(`${DATA}\najustement: exponentiel`)[0]).toMatch(/^Ligne 3 : ajustement/);
	});

	it('r avec des ordonnées toutes égales', () => {
		expect(errorsOf('x: 1 ; 2\ny: 5 ; 5\nindicateurs: r')[0]).toMatch(/^Ligne 3 : r : non défini/);
	});

	it('option d’un autre bloc, option répétée', () => {
		expect(errorsOf(`${DATA}\nlecture: médiane`)[0]).toMatch(
			/^Ligne 3 : option « lecture » inconnue/
		);
		expect(errorsOf(`${DATA}\narrondi: 2\narrondi: 3`)[0]).toMatch(/^Ligne 4 : option/);
	});
});

// =============================================================================
// Scène
// =============================================================================

describe('```nuage — scène, valeurs de référence', () => {
	it('indicateurs et prévisions, en français', () => {
		expect(sceneOf(FULL).indicators).toEqual([
			'Point moyen : G(3,5 ; 20,833)',
			'Droite des moindres carrés : y = 3,686x + 7,933',
			'Coefficient de corrélation : r ≈ 0,998',
			'Pour x = 4,5 : y ≈ 24,519 (interpolation)',
			'Pour x = 8 : y ≈ 37,419 (extrapolation)',
			'Pour y = 25 : x ≈ 4,630 (interpolation)'
		]);
	});

	it('en anglais : point décimal, virgule entre les coordonnées', () => {
		expect(sceneOf(FULL, 'en').indicators).toEqual([
			'Mean point: G(3.5, 20.833)',
			'Least squares line: y = 3.686x + 7.933',
			'Correlation coefficient: r ≈ 0.998',
			'For x = 4.5: y ≈ 24.519 (interpolation)',
			'For x = 8: y ≈ 37.419 (extrapolation)',
			'For y = 25: x ≈ 4.630 (interpolation)'
		]);
	});

	it('ajustement seul : l’équation est écrite, en premier', () => {
		expect(sceneOf(`${DATA}\najustement: affine\nindicateurs: r`).indicators).toEqual([
			'Droite des moindres carrés : y = 3,686x + 7,933',
			'Coefficient de corrélation : r ≈ 0,998'
		]);
	});

	it('arrondi: 2', () => {
		expect(sceneOf(`${DATA}\nindicateurs: point moyen\narrondi: 2`).indicators).toEqual([
			'Point moyen : G(3,5 ; 20,83)'
		]);
	});

	it('nuage seul : les points, ni droite, ni G, ni indicateurs', () => {
		const scene = sceneOf(DATA);
		expect(scene.kind).toBe('nuage');
		expect(scene.points).toHaveLength(6);
		expect(scene.points[2]).toEqual({ x: 3, y: 19 });
		expect(scene.line).toBeNull();
		expect(scene.mean).toBeNull();
		expect(scene.predictions).toEqual([]);
		expect(scene.indicators).toEqual([]);
		expect(scene.axisTitles).toEqual({ x: 'x', y: 'y' });
	});

	it('droite sur toute la largeur, G placé, prévisions dans le cadre', () => {
		const scene = sceneOf(FULL);
		const [from, to] = scene.line!;
		expect(from.x).toBe(scene.xMin);
		expect(to.x).toBe(scene.xMax);
		expect(from.y).toBeCloseTo((129 / 35) * scene.xMin + 119 / 15, 9);
		expect(to.y).toBeCloseTo((129 / 35) * scene.xMax + 119 / 15, 9);
		expect(scene.mean!.x).toBe(3.5);
		expect(scene.mean!.y).toBeCloseTo(125 / 6, 9);
		expect(scene.predictions).toHaveLength(3);
		expect(scene.predictions[1].x).toBe(8);
		expect(scene.predictions[1].y).toBeCloseTo(3929 / 105, 9);
		expect(scene.predictions[2].y).toBe(25);
		expect(scene.predictions[2].x).toBeCloseTo(8960 / 1935, 9);
		// x = 8 (extrapolation) est dans le cadre
		expect(scene.xMax).toBeGreaterThanOrEqual(8);
		for (const p of [...scene.points, ...scene.predictions, from, to]) {
			expect(p.y).toBeGreaterThanOrEqual(scene.yMin);
			expect(p.y).toBeLessThanOrEqual(scene.yMax);
		}
	});

	it('axes adaptés aux données ; origine: oui les fait partir de 0', () => {
		const far = 'x: 101 ; 102 ; 103 ; 104\ny: 50 ; 52 ; 55 ; 60';
		const adapted = sceneOf(far);
		expect(adapted.xMin).toBeGreaterThan(50);
		expect(adapted.yMin).toBeGreaterThan(20);
		expect(adapted.xMin).toBeLessThanOrEqual(101);
		expect(adapted.xTicks.length).toBeGreaterThan(2);
		const origin = sceneOf(`${far}\norigine: oui`);
		expect(origin.xMin).toBe(0);
		expect(origin.yMin).toBe(0);
	});

	it('nom x / nom y : titres des axes', () => {
		expect(sceneOf(`nom x: Rang\nnom y: Tonnes\n${DATA}`).axisTitles).toEqual({
			x: 'Rang',
			y: 'Tonnes'
		});
	});

	it('description accessible : nombre de points, G, équation', () => {
		const scene = sceneOf(FULL);
		expect(scene.accessibleTitle).toBe('Nuage de points');
		expect(scene.description).toContain('6 points');
		expect(scene.description).toContain('G(3,5 ; 20,833)');
		expect(scene.description).toContain('y = 3,686x + 7,933');
		expect(sceneOf(FULL, 'en').description).toContain('6 points');
	});

	it('pente nulle : « aucune solution » pour y ≠ b, équation y = b', () => {
		const scene = sceneOf('x: 1 ; 2 ; 3\ny: 5 ; 5 ; 5\najustement: affine\nprévoir: y = 7 ; x = 2');
		expect(scene.indicators).toEqual([
			'Droite des moindres carrés : y = 5',
			'Pour y = 7 : aucune solution (pente nulle)',
			'Pour x = 2 : y = 5 (interpolation)'
		]);
		expect(scene.predictions).toHaveLength(1);
	});

	it('équation : signes et coefficients ±1', () => {
		const line = (ys: string) =>
			sceneOf(`x: 0 ; 1 ; 2\ny: ${ys}\najustement: affine`).indicators[0];
		expect(line('3 ; 2 ; 1')).toBe('Droite des moindres carrés : y = −x + 3');
		expect(line('-1 ; 0 ; 1')).toBe('Droite des moindres carrés : y = x − 1');
		expect(line('0 ; 2 ; 4')).toBe('Droite des moindres carrés : y = 2x');
	});

	it('r = 1 pour des points alignés : « = »', () => {
		expect(sceneOf('x: 1 ; 2 ; 3\ny: 2 ; 4 ; 6\nindicateurs: r').indicators).toEqual([
			'Coefficient de corrélation : r = 1'
		]);
	});
});

// =============================================================================
// Typst
// =============================================================================

describe('```nuage → Typst', () => {
	it('un point dessiné par donnée, la droite, G, une prévision par pointillé', () => {
		const typst = generateStatChartTypst(parseStatChartContent('nuage', FULL));
		expect(typst).toContain('#import "@preview/cetz:0.3.0"');
		expect(count(typst, '// point du nuage')).toBe(6);
		expect(count(typst, '// droite')).toBe(1);
		expect(count(typst, '// point moyen')).toBe(1);
		expect(count(typst, '// prévision')).toBe(3);
		expect(typst).toContain('// indicateurs');
	});

	it('nuage seul : ni droite, ni G', () => {
		const typst = generateStatChartTypst(parseStatChartContent('nuage', DATA));
		expect(count(typst, '// point du nuage')).toBe(6);
		expect(typst).not.toContain('// droite');
		expect(typst).not.toContain('// point moyen');
	});

	it('titre gardé avec la figure ; textes d’auteur en chaînes', () => {
		const typst = generateStatChartTypst(
			parseStatChartContent('nuage', `titre: Prix #1 $\nnom x: Rang *\n${DATA}`)
		);
		expect(typst).toContain('#block(breakable: false, width: 100%)');
		expect(typst).toContain('#"Prix #1 $"');
		expect(typst).toContain('#"Rang *"');
	});

	it('bloc en erreur : cadre neutre', () => {
		expect(generateStatChartTypst(parseStatChartContent('nuage', 'x: 1'))).toContain(
			'Figure indisponible'
		);
	});
});
