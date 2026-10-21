/**
 * Enregistrer et charger l'atelier dans un fichier — lot 1 de
 * `docs/archive/wip/atelier-refonte-interface-phase0.md` (`atelier-file.ts`).
 *
 * Par le vrai chemin : un atelier et un pupitre remplis, le fichier écrit, puis
 * relu par un atelier et un pupitre NEUFS — et ce qu'ils contiennent.
 *
 * ⚠️ Le fichier vient de DEHORS (n'importe qui peut en écrire un) : la moitié
 * de ce fichier forge des fichiers abîmés ou piégés.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import {
	ATELIER_FILE_FORMAT,
	ATELIER_FILE_VERSION,
	MAX_ATELIER_FILE_LENGTH,
	atelierFileName,
	atelierFileToJson,
	readAtelierFile
} from '../atelier-file';
import { historyToJson } from '../history-export';
import { ATELIER_STATE_VERSION } from '../persistence';

// =============================================================================
// Décor
// =============================================================================

const NOW = new Date('2026-10-18T14:30:00Z');

/** Un atelier et son pupitre : une fonction tracée, une valeur, une liste, des lignes. */
function filled() {
	const atelier = new Atelier();
	const desk = new CalcDesk(atelier);
	desk.submit('f(x)=x^2+1');
	desk.submit('a = 5');
	desk.submit('L = {1;2;3}');
	desk.submit('2+3');
	atelier.setPlotted('f', true);
	return { atelier, desk };
}

function fileOf(atelier: Atelier, desk: CalcDesk): string {
	return atelierFileToJson(atelier.serialize(), desk.entries, desk.typedInputs, NOW);
}

// =============================================================================
// Aller-retour
// =============================================================================

describe('enregistrer puis charger', () => {
	it('rend le même atelier : objets, tracé, liste', () => {
		const { atelier, desk } = filled();

		const read = readAtelierFile(fileOf(atelier, desk));

		expect(read.kind).toBe('atelier');
		if (read.kind !== 'atelier') return;
		const reopened = new Atelier();
		reopened.restore(read.state);
		expect(reopened.names).toEqual(atelier.names);
		expect(reopened.serialize()).toEqual(atelier.serialize());
		expect(read.dropped).toBe(0);
	});

	it('rend les lignes de la console et les saisies à rappeler', () => {
		const { atelier, desk } = filled();

		const read = readAtelierFile(fileOf(atelier, desk));

		if (read.kind !== 'atelier') throw new Error(read.kind);
		const reopened = new CalcDesk(new Atelier());
		reopened.restoreHistory(read.history);
		expect(reopened.entries.map((e) => e.label)).toEqual(desk.entries.map((e) => e.label));
		expect(reopened.entries.map((e) => e.text)).toEqual(desk.entries.map((e) => e.text));
		expect(reopened.typedInputs).toEqual(desk.typedInputs);
	});

	it('garde ce que l’export « pour rejouer » perdait : une définition changée sur la carte', () => {
		const { atelier, desk } = filled();
		// Modifiée sur la carte, sans ligne dans la console
		atelier.update('f', 'x^3');

		const read = readAtelierFile(fileOf(atelier, desk));

		if (read.kind !== 'atelier') throw new Error(read.kind);
		expect(read.state.objects.find((o) => o.name === 'f')?.definition).toBe('x^3');
	});

	it('le fichier dit son format, sa version et sa date', () => {
		const { atelier, desk } = filled();

		const content = JSON.parse(fileOf(atelier, desk));

		expect(content.format).toBe(ATELIER_FILE_FORMAT);
		expect(content.version).toBe(ATELIER_FILE_VERSION);
		expect(content.savedAt).toBe('2026-10-18T14:30:00.000Z');
		expect(content.atelier.version).toBe(ATELIER_STATE_VERSION);
	});

	it('un atelier sans ligne de console se relit avec une console vide', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'g', definition: 'x+1' });
		const desk = new CalcDesk(atelier);

		const read = readAtelierFile(fileOf(atelier, desk));

		if (read.kind !== 'atelier') throw new Error(read.kind);
		expect(read.state.objects.map((o) => o.name)).toEqual(['g']);
		expect(read.history.lines).toEqual([]);
	});
});

describe('un aller-retour complet : tout ce que range le navigateur', () => {
	/**
	 * Revue de #1479 : le décor du premier aller-retour (f, a, L) ne touchait
	 * ni la grille, ni les réglages d'affichage. Ici, chaque champ rangé par
	 * `serialize()` est présent dans le décor — vérifié AVANT l'aller-retour,
	 * sinon le test passerait sur un champ absent des deux côtés.
	 */
	function everything() {
		const atelier = new Atelier();
		const desk = new CalcDesk(atelier);
		desk.submit('f(x)=x^2+1');
		atelier.setPlotted('f', true);
		// Une courbe non tracée, mais réglée : son affichage est rangé quand même
		desk.submit('g(x)=2x');
		atelier.setPlotted('g', false);
		atelier.setDisplay('g', { lineWidth: 4, tangentAt: 1 });
		// Une valeur à curseur réglé
		desk.submit('a = 3');
		atelier.setSlider('a', { min: -5, max: 5, step: 0.5 });
		desk.submit('u(n)=2n+1');
		atelier.create({ kind: 'point', name: 'A', definition: '(1 ; 2)' }, 'text');
		// La grille : cellules d'une colonne SANS nom, titre, hasard (graine), mise en forme
		atelier.editCells([
			{ column: 3, row: 1, text: 'bonjour' },
			{ column: 3, row: 2, text: '=ALEA()' }
		]);
		atelier.setTitle(3, 'Mesures');
		atelier.applyStyle({ left: 3, right: 3, top: 1, bottom: 2 }, { bold: true });
		return { atelier, desk };
	}

	it('le décor porte bien chaque champ', () => {
		const state = everything().atelier.serialize();
		const byName = new Map(state.objects.map((o) => [o.name, o]));

		expect(byName.get('f')).toMatchObject({ plotted: true });
		expect(byName.get('g')?.plotted).toBeUndefined();
		expect(byName.get('g')?.display).toBeDefined();
		expect(byName.get('a')?.slider).toEqual({ min: -5, max: 5, step: 0.5 });
		expect(byName.get('u')).toMatchObject({ kind: 'sequence' });
		expect(byName.get('A')).toMatchObject({ kind: 'point' });
		expect(state.grid?.cells).toMatchObject({ D1: 'bonjour' });
		expect(state.grid?.titles).toEqual({ D: 'Mesures' });
		expect(typeof state.grid?.seed).toBe('number');
		expect(state.grid?.formats?.length).toBe(1);
	});

	it('rend exactement le même état, et un atelier neuf le reprend tel quel', () => {
		const { atelier, desk } = everything();
		const before = atelier.serialize();

		const read = readAtelierFile(fileOf(atelier, desk));

		if (read.kind !== 'atelier') throw new Error(read.kind);
		expect(read.dropped).toBe(0);
		expect(read.state).toEqual(before);
		const reopened = new Atelier();
		reopened.restore(read.state);
		expect(reopened.serialize()).toEqual(before);
		expect(reopened.cell(3, 1)).toBe('bonjour');
		expect(reopened.titleOf(3)).toBe('Mesures');
		expect(reopened.styleAt(3, 2).bold).toBe(true);
	});
});

describe('le nom du fichier', () => {
	it('atelier-AAAA-MM-JJ.atelier.json, à la date du jour', () => {
		expect(atelierFileName(new Date(2026, 9, 18, 9, 0))).toBe('atelier-2026-10-18.atelier.json');
	});
});

// =============================================================================
// L'ancien fichier « pour rejouer »
// =============================================================================

describe('un historique JSON d’avant la refonte', () => {
	it('se lit encore : il sera rejoué', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('f(x)=x^2');

		const read = readAtelierFile(historyToJson(desk.entries, NOW));

		expect(read.kind).toBe('replay');
		if (read.kind !== 'replay') return;
		expect(read.history.entries.map((e) => e.label)).toEqual(['f(x)=x^2']);
	});

	it('abîmé, il est refusé avec le message de l’historique', () => {
		const read = readAtelierFile(
			JSON.stringify({ format: 'chiphre-calcul', version: 1, entries: 'non' })
		);

		expect(read).toEqual({
			kind: 'error',
			message: 'Ce fichier n’est pas un historique de Calcul.'
		});
	});
});

// =============================================================================
// Fichiers refusés : rien n'est remplacé
// =============================================================================

describe('un fichier refusé', () => {
	const NOT_AN_ATELIER = 'Ce fichier n’est pas un atelier Chiphre.';

	it('vide', () => {
		expect(readAtelierFile('')).toEqual({ kind: 'error', message: NOT_AN_ATELIER });
	});

	it('qui n’est pas du JSON', () => {
		expect(readAtelierFile('bonjour')).toEqual({ kind: 'error', message: NOT_AN_ATELIER });
	});

	it('du JSON d’un autre format', () => {
		expect(readAtelierFile('{"bonjour": 1}')).toEqual({ kind: 'error', message: NOT_AN_ATELIER });
		expect(readAtelierFile('[1, 2]')).toEqual({ kind: 'error', message: NOT_AN_ATELIER });
		expect(readAtelierFile('null')).toEqual({ kind: 'error', message: NOT_AN_ATELIER });
	});

	it('trop gros : refusé avant d’être lu', () => {
		const huge = ' '.repeat(MAX_ATELIER_FILE_LENGTH + 1);

		const read = readAtelierFile(huge);

		expect(read.kind).toBe('error');
		if (read.kind !== 'error') return;
		expect(read.message).toBe('Ce fichier est trop gros pour être un atelier.');
	});

	it('d’une version plus récente du fichier', () => {
		const read = readAtelierFile(
			JSON.stringify({ format: ATELIER_FILE_FORMAT, version: ATELIER_FILE_VERSION + 1 })
		);

		expect(read).toEqual({
			kind: 'error',
			message: 'Cet atelier vient d’une version plus récente de Chiphre.'
		});
	});

	it('dont l’atelier vient d’une version plus récente', () => {
		const { atelier, desk } = filled();
		const content = JSON.parse(fileOf(atelier, desk));
		content.atelier.version = ATELIER_STATE_VERSION + 1;

		const read = readAtelierFile(JSON.stringify(content));

		expect(read).toEqual({
			kind: 'error',
			message: 'Cet atelier vient d’une version plus récente de Chiphre.'
		});
	});

	it('sans atelier, ou un atelier sans liste d’objets', () => {
		const shell = { format: ATELIER_FILE_FORMAT, version: ATELIER_FILE_VERSION };

		expect(readAtelierFile(JSON.stringify(shell)).kind).toBe('error');
		expect(
			readAtelierFile(JSON.stringify({ ...shell, atelier: { version: 3, objects: 'f' } })).kind
		).toBe('error');
	});
});

// =============================================================================
// Fichiers abîmés : on garde ce qui se lit, et on le dit
// =============================================================================

describe('un fichier abîmé', () => {
	it('un objet illisible est écarté seul, et compté', () => {
		const { atelier, desk } = filled();
		const content = JSON.parse(fileOf(atelier, desk));
		content.atelier.objects.push({ name: '', kind: 'licorne', definition: 42 });

		const read = readAtelierFile(JSON.stringify(content));

		if (read.kind !== 'atelier') throw new Error(read.kind);
		expect(read.state.objects.map((o) => o.name)).toEqual(atelier.names);
		expect(read.dropped).toBe(1);
	});

	it('sans console dans le fichier : rien à dire', () => {
		const { atelier, desk } = filled();
		const content = JSON.parse(fileOf(atelier, desk));
		delete content.history;

		const read = readAtelierFile(JSON.stringify(content));

		if (read.kind !== 'atelier') throw new Error(read.kind);
		expect(read.consoleNotice).toBeNull();
	});

	it('une console complète : rien à dire', () => {
		const { atelier, desk } = filled();

		const read = readAtelierFile(fileOf(atelier, desk));

		if (read.kind !== 'atelier') throw new Error(read.kind);
		expect(read.consoleNotice).toBeNull();
	});

	it('une console illisible ne part pas en silence', () => {
		const { atelier, desk } = filled();
		const content = JSON.parse(fileOf(atelier, desk));
		content.history = 'pas un historique';

		const read = readAtelierFile(JSON.stringify(content));

		if (read.kind !== 'atelier') throw new Error(read.kind);
		expect(read.consoleNotice).toBe(
			'La console de ce fichier était illisible : elle n’a pas été chargée.'
		);
	});

	it('une console d’une version plus récente ne part pas en silence', () => {
		const { atelier, desk } = filled();
		const content = JSON.parse(fileOf(atelier, desk));
		content.history.version = 99;

		const read = readAtelierFile(JSON.stringify(content));

		if (read.kind !== 'atelier') throw new Error(read.kind);
		expect(read.history.lines).toEqual([]);
		expect(read.consoleNotice).toBe(
			'La console de ce fichier vient d’une version plus récente de Chiphre : elle n’a pas été chargée.'
		);
	});

	it('des lignes de console illisibles sont écartées, et comptées', () => {
		const { atelier, desk } = filled();
		const content = JSON.parse(fileOf(atelier, desk));
		content.history.lines.push({ label: 42 }, 'licorne');

		const read = readAtelierFile(JSON.stringify(content));

		if (read.kind !== 'atelier') throw new Error(read.kind);
		expect(read.history.lines.length).toBe(desk.entries.length);
		expect(read.consoleNotice).toBe('2 ligne(s) de la console étaient illisibles.');
	});

	it('un historique illisible laisse la console vide, l’atelier est gardé', () => {
		const { atelier, desk } = filled();
		const content = JSON.parse(fileOf(atelier, desk));
		content.history = 'pas un historique';

		const read = readAtelierFile(JSON.stringify(content));

		if (read.kind !== 'atelier') throw new Error(read.kind);
		expect(read.state.objects.length).toBe(atelier.names.length);
		expect(read.history.lines).toEqual([]);
	});

	it('une formule piégée de la console est écartée (liste blanche de MathLive)', () => {
		const { atelier, desk } = filled();
		const content = JSON.parse(fileOf(atelier, desk));
		content.history.lines[0].latex = '\\href{javascript:alert(1)}{x}';

		const read = readAtelierFile(JSON.stringify(content));

		if (read.kind !== 'atelier') throw new Error(read.kind);
		expect(read.history.lines[0].latex).toBeUndefined();
	});

	it('trop de lignes de console : seules les plus récentes sont gardées', () => {
		const { atelier, desk } = filled();
		const content = JSON.parse(fileOf(atelier, desk));
		const line = content.history.lines[0];
		content.history.lines = Array.from({ length: 1000 }, () => line);

		const read = readAtelierFile(JSON.stringify(content));

		if (read.kind !== 'atelier') throw new Error(read.kind);
		expect(read.history.lines.length).toBe(100);
	});
});
