/**
 * Droite graduée à placer, plusieurs points (`placer: A=3 ; B=7`) : parseur
 * (phase 0 : `docs/wip/reponses-a-placer-progress.md` § 10)
 *
 * Un point nommé par une lettre majuscule, séparés par `;` ; au plus 6. Un
 * point seul peut rester sans nom (`placer: 7`, PR 1).
 */

import { describe, it, expect } from 'vitest';
import { parseNumberLineContent } from '$lib/ubumark/parser/number-line-parser';
import { numVal } from '$lib/ubumark/utils/number-line-render';

const LINE = ['start: 0', 'end: 20', 'step: 1'];
const parse = (placer: string) => parseNumberLineContent([...LINE, `placer: ${placer}`]);
const messages = (placer: string) =>
	parse(placer)
		.errors.map((e) => e.message)
		.join(' ');

describe('parseur : placer: à plusieurs points', () => {
	it('trois points nommés, dans l’ordre écrit', () => {
		const { node, errors } = parse('A=3 ; B=7 ; C=12');
		expect(errors).toEqual([]);
		expect(node?.placer?.map((t) => [t.name, numVal(t.value)])).toEqual([
			['A', 3],
			['B', 7],
			['C', 12]
		]);
	});

	it('espaces facultatifs autour de = et de ;', () => {
		const { node, errors } = parse('A = 3;B=7');
		expect(errors).toEqual([]);
		expect(node?.placer?.map((t) => t.name)).toEqual(['A', 'B']);
	});

	it('un point seul sans nom (PR 1) : nom vide', () => {
		const { node } = parse('7');
		expect(node?.placer).toHaveLength(1);
		expect(node?.placer?.[0].name).toBe('');
		expect(numVal(node!.placer![0].value)).toBe(7);
	});

	it('un point seul nommé', () => {
		const { node } = parse('A=7');
		expect(node?.placer?.[0].name).toBe('A');
	});

	it('deux points sur la même graduation : permis', () => {
		const { node, errors } = parse('A=7 ; B=7');
		expect(errors).toEqual([]);
		expect(node?.placer).toHaveLength(2);
	});

	it('même nom deux fois → refusé', () => {
		expect(parse('A=3 ; A=7').node).toBeNull();
		expect(messages('A=3 ; A=7')).toMatch(/A.*deux fois/);
	});

	it('nom qui n’est pas une lettre majuscule → refusé', () => {
		expect(parse('a=3 ; B=7').node).toBeNull();
		expect(messages('a=3 ; B=7')).toMatch(/« a ».*lettre majuscule/);
		expect(parse('AB=3 ; C=7').node).toBeNull();
	});

	it('plusieurs points, l’un sans nom → refusé', () => {
		expect(parse('A=3 ; 7').node).toBeNull();
		expect(messages('A=3 ; 7')).toMatch(/chaque point.*nom/i);
	});

	it('plus de 6 points → refusé', () => {
		const seven = 'A=1 ; B=2 ; C=3 ; D=4 ; E=5 ; F=6 ; G=7';
		expect(parse(seven).node).toBeNull();
		expect(messages(seven)).toMatch(/6 points au plus/);
		expect(parse('A=1 ; B=2 ; C=3 ; D=4 ; E=5 ; F=6').node).not.toBeNull();
	});

	it('chaque point vérifié : hors de la droite, entre deux graduations', () => {
		expect(messages('A=3 ; B=25')).toMatch(/B.*hors de la droite/);
		expect(
			parseNumberLineContent(['start: 0', 'end: 20', 'step: 2', 'placer: A=4 ; B=7']).node
		).toBeNull();
	});

	it('point vide (; en trop) → refusé', () => {
		expect(parse('A=3 ; ').node).toBeNull();
	});
});
