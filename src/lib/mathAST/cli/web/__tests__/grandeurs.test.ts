/**
 * Les grandeurs dans la console de mathAST (Calcul de l'atelier, `pnpm math`).
 *
 * Phase 0 `docs/archive/wip/grandeurs-phase0.md`, lot A (validée par David le
 * 2026-10-11) : une grandeur se calcule par `tidy`, unité écrite d'abord —
 * comme `{{eval}}`. Mesuré avant : `10[km]/1[h]` répondait « 10 m/s »,
 * `90[km/h]*2[h]` « 180 m », `3[h]+20[min]` une fraction de 17 chiffres.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '../web-repl-engine';

/** Ce que la console répond, sur une console neuve (ou celle donnée). */
function run(input: string, engine = new WebReplEngine()) {
	return engine.execute(input);
}

describe('une grandeur calculée garde son unité écrite', () => {
	it.each([
		['10[km]/1[h]', '10 km/h'],
		['7[mm]*5[mm]', '35 mm^2'],
		['7[mm]*5[cm]', '350 mm^2'],
		['90[km/h]*2[h]', '180 km'],
		['100[g]/2[L]', '50 g/L'],
		['12[km]+300[m]', '12.3 km'],
		// Lot C (décision de David) : deux unités de durée écrites, l'écriture composée
		['3[h]+20[min]', '3 h 20 min'],
		['10[km]/3', '10/3 km'],
		['(3[h]+20[min])*1[km/h]', '10/3 km'],
		['(3[m])^2', '9 m^2'],
		['sqrt(9[m^2])', '3 m'],
		['30[°C]-20[°C]', '10 K'],
		['20[°C]+5[K]', '25 °C'],
		['5[€]*3', '15 €'],
		['2.5[km]*4', '10 km'],
		['2[m]-5[m]', '-3 m'],
		['3[m]-3[m]', '0 m']
	])('%s → %s', (input, expected) => {
		const result = run(input);

		expect(result.success).toBe(true);
		expect(result.output).toBe(expected);
	});

	it('un quotient de même dimension est un nombre, sans unité', () => {
		expect(run('3[h]/1[min]').output).toBe('180');
		expect(run('10[km]/2[m]').output).toBe('5000');
	});

	// Ajout validé par David (2026-10-11) : l'unité écrite, puis l'unité dérivée nommée
	it('une unité dérivée nommée suit l’unité écrite', () => {
		expect(run('9.81[m/s^2]*2[kg]').output).toBe('19.62 m.kg/s^2 = 19.62 N');
	});

	// L'écran dessine l'ARBRE : sans l'unité dedans, Calcul affichait « 5 »
	it('l’arbre de la réponse porte l’unité', () => {
		const result = run('10[km]/1[h]');

		expect(result.ast?.type).toBe('unit');
		expect(result.ast?.type === 'unit' && result.ast.unit.original).toBe('km/h');
	});
});

describe('les erreurs de dimension, en français', () => {
	it.each([
		['5[m]+3[s]', 'On ne peut pas ajouter une longueur et une durée.'],
		['5[m]+3', 'On ne peut pas ajouter une longueur et un nombre sans unité.'],
		['2[kg]+3[cm]', 'On ne peut pas ajouter une masse et une longueur.'],
		['20[°C]*2', 'Une température en °C ne se multiplie pas : écris-la en kelvins (K).']
	])('%s', (input, message) => {
		const result = run(input);

		expect(result.success).toBe(false);
		expect(result.output).toBe(message);
	});
});

describe('le mode décimal', () => {
	function decimal(input: string) {
		const engine = new WebReplEngine();
		engine.execute('.mode decimal');
		return run(input, engine);
	}

	it('une écriture décimale exacte, sans ≈', () => {
		expect(decimal('12[km]+300[m]').output).toBe('12.3 km');
	});

	it('sinon 4 décimales, avec ≈', () => {
		expect(decimal('10[km]/3').output).toBe('≈ 3.3333 km');
	});

	// Décision a de David (2026-10-12) : hors de l'échelle, la notation scientifique
	it('hors de l’échelle : la notation scientifique', () => {
		expect(decimal('9.4607*10^15[m]').output).toBe('9.4607*10^15 m');
		expect(decimal('10^10[km]/3').output).toBe('≈ 3.3333*10^9 km');
	});
});

describe('.convert', () => {
	function after(first: string, then: string) {
		const engine = new WebReplEngine();
		engine.execute(first);
		return engine.execute(then);
	}

	it('exprime la dernière grandeur dans une autre unité, exactement', () => {
		expect(after('12[km]+300[m]', '.convert m').output).toBe('12.3 km = 12300 m');
		expect(after('10[km]/4[h]', '.convert m/s').output).toBe('2.5 km/h = 25/36 m/s');
	});

	it('la réponse est un arbre : la grandeur égale à sa conversion', () => {
		const result = after('12[km]+300[m]', '.convert m');

		expect(result.ast?.type).toBe('relation');
	});

	it('refuse une unité d’une autre grandeur, en français', () => {
		const result = after('1[km]', '.convert kg');

		expect(result.success).toBe(false);
		expect(result.output).toBe(
			'On ne peut pas convertir des km en kg : ce ne sont pas les mêmes grandeurs.'
		);
	});

	it('refuse une unité inconnue', () => {
		const result = after('1[km]', '.convert zz');

		expect(result.success).toBe(false);
		expect(result.output).toBe('Unité inconnue : zz.');
	});

	it('sans grandeur calculée avant, le dit', () => {
		const message =
			"Il n'y a pas de grandeur à convertir : calcule d'abord une grandeur, par exemple 12[km]+300[m].";

		expect(run('.convert m').output).toBe(message);
		// Un calcul sans unité ne laisse pas de grandeur derrière lui
		expect(after('2+3', '.convert m').output).toBe(message);
	});
});

// Décision Q3 (2026-10-11) : sans objet une fois les grandeurs passées par `tidy`
describe('.unitmode n’existe plus', () => {
	it('est refusée', () => {
		expect(run('.unitmode si').success).toBe(false);
	});
});

/**
 * Revue du lot A (2026-10-11) : ce que `tidy` ne réduit pas (racine, valeur
 * absolue, fonction d'un angle, comparaison) et l'unité écrite préférée.
 */
describe('ce que tidy ne réduit pas : le repli exact, dans une unité tapée', () => {
	it.each([
		['sqrt(9[km^2])', '3 km'],
		['sqrt(9[km^2])/1[h]', '3 km/h'],
		['sqrt(16[cm^2])*1[cm]', '4 cm^2'],
		['\\sqrt[3]{8~\\unit{km^3}}', '2 km'],
		['abs(-3[m])', '3 m'],
		['sqrt(4[m^2]/1[s^2])', '2 m/s'],
		['sqrt(2[km^2])', 'sqrt(2) km']
	])('%s → %s', (input, expected) => {
		expect(run(input).output).toBe(expected);
	});

	it('une unité tapée l’emporte quand la valeur y tombe juste', () => {
		expect(run('3[kW]*2[h]').output).toBe('6 kW.h = 21600000 J');
	});

	it('des unités qui s’annulent dans une fonction ou une comparaison : un calcul de nombres', () => {
		expect(run('sin(30[°])').output).toBe('1/2');
		expect(run('5[km]>3[m]').output).toBe('true');
	});
});

describe('températures', () => {
	it('une somme de deux températures absolues est refusée, avec la règle', () => {
		expect(run('20[°C]+30[°C]').output).toBe(
			'Ce calcul de températures n’a pas de sens : on soustrait deux températures (l’écart est en K), ou on ajoute un écart en K à une température, par exemple 20[°C]+5[K].'
		);
	});

	it('.convert passe d’une échelle à l’autre', () => {
		const engine = new WebReplEngine();
		engine.execute('20[°C]');

		expect(engine.execute('.convert K').output).toBe('20 °C = 293.15 K');
	});
});

describe('.convert entre degrés et radians', () => {
	it('180 ° = π rad, exactement', () => {
		const engine = new WebReplEngine();
		engine.execute('180[°]');

		expect(engine.execute('.convert rad').output).toBe('180 ° = \\pi rad');
	});
});

describe('le bouton ≈', () => {
	it('une grandeur non décimale propose sa valeur approchée', () => {
		const result = run('10[km]/3');

		expect(result.approximateLatex).toBe('\\approx 3.3333~\\mathrm{km}');
	});

	it('une grandeur décimale n’en propose pas', () => {
		expect(run('12[km]+300[m]').approximateLatex).toBeUndefined();
	});

	// Revue : l'arbre dessinait « = » entre deux valeurs arrondies
	it('en mode décimal, une conversion arrondie s’écrit ≈ jusque dans l’arbre', () => {
		const engine = new WebReplEngine();
		engine.execute('.mode decimal');
		engine.execute('10[km]/4[h]');
		const result = engine.execute('.convert m/s');

		expect(result.output).toBe('2.5 km/h ≈ 0.6944 m/s');
		expect(result.ast?.type === 'relation' && result.ast.relation).toBe('≈');
	});
});
