/**
 * Touches de l'onglet « Unités » du clavier virtuel
 *
 * Les touches sont les unités de la GRANDEUR attendue par le(s) trou(s) à unité ;
 * une unité imposée vient en premier. Chaque touche insère la forme d'affichage
 * (`unitWritingToLatex`) : la correction doit la relire sans macro `\unit`.
 */

import { describe, it, expect } from 'vitest';
import { unitKeysFor, buildUnitsKeyboardLayout, UNITS_LAYOUT_ID } from '../keyboard-units';
import { parseUnitExpression } from '../parser';
import { validateQuantityAnswer } from '../validator';
import { normalizeStudentQuantity } from '../student-input';
import { unitWritingToLatex } from '$lib/mathAST/units/display';

/** Toutes les écritures que le catalogue peut rendre, une grandeur par réponse attendue */
const ALL_MAGNITUDES = [
	'5\\unit{km}',
	'5\\unit{kg}',
	'5\\unit{min}',
	'5\\unit{L}',
	'5\\unit{m^2}',
	'5\\unit{km/h}',
	'5\\unit{°C}',
	'5\\unit{°}',
	'5\\unit{€}'
];

describe('unitKeysFor — grandeur attendue', () => {
	it('longueur : mm, cm, m, km', () => {
		expect(unitKeysFor(['5\\unit{km}'], [undefined])).toEqual(['mm', 'cm', 'm', 'km']);
	});

	it('masse : mg, g, kg, t', () => {
		expect(unitKeysFor(['2\\unit{g}'], [undefined])).toEqual(['mg', 'g', 'kg', 't']);
	});

	it('durée : s, min, h', () => {
		expect(unitKeysFor(['3\\unit{h}'], [undefined])).toEqual(['s', 'min', 'h']);
	});

	it('volume en litres ou en cm³ : même onglet', () => {
		const expected = ['mL', 'cL', 'L', 'cm^3', 'm^3'];
		expect(unitKeysFor(['4\\unit{L}'], [undefined])).toEqual(expected);
		expect(unitKeysFor(['4\\unit{dm^3}'], [undefined])).toEqual(expected);
	});

	it('aire, hectare compris', () => {
		expect(unitKeysFor(['7\\unit{ha}'], [undefined])).toEqual([
			'mm^2',
			'cm^2',
			'm^2',
			'km^2',
			'ha'
		]);
	});

	it('vitesse : m/s, km/h', () => {
		expect(unitKeysFor(['90\\unit{km/h}'], [undefined])).toEqual(['m/s', 'km/h']);
		expect(unitKeysFor(['3\\unit{m.s^-1}'], [undefined])).toEqual(['m/s', 'km/h']);
	});

	it('température, angle, monnaie', () => {
		expect(unitKeysFor(['20\\unit{°C}'], [undefined])).toEqual(['°C']);
		expect(unitKeysFor(['30\\unit{°}'], [undefined])).toEqual(['°']);
		expect(unitKeysFor(['12\\unit{€}'], [undefined])).toEqual(['€']);
	});

	it('plusieurs trous de grandeurs différentes : réunion, sans doublon', () => {
		expect(unitKeysFor(['5\\unit{km}', '2\\unit{h}', '3\\unit{m}'], [])).toEqual([
			'mm',
			'cm',
			'm',
			'km',
			's',
			'min',
			'h'
		]);
	});
});

describe('unitKeysFor — unité imposée', () => {
	it("l'unité imposée vient en premier, sans doublon", () => {
		expect(unitKeysFor(['5\\unit{km}'], ['km'])).toEqual(['km', 'mm', 'cm', 'm']);
	});

	it('une unité imposée hors catalogue est quand même proposée', () => {
		expect(unitKeysFor(['5\\unit{km}'], ['dm'])).toEqual(['dm', 'mm', 'cm', 'm', 'km']);
	});

	it('une unité imposée illisible est ignorée', () => {
		expect(unitKeysFor(['5\\unit{km}'], ['kg/m.s'])).toEqual(['mm', 'cm', 'm', 'km']);
	});
});

describe('unitKeysFor — grandeur inconnue', () => {
	it('réponse attendue illisible ou hors catalogue : petit jeu générique', () => {
		const fallback = unitKeysFor(['n’importe quoi'], [undefined]);
		expect(fallback.length).toBeGreaterThan(0);
		expect(fallback.length).toBeLessThanOrEqual(10);
		expect(unitKeysFor(['3\\unit{N}'], [undefined])).toEqual(fallback);
	});

	it('aucun trou à unité : aucune touche', () => {
		expect(unitKeysFor([], [])).toEqual([]);
	});
});

describe('touches ↔ correction', () => {
	const allKeys = [
		...new Set([
			...ALL_MAGNITUDES.flatMap((answer) => unitKeysFor([answer], [undefined])),
			...unitKeysFor(['?'], [undefined])
		])
	];

	it('le catalogue couvre toutes les grandeurs demandées', () => {
		expect(allKeys).toEqual(expect.arrayContaining(['cm^3', 'ha', 'km/h', '°C', '°', '€', 't']));
	});

	it.each(allKeys)('« %s » est une écriture lue par parseUnitExpression', (writing) => {
		expect(parseUnitExpression(writing)).not.toBeNull();
	});

	it.each(allKeys)('5 puis la touche « %s » : la correction accepte', (writing) => {
		const inserted = `5${unitWritingToLatex(writing)}`;
		const result = validateQuantityAnswer(inserted, `5\\unit{${writing}}`);
		expect(result.isCorrect, `${inserted} → ${result.feedback}`).toBe(true);
	});

	it('5 puis la touche « °C » : la saisie est relue comme 5 °C', () => {
		expect(normalizeStudentQuantity(`5${unitWritingToLatex('°C')}`)).toBe('5\\unit{°C}');
	});

	// Corrigé le 2026-09-24 : la correction refusait TOUTE réponse en °C, même
	// `5\\unit{°C}` (facteur de conversion multiplicatif, null pour une unité affine)
	it('une réponse en °C est corrigée, conversion affine comprise', () => {
		expect(validateQuantityAnswer('5\\unit{°C}', '5\\unit{°C}').isCorrect).toBe(true);
		expect(validateQuantityAnswer('68\\unit{°F}', '20\\unit{°C}').isCorrect).toBe(true);
		expect(validateQuantityAnswer('20\\unit{°F}', '20\\unit{°C}').isCorrect).toBe(false);
	});
});

describe('conversions sans tolérance : le bruit des flottants ne rend pas faux', () => {
	// Mesuré le 2026-09-24 : sans tolérance, la correction exigeait l'égalité EXACTE
	// des flottants après conversion ; 1000 cm³ = 1 L était refusé.
	it.each([
		['1000\\unit{cm^3}', '1\\unit{L}'],
		['0,1\\unit{L}', '100\\unit{mL}'],
		['1,2\\unit{m^2}', '12000\\unit{cm^2}'],
		['68\\unit{°F}', '20\\unit{°C}']
	])('%s = %s', (answer, expected) => {
		expect(validateQuantityAnswer(answer, expected).isCorrect).toBe(true);
	});

	it.each([
		['20,001\\unit{°C}', '20\\unit{°C}'],
		['1001\\unit{cm^3}', '1\\unit{L}'],
		['0,11\\unit{L}', '100\\unit{mL}']
	])('%s ≠ %s (une vraie différence reste fausse)', (answer, expected) => {
		expect(validateQuantityAnswer(answer, expected).isCorrect).toBe(false);
	});
});

describe('buildUnitsKeyboardLayout', () => {
	it('onglet « Unités » dont chaque touche insère la forme affichée', () => {
		const layout = buildUnitsKeyboardLayout(['km', 'm/s']);
		expect(layout.label).toBe('Unités');
		expect(layout.id).toBe(UNITS_LAYOUT_ID);
		const keys = 'rows' in layout ? layout.rows.flat() : [];
		const unitKeys = keys.filter((key) => typeof key !== 'string' && key.insert);
		expect(unitKeys.map((key) => typeof key !== 'string' && key.insert)).toEqual([
			'\\mathrm{km}',
			'\\mathrm{m}/\\mathrm{s}'
		]);
	});
});
