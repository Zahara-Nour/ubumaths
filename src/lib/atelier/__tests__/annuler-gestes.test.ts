/**
 * Annuler / Rétablir, lot 5 PR 2 : un geste continu est UNE étape.
 *
 * Décision de David (phase 0 `docs/wip/atelier-annuler-retablir-phase0.md`) :
 * « tout un glissé de curseur = une seule étape ». Revue de #1517, mesuré : un
 * glissé de 150 crans de la tangente remplissait la pile de 100 étapes, et une
 * suppression faite avant devenait irrécupérable.
 *
 * Un geste s'écrit avec une CLÉ (`step(label, run, gesture)`) : ses écritures
 * se fondent dans une étape jusqu'à `endGesture()` (relâchement du pouce, sortie
 * du champ), ou jusqu'à un autre geste.
 */
import { describe, it, expect } from 'vitest';
import { Atelier, OUTSIDE_STEP_LABEL } from '../atelier.svelte';
import { runInput, type CalcSession } from '../calcul';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';

function withFunction(): Atelier {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
	atelier.setPlotted('f', true);
	atelier.setDisplay('f', { tangentAt: 0 });
	atelier.create({ kind: 'value', name: 'k', definition: '3' }, 'text');
	return atelier;
}

describe('un glissé de la tangente est UNE étape', () => {
	it('supprimer k, glisser la tangente de 150 crans : 2 étapes, Ctrl+Z ×2 rend k', () => {
		const atelier = withFunction();
		const built = atelier.history.steps;
		atelier.removeWithDependents('k');
		for (let i = 1; i <= 150; i++) {
			atelier.setDisplay('f', { tangentAt: i / 100 }, 'tangente:f');
		}
		atelier.endGesture();

		expect(atelier.history.steps).toBe(built + 2);
		atelier.undo();
		expect(atelier.get('f')?.kind === 'function' && atelier.get('f')).toBeTruthy();
		const f = atelier.get('f');
		expect(f?.kind === 'function' ? f.display?.tangentAt : undefined).toBe(0);
		atelier.undo();
		expect(atelier.get('k')?.definition).toBe('3');
	});

	it('deux glissés séparés par un relâchement : deux étapes', () => {
		const atelier = withFunction();
		const built = atelier.history.steps;
		atelier.setDisplay('f', { tangentAt: 1 }, 'tangente:f');
		atelier.setDisplay('f', { tangentAt: 2 }, 'tangente:f');
		atelier.endGesture();
		atelier.setDisplay('f', { tangentAt: 3 }, 'tangente:f');
		atelier.endGesture();

		expect(atelier.history.steps).toBe(built + 2);
	});
});

describe('un glissé du curseur d’une valeur est UNE étape', () => {
	it('100 crans : une étape « curseur de a »', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '1' }, 'text');
		const built = atelier.history.steps;
		for (let i = 2; i <= 100; i++) atelier.slideTo('a', i / 10);
		atelier.endGesture();

		expect(atelier.history.steps).toBe(built + 1);
		expect(atelier.history.undo).toBe('curseur de a');
		atelier.undo();
		expect(atelier.get('a')?.definition).toBe('1');
		atelier.redo();
		expect(atelier.get('a')?.definition).toBe('10');
	});

	it('le curseur ramené à son point de départ ne laisse aucune étape', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '1' }, 'text');
		const built = atelier.history.steps;
		atelier.slideTo('a', 2);
		atelier.slideTo('a', 1);
		atelier.endGesture();

		expect(atelier.history.steps).toBe(built);
	});
});

describe('le curseur de position d’un point_sur est UNE étape', () => {
	it('glisser M sur [AB] : une étape « position de M »', () => {
		const session: CalcSession = {
			atelier: new Atelier(),
			engine: new WebReplEngine(),
			seed: () => 1
		};
		for (const line of ['A = (0 ; 0)', 'B = (4 ; 0)', 's = [AB]', 'M = point_sur(s ; 0,3)']) {
			const done = session.atelier.step(line, () => runInput(session, line));
			if (done.kind !== 'definition') throw new Error(`${line} : ${JSON.stringify(done)}`);
		}
		const atelier = session.atelier;
		const built = atelier.history.steps;
		const before = atelier.get('M')?.definition;
		for (let i = 4; i <= 9; i++) atelier.slidePosition('M', i / 10);
		atelier.endGesture();

		expect(atelier.history.steps).toBe(built + 1);
		expect(atelier.history.undo).toBe('position de M');
		atelier.undo();
		expect(atelier.get('M')?.definition).toBe(before);
	});
});

describe('les réglages du curseur tapés au clavier : une étape par champ quitté', () => {
	it('taper 1, 10, 100 dans « à » puis quitter le champ : une étape', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '1' }, 'text');
		const built = atelier.history.steps;
		for (const max of [1, 10, 100]) atelier.setSlider('a', { max }, 'curseur-max:a');
		atelier.endGesture();

		expect(atelier.history.steps).toBe(built + 1);
	});
});

describe('une modification hors étape se voit tout de suite dans la barre', () => {
	it('l’infobulle d’Annuler dit « modifier l’atelier » sans attendre la prochaine étape', () => {
		const atelier = new Atelier();
		atelier.step('ajouter a', () =>
			atelier.create({ kind: 'value', name: 'a', definition: '1' }, 'text')
		);
		atelier.update('a', '5', 'text');

		expect(atelier.history.undo).toBe(OUTSIDE_STEP_LABEL);
		expect(atelier.undo()).toBe(OUTSIDE_STEP_LABEL);
		expect(atelier.get('a')?.definition).toBe('1');
	});
});

describe('Annuler garde la provenance des objets', () => {
	it('une définition tapée reste « tapée » après Annuler puis Rétablir', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '2' }, 'keyboard');
		atelier.create({ kind: 'value', name: 'b', definition: '3' }, 'text');
		atelier.undo();
		expect(atelier.get('a')?.provenance).toBe('keyboard');
		atelier.redo();
		expect(atelier.get('a')?.provenance).toBe('keyboard');
		expect(atelier.get('b')?.provenance).toBe('text');
	});
});
