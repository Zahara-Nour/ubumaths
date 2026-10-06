/**
 * Atelier — une fonction appelée sur autre chose que x : `f(2x)`, `f(x+1)`…
 *
 * ⚠️ Mesuré sur main le 2026-10-06, avec f(x) = sin(x) :
 * - `.taylor f(2x) 4` rendait `2x^2` : la substitution TEXTUELLE des noms ne
 *   reconnaissait que `f(x)` / `f(n)` et remplaçait le `f` seul de `f(2x)`,
 *   d'où le produit `(sin(x))(2x)` ;
 * - `g(x) = f(2x)` valait sin(1024x) : le paramètre était substitué dix fois.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';

function session(definitions: Record<string, string> = { f: 'sin(x)' }) {
	const s = { atelier: new Atelier(), engine: new WebReplEngine() };
	for (const [name, definition] of Object.entries(definitions))
		s.atelier.create({ kind: 'function', name, definition }, 'text');
	return s;
}

const outputOf = (r: ReturnType<typeof runInput>) =>
	r.kind === 'calcul' || r.kind === 'commande' ? r.output : r.kind === 'refus' ? r.message : '';

const run = (input: string, definitions?: Record<string, string>) =>
	outputOf(runInput(session(definitions), input)).replace(/\s/g, '');

describe('commandes sur f(2x), f(x) = sin(x)', () => {
	it('.taylor f(2x) 4 vaut 2x − (4/3)x³', () => {
		expect(run('.taylor f(2x) 4')).toMatch(/\n?2x-\{4\/3\}x\^3$/);
	});

	it('.dériver f(2x) vaut 2cos(2x)', () => {
		expect(run('.dériver f(2x)')).toMatch(/=2cos\(2x\)$/);
	});

	it('.dériver 2f(3x) vaut 6cos(3x)', () => {
		expect(run('.dériver 2f(3x)')).toMatch(/=6cos\(3x\)$/);
	});

	it('.dériver f(x^2) vaut 2xcos(x²)', () => {
		expect(run('.dériver f(x^2)')).toMatch(/=2xcos\(x\^2\)$/);
	});

	it('.dériver f(f(x)) vaut cos(x)cos(sin(x))', () => {
		const output = run('.dériver f(f(x))');
		expect(output).toContain('cos(sin(x))');
		expect(output).not.toContain('(sin(x))(sin(x))');
	});

	it('.intégrer f(2x) vaut −cos(2x)/2', () => {
		const output = run('.intégrer f(2x)');
		expect(output).toContain('cos(2x)');
		expect(output).not.toContain('(sin(x))(2x)');
	});

	it('.résoudre f(2x)=0 lit sin(2x) = 0', () => {
		const output = run('.résoudre f(2x)=0');
		expect(output).toContain('sin(2x)');
		expect(output).not.toContain('(sin(x))(2x)');
	});

	it.each(['.variations f(2x)', '.domaine f(2x)', '.dériver f(x+1)'])(
		'%s ne lit plus un produit',
		(input) => {
			expect(run(input)).not.toContain('(sin(x))(');
		}
	);

	it('f(x) = 3x² : .dériver f(2x) vaut 24x', () => {
		expect(run('.dériver f(2x)', { f: '3x^2' })).toMatch(/=24x$/);
	});
});

describe('définition g(x) = f(2x)', () => {
	it('.dériver g vaut 2cos(2x), pas 1024cos(1024x)', () => {
		const s = session({ f: 'sin(x)', g: 'f(2x)' });
		expect(outputOf(runInput(s, '.dériver g')).replace(/\s/g, '')).toMatch(/=2cos\(2x\)$/);
	});

	it("f'(2x) vaut cos(2x)", () => {
		expect(run("f'(2x)")).toBe('cos(2x)');
	});

	it(".taylor f'(x) 4 se calcule (dérivée suivie d'un nombre de termes)", () => {
		expect(run(".taylor f'(x) 4")).toMatch(/1-\{1\/2\}x\^2$/);
	});
});
