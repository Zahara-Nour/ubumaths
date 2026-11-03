/**
 * Le registre lit une ligne comme l'Atelier : degrés, `π`, refus de `pi`
 * (chantier `registre-reference`, lot 2, PR 3). Les réponses justes sont tenues
 * par le corpus (`registre-corpus/`) ; ici, les refus et les limites.
 */

import { describe, expect, it } from 'vitest';
import { WebReplEngine } from '../web-repl-engine';
import { ANGLE_POWER_MESSAGE, PI_IN_LETTERS_MESSAGE, readTypedLine } from '../../core/typed-line';
import { STRAY_DEGREE_MESSAGE } from '../../core/degrees';

// =============================================================================
// Fonctions
// =============================================================================

function run(...lines: string[]) {
	const engine = new WebReplEngine();
	let result = engine.execute(lines[0]);
	for (const line of lines.slice(1)) result = engine.execute(line);
	return result;
}

// =============================================================================
// Tests
// =============================================================================

describe('readTypedLine', () => {
	it('porte les degrés en unité, en texte comme en LaTeX', () => {
		expect(readTypedLine('cos(60°)')).toEqual({ ok: true, text: 'cos(60[°])' });
		expect(readTypedLine('\\cos(60^{\\circ})')).toEqual({ ok: true, text: '\\cos(60\\unit{°})' });
	});

	it('écrit π tapé comme la constante', () => {
		expect(readTypedLine('5π/6')).toEqual({ ok: true, text: '5\\pi /6' });
	});

	it('relit une ligne déjà lue sans la changer (l’Atelier lit avant le registre)', () => {
		for (const line of ['cos(60[°])', '5\\pi /6', '\\cos(60\\unit{°})']) {
			expect(readTypedLine(line)).toEqual({ ok: true, text: line });
		}
	});

	it('garde une température et les mots qui contiennent « pi »', () => {
		expect(readTypedLine('20 °C')).toEqual({ ok: true, text: '20 °C' });
		expect(readTypedLine('p*i')).toEqual({ ok: true, text: 'p*i' });
	});
});

describe('Le registre refuse comme l’Atelier', () => {
	it('`pi` en lettres', () => {
		const result = run('2pi');
		expect(result.success).toBe(false);
		expect(result.error?.message).toBe(PI_IN_LETTERS_MESSAGE);
	});

	it('`pi` en lettres dans une commande', () => {
		expect(run('.simplify cos(pi/3)').error?.message).toBe(PI_IN_LETTERS_MESSAGE);
	});

	it('un ° qui ne suit rien', () => {
		expect(run('° + 1').error?.message).toBe(STRAY_DEGREE_MESSAGE);
	});

	it('une puissance d’un angle', () => {
		expect(run('60°^2').error?.message).toBe(ANGLE_POWER_MESSAGE);
	});
});

describe('Les commandes et les degrés', () => {
	it('`.simplify` donne la valeur remarquable d’un angle en degrés', () => {
		expect(run('.simplify cos(420°)').answer).toBe('\\dfrac{1}{2}');
	});

	it('`.simplify` garde en degrés un angle hors table', () => {
		expect(run('.simplify cos(20°)x').answer).toBe('\\cos\\left( 20~\\unit{°} \\right) x');
	});

	it('une commande d’écriture montre l’angle tel que tapé', () => {
		expect(run('.latex cos(60°)').output).toContain('°');
	});

	it('`.convert °` : le ° est l’unité cible, pas un angle', () => {
		expect(run('1[rad]', '.convert °').success).toBe(true);
	});
});
