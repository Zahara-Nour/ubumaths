/**
 * Bloc ```labyrinthe : règles, tirage du chemin et des nombres (chantier `labyrinthe`)
 */

import { describe, it, expect } from 'vitest';
import {
	ecrireNombre,
	lireRegle,
	suitLaRegle,
	tirerLabyrinthe
} from '#lib/ubumark/utils/labyrinthe-moteur.ts';
import type { Case, Regle } from '#lib/ubumark/types/labyrinthe.ts';

const voisines = (a: Case, b: Case) => Math.abs(a.ligne - b.ligne) + Math.abs(a.col - b.col) === 1;

const PREMIER: Regle = { kind: 'premier' };
const MULTIPLE_3: Regle = { kind: 'multiple', diviseur: 3 };
const CENTIEMES_7: Regle = { kind: 'chiffre', rang: 'centièmes', chiffre: 7 };

describe('lireRegle', () => {
	it('lit les trois règles, accents et pluriels tolérés', () => {
		expect(lireRegle('premier')).toEqual({ ok: true, regle: PREMIER });
		expect(lireRegle('nombres premiers')).toEqual({ ok: true, regle: PREMIER });
		expect(lireRegle('multiple de 3')).toEqual({ ok: true, regle: MULTIPLE_3 });
		expect(lireRegle('Multiples de 12')).toEqual({
			ok: true,
			regle: { kind: 'multiple', diviseur: 12 }
		});
		expect(lireRegle('chiffre des centièmes = 7')).toEqual({ ok: true, regle: CENTIEMES_7 });
		expect(lireRegle('chiffre des unites de mille = 3')).toEqual({
			ok: true,
			regle: { kind: 'chiffre', rang: 'unités de mille', chiffre: 3 }
		});
	});

	it('refuse une règle inconnue, un diviseur hors bornes, un chiffre hors 0 à 9', () => {
		expect(lireRegle('pair').ok).toBe(false);
		expect(lireRegle('multiple de 1').ok).toBe(false);
		expect(lireRegle('multiple de 100').ok).toBe(false);
		expect(lireRegle('chiffre des centièmes = 12').ok).toBe(false);
		expect(lireRegle('chiffre des milliards = 3').ok).toBe(false);
	});
});

describe('suitLaRegle', () => {
	it('premier', () => {
		expect([2, 3, 13, 97].every((n) => suitLaRegle(PREMIER, String(n)))).toBe(true);
		expect([1, 9, 51, 91].some((n) => suitLaRegle(PREMIER, String(n)))).toBe(false);
	});

	it('multiple', () => {
		expect(suitLaRegle(MULTIPLE_3, '51')).toBe(true);
		expect(suitLaRegle(MULTIPLE_3, '52')).toBe(false);
	});

	it('chiffre d’un rang, sur le nombre écrit', () => {
		expect(suitLaRegle(CENTIEMES_7, '12,374')).toBe(true);
		expect(suitLaRegle(CENTIEMES_7, '12,347')).toBe(false);
		expect(suitLaRegle(CENTIEMES_7, '7,1')).toBe(false);
		const milliers: Regle = { kind: 'chiffre', rang: 'unités de mille', chiffre: 3 };
		expect(suitLaRegle(milliers, '43 512')).toBe(true);
		expect(suitLaRegle(milliers, '3512')).toBe(true);
		expect(suitLaRegle(milliers, '512')).toBe(false);
	});
});

describe('ecrireNombre', () => {
	it('virgule, espaces fines dès 5 chiffres', () => {
		expect(ecrireNombre([4, 7], [1, 7, 2])).toBe('47,172');
		expect(ecrireNombre([4, 3, 5, 1, 2], [])).toBe('43 512');
		expect(ecrireNombre([3, 5, 1, 2], [])).toBe('3512');
	});
});

describe('tirerLabyrinthe', () => {
	const regles: Regle[] = [
		PREMIER,
		MULTIPLE_3,
		CENTIEMES_7,
		{ kind: 'chiffre', rang: 'dizaines de mille', chiffre: 4 },
		{ kind: 'chiffre', rang: 'dix-millièmes', chiffre: 0 }
	];

	it('même graine, même labyrinthe ; autre graine, autre labyrinthe', () => {
		const a = tirerLabyrinthe(6, 4, PREMIER, 12);
		expect(tirerLabyrinthe(6, 4, PREMIER, 12)).toEqual(a);
		expect(tirerLabyrinthe(6, 4, PREMIER, 13)).not.toEqual(a);
	});

	it('toutes tailles : un seul chemin, de l’entrée à une sortie, seules ses cases suivent la règle', () => {
		for (let colonnes = 3; colonnes <= 7; colonnes++) {
			for (let lignes = 2; lignes <= 7; lignes++) {
				for (const regle of regles) {
					for (let graine = 0; graine < 4; graine++) {
						const lab = tirerLabyrinthe(colonnes, lignes, regle, graine);
						const { chemin } = lab;
						const debut = chemin[0];
						const fin = chemin[chemin.length - 1];
						expect(debut).toEqual({ ligne: lab.entree, col: 1 });
						expect(fin.col).toBe(colonnes);
						// Une seule case du chemin sur la dernière colonne : sa fin
						expect(chemin.filter((c) => c.col === colonnes)).toHaveLength(1);
						chemin.slice(1).forEach((c, i) => expect(voisines(chemin[i], c)).toBe(true));
						// Le chemin ne se touche pas : deux cases non consécutives ne sont pas voisines
						for (let i = 0; i < chemin.length; i++) {
							for (let j = i + 2; j < chemin.length; j++) {
								expect(voisines(chemin[i], chemin[j])).toBe(false);
							}
						}
						const surLeChemin = (c: Case) =>
							chemin.some((p) => p.ligne === c.ligne && p.col === c.col);
						expect(lab.nombres).toHaveLength(lignes);
						lab.nombres.forEach((rangee, l) => {
							expect(rangee).toHaveLength(colonnes);
							rangee.forEach((nombre, c) => {
								const ici = { ligne: l + 1, col: c + 1 };
								expect(suitLaRegle(regle, nombre)).toBe(surLeChemin(ici));
							});
						});
					}
				}
			}
		}
	});

	it('le chemin n’est pas le plus court quand la grille a de la place', () => {
		const longueurs = Array.from(
			{ length: 10 },
			(_, graine) => tirerLabyrinthe(6, 5, PREMIER, graine).chemin.length
		);
		expect(Math.max(...longueurs)).toBeGreaterThan(6);
	});

	it('chiffre d’un rang : les intrus ont le chiffre cherché à un autre rang', () => {
		const lab = tirerLabyrinthe(6, 4, CENTIEMES_7, 3);
		const intrus = lab.nombres
			.flatMap((rangee, l) => rangee.map((n, c) => ({ n, ici: { ligne: l + 1, col: c + 1 } })))
			.filter(({ ici }) => !lab.chemin.some((p) => p.ligne === ici.ligne && p.col === ici.col));
		expect(intrus.length).toBeGreaterThan(0);
		expect(intrus.every(({ n }) => n.includes('7'))).toBe(true);
	});

	it('premier : les intrus sont impairs et ne finissent pas par 5', () => {
		const lab = tirerLabyrinthe(5, 4, PREMIER, 1);
		const intrus = lab.nombres.flat().filter((n) => !suitLaRegle(PREMIER, n));
		expect(intrus.every((n) => Number(n) % 2 === 1 && !n.endsWith('5'))).toBe(true);
	});
});

describe('tirerLabyrinthe : tirage figé (« golden »)', () => {
	// Seule la graine est gardée dans l'énoncé d'une instance ; le juge lit le chemin écrit dans la
	// réponse attendue. Si ce test rougit, le tirage a changé : les copies existantes montreraient
	// une autre grille que celle du juge. Ne pas « mettre à jour les valeurs » sans le décider.
	const chemin = (lab: { chemin: Case[] }) =>
		lab.chemin.map((c) => `${c.ligne},${c.col}`).join(' ');

	it('premier, 5 × 3, graine 101', () => {
		const lab = tirerLabyrinthe(5, 3, PREMIER, 101);
		expect(lab.entree).toBe(1);
		expect(lab.nombres).toEqual([
			['97', '63', '77', '31', '71'],
			['29', '37', '81', '67', '87'],
			['69', '19', '79', '11', '39']
		]);
		expect(chemin(lab)).toBe('1,1 2,1 2,2 3,2 3,3 3,4 2,4 1,4 1,5');
	});

	it('multiple de 7, 4 × 3, graine 202', () => {
		const lab = tirerLabyrinthe(4, 3, { kind: 'multiple', diviseur: 7 }, 202);
		expect(lab.entree).toBe(1);
		expect(lab.nombres).toEqual([
			['105', '72', '84', '133'],
			['49', '20', '28', '128'],
			['91', '63', '98', '97']
		]);
		expect(chemin(lab)).toBe('1,1 2,1 3,1 3,2 3,3 2,3 1,3 1,4');
	});

	it('chiffre des centièmes = 7, 4 × 3, graine 303', () => {
		const lab = tirerLabyrinthe(4, 3, CENTIEMES_7, 303);
		expect(lab.entree).toBe(3);
		expect(lab.nombres).toEqual([
			['32,771', '15,779', '64,279', '79,559'],
			['53,779', '85,257', '91,078', '87,961'],
			['39,076', '67,714', '84,979', '15,377']
		]);
		expect(chemin(lab)).toBe('3,1 2,1 1,1 1,2 1,3 2,3 3,3 3,4');
	});
});
