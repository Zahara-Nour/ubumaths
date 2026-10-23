/**
 * Pause de lecture après une sous-étape chorégraphiée : elle dépend de la
 * longueur de sa consigne (≈ 15 caractères lus par seconde), bornée.
 */

import { describe, it, expect } from 'vitest';
import { ConstructionExecutor, readingPauseMs } from '../executor';
import { fadeInProgress } from '../render-helpers';
import { AUTO_PAUSE_BETWEEN_STEPS, DEFAULT_STEP_DURATION } from '../../constants';

describe('readingPauseMs', () => {
	it('sans consigne : pause par défaut', () => {
		expect(readingPauseMs(undefined)).toBe(AUTO_PAUSE_BETWEEN_STEPS);
		expect(readingPauseMs('')).toBe(AUTO_PAUSE_BETWEEN_STEPS);
	});

	it('consigne courte : jamais moins que la pause par défaut', () => {
		expect(readingPauseMs('On trace')).toBe(AUTO_PAUSE_BETWEEN_STEPS);
	});

	it('60 ms par caractère', () => {
		// 25 caractères
		expect(readingPauseMs('On marque I à 3,2 cm de A')).toBe(1500);
	});

	it('plafonnée à 4 s', () => {
		expect(readingPauseMs('x'.repeat(200))).toBe(4000);
	});
});

describe('durées des sous-étapes', () => {
	it('la pause suit la consigne (apparition de I, milieu @mesure)', () => {
		const exec = new ConstructionExecutor();
		exec.load(['A = point(0, 0)', 'B = point(6.4, 0)', 'I = milieu(A, B) @mesure'].join('\n'));
		// A, B, puis 3 sous-étapes ; la 3e : fondu de I, « On marque I à 3,2 cm de A »
		expect(exec.stepDurations[4]).toBe(DEFAULT_STEP_DURATION + 1500);
	});

	it('une consigne longue allonge la sous-étape (pose de la règle)', () => {
		const exec = new ConstructionExecutor();
		exec.load(['A = point(0, 0)', 'B = point(6.4, 0)', 'I = milieu(A, B) @mesure'].join('\n'));
		const consigne = 'On place le 0 de la règle sur A et on lit AB = 6,4 cm';
		exec.step(); // A
		exec.step(); // B
		exec.step(); // pose de la règle
		// Pause de lecture = la part de la sous-étape après le geste
		const pause = exec.stepDurations[2] * (1 - exec.pausePhaseStart);
		expect(pause).toBeCloseTo(60 * consigne.length);
	});
});

describe('fondu puis pause de lecture', () => {
	it('fondu d’une sous-étape : joué sur DEFAULT_STEP_DURATION, puis la pause', () => {
		const exec = new ConstructionExecutor();
		exec.load(['A = point(0, 0)', 'B = point(6.4, 0)', 'I = milieu(A, B) @mesure'].join('\n'));
		for (let i = 0; i < 5; i++) exec.step(); // A, B, règle, crayon, fondu de I
		const total = DEFAULT_STEP_DURATION + 1500;
		expect(exec.drawPhaseEnd).toBeCloseTo(DEFAULT_STEP_DURATION / total);
		expect(exec.pausePhaseStart).toBeCloseTo(DEFAULT_STEP_DURATION / total);
	});
});

describe('fadeInProgress', () => {
	const fade = { movePhaseEnd: 0, drawPhaseStart: 0, drawPhaseEnd: 0.25 };

	it('le fondu se joue avant la pause, puis reste complet', () => {
		expect(fadeInProgress(0.125, fade)).toBeCloseTo(0.5);
		expect(fadeInProgress(0.25, fade)).toBe(1);
		expect(fadeInProgress(0.9, fade)).toBe(1);
	});

	it('étape sans phase de fondu (fondu hérité, drawPhaseEnd = 1) : avancement brut', () => {
		expect(fadeInProgress(0.4, { movePhaseEnd: 0, drawPhaseStart: 0, drawPhaseEnd: 1 })).toBe(0.4);
	});

	it('geste d’instrument : avancement brut', () => {
		expect(fadeInProgress(0.4, { movePhaseEnd: 0.3, drawPhaseStart: 0.3, drawPhaseEnd: 0.6 })).toBe(
			0.4
		);
	});
});
