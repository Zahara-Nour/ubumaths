/**
 * Bloc ```figure — une couleur nommée suit le thème à l'écran, et prend sa
 * variante claire au PDF ; un hexadécimal écrit par l'auteur reste tel quel.
 * Spécification : docs/archive/wip/palette-figures-progress.md (1 à 5, 8).
 */
import { describe, it, expect } from 'vitest';
import { parseFigureContent } from '../../parser/figure-parser';
import { buildFigureScene } from '../../utils/figure-scene';
import { figureToSvg } from '../../utils/figure-svg';
import { generateFigureTypst } from '../../generators/figure-typst';

const content = (body: string) => parseFigureContent(`fenetre: -1 ; 8 ; -1 ; 6\n---\n${body}`);

/** Le rendu écran, sérialisé : on y cherche les couleurs peintes */
function screen(body: string): string {
	const result = buildFigureScene(content(body));
	expect(result.errors).toEqual([]);
	return JSON.stringify(figureToSvg(result.scene!, 'moyenne'));
}

const TRIANGLE = 'A = point(0, 0)\nB = point(4, 0)\nC = point(0, 3)\n';

describe('figure — écran', () => {
	it('peint une couleur nommée avec la variable du thème', () => {
		expect(screen('A = point(1, 1, couleur="rouge")')).toContain('var(--color-fig-rouge)');
	});

	it('peint un synonyme anglais comme le nom français', () => {
		expect(screen('A = point(1, 1, couleur="red")')).toContain('var(--color-fig-rouge)');
	});

	it('laisse un hexadécimal écrit par l’auteur tel quel', () => {
		const out = screen('A = point(1, 1, couleur="#1e40af")');
		expect(out).toContain('#1e40af');
		expect(out).not.toContain('var(--color-fig-');
	});

	it('fait suivre au trait par défaut la couleur du texte', () => {
		expect(screen('A = point(1, 1)')).toContain('var(--color-foreground)');
	});

	it('fait suivre à un remplissage blanc le fond de la page', () => {
		expect(screen(`${TRIANGLE}p = polygone(A, B, C, remplissage="blanc")`)).toContain(
			'var(--color-background)'
		);
	});
});

describe('figure — PDF', () => {
	it('imprime une couleur nommée dans sa variante claire', () => {
		expect(generateFigureTypst(content('A = point(1, 1, couleur="marron")'))).toContain('#863805');
	});

	it('imprime un synonyme anglais comme le nom français', () => {
		expect(generateFigureTypst(content('A = point(1, 1, couleur="red")'))).toContain('#dc2626');
	});
});

describe('figure — nom inconnu', () => {
	it('reste une erreur d’auteur', () => {
		const result = buildFigureScene(content('A = point(1, 1, couleur="magenta")'));
		expect(result.scene).toBeNull();
		expect(result.errors[0].message).toMatch(/couleur inconnue/);
	});
});
