/**
 * Pause de lecture après une sous-étape chorégraphiée : elle dépend de la
 * longueur de sa consigne (≈ 15 caractères lus par seconde), bornée.
 */

import { describe, it, expect } from 'vitest';
import { ConstructionExecutor, readingPauseMs } from '../executor';
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
