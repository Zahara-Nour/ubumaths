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
 *
 * « Repartir de zéro » garde aussi la console (décision de David du
 * 2026-10-19, revue de #1524) : Annuler rend alors tout, et le rejeu aussi.
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
	it('vide l’atelier en une étape, que Ctrl+Z défait ; la console reste', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('a = 2');
		desk.submit('f(x) = a x');
		desk.atelier.editCells([{ column: 2, row: 1, text: '5' }]);
		const before = desk.atelier.serialize();

		desk.reset();
		expect(desk.atelier.objects).toEqual([]);
		expect(desk.entries.map((e) => e.label).slice(0, 2)).toEqual(['a = 2', 'f(x) = a x']);
		expect(texts(desk).at(-1)).toBe('Atelier vidé.');

		expect(desk.undo()).not.toBeNull();
		expect(desk.atelier.serialize()).toEqual(before);
		expect(desk.entries.find((e) => e.text === 'Atelier vidé.')?.undone).toBe(true);

		expect(desk.redo()).not.toBeNull();
		expect(desk.atelier.objects).toEqual([]);
	});

	it('le rejeu après « Repartir de zéro » rend le même atelier', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('a = 2');
		desk.reset();
		desk.submit('b = 3');

		const read = readHistory(historyToJson(desk.entries, new Date()));
		if (!read.ok) throw new Error(read.message);
		const again = new CalcDesk(new Atelier());
		expect(again.replay(read.history).ok).toBe(true);
		expect(definitions(again.atelier)).toEqual(definitions(desk.atelier));
	});

	it('« Repartir de zéro » annulé puis rétabli se rejoue : la console a gardé l’atelier d’avant', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('a = 2');
		desk.submit('f(x) = a x');
		desk.reset();
		desk.undo();
		desk.submit('b = 3');

		const read = readHistory(historyToJson(desk.entries, new Date()));
		if (!read.ok) throw new Error(read.message);
		const again = new CalcDesk(new Atelier());
		expect(again.replay(read.history).ok).toBe(true);
		expect(definitions(again.atelier)).toEqual({ a: '2', f: 'a x', b: '3' });

		desk.redo();
		const read2 = readHistory(historyToJson(desk.entries, new Date()));
		if (!read2.ok) throw new Error(read2.message);
		const third = new CalcDesk(new Atelier());
		expect(third.replay(read2.history).ok).toBe(true);
		expect(definitions(third.atelier)).toEqual(definitions(desk.atelier));
	});
});

describe('Annuler un remplacement rend les réglages d’avant (revue de #1524)', () => {
	it('les lois des variables aléatoires et le repère de Géométrie reviennent', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '2' }, 'text');
		atelier.rememberLaw('X', 'X suit B(10 ; 0,5)');
		atelier.setFigureFrame(false);

		atelier.replaceWith(FICHIER, 'charger un atelier');
		// Comme une relecture : les réglages repartent de leur défaut
		expect(atelier.lawOf('X')).toBeUndefined();
		expect(atelier.figureFrame).toBe(true);

		expect(atelier.undo()).toBe('charger un atelier');
		expect(atelier.lawOf('X')).toBe('X suit B(10 ; 0,5)');
		expect(atelier.figureFrame).toBe(false);

		expect(atelier.redo()).toBe('charger un atelier');
		expect(atelier.lawOf('X')).toBeUndefined();
		expect(atelier.figureFrame).toBe(true);
	});

	it('les réglages changés APRÈS le remplacement sont ceux que Rétablir rend', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '2' }, 'text');
		atelier.replaceWith(FICHIER, 'charger un atelier');
		atelier.setFigureFrame(false);

		atelier.undo();
		expect(atelier.figureFrame).toBe(true);
		atelier.redo();
		expect(atelier.figureFrame).toBe(false);
	});
});

describe('le toast « Annuler » d’un remplacement (revue de #1524)', () => {
	it('une modification hors étape faite après compte : l’étape n’est plus la dernière', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '2' }, 'text');
		atelier.replaceWith(FICHIER, 'charger un atelier');
		const stepId = atelier.lastStepId;
		if (stepId === null) throw new Error('le remplacement aurait dû être une étape');
		expect(atelier.isTopStep(stepId)).toBe(true);

		// Hors de toute étape : rangée seulement au prochain geste (`#capture`)
		atelier.update('g', 'x^4', 'text');
		expect(atelier.isTopStep(stepId)).toBe(false);
		// Et rien n'a été défait : g garde sa nouvelle définition
		expect(atelier.get('g')?.definition).toBe('x^4');
	});
});
