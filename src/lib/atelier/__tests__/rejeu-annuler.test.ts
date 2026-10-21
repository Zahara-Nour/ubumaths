/**
 * Annuler / Rétablir au rejeu d'un historique (revue de #1518).
 *
 * Une ligne « Annuler » ou « Rétablir » n'est rejouable que si l'étape qu'elle
 * défait ou refait vient elle-même d'une ligne rejouable de la console. Une
 * étape qui n'a pas de ligne (curseur glissé, réglage d'affichage, carte) n'est
 * pas dans le rejeu : un `annuler` rejoué y déferait l'étape de console
 * précédente et détruirait des objets (mesuré : `a` puis `f` disparaissaient).
 */
import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { HISTORY_FORMAT, historyToJson } from '../history-export';
import { readHistory } from '../history-import';

/** Le rejeu de l'export JSON de cette console, dans un atelier neuf. */
function replayed(desk: CalcDesk): CalcDesk {
	const read = readHistory(historyToJson(desk.entries, new Date()));
	if (!read.ok) throw new Error(read.message);
	const again = new CalcDesk(new Atelier());
	const report = again.replay(read.history);
	if (!report.ok) throw new Error(JSON.stringify(report));
	return again;
}

/** Les définitions de l'atelier, par nom : ce qu'un rejeu doit rendre. */
function definitions(atelier: Atelier): Record<string, string> {
	return Object.fromEntries(atelier.objects.map((o) => [o.name, o.definition]));
}

describe('une étape sans ligne de console ne se rejoue pas', () => {
	it('curseur glissé puis Ctrl+Z : le rejeu garde a', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('a = 2');
		desk.atelier.slideTo('a', 4);
		desk.atelier.endGesture();
		expect(desk.undo()).not.toBeNull();
		expect(desk.atelier.get('a')?.definition).toBe('2');

		// La ligne s'affiche, mais ne porte aucun geste à rejouer
		const last = desk.entries.at(-1)!;
		expect(last.text).toMatch(/^Annulé/);
		expect(last.replay).toBeUndefined();

		expect(definitions(replayed(desk).atelier)).toEqual(definitions(desk.atelier));
	});

	it('réglage d’affichage puis Ctrl+Z : le rejeu garde f', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('f(x) = x^2');
		desk.atelier.setDisplay('f', { lineStyle: 'dashed' });
		desk.undo();
		expect(desk.atelier.get('f')).toBeDefined();

		const again = replayed(desk);
		expect(again.atelier.get('f')?.definition).toBe(desk.atelier.get('f')?.definition);
		expect(definitions(again.atelier)).toEqual(definitions(desk.atelier));
	});

	it('Rétablir d’une étape sans ligne ne se rejoue pas non plus', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('f(x) = x^2');
		desk.atelier.setDisplay('f', { lineStyle: 'dashed' });
		desk.undo();
		desk.redo();
		expect(desk.entries.at(-1)!.replay).toBeUndefined();
		expect(definitions(replayed(desk).atelier)).toEqual(definitions(desk.atelier));
	});

	it('mêlé : ligne, réglage, Ctrl+Z, Ctrl+Z, Rétablir → même état au rejeu', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('a = 2');
		desk.submit('f(x) = a x');
		desk.atelier.setDisplay('f', { lineStyle: 'dashed' });
		desk.undo(); // le réglage : pas rejouable
		desk.undo(); // f : rejouable
		desk.redo(); // f revient : rejouable
		expect(desk.atelier.get('f')).toBeDefined();

		const kinds = desk.entries.map((e) => e.replay?.kind ?? null);
		expect(kinds).toEqual(['saisie', 'saisie', null, 'annuler', 'rétablir']);
		expect(definitions(replayed(desk).atelier)).toEqual(definitions(desk.atelier));
	});

	it('mêlé : la suppression annulée après un réglage se rejoue bien', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('f(x) = x^2');
		desk.submit('g(x) = 3');
		desk.atelier.setDisplay('f', { lineStyle: 'dashed' });
		desk.remove('g');
		desk.undo(); // la suppression de g : rejouable
		expect(desk.atelier.get('g')).toBeDefined();
		expect(desk.entries.at(-1)!.replay).toEqual({ kind: 'annuler' });
		expect(definitions(replayed(desk).atelier)).toEqual(definitions(desk.atelier));
	});
});

describe('rejeu d’un « annuler » d’ancien fichier', () => {
	it('juste après une suppression qui ne se rejoue pas : erreur, rien d’autre n’est défait', () => {
		// Un fichier d'avant le lot 5 PR 2 : « annuler » ne suivait qu'une suppression
		const file = JSON.stringify({
			format: HISTORY_FORMAT,
			version: 1,
			exportedAt: new Date().toISOString(),
			entries: [
				{ kind: 'saisie', input: 'a = 1', label: 'a = 1', text: 'a = 1', failed: false },
				{ kind: 'supprimer', name: 'g', label: 'Supprimer g', text: 'g supprimée.', failed: true },
				{ kind: 'annuler', label: 'Annuler la suppression', text: 'g est revenue.', failed: false }
			]
		});
		const read = readHistory(file);
		if (!read.ok) throw new Error(read.message);
		const desk = new CalcDesk(new Atelier());
		const report = desk.replay(read.history);

		expect(report.ok).toBe(false);
		expect(desk.atelier.get('a')?.definition).toBe('1');
	});
});
