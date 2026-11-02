/**
 * Point à placer sur le cercle trigonométrique — crans, réponse, juge, phrases
 * (chantier `docs/wip/cercle-trotteuse-progress.md` § 4 et § 6)
 *
 * 24 crans de π/12 ; la réponse de l'élève est le cran (`'8'`), la réponse
 * attendue la mesure principale écrite en LaTeX (`\frac{2\pi}{3}`), jugée
 * modulo 2π.
 */

import { describe, it, expect } from 'vitest';
import {
	TRIG_PLACER_STEPS,
	expectedStepAnswer,
	isPlacedAngleCorrect,
	moveStep,
	nearestStep,
	placedAngleMistake,
	principalText,
	readStepAnswer,
	stepAnswer,
	stepOfLatex,
	stepOfRadians,
	stepRadians
} from '$lib/ubumark/utils/trig-placer';

const PI = Math.PI;

describe('crans de π/12', () => {
	it('24 crans', () => {
		expect(TRIG_PLACER_STEPS).toBe(24);
	});

	it('cran d’un angle multiple de π/12, modulo 2π', () => {
		expect(stepOfRadians(0)).toBe(0);
		expect(stepOfRadians((2 * PI) / 3)).toBe(8);
		expect(stepOfRadians(-PI / 4)).toBe(21);
		expect(stepOfRadians((13 * PI) / 6)).toBe(2);
		expect(stepOfRadians(2 * PI)).toBe(0);
	});

	it('angle hors des crans : null', () => {
		expect(stepOfRadians(PI / 5)).toBeNull();
		expect(stepOfRadians(1)).toBeNull();
	});

	it('aimant : le cran le plus proche, modulo 2π', () => {
		expect(nearestStep(PI / 12 + 0.1)).toBe(1);
		expect(nearestStep(-0.05)).toBe(0);
		expect(nearestStep(2 * PI - 0.1)).toBe(0);
		expect(nearestStep(PI)).toBe(12);
	});

	it('radians d’un cran', () => {
		expect(stepRadians(6)).toBeCloseTo(PI / 2);
	});

	it('flèches : un cran, en faisant le tour', () => {
		expect(moveStep(23, 1)).toBe(0);
		expect(moveStep(0, -1)).toBe(23);
		expect(moveStep(5, 1)).toBe(6);
	});
});

describe('réponse de l’élève', () => {
	it('le cran écrit, relu', () => {
		expect(stepAnswer(8)).toBe('8');
		expect(readStepAnswer('8')).toBe(8);
		expect(readStepAnswer(' 0 ')).toBe(0);
	});

	it('vide, illisible ou hors des crans : null', () => {
		expect(readStepAnswer('')).toBeNull();
		expect(readStepAnswer('24')).toBeNull();
		expect(readStepAnswer('-1')).toBeNull();
		expect(readStepAnswer('2.5')).toBeNull();
		expect(readStepAnswer('abc')).toBeNull();
	});
});

describe('réponse attendue : la mesure principale', () => {
	it('écrite en LaTeX, dans ]−π ; π]', () => {
		expect(expectedStepAnswer(8)).toBe('\\frac{2\\pi}{3}');
		expect(expectedStepAnswer(21)).toBe('-\\frac{\\pi}{4}');
		expect(expectedStepAnswer(0)).toBe('0');
		expect(expectedStepAnswer(12)).toBe('\\pi');
		expect(expectedStepAnswer(18)).toBe('-\\frac{\\pi}{2}');
		expect(expectedStepAnswer(2)).toBe('\\frac{\\pi}{6}');
	});

	it('relue en cran, pour toutes les mesures principales', () => {
		for (let k = 0; k < TRIG_PLACER_STEPS; k++) {
			expect(stepOfLatex(expectedStepAnswer(k))).toBe(k);
		}
		expect(stepOfLatex('pas un angle')).toBeNull();
	});

	it('texte de la mesure principale (phrase de correction)', () => {
		expect(principalText(9)).toBe('3π/4');
		expect(principalText(21)).toBe('−π/4');
		expect(principalText(12)).toBe('π');
		expect(principalText(0)).toBe('0');
	});
});

describe('juge', () => {
	it('le cran attendu, modulo 2π', () => {
		expect(isPlacedAngleCorrect('8', '\\frac{2\\pi}{3}')).toBe(true);
		expect(isPlacedAngleCorrect('21', '-\\frac{\\pi}{4}')).toBe(true);
		expect(isPlacedAngleCorrect('9', '\\frac{2\\pi}{3}')).toBe(false);
	});

	it('rien de posé : faux', () => {
		expect(isPlacedAngleCorrect('', '\\frac{2\\pi}{3}')).toBe(false);
	});
});

describe('phrase de la correction', () => {
	it('juste : null', () => {
		expect(placedAngleMistake('M', '8', '\\frac{2\\pi}{3}')).toBeNull();
	});

	it('faux : la mesure principale du point de l’élève', () => {
		expect(placedAngleMistake('M', '9', '\\frac{2\\pi}{3}')).toBe('Ton point M est sur 3π/4.');
		expect(placedAngleMistake('N', '15', '\\frac{\\pi}{4}')).toBe('Ton point N est sur −3π/4.');
	});

	it('pas posé', () => {
		expect(placedAngleMistake('M', '', '\\frac{2\\pi}{3}')).toBe('Tu n’as pas placé M.');
	});
});
