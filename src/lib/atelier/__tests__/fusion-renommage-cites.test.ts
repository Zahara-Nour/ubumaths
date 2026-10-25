/**
 * « Garder dans mon atelier » : un arrivant renommé emmène ceux qui le citent
 * (B9 de `docs/archive/wip/atelier-remplacer-phase0.md`, validé par David le 2026-10-19).
 *
 * Le défaut : reçu `a = 3` et `f(x) = a x`, local `a = 5` → le `a` reçu devient
 * `b`, mais `f` restait `a x` et suivait le `a = 5` local, sans rien dire.
 * Les définitions des AUTRES arrivants sont réécrites, comme le fait
 * `Atelier.rename` : texte et LaTeX de carte, noms indicés, longueurs `AM`,
 * constructions.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { mergeInto } from '../merge';

/** Le nom qu'a pris l'arrivant `from`. */
function renamedTo(report: ReturnType<typeof mergeInto>, from: string): string {
	const found = report.renamed.find((r) => r.from === from);
	if (found === undefined) throw new Error(`${from} n’a pas été renommé`);
	return found.to;
}

describe('B9 : les arrivants qui citent un renommé le suivent', () => {
	it('reçu a = 3 et f(x) = a x, local a = 5 : f suit le a REÇU', () => {
		const mien = new Atelier();
		mien.create({ kind: 'value', name: 'a', definition: '5' }, 'text');
		const recu = new Atelier();
		recu.create({ kind: 'value', name: 'a', definition: '3' }, 'text');
		recu.create({ kind: 'function', name: 'f', definition: 'a x' }, 'text');

		const report = mergeInto(mien, recu.serialize());

		const to = renamedTo(report, 'a');
		expect(mien.get('f')?.definition).toBe(`${to} x`);
		expect(mien.get(to)?.definition).toBe('3');
		// f ne dépend plus du a local
		expect(mien.dependents('a')).not.toContain('f');
		expect(mien.dependents(to)).toContain('f');
	});

	it('le premier terme d’une suite et une valeur calculée suivent aussi', () => {
		const mien = new Atelier();
		mien.create({ kind: 'value', name: 'a', definition: '5' }, 'text');
		const recu = new Atelier();
		recu.create({ kind: 'value', name: 'a', definition: '3' }, 'text');
		recu.create({ kind: 'value', name: 'c', definition: '2a+1' }, 'text');

		const report = mergeInto(mien, recu.serialize());

		const to = renamedTo(report, 'a');
		expect(mien.get('c')?.definition).toBe(`2${to}+1`);
		expect(mien.get('c')?.status).toBe('ok');
	});

	it('pas de renommage en chaîne : a renommé ne prend pas le nom d’un autre arrivant', () => {
		const mien = new Atelier();
		mien.create({ kind: 'value', name: 'a', definition: '5' }, 'text');
		const recu = new Atelier();
		recu.create({ kind: 'value', name: 'a', definition: '3' }, 'text');
		recu.create({ kind: 'value', name: 'b', definition: '4' }, 'text');
		recu.create({ kind: 'value', name: 'c', definition: 'a+b' }, 'text');

		const report = mergeInto(mien, recu.serialize());

		const to = renamedTo(report, 'a');
		expect(report.renamed).toEqual([{ from: 'a', to }]);
		expect(['b', 'c']).not.toContain(to);
		expect(mien.get('c')?.definition).toBe(`${to}+b`);
		expect(mien.get('b')?.definition).toBe('4');
	});

	it('noms indicés : reçu a_1 renommé, a_1 x suit ; le a_1 d’un autre nom n’est pas touché', () => {
		const mien = new Atelier();
		mien.create({ kind: 'value', name: 'a_1', definition: '5' }, 'text');
		const recu = new Atelier();
		recu.create({ kind: 'value', name: 'a_1', definition: '3' }, 'text');
		recu.create({ kind: 'value', name: 'a', definition: '7' }, 'text');
		recu.create({ kind: 'function', name: 'f', definition: 'a_1 x + a' }, 'text');

		const report = mergeInto(mien, recu.serialize());

		const to = renamedTo(report, 'a_1');
		expect(mien.get('f')?.definition).toBe(`${to} x + a`);
	});

	it('LaTeX de carte : a_{1} écrit par MathLive suit lui aussi', () => {
		const mien = new Atelier();
		mien.create({ kind: 'value', name: 'a_1', definition: '5' }, 'text');
		const recu = new Atelier();
		recu.create({ kind: 'value', name: 'a_1', definition: '3' }, 'text');
		recu.create({ kind: 'function', name: 'f', definition: '' });
		expect(recu.update('f', 'a_{1}\\cdot x', 'keyboard').ok).toBe(true);
		const stored = recu.serialize().objects.find((o) => o.name === 'f')?.definition;
		expect(stored).toContain('a_{1}');

		const report = mergeInto(mien, recu.serialize());

		const to = renamedTo(report, 'a_1');
		expect(mien.dependents(to)).toContain('f');
		expect(mien.dependents('a_1')).not.toContain('f');
		expect(mien.get('f')?.status).toBe('ok');
	});
});

describe('B9 : la géométrie suit le point renommé', () => {
	/** Reçu : A, B, I = milieu(A, B), d = (AB), L = AB ; local : un A à lui. */
	function received(): Atelier {
		const recu = new Atelier();
		recu.create({ kind: 'point', name: 'A', definition: '(1 ; 2)' }, 'text');
		recu.create({ kind: 'point', name: 'B', definition: '(3 ; 4)' }, 'text');
		recu.create({ kind: 'point', name: 'I', definition: 'milieu(A, B)' }, 'text');
		recu.create({ kind: 'curve', name: 'd', definition: '(AB)' }, 'text');
		recu.create({ kind: 'value', name: 'L', definition: 'AB' }, 'text');
		return recu;
	}

	it('constructions, droites et longueurs AM réécrites', () => {
		const mien = new Atelier();
		mien.create({ kind: 'point', name: 'A', definition: '(0 ; 0)' }, 'text');

		const report = mergeInto(mien, received().serialize());

		const to = renamedTo(report, 'A');
		expect(mien.get('I')?.definition).toBe(`milieu(${to}, B)`);
		expect(mien.get('d')?.definition).toBe(`(${to}B)`);
		expect(mien.get('L')?.definition).toBe(`${to}B`);
		for (const name of ['I', 'd', 'L']) expect(mien.get(name)?.status).toBe('ok');
		expect(mien.dependents('A')).toEqual([]);
	});

	it('une construction écrite dans une carte (LaTeX) suit aussi', () => {
		const mien = new Atelier();
		mien.create({ kind: 'point', name: 'A', definition: '(0 ; 0)' }, 'text');
		const recu = received();
		recu.update('I', '\\operatorname{milieu}\\left(A,B\\right)', 'keyboard');

		const report = mergeInto(mien, recu.serialize());

		const to = renamedTo(report, 'A');
		expect(mien.get('I')?.definition).toBe(`\\operatorname{milieu}\\left(${to},B\\right)`);
		expect(mien.dependents('A')).toEqual([]);
	});
});
