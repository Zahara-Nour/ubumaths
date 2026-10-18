/**
 * Les unités de quantité d'information : octet, bit et leurs multiples
 *
 * Demande de David (2026-10-13) : « rajouter les unités comme les octets »
 * (SNT, NSI). Multiples décimaux (ko = 1 000 o) et binaires (Kio = 1 024 o) ;
 * le bit vaut 1/8 d'octet. Nommés un à un : pas de préfixe SI générique, qui
 * ferait lire `mo` ou `do`.
 */

import { describe, it, expect } from 'vitest';
import { resolveUnit } from '../definitions';

describe('les unités d’information', () => {
	it.each([
		['o', 1],
		['ko', 1e3],
		['Mo', 1e6],
		['Go', 1e9],
		['To', 1e12],
		['Kio', 1024],
		['Mio', 1024 ** 2],
		['Gio', 1024 ** 3],
		['Tio', 1024 ** 4],
		['bit', 1 / 8],
		['kbit', 1e3 / 8],
		['Mbit', 1e6 / 8],
		['Gbit', 1e9 / 8]
	])('%s vaut %d octet(s)', (symbol, coefficient) => {
		const unit = resolveUnit(symbol);

		expect(unit?.dimension).toBe('information');
		expect(unit?.baseSymbol).toBe('o');
		expect(unit?.coefficient).toBe(coefficient);
	});

	it.each(['octet', 'octets', 'bits'])('%s est un autre nom', (alias) => {
		expect(resolveUnit(alias)?.dimension).toBe('information');
	});

	// Décision de David (2026-10-18) : « Ko », l'écriture courante des élèves, est le ko
	it('Ko est le kilo-octet', () => {
		expect(resolveUnit('Ko')).toMatchObject({ dimension: 'information', coefficient: 1e3 });
	});

	// Aucun sous-multiple : un milli-octet n'existe pas
	it.each(['mo', 'do', 'co', 'μo'])('%s n’est pas une unité', (symbol) => {
		expect(resolveUnit(symbol)).toBeNull();
	});
});
