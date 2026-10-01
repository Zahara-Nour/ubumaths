/**
 * `markdownToTypst` (point d'entrée asynchrone du générateur) inscrit lui-même
 * le rendu réel des figures : un appelant qui n'importe pas
 * `figure-typst-setup` obtient quand même la figure, pas « Figure indisponible ».
 * Fichier SÉPARÉ : vitest isole les modules par fichier, rien d'autre ici
 * n'importe `figure-typst-setup`.
 */
import { describe, it, expect } from 'vitest';
import { markdownToTypst } from '../../generators/typst-generator';

describe('markdownToTypst — figures', () => {
	it('dessine la figure sans import explicite du rendu', async () => {
		const md = ['```figure', 'fenetre: 0 ; 4 ; 0 ; 3', '---', 'A = point(1, 1)', '```'].join('\n');
		const typst = await markdownToTypst(md, { includeSetup: false });
		expect(typst).toContain('cetz.canvas');
		expect(typst).not.toContain('Figure indisponible');
	});
});
