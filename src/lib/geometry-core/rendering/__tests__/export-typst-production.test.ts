/**
 * exportToTypst en conditions de PRODUCTION (bloc ubumark ```figure, 2026-10-01)
 *
 * Le PDF des fiches est compilé dans le navigateur par typst.ts 0.6.1-rc5 avec
 * cetz 0.3.0 : une seule erreur fait échouer TOUTE la fiche. D'où :
 * - même version de cetz que les blocs `courbe`, `trig`, `line` ;
 * - aucun nom ni texte d'auteur en mode math (`$AB$` = variable inconnue) ni en
 *   markup (`#`, `$`, `*`, `_`…) : des CHAÎNES Typst, échappées ;
 * - options de mise en page (échelle des marques, cadre de la fenêtre, repères
 *   par élément pour vérifier que l'écran et le PDF montrent les mêmes objets).
 */
import { describe, it, expect } from 'vitest';
import { exportToTypst } from '../export-typst';
import { Figure } from '../../graph/figure';
import { numeric } from '../../types/geo-value';
import type { Viewport } from '../../viewport/types';

function pt(x: number, y: number) {
	return { x: numeric(x), y: numeric(y) };
}

const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -8, yMax: 8 };

describe('exportToTypst — production', () => {
	it('importe cetz 0.3.0 (version des autres blocs du PDF)', () => {
		expect(exportToTypst(new Figure(), viewport)).toContain('#import "@preview/cetz:0.3.0"');
	});

	it('`includeImport: false` : pas d’import (le document l’a déjà)', () => {
		const out = exportToTypst(new Figure(), viewport, { includeImport: false });
		expect(out).not.toContain('#import');
		expect(out).toContain('cetz.canvas');
	});

	it('nom de point à plusieurs lettres : jamais en mode math', () => {
		const f = new Figure();
		f.createFreePoint(pt(1, 1), { label: 'AB' });
		const out = exportToTypst(f, viewport);
		expect(out).not.toContain('$AB$');
		expect(out).toContain('"AB"');
	});

	it('texte d’auteur avec caractères spéciaux : chaîne échappée', () => {
		const f = new Figure();
		f.createText('prix : 3 $ #a "b" \\c *d* _e_', [], { position: { x: 0, y: 0 } });
		const out = exportToTypst(f, viewport);
		expect(out).toContain('"prix : 3 $ #a \\"b\\" \\\\c *d* _e_"');
		expect(out).not.toMatch(/\[\$prix/);
	});

	it('`annotate` : un repère par élément dessiné', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0), { label: 'A' });
		const b = f.createFreePoint(pt(3, 0), { label: 'B' });
		const s = f.createSegment(a, b);
		const out = exportToTypst(f, viewport, { annotate: true });
		for (const id of [a, b, s]) expect(out).toContain(`// element ${id}`);
	});

	it('`includeViewportBounds` : cadre invisible aux bornes de la fenêtre', () => {
		const out = exportToTypst(new Figure(), viewport, { includeViewportBounds: true });
		expect(out).toContain('rect((-10, -8), (10, 8), stroke: none)');
	});

	it('`markScale` : la taille des points suit (repère réduit)', () => {
		const f = new Figure();
		f.createFreePoint(pt(0, 0));
		expect(exportToTypst(f, viewport)).toContain('radius: 0.08');
		expect(exportToTypst(f, viewport, { markScale: 2 })).toContain('radius: 0.16');
	});
});
