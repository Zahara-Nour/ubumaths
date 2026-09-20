/**
 * Le contenu d'un crochet d'unité est une écriture d'unité, pas une expression.
 *
 * Finding I4 de la revue des grandeurs (2026-09-20) : `2[min]` ne se relisait
 * pas — le tokenizer maison voit `min` comme la fonction `min`, et le
 * parseur d'unité s'arrêtait là. Or `tidy` écrit `15[min]` : ce qu'il produit
 * doit se relire.
 */

import { describe, it, expect } from 'vitest';
import { parseCustom } from '../index';
import { toCustom } from '../../../custom-generator';
import { isUnit } from '../../../guards';

const round = (input: string) => toCustom(parseCustom(input));

describe('crochets d’unité — une unité nommée comme une fonction', () => {
	it.each([
		['15[min]', '15[min]'],
		['2[min]', '2[min]'],
		['1[h]', '1[h]']
	])('%s se relit %s', (input, expected) => {
		expect(round(input)).toBe(expected);
	});

	it('le nœud produit est bien une grandeur', () => {
		const node = parseCustom('2[min]');
		expect(isUnit(node)).toBe(true);
		if (isUnit(node)) {
			expect(node.unit.components.get('s')).toBe(1);
			expect(node.unit.coefficient).toBe(60);
		}
	});
});

describe('crochets d’unité — les écritures composées restent lisibles', () => {
	it.each([
		['2[m/s^2]', '2[m/s^2]'],
		['2[km.h]', '2[km.h]'],
		['3[mL]', '3[mL]'],
		['2[°C]', '2[°C]'],
		['x[m]', 'x[m]']
	])('%s se relit %s', (input, expected) => {
		expect(round(input)).toBe(expected);
	});

	it('une unité inconnue reste une erreur', () => {
		expect(() => parseCustom('2[zz]')).toThrow();
	});
});
