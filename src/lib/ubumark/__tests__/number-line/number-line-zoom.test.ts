/**
 * Droite graduée avec zoom (outil n° 54, chantier `docs/wip/droite-zoom-progress.md`)
 *
 * `zoom: 12.4 ; 12.5 ; step 0.01` : une droite agrandie sous la précédente, reliée par deux
 * traits pointillés au morceau qu'elle agrandit. Jusqu'à 4 zooms à la suite. Un point se
 * dessine sur toutes les droites où il tombe. Un zoom sans `labels` n'a aucune étiquette.
 */
import { describe, it, expect } from 'vitest';
import { parseNumberLineContent } from '#lib/ubumark/parser/number-line-parser.ts';
import { computeGraduations, numVal } from '#lib/ubumark/utils/number-line-render.ts';
import { generateNumberLineTypst } from '#lib/ubumark/generators/number-line-typst.ts';

const MAIN = ['start: 12', 'end: 13', 'step: 0.1', 'labels: 12, 13'];

function parse(...extra: string[]) {
	return parseNumberLineContent([...MAIN, ...extra]);
}

function nodeOf(...extra: string[]) {
	const { node, errors } = parse(...extra);
	if (!node) throw new Error(errors.map((e) => e.message).join(' ; '));
	return node;
}

function errorsOf(...extra: string[]): string {
	const { node, errors } = parse(...extra);
	expect(node).toBeNull();
	return errors.map((e) => e.message).join(' ; ');
}

describe('Droite avec zoom — lecture de zoom:', () => {
	it('un zoom : début, fin, pas', () => {
		const node = nodeOf('zoom: 12.4 ; 12.5 ; step 0.01');
		expect(node.zooms).toHaveLength(1);
		const [zoom] = node.zooms!;
		expect(numVal(zoom.start)).toBe(12.4);
		expect(numVal(zoom.end)).toBe(12.5);
		expect(numVal(zoom.step)).toBe(0.01);
		expect(zoom.major).toBe(1);
		expect(zoom.labels).toEqual([]);
		expect(zoom.arrows).toBe(false);
	});

	it('major et labels', () => {
		const node = nodeOf('zoom: 12.4 ; 12.5 ; step 0.001 ; major 10 ; labels 12.4, 12.5');
		const [zoom] = node.zooms!;
		expect(zoom.major).toBe(10);
		expect(zoom.labels.map((l) => l.expression)).toEqual(['12.4', '12.5']);
	});

	it('zooms à la suite, chacun dans le précédent', () => {
		const node = nodeOf('zoom: 12.4 ; 12.5 ; step 0.01', 'zoom: 12.47 ; 12.48 ; step 0.001');
		expect(node.zooms!.map((z) => numVal(z.start))).toEqual([12.4, 12.47]);
	});

	it('un zoom de plusieurs graduations', () => {
		const node = nodeOf('zoom: 12.2 ; 12.5 ; step 0.01');
		expect(numVal(node.zooms![0].end)).toBe(12.5);
	});

	it('grands nombres (6N1H-4)', () => {
		const { node, errors } = parseNumberLineContent([
			'start: 40000',
			'end: 50000',
			'step: 1000',
			'labels: 40000, 50000',
			'points: A=46000, C=47000, P=46370',
			'zoom: 46000 ; 47000 ; step 100',
			'zoom: 46300 ; 46400 ; step 10'
		]);
		expect(errors).toEqual([]);
		expect(node!.zooms).toHaveLength(2);
	});

	it('4 zooms au plus', () => {
		const zooms = [
			'zoom: 12.4 ; 12.5 ; step 0.01',
			'zoom: 12.47 ; 12.48 ; step 0.001',
			'zoom: 12.473 ; 12.474 ; step 0.0001',
			'zoom: 12.4735 ; 12.4736 ; step 0.00001'
		];
		expect(nodeOf(...zooms).zooms).toHaveLength(4);
		expect(errorsOf(...zooms, 'zoom: 12.47353 ; 12.47354 ; step 0.000001')).toContain(
			'4 zooms au plus'
		);
	});

	it('sans zoom : pas de champ zooms (droites existantes inchangées)', () => {
		expect(nodeOf().zooms).toBeUndefined();
	});
});

describe('Droite avec zoom — erreurs', () => {
	it('bout hors de la droite du dessus', () => {
		expect(errorsOf('zoom: 12.8 ; 13.1 ; step 0.01')).toContain('hors de la droite du dessus');
	});

	it('bout entre deux graduations de la droite du dessus', () => {
		expect(errorsOf('zoom: 12.45 ; 12.5 ; step 0.01')).toContain(
			'n’est pas sur une graduation de la droite du dessus'
		);
	});

	it('vérifié contre le zoom précédent, pas la droite principale', () => {
		expect(errorsOf('zoom: 12.4 ; 12.5 ; step 0.01', 'zoom: 12.3 ; 12.4 ; step 0.001')).toContain(
			'hors de la droite du dessus'
		);
	});

	it('début plus grand que la fin', () => {
		expect(errorsOf('zoom: 12.5 ; 12.4 ; step 0.01')).toContain('début');
	});

	it('pas manquant', () => {
		expect(errorsOf('zoom: 12.4 ; 12.5')).toContain('step');
	});

	it('pas plus grand que le zoom', () => {
		expect(errorsOf('zoom: 12.4 ; 12.5 ; step 1')).toContain('step');
	});

	it('step égal au zoom : accepté malgré l’arrondi (12,5 − 12,4 = 0,0999…)', () => {
		expect(nodeOf('zoom: 12.4 ; 12.5 ; step 0.1').zooms).toHaveLength(1);
	});

	it('step qui ne tombe pas juste sur la fin', () => {
		expect(errorsOf('zoom: 12.4 ; 12.5 ; step 0.03')).toContain('ne tombe pas juste');
	});

	it('labels hors du zoom', () => {
		expect(errorsOf('zoom: 12.4 ; 12.5 ; step 0.01 ; labels 12.4, 12.6')).toContain('hors du zoom');
	});

	it('trop de graduations', () => {
		expect(errorsOf('zoom: 12 ; 13 ; step 0.0001')).toContain('500');
	});

	it('morceau inconnu', () => {
		expect(errorsOf('zoom: 12.4 ; 12.5 ; step 0.01 ; couleur rouge')).toContain('couleur rouge');
	});

	it('pas de droite à placer avec un zoom (pour l’instant)', () => {
		expect(errorsOf('placer: 12.3', 'zoom: 12.4 ; 12.5 ; step 0.01')).toContain('zoom');
	});

	it('pas de droite à représenter avec un zoom', () => {
		expect(errorsOf('representer: [12.2, 12.6]', 'zoom: 12.4 ; 12.5 ; step 0.01')).toContain(
			'zoom'
		);
	});

	it('pas de segments avec un zoom', () => {
		expect(errorsOf('segments: [12.2, 12.6]', 'zoom: 12.4 ; 12.5 ; step 0.01')).toContain('zoom');
	});

	it('pas d’échelle log avec un zoom', () => {
		const { node, errors } = parseNumberLineContent([
			'start: 1',
			'end: 100',
			'step: 1',
			'scale: log',
			'zoom: 10 ; 20 ; step 1'
		]);
		expect(node).toBeNull();
		expect(errors.map((e) => e.message).join(' ; ')).toContain('zoom');
	});
});

describe('Droite avec zoom — graduations', () => {
	it('zoom sans labels : aucune étiquette', () => {
		const [zoom] = nodeOf('zoom: 12.4 ; 12.5 ; step 0.01 ; major 5').zooms!;
		expect(computeGraduations(zoom).every((g) => g.label === null)).toBe(true);
	});

	it('droite principale sans labels : étiquettes aux grandes graduations, comme avant', () => {
		const { node } = parseNumberLineContent(['start: 0', 'end: 4', 'step: 1']);
		expect(computeGraduations(node!.config).map((g) => g.label)).toEqual(['0', '1', '2', '3', '4']);
	});

	it('zoom avec labels : seulement celles écrites', () => {
		const [zoom] = nodeOf('zoom: 12.4 ; 12.5 ; step 0.01 ; labels 12.4, 12.5').zooms!;
		expect(computeGraduations(zoom).filter((g) => g.label !== null)).toHaveLength(2);
	});
});

describe('Droite avec zoom — PDF', () => {
	it('une droite par zoom, plus bas, reliée par deux pointillés', () => {
		const node = nodeOf(
			'points: B=12.47',
			'zoom: 12.4 ; 12.5 ; step 0.01',
			'zoom: 12.47 ; 12.48 ; step 0.001'
		);
		const typst = generateNumberLineTypst(node);
		// 3 axes : la droite principale et 2 zooms, chacun plus bas
		const axes = typst.match(/^ {2}line\(\(0, (-?[\d.]+)\), \(12, \1\)\)$/gm) ?? [];
		expect(axes).toHaveLength(3);
		const ys = axes.map((a) => Number(a.match(/^ {2}line\(\(0, (-?[\d.]+)\)/)![1]));
		expect(ys[0]).toBe(0);
		expect(ys[1]).toBeLessThan(ys[0]);
		expect(ys[2]).toBeLessThan(ys[1]);
		// 2 pointillés par zoom
		expect(typst.match(/dash: "dashed"/g)).toHaveLength(4);
		// B tombe sur les 3 droites
		expect(typst.match(/\[B\]/g)).toHaveLength(3);
	});

	it('le pointillé part des bouts agrandis de la droite du dessus', () => {
		const node = nodeOf('zoom: 12.4 ; 12.5 ; step 0.01');
		const typst = generateNumberLineTypst(node);
		// 12,4 sur la droite de 12 à 13, 12 cm : x = 4,8 ; 12,5 : x = 6
		const dashed = typst.split('\n').filter((l) => l.includes('dashed'));
		expect(dashed[0]).toMatch(/^ {2}line\(\(4\.8, /);
		expect(dashed[0]).toMatch(/\(0, -?[\d.]+\)/);
		expect(dashed[1]).toMatch(/^ {2}line\(\(6, /);
		expect(dashed[1]).toMatch(/\(12, -?[\d.]+\)/);
	});

	it('le pointillé part sous le nombre écrit de la graduation, sans le barrer', () => {
		// 12 est écrit (labels: 12, 13) : départ sous l'étiquette ; 12,1 ne l'est pas : sous la graduation
		const typst = generateNumberLineTypst(nodeOf('zoom: 12 ; 12.1 ; step 0.01'));
		const [left, right] = typst.split('\n').filter((l) => l.includes('dashed'));
		const yTop = (l: string) => Number(l.match(/^ {2}line\(\(-?[\d.]+, (-?[\d.]+)\)/)![1]);
		expect(yTop(left)).toBeLessThan(-0.5);
		expect(yTop(right)).toBeGreaterThan(-0.5);
	});

	it('sans zoom : PDF inchangé (un seul axe, aucun pointillé)', () => {
		const typst = generateNumberLineTypst(nodeOf());
		expect(typst).not.toContain('dashed');
	});
});
