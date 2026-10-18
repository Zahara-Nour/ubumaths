/**
 * Géométrie, lot 2, PR 4 : `.relever E1 ; E2 quand t va de a à b pas h` (L6 de
 * `docs/wip/atelier-geometrie-lot2-phase0.md`, validée le 2026-10-18).
 *
 * La commande fait varier une valeur à curseur (ou la position d'un
 * `point_sur`), calcule les deux expressions à chaque pas et range les deux
 * séries dans deux LISTES (colonnes de Données). L'atelier ne valide rien : il
 * relève, l'élève conjecture.
 *
 * Ce qui est asserté est ce que l'élève voit : les listes créées et leurs
 * valeurs (cases vides comprises), la ligne de réponse, les colonnes de la
 * grille, et l'atelier rendu tel qu'il était.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult, type CalcSession } from '../calcul';
import { CalcDesk } from '../desk.svelte';
import { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { isScatter } from '$lib/grapheur/types';
import { historyToJson } from '../history-export';
import { readHistory } from '../history-import';
import { isList, MAX_LISTS, type ListObject } from '../types';
import { actionsFor } from '../actions';

// =============================================================================
// Outils
// =============================================================================

/** Le problème de l'aire (§ « Le but » du lot 2) : M glisse sur [AB], AMNP rectangle. */
const AREA_PROBLEM = [
	'A = (0 ; 0)',
	'B = (4 ; 0)',
	'M = point_sur([AB] ; 0,5)',
	'N = (AM ; MB)',
	'P = (0 ; MB)',
	'S = aire(A, M, N, P)'
];

function session(...lines: string[]): CalcSession {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine(), seed: () => 1 };
	for (const line of lines) {
		const done = runInput(s, line);
		if (done.kind !== 'definition') throw new Error(`${line} : ${JSON.stringify(done)}`);
	}
	return s;
}

function output(result: CalcResult): string {
	if (result.kind !== 'commande') {
		throw new Error(`attendu une commande, reçu ${JSON.stringify(result)}`);
	}
	return result.output;
}

function refusal(result: CalcResult): string {
	if (result.kind !== 'refus') throw new Error(`attendu un refus, reçu ${JSON.stringify(result)}`);
	return result.message;
}

function lists(atelier: Atelier): ListObject[] {
	return atelier.objects.filter(isList);
}

/** Les cases d'une liste, une par ligne de la grille, vides comprises. */
function cells(list: ListObject): string[] {
	return list.definition.split(';').map((entry) => entry.trim());
}

/** Ce que l'atelier range, hors listes : il doit être rendu tel qu'il était. */
function savedObjects(atelier: Atelier): string {
	return JSON.stringify(atelier.serialize().objects.filter((o) => o.kind !== 'list'));
}

/** Aucun caractère de contrôle, hors retour à la ligne. */
const CONTROL = /[\u0000-\u0009\u000b-\u001f\u007f]/;

// =============================================================================
// Le but du lot : le problème de l'aire, de bout en bout
// =============================================================================

describe('le problème de l’aire, de bout en bout', () => {
	it('relève AM et S en 21 lignes, le maximum en AM = 2 avec S = 4', () => {
		const s = session(...AREA_PROBLEM);

		const result = runInput(s, '.relever AM ; S quand M va de 0 à 1 pas 0,05');

		const text = output(result);
		const [x, y] = lists(s.atelier);
		expect([x?.name, y?.name]).toEqual(['L', 'L_1']);
		expect(cells(x)).toHaveLength(21);
		expect(cells(y)).toHaveLength(21);
		// M en A (position 0) ou en B (position 1) : le rectangle est aplati, et
		// `aire` refuse un polygone à sommets confondus — la ligne reste vide
		// dans les DEUX listes, pour que les lignes restent appariées
		expect(cells(x)[0]).toBe('');
		expect(cells(y)[0]).toBe('');
		expect(cells(x)[20]).toBe('');
		expect(cells(y)[20]).toBe('');
		expect(cells(x).slice(1, 6)).toEqual(['0,2', '0,4', '0,6', '0,8', '1']);
		expect(cells(y).slice(1, 6)).toEqual(['0,76', '1,44', '2,04', '2,56', '3']);
		// Le maximum relevé
		const best = y.values.indexOf(Math.max(...y.values));
		expect(x.values[best]).toBe(2);
		expect(y.values[best]).toBe(4);
		expect(y.rows[best]).toBe(11);
		expect(x.values).toHaveLength(19);
		expect(text).toContain('21 lignes');
		expect(text).toContain('2 pas sans valeur');
		expect(text).toMatch(/L\b.*L_1/);
	});

	it('rend M à sa position d’avant : rien ne change hors des listes créées', () => {
		const s = session(...AREA_PROBLEM);
		const before = savedObjects(s.atelier);

		runInput(s, '.relever AM ; S quand M va de 0 à 1 pas 0,05');

		expect(s.atelier.get('M')?.definition).toBe('point_sur([AB] ; 0,5)');
		expect(s.atelier.positionOf('M')).toBe(0.5);
		expect(s.atelier.get('S')?.status).toBe('ok');
		expect(savedObjects(s.atelier)).toBe(before);
	});

	it('les deux listes sont deux colonnes de Données, titrées par les expressions', () => {
		const s = session(...AREA_PROBLEM);

		runInput(s, '.relever AM ; S quand M va de 0 à 1 pas 0,05');

		const [x, y] = lists(s.atelier);
		expect(s.atelier.listAt(x.column)?.name).toBe('L');
		expect(s.atelier.listAt(y.column)?.name).toBe('L_1');
		expect(s.atelier.cell(x.column, 2)).toBe('0,2');
		expect(s.atelier.cell(y.column, 11)).toBe('4');
		expect(s.atelier.titleOf(x.column)).toBe('AM');
		expect(s.atelier.titleOf(y.column)).toBe('S');
	});

	it('la ligne propose le nuage, et le nuage se trace dans Graphe', () => {
		const desk = new CalcDesk(session(...AREA_PROBLEM).atelier);
		const graph = new GrapheurStore(null);

		desk.submit('.relever AM ; S quand M va de 0 à 1 pas 0,05');

		const entry = desk.entries.at(-1)!;
		expect(entry.failed).toBe(false);
		expect(entry.text).toContain('Trace le nuage : sur la carte L, « Nuage avec L_1 ».');
		expect(entry.latex).toBeUndefined();
		expect(entry.text).not.toMatch(CONTROL);
		// Le bouton annoncé existe sur la carte, et il est actif
		const scatter = actionsFor(desk.atelier.get('L')!, desk.atelier).find(
			(a) => a.id === 'scatter:L_1'
		);
		expect(scatter?.disabledReason).toBeUndefined();

		desk.runFromPanel('scatter:L_1', 'L', graph);

		expect(desk.atelier.get('L')?.plottedWith).toBe('L_1');
		const cloud = graph.functions.find(isScatter);
		expect(cloud?.xs).toHaveLength(19);
		expect(cloud?.ys[cloud.xs.indexOf(2)]).toBe(4);
	});

	it('l’historique exporté se rejoue : les mêmes listes', () => {
		const desk = new CalcDesk(new Atelier());
		for (const line of AREA_PROBLEM) desk.submit(line);
		desk.submit('.relever AM ; S quand M va de 0 à 1 pas 0,05');
		expect(desk.entries.at(-1)?.replay).toEqual({
			kind: 'saisie',
			input: '.relever AM ; S quand M va de 0 à 1 pas 0,05'
		});

		const read = readHistory(historyToJson(desk.entries, new Date('2026-10-19T10:00:00Z')));
		expect(read.ok).toBe(true);
		if (!read.ok) return;
		const replayed = new CalcDesk(new Atelier());
		expect(replayed.replay(read.history).ok).toBe(true);

		expect(lists(replayed.atelier).map((l) => l.definition)).toEqual(
			lists(desk.atelier).map((l) => l.definition)
		);
	});
});

// =============================================================================
// Une valeur à curseur
// =============================================================================

describe('faire varier une valeur à curseur', () => {
	it('relève t et f(t) pas à pas', () => {
		const s = session('t = 3', 'f(x) = x^2');

		output(runInput(s, '.relever t ; f(t) quand t va de 0 à 2 pas 0,5'));

		const [x, y] = lists(s.atelier);
		expect(cells(x)).toEqual(['0', '0,5', '1', '1,5', '2']);
		expect(cells(y)).toEqual(['0', '0,25', '1', '2,25', '4']);
	});

	it('rend t et son curseur tels qu’ils étaient, même relevé hors de ses bornes', () => {
		const s = session('t = 3', 'f(x) = x^2');
		const slider = s.atelier.get('t')?.kind === 'value' ? s.atelier.get('t') : undefined;
		const before = savedObjects(s.atelier);

		output(runInput(s, '.relever t ; f(t) quand t va de 0 à 40 pas 10'));

		expect(s.atelier.get('t')).toEqual(slider);
		expect(savedObjects(s.atelier)).toBe(before);
		expect(cells(lists(s.atelier)[1])).toEqual(['0', '100', '400', '900', '1600']);
	});

	it('un pas exact (1/3) : les valeurs exactes passent en décimal', () => {
		const s = session('t = 0');

		output(runInput(s, '.relever t ; 3t quand t va de 0 à 1 pas 1/3'));

		const [x, y] = lists(s.atelier);
		expect(cells(x)).toEqual(['0', '0,3333333333', '0,6666666667', '1']);
		expect(cells(y)).toEqual(['0', '1', '2', '3']);
	});

	it('bornes négatives et décimales, virgule ou point', () => {
		const s = session('t = 0');

		output(runInput(s, '.relever t ; t^2 quand t va de -1,5 à 1.5 pas 1,5'));

		expect(cells(lists(s.atelier)[0])).toEqual(['-1,5', '0', '1,5']);
		expect(cells(lists(s.atelier)[1])).toEqual(['2,25', '0', '2,25']);
	});

	it('« a » s’écrit aussi pour « à », et les accents de la commande sont facultatifs', () => {
		const s = session('t = 0');

		output(runInput(s, '.relever t ; 2t quand t va de 0 a 1 pas 1'));

		expect(cells(lists(s.atelier)[1])).toEqual(['0', '2']);
	});

	it('un pas qui ne tombe pas juste sur la fin : le relevé s’arrête avant, et le dit', () => {
		const s = session('t = 0');

		const text = output(runInput(s, '.relever t ; t quand t va de 0 à 1 pas 0,3'));

		expect(cells(lists(s.atelier)[0])).toEqual(['0', '0,3', '0,6', '0,9']);
		expect(text).toContain('Le pas ne tombe pas juste sur 1 : le relevé s’arrête à 0,9.');
	});

	it('un pas sans valeur laisse sa ligne vide dans les deux listes, et le dit', () => {
		const s = session('t = 2');

		const text = output(runInput(s, '.relever t ; 1/t quand t va de -1 à 1 pas 1'));

		const [x, y] = lists(s.atelier);
		expect(cells(x)).toEqual(['-1', '', '1']);
		expect(cells(y)).toEqual(['-1', '', '1']);
		expect(text).toContain('1 pas sans valeur');
	});

	it('un angle est relevé dans l’unité du réglage, sans l’unité dans la case', () => {
		const s = session('O = (0 ; 0)', 'I = (1 ; 0)', 'c = cercle(O ; 1)', 'M = point_sur(c ; 0)');

		output(runInput(s, '.relever angle(I, O, M) ; IM quand M va de 0 à 180 pas 90'));

		expect(cells(lists(s.atelier)[0])).toEqual(['0', '90', '180']);
	});
});

// =============================================================================
// Refus : rien n'est créé
// =============================================================================

describe('les refus disent pourquoi, et ne créent rien', () => {
	function refused(lines: readonly string[], command: string): string {
		const s = session(...lines);
		const before = lists(s.atelier).length;
		const message = refusal(runInput(s, command));
		expect(lists(s.atelier)).toHaveLength(before);
		return message;
	}

	it('plus de 200 pas : refus, avec le nombre de pas que ça ferait', () => {
		expect(refused(['t = 0'], '.relever t ; t quand t va de 0 à 1 pas 0,001')).toBe(
			'Ce relevé ferait 1001 pas : 200 au plus. Agrandis le pas.'
		);
	});

	it('200 pas tout juste : accepté', () => {
		const s = session('t = 0');
		output(runInput(s, '.relever t ; t quand t va de 1 à 200 pas 1'));
		expect(cells(lists(s.atelier)[0])).toHaveLength(200);
	});

	it('un pas nul ou négatif, une fin avant le début', () => {
		expect(refused(['t = 0'], '.relever t ; t quand t va de 0 à 1 pas 0')).toBe(
			'Le pas doit être positif.'
		);
		expect(refused(['t = 0'], '.relever t ; t quand t va de 0 à 1 pas -1')).toBe(
			'Le pas doit être positif.'
		);
		expect(refused(['t = 0'], '.relever t ; t quand t va de 1 à 0 pas 0,1')).toBe(
			'La fin doit être après le début.'
		);
	});

	it('une borne qui n’est pas un nombre', () => {
		expect(refused(['t = 0'], '.relever t ; t quand t va de 0 à π pas 0,1')).toBe(
			'« π » n’est pas un nombre : écris un décimal ou une fraction (1,5 ; 1/3).'
		);
	});

	it('l’écriture incomplète : la forme attendue', () => {
		const usage =
			'Écris par exemple .relever AM ; S quand M va de 0 à 1 pas 0,05 (deux expressions séparées par « ; »).';
		expect(refused(['t = 0'], '.relever t quand t va de 0 à 1 pas 0,5')).toBe(usage);
		expect(refused(['t = 0'], '.relever t ; t')).toBe(usage);
		expect(refused(['t = 0'], '.relever t ; t quand t va de 0 à 1')).toBe(usage);
	});

	it('ce qui varie doit exister', () => {
		expect(refused([], '.relever t ; t quand t va de 0 à 1 pas 0,5')).toBe(
			'« t » n’existe pas dans l’atelier : crée d’abord la valeur, par exemple t = 0.'
		);
	});

	it('une valeur calculée ne se fait pas varier : on fait varier celle dont elle dépend', () => {
		expect(refused(['a = 1', 't = a + 1'], '.relever t ; t quand t va de 0 à 1 pas 0,5')).toBe(
			'« t » est calculée à partir d’autres objets : fais varier une valeur à curseur.'
		);
	});

	it('un point qui n’est pas posé sur un objet', () => {
		expect(
			refused(['A = (0 ; 0)', 'B = (1 ; 0)'], '.relever AB ; AB quand A va de 0 à 1 pas 0,5')
		).toBe(
			'« A » n’est pas un point posé sur un objet : on fait varier une valeur à curseur, ou la position d’un point_sur.'
		);
	});

	it('un point_sur qui suit une valeur : c’est la valeur qui varie', () => {
		expect(
			refused(
				['A = (0 ; 0)', 'B = (4 ; 0)', 'k = 0,5', 'M = point_sur([AB] ; k)'],
				'.relever AM ; AM quand M va de 0 à 1 pas 0,5'
			)
		).toBe('« M » suit la valeur « k » : écris .relever … quand k va de … à … pas ….');
	});

	it('une fonction, une liste ne varient pas', () => {
		expect(refused(['f(x) = x^2'], '.relever f(1) ; 1 quand f va de 0 à 1 pas 0,5')).toBe(
			'On fait varier une valeur à curseur, ou la position d’un point_sur : « f » n’en est pas une.'
		);
	});

	it('une expression qui n’a de valeur à aucun pas', () => {
		expect(refused(['t = 0'], '.relever t ; x quand t va de 0 à 1 pas 0,5')).toBe(
			'« x » n’a de valeur à aucun pas du relevé : « x » n’est pas défini dans l’atelier.'
		);
		expect(
			refused(
				['A = (0 ; 0)', 'B = (4 ; 0)', 'M = point_sur([AB] ; 0,5)'],
				'.relever M ; AM quand M va de 0 à 1 pas 0,5'
			)
		).toBe(
			'« M » n’a de valeur à aucun pas du relevé : « M » est un point ; relève une mesure (AM, aire(…)).'
		);
	});

	it('une fonction usuelle sans parenthèses : le refus de Calcul', () => {
		expect(refused(['t = 1'], '.relever t ; ln t quand t va de 1 à 2 pas 1')).toBe(
			'« ln t » : écris ln(t) avec des parenthèses.'
		);
	});

	it(`plus de place pour deux listes (${MAX_LISTS} au plus)`, () => {
		const full = Array.from({ length: MAX_LISTS - 1 }, (_, i) => `L_${i + 1} = ${i} ; ${i}`);
		expect(refused(['t = 0', ...full], '.relever t ; t quand t va de 0 à 1 pas 0,5')).toBe(
			`Un relevé crée deux listes, et l’atelier en a déjà ${MAX_LISTS - 1} sur ${MAX_LISTS} : supprime-en une d’abord.`
		);
	});
});

// =============================================================================
// Les noms : jamais d'écrasement
// =============================================================================

describe('les noms des listes', () => {
	it('deux noms libres, jamais celui d’un objet existant', () => {
		const s = session('t = 0', 'L = 1 ; 2');

		const text = output(runInput(s, '.relever t ; t quand t va de 0 à 1 pas 1'));

		expect(s.atelier.get('L')?.definition).toBe('1 ; 2');
		const created = lists(s.atelier).slice(1);
		expect(created.map((l) => l.name)).toEqual(['M', 'N']);
		expect(text).toContain('dans M et N');
	});

	it('deux relevés de suite : quatre listes, aucune écrasée', () => {
		const s = session('t = 0');

		runInput(s, '.relever t ; t quand t va de 0 à 1 pas 1');
		runInput(s, '.relever t ; 2t quand t va de 0 à 1 pas 1');

		expect(lists(s.atelier).map((l) => [l.name, l.definition])).toEqual([
			['L', '0 ; 1'],
			['M', '0 ; 1'],
			['N', '0 ; 1'],
			['L_1', '0 ; 2']
		]);
	});
});
