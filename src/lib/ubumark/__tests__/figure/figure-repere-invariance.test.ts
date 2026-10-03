/**
 * Bloc ```figure — sans axes ni grille, rendu STRICTEMENT inchangé (lot 0 du repère)
 *
 * Les instantanés ont été enregistrés AVANT l'ajout du repère (2026-10-03) :
 * une figure sans `axes:` ni `grille:` doit produire le même SVG d'écran et le
 * même Typst, octet pour octet.
 *
 * Ré-enregistrés le 2026-10-03 (branche fix/figures-pdf), deux changements
 * VOULUS et seulement eux : `shape` des points à l'écran (forme du point), et
 * au PDF les objets dans une boîte découpée à la fenêtre (noms et textes
 * au-dessus) — voir `figure-pdf-defauts.test.ts`.
 */
import { describe, it, expect } from 'vitest';
import { parseFigureContent } from '../../parser/figure-parser';
import { buildFigureScene } from '../../utils/figure-scene';
import { figureToSvg } from '../../utils/figure-svg';
import { generateFigureTypst } from '../../generators/figure-typst';

const FIGURES: Record<string, string> = {
	triangle: `fenetre: -1 ; 8 ; -1 ; 6
taille: moyenne
---
A = point(0, 0)
B = point(5, 0)
C = point(0, 4)
p = polygone(A, B, C)
angle(B, A, C, marque="carre")
m = marque_segment(A, B, traits=2)
v = vecteur(B, C)
c = cercle(A, rayon=1)
d = droite(A, C)
r = demidroite(B, C)
I = milieu(A, B)
texte(2, 3, "hypoténuse")`,
	asymetrique: `fenetre: 2 ; 12 ; 1 ; 8
taille: petite
---
A = point(3, 2)
B = point(10, 7)
d = droite(A, B)
c = cercle(B, rayon=2.5)`
};

describe('figure sans repère — rendu inchangé', () => {
	for (const [name, source] of Object.entries(FIGURES)) {
		it(`${name} : SVG d'écran identique`, () => {
			const node = parseFigureContent(source);
			const scene = buildFigureScene(node).scene!;
			expect(figureToSvg(scene, node.header.size)).toMatchSnapshot();
		});

		it(`${name} : Typst identique`, () => {
			expect(generateFigureTypst(parseFigureContent(source))).toMatchSnapshot();
		});
	}
});
