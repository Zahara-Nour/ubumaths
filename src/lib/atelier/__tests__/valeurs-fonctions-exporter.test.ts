/**
 * `.valeurs`, `.fonctions` et `.exporter` dans Calcul — retrait de `/cas`
 * (phase 0 `docs/archive/wip/atelier-cas-phase0.md`, PR 4, 2026-10-13).
 *
 * Avant : `.valeurs` et `.fonctions` rendaient la liste du MOTEUR, en anglais
 * (« Variables: », « Functions: »), où une suite passait pour une fonction et
 * `g(t) = 2t+1` s'écrivait en x ; `.exporter` répondait « Aucun historique a
 * exporter » même après dix calculs (l'atelier ne passe pas son historique au
 * moteur).
 *
 * Après : les deux listes sont faites par l'atelier, depuis SES cartes (le
 * panneau fait foi), en français ; `.exporter` lance le MÊME téléchargement
 * que le bouton « JSON (pour rejouer) », et donne la même raison que le bouton
 * désactivé quand il n'y a rien.
 */

import { describe, it, expect, vi } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { displayName } from '../names';
import { HISTORY_FORMAT, NOTHING_TO_EXPORT, historyToJson } from '../history-export';
import { readHistory } from '../history-import';

// =============================================================================
// Décor
// =============================================================================

/** Un pupitre dont le téléchargement est observé au lieu d'être fait. */
function deskWith(...inputs: string[]) {
	const desk = new CalcDesk(new Atelier());
	const download = vi.fn();
	desk.download = download;
	for (const input of inputs) desk.submit(input);
	return { desk, download };
}

/** Ce que répond la dernière ligne. */
function lastLine(desk: CalcDesk) {
	const last = desk.entries.at(-1);
	expect(last).toBeDefined();
	return { text: last?.text ?? '', failed: last?.failed ?? true };
}

/** Les noms cités par une réponse, une ligne par objet. */
function listedNames(text: string): string[] {
	return text
		.split('\n')
		.slice(1)
		.map((line) => line.trim().split(/[ (=]/)[0]);
}

// Un atelier qui a de tout : deux valeurs, deux fonctions (l'une en t), une
// dérivée, une suite, une liste
const FULL = ['a = 5', 'b = 2a', 'f(x) = x^2 - 3x', 'g(t) = 2t+1', 'u(n) = 2n', 'L = 1 ; 2 ; 3'];

// =============================================================================
// .valeurs
// =============================================================================

describe('.valeurs', () => {
	it('liste les valeurs du panneau, en français, dans l’ordre des cartes', () => {
		const { desk } = deskWith(...FULL, '.valeurs');
		const { text, failed } = lastLine(desk);
		expect(failed).toBe(false);
		expect(text).toBe('Tes valeurs :\n  a = 5\n  b = 2a');
	});

	it('cite exactement les cartes « valeur », rien d’autre', () => {
		const { desk } = deskWith(...FULL, '.valeurs');
		const expected = desk.atelier.objects.filter((o) => o.kind === 'value').map((o) => o.name);
		expect(listedNames(lastLine(desk).text)).toEqual(expected);
	});

	it('aucune valeur : le dit, et montre comment en créer une', () => {
		const { desk } = deskWith('f(x) = x^2', '.valeurs');
		expect(lastLine(desk)).toEqual({
			text: 'Aucune valeur dans tes objets. Pour en créer une : a = 5',
			failed: false
		});
	});

	it('une valeur en attente le dit, comme sa carte', () => {
		const { desk } = deskWith('d = k + 1', '.valeurs');
		expect(lastLine(desk).text).toBe('Tes valeurs :\n  d = k + 1 (en attente)');
	});

	it('l’alias moteur `.vars` donne la même réponse', () => {
		const { desk } = deskWith('a = 5', '.vars');
		expect(lastLine(desk).text).toBe('Tes valeurs :\n  a = 5');
	});

	it('plus un mot d’anglais', () => {
		const { desk } = deskWith(...FULL, '.valeurs');
		expect(lastLine(desk).text).not.toMatch(/Variables|No variables/);
	});
});

// =============================================================================
// .fonctions
// =============================================================================

describe('.fonctions', () => {
	it('liste les fonctions du panneau, chacune dans sa lettre, f′ comprise', () => {
		const { desk } = deskWith(...FULL, '.dériver f', '.fonctions');
		const { text, failed } = lastLine(desk);
		expect(failed).toBe(false);
		expect(text).toBe('Tes fonctions :\n  f(x) = x^2 - 3x\n  g(t) = 2t+1\n  f′(x) = 2x-3');
	});

	it('cite exactement les cartes « fonction » (ni la suite u, ni la liste L)', () => {
		const { desk } = deskWith(...FULL, '.dériver f', '.fonctions');
		const expected = desk.atelier.objects
			.filter((o) => o.kind === 'function')
			.map((o) => displayName(o.name));
		expect(listedNames(lastLine(desk).text)).toEqual(expected);
		expect(lastLine(desk).text).not.toMatch(/u\(n\)|L =/);
	});

	it('une réciproque s’écrit lisiblement, sans accolades internes', () => {
		const { desk } = deskWith('f(x) = 2x+1', '.réciproque f', '.fonctions');
		expect(lastLine(desk).text).toBe('Tes fonctions :\n  f(x) = 2x+1\n  f⁻¹(x) = (x-1)/2');
	});

	it('une fonction définie sur un intervalle le garde', () => {
		const { desk } = deskWith('h(x) = 2x sur [0 ; 5]', '.fonctions');
		expect(lastLine(desk).text).toBe('Tes fonctions :\n  h(x) = 2x sur [0 ; 5]');
	});

	it('aucune fonction : le dit, et montre comment en créer une', () => {
		const { desk } = deskWith('a = 5', '.fonctions');
		expect(lastLine(desk)).toEqual({
			text: 'Aucune fonction dans tes objets. Pour en créer une : f(x) = x^2',
			failed: false
		});
	});

	it('plus un mot d’anglais', () => {
		const { desk } = deskWith(...FULL, '.fonctions');
		expect(lastLine(desk).text).not.toMatch(/Functions|No functions/);
	});
});

// =============================================================================
// .exporter
// =============================================================================

describe('.exporter', () => {
	it('historique plein : le même téléchargement que le bouton JSON', () => {
		const { desk, download } = deskWith('2+3', 'a = 5');
		const before = [...desk.entries];

		desk.submit('.exporter');

		expect(download).toHaveBeenCalledTimes(1);
		expect(download).toHaveBeenCalledWith(before, 'json');
		// Pas de ligne de plus : l'historique exporté reste celui de l'élève
		expect(desk.entries).toEqual(before);
		expect(desk.notice).toMatch(/^Historique exporté : calcul-\d{4}-\d{2}-\d{2}\.json\.$/);
		expect(desk.draft).toBe('');
	});

	it('le fichier produit se rejoue (format chiphre-calcul)', () => {
		const { desk, download } = deskWith('2+3', 'a = 5', '.exporter');
		const [entries] = download.mock.calls[0];
		const read = readHistory(historyToJson(entries, new Date()));
		expect(read.ok).toBe(true);
		expect(read.ok && read.history.entries.length).toBe(2);
		expect(JSON.parse(historyToJson(entries, new Date())).format).toBe(HISTORY_FORMAT);
		expect(desk.entries).toHaveLength(2);
	});

	it('historique vide : rien ne part, la raison du bouton désactivé', () => {
		const { desk, download } = deskWith('.exporter');
		expect(download).not.toHaveBeenCalled();
		expect(desk.notice).toBe(NOTHING_TO_EXPORT);
		expect(NOTHING_TO_EXPORT).toBe('Rien à exporter pour l’instant.');
		expect(desk.entries).toEqual([]);
	});

	it('l’alias moteur `.export` fait de même', () => {
		const { download } = deskWith('2+3', '.export');
		expect(download).toHaveBeenCalledTimes(1);
	});

	it('tapée, elle se rappelle par ↑ comme toute saisie', () => {
		const { desk } = deskWith('2+3', '.exporter');
		desk.recallPrevious();
		expect(desk.draft).toBe('.exporter');
	});

	it('avec un argument : refusée, en français, sans téléchargement', () => {
		const { desk, download } = deskWith('2+3', '.exporter ubumark');
		expect(download).not.toHaveBeenCalled();
		expect(lastLine(desk)).toEqual({
			text: '« .exporter » s’écrit seul : il télécharge l’historique en JSON, pour le rejouer.',
			failed: true
		});
	});

	it('un rejeu ne télécharge rien', () => {
		const { desk: source } = deskWith('2+3', '4+4');
		const file = JSON.parse(historyToJson(source.entries, new Date()));
		// Une ligne `.exporter` glissée dans le fichier (écrit à la main, ou par
		// une version qui la gardait)
		file.entries.splice(1, 0, {
			kind: 'saisie',
			input: '.exporter',
			label: '.exporter',
			text: '',
			failed: false
		});
		const read = readHistory(JSON.stringify(file));
		expect(read, JSON.stringify(read)).toMatchObject({ ok: true });
		if (!read.ok) return;

		const { desk, download } = deskWith();
		const report = desk.replay(read.history);

		expect(download).not.toHaveBeenCalled();
		expect(report.ok).toBe(true);
		expect(desk.entries.map((e) => e.label)).toEqual(['2+3', '4+4']);
	});
});
