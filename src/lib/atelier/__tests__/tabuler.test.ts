/**
 * Tabuler (tableur intégré, lot 3, PR 1).
 *
 * Phase 0 `docs/wip/atelier-tableur-lot3-phase0.md` : le tableau de valeurs
 * d'une fonction est écrit DANS la grille, en formules (`-2`, `=A1+0,5`,
 * `=f(A1)`), donc vivant ; un nombre décimal fini s'écrit en décimal dans
 * toute la grille (Q-L3-2) ; valeurs par défaut (Q-L3-3) ; deux nouvelles
 * colonnes à chaque fois (Q-L3-4).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult } from '../calcul';
import { tabulationDefaults } from '../tabulate';
import { commandCatalog } from '../commands';

const A = 0;
const B = 1;
const C = 2;
const D = 3;

function shown(atelier: Atelier, column: number, row: number): string {
	const v = atelier.cellValue(column, row);
	if (v.kind === 'number') return v.shown;
	if (v.kind === 'error') return `erreur : ${v.message}`;
	return v.kind;
}

function withF(definition = 'x^2-3x', extra: Partial<Parameters<Atelier['create']>[0]> = {}) {
	const atelier = new Atelier();
	const created = atelier.create({ kind: 'function', name: 'f', definition, ...extra });
	if (!created.ok) throw new Error(created.message);
	return atelier;
}

function outputOf(result: CalcResult): string {
	if (result.kind === 'commande') return result.output;
	if (result.kind === 'refus') return `refus : ${result.message}`;
	return result.kind;
}

describe('Q-L3-2 : un décimal fini s’écrit en décimal dans la grille', () => {
	it('abscisses et images d’un tableau', () => {
		const a = withF();
		a.editCells([
			{ column: A, row: 1, text: '-2' },
			{ column: A, row: 2, text: '=A1+0,5' },
			{ column: B, row: 2, text: '=f(A2)' },
			{ column: C, row: 1, text: '=1/4' },
			{ column: C, row: 2, text: '=-1/2' },
			{ column: C, row: 3, text: '=0,1*3' }
		]);

		expect(shown(a, A, 2)).toBe('-1,5');
		expect(shown(a, B, 2)).toBe('6,75');
		expect(shown(a, C, 1)).toBe('0,25');
		expect(shown(a, C, 2)).toBe('-0,5');
		expect(shown(a, C, 3)).toBe('0,3');
	});

	it('une fraction qui n’est pas un décimal garde son écriture', () => {
		const a = new Atelier();
		a.editCells([
			{ column: A, row: 1, text: '=1/3' },
			{ column: A, row: 2, text: '=13/3' },
			{ column: A, row: 3, text: '=sqrt(2)' }
		]);

		expect(shown(a, A, 1)).toBe('1/3');
		expect(shown(a, A, 2)).toBe('13/3');
		expect(shown(a, A, 3)).toBe('≈ 1,4142');
	});

	it('un décimal trop long garde sa fraction', () => {
		const a = new Atelier();
		a.editCells([{ column: A, row: 1, text: '=1/2^20' }]);

		expect(shown(a, A, 1)).toBe('1/1048576');
	});
});

describe('§1 tabuler une fonction', () => {
	it('deux colonnes de formules, titrées, dans les premières colonnes libres', () => {
		const a = withF();
		a.editCells([{ column: A, row: 1, text: 'à moi' }]);

		const done = a.tabulate({ name: 'f', from: '-2', to: '3', step: '0,5' });

		expect(done).toMatchObject({ ok: true, columns: [B, C], rows: 11, note: null });
		expect(a.cell(B, 1)).toBe('-2');
		expect(a.cell(B, 2)).toBe('=B1+0,5');
		expect(a.cell(B, 11)).toBe('=B10+0,5');
		expect(a.cell(C, 1)).toBe('=f(B1)');
		expect(a.cell(C, 11)).toBe('=f(B11)');
		expect(a.titleOf(B)).toBe('x');
		expect(a.titleOf(C)).toBe('f(x)');
		expect(shown(a, B, 11)).toBe('3');
		expect(shown(a, C, 2)).toBe('6,75');
	});

	it('vivant : redéfinir f, changer le début', () => {
		const a = withF();
		a.tabulate({ name: 'f', from: '0', to: '2', step: '1' });

		a.update('f', '10x');
		expect(shown(a, B, 3)).toBe('20');

		a.editCells([{ column: A, row: 1, text: '5' }]);
		expect(shown(a, A, 3)).toBe('7');
		expect(shown(a, B, 3)).toBe('70');
	});

	it('la lettre de l’élève fait les titres', () => {
		const a = withF('x^2', { letter: 't' });

		a.tabulate({ name: 'f', from: '0', to: '1', step: '1' });

		expect(a.titleOf(A)).toBe('t');
		expect(a.titleOf(B)).toBe('f(t)');
	});

	it('une dérivée se tabule', () => {
		const a = withF();
		a.createDerivative('f');

		a.tabulate({ name: "f'", from: '0', to: '1', step: '1' });

		expect(a.cell(B, 1)).toBe("=f'(A1)");
		expect(a.titleOf(B)).toBe('f′(x)');
		expect(shown(a, B, 1)).toBe('-3');
	});

	it('un seul geste : Ctrl+Z l’annule en entier (T6)', () => {
		const a = withF();
		a.tabulate({ name: 'f', from: '0', to: '4', step: '1' });

		a.undoGrid();

		expect(a.cell(A, 1)).toBe('');
		expect(a.cell(B, 5)).toBe('');
		expect(a.titleOf(A)).toBe('');
	});

	it('Q-L3-4 : tabuler deux fois écrit deux nouvelles colonnes', () => {
		const a = withF();
		a.tabulate({ name: 'f', from: '0', to: '1', step: '1' });

		const again = a.tabulate({ name: 'f', from: '5', to: '6', step: '1' });

		expect(again).toMatchObject({ ok: true, columns: [C, D] });
		expect(a.cell(A, 1)).toBe('0');
		expect(a.cell(C, 1)).toBe('5');
	});

	it('un pas qui ne tombe pas juste : la dernière abscisse ≤ fin, et on le dit', () => {
		const a = withF();

		const done = a.tabulate({ name: 'f', from: '-2', to: '3', step: '0,7' });

		expect(done).toMatchObject({ ok: true, rows: 8 });
		expect(shown(a, A, 8)).toBe('2,9');
		expect(done.ok && done.note).toBe(
			'Le pas ne tombe pas juste sur 3 : le tableau s’arrête à 2,9.'
		);
	});

	it('une abscisse hors de l’ensemble : la case dit le refus, le tableau est écrit', () => {
		const a = withF('1/x');

		a.tabulate({ name: 'f', from: '-1', to: '1', step: '1' });

		expect(shown(a, B, 2)).toBe('erreur : Division par zéro.');
		expect(shown(a, B, 3)).toBe('1');
	});

	it('les bornes s’écrivent à la française, `.` et `−` compris', () => {
		const a = withF();

		a.tabulate({ name: 'f', from: '−1.5', to: '0', step: '1/2' });

		expect(a.cell(A, 1)).toBe('-1,5');
		expect(a.cell(A, 2)).toBe('=A1+1/2');
		expect(shown(a, A, 4)).toBe('0');
	});
});

describe('§1 refus : rien n’est écrit', () => {
	const cases: [string, Partial<{ from: string; to: string; step: string }>, string][] = [
		['pas nul', { step: '0' }, 'Le pas doit être positif.'],
		['pas négatif', { step: '-1' }, 'Le pas doit être positif.'],
		['fin avant le début', { from: '3', to: '1' }, 'La fin doit être après le début.'],
		['borne illisible', { from: 'abc' }, '« abc » n’est pas un nombre.'],
		['borne vide', { to: '' }, 'Écris la fin du tableau.'],
		[
			'plus de 200 lignes',
			{ from: '0', to: '400', step: '1' },
			'Ce tableau aurait 401 lignes, la grille en a 200 : agrandis le pas.'
		]
	];
	for (const [label, change, message] of cases) {
		it(label, () => {
			const a = withF();

			const done = a.tabulate({ name: 'f', from: '-2', to: '3', step: '1', ...change });

			expect(done).toEqual({ ok: false, message });
			expect(a.cell(A, 1)).toBe('');
		});
	}

	it('moins de deux colonnes libres', () => {
		const a = withF();
		a.editCells(Array.from({ length: 25 }, (_, column) => ({ column, row: 1, text: 'x' })));

		const done = a.tabulate({ name: 'f', from: '0', to: '1', step: '1' });

		expect(done).toEqual({ ok: false, message: 'Il faut deux colonnes libres dans la grille.' });
		expect(a.cell(25, 1)).toBe('');
	});

	it('pas une fonction', () => {
		const a = new Atelier();
		a.create({ kind: 'list', name: 'L', definition: '1 ; 2' });

		expect(a.tabulate({ name: 'L', from: '0', to: '1', step: '1' })).toEqual({
			ok: false,
			message: 'On tabule une fonction : « L » n’en est pas une.'
		});
	});
});

describe('Q-L3-3 : les valeurs par défaut', () => {
	it('de −5 à 5, pas 1', () => {
		expect(tabulationDefaults(withF().get('f'))).toEqual({ from: '-5', to: '5', step: '1' });
	});

	it('une fonction sur un intervalle fermé : ses bornes', () => {
		expect(tabulationDefaults(withF('x^2', { interval: '[0;3]' }).get('f'))).toEqual({
			from: '0',
			to: '3',
			step: '1'
		});
		expect(tabulationDefaults(withF('x^2', { interval: '[0;100]' }).get('f'))).toEqual({
			from: '0',
			to: '100',
			step: '10'
		});
	});

	it('un intervalle ouvert ou infini : −5 à 5', () => {
		expect(tabulationDefaults(withF('x^2', { interval: ']0;3]' }).get('f'))).toEqual({
			from: '-5',
			to: '5',
			step: '1'
		});
		expect(tabulationDefaults(withF('x^2', { interval: '[0;+∞[' }).get('f'))).toEqual({
			from: '-5',
			to: '5',
			step: '1'
		});
	});
});

describe('§2 la commande .tabuler', () => {
	function session() {
		const atelier = withF();
		return { atelier, engine: new WebReplEngine() };
	}

	it('écrit le tableau et dit où', () => {
		const s = session();

		const out = outputOf(runInput(s, '.tabuler f de -2 à 3 pas 0,5'));

		expect(out).toBe('Tableau de f écrit dans la grille, colonnes A et B (11 lignes).');
		expect(s.atelier.cell(B, 1)).toBe('=f(A1)');
	});

	it('sans bornes : les valeurs par défaut', () => {
		const s = session();

		const out = outputOf(runInput(s, '.tabuler f'));

		expect(out).toBe('Tableau de f écrit dans la grille, colonnes A et B (11 lignes).');
		expect(s.atelier.cell(A, 1)).toBe('-5');
	});

	it('le pas tombe pas juste : la note suit', () => {
		const s = session();

		expect(outputOf(runInput(s, '.tabuler f de -2 à 3 pas 0,7'))).toBe(
			'Tableau de f écrit dans la grille, colonnes A et B (8 lignes). Le pas ne tombe pas juste sur 3 : le tableau s’arrête à 2,9.'
		);
	});

	it('une expression sans nom : refus qui dit comment faire (Q-L2-3)', () => {
		const s = session();

		expect(outputOf(runInput(s, '.tabuler x^2 de 0 à 5'))).toBe(
			'refus : On tabule une fonction nommée : définis-la d’abord, par exemple g(x) = x^2, puis .tabuler g de 0 à 5.'
		);
	});

	it('un nom inconnu', () => {
		const s = session();

		expect(outputOf(runInput(s, '.tabuler h'))).toBe(
			'refus : « h » n’existe pas dans l’atelier : définis-la d’abord, par exemple h(x) = x^2.'
		);
	});

	it('une forme mal écrite : l’usage', () => {
		const s = session();

		expect(outputOf(runInput(s, '.tabuler f de 0'))).toBe(
			'refus : Écris par exemple .tabuler f de -2 à 3 pas 0,5 (ou .tabuler f).'
		);
	});

	it('l’aide et la complétion connaissent .tabuler', () => {
		const entry = commandCatalog(new WebReplEngine()).find((c) => c.french === 'tabuler');

		expect(entry?.example).toBe('.tabuler f de -2 à 3 pas 0,5');
	});

	it('un refus du modèle remonte tel quel', () => {
		const s = session();

		expect(outputOf(runInput(s, '.tabuler f de 0 à 1 pas 0'))).toBe(
			'refus : Le pas doit être positif.'
		);
	});
});

describe('revue de la PR 1', () => {
	function session(lines: readonly string[]) {
		const s = { atelier: new Atelier(), engine: new WebReplEngine() };
		for (const line of lines) runInput(s, line);
		return s;
	}

	// Le parseur lit désormais `f_1(3)` comme un appel de f_1 (il le lisait
	// `f₁ × 3`, et la grille calculait avec f) : la valeur est juste, le refus
	// `indexedFunctionMessage` ne se déclenche plus pour un appel
	it('une fonction à indice dans une formule : la valeur de f_1, jamais celle de f', () => {
		const s = session(['f(x) = 2x+3', 'f_1(x) = 3x^2']);
		s.atelier.editCells([{ column: A, row: 1, text: '=f_1(2)' }]);

		expect(shown(s.atelier, A, 1)).toBe('12');
	});

	it('.tabuler f_1 : refusé, rien n’est écrit', () => {
		const s = session(['f_1(x) = x^2']);

		expect(outputOf(runInput(s, '.tabuler f_1 de 0 à 2 pas 1'))).toBe(
			'refus : La grille ne lit pas encore une fonction à indice (f_1) : définis-la sous une seule lettre, par exemple k(x) = …'
		);
		expect(s.atelier.cell(A, 1)).toBe('');
	});

	it('le conseil du refus « expression » ne propose jamais un nom à indice, et garde le pas', () => {
		const s = session(['f(x) = x', 'g(x) = x', 'h(x) = x']);

		expect(outputOf(runInput(s, '.tabuler x^2 de 0 à 5 pas 0,5'))).toBe(
			'refus : On tabule une fonction nommée : définis-la d’abord, par exemple k(x) = x^2, puis .tabuler k de 0 à 5 pas 0,5.'
		);
	});

	it('une réciproque : refus clair, par la carte comme par la commande', () => {
		const s = session(['f(x) = 2x+3', '.réciproque f']);
		const message =
			'La réciproque f⁻¹ ne se tabule pas encore : tabule f, et lis son tableau à l’envers.';

		expect(s.atelier.tabulate({ name: 'f^-1', from: '0', to: '2', step: '1' })).toEqual({
			ok: false,
			message
		});
		expect(outputOf(runInput(s, '.tabuler f^-1'))).toBe(`refus : ${message}`);
		expect(outputOf(runInput(s, '.tabuler f⁻¹'))).toBe(`refus : ${message}`);
		expect(s.atelier.cell(A, 1)).toBe('');
	});

	it('une fonction en attente : la raison de Calcul, rien n’est écrit', () => {
		const s = session(['f(x) = k*x']);

		expect(outputOf(runInput(s, '.tabuler f de 0 à 1 pas 1'))).toBe(
			"refus : Le résultat dépend de k : donne-lui une valeur (k = 2) pour l'étudier."
		);
		expect(s.atelier.cell(A, 1)).toBe('');
	});

	it('pas par défaut avec des bornes fractionnaires : un entier, jamais un flottant tronqué', () => {
		expect(tabulationDefaults(withF('x^2', { interval: '[1/3;30]' }).get('f'))).toEqual({
			from: '1/3',
			to: '30',
			step: '3'
		});
	});

	it('la note écrit la dernière abscisse comme la case', () => {
		const a = withF();

		const done = a.tabulate({ name: 'f', from: '0', to: '2', step: '3/7' });

		expect(shown(a, A, 5)).toBe('12/7');
		expect(done.ok && done.note).toBe(
			'Le pas ne tombe pas juste sur 2 : le tableau s’arrête à 12/7.'
		);
	});

	it('un pas minuscule : un refus lisible', () => {
		const a = withF();

		expect(a.tabulate({ name: 'f', from: '0', to: '1', step: '0,0000001' })).toEqual({
			ok: false,
			message: 'Ce tableau aurait plus de 10 000 lignes, la grille en a 200 : agrandis le pas.'
		});
	});
});
