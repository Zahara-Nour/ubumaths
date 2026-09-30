/**
 * Minuteur du défilement automatique (autoSlide).
 *
 * Le minuteur ne connaît pas le diaporama : on lui dit quelle diapositive est
 * courante, sa durée, et si le deck est en pause ou en vue d'ensemble.
 * Il rappelle `onexpire` à 0 et `onrevisitfinished` quand on revient sur une
 * diapositive dont le compte est déjà arrivé à 0.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAutoSlideTimer, type AutoSlideTimer } from '../autoSlideTimer.svelte.js';

interface Input {
	key: string;
	duration: number;
	paused: boolean;
	overview: boolean;
}

const base: Input = { key: '0-0', duration: 3000, paused: false, overview: false };

let timer: AutoSlideTimer;
let onexpire: ReturnType<typeof vi.fn>;
let onrevisitfinished: ReturnType<typeof vi.fn>;

beforeEach(() => {
	vi.useFakeTimers();
	onexpire = vi.fn();
	onrevisitfinished = vi.fn();
	timer = createAutoSlideTimer({ onexpire, onrevisitfinished });
});

afterEach(() => {
	timer.destroy();
	vi.useRealTimers();
});

function show(patch: Partial<Input> = {}) {
	timer.update({ ...base, ...patch });
}

describe('compte à rebours', () => {
	it('une diapositive jamais vue démarre avec sa durée complète', () => {
		show();
		expect(timer.duration).toBe(3000);
		expect(timer.remaining).toBe(3000);
		expect(timer.running).toBe(true);
	});

	it('décompte le temps et rappelle onexpire une seule fois à 0', () => {
		show();
		vi.advanceTimersByTime(1000);
		expect(timer.remaining).toBe(2000);
		expect(onexpire).not.toHaveBeenCalled();

		vi.advanceTimersByTime(2000);
		expect(timer.remaining).toBe(0);
		expect(onexpire).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(10_000);
		expect(onexpire).toHaveBeenCalledTimes(1);
		expect(timer.running).toBe(false);
	});

	it('durée 0 : aucun défilement', () => {
		show({ duration: 0 });
		vi.advanceTimersByTime(60_000);
		expect(onexpire).not.toHaveBeenCalled();
		expect(timer.duration).toBe(0);
		expect(timer.remaining).toBe(0);
		expect(timer.running).toBe(false);
	});
});

describe('pause et vue d’ensemble', () => {
	it('la pause gèle le compte, la reprise repart du temps restant', () => {
		show();
		vi.advanceTimersByTime(1000);
		show({ paused: true });
		vi.advanceTimersByTime(10_000);
		expect(timer.remaining).toBe(2000);
		expect(timer.running).toBe(false);
		expect(onexpire).not.toHaveBeenCalled();

		show({ paused: false });
		vi.advanceTimersByTime(1999);
		expect(onexpire).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(onexpire).toHaveBeenCalledTimes(1);
	});

	it('la vue d’ensemble gèle aussi le compte', () => {
		show();
		vi.advanceTimersByTime(500);
		show({ overview: true });
		vi.advanceTimersByTime(10_000);
		expect(timer.remaining).toBe(2500);
		expect(onexpire).not.toHaveBeenCalled();

		show({ overview: false });
		vi.advanceTimersByTime(2500);
		expect(onexpire).toHaveBeenCalledTimes(1);
	});
});

describe('mémoire par diapositive', () => {
	it('quitter garde le temps restant, revenir le reprend', () => {
		show({ key: 'A' });
		vi.advanceTimersByTime(1000);
		show({ key: 'B', duration: 5000 });
		expect(timer.remaining).toBe(5000);
		vi.advanceTimersByTime(1000);

		show({ key: 'A' });
		expect(timer.remaining).toBe(2000);
		expect(timer.running).toBe(true);
		vi.advanceTimersByTime(2000);
		expect(onexpire).toHaveBeenCalledTimes(1);
	});

	it('revenir sur une diapositive terminée : demande la pause, pas d’avance', () => {
		show({ key: 'A' });
		vi.advanceTimersByTime(3000);
		expect(onexpire).toHaveBeenCalledTimes(1);

		show({ key: 'B' });
		show({ key: 'A' });
		expect(onrevisitfinished).toHaveBeenCalledTimes(1);
		expect(timer.running).toBe(false);
		vi.advanceTimersByTime(10_000);
		expect(onexpire).toHaveBeenCalledTimes(1);
	});

	it('à la reprise, la diapositive terminée repart pour sa durée complète', () => {
		show({ key: 'A' });
		vi.advanceTimersByTime(3000);
		show({ key: 'B' });
		show({ key: 'A' });
		// Le deck applique la pause demandée
		show({ key: 'A', paused: true });
		expect(timer.remaining).toBe(0);

		show({ key: 'A', paused: false });
		expect(timer.remaining).toBe(3000);
		expect(timer.running).toBe(true);
		vi.advanceTimersByTime(3000);
		expect(onexpire).toHaveBeenCalledTimes(2);
	});

	it('sur la diapositive courante terminée (la dernière), une reprise relance la durée complète', () => {
		show({ key: 'Z' });
		vi.advanceTimersByTime(3000);
		expect(onexpire).toHaveBeenCalledTimes(1);

		show({ key: 'Z', paused: true });
		show({ key: 'Z', paused: false });
		expect(timer.remaining).toBe(3000);
		expect(onrevisitfinished).not.toHaveBeenCalled();
	});

	it('restartCurrent relance la diapositive courante (fragment suivant)', () => {
		show();
		vi.advanceTimersByTime(3000);
		expect(onexpire).toHaveBeenCalledTimes(1);

		timer.restartCurrent();
		expect(timer.remaining).toBe(3000);
		expect(timer.running).toBe(true);
		vi.advanceTimersByTime(3000);
		expect(onexpire).toHaveBeenCalledTimes(2);
	});
});

describe('avance automatique vers une diapositive terminée', () => {
	it('elle est rejouée pour sa durée complète, sans demander la pause', () => {
		show({ key: 'A' });
		vi.advanceTimersByTime(3000);
		show({ key: 'B' });
		vi.advanceTimersByTime(3000);
		expect(onexpire).toHaveBeenCalledTimes(2);

		// A est terminée ; on y arrive par l'expiration de B
		timer.update({ ...base, key: 'A' }, { automatic: true });
		expect(onrevisitfinished).not.toHaveBeenCalled();
		expect(timer.running).toBe(true);
		expect(timer.remaining).toBe(3000);
		vi.advanceTimersByTime(3000);
		expect(onexpire).toHaveBeenCalledTimes(3);
	});

	it('un retour manuel sur une diapositive terminée demande toujours la pause', () => {
		show({ key: 'A' });
		vi.advanceTimersByTime(3000);
		show({ key: 'B' });
		timer.update({ ...base, key: 'A' }, { automatic: false });
		expect(onrevisitfinished).toHaveBeenCalledTimes(1);
		expect(timer.running).toBe(false);
	});
});

describe('durée modifiée pendant le compte', () => {
	it('allonger la durée ajoute l’écart au temps restant, sans remise à zéro', () => {
		show();
		vi.advanceTimersByTime(1000);
		show({ duration: 5000 });
		expect(timer.duration).toBe(5000);
		expect(timer.remaining).toBe(4000);
		vi.advanceTimersByTime(3999);
		expect(onexpire).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(onexpire).toHaveBeenCalledTimes(1);
	});

	// Raccourcir ne fait jamais expirer la diapositive sur-le-champ (un clic sur
	// « −5 s » ne doit pas faire sauter la question affichée) : il lui reste au
	// moins 1 s, ou son temps restant s'il est déjà plus court.
	it('raccourcir sous le temps écoulé : la diapositive garde au moins 1 s', () => {
		show();
		vi.advanceTimersByTime(1000);
		show({ duration: 1500 });
		expect(timer.remaining).toBe(1000);
		expect(onexpire).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1000);
		expect(onexpire).toHaveBeenCalledTimes(1);
	});

	it('raccourcir quand il reste moins d’1 s : le temps restant ne bouge pas', () => {
		show();
		vi.advanceTimersByTime(2500);
		show({ duration: 1000 });
		expect(timer.remaining).toBe(500);
		expect(onexpire).not.toHaveBeenCalled();
	});

	it('ajuster pendant la pause décale aussi le temps restant', () => {
		show();
		vi.advanceTimersByTime(1000);
		show({ paused: true });
		show({ paused: true, duration: 4000 });
		expect(timer.remaining).toBe(3000);
	});

	it('une durée changée pendant l’absence est appliquée au retour', () => {
		show({ key: 'A' });
		vi.advanceTimersByTime(1000);
		show({ key: 'B' });
		show({ key: 'A', duration: 4000 });
		expect(timer.remaining).toBe(3000);
	});

	it('passer à 0 arrête le défilement ; revenir à une durée repart de la durée complète', () => {
		show();
		vi.advanceTimersByTime(1000);
		show({ duration: 0 });
		expect(timer.running).toBe(false);
		vi.advanceTimersByTime(10_000);
		expect(onexpire).not.toHaveBeenCalled();

		show({ duration: 2000 });
		expect(timer.remaining).toBe(2000);
		expect(timer.running).toBe(true);
	});
});
