/**
 * Étiquette d'un évènement de l'arbre pondéré, à l'écran (2026-11-05)
 *
 * Constat (ligne 11 de `docs/wip/outils-manquants.md`, arbres du lot 5a de terminale
 * spé) : `G_1` sortait brut, trait bas compris, au lieu de G indice 1 — toute étiquette
 * de plus d'une lettre sans `\` était mise entière dans `\text{}`. Contournement des
 * modèles : `\mathrm{G}_1`.
 */
import { describe, it, expect } from 'vitest';
import { probTreeLabelLatex } from '../probtree-label';

describe('étiquette d’un évènement de l’arbre', () => {
	it('lettre seule : variable mathématique', () => {
		expect(probTreeLabelLatex('A')).toBe('A');
	});

	it('mot seul : texte droit', () => {
		expect(probTreeLabelLatex('Pile')).toBe('\\text{Pile}');
	});

	it('lettre indicée : G_1 rendu G indice 1, pas en texte', () => {
		expect(probTreeLabelLatex('G_1')).toBe('G_1');
		expect(probTreeLabelLatex('G_{12}')).toBe('G_{12}');
	});

	it('mot indicé : le mot en texte, l’indice en maths', () => {
		expect(probTreeLabelLatex('Malade_1')).toBe('\\text{Malade}_1');
		expect(probTreeLabelLatex('Malade_{12}')).toBe('\\text{Malade}_{12}');
	});

	it('étiquette déjà en LaTeX : intacte (contournement des modèles en prod)', () => {
		expect(probTreeLabelLatex('\\mathrm{G}_1')).toBe('\\mathrm{G}_1');
		expect(probTreeLabelLatex('\\overline{G_1}')).toBe('\\overline{G_1}');
	});
});
