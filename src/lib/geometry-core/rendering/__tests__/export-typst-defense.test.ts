/**
 * exportToTypst — défense en profondeur (relecture 2026-10-01) : une seule
 * erreur Typst fait échouer toute la fiche. Une couleur non hexadécimale
 * (`red`, `"`) ou un nombre non fini n'entre JAMAIS dans la sortie, même si
 * l'appelant n'a rien validé.
 */
import { describe, it, expect } from 'vitest';
import { exportToTypst } from '../export-typst';
import { Figure } from '../../graph/figure';
import { numeric } from '../../types/geo-value';
import type { Viewport } from '../../viewport/types';
import { runDsl } from '../../dsl';

const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -8, yMax: 8 };
const pt = (x: number, y: number) => ({ x: numeric(x), y: numeric(y) });

describe('exportToTypst — défense en profondeur', () => {
	it('couleur non hexadécimale : jamais dans rgb("…")', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0), { label: 'A' });
		const b = f.createFreePoint(pt(2, 0));
		f.updateStyle(a, { color: 'red' });
		f.updateStyle(b, { color: 'x") + 1pt, stroke: ("' });
		const out = exportToTypst(f, viewport);
		expect(out).not.toMatch(/rgb\("(?!#)/);
		expect(out).not.toContain('stroke: ("');
	});

	it('nombre non fini : la primitive est omise, aucun NaN/inf écrit', () => {
		const { figure: f } = runDsl(
			'A = point(0/0, 0)\nB = point(10^400, 1)\nC = point(1, 1)\ns = segment(A, C)\nt = segment(B, C)\nc = cercle(C, rayon=10^400)'
		);
		const C = f.getAllElements().find((e) => e.label === 'C')!;
		f.updateStyle(C.id, { strokeWidth: Infinity });
		const out = exportToTypst(f, viewport);
		expect(out).not.toMatch(/NaN|Infinity|\binf\b/);
	});
});
