/**
 * Les formules de la grille (tableur intégré, lot 2, PR 1 : le moteur).
 *
 * Phase 0 : `docs/wip/atelier-tableur-lot2-phase0.md`, validée le 2026-10-15.
 * Une cellule qui commence par `=` est calculée par le MOTEUR DE L'ATELIER :
 * valeur exacte, objets de l'atelier (`f`, curseurs), mêmes refus que Calcul.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';
import { evaluate } from '$lib/mathAST/eval/evaluate';
import { isList, type ListObject } from '../types';

const A = 0;
const B = 1;
const C = 2;

function withCells(cells: Record<string, string>, atelier = new Atelier()): Atelier {
	atelier.editCells(
		Object.entries(cells).map(([address, text]) => ({
			column: address.charCodeAt(0) - 65,
			row: Number(address.slice(1)),
			text
		}))
	);
	return atelier;
}

function value(atelier: Atelier, column: number, row: number) {
	return atelier.cellValue(column, row);
}

function numberAt(atelier: Atelier, column: number, row: number): number {
	const v = value(atelier, column, row);
	if (v.kind !== 'number') throw new Error(`pas un nombre : ${JSON.stringify(v)}`);
	return v.value;
}

function messageAt(atelier: Atelier, column: number, row: number): string {
	const v = value(atelier, column, row);
	return v.kind === 'error' || v.kind === 'empty' ? (v.message ?? '') : `(${v.kind})`;
}

function listOf(atelier: Atelier, name: string): ListObject {
	const object = atelier.get(name);
	if (object === undefined || !isList(object)) throw new Error(`pas de liste ${name}`);
	return object;
}

describe('§1 écrire une formule', () => {
	it('une formule se calcule, en valeur exacte', () => {
		const a = withCells({ A1: '=1/3+1/6' });

		const v = value(a, A, 1);
		expect(v.kind).toBe('number');
		if (v.kind === 'number') {
			expect(v.exact).toBe(true);
			expect(v.value).toBeCloseTo(0.5);
			expect(v.shown).toBe('1/2');
		}
	});

	it('elle cite des cellules ; la virgule est décimale', () => {
		const a = withCells({ A1: '5', B1: '=0,8*A1+3', B2: '=2A1' });

		expect(numberAt(a, B, 1)).toBeCloseTo(7);
		expect(numberAt(a, B, 2)).toBeCloseTo(10);
	});

	it('`=a2+1` est relu `=A2+1`', () => {
		const a = withCells({ A2: '4', B1: '=a2+1' });

		expect(a.cell(B, 1)).toBe('=A2+1');
		expect(numberAt(a, B, 1)).toBe(5);
	});

	it('le « ; » d’une formule sépare des arguments : pas de répartition vers le bas', () => {
		const a = withCells({ A1: '7', B1: '=max(1 ; A1)' });

		expect(a.cell(B, 2)).toBe('');
		expect(numberAt(a, B, 1)).toBe(7);
	});

	it('`$` ne change pas la valeur', () => {
		const a = withCells({ A1: '3', B1: '=$A$1*2', B2: '=A$1+$A1' });

		expect(numberAt(a, B, 1)).toBe(6);
		expect(numberAt(a, B, 2)).toBe(6);
	});

	it('une formule illisible le dit, et garde son texte', () => {
		const a = withCells({ A1: '=2+' });

		expect(a.cell(A, 1)).toBe('=2+');
		expect(value(a, A, 1)).toMatchObject({ kind: 'error', label: 'erreur' });
		expect(messageAt(a, A, 1)).toBe('Je n’ai pas su lire cette formule.');
	});
});

describe('§2 ce qu’une formule cite', () => {
	it('les objets de l’atelier, avec leur valeur du moment', () => {
		const a = new Atelier();
		a.create({ kind: 'function', name: 'f', definition: 'x^2' });
		a.create({ kind: 'value', name: 'a', definition: '3' });
		withCells({ A1: '2', B1: '=f(A1)', B2: '=a*A1', B3: "=f'(A1)" }, a);

		expect(numberAt(a, B, 1)).toBe(4);
		expect(numberAt(a, B, 2)).toBe(6);
		expect(numberAt(a, B, 3)).toBe(4);

		a.update('a', '10');
		expect(numberAt(a, B, 2)).toBe(20);
	});

	it('f hors de son ensemble : le refus de Calcul', () => {
		const a = new Atelier();
		a.create({ kind: 'function', name: 'f', definition: 'sqrt(x)', interval: '[0;+∞[' });
		withCells({ A1: '-1', B1: '=f(A1)' }, a);

		expect(value(a, B, 1).kind).toBe('error');
		expect(messageAt(a, B, 1)).toContain("n'est pas dans l'ensemble de définition de f");
	});

	it('une cellule vide citée : la formule reste vide (T5), et la raison est dite', () => {
		const a = withCells({ B1: '=A1+1' });

		expect(value(a, B, 1).kind).toBe('empty');
		expect(messageAt(a, B, 1)).toBe('A1 est vide.');
	});

	it('une cellule qui contient un mot', () => {
		const a = withCells({ A1: 'fille', B1: '=A1+1' });

		expect(messageAt(a, B, 1)).toBe(
			'A1 contient un mot (fille) : une formule calcule avec des nombres.'
		);
	});

	it('Q-L2-3 : un nom inconnu — le refus dit comment le créer', () => {
		const a = withCells({ A1: '2', B1: '=k*A1' });

		expect(messageAt(a, B, 1)).toBe(
			'k n’est pas défini dans l’atelier : crée-le dans Mes objets (k = 2).'
		);
	});

	it('une liste citée seule', () => {
		const a = new Atelier();
		a.create({ kind: 'list', name: 'L', definition: '1 ; 2' });
		withCells({ C1: '=L+1' }, a);

		expect(messageAt(a, C, 1)).toBe('L est une liste : cite une de ses cellules (A2).');
	});

	it('une cellule hors de la grille', () => {
		const a = withCells({ A1: '=A201+1' });

		expect(messageAt(a, A, 1)).toBe('A201 n’existe pas : la grille va de A1 à Z200.');
	});
});

describe('§3 le calcul', () => {
	it('un cycle : chaque cellule le dit, le reste se calcule', () => {
		const a = withCells({ A1: '=B1+1', B1: '=A1', C1: '=2+3' });

		expect(value(a, A, 1)).toMatchObject({ kind: 'error', label: 'cycle' });
		expect(messageAt(a, A, 1)).toBe('Cycle : A1 dépend d’elle-même (par B1).');
		expect(messageAt(a, B, 1)).toBe('Cycle : B1 dépend d’elle-même (par A1).');
		expect(numberAt(a, C, 1)).toBe(5);
	});

	it('une cellule qui dépend d’une cellule en erreur', () => {
		const a = withCells({ A1: '=2+', B1: '=A1*2' });

		expect(messageAt(a, B, 1)).toBe('Dépend de A1, en erreur.');
	});

	it('une division par zéro', () => {
		const a = withCells({ A1: '0', B1: '=1/A1' });

		expect(value(a, B, 1).kind).toBe('error');
		expect(messageAt(a, B, 1)).toBe('Division par zéro.');
	});

	it('repli ≈ après coup : une racine imbriquée recopiée reste rapide', () => {
		const cells: Record<string, string> = { A1: '1' };
		for (let row = 2; row <= 40; row++) cells[`A${row}`] = `=sqrt(A${row - 1}+2)`;
		const start = performance.now();

		const a = withCells(cells);

		expect(performance.now() - start).toBeLessThan(3000);
		const last = value(a, A, 40);
		expect(last.kind).toBe('number');
		if (last.kind === 'number') {
			expect(last.exact).toBe(false);
			expect(last.value).toBeCloseTo(2, 6);
			expect(last.shown.startsWith('≈')).toBe(true);
		}
	});

	it('une suite affine recopiée sur 200 lignes reste exacte', () => {
		const cells: Record<string, string> = { A1: '1' };
		for (let row = 2; row <= 200; row++) cells[`A${row}`] = `=0,8*A${row - 1}+3`;

		const a = withCells(cells);

		const last = value(a, A, 200);
		expect(last.kind === 'number' && last.exact).toBe(true);
		expect(numberAt(a, A, 200)).toBeCloseTo(15, 6);
	});
});

describe('§6 les listes', () => {
	it('une colonne nommée à formules : la liste prend leurs valeurs', () => {
		const a = withCells({ A1: '1', A2: '=A1*2', A3: '=A2*2' });
		a.nameColumn(A, 'L');

		expect(listOf(a, 'L').values).toEqual([1, 2, 4]);
		expect(listOf(a, 'L').status).toBe('ok');
	});

	it('une formule en erreur ou vide : la ligne n’a pas de valeur, et c’est compté', () => {
		const a = withCells({ A1: '1', A2: '=2+', A3: '=B9', A4: '4' });
		a.nameColumn(A, 'L');

		const L = listOf(a, 'L');
		expect(L.values).toEqual([1, 4]);
		expect(L.rows).toEqual([1, 4]);
		expect(L.formulaErrors).toBe(1);
	});

	it('T2 : la carte ou `L = …` ne modifient pas une colonne à formules', () => {
		const a = withCells({ A1: '1', A2: '=A1+1' });
		a.nameColumn(A, 'L');

		const updated = a.update('L', '5 ; 6');

		expect(updated.ok).toBe(false);
		if (!updated.ok) expect(updated.message).toContain('calculée dans la grille');
		expect(a.cell(A, 2)).toBe('=A1+1');
	});

	it('la liste suit ses cellules', () => {
		const a = withCells({ A1: '1', A2: '=A1+1' });
		a.nameColumn(A, 'L');

		a.editCells([{ column: A, row: 1, text: '10' }]);

		expect(listOf(a, 'L').values).toEqual([10, 11]);
	});

	it('T5 : supprimer la liste citée vide les formules qui la citaient', () => {
		const a = new Atelier();
		a.create({ kind: 'list', name: 'L', definition: '3 ; 4' });
		withCells({ B1: '=A1*2' }, a);
		expect(numberAt(a, B, 1)).toBe(6);

		a.removeWithDependents('L');

		expect(value(a, B, 1).kind).toBe('empty');
	});

	it('la sauvegarde garde les formules telles que tapées', () => {
		const a = withCells({ A1: '2', B1: '=A1*3' });

		const b = new Atelier();
		b.restore(a.serialize());

		expect(b.cell(B, 1)).toBe('=A1*3');
		expect(numberAt(b, B, 1)).toBe(6);
	});
});

// =============================================================================
// Oracle : une cellule répond comme Calcul (règle technique validée)
// =============================================================================

describe('oracle : même réponse que Calcul', () => {
	function calculValue(atelier: Atelier, input: string): number | 'refus' {
		const session: CalcSession = { atelier, engine: new WebReplEngine(), seed: () => 1 };
		const result = runInput(session, input);
		if (result.kind !== 'calcul' || result.ast === undefined) return 'refus';
		const evaluated = evaluate(result.ast, { mode: 'decimal' });
		return evaluated.status === 'value' && typeof evaluated.value === 'number'
			? evaluated.value
			: 'refus';
	}

	const CORPUS = [
		'1/3+1/6',
		'sqrt(8)',
		'2^10',
		'ln(e^2)',
		'sin(π/6)',
		'f(2)',
		"f'(3)",
		'a*f(1)',
		'max(1 ; 2,5)',
		'abs(-3)',
		'u(4)',
		'e^0',
		'(1+2)*3',
		'10/4',
		'0,1+0,2',
		'2a+1',
		'g(f(1))'
	];

	it.each(CORPUS)('%s', (expression) => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2+1' });
		atelier.create({ kind: 'function', name: 'g', definition: '2x-1' });
		atelier.create({ kind: 'value', name: 'a', definition: '3' });
		atelier.create({ kind: 'sequence', name: 'u', definition: '2n+1' });
		withCells({ A1: `=${expression}` }, atelier);

		const expected = calculValue(atelier, expression);
		const cell = value(atelier, A, 1);

		if (expected === 'refus') expect(cell.kind).toBe('error');
		else {
			expect(cell.kind).toBe('number');
			if (cell.kind === 'number') expect(cell.value).toBeCloseTo(expected, 9);
		}
	});
});
