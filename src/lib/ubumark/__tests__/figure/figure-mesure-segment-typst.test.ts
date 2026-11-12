/**
 * Énoncé PDF d'une figure `verifier: mesure AB` (n° 26 de `outils-manquants.md`,
 * PR 2, Q4 a) : la figure est imprimée à l'échelle 1 unité = 1 cm, pour que
 * l'élève mesure le segment avec une vraie règle. Si la figure à 1 cm ne tient
 * pas dans la place disponible (colonne de fiche), elle est réduite comme les
 * autres figures (décision de David du 2026-11-12,
 * `docs/wip/amelioration-progress.md` § N° 26).
 */
import { describe, it, expect } from 'vitest';
import { parseFigure } from '../../parser/figure-parser';
import { generateFigureTypst } from '../../generators/figure-typst';

function block(verifier: string | null, window = '0 ; 10 ; 0 ; 6', size: string | null = null) {
	const lines = [
		verifier === null ? '```figure' : '```figure-a-completer',
		`fenetre: ${window}`,
		...(size ? [`taille: ${size}`] : []),
		...(verifier === null ? [] : [`verifier: ${verifier}`]),
		'---',
		'A = point(2, 3)',
		'B = point(8, 3)',
		's = segment(A, B)',
		'```'
	];
	const node = parseFigure(lines, 0, lines.length - 1);
	expect(node.errors).toEqual([]);
	return node;
}

/**
 * Canevas cetz de PREMIER niveau, dans l'ordre (`#cetz.canvas({` ou
 * `let <nom> = cetz.canvas({` en début de ligne) ; pas le canevas imbriqué de
 * la découpe à la fenêtre (`place(…, cetz.canvas({`)
 */
function canvases(typst: string): string[] {
	return typst.split(/^(?:#|let [a-z-]+ = )cetz\.canvas\(\{$/m).slice(1);
}

/** Échelle (`scale(x: …)`) d'un canevas, 1 sans ligne `scale` */
function scaleOf(canvas: string): number {
	const m = /^ {2}scale\(x: ([\d.]+), y: [\d.]+\)$/m.exec(
		canvas.split('\n').slice(0, 4).join('\n')
	);
	return m ? Number(m[1]) : 1;
}

describe('Énoncé PDF de « verifier: mesure AB » : 1 unité = 1 cm si ça tient', () => {
	it('deux canevas : à 1 cm d’abord, puis réduit comme les autres figures', () => {
		const typst = generateFigureTypst(block('mesure AB'));
		const plain = generateFigureTypst(block(null));
		const [atScale, reduced] = canvases(typst);
		expect(canvases(typst)).toHaveLength(2);
		expect(scaleOf(atScale)).toBe(1);
		// Réduit : la même échelle que la figure sans `mesure AB`
		expect(scaleOf(reduced)).toBe(scaleOf(canvases(plain)[0]));
		expect(scaleOf(reduced)).toBeLessThan(1);
	});

	it('le choix se fait à la compilation : place disponible contre largeur à 1 cm', () => {
		const typst = generateFigureTypst(block('mesure AB'));
		expect(typst).toContain('layout(size =>');
		expect(typst).toMatch(/measure\([a-z-]+\)\.width <= size\.width/);
		expect(typst.startsWith('#import "@preview/cetz:0.3.0"')).toBe(true);
	});

	it('« mesure AB en mm » : à l’échelle aussi', () => {
		const typst = generateFigureTypst(block('mesure AB en mm'));
		expect(canvases(typst)).toHaveLength(2);
		expect(scaleOf(canvases(typst)[0])).toBe(1);
	});

	it('quelle que soit la taille demandée (`taille: petite`) : 1 cm d’abord', () => {
		const typst = generateFigureTypst(block('mesure AB', '0 ; 10 ; 0 ; 6', 'petite'));
		expect(scaleOf(canvases(typst)[0])).toBe(1);
	});

	it('figure sans `mesure AB` : sortie inchangée, un seul canevas, pas de `layout`', () => {
		const typst = generateFigureTypst(block(null));
		expect(canvases(typst)).toHaveLength(1);
		expect(typst).not.toContain('layout(');
	});

	it('autre vérification (`droite_par`) : pas d’échelle 1 cm', () => {
		const typst = generateFigureTypst(block('droite_par A ; B'));
		expect(canvases(typst)).toHaveLength(1);
		expect(typst).not.toContain('layout(');
	});
});
