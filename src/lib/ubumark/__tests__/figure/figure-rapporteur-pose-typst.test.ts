/**
 * Case « figure » imprimée : le rapporteur déjà posé (`verifier: mesure AOB,
 * rapporteur posé`) est dans l'énoncé PDF comme à l'écran (outils manquants
 * n° 23, 2026-11-09). Même pose que l'écran (`posedProtractorOf`) : centre O,
 * graduation 0 sur [OA), corps du côté de B.
 */
import { describe, it, expect } from 'vitest';
import { parseFigure } from '../../parser/figure-parser';
import { generateFigureTypst } from '../../generators/figure-typst';
import { protractorTypst } from '../../generators/protractor-typst';

function block(verifier: string, body: string[]) {
	const lines = [
		'```figure-a-completer',
		'fenetre: 0 ; 10 ; 0 ; 8',
		`verifier: ${verifier}`,
		'---',
		...body,
		'```'
	];
	const node = parseFigure(lines, 0, lines.length - 1);
	expect(node.errors).toEqual([]);
	return node;
}

/** Angle AOB de 50°, sommet O(4 ; 3), [OA) horizontal */
const BODY = [
	'O = point(4, 3)',
	'A = point(7, 3)',
	'B = rotation(A, angle=50, centre=O)',
	'x = demidroite(O, A)',
	'y = demidroite(O, B)'
];

/** Positions (x ; y) des étiquettes extérieures du rapporteur, par graduation */
function outerLabels(typst: string): Map<string, [number, number]> {
	const labels = new Map<string, [number, number]>();
	for (const m of typst.matchAll(
		/content\(\((-?[\d.]+), (-?[\d.]+)\)[^\n]*\/\/ rapporteur-ext (\d+)/g
	)) {
		labels.set(m[3], [Number(m[1]), Number(m[2])]);
	}
	return labels;
}

describe('Rapporteur posé dans l’énoncé PDF', () => {
	it('« rapporteur posé » : le rapporteur est dessiné', () => {
		const typst = generateFigureTypst(block('mesure AOB, rapporteur posé', BODY));
		expect(typst).toContain('// rapporteur posé');
		expect(outerLabels(typst).size).toBe(19);
	});

	it('sans « rapporteur posé » : aucun rapporteur', () => {
		const typst = generateFigureTypst(block('mesure AOB', BODY));
		expect(typst).not.toContain('rapporteur');
	});

	it('graduation 0 sur [OA), 90 vers le haut, corps du côté de B', () => {
		const typst = generateFigureTypst(block('mesure AOB, rapporteur posé', BODY));
		const labels = outerLabels(typst);
		const [x0, y0] = labels.get('0')!;
		const [x90, y90] = labels.get('90')!;
		const [x180, y180] = labels.get('180')!;
		// 0 à droite de O, sur l'horizontale ; 180 à gauche ; 90 au-dessus
		expect(x0).toBeGreaterThan(4);
		expect(Math.abs(y0 - 3)).toBeLessThan(0.3);
		expect(x180).toBeLessThan(4);
		expect(Math.abs(x90 - 4)).toBeLessThan(1e-3);
		expect(y90).toBeGreaterThan(3);
		expect(Math.abs(y180 - y0)).toBeLessThan(1e-3);
	});

	it('premier côté nommé : « mesure BOA » pose la base sur [OB), corps vers A', () => {
		const typst = generateFigureTypst(block('mesure BOA, rapporteur posé', BODY));
		const labels = outerLabels(typst);
		const direction = (label: string) => {
			const [x, y] = labels.get(label)!;
			return (Math.atan2(y - 3, x - 4) * 180) / Math.PI;
		};
		// Retourné (sens −1, comme l'écran) : 180 extérieur (0 intérieur) le long de [OB), à 50°
		expect(Math.abs(direction('180') - 50)).toBeLessThan(1);
		// Corps du côté de A : la graduation 90 sous [OB), vers [OA)
		expect(Math.abs(direction('90') - -40)).toBeLessThan(1);
	});
});

describe('protractorTypst', () => {
	it('corps retourné (sens −1) : graduation 90 sous la base', () => {
		const lines = protractorTypst(
			{ center: { x: 0, y: 0 }, base: { x: 1, y: 0 }, sens: -1, radius: 3 },
			1
		).join('\n');
		const [, y90] = outerLabels(lines).get('90')!;
		expect(y90).toBeLessThan(0);
	});
});
