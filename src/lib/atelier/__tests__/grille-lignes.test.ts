/**
 * Deux colonnes ensemble : appariées par LIGNE (tableur intégré, lot 1, PR 3b —
 * décision P1 de David, 2026-10-15).
 *
 * Avant la grille, deux listes s'associaient par rang : une case vide au milieu
 * de M décalait toutes les paires suivantes, en silence. Désormais nuage,
 * ajustement, effectifs et tableau croisé prennent les lignes où les deux
 * cases sont remplies, et disent combien ils en écartent (règle §4 L1).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';
import { actionsFor } from '../actions';
import { listChart } from '../chart';
import { crossCommand } from '../cross';
import { commonRows, droppedNote } from '../pairs';
import { isList, type ListObject } from '../types';

function atelierWith(lists: Record<string, string>): Atelier {
	const atelier = new Atelier();
	for (const [name, definition] of Object.entries(lists)) {
		atelier.create({ kind: 'list', name, definition });
	}
	return atelier;
}

function listOf(atelier: Atelier, name: string): ListObject {
	const object = atelier.get(name);
	if (object === undefined || !isList(object)) throw new Error(`pas de liste ${name}`);
	return object;
}

function answer(atelier: Atelier, input: string) {
	const session: CalcSession = { atelier, engine: new WebReplEngine(), seed: () => 1 };
	return runInput(session, input);
}

/** Une case vide en ligne 3 de L : par rang, (4 ; 100) faisait une paire. */
const GAP = { L: '1 ; 2 ;  ; 4', M: '3 ; 5 ; 100 ; 9' };

describe('la ligne de chaque valeur', () => {
	it('une liste sait sur quelle ligne est chaque valeur', () => {
		const a = atelierWith({ L: '12 ;  ; 1/0 ; 9' });

		expect(listOf(a, 'L').values).toEqual([12, 9]);
		expect(listOf(a, 'L').rows).toEqual([1, 4]);
	});

	it('une liste qualitative aussi', () => {
		const a = atelierWith({ L: 'fille ;  ; garçon' });

		expect(listOf(a, 'L').rows).toEqual([1, 3]);
	});

	it('les lignes communes, et celles qu’on écarte', () => {
		const a = atelierWith(GAP);

		const { rows, dropped } = commonRows([listOf(a, 'L'), listOf(a, 'M')]);

		expect(rows).toEqual([1, 2, 4]);
		expect(dropped).toBe(1);
		expect(droppedNote(1)).toBe('1 ligne incomplète écartée');
		expect(droppedNote(2)).toBe('2 lignes incomplètes écartées');
	});
});

describe('ajustement et effectifs, depuis la carte', () => {
	it('l’ajustement associe ligne à ligne, et le dit', () => {
		const desk = new CalcDesk(atelierWith(GAP));

		desk.runFromPanel('fit:M', 'L');

		const text = desk.entries.at(-1)?.text ?? '';
		expect(text).toContain('(x) = 2x + 1');
		expect(text).toContain('1 ligne incomplète écartée');
	});

	it('les statistiques avec effectifs associent ligne à ligne, et le disent', () => {
		const desk = new CalcDesk(atelierWith({ L: '10 ; 20 ;  ; 40', M: '1 ; 2 ; 3 ; 4' }));

		desk.runFromPanel('stats:M', 'L');

		const text = desk.entries.at(-1)?.text ?? '';
		// Effectif total : 1 + 2 + 4 (la ligne 3 n'a pas de valeur)
		expect(text).toContain('7');
		expect(text).toContain('1 ligne incomplète écartée');
	});

	it('des longueurs différentes ne désactivent plus « Statistiques avec effectifs »', () => {
		const a = atelierWith({ L: '10 ; 20 ; 30', M: '1 ; 2' });

		const action = actionsFor(listOf(a, 'L'), a).find((x) => x.id === 'stats:M');

		expect(action?.disabledReason).toBeUndefined();
	});

	it('aucune ligne en commun : désactivé, avec la raison', () => {
		const a = atelierWith({ L: '10 ; 20', M: ' ;  ; 1 ; 2' });

		const action = actionsFor(listOf(a, 'L'), a).find((x) => x.id === 'stats:M');

		expect(action?.disabledReason).toContain('aucune ligne');
	});

	it('le diagramme avec effectifs associe ligne à ligne, et le dit', () => {
		const a = atelierWith({ L: '10 ; 20 ;  ; 20', M: '1 ; 2 ; 3 ; 4' });

		const chart = listChart(a, 'L', 'M');

		expect(chart.ok).toBe(true);
		if (chart.ok) expect(chart.note).toBe('1 ligne incomplète écartée');
	});
});

describe('dans Calcul', () => {
	it('.ajustement L : M associe ligne à ligne, et le dit', () => {
		const result = answer(atelierWith(GAP), '.ajustement L : M');

		expect(result.kind).toBe('commande');
		if (result.kind !== 'commande') return;
		expect(result.output).toMatch(/y = 2x \+ 1|2x \+ 1/);
		expect(result.note).toContain('1 ligne incomplète écartée');
	});

	it('.croiser L M associe ligne à ligne, et le dit', () => {
		const result = answer(atelierWith({ L: 'a ; b ;  ; a', M: 'x ; y ; x ; y' }), '.croiser L M');

		expect(result.kind).toBe('commande');
		if (result.kind !== 'commande') return;
		expect(result.output).toContain('3 individus');
		expect(result.output).toContain('1 ligne incomplète écartée');
	});

	it('une loi (.simuler) exige une probabilité sur chaque ligne d’une valeur', () => {
		const result = answer(atelierWith({ L: '1 ; 2 ; 3', M: '0,5 ;  ; 0,5' }), '.simuler L M 100');

		expect(result.kind).toBe('refus');
		if (result.kind === 'refus') expect(result.message).toContain('ligne 2');
	});
});

describe('revue de la PR 3b', () => {
	// Réunir deux séries ne demande aucun appariement : rien n'est écarté
	it('.stats L ; M réunit les deux séries, sans rien écarter', () => {
		const result = answer(atelierWith({ L: '1 ; 2 ; 3', M: '10 ; 20' }), '.stats L ; M');

		expect(result.kind).toBe('commande');
		if (result.kind !== 'commande') return;
		expect(result.output).toContain('5');
		expect(result.note ?? '').not.toContain('écartée');
	});

	it('.ajustement L : M sans aucune ligne commune : la raison du bouton', () => {
		const result = answer(atelierWith({ L: '1 ; 2', M: ' ;  ; 3 ; 4' }), '.ajustement L : M');

		expect(result).toMatchObject({
			kind: 'refus',
			message: 'L et M n’ont aucune ligne remplie en commun.'
		});
	});

	it('l’écho de Calcul reste ce que l’élève a tapé', () => {
		const result = answer(
			atelierWith({ L: '1 ; 2 ; 3 ; 4', M: '3 ; 5 ; 7 ; 9' }),
			'.ajustement L : M'
		);

		expect(result.kind === 'commande' && result.input).toBe('.ajustement L : M');
	});

	it('.croiser avec une ligne écartée ne propose pas la piste .filtrer (qui la refuserait)', () => {
		const a = atelierWith({ L: 'a ; b ;  ; a', M: 'x ; y ; x ; y' });

		const result = crossCommand(a, 'L M');

		expect(result.ok).toBe(true);
		if (result.ok) expect(result.text).not.toContain('.filtrer');
	});

	it('« Loi avec probabilités » : même raison au bouton et à la commande', () => {
		const a = atelierWith({ L: '1 ; 2', M: ' ;  ; 0,5 ; 0,5' });
		const desk = new CalcDesk(a);

		const reason = actionsFor(listOf(a, 'L'), a).find((x) => x.id === 'law:M')?.disabledReason;
		desk.runFromPanel('law:M', 'L');

		expect(reason).toBe(desk.entries.at(-1)?.text);
	});

	it('ajustement depuis la carte sans ligne commune : bouton désactivé, et la raison au clic', () => {
		const a = atelierWith({ L: '1 ; 2 ; 3', M: ' ;  ;  ; 4 ; 5 ; 6' });
		const desk = new CalcDesk(a);

		const reason = actionsFor(listOf(a, 'L'), a).find((x) => x.id === 'fit:M')?.disabledReason;
		desk.runFromPanel('fit:M', 'L');

		expect(reason).toBe('L et M n’ont aucune ligne remplie en commun.');
		expect(desk.entries.at(-1)?.text).toBe(reason);
	});

	it('un diagramme avec effectifs sans ligne commune le dit', () => {
		const a = atelierWith({ L: '10 ; 20', M: ' ;  ; 1 ; 2' });

		const chart = listChart(a, 'L', 'M');

		expect(chart).toEqual({ ok: false, message: 'L et M n’ont aucune ligne remplie en commun.' });
	});
});
