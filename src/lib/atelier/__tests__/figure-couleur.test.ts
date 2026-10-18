/**
 * K4 (décision de David, 2026-10-18) : dans la vue Géométrie, 𝒞f prend la couleur
 * de sa carte (`display.color`), comme dans le Graphe, et la suit sans que la
 * figure soit reconstruite. On lit la couleur que la toile PEINT : le style
 * résolu pour l'écran (`resolveScreenStyle`, celui de `GeometryCanvas`).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { AtelierFigure, syncFigure } from '../figure-sync';
import type { Figure } from '$lib/geometry-core/graph/figure';
import { resolveScreenStyle } from '$lib/geometry-core/rendering/svg-primitives';
import { curveColorValue } from '$lib/grapheur/colors';

function desk(...lines: string[]): CalcDesk {
	const d = new CalcDesk(new Atelier());
	for (const line of lines) {
		d.submit(line);
		if (d.entries.at(-1)?.failed) throw new Error(`refusé : ${line}`);
	}
	return d;
}

/** Le style ÉCRAN des morceaux de 𝒞f nommés `label`. */
function painted(figure: Figure, label: string) {
	const el = figure
		.getAllElements()
		.find((e) => e.visible && e.type === 'function' && e.label === label);
	if (el === undefined) throw new Error(`pas de courbe ${label}`);
	return resolveScreenStyle(el, figure.defaults);
}

function synced(atelier: Atelier): AtelierFigure {
	const target = new AtelierFigure();
	syncFigure(atelier, target);
	return target;
}

describe('K4 : la couleur de 𝒞f est celle de sa carte', () => {
	it('une fonction tracée en framboise est peinte avec le jeton du Graphe', () => {
		const d = desk('f(x) = x^2');
		d.atelier.setDisplay('f', { color: 'curve-2' });
		d.atelier.setInFigure('f', true);

		const { figure } = synced(d.atelier);

		expect(painted(figure, 'f').color).toBe(curveColorValue('curve-2'));
		expect(painted(figure, 'f').color).toBe('var(--color-curve-2)');
	});

	it('changer la couleur dans la carte repeint 𝒞f, sans reconstruire la figure', () => {
		const d = desk('f(x) = x^2');
		d.atelier.setDisplay('f', { color: 'curve-1' });
		d.atelier.setInFigure('f', true);
		const target = synced(d.atelier);
		const figure = target.figure;

		d.atelier.setDisplay('f', { color: 'curve-3' });

		expect(syncFigure(d.atelier, target)).toBe('restyled');
		expect(target.figure).toBe(figure);
		expect(painted(figure, 'f').color).toBe('var(--color-curve-3)');
		expect(syncFigure(d.atelier, target)).toBe('unchanged');
	});

	it('le trait suit aussi : pointillés et épaisseur de la carte', () => {
		const d = desk('f(x) = x^2');
		d.atelier.setDisplay('f', { color: 'curve-1', lineStyle: 'dashed', lineWidth: 4 });
		d.atelier.setInFigure('f', true);

		const style = painted(synced(d.atelier).figure, 'f');

		expect(style.dash).toBe('dashed');
		expect(style.strokeWidth).toBe(4);
	});

	it('f′ garde sa propre couleur de carte', () => {
		const d = desk('f(x) = x^2');
		d.atelier.setDisplay('f', { color: 'curve-1' });
		d.runFromPanel('derive', 'f');
		d.atelier.setDisplay("f'", { color: 'curve-4' });
		d.atelier.setInFigure('f', true);
		d.atelier.setInFigure("f'", true);

		const { figure } = synced(d.atelier);

		expect(painted(figure, 'f').color).toBe('var(--color-curve-1)');
		expect(painted(figure, 'f′').color).toBe('var(--color-curve-4)');
	});

	it('une fonction jamais tracée (sans réglages) garde la couleur par défaut', () => {
		const d = desk('f(x) = x^2');
		d.atelier.setInFigure('f', true);

		const { figure } = synced(d.atelier);
		const fresh = synced(desk('d : y = x').atelier).figure;
		const line = fresh.getAllElements().find((e) => e.visible && e.label === 'd')!;

		expect(painted(figure, 'f').color).toBe(resolveScreenStyle(line, fresh.defaults).color);
	});
});
