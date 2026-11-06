/**
 * Bloc ```collection — centaines et milliers (plaques de cent, gros cubes de mille)
 * (phase 0 : `docs/wip/collection-centaines-progress.md`)
 */

import { describe, expect, it } from 'vitest';
import { parseCollectionContent } from '$lib/ubumark/parser/collection-parser';
import { generateCollectionTypst } from '$lib/ubumark/generators/collection-typst';
import {
	buildCollectionScene,
	COLLECTION_VIEW,
	findCollectionItemAt,
	type CollectionItem,
	type CollectionScene
} from '$lib/ubumark/utils/collection-scene';
import {
	addToBuild,
	buildAnswer,
	buildFromAnswer,
	buildLimits,
	buildScene,
	buildValue,
	reservePieces,
	reserveScene,
	solutionBuild
} from '$lib/ubumark/utils/collection-construire';
import type { CollectionNode, CollectionSpec } from '$lib/ubumark/types/collection';

const parse = (...lines: string[]) => parseCollectionContent(lines.join('\n'));
const messages = (node: CollectionNode) => node.errors.map((e) => e.message);

function spec(...lines: string[]): CollectionSpec {
	const node = parse(...lines);
	expect(node.errors).toEqual([]);
	return node.spec!;
}

const scene = (...lines: string[]) => buildCollectionScene(spec(...lines), 0);
const count = (s: CollectionScene, kind: CollectionItem['kind']) =>
	s.items.filter((item) => item.kind === kind).length;
const total = (s: CollectionScene) => s.items.reduce((sum, item) => sum + item.value, 0);

function overlap(a: CollectionItem, b: CollectionItem): boolean {
	return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** Rien ne se chevauche, tout tient dans le cadre, le cadre pas plus large qu'une collection pleine largeur */
function expectClean(s: CollectionScene) {
	const { pad, fullWidth } = COLLECTION_VIEW;
	expect(s.width).toBeLessThanOrEqual(fullWidth + 1e-9);
	for (const [i, a] of s.items.entries()) {
		expect(a.x, `objet ${i} à gauche`).toBeGreaterThanOrEqual(pad - 1e-9);
		expect(a.y, `objet ${i} en haut`).toBeGreaterThanOrEqual(pad - 1e-9);
		expect(a.x + a.width, `objet ${i} à droite`).toBeLessThanOrEqual(s.width - pad + 1e-9);
		expect(a.y + a.height, `objet ${i} en bas`).toBeLessThanOrEqual(s.height - pad + 1e-9);
		for (const [j, b] of s.items.slice(i + 1).entries()) {
			expect(overlap(a, b), `objets ${i} et ${i + 1 + j}`).toBe(false);
		}
	}
}

describe('centaines: et milliers: — analyse', () => {
	it('les quatre rangs, dans n’importe quel ordre (exemple du BO du CE2)', () => {
		const node = parse('unités: 17', 'dizaines: 8', 'centaines: 32', 'milliers: 2');
		expect(node.errors).toEqual([]);
		expect(node.spec?.sets).toEqual([{ thousands: 2, hundreds: 32, tens: 8, units: 17 }]);
		expect(node.spec?.large).toBe(true);
	});

	it('une ligne absente vaut 0, plusieurs collections', () => {
		expect(parse('centaines: 2 ; 4', 'unités: 14 ; 23').spec?.sets).toEqual([
			{ thousands: 0, hundreds: 2, tens: 0, units: 14 },
			{ thousands: 0, hundreds: 4, tens: 0, units: 23 }
		]);
	});

	it('sans accent ni majuscule : Centaines, milliers', () => {
		expect(parse('Centaines: 3').errors).toEqual([]);
	});

	it('un bloc sans centaines ni milliers : rien ne change (pas de grand dessin)', () => {
		const node = parse('dizaines: 3', 'unités: 15');
		expect(node.spec?.sets).toEqual([{ thousands: 0, hundreds: 0, tens: 3, units: 15 }]);
		expect(node.spec?.large).toBeUndefined();
	});

	it('plafonds : milliers 9, centaines 40, dizaines 30, unités 100 (Q4)', () => {
		expect(parse('milliers: 9', 'centaines: 9', 'dizaines: 9', 'unités: 9').errors).toEqual([]);
		expect(parse('centaines: 40').errors).toEqual([]);
		expect(parse('centaines: 1', 'dizaines: 30', 'unités: 100').errors).toEqual([]);
		expect(messages(parse('milliers: 10'))[0]).toMatch(/milliers « 10 » .* 0 à 9/);
		expect(messages(parse('centaines: 41'))[0]).toMatch(/centaines « 41 » .* 0 à 40/);
		expect(messages(parse('centaines: 1', 'dizaines: 31'))[0]).toMatch(/dizaines « 31 » .* 0 à 30/);
	});

	it('valeur totale : 9 999 au plus', () => {
		expect(messages(parse('milliers: 9', 'centaines: 10'))[0]).toMatch(/10 000 .* 9 999 au plus/);
	});

	it('autant de valeurs sur chaque ligne', () => {
		expect(messages(parse('centaines: 2 ; 3', 'unités: 4'))[0]).toMatch(/une par collection/);
	});

	it('refusés avec dessin: paquets (Q2)', () => {
		expect(messages(parse('centaines: 2', 'dessin: paquets'))[0]).toMatch(
			/centaines et milliers : seulement avec dessin: barres/
		);
		expect(messages(parse('milliers: 1', 'dessin: paquets'))).toHaveLength(1);
	});

	it('donnée deux fois', () => {
		expect(messages(parse('centaines: 2', 'centaines: 3'))[0]).toMatch(/déjà donnée ligne 1/);
	});
});

describe('centaines: et milliers: — la scène', () => {
	it('un objet par plaque et par gros cube, chacun à sa valeur', () => {
		const s = scene('milliers: 2', 'centaines: 3', 'dizaines: 4', 'unités: 5');
		expect(count(s, 'gros-cube')).toBe(2);
		expect(count(s, 'plaque')).toBe(3);
		expect(count(s, 'barre')).toBe(4);
		expect(count(s, 'cube')).toBe(5);
		expect(total(s)).toBe(2345);
	});

	it('ordre de lecture : gros cubes, plaques, barres, cubes ; chaque zone sous la précédente', () => {
		const s = scene('milliers: 2', 'centaines: 3', 'dizaines: 4', 'unités: 5');
		const kinds = s.items.map((item) => item.kind);
		expect(kinds).toEqual([
			...Array(2).fill('gros-cube'),
			...Array(3).fill('plaque'),
			...Array(4).fill('barre'),
			...Array(5).fill('cube')
		]);
		const bottom = (kind: string) =>
			Math.max(...s.items.filter((i) => i.kind === kind).map((i) => i.y + i.height));
		const top = (kind: string) =>
			Math.min(...s.items.filter((i) => i.kind === kind).map((i) => i.y));
		expect(top('plaque')).toBeGreaterThan(bottom('gros-cube'));
		expect(top('barre')).toBeGreaterThan(bottom('plaque'));
		expect(top('cube')).toBeGreaterThan(bottom('barre'));
	});

	it('plaque : 10 cubes de côté ; barre : 10 cubes de long, à la même échelle', () => {
		const s = scene('centaines: 1', 'dizaines: 1', 'unités: 1');
		const [plaque, barre, cube] = s.items;
		expect(plaque.width).toBeCloseTo(10 * cube.width);
		expect(plaque.height).toBeCloseTo(10 * cube.width);
		expect(barre.height).toBeCloseTo(10 * cube.width);
	});

	it('collection réduite (Q1) : 4 plaques par rangée, cubes plus petits qu’aujourd’hui', () => {
		const s = scene('centaines: 8');
		expect(new Set(s.items.map((item) => item.y)).size).toBe(2);
		const small = scene('centaines: 1', 'unités: 1').items[1];
		expect(small.width).toBeLessThan(COLLECTION_VIEW.object);
	});

	it.each([
		['milliers: 9', 'centaines: 9', 'dizaines: 9', 'unités: 9'],
		['milliers: 2', 'centaines: 32', 'dizaines: 8', 'unités: 17'],
		['centaines: 40'],
		['centaines: 1', 'dizaines: 30', 'unités: 100'],
		['centaines: 2', 'dizaines: 27', 'unités: 14', 'unités en: rangées'],
		['milliers: 1']
	])('rien ne se chevauche, tout tient : %s', (...lines) => {
		expectClean(scene(...lines));
	});

	it('deux collections d’un bloc : même échelle, même si l’une n’a pas de centaine', () => {
		const s = spec('centaines: 3 ; 0', 'unités: 4 ; 7');
		const a = buildCollectionScene(s, 0).items.at(-1)!;
		const b = buildCollectionScene(s, 1).items.at(-1)!;
		expect(a.width).toBe(b.width);
	});

	it('dessin d’une plaque et d’un gros cube : quadrillage, faces', () => {
		const [grosCube, plaque] = scene('milliers: 1', 'centaines: 1').items;
		expect(plaque.lines).toHaveLength(18);
		expect(grosCube.faces).toHaveLength(3);
		expect(grosCube.lines!.length).toBeGreaterThanOrEqual(3 * 18);
	});

	it('toucher pour marquer : une plaque se désigne', () => {
		const s = scene('centaines: 2', 'unités: 3');
		const plaque = s.items[1];
		expect(findCollectionItemAt(s, { x: plaque.cx, y: plaque.cy })).toBe(1);
	});

	it('un bloc sans centaines garde le dessin d’aujourd’hui', () => {
		const s = scene('dizaines: 3', 'unités: 5', 'unités en: rangées');
		expect(s.items[0].width).toBe(COLLECTION_VIEW.object);
		expect(s.items[0].lines).toBeUndefined();
	});
});

describe('construire: au-delà de 100', () => {
	it('analyse : de 1 à 9 999 ; grand dessin à partir de 100', () => {
		expect(parse('construire: 9999').errors).toEqual([]);
		expect(parse('construire: 235').spec?.large).toBe(true);
		expect(parse('construire: 99').spec?.large).toBeUndefined();
		expect(messages(parse('construire: 10000'))[0]).toMatch(/de 1 à 9 999/);
	});

	it('refusé avec dessin: paquets au-delà de 99 (Q2)', () => {
		expect(messages(parse('construire: 235', 'dessin: paquets'))[0]).toMatch(
			/centaines et milliers : seulement avec dessin: barres/
		);
		expect(parse('construire: 34', 'dessin: paquets').errors).toEqual([]);
	});

	it('centaines: et milliers: sans objet avec construire:', () => {
		expect(messages(parse('construire: 235', 'centaines: 2'))[0]).toMatch(
			/centaines : sans objet avec construire/
		);
	});

	it('réserve déduite de la valeur (Q3)', () => {
		expect(reservePieces(34)).toEqual(['tens', 'units']);
		expect(reservePieces(235)).toEqual(['hundreds', 'tens', 'units']);
		expect(reservePieces(2435)).toEqual(['thousands', 'hundreds', 'tens', 'units']);
		expect(reserveScene('barres', 2435).items.map((i) => i.kind)).toEqual([
			'gros-cube',
			'plaque',
			'barre',
			'cube'
		]);
		expect(reserveScene('barres', 34).items.map((i) => i.kind)).toEqual(['barre', 'cube']);
	});

	it('seule la valeur est jugée : 2 plaques + 3 barres + 5 cubes = 23 barres + 5 cubes = 235', () => {
		const a = { thousands: 0, hundreds: 2, tens: 3, units: 5 };
		const b = { thousands: 0, hundreds: 0, tens: 23, units: 5 };
		expect(buildAnswer(a)).toBe('235');
		expect(buildAnswer(b)).toBe('235');
		expect(buildValue({ thousands: 2, hundreds: 4, tens: 3, units: 5 })).toBe(2435);
	});

	it('corrigé : le moins d’objets', () => {
		expect(solutionBuild(2435)).toEqual({ thousands: 2, hundreds: 4, tens: 3, units: 5 });
		expect(solutionBuild(34)).toEqual({ thousands: 0, hundreds: 0, tens: 3, units: 4 });
	});

	it('plafonds du plan : ceux d’aujourd’hui sous 100, ceux du bloc au-delà', () => {
		expect(buildLimits(34)).toEqual({ thousands: 0, hundreds: 0, tens: 10, units: 100 });
		expect(buildLimits(235)).toEqual({ thousands: 0, hundreds: 40, tens: 30, units: 100 });
		expect(buildLimits(2435)).toEqual({ thousands: 9, hundreds: 40, tens: 30, units: 100 });
		const full = { thousands: 0, hundreds: 40, tens: 0, units: 0 };
		expect(addToBuild(full, 'hundreds', buildLimits(235))).toBe(full);
		expect(addToBuild(full, 'thousands', buildLimits(235))).toBe(full);
	});

	it('remonté avec une seule valeur : redessiné dans les rangs de la réserve', () => {
		expect(buildFromAnswer('235', 235)).toEqual({ thousands: 0, hundreds: 2, tens: 3, units: 5 });
		expect(buildFromAnswer('2435', 2435)).toEqual({ thousands: 2, hundreds: 4, tens: 3, units: 5 });
		expect(buildFromAnswer('235', 34)).toEqual({ thousands: 0, hundreds: 0, tens: 10, units: 100 });
		expect(buildFromAnswer('', 235)).toEqual({ thousands: 0, hundreds: 0, tens: 0, units: 0 });
	});

	it('la scène du plan, à la même échelle que la réserve', () => {
		const s = buildScene('barres', { thousands: 1, hundreds: 2, tens: 3, units: 4 }, true);
		expect(total(s)).toBe(1234);
		expectClean(s);
		expect(reserveScene('barres', 1234).items.at(-1)!.width).toBe(s.items.at(-1)!.width);
	});
});

describe('centaines: et milliers: — PDF', () => {
	it('une plaque : son carré et son quadrillage ; un gros cube : trois faces', () => {
		const text = generateCollectionTypst(parse('milliers: 1', 'centaines: 1'));
		expect((text.match(/polygon\(/g) ?? []).length).toBe(3);
		expect((text.match(/line\(/g) ?? []).length).toBeGreaterThanOrEqual(18 + 3 * 18);
	});

	it('taille par défaut plus grande : 12 cm pleine largeur', () => {
		const s = buildCollectionScene(spec('centaines: 8'), 0);
		const text = generateCollectionTypst(parse('centaines: 8'));
		const width = Number(/#box\(width: ([\d.]+)cm/.exec(text)![1]);
		expect(width).toBeCloseTo((12 * s.width) / COLLECTION_VIEW.fullWidth, 3);
	});

	it('un grand bloc ne dépasse jamais 20 cm de haut (revue : jusqu’à 47 cm sinon)', () => {
		const text = generateCollectionTypst(parse('centaines: 40', 'dizaines: 30', 'unités: 100'));
		const height = Number(/#box\(width: [\d.]+cm, height: ([\d.]+)cm/.exec(text)![1]);
		expect(height).toBeLessThanOrEqual(20 + 1e-6);
		expect(height).toBeGreaterThan(19);
	});

	it('construire: 2 435 : cadre carré de 12 cm, la place de dessiner la réponse', () => {
		const text = generateCollectionTypst(parse('construire: 2435'));
		expect(text).toMatch(/#box\(width: 12cm, height: 12cm, stroke: \(paint/);
		expect(generateCollectionTypst(parse('construire: 34'))).toMatch(
			/#box\(width: 8cm, height: 4.8cm, stroke: \(paint/
		);
	});

	it('construire: 2 435 : la réserve montre gros cube, plaque, barre et cube', () => {
		const text = generateCollectionTypst(parse('construire: 2435'));
		expect((text.match(/polygon\(/g) ?? []).length).toBe(3);
		expect(text).not.toMatch(/2435|2 435/);
	});
});
