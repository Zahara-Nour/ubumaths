/**
 * Lot 4b de la refonte, côté figure : la vue Géométrie lit les réglages que les
 * cartes des points et des courbes posent (`setFigureDisplay`, #1504). Couleur,
 * taille et étiquette d'un point ; couleur, style de trait et épaisseur d'une
 * courbe (équation ou construction). Un réglage repeint sans refaire la figure
 * (`restyled`), comme K4 pour 𝒞f ; sans réglage, le dessin reste celui d'avant.
 *
 * On lit le style que la toile PEINT (`resolveScreenStyle`, celui de `GeometryCanvas`).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { AtelierFigure, syncFigure } from '../figure-sync';
import type { Figure } from '$lib/geometry-core/graph/figure';
import type { GeoElement } from '$lib/geometry-core/types/elements';
import { resolveScreenStyle } from '$lib/geometry-core/rendering/svg-primitives';
import { exportToSVG } from '$lib/geometry-core/rendering/export-svg';
import { exportToTikZ } from '$lib/geometry-core/rendering/export-tikz';
import { exportToTypst } from '$lib/geometry-core/rendering/export-typst';

// =============================================================================
// Outils
// =============================================================================

type Entry = [kind: 'value' | 'point' | 'curve', name: string, definition: string];

function atelierOf(entries: Entry[]): Atelier {
	const atelier = new Atelier();
	for (const [kind, name, definition] of entries) {
		const done = atelier.create({ kind, name, definition }, 'text');
		if (!done.ok) throw new Error(`${name} refusé : ${done.message}`);
	}
	return atelier;
}

function synced(atelier: Atelier): AtelierFigure {
	const target = new AtelierFigure();
	syncFigure(atelier, target);
	return target;
}

/** L'élément visible qui porte l'étiquette `name`. */
function shown(figure: Figure, name: string): GeoElement {
	const el = figure.getAllElements().find((e) => e.visible && e.label === name);
	if (el === undefined) throw new Error(`rien de visible nommé ${name}`);
	return el;
}

function painted(figure: Figure, name: string) {
	return resolveScreenStyle(shown(figure, name), figure.defaults);
}

/** Le texte visible qui écrit le nom d'un cercle. */
function circleName(figure: Figure): GeoElement {
	const el = figure.getAllElements().find((e) => e.type === 'text' && e.visible);
	if (el === undefined) throw new Error('pas de nom de cercle');
	return el;
}

function set(atelier: Atelier, name: string, patch: Record<string, unknown>): void {
	const done = atelier.setFigureDisplay(name, patch);
	if (!done.ok) throw new Error(done.message);
}

const VIEWPORT = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };

// =============================================================================
// Tests
// =============================================================================

describe('les points : couleur, taille, étiquette', () => {
	it('sans réglage, le point garde le dessin d’avant', () => {
		const plain = synced(atelierOf([['point', 'A', '(1 ; 2)']])).figure;
		const A = shown(plain, 'A');
		expect(A.style?.pointSize).toBeUndefined();
		expect(A.style?.color).toBeUndefined();
		expect(A.labelHidden).toBeFalsy();
	});

	it('la couleur de la carte est peinte avec le jeton du Graphe', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		set(atelier, 'A', { color: 'curve-3' });
		expect(painted(synced(atelier).figure, 'A').color).toBe('var(--color-curve-3)');
	});

	it('trois tailles : petit 3, moyen 5 (celle d’avant), grand 7', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const sizes: number[] = [];
		for (const size of ['small', 'medium', 'large']) {
			set(atelier, 'A', { size });
			sizes.push(painted(synced(atelier).figure, 'A').pointSize);
		}
		expect(sizes).toEqual([3, 5, 7]);
		const before = synced(atelierOf([['point', 'A', '(1 ; 2)']])).figure;
		expect(painted(before, 'A').pointSize).toBe(5);
	});

	it('étiquette masquée : le point reste dessiné, son nom non', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		set(atelier, 'A', { showLabel: false });
		const A = shown(synced(atelier).figure, 'A');
		expect(A.labelHidden).toBe(true);
	});

	it('un point construit (milieu) suit aussi sa carte', () => {
		const atelier = atelierOf([
			['point', 'A', '(0 ; 1)'],
			['point', 'B', '(2 ; 3)'],
			['point', 'I', 'milieu(A, B)']
		]);
		set(atelier, 'I', { color: 'curve-2', size: 'large', showLabel: false });
		const figure = synced(atelier).figure;
		expect(painted(figure, 'I').color).toBe('var(--color-curve-2)');
		expect(painted(figure, 'I').pointSize).toBe(7);
		expect(shown(figure, 'I').labelHidden).toBe(true);
	});

	it('régler un point repeint sans reconstruire, puis plus rien', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const target = synced(atelier);
		const figure = target.figure;

		set(atelier, 'A', { color: 'curve-4', size: 'small', showLabel: false });

		expect(syncFigure(atelier, target)).toBe('restyled');
		expect(target.figure).toBe(figure);
		expect(painted(figure, 'A').color).toBe('var(--color-curve-4)');
		expect(painted(figure, 'A').pointSize).toBe(3);
		expect(shown(figure, 'A').labelHidden).toBe(true);
		expect(syncFigure(atelier, target)).toBe('unchanged');

		set(atelier, 'A', { showLabel: true });
		expect(syncFigure(atelier, target)).toBe('restyled');
		expect(shown(figure, 'A').labelHidden).toBe(false);
	});

	it('un réglage survit à une reconstruction (nouvel objet)', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		set(atelier, 'A', { color: 'curve-2', size: 'large', showLabel: false });
		const target = synced(atelier);
		atelier.create({ kind: 'point', name: 'B', definition: '(0 ; 0)' }, 'text');

		expect(syncFigure(atelier, target)).toBe('rebuilt');
		expect(painted(target.figure, 'A').pointSize).toBe(7);
		expect(shown(target.figure, 'A').labelHidden).toBe(true);
	});
});

describe('les courbes : couleur, style de trait, épaisseur', () => {
	it('sans réglage, la courbe garde le dessin d’avant', () => {
		const d = shown(synced(atelierOf([['curve', 'd', 'y = 3x - 2']])).figure, 'd');
		expect(d.style?.color).toBeUndefined();
		expect(d.style?.dash).toBeUndefined();
		expect(d.style?.strokeWidth).toBeUndefined();
	});

	it('une droite d’équation prend couleur, pointillés et épaisseur de sa carte', () => {
		const atelier = atelierOf([['curve', 'd', 'y = 3x - 2']]);
		set(atelier, 'd', { color: 'curve-2', lineStyle: 'dashed', lineWidth: 4 });
		const style = painted(synced(atelier).figure, 'd');
		expect(style.color).toBe('var(--color-curve-2)');
		expect(style.dash).toBe('dashed');
		expect(style.strokeWidth).toBe(4);
	});

	it('`dashdot` n’existe pas dans la figure : des tirets', () => {
		const atelier = atelierOf([['curve', 'C', 'x^2 + y^2 = 4']]);
		set(atelier, 'C', { lineStyle: 'dashdot' });
		expect(painted(synced(atelier).figure, 'C').dash).toBe('dashed');
	});

	it('une courbe y = f(x) et une conique suivent leur carte', () => {
		const atelier = atelierOf([
			['curve', 'p', 'y = x^2'],
			['curve', 'C', 'x^2 + y^2 = 4']
		]);
		set(atelier, 'p', { color: 'curve-3', lineStyle: 'dotted' });
		set(atelier, 'C', { color: 'curve-4', lineWidth: 3 });
		const figure = synced(atelier).figure;
		expect(painted(figure, 'p').color).toBe('var(--color-curve-3)');
		expect(painted(figure, 'p').dash).toBe('dotted');
		expect(painted(figure, 'C').color).toBe('var(--color-curve-4)');
		expect(painted(figure, 'C').strokeWidth).toBe(3);
	});

	it('une conique à curseur : chacune de ses sortes porte le réglage', () => {
		const atelier = atelierOf([
			['value', 'a', '4'],
			['curve', 'C', 'x^2 = a']
		]);
		set(atelier, 'C', { color: 'curve-2' });
		const figure = synced(atelier).figure;
		const drawn = figure.getAllElements().filter((e) => e.visible && e.label === 'C');
		expect(drawn.length).toBeGreaterThan(1);
		for (const el of drawn) {
			expect(resolveScreenStyle(el, figure.defaults).color).toBe('var(--color-curve-2)');
		}
	});

	it('droite, segment, demi-droite construits suivent leur carte', () => {
		const atelier = atelierOf([
			['point', 'A', '(0 ; 1)'],
			['point', 'B', '(1 ; 3)'],
			['curve', 'd', '(AB)'],
			['curve', 's', '[AB]'],
			['curve', 'r', '[AB)']
		]);
		set(atelier, 'd', { color: 'curve-2' });
		set(atelier, 's', { lineWidth: 5 });
		set(atelier, 'r', { lineStyle: 'dotted' });
		const figure = synced(atelier).figure;
		expect(painted(figure, 'd').color).toBe('var(--color-curve-2)');
		expect(painted(figure, 's').strokeWidth).toBe(5);
		expect(painted(figure, 'r').dash).toBe('dotted');
	});

	it('un cercle construit : son nom suit sa couleur, et reste écrit', () => {
		const atelier = atelierOf([
			['point', 'O', '(0 ; 0)'],
			['curve', 'c', 'cercle(O ; 3)']
		]);
		const target = synced(atelier);
		const figure = target.figure;

		set(atelier, 'c', { color: 'curve-3', lineStyle: 'dashed' });

		expect(syncFigure(atelier, target)).toBe('restyled');
		expect(target.figure).toBe(figure);
		expect(painted(figure, 'c').color).toBe('var(--color-curve-3)');
		expect(painted(figure, 'c').dash).toBe('dashed');
		const name = circleName(figure);
		expect(resolveScreenStyle(name, figure.defaults).color).toBe('var(--color-curve-3)');
		expect(name.visible).toBe(true);
	});

	it('régler une courbe repeint sans reconstruire, puis plus rien', () => {
		const atelier = atelierOf([['curve', 'd', 'y = 3x - 2']]);
		const target = synced(atelier);
		const figure = target.figure;

		set(atelier, 'd', { lineWidth: 1 });

		expect(syncFigure(atelier, target)).toBe('restyled');
		expect(target.figure).toBe(figure);
		expect(painted(figure, 'd').strokeWidth).toBe(1);
		expect(syncFigure(atelier, target)).toBe('unchanged');
	});
});

describe('le premier réglage part de ce qui est dessiné', () => {
	it('régler la taille d’un point garde la couleur peinte', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const target = synced(atelier);
		const before = painted(target.figure, 'A').color;

		set(atelier, 'A', { size: 'large' });

		expect(syncFigure(atelier, target)).toBe('restyled');
		expect(painted(target.figure, 'A').color).toBe(before);
		expect(painted(target.figure, 'A').pointSize).toBe(7);
		const a = atelier.get('A');
		expect(a?.kind === 'point' && a.display?.color).toBeUndefined();
	});

	it('masquer le nom d’un point garde sa couleur peinte', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const before = painted(synced(atelier).figure, 'A').color;
		set(atelier, 'A', { showLabel: false });
		expect(painted(synced(atelier).figure, 'A').color).toBe(before);
	});

	it('régler le trait ou l’épaisseur d’une courbe garde sa couleur peinte', () => {
		const atelier = atelierOf([
			['point', 'O', '(0 ; 0)'],
			['curve', 'd', 'y = 3x - 2'],
			['curve', 'c', 'cercle(O ; 3)']
		]);
		const target = synced(atelier);
		const line = painted(target.figure, 'd').color;
		const circle = painted(target.figure, 'c').color;
		const name = resolveScreenStyle(circleName(target.figure), target.figure.defaults).color;

		set(atelier, 'd', { lineStyle: 'dashed' });
		set(atelier, 'c', { lineWidth: 4 });

		expect(syncFigure(atelier, target)).toBe('restyled');
		expect(painted(target.figure, 'd').color).toBe(line);
		expect(painted(target.figure, 'c').color).toBe(circle);
		expect(resolveScreenStyle(circleName(target.figure), target.figure.defaults).color).toBe(name);
	});

	it('choisir la taille déjà active (moyenne) sur un point sans réglage n’enregistre rien', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		const target = synced(atelier);
		const revision = atelier.revision;

		set(atelier, 'A', { size: 'medium' });
		set(atelier, 'A', { showLabel: true });

		const a = atelier.get('A');
		expect(a?.kind === 'point' && a.display).toBeUndefined();
		expect(atelier.revision).toBe(revision);
		expect(atelier.serialize().objects.some((o) => 'figureDisplay' in o)).toBe(false);
		expect(syncFigure(atelier, target)).toBe('unchanged');
	});

	it('choisir le trait ou l’épaisseur déjà actifs sur une courbe sans réglage n’enregistre rien', () => {
		const atelier = atelierOf([['curve', 'd', 'y = 3x - 2']]);
		const target = synced(atelier);
		const revision = atelier.revision;

		set(atelier, 'd', { lineStyle: 'solid' });
		set(atelier, 'd', { lineWidth: 2 });

		const d = atelier.get('d');
		expect(d?.kind === 'curve' && d.display).toBeUndefined();
		expect(atelier.revision).toBe(revision);
		expect(atelier.serialize().objects.some((o) => 'figureDisplay' in o)).toBe(false);
		expect(syncFigure(atelier, target)).toBe('unchanged');
	});

	it('un réglage sans couleur se range et se relit tel quel', () => {
		const atelier = atelierOf([
			['point', 'A', '(1 ; 2)'],
			['curve', 'd', 'y = 3x - 2']
		]);
		set(atelier, 'A', { size: 'large' });
		set(atelier, 'd', { lineWidth: 4 });

		const fresh = new Atelier();
		fresh.restore(atelier.serialize());

		const a = fresh.get('A');
		const d = fresh.get('d');
		expect(a?.kind === 'point' && a.display).toEqual({ size: 'large', showLabel: true });
		expect(d?.kind === 'curve' && d.display).toEqual({ lineStyle: 'solid', lineWidth: 4 });
	});

	it('un réglage qui disparaît (sauvegarde relue sans lui) refait la figure, au dessin par défaut', () => {
		const entries: Entry[] = [
			['point', 'A', '(1 ; 2)'],
			['curve', 'd', 'y = 3x - 2']
		];
		const plain = synced(atelierOf(entries)).figure;
		const atelier = atelierOf(entries);
		set(atelier, 'A', { color: 'curve-2', size: 'large', showLabel: false });
		set(atelier, 'd', { color: 'curve-3', lineStyle: 'dotted', lineWidth: 4 });
		const target = synced(atelier);

		expect(syncFigure(atelierOf(entries), target)).toBe('rebuilt');

		expect(painted(target.figure, 'A')).toEqual(painted(plain, 'A'));
		expect(shown(target.figure, 'A').labelHidden).toBeFalsy();
		expect(painted(target.figure, 'd')).toEqual(painted(plain, 'd'));
	});
});

describe('l’étiquette masquée dans les exports (labelHidden)', () => {
	function hiddenA(): Figure {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		set(atelier, 'A', { showLabel: false });
		return synced(atelier).figure;
	}

	it('SVG : le point est dessiné, son nom non', () => {
		const svg = exportToSVG(hiddenA(), VIEWPORT);
		expect(svg).toContain('<circle');
		expect(svg).not.toMatch(/>A<\/text>/);
	});

	it('TikZ : le point est dessiné, son nom non', () => {
		const tikz = exportToTikZ(hiddenA(), VIEWPORT);
		expect(tikz).toContain('circle (2pt)');
		expect(tikz).not.toContain('{$A$}');
	});

	it('Typst : le nom n’est pas écrit', () => {
		expect(exportToTypst(hiddenA(), VIEWPORT)).not.toContain('"A")');
	});
});
