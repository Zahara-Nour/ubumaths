/**
 * Les fonctions du tableur (tableur intégré, lot 4, PR 1) : plages et statistiques.
 *
 * Phase 0 `docs/wip/atelier-tableur-lot4-phase0.md` §1-§3 et §5 : `A2:A21`,
 * `A:A`, le nom d'une liste en argument (Q-L4-3) ; vides et mots ignorés dans
 * une plage (Q-L4-2) ; SOMME, MOYENNE, MEDIANE, MIN, MAX, NB, ECARTYPE (n − 1),
 * ECARTYPEP (n) ; noms réécrits en majuscules (Q-L4-7).
 *
 * Série de référence : 12 ; 15 ; 9 ; 14 — somme 50, moyenne 12,5, médiane 13,
 * min 9, max 15, Σ(x − x̄)² = 21, donc ECARTYPEP = √(21/4) ≈ 2,2913 et
 * ECARTYPE = √(21/3) = √7 ≈ 2,6458 (calculés à la main).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';
import { shiftFormula, remapColumns, toRelative, fromRelative } from '../formula';
import type { AtelierState } from '../persistence';

const A = 0;
const B = 1;
const C = 2;

function shown(atelier: Atelier, column: number, row: number): string {
	const v = atelier.cellValue(column, row);
	if (v.kind === 'number') return v.shown;
	if (v.kind === 'error') return `erreur : ${v.message}`;
	if (v.kind === 'word') return `mot : ${v.text}`;
	return v.message === undefined ? 'vide' : `vide : ${v.message}`;
}

/** La série de référence en A1:A4, et une formule en C1. */
function withSeries(formula: string, more: { column: number; row: number; text: string }[] = []) {
	const a = new Atelier();
	a.editCells([
		{ column: A, row: 1, text: '12' },
		{ column: A, row: 2, text: '15' },
		{ column: A, row: 3, text: '9' },
		{ column: A, row: 4, text: '14' },
		...more,
		{ column: C, row: 1, text: formula }
	]);
	return a;
}

describe('§3 les fonctions de statistiques', () => {
	const cases: [string, string][] = [
		['=SOMME(A1:A4)', '50'],
		['=MOYENNE(A1:A4)', '12,5'],
		['=MEDIANE(A1:A4)', '13'],
		['=MIN(A1:A4)', '9'],
		['=MAX(A1:A4)', '15'],
		['=NB(A1:A4)', '4'],
		['=ECARTYPEP(A1:A4)', '≈ 2,2913'],
		['=ECARTYPE(A1:A4)', '≈ 2,6458'],
		['=MAX(A1:A4)-MIN(A1:A4)', '6'],
		['=SOMME(A1:A2;A4;1)', '42'],
		['=SOMME(MAX(A1:A4);1)', '16'],
		['=MEDIANE(A1:A3)', '12']
	];
	for (const [formula, expected] of cases) {
		it(formula, () => {
			expect(shown(withSeries(formula), C, 1)).toBe(expected);
		});
	}

	it('exact quand c’est court : la moyenne de 1 et 2 vaut 3/2', () => {
		const a = new Atelier();
		a.editCells([
			{ column: A, row: 1, text: '=MOYENNE(1;2)' },
			{ column: A, row: 2, text: '=ECARTYPE(A3:A4)' },
			{ column: A, row: 3, text: '1' },
			{ column: A, row: 4, text: '3' }
		]);

		const mean = a.cellValue(A, 1);
		expect(mean.kind === 'number' && mean.exact).toBe(true);
		expect(shown(a, A, 1)).toBe('1,5');
		const deviation = a.cellValue(A, 2);
		expect(deviation.kind === 'number' && deviation.exact).toBe(true);
		expect(shown(a, A, 2)).toBe('≈ 1,4142');
	});

	it('ECARTYPEP vaut le σ de .stats sur la même série', () => {
		const s = { atelier: new Atelier(), engine: new WebReplEngine() };
		runInput(s, 'L = 12 ; 15 ; 9 ; 14');
		const stats = runInput(s, '.stats L');
		s.atelier.editCells([{ column: C, row: 1, text: '=ECARTYPEP(L)' }]);

		expect(stats.kind === 'commande' && stats.output).toContain('2,29');
		expect(shown(s.atelier, C, 1)).toBe('≈ 2,2913');
	});

	it('les noms anglais d’avant marchent encore (max, min à deux arguments)', () => {
		expect(shown(withSeries('=max(A1;A2)'), C, 1)).toBe('15');
		expect(shown(withSeries('=min(A1;A3)+sqrt(4)'), C, 1)).toBe('11');
	});
});

describe('§2 ce qu’une plage contient (Q-L4-2)', () => {
	it('les cases vides et les mots sont ignorés', () => {
		const a = withSeries('=MOYENNE(A1:A30)', [{ column: A, row: 6, text: 'absent' }]);

		expect(shown(a, C, 1)).toBe('12,5');
	});

	it('une case citée seule reste vide : T5 ne change pas', () => {
		expect(shown(withSeries('=A10*2'), C, 1)).toBe('vide : A10 est vide.');
	});

	it('une case en erreur donne son erreur à la fonction', () => {
		const a = withSeries('=SOMME(A1:A5)', [{ column: A, row: 5, text: '=1/0' }]);

		expect(shown(a, C, 1)).toBe('erreur : A5 est en erreur.');
	});

	it('sans aucun nombre : SOMME et NB valent 0, les autres le disent', () => {
		const a = new Atelier();
		a.editCells([
			{ column: A, row: 1, text: 'titre' },
			{ column: C, row: 1, text: '=SOMME(A1:A5)' },
			{ column: C, row: 2, text: '=NB(A1:A5)' },
			{ column: C, row: 3, text: '=MOYENNE(A1:A5)' },
			{ column: C, row: 4, text: '=MAX(A1:A5)' }
		]);

		expect(shown(a, C, 1)).toBe('0');
		expect(shown(a, C, 2)).toBe('0');
		expect(shown(a, C, 3)).toBe('erreur : Aucun nombre dans A1:A5.');
		expect(shown(a, C, 4)).toBe('erreur : Aucun nombre dans A1:A5.');
	});

	it('ECARTYPE d’un seul nombre : il divise par n − 1 ; ECARTYPEP vaut 0', () => {
		const a = new Atelier();
		a.editCells([
			{ column: A, row: 1, text: '7' },
			{ column: C, row: 1, text: '=ECARTYPE(A1:A3)' },
			{ column: C, row: 2, text: '=ECARTYPEP(A1:A3)' }
		]);

		expect(shown(a, C, 1)).toBe(
			'erreur : ECARTYPE demande au moins deux nombres (il divise par n − 1).'
		);
		expect(shown(a, C, 2)).toBe('0');
	});
});

describe('§1 les plages', () => {
	it('une plage rectangulaire', () => {
		const a = withSeries('=SOMME(A1:B2)', [
			{ column: B, row: 1, text: '1' },
			{ column: B, row: 2, text: '2' }
		]);

		expect(shown(a, C, 1)).toBe('30');
	});

	it('une plage à l’envers se lit dans l’ordre (A4:A1)', () => {
		expect(shown(withSeries('=SOMME(A4:A1)'), C, 1)).toBe('50');
	});

	it('A:A, la colonne entière (Q-L4-4), titre compris et ignoré', () => {
		const a = new Atelier();
		a.editCells([
			{ column: A, row: 1, text: 'notes' },
			{ column: A, row: 2, text: '12' },
			{ column: A, row: 3, text: '16' },
			{ column: C, row: 1, text: '=MOYENNE(A:A)' }
		]);

		expect(shown(a, C, 1)).toBe('14');
	});

	it('le nom d’une liste en argument vaut sa colonne (Q-L4-3)', () => {
		const s = { atelier: new Atelier(), engine: new WebReplEngine() };
		runInput(s, 'L = 12 ; 15 ; 9 ; 14');
		s.atelier.editCells([{ column: C, row: 1, text: '=MOYENNE(L)' }]);

		expect(shown(s.atelier, C, 1)).toBe('12,5');
		runInput(s, 'L = 1 ; 2');
		expect(shown(s.atelier, C, 1)).toBe('1,5');
	});

	it('une liste calculée dans la grille : son nom suit ses formules', () => {
		const a = new Atelier();
		a.editCells([
			{ column: A, row: 1, text: '1' },
			{ column: A, row: 2, text: '=A1*2' }
		]);
		a.nameColumn(A, 'L');
		a.editCells([{ column: C, row: 1, text: '=SOMME(L)' }]);
		expect(shown(a, C, 1)).toBe('3');

		a.editCells([{ column: A, row: 1, text: '5' }]);
		expect(shown(a, C, 1)).toBe('15');
	});

	it('vivant : changer une case de la plage recalcule', () => {
		const a = withSeries('=SOMME(A1:A4)');

		a.editCells([{ column: A, row: 3, text: '19' }]);

		expect(shown(a, C, 1)).toBe('60');
	});

	it('le cumul : =SOMME($A$1:A1) recopié vers le bas', () => {
		const a = withSeries('=SOMME($A$1:A1)');
		a.editCells([{ column: C, row: 1, text: '=SOMME($A$1:A1)' }]);

		a.fillDown({ left: C, right: C, top: 1, bottom: 4 });

		expect(a.cell(C, 4)).toBe('=SOMME($A$1:A4)');
		expect(shown(a, C, 2)).toBe('27');
		expect(shown(a, C, 4)).toBe('50');
	});

	it('une formule dans sa propre plage : un cycle', () => {
		const a = withSeries('=1', [{ column: A, row: 5, text: '=SOMME(A1:A10)' }]);

		const v = a.cellValue(A, 5);
		expect(v.kind === 'error' && v.label).toBe('cycle');
	});

	// Mesuré en écrivant ce lot : une somme de 200 cases écrite à la suite faisait
	// un arbre de profondeur 200, et la garde de mathAST levait une exception
	it('200 cases : pas d’exception, et le cumul se calcule', () => {
		const a = new Atelier();
		const cells = [];
		for (let row = 1; row <= 200; row++) {
			cells.push({ column: A, row, text: String(row) });
			cells.push({ column: B, row, text: `=SOMME($A$1:A${row})` });
		}
		a.editCells(cells);
		a.editCells([{ column: C, row: 1, text: '=ECARTYPEP(A:A)' }]);

		expect(shown(a, B, 200)).toBe('20100');
		expect(shown(a, C, 1)).toBe('≈ 57,7343');
	});

	it('une plage seule, hors d’une fonction : refus (fini le 0,6 silencieux)', () => {
		expect(shown(withSeries('=A1:A2'), C, 1)).toBe(
			'erreur : Une plage s’utilise dans une fonction, par exemple =SOMME(A1:A3).'
		);
	});

	it('une plage mêlée à un calcul dans un argument : refus', () => {
		expect(shown(withSeries('=SOMME(A1:A4*2)'), C, 1)).toBe(
			'erreur : Une plage s’utilise seule en argument : =SOMME(A1:A3), pas =SOMME(A1:A3*2).'
		);
	});

	it('une plage hors de la grille', () => {
		expect(shown(withSeries('=SOMME(A1:A300)'), C, 1)).toBe(
			'erreur : A300 n’existe pas : la grille va de A1 à Z200.'
		);
	});

	it('`6:3` reste une division (pas de lettres, pas de plage)', () => {
		expect(shown(withSeries('=6:3'), C, 1)).toBe('2');
	});
});

describe('§3 refus', () => {
	it('sans argument', () => {
		expect(shown(withSeries('=SOMME()'), C, 1)).toBe(
			'erreur : SOMME attend au moins un argument, par exemple SOMME(A2:A21).'
		);
	});

	it('un nom de fonction inconnu dit lesquelles existent, celles du calcul comprises', () => {
		const message = shown(withSeries('=MOYENE(A1:A4)'), C, 1);
		expect(message).toContain(
			'MOYENE n’est pas une fonction de la grille. Fonctions du tableur : SOMME, MOYENNE, MEDIANE, MIN, MAX, NB, ECARTYPE, ECARTYPEP, NBVAL, NB.VIDE, ARRONDI, ENT, RACINE, ABS, LN, EXP, PI, RESTE, SI, NB.SI, ET, OU, ALEA, ALEA.ENTRE.BORNES.'
		);
		expect(message).toContain('sqrt');
		expect(shown(withSeries('=Sqrt(4)'), C, 1)).toContain('sqrt');
	});
});

describe('§5 écrire les noms (Q-L4-7)', () => {
	it('minuscules et accents réécrits en majuscules sans accent, plages comprises', () => {
		const a = new Atelier();
		a.editCells([
			{ column: C, row: 1, text: '=somme(a1:a4)' },
			{ column: C, row: 2, text: '=Médiane(a:a)' },
			{ column: C, row: 3, text: '=écartypep(a1:a4)' }
		]);

		expect(a.cell(C, 1)).toBe('=SOMME(A1:A4)');
		expect(a.cell(C, 2)).toBe('=MEDIANE(A:A)');
		expect(a.cell(C, 3)).toBe('=ECARTYPEP(A1:A4)');
	});
});

describe('§1 recopie, lien, atelier reçu', () => {
	it('une plage se décale comme deux références ; `$` fige un bout', () => {
		expect(shiftFormula('=SOMME(A1:A4)', 1, 2)).toBe('=SOMME(B3:B6)');
		expect(shiftFormula('=SOMME($A$1:A4)', 0, 2)).toBe('=SOMME($A$1:A6)');
	});

	it('A:A se décale de colonne, pas de ligne ; `$A:$A` reste', () => {
		expect(shiftFormula('=MOYENNE(A:A)', 1, 5)).toBe('=MOYENNE(B:B)');
		expect(shiftFormula('=MOYENNE($A:$A)', 1, 5)).toBe('=MOYENNE($A:$A)');
	});

	it('A:A suit sa colonne dans un atelier reçu', () => {
		expect(remapColumns('=MOYENNE(A:A)+B1', new Map([[A, C]]))).toBe('=MOYENNE(C:C)+#HORS');
	});

	it('le lien relit plages et colonnes à l’identique', () => {
		const state: AtelierState = {
			version: 2,
			objects: [],
			grid: { cells: { C1: '=SOMME($A$1:A1)', C2: '=MOYENNE(A:A)', C3: '=SOMME(A1:B4)' } }
		};

		expect(fromRelative(toRelative(state))).toEqual(state);
	});
});

describe('revue de la PR 1', () => {
	function withValues(formula: string) {
		const s = { atelier: new Atelier(), engine: new WebReplEngine() };
		runInput(s, 'a = 6');
		runInput(s, 'b = 3');
		s.atelier.editCells([
			{ column: A, row: 1, text: '2' },
			{ column: C, row: 1, text: formula }
		]);
		return s.atelier;
	}

	it('`=a:b` reste une division (lot 2) : ni réécrite, ni refusée', () => {
		const a = withValues('=a:b');

		expect(a.cell(C, 1)).toBe('=a:b');
		expect(shown(a, C, 1)).toBe('2');
		expect(shiftFormula('=N:P', 1, 0)).toBe('=N:P');
	});

	it('A:A n’est une colonne qu’en argument d’une fonction', () => {
		const a = withValues('=moyenne(a:a)+a:b');

		expect(a.cell(C, 1)).toBe('=MOYENNE(A:A)+a:b');
		expect(shown(a, C, 1)).toBe('4');
		expect(shiftFormula('=MOYENNE(A:A)+N:P', 1, 0)).toBe('=MOYENNE(B:B)+N:P');
	});

	it('un chiffre devant une fonction : un produit (`=2SOMME(…)`)', () => {
		expect(shown(withSeries('=2SOMME(A1:A4)'), C, 1)).toBe('100');
	});

	it('une case citée seule en argument se lit comme une plage d’une case (vide et mot ignorés)', () => {
		const a = withSeries('=SOMME(A1;B1;A9)', [{ column: B, row: 1, text: 'abc' }]);
		a.editCells([{ column: C, row: 2, text: '=MIN(A1;A9)' }]);

		expect(shown(a, C, 1)).toBe('12');
		expect(shown(a, C, 2)).toBe('12');
	});

	it('la ligne 0 n’existe pas', () => {
		expect(shown(withSeries('=SOMME(A0:A4)'), C, 1)).not.toBe('50');
	});

	it('ECARTYPE de 200 valeurs : la moyenne n’est calculée qu’une fois (< 400 ms)', () => {
		const a = new Atelier();
		a.editCells(
			Array.from({ length: 200 }, (_, i) => ({ column: A, row: i + 1, text: `${i + 1}/7` }))
		);
		const started = performance.now();
		a.editCells([
			{ column: C, row: 1, text: '=ECARTYPEP(A:A)' },
			{ column: C, row: 2, text: '=ECARTYPE(A:A)' },
			{ column: C, row: 3, text: '=ECARTYPE(A1:A200)' }
		]);
		const elapsed = performance.now() - started;

		// σ de 1..200 divisé par 7 : √((200² − 1)/12) / 7 ≈ 8,2478
		expect(shown(a, C, 1)).toBe('≈ 8,2478');
		// Mesuré : ~50-100 ms en local, jusqu’à 169 ms sur un runner CI chargé ; recalculer la
		// moyenne pour chaque valeur (la régression visée) coûte 800-1 350 ms en local.
		expect(elapsed).toBeLessThan(400);
	});
});
