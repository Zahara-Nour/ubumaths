/**
 * Bloc ```trig dans le PDF : points nommés (décision de David, 2026-10-02)
 *
 * Même dessin que l'écran : un point et un NOM par point nommé, en texte
 * italique — jamais en mode math (`AB` y serait une variable inconnue et
 * toute la fiche échouerait). La valeur d'un point nommé n'est jamais écrite.
 */
import { describe, it, expect } from 'vitest';
import { generateTrigCircleTypst } from '../../generators/trig-circle-typst';
import { parseTrigCircleContent } from '../../parser/trig-circle-parser';

function typstOf(source: string): string {
	const { node } = parseTrigCircleContent(source);
	return generateTrigCircleTypst(node!);
}

/** Lignes `content(...)` qui écrivent un nom de point */
function nameLines(typst: string): string[] {
	return typst.split('\n').filter((l) => l.includes('text(style: "italic")'));
}

/** Lignes `content(...)` qui écrivent une valeur d'angle (mode math) */
function valueLines(typst: string): string[] {
	const start = typst.indexOf('// Angle labels');
	if (start === -1) return [];
	const block = typst.slice(start).split('\n\n')[0];
	return block.split('\n').filter((l) => l.trim().startsWith('content('));
}

describe('trig → Typst : points nommés', () => {
	it('un nom en texte italique par point, rien en mode math, aucune valeur (labels: false)', () => {
		const typst = typstOf(`preset: custom\npoints: M = 2*pi/3, N = -pi/4\nlabels: false`);
		const names = nameLines(typst);
		expect(names).toHaveLength(2);
		expect(names[0]).toContain('[M]');
		expect(names[1]).toContain('[N]');
		for (const l of names) expect(l).not.toContain('$');
		expect(valueLines(typst)).toEqual([]);
	});

	it('le point est dessiné à sa place sur le cercle (M = 2π/3, rayon 2,5)', () => {
		const typst = typstOf(`preset: custom\npoints: M = 2*pi/3`);
		expect(typst).toMatch(/circle\(\(-1\.25, 2\.165\), radius: [\d.]+, fill: /);
	});

	it('preset + points, labels: true : valeurs du preset, mais pas celle du point', () => {
		// M tombe sur π/2, un angle du preset : sa valeur n'est pas écrite non plus
		const typst = typstOf(`preset: quarters\npoints: M = pi/2, N = pi/3`);
		expect(nameLines(typst)).toHaveLength(2);
		const values = valueLines(typst);
		expect(values).toHaveLength(3);
	});

	it('chiffres en indice, primes en caractère ′ (jamais l’apostrophe typographique)', () => {
		const typst = typstOf(`points: A1 = pi/6, M' = pi`);
		const names = nameLines(typst).join('\n');
		expect(names).toContain('[A#sub[1]]');
		expect(names).toContain('[M′]');
	});

	it('bloc en erreur : cadre « Figure indisponible », pas de canevas', () => {
		const typst = typstOf(`preset: quarters\nnoms: M`);
		expect(typst).toContain('Figure indisponible');
		expect(typst).not.toContain('cetz.canvas');
	});
});
