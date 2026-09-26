/**
 * Tirages TinyMath → syntaxe du générateur (`normalizeRandomRange`)
 * ================================================================
 *
 * Formes relevées dans `.claude/old-questions.json`, qui faisaient échouer la
 * génération (« Failed to generate random number ») :
 * - bornes calculées : `1..a-1`, `b+1..9`, `2..eval:min(10-a,a-1)` ;
 * - exclusions TinyMath sans parenthèses : `cda`, `m2` ; calculées : `-(a)` ;
 * - relatif qui inclut 0 : `0..5;+-` (le générateur exige un minimum > 0).
 */

import { describe, it, expect } from 'vitest';
import { normalizeRandomRange } from '../syntax-converter';

describe('normalizeRandomRange', () => {
	it.each([
		// Bornes
		['1..a-1', '1..{{eval:a-1}}'],
		['b+1..9', '{{eval:b+1}}..9'],
		['11-b..9', '{{eval:11-b}}..9'],
		['12..a*10-12', '12..{{eval:a*10-12}}'],
		['2..eval:min(10-a,a-1)', '2..{{eval:min(10-a,a-1)}}'],
		['a+1..3*a-1!a', '{{eval:a+1}}..{{eval:3*a-1}}!a'],
		// Exclusions
		['2..19!cd(a)', '2..19!cd(a)'],
		['1..9!cda', '1..9!cd(a)'],
		['2..9!cda,cdb', '2..9!cd(a),cd(b)'],
		['2..9!a,m2', '2..9!a,m(2)'],
		['2..9!m(a),d(a)', '2..9!m(a),d(a)'],
		['1..9!a,-(a)', '1..9!a,{{eval:-(a)}}'],
		['2..25!cd(a),cd(b),cd(b+a)', '2..25!cd(a),cd(b),cd({{eval:b+a}})'],
		// Relatifs
		['2..9;+-', '2..9;±'],
		['0..5;+-', '-5..5'],
		['0..5;±', '-5..5'],
		// Pas décimal conservé
		['1..a:0.5', '1..a:0.5'],
		['1..a-1:0.5', '1..{{eval:a-1}}:0.5']
	])('%s → %s', (input, expected) => {
		expect(normalizeRandomRange(input)).toBe(expected);
	});

	it.each([
		'2..19',
		'a..9',
		'1..9!a,b',
		'eval:a*10+c-b',
		'rouge|vert',
		'2|4|6|8',
		'b/a',
		'digits:2.1',
		'0.5..9.99:0.01',
		'5*digits:5+1..4'
	])('laisse intact : %s', (input) => {
		expect(normalizeRandomRange(input)).toBe(input);
	});
});
