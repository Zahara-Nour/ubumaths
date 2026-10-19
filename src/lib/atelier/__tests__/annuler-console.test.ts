/**
 * Annuler / Rétablir, lot 5 PR 2 : la console garde la trace.
 *
 * - Annuler et Rétablir, par le bouton OU par Ctrl+Z, écrivent une ligne
 *   rejouable (revue de #1517 : Ctrl+Z après une suppression n'écrivait plus
 *   rien, et le rejeu d'un export refaisait la suppression).
 * - Décision de David : la ligne dont l'étape est annulée est BARRÉE ; Rétablir
 *   la débarre. Une ligne « Annuler » ou « Rétablir » ne se barre jamais.
 */
import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk, type Entry } from '../desk.svelte';
import { historyToJson } from '../history-export';
import { readHistory } from '../history-import';
import { consoleReadings } from '../reading';
import { keptHistoryOf, readKeptHistory } from '../history-storage';

function line(desk: CalcDesk, label: string): Entry {
	const found = desk.entries.find((e) => e.label === label);
	if (!found) throw new Error(`pas de ligne « ${label} »`);
	return found;
}

function replayed(desk: CalcDesk): CalcDesk {
	const read = readHistory(historyToJson(desk.entries, new Date()));
	if (!read.ok) throw new Error(read.message);
	const again = new CalcDesk(new Atelier());
	const report = again.replay(read.history);
	if (!report.ok) throw new Error(JSON.stringify(report));
	return again;
}

describe('Annuler barre la ligne, Rétablir la débarre', () => {
	it('une définition annulée est barrée, et une ligne « Annuler » s’écrit', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('a = 2');

		expect(desk.undo()?.label).toBeTruthy();
		expect(line(desk, 'a = 2').undone).toBe(true);
		const last = desk.entries.at(-1)!;
		expect(last.replay).toEqual({ kind: 'annuler' });
		expect(last.undone).toBeUndefined();
		expect(desk.atelier.get('a')).toBeUndefined();

		expect(desk.redo()).not.toBeNull();
		expect(line(desk, 'a = 2').undone).toBeUndefined();
		expect(desk.entries.at(-1)!.replay).toEqual({ kind: 'rétablir' });
		expect(desk.atelier.get('a')?.definition).toBe('2');
	});

	it('une étape sans ligne (une carte) n’en barre aucune, mais Annuler s’écrit', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('a = 2');
		desk.atelier.step('définir a', () => desk.atelier.update('a', '3', 'text'));

		desk.undo();
		expect(line(desk, 'a = 2').undone).toBeUndefined();
		expect(desk.atelier.get('a')?.definition).toBe('2');
	});

	it('après une nouvelle étape, les lignes barrées restent barrées', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('a = 2');
		desk.undo();
		desk.submit('b = 5');

		expect(line(desk, 'a = 2').undone).toBe(true);
		expect(desk.redo()).toBeNull();
	});

	it('rien à annuler : pas de ligne', () => {
		const desk = new CalcDesk(new Atelier());
		expect(desk.undo()).toBeNull();
		expect(desk.redo()).toBeNull();
		expect(desk.entries).toHaveLength(0);
	});

	it('le toast d’une suppression barre la ligne « Supprimer »', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('f(x) = x^2');
		const removed = desk.remove('f');
		if (!removed.ok) throw new Error(removed.message);

		expect(desk.undoRemoval(removed)).toBe(true);
		expect(line(desk, 'Supprimer f').undone).toBe(true);
		expect(desk.atelier.get('f')).toBeDefined();
	});
});

describe('le rejeu refait Annuler et Rétablir', () => {
	it('supprimer f, Ctrl+Z, exporter, rejouer : f est là', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('f(x) = x^2');
		desk.remove('f');
		desk.undo();

		expect(replayed(desk).atelier.get('f')?.definition).toBe('x^2');
	});

	it('annuler puis rétablir une définition, exporter, rejouer : elle est là', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('a = 2');
		desk.submit('a = 7');
		desk.undo();
		desk.redo();

		expect(replayed(desk).atelier.get('a')?.definition).toBe('7');
	});

	it('un ancien fichier (« annuler » juste après « supprimer ») se rejoue toujours', () => {
		const old = JSON.stringify({
			format: 'chiphre-calcul',
			version: 1,
			exportedAt: '2026-10-10T10:00:00.000Z',
			entries: [
				{ kind: 'saisie', input: 'f(x) = x^2', label: 'f(x) = x^2', text: 'f', failed: false },
				{ kind: 'supprimer', name: 'f', label: 'Supprimer f', text: 'f supprimée', failed: false },
				{ kind: 'annuler', label: 'Annuler la suppression', text: 'f remise', failed: false }
			]
		});
		const read = readHistory(old);
		if (!read.ok) throw new Error(read.message);
		const desk = new CalcDesk(new Atelier());
		expect(desk.replay(read.history).ok).toBe(true);
		expect(desk.atelier.get('f')?.definition).toBe('x^2');
	});
});

describe('une ligne barrée le reste au rechargement', () => {
	it('rangée puis relue : barrée, sans son étape (la pile ne survit pas)', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('a = 2');
		desk.undo();

		const read = readKeptHistory(
			JSON.parse(JSON.stringify(keptHistoryOf(desk.entries, ['a = 2'])))
		);
		if (read.kind !== 'loaded') throw new Error(read.kind);
		const [defined, undone] = read.history.lines;
		expect(defined.undone).toBe(true);
		expect('stepId' in defined).toBe(false);
		expect(undone.replay).toEqual({ kind: 'annuler' });
	});
});

describe('une ligne barrée ne dessine plus sa lecture graphique', () => {
	it('consoleReadings ignore une ligne annulée', () => {
		const entry = {
			label: 'f(2)',
			failed: false,
			result: { kind: 'calcul', output: '4' }
		} as unknown as Entry;
		expect(consoleReadings([entry], ['f']).get('f')).toEqual([2]);
		expect(consoleReadings([{ ...entry, undone: true }], ['f']).get('f')).toBeUndefined();
	});
});
