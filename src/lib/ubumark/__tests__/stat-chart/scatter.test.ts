/**
 * Bloc ```nuage (manche 15, PR a, Q166-Q172) : nuage de points, point moyen,
 * droite des moindres carrés, r, prévisions.
 *
 * Valeurs de référence calculées en Python (fractions) :
 * `docs/wip/bloc-nuage-progress.md`.
 */

import { describe, it, expect } from 'vitest';
import {
	findStatChartBlocks,
	parseStatChartContent,
	isStatChartBlockStart
} from '../../parser/stat-chart-parser';
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
// Graduations et milliers (fiche compilée, 2026-10-04)
// =============================================================================

/** Largeur estimée d'une étiquette de graduation (écran 11 px, PDF 6,5 pt) */
const CHAR_PX = 6.5;

/** Deux étiquettes x voisines ne se chevauchent pas (avec un peu d'air) */
function expectNoOverlap(scene: ScatterScene) {
	const perUnit = scene.pixelSize.width / (scene.xMax - scene.xMin);
	for (let i = 1; i < scene.xTicks.length; i++) {
		const [a, b] = [scene.xTicks[i - 1], scene.xTicks[i]];
		const room = (b.value - a.value) * perUnit;
		const needed = ((a.label.length + b.label.length) / 2) * CHAR_PX + 4;
		expect(room, `${a.label} / ${b.label}`).toBeGreaterThanOrEqual(needed);
	}
}

const YEARS =
	'x: 2015 ; 2016 ; 2017 ; 2018 ; 2019 ; 2020\ny: 12000 ; 11800 ; 11350 ; 11100 ; 10900 ; 10500\najustement: affine\nindicateurs: point moyen ; r\nprévoir: x = 2025 ; y = 10000';

describe('```nuage — graduations lisibles', () => {
	it('des années : pas de 1, étiquettes entières, sans chevauchement', () => {
		// Le nuage de la fiche, sans prévision : gradué tous les 0,5 avant le correctif
		const scene = sceneOf(YEARS.replace(/\nprévoir:.*$/, ''));
		expect(scene.xTicks.map((t) => t.label)).toContain('2016');
		for (const tick of scene.xTicks) expect(tick.label).toMatch(/^\d{4}$/);
		expectNoOverlap(scene);
	});

	it('petites valeurs décimales : pas assez large pour ne pas serrer', () => {
		const scene = sceneOf('x: 0,5 ; 1,2 ; 2 ; 3,1\ny: -2 ; 1,5 ; 3 ; 7\norigine: oui');
		expectNoOverlap(scene);
		const step = scene.xTicks[1].value - scene.xTicks[0].value;
		expect(step).toBeGreaterThanOrEqual(0.5);
	});

	it('toutes tailles, grandes valeurs : jamais de chevauchement', () => {
		for (const size of ['petite', 'moyenne', 'grande']) {
			expectNoOverlap(sceneOf(`taille: ${size}\n${YEARS}`));
			expectNoOverlap(sceneOf(`taille: ${size}\nx: 10000 ; 25000 ; 41000\ny: 1 ; 2 ; 4`));
			expectNoOverlap(sceneOf(`taille: ${size}\nx: 0,01 ; 0,02 ; 0,07\ny: 1 ; 2 ; 4`));
		}
	});

	it('axe y : graduations espacées d’au moins une hauteur de texte', () => {
		const scene = sceneOf(YEARS);
		const perUnit = scene.pixelSize.height / (scene.yMax - scene.yMin);
		expect((scene.ticks[1].value - scene.ticks[0].value) * perUnit).toBeGreaterThanOrEqual(20);
	});
});

describe('```nuage — séparateur de milliers (à partir de 10 000)', () => {
	it('français : espace insécable ; les années (4 chiffres) jamais groupées', () => {
		const scene = sceneOf(YEARS);
		expect(scene.indicators).toEqual([
			'Droite des moindres carrés : y = −298,571x + 613\u00a0642,857',
			'Point moyen : G(2017,5 ; 11\u00a0275)',
			'Coefficient de corrélation : r ≈ −0,994',
			'Pour x = 2025 : y ≈ 9035,714 (extrapolation)',
			'Pour y = 10\u00a0000 : x ≈ 2021,770 (extrapolation)'
		]);
		const big = scene.ticks.filter((t) => t.value >= 10000);
		expect(big.length).toBeGreaterThan(0);
		for (const tick of big) expect(tick.label).toMatch(/^\d{2}\u00a0\d{3}$/);
		expect(scene.description).toContain('613\u00a0642,857');
		expect(scene.description).toContain('G(2017,5 ; 11\u00a0275)');
	});

	it('anglais : virgule', () => {
		const scene = sceneOf(YEARS, 'en');
		expect(scene.indicators[0]).toBe('Least squares line: y = −298.571x + 613,642.857');
		expect(scene.indicators[1]).toBe('Mean point: G(2017.5, 11,275)');
		expect(scene.indicators[4]).toBe('For y = 10,000: x ≈ 2021.770 (extrapolation)');
		expect(scene.ticks.find((t) => t.value >= 10000)!.label).toMatch(/^\d{2},\d{3}$/);
	});

	it('Typst : les étiquettes groupées arrivent telles quelles', () => {
		const typst = generateStatChartTypst(parseStatChartContent('nuage', YEARS));
		expect(typst).toMatch(/\[1\d\u00a0\d{3}\]/);
		expect(typst).toContain('[2016]');
	});
});

// =============================================================================
// Typst
// =============================================================================

describe('```nuage — revue', () => {
	it('abscisses à 15 chiffres : les graduations se calculent vite (plus de boucle sans fin)', () => {
		const start = performance.now();
		const scene = sceneOf('x: 999999999999990 ; 999999999999999\ny: 1 ; 2');
		expect(performance.now() - start).toBeLessThan(500);
		expect(scene.xTicks.length).toBeGreaterThan(1);
		expect(scene.xTicks.length).toBeLessThanOrEqual(200);
		for (const tick of scene.xTicks) expect(Number.isFinite(tick.value)).toBe(true);
	});

	it('nombres refusés avec leur raison', () => {
		expect(errorsOf('x: 1 ; 0x1A\ny: 1 ; 2')).toEqual(['Ligne 1 : « 0x1A » n’est pas un nombre']);
		expect(errorsOf('x: 1 ; 1e3\ny: 1 ; 2')).toEqual(['Ligne 1 : « 1e3 » n’est pas un nombre']);
		expect(errorsOf('x: 1 ; 2\ny: 1 ; 1234567890123456')).toEqual([
			'Ligne 2 : « 1234567890123456 » : au plus 15 chiffres'
		]);
		expect(errorsOf('x: 1 ; 1/1001\ny: 1 ; 2')).toEqual([
			'Ligne 1 : « 1/1001 » : dénominateur au plus 1000'
		]);
		expect(errorsOf(`${DATA}\najustement: affine\nprévoir: x = 0x1A`)[0]).toBe(
			'Ligne 4 : prévoir : « 0x1A » n’est pas un nombre'
		);
	});

	it('100 points en fractions : aucune coordonnée NaN', () => {
		const xs = Array.from({ length: 100 }, (_, i) => `${i + 1}/${1000 - 2 * i}`).join(' ; ');
		const ys = Array.from({ length: 100 }, (_, i) => `${7 * i + 3}/${999 - 2 * i}`).join(' ; ');
		const start = performance.now();
		const scene = sceneOf(
			`x: ${xs}\ny: ${ys}\najustement: affine\nindicateurs: point moyen ; r\nprévoir: x = 1 ; y = 1`
		);
		expect(performance.now() - start).toBeLessThan(500);
		const coordinates = [
			...scene.points,
			...scene.line!,
			scene.mean!,
			...scene.predictions
		].flatMap((p) => [p.x, p.y]);
		for (const value of [...coordinates, scene.xMin, scene.xMax, scene.yMin, scene.yMax]) {
			expect(Number.isFinite(value)).toBe(true);
		}
		expect(
			generateStatChartTypst(parseStatChartContent('nuage', `x: ${xs}\ny: ${ys}`))
		).not.toMatch(/NaN|Infinity/);
	});

	it('pente nulle et y = b : « tout x convient »', () => {
		expect(
			sceneOf('x: 1 ; 2 ; 3\ny: 5 ; 5 ; 5\najustement: affine\nprévoir: y = 5').indicators
		).toEqual(['Droite des moindres carrés : y = 5', 'Pour y = 5 : tout x convient (pente nulle)']);
	});

	it('équation sans ajustement : refusée', () => {
		expect(errorsOf(`${DATA}\nindicateurs: point moyen ; équation`)).toEqual([
			'Ligne 3 : équation : demander « ajustement: affine »'
		]);
	});

	it('au plus 20 prévisions', () => {
		const many = Array.from({ length: 21 }, (_, i) => `x = ${i}`).join(' ; ');
		expect(errorsOf(`${DATA}\najustement: affine\nprévoir: ${many}`)).toEqual([
			'Ligne 4 : prévoir : au plus 20 prévisions'
		]);
	});

	it('options du nuage dans un ```barres : message propre, situé', () => {
		for (const [line, key] of [
			['prévoir: x = 2', 'prévoir'],
			['ajustement: affine', 'ajustement'],
			['origine: oui', 'origine']
		]) {
			const node = parseStatChartContent('barres', `A = 3\n${line}`);
			expect(node.spec).toBeNull();
			expect(node.errors.map((e) => e.message)).toEqual([
				`Ligne 2 : l'option « ${key} » ne s'applique pas aux diagrammes en barres (réservée aux nuages de points)`
			]);
		}
	});

	it('un ```barres non fermé n’avale pas une ligne « x: … » de texte', () => {
		const lines = ['```barres', 'A = 3', 'x: une remarque du texte'];
		expect(findStatChartBlocks(lines)).toEqual([
			{ kind: 'barres', startIndex: 0, endIndex: 1, closed: false }
		]);
		const scatter = ['```nuage', 'x: 1 ; 2', 'y: 3 ; 4', 'origine: oui'];
		expect(findStatChartBlocks(scatter)[0].endIndex).toBe(3);
	});

	it('Typst : « G » à gauche du point moyen, comme à l’écran', () => {
		const typst = generateStatChartTypst(parseStatChartContent('nuage', FULL));
		const disk = /circle\(\(([\d.]+), ([\d.]+)\), radius: 0\.06/.exec(typst)!;
		const label = /content\(\(([\d.]+), ([\d.]+)\), anchor: "south-east"[^\n]*\[G\]/.exec(typst)!;
		expect(Number(label[1])).toBeCloseTo(Number(disk[1]) - 0.08, 3);
	});
});

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
