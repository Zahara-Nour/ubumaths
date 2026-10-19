/**
 * Charger un fichier et Repartir de zéro, annulables (lot 5, PR 3).
 *
 * Phase 0 : `docs/wip/atelier-annuler-retablir-phase0.md`, avec la décision de
 * David du 2026-10-19 — la console au chargement d'un fichier : elle n'est PAS
 * remplacée. Une ligne « Atelier chargé depuis … » s'ajoute, porte l'étape (elle
 * est barrée si on annule), puis les lignes du fichier, à la suite.
 *
 * Au rejeu d'un export, un chargement ne se refait pas (le contenu du fichier
 * n'est pas dans l'historique) : le rejeu s'arrête là, et le dit.
 */
import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { historyToJson } from '../history-export';
import { readHistory } from '../history-import';
import { keptHistoryOf } from '../history-storage';
import { ATELIER_STATE_VERSION, type AtelierState } from '../persistence';

const FICHIER: AtelierState = {
	version: ATELIER_STATE_VERSION,
	objects: [{ name: 'g', kind: 'function', definition: 'x^3' }],
	grid: { cells: { C1: '7' } }
};

/** Une console de fichier : deux lignes tapées dans un autre atelier. */
function fileConsole() {
	const other = new CalcDesk(new Atelier());
	other.submit('g(x) = x^3');
	other.submit('g(2)');
	return keptHistoryOf(other.entries, other.typedInputs);
}

/** Charger comme le fait la page : remplacer l'atelier, puis le dire à la console. */
function load(desk: CalcDesk, state: AtelierState = FICHIER) {
	desk.atelier.replaceWith(state, 'charger un atelier');
	desk.loaded('atelier-2026-10-19.atelier.json', fileConsole());
}

function definitions(atelier: Atelier): Record<string, string> {
	return Object.fromEntries(atelier.objects.map((o) => [o.name, o.definition]));
}

function texts(desk: CalcDesk): string[] {
	return desk.entries.map((e) => e.text);
}

describe('charger un fichier', () => {
	it('garde la console, ajoute la ligne du chargement puis celles du fichier', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('f(x) = x^2');
		desk.submit('f(3)');
		load(desk);

		expect(definitions(desk.atelier)).toEqual({ g: 'x^3' });
		const labels = desk.entries.map((e) => e.label);
		expect(labels.slice(0, 2)).toEqual(['f(x) = x^2', 'f(3)']);
		expect(texts(desk)[2]).toBe('Atelier chargé depuis atelier-2026-10-19.atelier.json.');
		expect(labels.slice(3)).toEqual(['g(x) = x^3', 'g(2)']);
		// Les saisies du fichier se rappellent aussi par ↑
		expect(desk.typedInputs.slice(-2)).toEqual(['g(x) = x^3', 'g(2)']);
	});

	it('Annuler rend les objets et la grille d’avant, et barre la ligne du chargement', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('f(x) = x^2');
		desk.atelier.editCells([{ column: 2, row: 1, text: '12' }]);
		const before = desk.atelier.serialize();
		load(desk);

		expect(desk.undo()).not.toBeNull();
		expect(desk.atelier.serialize()).toEqual(before);
		const loadLine = desk.entries.find((e) => e.text.startsWith('Atelier chargé'));
		expect(loadLine?.undone).toBe(true);
		// Les lignes ajoutées restent
		expect(desk.entries.some((e) => e.label === 'g(2)')).toBe(true);

		expect(desk.redo()).not.toBeNull();
		expect(definitions(desk.atelier)).toEqual({ g: 'x^3' });
		expect(desk.entries.find((e) => e.text.startsWith('Atelier chargé'))?.undone).toBeUndefined();
	});

	it('le rejeu d’un export s’arrête au chargement, et dit pourquoi', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('f(x) = x^2');
		load(desk);

		const read = readHistory(historyToJson(desk.entries, new Date()));
		if (!read.ok) throw new Error(read.message);
		const again = new CalcDesk(new Atelier());
		const report = again.replay(read.history);

		expect(report.ok).toBe(false);
		// f a été refaite, le contenu du fichier n'a pas été inventé
		expect(definitions(again.atelier)).toEqual({ f: 'x^2' });
		expect(again.notice).toContain('Rejeu arrêté à la ligne 2');
		expect(again.notice).toContain('atelier-2026-10-19.atelier.json');
	});

	it('Annuler le chargement ne laisse pas de ligne « annuler » rejouable', () => {
		const desk = new CalcDesk(new Atelier());
		load(desk);
		desk.undo();
		const undoLine = desk.entries.at(-1);
		expect(undoLine?.text).toBe('Annulé : charger un atelier.');
		expect(undoLine?.replay).toBeUndefined();
	});
});

describe('repartir de zéro', () => {
	function reset(desk: CalcDesk) {
		desk.clear();
		desk.reset();
	}

	it('vide l’atelier en une étape, que Ctrl+Z défait', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('a = 2');
		desk.submit('f(x) = a x');
		desk.atelier.editCells([{ column: 2, row: 1, text: '5' }]);
		const before = desk.atelier.serialize();

		reset(desk);
		expect(desk.atelier.objects).toEqual([]);
		expect(texts(desk)).toEqual(['Atelier vidé.']);

		expect(desk.undo()).not.toBeNull();
		expect(desk.atelier.serialize()).toEqual(before);
		expect(desk.entries[0].undone).toBe(true);

		expect(desk.redo()).not.toBeNull();
		expect(desk.atelier.objects).toEqual([]);
	});

	it('le rejeu après « Repartir de zéro » rend le même atelier', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('a = 2');
		reset(desk);
		desk.submit('b = 3');

		const read = readHistory(historyToJson(desk.entries, new Date()));
		if (!read.ok) throw new Error(read.message);
		const again = new CalcDesk(new Atelier());
		expect(again.replay(read.history).ok).toBe(true);
		expect(definitions(again.atelier)).toEqual(definitions(desk.atelier));
	});

	it('après « Repartir de zéro » annulé, le rejeu s’arrête au lieu de mentir', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('a = 2');
		reset(desk);
		desk.undo();

		const read = readHistory(historyToJson(desk.entries, new Date()));
		if (!read.ok) throw new Error(read.message);
		const again = new CalcDesk(new Atelier());
		const report = again.replay(read.history);
		expect(report.ok).toBe(false);
		expect(again.notice).toContain('Repartir de zéro');
	});
});
