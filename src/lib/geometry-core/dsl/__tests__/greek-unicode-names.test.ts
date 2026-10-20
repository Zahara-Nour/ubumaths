/**
 * Lettres grecques Unicode comme noms d'objets (2026-10-03)
 *
 * `Ω = point(0, 1)` était refusé par le tokenizer (« Caractère inattendu ») : un
 * centre de cercle se nomme souvent Ω. Les lettres grecques Unicode (Α…Ω, α…ω)
 * sont des lettres d'identifiant comme les lettres latines ; le nom affiché est
 * celui qu'a écrit l'auteur. `π` est réservé : c'est la constante, comme `\pi`
 * (`π = 3` est refusé ; `2 * π` vaut 2π depuis que le parseur maison lit `π` comme
 * la constante, lecture-grandeurs PR 4, 2026-10-20).
 */
import { describe, it, expect } from 'vitest';
import { tokenize } from '../tokenizer';
import { runDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';
import { isPointElement } from '../../types/elements';

describe('lettres grecques Unicode — tokenizer', () => {
	it.each(['Ω', 'α', 'ω', 'Α', 'Δ', 'θ', 'ς', 'Ω1', 'Ω_2', 'Aα', 'Ωprime'])(
		'`%s` est un identifiant',
		(name) => {
			const tokens = tokenize(`${name} = 1`);
			expect(tokens[0]).toMatchObject({ type: 'IDENTIFIER', value: name });
		}
	);

	it('les mots-clés et noms latins sont inchangés', () => {
		expect(tokenize('si x')[0].type).toBe('KEYWORD');
		expect(tokenize('A1 = 2')[0]).toMatchObject({ type: 'IDENTIFIER', value: 'A1' });
	});

	it('un caractère hors alphabet grec reste refusé', () => {
		expect(() => tokenize('é = 1')).toThrow(/inattendu/);
		expect(() => tokenize('€ = 1')).toThrow(/inattendu/);
	});
});

describe('lettres grecques Unicode — figure', () => {
	it('`Ω = point(0, 1)` : point nommé « Ω », utilisable comme centre', () => {
		const { figure, symbols } = runDsl(
			'Ω = point(0, 1)\nc = cercle(Ω, rayon=2)\nP = point(2, 3)\nM = milieu(Ω, P)'
		);
		const omega = symbols.get('Ω');
		expect(omega).toBeDefined();
		const el = figure.getAllElements().find((e) => isPointElement(e) && e.label === 'Ω');
		expect(el).toBeDefined();
		const m = figure.getAllElements().find((e) => isPointElement(e) && e.label === 'M');
		const pos = figure.getPosition(m!.id)!;
		expect(geoToNumber(pos.x)).toBeCloseTo(1);
		expect(geoToNumber(pos.y)).toBeCloseTo(2);
	});

	it('variable numérique grecque dans une expression : `α = 30` puis `x = 2 * α`', () => {
		const { symbols } = runDsl('α = 30\nx = 2 * α + 1');
		expect((symbols.get('x') as { value: number }).value).toBeCloseTo(61);
	});

	it('`x = 2 * π` : la constante, comme `2 * \\pi`', () => {
		const { symbols } = runDsl('x = 2 * π');
		expect((symbols.get('x') as { value: number }).value).toBeCloseTo(2 * Math.PI);
	});

	it('`π = 3` : refusé, `π` est la constante réservée', () => {
		expect(() => runDsl('π = 3')).toThrow(/réservée/);
	});
});
