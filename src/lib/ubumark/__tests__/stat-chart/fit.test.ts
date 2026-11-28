/**
 * Barres et boîtes à moustaches mises à la largeur disponible (écart E46)
 * =======================================================================
 *
 * Choix B de David (2026-11-24) : quand la place manque, le dessin n'est plus
 * rétréci (texte de 7-8 px au téléphone), il est RECALCULÉ à la largeur
 * disponible et son texte garde sa taille. Sous 300 px, il garde 300 px et
 * défile dans son cadre.
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import {
	buildStatChartScene,
	type BarScene,
	type BoxPlotScene
} from '../../utils/stat-chart-scene';
import {
	fitBarScene,
	fitBoxPlotScene,
	STAT_SVG_MIN_WIDTH,
	tickLabelStride
} from '../../utils/stat-chart-fit';
import type { StatChartKind } from '../../types/stat-chart';

function specOf(kind: StatChartKind, source: string) {
	const node = parseStatChartContent(kind, source);
	if (node.spec === null) throw new Error(`erreurs inattendues : ${JSON.stringify(node.errors)}`);
	return node.spec;
}

function bars(source: string, available: number | undefined) {
	const spec = specOf('barres', source);
	const build = (plotWidth?: number) => buildStatChartScene(spec, { plotWidth }) as BarScene;
	return { natural: build(), fit: fitBarScene(build(), available, build) };
}

function boxes(source: string, available: number | undefined) {
	const spec = specOf('boite-a-moustaches', source);
	const build = (plotWidth?: number) => buildStatChartScene(spec, { plotWidth }) as BoxPlotScene;
	return { natural: build(), fit: fitBoxPlotScene(build(), available, build) };
}

const BARS = 'Lundi = 4\nMardi = 7\nMercredi = 2\nJeudi = 5';
const BOXES = 'axe: 0 à 20, de 1 en 1\nClasse A = 4 ; 8 ; 11 ; 14 ; 19\nvaleurs: oui';

describe('barres : dessin à la largeur disponible', () => {
	it('largeur pas encore mesurée : le dessin de `taille:`', () => {
		const { natural, fit } = bars(BARS, undefined);
		expect(fit.plotWidth).toBe(natural.pixelSize.width);
		expect(fit.viewWidth).toBe(fit.padLeft + natural.pixelSize.width + fit.padRight);
	});

	it('place suffisante : rien ne change, le dessin ne s’élargit pas', () => {
		const wide = bars(BARS, 900).fit;
		const unmeasured = bars(BARS, undefined).fit;
		expect(wide.viewWidth).toBe(unmeasured.viewWidth);
		expect(wide.plotWidth).toBe(unmeasured.plotWidth);
	});

	it('téléphone (340 px) : le dessin fait exactement la largeur disponible', () => {
		const { fit } = bars(BARS, 340);
		expect(fit.viewWidth).toBe(340);
		expect(fit.padLeft + fit.plotWidth + fit.padRight).toBeCloseTo(340, 6);
	});

	it('place fractionnaire : arrondie en dessous, jamais plus large que la place', () => {
		expect(bars(BARS, 340.7).fit.viewWidth).toBe(340);
	});

	it('la hauteur du cadre reste celle de `taille:`', () => {
		const { natural, fit } = bars(BARS, 340);
		expect(fit.plotHeight).toBe(natural.pixelSize.height);
	});

	it('sous 300 px : le dessin garde 300 px (il défile dans son cadre)', () => {
		expect(bars(BARS, 250).fit.viewWidth).toBe(STAT_SVG_MIN_WIDTH);
	});

	it('noms trop longs pour les colonnes resserrées : inclinés, et la marge gauche les contient', () => {
		const source = 'Football = 4\nNatation = 7\nHandball = 2\nEscalade = 5\nAthlétisme = 3';
		const { natural, fit } = bars(source, 320);
		expect(natural.rotateLabels).toBe(false);
		expect(fit.scene.rotateLabels).toBe(true);
		expect(fit.viewWidth).toBe(320);
		// Un nom incliné part du milieu de la première colonne vers la gauche
		const halfBand = fit.plotWidth / fit.scene.labels.length / 2;
		expect(fit.padLeft + halfBand).toBeGreaterThanOrEqual(fit.rotatedExtent);
		expect(fit.padBottom).toBeGreaterThan(bars(source, undefined).fit.padBottom);
	});
});

describe('barres : jamais resserrées au point que les textes se touchent', () => {
	const MANY = Array.from({ length: 21 }, (_, k) => `${k} = ${k + 1}`).join('\n');

	it('21 colonnes : 18 px par colonne au moins, le dessin dépasse la place et défile', () => {
		const { fit } = bars(MANY, 320);
		expect(fit.viewWidth).toBeGreaterThan(320);
		expect(fit.plotWidth / 21).toBeGreaterThanOrEqual(18);
	});

	it('nom démesuré sur une seule colonne : le cadre garde une largeur positive', () => {
		const { fit } = bars(`${'x'.repeat(40)} = 4`, 300);
		expect(fit.plotWidth).toBeGreaterThanOrEqual(18);
	});

	it('scène donnée sans sa spec (loi) : noms à plat gardés entiers, côte à côte', () => {
		const spec = specOf('barres', 'Football = 4\nNatation = 7\nHandball = 2\nEscalade = 5');
		const natural = buildStatChartScene(spec) as BarScene;
		const fit = fitBarScene(natural, 300);
		expect(fit.scene).toBe(natural);
		expect(fit.plotWidth / 4).toBeGreaterThanOrEqual(8 * 7.1);
	});

	it('valeurs écrites au-dessus des barres : la colonne garde la place de la plus longue', () => {
		const source = 'A = 1250\nB = 3400\nC = 2100\nD = 1800\nE = 2600\nF = 900\nvaleurs: oui';
		const { fit } = bars(source, 300);
		const longest = Math.max(...fit.scene.bars.map((b) => b.valueLabel.length));
		expect(fit.plotWidth / 6).toBeGreaterThanOrEqual(longest * 7.4);
	});
});

describe('boîtes à moustaches : dessin à la largeur disponible', () => {
	it('largeur pas encore mesurée, ou place suffisante : le dessin de `taille:`', () => {
		const { natural, fit } = boxes(BOXES, undefined);
		expect(fit.plotWidth).toBe(natural.pixelSize.width);
		expect(boxes(BOXES, 900).fit.viewWidth).toBe(fit.viewWidth);
	});

	it('téléphone (340 px) : largeur disponible, scène recalculée pour ce cadre', () => {
		const { fit } = boxes(BOXES, 340);
		expect(fit.viewWidth).toBe(340);
		expect(fit.padLeft + fit.plotWidth + fit.padRight).toBeCloseTo(340, 6);
		expect(fit.scene.pixelSize.width).toBeCloseTo(fit.plotWidth, 6);
	});

	it('sous 300 px : le dessin garde 300 px', () => {
		expect(boxes(BOXES, 200).fit.viewWidth).toBe(STAT_SVG_MIN_WIDTH);
	});

	it('valeurs proches : écrites sur une rangée de plus quand le cadre se resserre', () => {
		const source = 'axe: 0 à 100, de 10 en 10\nA = 10 ; 30 ; 36 ; 60 ; 90\nvaleurs: oui';
		const { natural, fit } = boxes(source, 300);
		expect(Math.max(...natural.boxes[0].valueRows)).toBe(0);
		expect(Math.max(...fit.scene.boxes[0].valueRows)).toBe(1);
	});

	it('axe écrit serré (0 à 20, de 1 en 1) : une graduation étiquetée sur deux au téléphone', () => {
		expect(boxes(BOXES, undefined).fit.labelStride).toBe(1);
		expect(boxes(BOXES, 340).fit.labelStride).toBe(2);
	});
});

describe('tickLabelStride', () => {
	const ticks = (labels: string[]) => labels.map((label, value) => ({ value, label }));

	it('la place suffit : toutes les étiquettes', () => {
		expect(tickLabelStride(ticks(['0', '5', '10', '15']), 300)).toBe(1);
	});

	it('étiquettes longues et serrées : une sur deux', () => {
		// 11 graduations sur 200 px : 20 px d'écart ; « 1 000 » demande 5 × 7 + 4 = 39 px
		const labels = Array.from({ length: 11 }, () => '1 000');
		expect(tickLabelStride(ticks(labels), 200)).toBe(2);
	});

	it('une seule graduation : 1', () => {
		expect(tickLabelStride(ticks(['0']), 200)).toBe(1);
	});
});
