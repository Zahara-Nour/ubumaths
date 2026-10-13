/**
 * Écrire une grandeur naturellement dans Calcul (phase 0
 * `docs/archive/wip/grandeurs-lot-c-phase0.md`, validée par David le 2026-10-11).
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { Atelier } from '../atelier.svelte';
import { runInput, type CalcResult } from '../calcul';

function session() {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

const latexOf = (result: CalcResult) =>
	result.kind === 'calcul' || result.kind === 'commande' ? result.latex : undefined;
const outputOf = (result: CalcResult) =>
	result.kind === 'calcul' || result.kind === 'commande' ? result.output : undefined;
const noteOf = (result: CalcResult) => ('note' in result ? result.note : undefined);

describe('un nombre, une espace, une unité', () => {
	it.each([
		['12 km + 300 m', '12{,}3~\\mathrm{km}'],
		['90 km/h * 2 h', '180~\\mathrm{km}'],
		['2,5 km * 4', '10~\\mathrm{km}'],
		['5 km', '5~\\mathrm{km}']
	])('%s', (input, latex) => {
		expect(latexOf(runInput(session(), input))).toBe(latex);
	});

	// Décision de David : « 1/2 m se lit (1/2) m »
	it('1/2 m vaut un demi-mètre', () => {
		expect(outputOf(runInput(session(), '1/2 m'))).toBe('0,5 m');
	});

	// Décision de David : « je préfère garder 2 h 30 min »
	it('une durée composée garde son écriture', () => {
		const result = runInput(session(), '2 h 30 min');
		expect(outputOf(result)).toBe('2 h 30 min');
		// Les grandeurs juxtaposées, pas un produit recalculé (h²)
		expect(latexOf(result)).toBe('2~\\mathrm{h}~30~\\mathrm{min}');
		expect(outputOf(runInput(session(), '2 h 30 min + 45 min'))).toBe('3 h 15 min');
	});

	it('une valeur tapée naturellement est une grandeur', () => {
		const s = session();
		const defined = runInput(s, 'd = 5 km');
		runInput(s, 't = 2 h');

		expect(defined.kind === 'definition' && 'unit' in defined.object && defined.object.unit).toBe(
			'km'
		);
		expect(latexOf(runInput(s, 'd/t'))).toBe('2{,}5~\\mathrm{km}/\\mathrm{h}');
	});

	it('des grandeurs qui ne s’ajoutent pas : le refus', () => {
		const result = runInput(session(), '5 kg + 3 cm');

		expect(result.kind === 'refus' && result.message).toBe(
			'On ne peut pas ajouter une masse et une longueur.'
		);
	});
});

describe('ce qui reste de l’algèbre', () => {
	it('collé : un produit', () => {
		expect(latexOf(runInput(session(), '2a+1'))).not.toContain('mathrm');
	});

	it('une fonction garde sa variable : f(t) = 3 t + 2', () => {
		const result = runInput(session(), 'f(t) = 3 t + 2');

		expect(result.kind === 'definition' && result.object.kind).toBe('function');
	});
});

describe('les aides', () => {
	it('5km collé : écrire avec une espace', () => {
		expect(noteOf(runInput(session(), '5km'))).toBe(
			'Pour une grandeur, écris 5 km (avec une espace).'
		);
	});

	it('5 m quand une valeur m existe : la grandeur, et l’aide', () => {
		const s = session();
		runInput(s, 'm = 3');
		const result = runInput(s, '5 m');

		expect(latexOf(result)).toBe('5~\\mathrm{m}');
		expect(noteOf(result)).toBe('m est aussi un nom du panneau : pour 5 × m, écris 5m.');
	});

	it('3 t + 2 : le refus dit comment écrire le produit', () => {
		const result = runInput(session(), '3 t + 2');

		expect(result.kind).toBe('refus');
		expect(noteOf(result)).toBe(
			'« 3 t » se lit comme une grandeur (t est une unité) : pour 3 × t, écris 3t.'
		);
	});
});

/** Revue du lot C (2026-10-11). */
describe('une durée composée est UN nombre : parenthèses implicites', () => {
	it.each([
		['3 h - 1 h 30 min', '1 h 30 min'],
		['1 h 30 min * 2', '3 h'],
		['2 * 1 h 30 min', '3 h'],
		['1 h 30 min / 2', '45 min'],
		['2 h 30 min - 2 h 30 min', '0 h'],
		['-2 h 30 min', '-2 h 30 min']
	])('%s → %s', (input, expected) => {
		expect(outputOf(runInput(session(), input))).toBe(expected);
	});
});

describe('une lettre lue comme unité : refus et aide justes', () => {
	it('une valeur qui ne se calcule pas est refusée, avec l’aide', () => {
		const result = runInput(session(), 'd = 3 t + 2');

		expect(result.kind).toBe('refus');
		expect(noteOf(result)).toBe(
			'« 3 t » se lit comme une grandeur (t est une unité) : pour 3 × t, écris 3t.'
		);
	});

	it('pas d’aide quand le refus a une autre cause', () => {
		const result = runInput(session(), '5 kg + 3 m');

		expect(result.kind).toBe('refus');
		expect(noteOf(result)).toBeUndefined();
	});

	it('une grandeur mêlée à une variable libre : refus et aide', () => {
		const result = runInput(session(), '3 a + 2 b');

		expect(result.kind).toBe('refus');
		expect(noteOf(result)).toBe(
			'« 3 a » se lit comme une grandeur (a est une unité) : pour 3 × a, écris 3a.'
		);
	});
});

describe('les aides ne se répètent pas', () => {
	it('une seule aide pour deux fois la même écriture', () => {
		expect(noteOf(runInput(session(), '5km + 3km'))).toBe(
			'Pour une grandeur, écris 5 km (avec une espace).'
		);
	});
});

/**
 * Restes du lot C (2026-10-13) : le membre gauche de `.convertir` répète ce
 * que l'élève a vu, pas la grandeur recalculée (`2,5 h = 150 min`).
 */
describe('.convertir après une durée composée', () => {
	it.each([
		['2 h 30 min', 'min', '2 h 30 min = 150 min'],
		['1 h 30 min + 15 min', 'min', '1 h 45 min = 105 min'],
		['2 h 30 min', 's', '2 h 30 min = 9000 s'],
		// Une seule unité écrite : la grandeur telle quelle
		['2,5 h', 'min', '2,5 h = 150 min']
	])('%s puis .convertir %s', (input, unit, expected) => {
		const s = session();
		runInput(s, input);
		expect(outputOf(runInput(s, `.convertir ${unit}`))).toBe(expected);
	});

	it('une deuxième conversion garde la même écriture', () => {
		const s = session();
		runInput(s, '2 h 30 min');
		runInput(s, '.convertir min');
		expect(outputOf(runInput(s, '.convertir s'))).toBe('2 h 30 min = 9000 s');
	});

	it('en mode décimal aussi', () => {
		const s = session();
		runInput(s, '.mode décimal');
		runInput(s, '2 h 30 min');
		expect(outputOf(runInput(s, '.convertir min'))).toBe('2 h 30 min = 150 min');
	});

	it('l’écriture mathématique aussi', () => {
		const s = session();
		runInput(s, '2 h 30 min');
		expect(latexOf(runInput(s, '.convertir min'))).toBe(
			'2~\\mathrm{h}~30~\\mathrm{min} = 150~\\mathrm{min}'
		);
	});
});
