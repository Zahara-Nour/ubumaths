/**
 * Bloc ```collection — la scène (phase 0 : `docs/wip/collection-progress.md` § 2, 5, 6)
 *
 * Position de chaque objet, calculée une fois pour l'écran et le PDF : quantités
 * exactes, rien ne se chevauche, tout tient dans le cadre, et le vrac est
 * déterministe (même bloc → même dessin) sans être rangé.
 */

import { describe, expect, it } from 'vitest';
import { parseCollectionContent } from '$lib/ubumark/parser/collection-parser';
import {
	buildCollectionScene,
	COLLECTION_VIEW,
	findCollectionItemAt,
	type CollectionItem,
	type CollectionScene
} from '$lib/ubumark/utils/collection-scene';
import type { CollectionSpec } from '$lib/ubumark/types/collection';

function spec(...lines: string[]): CollectionSpec {
	const node = parseCollectionContent(lines.join('\n'));
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

/** Aucun objet n'en chevauche un autre, et tous restent dans le cadre */
function expectClean(s: CollectionScene) {
	const { pad } = COLLECTION_VIEW;
	for (const [i, a] of s.items.entries()) {
		expect(a.x, `objet ${i} à gauche`).toBeGreaterThanOrEqual(pad - 1e-9);
		expect(a.y, `objet ${i} en haut`).toBeGreaterThanOrEqual(pad - 1e-9);
		expect(a.x + a.width, `objet ${i} à droite`).toBeLessThanOrEqual(s.width - pad + 1e-9);
		expect(a.y + a.height, `objet ${i} en bas`).toBeLessThanOrEqual(s.height - pad + 1e-9);
		for (const b of s.items.slice(i + 1)) expect(overlap(a, b)).toBe(false);
	}
	expect(s.width).toBeLessThanOrEqual(COLLECTION_VIEW.fullWidth);
}

describe('collection-scene — quantités exactes', () => {
	it('vrac de 23 jetons en paquets : 23 jetons, rien d’autre (comportement 1)', () => {
		const s = scene('unités: 23', 'dessin: paquets');
		expect(count(s, 'jeton')).toBe(23);
		expect(s.items).toHaveLength(23);
		expect(total(s)).toBe(23);
	});

	it('4 paquets + 7 jetons : chaque paquet vaut 10 et contient 10 jetons (comportement 2)', () => {
		const s = scene('dizaines: 4', 'unités: 7', 'dessin: paquets');
		expect(count(s, 'paquet')).toBe(4);
		expect(count(s, 'jeton')).toBe(7);
		expect(total(s)).toBe(47);
		for (const paquet of s.items.filter((item) => item.kind === 'paquet')) {
			expect(paquet.value).toBe(10);
			expect(paquet.jetons).toHaveLength(10);
			for (const j of paquet.jetons ?? []) {
				expect(j.cx).toBeGreaterThan(paquet.x);
				expect(j.cx).toBeLessThan(paquet.x + paquet.width);
				expect(j.cy).toBeGreaterThan(paquet.y);
				expect(j.cy).toBeLessThan(paquet.y + paquet.height);
			}
		}
	});

	it('3 barres + 5 cubes : barres de dix cubes (comportement 3)', () => {
		const s = scene('dizaines: 3', 'unités: 5');
		expect(count(s, 'barre')).toBe(3);
		expect(count(s, 'cube')).toBe(5);
		expect(total(s)).toBe(35);
		const barre = s.items.find((item) => item.kind === 'barre')!;
		const cube = s.items.find((item) => item.kind === 'cube')!;
		// Une barre = 10 cubes empilés : même largeur, 10 fois la hauteur
		expect(barre.width).toBeCloseTo(cube.width);
		expect(barre.height).toBeCloseTo(10 * cube.height);
	});

	it('groupement partiel 3 barres + 15 cubes (comportement 4)', () => {
		const s = scene('dizaines: 3', 'unités: 15');
		expect(count(s, 'barre')).toBe(3);
		expect(count(s, 'cube')).toBe(15);
		expect(total(s)).toBe(45);
	});

	it('les groupes d’abord, puis les objets isolés (ordre de lecture)', () => {
		const s = scene('dizaines: 2', 'unités: 4');
		expect(s.items.map((item) => item.kind)).toEqual([
			'barre',
			'barre',
			'cube',
			'cube',
			'cube',
			'cube'
		]);
	});
});

describe('collection-scene — rien ne se chevauche, tout tient', () => {
	it.each([
		['unités: 1'],
		['unités: 23'],
		['unités: 100'],
		['unités: 100', 'dessin: paquets'],
		['dizaines: 10'],
		['dizaines: 10', 'dessin: paquets'],
		['dizaines: 3', 'unités: 15'],
		['dizaines: 4', 'unités: 60', 'dessin: paquets'],
		['dizaines: 2', 'unités: 38', 'unités en: rangées'],
		['unités: 100', 'unités en: rangées', 'dessin: paquets']
	])('%s', (...lines) => {
		expectClean(scene(...lines));
	});

	it('vrac : les objets sont espacés d’au moins une fois et demie leur taille', () => {
		const s = scene('unités: 60', 'dessin: paquets');
		const jetons = s.items;
		for (const [i, a] of jetons.entries()) {
			for (const b of jetons.slice(i + 1)) {
				const d = Math.hypot(a.cx - b.cx, a.cy - b.cy);
				expect(d).toBeGreaterThanOrEqual(1.5 * a.width - 1e-9);
			}
		}
	});

	it('collection vide : un cadre sans objet (limite 9)', () => {
		const s = scene('unités: 0');
		expect(s.items).toEqual([]);
		expect(s.width).toBeGreaterThan(2 * COLLECTION_VIEW.pad);
		expect(s.height).toBeGreaterThan(2 * COLLECTION_VIEW.pad);
	});

	it('10 barres tiennent sur une ligne (limite 10)', () => {
		const s = scene('dizaines: 10');
		expect(new Set(s.items.map((item) => item.y)).size).toBe(1);
	});
});

describe('collection-scene — vrac déterministe, pas rangé (comportement 8, décision 6)', () => {
	it('même bloc → même dessin', () => {
		expect(scene('unités: 37')).toEqual(scene('unités: 37'));
		expect(scene('dizaines: 2', 'unités: 14')).toEqual(scene('dizaines: 2', 'unités: 14'));
	});

	it('la taille et les légendes ne changent pas le désordre (QCM imprimé = écran)', () => {
		const positions = (...lines: string[]) =>
			scene(...lines).items.map((item) => [item.cx, item.cy]);
		expect(positions('unités: 23', 'taille: 3cm')).toEqual(positions('unités: 23'));
		expect(positions('unités: 23', 'légendes: Léa')).toEqual(positions('unités: 23'));
	});

	it('deux collections identiques d’un même bloc ne sont pas dessinées pareil', () => {
		const s = spec('unités: 12 ; 12');
		const a = buildCollectionScene(s, 0).items.map((item) => [item.cx, item.cy]);
		const b = buildCollectionScene(s, 1).items.map((item) => [item.cx, item.cy]);
		expect(a).not.toEqual(b);
	});

	it('le vrac ne forme pas de lignes : jamais 3 objets à la même hauteur', () => {
		const s = scene('unités: 40', 'dessin: paquets');
		const heights = new Map<number, number>();
		for (const item of s.items) heights.set(item.cy, (heights.get(item.cy) ?? 0) + 1);
		expect(Math.max(...heights.values())).toBeLessThan(3);
	});
});

describe('collection-scene — rangées de 5 + 5', () => {
	it('23 cubes en rangées : 10, 10, 3, un écart plus grand après le 5e', () => {
		const s = scene('unités: 23', 'unités en: rangées');
		const rows = [...new Set(s.items.map((item) => item.cy))];
		expect(rows.map((y) => s.items.filter((item) => item.cy === y).length)).toEqual([10, 10, 3]);
		const first = s.items.slice(0, 10).map((item) => item.cx);
		const gaps = first.slice(1).map((x, i) => x - first[i]);
		expect(gaps[4]).toBeGreaterThan(gaps[0]);
		expect(new Set(gaps.filter((_, i) => i !== 4)).size).toBe(1);
	});
});

describe('collection-scene — même échelle pour toutes les collections', () => {
	it('un cube a la même taille dans une petite et une grande collection', () => {
		const small = scene('unités: 2');
		const big = scene('dizaines: 5', 'unités: 30');
		expect(small.items[0].width).toBe(big.items.at(-1)!.width);
		expect(small.width).toBeLessThan(big.width);
	});
});

describe('findCollectionItemAt — toucher pour marquer (décision 2)', () => {
	it('un point sur un objet le désigne', () => {
		const s = scene('dizaines: 2', 'unités: 9');
		for (const [i, item] of s.items.entries()) {
			expect(findCollectionItemAt(s, { x: item.cx, y: item.cy })).toBe(i);
		}
	});

	it('un point un peu à côté d’un objet le désigne encore (cible large pour le doigt)', () => {
		const s = scene('unités: 1');
		const item = s.items[0];
		expect(findCollectionItemAt(s, { x: item.x + item.width + 4, y: item.cy })).toBe(0);
	});

	it('un point loin de tout : rien', () => {
		const s = scene('unités: 1');
		expect(findCollectionItemAt(s, { x: -50, y: -50 })).toBeNull();
	});
});
