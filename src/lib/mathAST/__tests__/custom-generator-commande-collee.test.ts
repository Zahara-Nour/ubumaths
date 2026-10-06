/**
 * toCustom : une commande (`\pi`, `\euler`) suivie d'une lettre par
 * juxtaposition ne se colle pas à elle.
 *
 * ⚠️ `π·x` s'écrivait `\pix` — une commande inconnue à la relecture. Dans
 * l'atelier, qui passe ses expressions substituées au moteur par ce texte,
 * « Dériver » et « Variations » échouaient sur `f(x) = 3\pi x^2` (révélé par
 * l'oracle des dérivées, #910).
 */
import { describe, it, expect } from 'vitest';
import * as MathAST from '../factory';
import { toCustom, CustomGenerator } from '../custom-generator';
import { parseCustomSafe } from '../parser/custom';

const x = MathAST.variable('x');
const pi = MathAST.piConstant();
const implicit = (
	a: Parameters<typeof MathAST.multiply>[0],
	b: Parameters<typeof MathAST.multiply>[1]
) => MathAST.multiply(a, b, 'implicit');

describe('toCustom — commande puis lettre', () => {
	it('3πx s’écrit sans coller \\pi et x, et se relit', () => {
		const node = implicit(implicit(MathAST.number('3'), pi), MathAST.power(x, MathAST.number('2')));
		const text = toCustom(node);

		expect(text).not.toContain('\\pix');
		expect(parseCustomSafe(text).ast).toEqual(parseCustomSafe('3\\pi x^2').ast);
	});

	it('avec métadonnées (rendu par segments) aussi', () => {
		const node = implicit(MathAST.number('2'), implicit(pi, x));
		const text = new CustomGenerator({ renderMetadata: true }).generate(node);

		expect(text).not.toContain('\\pix');
		expect(parseCustomSafe(text).errors ?? []).toHaveLength(0);
	});

	it('π devant une fonction : \\pi sin(x), pas \\pisin(x)', () => {
		const text = toCustom(implicit(pi, MathAST.func('sin', [x])));

		expect(text).not.toContain('\\pisin');
	});

	it('une lettre devant π reste collée : xπ s’écrit x\\pi', () => {
		expect(toCustom(implicit(x, pi))).toBe('x\\pi');
	});
});
