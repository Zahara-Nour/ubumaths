/**
 * Bloc ```monnaie — la scène (phase 0 : `docs/wip/monnaie-progress.md` § 2, 5)
 *
 * Position de chaque coupure, calculée une fois pour l'écran et le PDF : les
 * valeurs exactes, rien ne se chevauche, tout tient dans le cadre, et le
 * mélange est déterministe (même bloc → même dessin) sans être rangé.
 */

import { describe, expect, it } from 'vitest';
import { parseMonnaieContent } from '$lib/ubumark/parser/monnaie-parser';
import {
	buildMonnaieScene,
	findMonnaieItemAt,
	MONNAIE_VIEW,
	type MonnaieItem,
	type MonnaieScene
} from '$lib/ubumark/utils/monnaie-scene';
import type { MonnaieSpec } from '$lib/ubumark/types/monnaie';

function spec(...lines: string[]): MonnaieSpec {
	const node = parseMonnaieContent(lines.join('\n'));
	expect(node.errors).toEqual([]);
	return node.spec!;
}

const scene = (...lines: string[]) => buildMonnaieScene(spec(...lines), 0);
const total = (s: MonnaieScene) => s.items.reduce((sum, item) => sum + item.value, 0);
const values = (s: MonnaieScene, kind: MonnaieItem['kind']) =>
	s.items.filter((item) => item.kind === kind).map((item) => item.value);

function overlap(a: MonnaieItem, b: MonnaieItem): boolean {
	return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** Aucune coupure n'en chevauche une autre, et toutes restent dans le cadre */
function expectClean(s: MonnaieScene) {
	const { pad } = MONNAIE_VIEW;
	for (const [i, a] of s.items.entries()) {
		expect(a.x, `coupure ${i} à gauche`).toBeGreaterThanOrEqual(pad - 1e-9);
		expect(a.y, `coupure ${i} en haut`).toBeGreaterThanOrEqual(pad - 1e-9);
		expect(a.x + a.width, `coupure ${i} à droite`).toBeLessThanOrEqual(s.width - pad + 1e-9);
		expect(a.y + a.height, `coupure ${i} en bas`).toBeLessThanOrEqual(s.height - pad + 1e-9);
		for (const b of s.items.slice(i + 1)) expect(overlap(a, b), `${i} chevauche`).toBe(false);
	}
	expect(s.width).toBeLessThanOrEqual(MONNAIE_VIEW.fullWidth);
}

describe('monnaie-scene — les coupures du bloc, rien d’autre', () => {
	it('47 € : billets en haut, pièces dessous, du plus grand au plus petit (nominal 1)', () => {
		const s = scene('billets: 10 20 10', 'pièces: 1 2 2 2');
		expect(total(s)).toBe(47);
		expect(s.items.map((item) => [item.kind, item.value])).toEqual([
			['billet', 20],
			['billet', 10],
			['billet', 10],
			['piece', 2],
			['piece', 2],
			['piece', 2],
			['piece', 1]
		]);
		const lowestNote = Math.max(
			...s.items.filter((i) => i.kind === 'billet').map((i) => i.y + i.height)
		);
		for (const coin of s.items.filter((i) => i.kind === 'piece')) {
			expect(coin.y).toBeGreaterThan(lowestNote);
		}
	});

	it('mélangé : les mêmes coupures, dans un autre ordre (nominal 2)', () => {
		const lines = ['billets: 20 10 10 5 5', 'pièces: 2 2 2 1 1 1'];
		const mixed = scene(...lines, 'disposition: mélangé');
		expect(total(mixed)).toBe(total(scene(...lines)));
		expect([...values(mixed, 'billet')].sort()).toEqual(
			[...values(scene(...lines), 'billet')].sort()
		);
		expect(values(mixed, 'billet')).not.toEqual([20, 10, 10, 5, 5]);
		expect(values(mixed, 'piece')).not.toEqual([2, 2, 2, 1, 1, 1]);
	});

	it('plus la valeur est grande, plus la coupure est grande', () => {
		const big = spec('billets: 100 ; 50 20 10 5');
		const notes = [...buildMonnaieScene(big, 0).items, ...buildMonnaieScene(big, 1).items];
		for (let i = 1; i < notes.length; i++) {
			expect(notes[i].width).toBeLessThan(notes[i - 1].width);
			expect(notes[i].height).toBe(notes[0].height);
		}
		const [deux, un] = scene('pièces: 2 1').items;
		expect(deux.width).toBeGreaterThan(un.width);
		// Un billet est plus long qu'une pièce n'est large
		expect(notes.at(-1)!.width).toBeGreaterThan(deux.width);
	});

	it('montant: dessine sa décomposition', () => {
		expect(total(scene('montant: 48'))).toBe(48);
	});
});

describe('monnaie-scene — rien ne se chevauche, tout tient', () => {
	it.each([
		['pièces: 1'],
		['billets: 100'],
		['billets: 50 20 20 10'],
		['billets: 6×5 4×10'],
		['pièces: 30×1'],
		['pièces: 30×2'],
		['pièces: 30×2', 'disposition: mélangé'],
		['pièces: 15×2 15×1', 'disposition: mélangé'],
		['billets: 5×10 2×20', 'disposition: mélangé'],
		['billets: 20 10 5', 'pièces: 2 2 1', 'disposition: mélangé'],
		['montant: 99']
	])('%s', (...lines) => {
		expectClean(scene(...lines));
	});

	it('mélangé, beaucoup de graines : jamais de chevauchement', () => {
		for (let n = 1; n <= 30; n++) {
			expectClean(
				scene(`pièces: ${Math.ceil(n / 2)}×2 ${Math.floor(n / 2)}×1`, 'disposition: mélangé')
			);
		}
	});

	it('ensemble vide : un cadre sans coupure (limite 9)', () => {
		const s = scene('billets:');
		expect(s.items).toEqual([]);
		expect(s.width).toBeGreaterThan(2 * MONNAIE_VIEW.pad);
		expect(s.height).toBeGreaterThan(2 * MONNAIE_VIEW.pad);
	});

	it('beaucoup de billets passent à la ligne', () => {
		const s = scene('billets: 6×10');
		expect(new Set(s.items.map((item) => item.y)).size).toBeGreaterThan(1);
	});
});

describe('monnaie-scene — mélange déterministe (nominal 8)', () => {
	it('même bloc → même dessin', () => {
		const lines = ['billets: 20 10 5', 'pièces: 2 2 1', 'disposition: mélangé'];
		expect(scene(...lines)).toEqual(scene(...lines));
	});

	it('la taille et les légendes ne changent pas le mélange (QCM imprimé = écran)', () => {
		const positions = (...lines: string[]) =>
			scene(...lines).items.map((item) => [item.value, item.cx, item.cy]);
		const base = ['pièces: 5×2 4×1', 'disposition: mélangé'];
		expect(positions(...base, 'taille: 3cm')).toEqual(positions(...base));
		expect(positions(...base, 'légendes: Léa')).toEqual(positions(...base));
	});

	it('deux ensembles identiques d’un même bloc ne sont pas dessinés pareil', () => {
		const s = spec('pièces: 5×2 ; 5×2', 'disposition: mélangé');
		const a = buildMonnaieScene(s, 0).items.map((item) => [item.cx, item.cy]);
		const b = buildMonnaieScene(s, 1).items.map((item) => [item.cx, item.cy]);
		expect(a).not.toEqual(b);
	});

	it('le vrac ne forme pas de lignes : jamais 3 pièces à la même hauteur', () => {
		const s = scene('pièces: 10×2 10×1', 'disposition: mélangé');
		const heights = new Map<number, number>();
		for (const item of s.items) heights.set(item.cy, (heights.get(item.cy) ?? 0) + 1);
		expect(Math.max(...heights.values())).toBeLessThan(3);
	});
});

describe('monnaie-scene — même échelle pour tous les ensembles', () => {
	it('une pièce a la même taille dans un petit et un grand ensemble', () => {
		const small = scene('pièces: 2');
		const big = scene('billets: 50 20', 'pièces: 2 2 2');
		expect(small.items[0].width).toBe(big.items.at(-1)!.width);
		expect(small.width).toBeLessThan(big.width);
	});
});

describe('findMonnaieItemAt — toucher pour marquer', () => {
	it('un point sur une coupure la désigne', () => {
		const s = scene('billets: 20 10', 'pièces: 2 1 1', 'disposition: mélangé');
		for (const [i, item] of s.items.entries()) {
			expect(findMonnaieItemAt(s, { x: item.cx, y: item.cy })).toBe(i);
		}
	});

	it('un point loin de tout : rien', () => {
		expect(findMonnaieItemAt(scene('pièces: 1'), { x: -50, y: -50 })).toBeNull();
	});
});
