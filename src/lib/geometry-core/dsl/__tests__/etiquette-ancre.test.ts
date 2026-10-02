/**
 * DSL — position du nom d'un point (`etiquette=`), ancrage des textes
 * (`ancre=`), `visible=faux` à la création, alias `style=` de `trait=`.
 *
 * Chantier `docs/wip/figure-etiquettes-progress.md` (2026-10-02).
 */
import { describe, it, expect } from 'vitest';
import { runDsl } from '../index';
import type { GeoElement } from '../../types/elements';
import { isPointElement, isText } from '../../types/elements';

function byLabel(elements: GeoElement[], label: string): GeoElement {
	const el = elements.find((e) => e.label === label);
	if (!el) throw new Error(`élément ${label} absent`);
	return el;
}

function run(script: string): GeoElement[] {
	return runDsl(script).figure.getAllElements();
}

describe('etiquette= : position du nom d’un point', () => {
	const cases: [string, string][] = [
		['haut', 'top'],
		['bas', 'bottom'],
		['gauche', 'left'],
		['droite', 'right'],
		['haut-gauche', 'top-left'],
		['haut-droite', 'top-right'],
		['bas-gauche', 'bottom-left'],
		['bas-droite', 'bottom-right']
	];
	for (const [fr, en] of cases) {
		it(`point(…, etiquette="${fr}") → labelPosition ${en}`, () => {
			const A = byLabel(run(`A = point(1, 2, etiquette="${fr}")`), 'A');
			expect(A.labelPosition).toBe(en);
			expect(A.labelHidden).toBeFalsy();
		});
	}

	it('sans etiquette : aucun réglage (défaut haut-droite au rendu)', () => {
		const A = byLabel(run('A = point(1, 2)'), 'A');
		expect(A.labelPosition).toBeUndefined();
		expect(A.labelHidden).toBeFalsy();
	});

	it('etiquette="aucune" : nom masqué, point visible, nom conservé', () => {
		const A = byLabel(run('A = point(1, 2, etiquette="aucune")'), 'A');
		expect(A.labelHidden).toBe(true);
		expect(A.visible).toBe(true);
		expect(A.label).toBe('A');
	});

	it('points construits : milieu, intersection, projection', () => {
		const els = run(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(0, 3)',
				'I = milieu(A, B, etiquette="bas")',
				'd1 = droite(A, B)',
				'd2 = droite(C, I)',
				'K = intersection(d1, d2, etiquette="bas-gauche")',
				'H = projection(C, axe=d1, etiquette="bas-droite")'
			].join('\n')
		);
		expect(byLabel(els, 'I').labelPosition).toBe('bottom');
		expect(byLabel(els, 'K').labelPosition).toBe('bottom-left');
		const H = byLabel(els, 'H');
		expect(isPointElement(H)).toBe(true);
		expect(H.labelPosition).toBe('bottom-right');
	});

	it('style(A, etiquette=…) et montre(A, etiquette=…) règlent un point existant', () => {
		const els = run(
			[
				'A = point(0, 0)',
				'B = point(1, 0)',
				'style(A, etiquette="gauche")',
				'masque(B)',
				'montre(B, etiquette="bas")'
			].join('\n')
		);
		expect(byLabel(els, 'A').labelPosition).toBe('left');
		expect(byLabel(els, 'B').labelPosition).toBe('bottom');
		expect(byLabel(els, 'B').visible).toBe(true);
	});

	it('valeur inconnue → erreur qui liste les valeurs permises', () => {
		expect(() => run('A = point(0, 0, etiquette="nord")')).toThrow(/haut-gauche/);
	});

	it('valeur non chaîne → erreur', () => {
		expect(() => run('A = point(0, 0, etiquette=3)')).toThrow(/etiquette/);
	});

	it('etiquette sur autre chose qu’un point → erreur explicite', () => {
		expect(() =>
			run('A = point(0, 0)\nB = point(1, 0)\ns = segment(A, B, etiquette="bas")')
		).toThrow(/point/);
	});
});

describe('texte(…, ancre=…) : point du texte posé sur la position', () => {
	const cases: [string, string][] = [
		['centre', 'center'],
		['haut', 'top'],
		['bas', 'bottom'],
		['gauche', 'left'],
		['droite', 'right'],
		['haut-gauche', 'top-left'],
		['haut-droite', 'top-right'],
		['bas-gauche', 'bottom-left'],
		['bas-droite', 'bottom-right']
	];
	for (const [fr, en] of cases) {
		it(`ancre="${fr}" → textAnchor ${en}`, () => {
			const t = run(`texte(1, 2, "abc", ancre="${fr}")`).find(isText)!;
			expect(t.textAnchor).toBe(en);
		});
	}

	it('texte ancré à un point : ancre acceptée aussi', () => {
		const t = run('A = point(0, 0)\ntexte(A, "abc", dx=0, dy=0, ancre="bas")').find(isText)!;
		expect(t.textAnchor).toBe('bottom');
		expect(t.anchorOffset).toEqual({ dx: 0, dy: 0 });
	});

	it('sans ancre : rien (défaut centre au rendu)', () => {
		const t = run('texte(1, 2, "abc")').find(isText)!;
		expect(t.textAnchor).toBeUndefined();
	});

	it('valeur inconnue → erreur qui liste les valeurs permises', () => {
		expect(() => run('texte(1, 2, "abc", ancre="milieu")')).toThrow(/centre/);
	});
});

describe('visible=faux à la création', () => {
	it('point(…, visible=faux) : point masqué, utilisable dans une construction', () => {
		const els = run(
			['A = point(0, 0, visible=faux)', 'B = point(4, 0)', 's = segment(A, B)'].join('\n')
		);
		expect(byLabel(els, 'A').visible).toBe(false);
		expect(els.some((e) => e.type === 'segment' && e.visible)).toBe(true);
	});

	it('visible=vrai : visible', () => {
		expect(byLabel(run('A = point(0, 0, visible=vrai)'), 'A').visible).toBe(true);
	});
});

describe('style= : alias de trait=', () => {
	const cases: [string, string | undefined][] = [
		['pointille', 'dotted'],
		['pointilles', 'dotted'],
		['tirets', 'dashed'],
		['continu', undefined]
	];
	for (const [value, dash] of cases) {
		it(`segment(…, style="${value}") → ${dash ?? 'continu'}`, () => {
			const s = run(`A = point(0, 0)\nB = point(1, 0)\ns = segment(A, B, style="${value}")`).find(
				(e) => e.type === 'segment'
			)!;
			expect(s.style?.dash).toBe(dash);
		});
	}

	it('trait="pointille" (singulier) accepté', () => {
		const s = run('A = point(0, 0)\nB = point(1, 0)\ns = segment(A, B, trait="pointille")').find(
			(e) => e.type === 'segment'
		)!;
		expect(s.style?.dash).toBe('dotted');
	});

	it('style= inconnu → erreur qui nomme trait=', () => {
		expect(() => run('A = point(0, 0)\nB = point(1, 0)\ns = segment(A, B, style="gras")')).toThrow(
			/trait/
		);
	});
});
