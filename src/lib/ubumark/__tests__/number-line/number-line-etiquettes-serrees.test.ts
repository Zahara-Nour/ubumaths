/**
 * Droite graduée : nombres écrits trop serrés pour la largeur (téléphone, écarts E63 et E82)
 *
 * À l'écran, une étiquette sur deux quand deux nombres voisins se toucheraient ; tous les traits
 * gardés. Le PDF (`computeGraduations` seul) n'est pas touché.
 */
import { describe, it, expect } from 'vitest';
import { parseNumberLineContent } from '#lib/ubumark/parser/number-line-parser.ts';
import {
	computeGraduations,
	estimateLabelWidth,
	labelStride,
	thinLabels
} from '#lib/ubumark/utils/number-line-render.ts';

function config(...lines: string[]) {
	const { node, errors } = parseNumberLineContent(lines);
	if (!node) throw new Error(errors.map((e) => e.message).join(' ; '));
	return node.config;
}

/** Les nombres écrits d'une droite dessinée sur `width` px, étiquettes éclaircies */
function written(width: number, ...lines: string[]): string[] {
	return thinLabels(computeGraduations(config(...lines), width)).flatMap((g) =>
		g.label === null ? [] : [g.label]
	);
}

describe('Droite graduée — largeur estimée d’une étiquette', () => {
	it('les deux largeurs mesurées à l’écran : un chiffre 8 px, « -6 » 20,5 px', () => {
		expect(estimateLabelWidth('7')).toBe(8);
		expect(estimateLabelWidth('-6')).toBe(20.5);
		expect(estimateLabelWidth('12')).toBe(16);
	});

	it('décimal, espace fine, fraction', () => {
		expect(estimateLabelWidth('0.5')).toBe(20.5);
		expect(estimateLabelWidth('3\\,000')).toBeCloseTo(34.7);
		// le plus large du numérateur et du dénominateur
		expect(estimateLabelWidth('\\frac{23}{10}')).toBe(19);
		expect(estimateLabelWidth('-\\frac{1}{2}')).toBe(23.5);
	});
});

describe('Droite graduée — une étiquette sur deux quand elles se toucheraient', () => {
	const E82 = ['start: -6', 'end: 6', 'step: 1'];
	const E63 = ['start: -8', 'end: 8', 'step: 1'];

	it('E82 : de −6 à 6 sur un téléphone (308 px, écart de 19 px) → un nombre sur deux, le zéro et les bouts gardés', () => {
		expect(written(308, ...E82)).toEqual(['-6', '-4', '-2', '0', '2', '4', '6']);
	});

	it('E63 : de −8 à 8 sur un téléphone → un nombre sur deux, le zéro et les bouts gardés', () => {
		expect(written(310, ...E63)).toEqual(['-8', '-6', '-4', '-2', '0', '2', '4', '6', '8']);
	});

	it('tous les traits restent', () => {
		const graduations = computeGraduations(config(...E82), 308);
		const thinned = thinLabels(graduations);
		expect(thinned).toHaveLength(13);
		expect(thinned.map((g) => g.x)).toEqual(graduations.map((g) => g.x));
	});

	it('assez de place (600 px) : toutes les étiquettes, mêmes objets', () => {
		const graduations = computeGraduations(config(...E63), 600);
		expect(thinLabels(graduations)).toBe(graduations);
		expect(written(600, ...E82)).toHaveLength(13);
	});

	it('de 0 à 10 sur un téléphone (écart de 24 px, un chiffre) : rien ne change', () => {
		expect(written(320, 'start: 0', 'end: 10', 'step: 1')).toHaveLength(11);
	});

	it('très serré : une sur cinq, à partir du zéro', () => {
		// 240 px de ligne, 30 écarts de 8 px ; « -15 » fait 28,5 px + 4 d'air → une sur cinq
		const labels = written(320, 'start: -15', 'end: 15', 'step: 1');
		expect(labels).toContain('0');
		expect(labels).toEqual(['-15', '-10', '-5', '0', '5', '10', '15']);
	});

	it('sans zéro écrit : à partir de la première étiquette', () => {
		expect(written(200, 'start: 10', 'end: 20', 'step: 1')).toEqual([
			'10',
			'12',
			'14',
			'16',
			'18',
			'20'
		]);
	});

	it('étiquettes choisies par l’auteur, écartées : toutes gardées', () => {
		expect(written(308, 'start: -6', 'end: 6', 'step: 1', 'labels: -6, 0, 6')).toEqual([
			'-6',
			'0',
			'6'
		]);
	});

	it('intervalle impair : le zéro gardé, le dernier nombre n’est plus écrit', () => {
		expect(written(180, 'start: 0', 'end: 9', 'step: 1')).toEqual(['0', '2', '4', '6', '8']);
	});

	it('un « ? » hors du rythme reste, les nombres qui le toucheraient sont retirés', () => {
		// écart de 19 px : « -6 » (20,5 px) toucherait le « ? » de −5
		expect(written(308, 'start: -6', 'end: 6', 'step: 1', 'hidden: -5')).toEqual([
			'?',
			'-2',
			'0',
			'2',
			'4',
			'6'
		]);
	});

	it('un « ? » dans le rythme : rien d’autre ne change', () => {
		expect(written(308, 'start: -6', 'end: 6', 'step: 1', 'hidden: 2')).toEqual([
			'-6',
			'-4',
			'-2',
			'0',
			'?',
			'4',
			'6'
		]);
	});

	it('une seule étiquette, ou aucune : rien à éclaircir', () => {
		expect(labelStride([])).toBe(1);
		expect(written(200, 'start: 0', 'end: 10', 'step: 1', 'labels: 5')).toEqual(['5']);
	});
});
