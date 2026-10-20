/**
 * Un atelier rangé (lien, stockage) se relit comme avant — lecture-grandeurs, PR 6
 *
 * Le parseur maison ne lit plus la virgule décimale (`DECIMAL_COMMA`). Or l'atelier
 * range ses définitions SANS leur provenance, et en écrit avec une virgule : un
 * curseur pose `0,3` (`formatSliderValue`), une commande range le texte de l'élève
 * (`0,5u_n + 3`). Relues sans provenance (`'url'`), elles passent par
 * `legacyDecimalCommas`, la règle exacte de l'ancien tokenizer : la virgule collée
 * entre deux entiers est décimale, sauf directement dans un appel de fonction
 * (`max(2,3)`, écrit par le moteur) ou dans une matrice.
 */

import { describe, it, expect } from 'vitest';
import { legacyDecimalCommas } from '$lib/mathAST/parser/custom/legacy-decimal-commas';
import { Atelier } from '../atelier.svelte';
import { astOf } from '../parse';

// =============================================================================
// Constantes
// =============================================================================

/** Écriture rangée → écriture lue (règle de l'ancien tokenizer) */
const STORED: readonly (readonly [string, string])[] = [
	['0,3', '0.3'],
	['0,5u_n + 3', '0.5u_n + 3'],
	['(1,2)', '(1.2)'],
	['2,5*3,5', '2.5*3.5'],
	['12 500,5', '12 500.5'],
	['2,5,3', '2.5,3'],
	['3,14e10', '3.14e10'],
	['mod((2,5)*4,3)', 'mod((2.5)*4,3)'],
	['mod({2,5},4)', 'mod({2.5},4)'],
	['f(1,5)', 'f(1.5)'],
	['√2,5', '√2.5'],
	['𝒞 0,5', '𝒞 0.5'],
	// Inchangées : la virgule sépare, ou n'est pas collée entre deux entiers
	['max(2,3)', 'max(2,3)'],
	['mod(16,4)', 'mod(16,4)'],
	['max(2,5,3)', 'max(2,5,3)'],
	['[[1,5],[2,3]]', '[[1,5],[2,3]]'],
	['1, 2', '1, 2'],
	['1 ,2', '1 ,2'],
	['1e10,2', '1e10,2'],
	['1.5,2', '1.5,2'],
	['x,2', 'x,2'],
	['(1 ; 2)', '(1 ; 2)']
];

// =============================================================================
// Tests
// =============================================================================

describe('legacyDecimalCommas : la règle de l’ancien tokenizer', () => {
	it.each(STORED)('%s se lit %s', (stored, read) => {
		expect(legacyDecimalCommas(stored)).toBe(read);
	});
});

describe('un atelier rangé avec des virgules se relit', () => {
	it('un curseur à 0,3 (écrit par formatSliderValue)', () => {
		const atelier = new Atelier();
		atelier.restore({ version: 1, objects: [{ name: 'a', kind: 'value', definition: '0,3' }] });
		const a = atelier.get('a');
		expect(a?.status).toBe('ok');
	});

	it('une suite récurrente tapée 0,5u_n + 3', () => {
		const atelier = new Atelier();
		atelier.restore({
			version: 1,
			objects: [{ name: 'u', kind: 'sequence', definition: '0,5u_n + 3' }]
		});
		expect(atelier.get('u')?.status).toBe('ok');
	});

	it('max(2,3) rangé par le moteur garde ses deux arguments', () => {
		expect(astOf('max(2,3)*x', 'url')).toMatchObject({
			type: 'multiplication',
			left: { type: 'function', name: 'max', args: [{ value: '2' }, { value: '3' }] }
		});
	});
});
