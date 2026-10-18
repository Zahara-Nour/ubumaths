/**
 * 𝒞f dans la vue Géométrie (géométrie v2, lot 1, PR 3 — K1, K2, K3 de
 * `docs/wip/atelier-geometrie-phase0.md`) : l'action de carte « Afficher dans
 * Géométrie », son état `inFigure` (rangé), et le tracé par `syncFigure`.
 *
 * On asserte le DESSIN (coordonnées SVG rendues par les primitives de la toile).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { actionsFor } from '../actions';
import { AtelierFigure, syncFigure } from '../figure-sync';
import { ATELIER_STATE_VERSION } from '../persistence';
import { mergeInto } from '../merge';
import { atelierFileToJson, readAtelierFile } from '../atelier-file';
import { historyToJson } from '../history-export';
import { readHistory } from '../history-import';
import { isFunction } from '../types';
import type { Figure } from '$lib/geometry-core/graph/figure';
import { createTransformer } from '$lib/geometry-core/viewport/viewport';
import { functionToSVG } from '$lib/geometry-core/rendering/svg-primitives';

// =============================================================================
// Décor
// =============================================================================

const DIMS = { width: 400, height: 400 };
const TRANSFORMER = createTransformer({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 }, 400, 400);
const NOW = new Date('2026-10-18T10:00:00Z');

function desk(...lines: string[]): CalcDesk {
	const d = new CalcDesk(new Atelier());
	for (const line of lines) {
		d.submit(line);
		if (d.entries.at(-1)?.failed) throw new Error(`refusé : ${line}`);
	}
	return d;
}

function inFigure(atelier: Atelier, name: string): boolean {
	const object = atelier.get(name);
	return object !== undefined && isFunction(object) && object.inFigure === true;
}

function figureAction(atelier: Atelier, name: string) {
	const object = atelier.get(name)!;
	return actionsFor(object, atelier).find((a) => a.id === 'figure');
}

/** Les chemins SVG des courbes de fonction nommées `label`. */
function paths(figure: Figure, label: string): string[] {
	return figure
		.getAllElements()
		.filter((el) => el.visible && el.type === 'function' && el.label === label)
		.flatMap((el) => {
			const svg = functionToSVG(el.id, figure, TRANSFORMER, DIMS);
			return svg === null ? [] : [svg.path];
		});
}

/**
 * Les points PAR OÙ passe un chemin SVG : les points d'arrivée de `M`, `L` et le
 * dernier couple de chaque `C` — jamais les points de contrôle d'une courbe de
 * Bézier, qui ne sont pas sur le tracé.
 */
function onPath(path: string): [number, number][][] {
	const subpaths: [number, number][][] = [];
	for (const [, command, args] of path.matchAll(/([MLC])([^MLCZ]*)/gi)) {
		const numbers = [...args.matchAll(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g)].map((m) => Number(m[0]));
		const pairs: [number, number][] = [];
		for (let i = 0; i + 1 < numbers.length; i += 2) pairs.push([numbers[i], numbers[i + 1]]);
		if (command.toUpperCase() === 'M') subpaths.push([]);
		const current = subpaths.at(-1);
		if (current === undefined) continue;
		if (command.toUpperCase() === 'C') {
			// Par groupes de trois couples : le troisième est le point d'arrivée
			for (let i = 2; i < pairs.length; i += 3) current.push(pairs[i]);
		} else current.push(...pairs);
	}
	return subpaths;
}

/** Distance du point p au segment [a ; b]. */
function toSegment(p: [number, number], a: [number, number], b: [number, number]): number {
	const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
	const length = dx * dx + dy * dy;
	const t =
		length === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length));
	return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Le nombre de sous-chemins (`M`) du tracé de `label`. */
function subpaths(figure: Figure, label: string): number {
	return paths(figure, label).reduce((n, path) => n + (path.match(/M/gi)?.length ?? 0), 0);
}

/** Le tracé de `label` passe-t-il à 2 px du point (x ; y) ? */
function passesNear(figure: Figure, label: string, x: number, y: number): boolean {
	const target = TRANSFORMER.mathToSvg(x, y);
	const p: [number, number] = [target.x, target.y];
	// La ligne brisée des points d'arrivée, sous-chemin par sous-chemin
	return paths(figure, label).some((path) =>
		onPath(path).some((points) =>
			points.some((point, i) =>
				i === 0 ? toSegment(p, point, point) <= 2 : toSegment(p, points[i - 1], point) <= 2
			)
		)
	);
}

/** La plus petite abscisse (mathématique) atteinte par le tracé de `label`. */
function leftmost(figure: Figure, label: string): number {
	const xs = paths(figure, label).flatMap((path) =>
		onPath(path)
			.flat()
			.map(([px, py]) => TRANSFORMER.svgToMath(px, py).x)
	);
	return Math.min(...xs);
}

function synced(atelier: Atelier): AtelierFigure {
	const target = new AtelierFigure();
	syncFigure(atelier, target);
	return target;
}

// =============================================================================
// K1 : l'action de carte
// =============================================================================

describe('K1 : « Afficher dans Géométrie »', () => {
	it('une fonction ok propose « Afficher dans Géométrie », active', () => {
		const d = desk('f(x) = x^2');

		expect(figureAction(d.atelier, 'f')).toEqual({
			id: 'figure',
			label: 'Afficher dans Géométrie'
		});
	});

	it('le geste écrit sa ligne dans Calcul et bascule en « Retirer de Géométrie »', () => {
		const d = desk('f(x) = x^2');

		d.runFromPanel('figure', 'f');
		expect(inFigure(d.atelier, 'f')).toBe(true);
		expect(d.entries.at(-1)?.label).toBe('Afficher dans Géométrie f');
		expect(figureAction(d.atelier, 'f')?.label).toBe('Retirer de Géométrie');

		d.runFromPanel('figure', 'f');
		expect(inFigure(d.atelier, 'f')).toBe(false);
		expect(d.entries.at(-1)?.label).toBe('Retirer de Géométrie f');
	});

	it('invariant 9 : une fonction en attente garde l’action, désactivée avec sa raison', () => {
		const d = desk('f(x) = b x');

		const action = figureAction(d.atelier, 'f');
		expect(action?.label).toBe('Afficher dans Géométrie');
		expect(action?.disabledReason).toBe(d.atelier.get('f')?.message);
	});

	it('« Retirer de Géométrie » reste possible quand la fonction casse', () => {
		const d = desk('f(x) = x^2');
		d.runFromPanel('figure', 'f');
		d.atelier.update('f', 'b x', 'text');

		expect(figureAction(d.atelier, 'f')).toEqual({ id: 'figure', label: 'Retirer de Géométrie' });
	});

	it('le geste se rejoue depuis l’historique exporté', () => {
		const d = desk('f(x) = x^2');
		d.runFromPanel('figure', 'f');
		const read = readHistory(historyToJson(d.entries, NOW));
		if (!read.ok) throw new Error(read.message);

		const fresh = new CalcDesk(new Atelier());
		fresh.replay(read.history);

		expect(inFigure(fresh.atelier, 'f')).toBe(true);
	});

	it('K3 : f′ et f⁻¹ ont la même action', () => {
		const d = desk('f(x) = 2x + 1');
		d.runFromPanel('derive', 'f');
		d.runFromPanel('reciprocal', 'f');

		expect(figureAction(d.atelier, "f'")?.label).toBe('Afficher dans Géométrie');
		expect(figureAction(d.atelier, 'f^-1')?.label).toBe('Afficher dans Géométrie');
	});
});

// =============================================================================
// Rangé : sauvegarde, fichier, fusion
// =============================================================================

describe('K1 : `inFigure` est rangé', () => {
	it('la sauvegarde le garde, la relecture le rend (version 4)', () => {
		const d = desk('f(x) = x^2');
		d.atelier.setInFigure('f', true);
		const stored = d.atelier.serialize();
		expect(stored.version).toBe(4);
		expect(ATELIER_STATE_VERSION).toBe(4);

		const fresh = new Atelier();
		fresh.restore(stored);

		expect(inFigure(fresh, 'f')).toBe(true);
	});

	it('un atelier de version 3, sans le champ, se relit sans perte', () => {
		const fresh = new Atelier();
		fresh.restore({
			version: 3,
			objects: [{ name: 'f', kind: 'function', definition: 'x^2', plotted: true }]
		});

		expect(fresh.get('f')?.status).toBe('ok');
		expect(fresh.get('f')?.plotted).toBe(true);
		expect(inFigure(fresh, 'f')).toBe(false);
	});

	it('une fonction non affichée ne paie rien dans la sauvegarde', () => {
		const d = desk('f(x) = x^2');

		expect(JSON.stringify(d.atelier.serialize())).not.toContain('inFigure');
	});

	it('le fichier .atelier.json le garde', () => {
		const d = desk('f(x) = x^2');
		d.atelier.setInFigure('f', true);
		const read = readAtelierFile(atelierFileToJson(d.atelier.serialize(), d.entries, [], NOW));
		if (read.kind !== 'atelier') throw new Error(read.kind);

		const fresh = new Atelier();
		fresh.restore(read.state);
		expect(inFigure(fresh, 'f')).toBe(true);
	});

	it('la fusion d’un atelier reçu le garde, sous le nom d’arrivée', () => {
		const received = desk('f(x) = x^2');
		received.atelier.setInFigure('f', true);
		const mine = desk('f(x) = x');

		const report = mergeInto(mine.atelier, received.atelier.serialize());

		const arrived = report.renamed.find((r) => r.from === 'f')?.to;
		expect(arrived).toBeDefined();
		expect(inFigure(mine.atelier, arrived!)).toBe(true);
		expect(inFigure(mine.atelier, 'f')).toBe(false);
	});
});

// =============================================================================
// Le tracé dans la vue Géométrie
// =============================================================================

describe('𝒞f dans la vue Géométrie', () => {
	it('une fonction affichée est tracée, nommée comme sur sa carte', () => {
		const d = desk('f(x) = x^2');
		d.atelier.setInFigure('f', true);

		const { figure } = synced(d.atelier);

		expect(passesNear(figure, 'f', 2, 4)).toBe(true);
		expect(passesNear(figure, 'f', 2, 3)).toBe(false);
	});

	it('une fonction qui n’est pas affichée n’est pas tracée', () => {
		const d = desk('f(x) = x^2');

		const { figure } = synced(d.atelier);

		expect(figure.getAllElements().filter((el) => el.visible)).toEqual([]);
	});

	it('F5 : une fonction en attente n’est pas tracée ; b posé, elle apparaît', () => {
		const d = desk('f(x) = b x');
		d.atelier.setInFigure('f', true);
		const target = synced(d.atelier);
		expect(paths(target.figure, 'f')).toEqual([]);

		d.submit('b = 2');
		syncFigure(d.atelier, target);

		expect(passesNear(target.figure, 'f', 1, 2)).toBe(true);
	});

	it('S2 : f(x) = a x² suit a sans reconstruire la figure', () => {
		const d = desk('a = 2', 'f(x) = a x^2');
		d.atelier.setInFigure('f', true);
		const target = synced(d.atelier);
		const figure = target.figure;

		d.atelier.slideTo('a', 3);

		expect(syncFigure(d.atelier, target)).toBe('moved');
		expect(target.figure).toBe(figure);
		expect(passesNear(figure, 'f', 1, 3)).toBe(true);
		expect(passesNear(figure, 'f', 1, 2)).toBe(false);
	});

	it('K2 : la restriction « sur [0 ; 2] » est respectée', () => {
		const d = desk('f(x) = x^2 sur [0;2]');
		d.atelier.setInFigure('f', true);

		const { figure } = synced(d.atelier);

		expect(passesNear(figure, 'f', 1, 1)).toBe(true);
		expect(passesNear(figure, 'f', -1, 1)).toBe(false);
		expect(passesNear(figure, 'f', 2.5, 6.25)).toBe(false);
	});

	it('K2 : l’ensemble hérité (g(x) = f(x) + 1, f sur [0 ; 2]) est respecté', () => {
		const d = desk('f(x) = x^2 sur [0;2]', 'g(x) = f(x) + 1');
		d.atelier.setInFigure('g', true);

		const { figure } = synced(d.atelier);

		expect(passesNear(figure, 'g', 1, 2)).toBe(true);
		expect(passesNear(figure, 'g', -1, 2)).toBe(false);
	});

	it('K3 : f′ est tracée sous son nom f′ et suit f', () => {
		const d = desk('f(x) = x^2');
		d.runFromPanel('derive', 'f');
		d.atelier.setInFigure("f'", true);
		const target = synced(d.atelier);
		expect(passesNear(target.figure, 'f′', 1, 2)).toBe(true);

		d.atelier.update('f', 'x^3', 'text');
		syncFigure(d.atelier, target);

		expect(passesNear(target.figure, 'f′', 1, 3)).toBe(true);
	});

	it('K3 : f⁻¹ est tracée sous son nom f⁻¹ et suit f', () => {
		const d = desk('f(x) = 2x + 1');
		d.runFromPanel('reciprocal', 'f');
		d.atelier.setInFigure('f^-1', true);
		const target = synced(d.atelier);
		expect(passesNear(target.figure, 'f⁻¹', 3, 1)).toBe(true);

		d.atelier.update('f', '2x + 3', 'text');
		syncFigure(d.atelier, target);

		expect(passesNear(target.figure, 'f⁻¹', 5, 1)).toBe(true);
	});
});

// =============================================================================
// Revue de la PR 3
// =============================================================================

describe('revue de la PR 3', () => {
	it('1/x : deux morceaux de tracé, aucun trait à travers l’asymptote', () => {
		const d = desk('f(x) = 1/x');
		d.atelier.setInFigure('f', true);

		const { figure } = synced(d.atelier);

		expect(subpaths(figure, 'f')).toBe(2);
		expect(passesNear(figure, 'f', 2, 0.5)).toBe(true);
		expect(passesNear(figure, 'f', -2, -0.5)).toBe(true);
	});

	it('ln x : le tracé part de x > 0', () => {
		const d = desk('f(x) = ln(x)');
		d.atelier.setInFigure('f', true);

		const { figure } = synced(d.atelier);

		expect(passesNear(figure, 'f', Math.E, 1)).toBe(true);
		// Rien à gauche de l'axe des ordonnées (au pixel près : x = e⁻¹⁰ s'écrit 0)
		expect(leftmost(figure, 'f')).toBeGreaterThanOrEqual(0);
		expect(passesNear(figure, 'f', -1, 0)).toBe(false);
	});

	it('rejeu : Afficher, Retirer, Afficher — même état final et mêmes lignes', () => {
		const d = desk('f(x) = x^2');
		d.runFromPanel('figure', 'f');
		d.runFromPanel('figure', 'f');
		d.runFromPanel('figure', 'f');
		const read = readHistory(historyToJson(d.entries, NOW));
		if (!read.ok) throw new Error(read.message);

		const fresh = new CalcDesk(new Atelier());
		fresh.replay(read.history);

		expect(inFigure(fresh.atelier, 'f')).toBe(true);
		const lines = (x: CalcDesk) => x.entries.map((e) => [e.label, e.text]);
		expect(lines(fresh)).toEqual(lines(d));
	});

	it('invariant 9 : une fonction en ERREUR garde l’action, désactivée avec sa raison', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x +' }, 'text');
		expect(atelier.get('f')?.status).toBe('error');

		const action = figureAction(atelier, 'f');
		expect(action?.label).toBe('Afficher dans Géométrie');
		expect(action?.disabledReason).toBe(atelier.get('f')?.message);
	});

	it('invariant 9 : f′ dont f est passée en erreur garde l’action, désactivée avec sa raison', () => {
		const d = desk('f(x) = x^2');
		d.runFromPanel('derive', 'f');
		d.atelier.update('f', 'x +', 'text');
		expect(d.atelier.get("f'")?.status).not.toBe('ok');

		const action = figureAction(d.atelier, "f'");
		expect(action?.label).toBe('Afficher dans Géométrie');
		expect(action?.disabledReason).toBeTruthy();
		expect(action?.disabledReason).toBe(d.atelier.get("f'")?.message);
	});
});
