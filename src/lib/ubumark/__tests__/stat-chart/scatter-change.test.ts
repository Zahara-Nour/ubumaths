/**
 * Bloc ```nuage : changement de variable (manche 15, PR b) — `ajustement:
 * z = ln(y)` et les sept autres formes, relation retrouvée, courbe, `nuage: z`.
 *
 * Valeurs de référence (Python) : `docs/wip/nuage-changement-variable-progress.md`.
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import { buildStatChartScene, type ScatterScene } from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';

// =============================================================================
// Helpers
// =============================================================================

const DATA = 'x: 0 ; 1 ; 2 ; 3 ; 4 ; 5\ny: 2,1 ; 3 ; 4,6 ; 6,9 ; 10,2 ; 15,4';
const REF = `${DATA}\najustement: z = ln(y)\nindicateurs: point moyen ; r\nprévoir: x = 7 ; y = 50`;

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

describe('changement de variable — analyse', () => {
	it.each([
		['z = ln(y)', { variable: 'z', on: 'y', fn: 'ln' }],
		['z = y²', { variable: 'z', on: 'y', fn: 'square' }],
		['z = y^2', { variable: 'z', on: 'y', fn: 'square' }],
		['z = √y', { variable: 'z', on: 'y', fn: 'sqrt' }],
		['z = sqrt(y)', { variable: 'z', on: 'y', fn: 'sqrt' }],
		['z = 1/y', { variable: 'z', on: 'y', fn: 'inverse' }],
		['t = ln(x)', { variable: 't', on: 'x', fn: 'ln' }],
		['t = x²', { variable: 't', on: 'x', fn: 'square' }],
		['t = √x', { variable: 't', on: 'x', fn: 'sqrt' }],
		['t = 1/x', { variable: 't', on: 'x', fn: 'inverse' }]
	])('ajustement: %s', (written, change) => {
		const source = 'x: 1 ; 2 ; 3\ny: 1 ; 2 ; 4';
		const spec = parseStatChartContent('nuage', `${source}\najustement: ${written}`).spec!;
		expect(spec.scatter!.change).toEqual(change);
		expect(spec.scatter!.fit).toBe(true);
	});

	it('affine : pas de changement ; nuage: z', () => {
		expect(
			parseStatChartContent('nuage', `${DATA}\najustement: affine`).spec!.scatter!.change
		).toBeNull();
		expect(
			parseStatChartContent('nuage', `${DATA}\najustement: z = ln(y)\nnuage: z`).spec!.scatter!
				.transformedCloud
		).toBe(true);
	});
});

describe('changement de variable — erreurs situées', () => {
	it('forme hors liste : la liste', () => {
		expect(errorsOf(`${DATA}\najustement: z = exp(y)`)).toEqual([
			'Ligne 3 : ajustement : écrire « affine » ou une des formes z = ln(y), z = y², z = √y, z = 1/y, t = ln(x), t = x², t = √x, t = 1/x'
		]);
		// La variable ne correspond pas : z change y, t change x
		expect(errorsOf(`${DATA}\najustement: z = ln(x)`)[0]).toMatch(/^Ligne 3 : ajustement : écrire/);
	});

	it('valeur interdite, avec le point', () => {
		expect(errorsOf('x: 1 ; 2 ; 3\ny: 1 ; 4 ; −2\najustement: z = ln(y)')).toEqual([
			'Ligne 2 : ln(y) : y = −2 au point 3 n’est pas strictement positif'
		]);
		expect(errorsOf('x: 0 ; 2 ; 3\ny: 1 ; 4 ; 2\najustement: t = ln(x)')).toEqual([
			'Ligne 1 : ln(x) : x = 0 au point 1 n’est pas strictement positif'
		]);
		expect(errorsOf('x: 1 ; 2 ; 3\ny: 1 ; -0,5 ; 2\najustement: z = √y')).toEqual([
			'Ligne 2 : √y : y = -0,5 au point 2 est négatif'
		]);
		expect(errorsOf('x: 1 ; 0 ; 3\ny: 1 ; 4 ; 2\najustement: t = 1/x')).toEqual([
			'Ligne 1 : 1/x : x = 0 au point 2 est nul'
		]);
		expect(errorsOf('x: -1 ; 2 ; 3\ny: 1 ; 4 ; 2\najustement: t = x²')).toEqual([
			'Ligne 1 : x² : x change de signe au point 2 (une seule branche de √ possible)'
		]);
	});

	it('t constant : toutes les valeurs de t égales', () => {
		expect(errorsOf('x: -2 ; -2 ; -2\ny: 1 ; 4 ; 2\najustement: t = x²')[0]).toMatch(
			/abscisses sont égales/
		);
		expect(errorsOf('x: 1 ; 1 ; 1\ny: 1 ; 4 ; 2\najustement: t = x²')[0]).toMatch(/égales/);
	});

	it('nuage: z sans changement, ou avec la mauvaise variable', () => {
		expect(errorsOf(`${DATA}\najustement: affine\nnuage: z`)).toEqual([
			'Ligne 4 : nuage : seulement avec un changement de variable (ajustement: z = … ou t = …)'
		]);
		expect(errorsOf(`${DATA}\najustement: z = ln(y)\nnuage: t`)).toEqual([
			'Ligne 4 : nuage : écrire « nuage: z » (la variable de l’ajustement)'
		]);
	});
});

// =============================================================================
// Scène
// =============================================================================

describe('changement de variable — valeurs de référence', () => {
	it('français : droite en z, relation retrouvée, G et r du nuage transformé, prévisions', () => {
		expect(sceneOf(REF).indicators).toEqual([
			'Droite des moindres carrés : z = 0,401x + 0,723',
			'Relation entre x et y : y = e^(0,723) × e^(0,401x) ≈ 2,061 × e^(0,401x)',
			'Point moyen : G(2,5 ; 1,726)',
			'Coefficient de corrélation : r ≈ 1,000',
			'Pour x = 7 : y ≈ 34,152 (extrapolation)',
			'Pour y = 50 : x ≈ 7,950 (extrapolation)'
		]);
	});

	it('anglais', () => {
		expect(sceneOf(REF, 'en').indicators).toEqual([
			'Least squares line: z = 0.401x + 0.723',
			'Relation between x and y: y = e^(0.723) × e^(0.401x) ≈ 2.061 × e^(0.401x)',
			'Mean point: G(2.5, 1.726)',
			'Correlation coefficient: r ≈ 1.000',
			'For x = 7: y ≈ 34.152 (extrapolation)',
			'For y = 50: x ≈ 7.950 (extrapolation)'
		]);
	});

	it('vrais exposants : découpage texte / exposant, lecture « puissance »', () => {
		const scene = sceneOf(REF);
		expect(scene.indicatorParts).toHaveLength(scene.indicators.length);
		const relation = scene.indicatorParts![1];
		expect(relation.segments.filter((s) => s.exponent).map((s) => s.text)).toEqual([
			'0,723',
			'0,401x',
			'0,401x'
		]);
		expect(relation.spoken).toContain('puissance 0,723');
		expect(scene.indicatorParts![0].segments).toEqual([
			{ text: 'Droite des moindres carrés : z = 0,401x + 0,723', exponent: false }
		]);
	});

	it('formes naturelles des sept autres relations', () => {
		const line = (written: string, ys = '1 ; 2 ; 4') =>
			sceneOf(`x: 1 ; 2 ; 3\ny: ${ys}\najustement: ${written}`).indicators[1];
		expect(line('z = √y')).toMatch(/^Relation entre x et y : y = \(.+x [+−] .+\)²$/);
		expect(line('z = y²')).toMatch(/^Relation entre x et y : y = √\(.+x [+−] .+\)$/);
		expect(line('z = y²', '−1 ; −2 ; −4')).toMatch(/^Relation entre x et y : y = −√\(/);
		expect(line('z = 1/y')).toMatch(/^Relation entre x et y : y = 1\/\(.+x [+−] .+\)$/);
		expect(line('t = ln(x)')).toMatch(/^Relation entre x et y : y = .+ ln\(x\) [+−] .+$/);
		expect(line('t = x²')).toMatch(/^Relation entre x et y : y = .+x² [+−] .+$/);
		expect(line('t = √x')).toMatch(/^Relation entre x et y : y = .+√x [+−] .+$/);
		expect(line('t = 1/x', '4 ; 2 ; 1')).toMatch(/^Relation entre x et y : y = .+\/x [+−] .+$/);
		expect(sceneOf('x: 1 ; 2 ; 3\ny: 1 ; 2 ; 4\najustement: t = x²').indicators[0]).toMatch(
			/^Droite des moindres carrés : y = .+t [+−] .+$/
		);
	});

	it('courbe : ≈ 60 points dans le cadre, la relation, pas de droite', () => {
		const scene = sceneOf(REF);
		expect(scene.line).toBeNull();
		const points = scene.curve!.flat();
		expect(points.length).toBeGreaterThanOrEqual(40);
		for (const p of points) {
			expect(p.x).toBeGreaterThanOrEqual(scene.xMin - 1e-9);
			expect(p.x).toBeLessThanOrEqual(scene.xMax + 1e-9);
			expect(p.y).toBeGreaterThanOrEqual(scene.yMin - 1e-9);
			expect(p.y).toBeLessThanOrEqual(scene.yMax + 1e-9);
		}
		// Sur la relation retrouvée, pleine précision
		const inside = points.find((p) => p.x > 1 && p.x < 2)!;
		expect(inside.y).toBeCloseTo(Math.exp(0.7230321754324351 + 0.4011126350407298 * inside.x), 6);
		// Les pointillés partent de la courbe
		expect(scene.predictions[0]).toEqual({ x: 7, y: expect.closeTo(34.1519819425406, 6) });
		expect(scene.predictions[1].y).toBe(50);
		// G n'est pas placé sur le nuage d'origine (il est celui de (x ; z))
		expect(scene.mean).toBeNull();
	});

	it('1/x : la courbe est coupée au pôle, jamais tracée en x = 0', () => {
		const scene = sceneOf(
			'x: 0,5 ; 1 ; 2 ; 4\ny: 9 ; 5 ; 3 ; 2\najustement: t = 1/x\norigine: oui'
		);
		expect(scene.xMin).toBe(0);
		for (const segment of scene.curve!) {
			for (const p of segment) expect(p.x).toBeGreaterThan(0);
		}
		// Une branche qui part à l'infini n'écrase pas le nuage : cadre borné
		expect(scene.yMax).toBeLessThan(20);
	});

	it('ln(x) : rien pour x ⩽ 0', () => {
		const scene = sceneOf(
			'x: 1 ; 2 ; 4 ; 8\ny: 1 ; 1,7 ; 2,4 ; 3,1\najustement: t = ln(x)\norigine: oui'
		);
		for (const p of scene.curve!.flat()) expect(p.x).toBeGreaterThan(0);
		expect(scene.curve!.flat().length).toBeGreaterThan(30);
	});

	it('prévisions hors de l’image : aucune solution ; hors du domaine : non définie', () => {
		const scene = sceneOf(`${DATA}\najustement: z = ln(y)\nprévoir: y = −3`);
		expect(scene.indicators[2]).toBe('Pour y = −3 : aucune solution');
		const ln = sceneOf('x: 1 ; 2 ; 4\ny: 1 ; 2 ; 3\najustement: t = ln(x)\nprévoir: x = -1');
		expect(ln.indicators[2]).toBe('Pour x = −1 : relation non définie');
		expect(ln.predictions).toEqual([]);
	});

	it('nuage: z : le nuage (x ; z), la droite z = ax + b, G placé', () => {
		const scene = sceneOf(`${REF}\nnuage: z`);
		expect(scene.points[0].y).toBeCloseTo(Math.log(2.1), 12);
		expect(scene.line).not.toBeNull();
		expect(scene.curve).toBeNull();
		expect(scene.mean!.y).toBeCloseTo(1.7258137630342596, 9);
		expect(scene.axisTitles.y).toBe('z = ln(y)');
		// La prévision suit, dans le repère (x ; z)
		expect(scene.predictions[0].y).toBeCloseTo(Math.log(34.1519819425406), 6);
	});

	it('description : le changement de variable et la relation', () => {
		const description = sceneOf(REF).description;
		expect(description).toContain('6 points');
		expect(description).toContain('z = ln(y)');
		expect(description).toContain('puissance');
	});
});

// =============================================================================
// Typst
// =============================================================================

describe('changement de variable → Typst', () => {
	it('la courbe (un tracé par morceau), vrais exposants', () => {
		const typst = generateStatChartTypst(parseStatChartContent('nuage', REF));
		expect(count(typst, '// courbe')).toBe(1);
		expect(typst).not.toContain('// droite');
		expect(count(typst, '// prévision')).toBe(2);
		expect(typst).toContain('#super[#"0,723"]');
		expect(typst).not.toContain('e^(');
		expect(typst).not.toMatch(/NaN|Infinity/);
	});

	it('1/x : deux morceaux au plus, jamais NaN', () => {
		const typst = generateStatChartTypst(
			parseStatChartContent('nuage', 'x: -2 ; -1 ; 1 ; 2\ny: -1 ; -3 ; 3 ; 1\najustement: t = 1/x')
		);
		expect(count(typst, '// courbe')).toBeGreaterThanOrEqual(1);
		expect(typst).not.toMatch(/NaN|Infinity/);
	});
});
