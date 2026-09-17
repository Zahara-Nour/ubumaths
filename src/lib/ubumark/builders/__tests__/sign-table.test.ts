/**
 * De la grille mathAST au tableau de l'application.
 *
 * ⚠️ **Le tableau de signes ne s'affichait NULLE PART.** Les renderers
 * pédagogiques le composent en `\begin{array}{|c|ccc|}` avec des `\hline` :
 * MathLive ne connaît pas cet environnement — mesuré, il rend une boîte
 * d'erreur — et l'atelier comme les corrections de questions employaient ce
 * LaTeX. `VariationTable.svelte`, lui, sait dessiner un tableau de signes
 * depuis un `VariationTableNode` ; ce module fait le pont.
 *
 * Les signes ne sont PAS recalculés ici : ils viennent de la grille que
 * `pedagogical-solve` construit, la même qui sert à écrire le LaTeX.
 */

import { describe, it, expect } from 'vitest';
import { signTableNode } from '../sign-table';
import {
	generateInequalitySteps,
	quadraticSignTableGrid,
	rationalSignTableGrid
} from '$lib/mathAST/pedagogical-solve';
import { parseCustomSafe } from '$lib/mathAST/parser/custom';
import type { SignRow } from '$lib/ubumark/types/variation-table';

const ast = (s: string) => (parseCustomSafe(s) as { ast: never }).ast;

/** La grille du tableau de signes d'une inéquation, telle que mathAST la calcule. */
function gridOf(source: string) {
	const steps = generateInequalitySteps(ast(source), { level: 'lycee' });
	const step = steps.find((s) => s.rule.includes('sign-table'));
	const op = step?.operation;
	if (op?.kind === 'quadratic-sign-table') return quadraticSignTableGrid(op);
	if (op?.kind === 'rational-sign-table') return rationalSignTableGrid(op);
	throw new Error(`pas de tableau de signes pour ${source}`);
}

function signRows(source: string): SignRow[] {
	const node = signTableNode(gridOf(source)!);
	return node.rows.filter((r): r is SignRow => r.type === 'sign');
}

describe('second degré', () => {
	it('le domaine va de -∞ à +∞ en passant par les racines', () => {
		const node = signTableNode(gridOf('x^2-3x+2>0')!);

		expect(node.type).toBe('variation-table');
		expect(node.variable).toBe('x');
		expect(node.domain.map((p) => p.expression)).toEqual(['-\\infty', '1', '2', '+\\infty']);
	});

	it('les signes sont ceux de la grille, pas un recalcul', () => {
		const [row] = signRows('x^2-3x+2>0');

		// a > 0 : signe de a à l'extérieur des racines, opposé entre elles.
		expect(row.values.get('-\\infty,1')).toEqual({ type: 'sign', value: '+' });
		expect(row.values.get('1,2')).toEqual({ type: 'sign', value: '-' });
		expect(row.values.get('2,+\\infty')).toEqual({ type: 'sign', value: '+' });
	});

	it('chaque racine porte un zéro', () => {
		const [row] = signRows('x^2-3x+2>0');

		expect(row.values.get('1')).toEqual({ type: 'marker', marker: 'zero' });
		expect(row.values.get('2')).toEqual({ type: 'marker', marker: 'zero' });
	});

	it('les bornes infinies ne portent rien', () => {
		const [row] = signRows('x^2-3x+2>0');

		expect(row.values.get('-\\infty')).toBeUndefined();
		expect(row.values.get('+\\infty')).toBeUndefined();
	});

	it('un coefficient dominant négatif inverse tout', () => {
		const [row] = signRows('-x^2+3x-2>0');

		expect(row.values.get('-\\infty,1')).toEqual({ type: 'sign', value: '-' });
		expect(row.values.get('1,2')).toEqual({ type: 'sign', value: '+' });
	});
});

describe('quotient', () => {
	it('trois lignes : P, Q et le quotient', () => {
		const rows = signRows('(x-1)/(x+2)>0');

		expect(rows.map((r) => r.label)).toEqual(['P(x)', 'Q(x)', '\\dfrac{P(x)}{Q(x)}']);
	});

	it('la valeur interdite est une double barre sur le quotient, un zéro sur Q', () => {
		const [, q, quotient] = signRows('(x-1)/(x+2)>0');

		// ⚠️ La distinction est le cœur d'un tableau de quotient : Q s'ANNULE
		// en -2, mais le quotient y est INTERDIT.
		expect(q.values.get('-2')).toEqual({ type: 'marker', marker: 'zero' });
		expect(quotient.values.get('-2')).toEqual({ type: 'marker', marker: 'asymptote' });
	});

	it('le quotient s’annule là où le numérateur s’annule', () => {
		const [, , quotient] = signRows('(x-1)/(x+2)>0');

		expect(quotient.values.get('1')).toEqual({ type: 'marker', marker: 'zero' });
	});

	it('le signe du quotient est le produit des signes', () => {
		const [p, q, quotient] = signRows('(x-1)/(x+2)>0');

		for (const key of ['-\\infty,-2', '-2,1', '1,+\\infty']) {
			const pv = p.values.get(key);
			const qv = q.values.get(key);
			const fv = quotient.values.get(key);
			expect(pv?.type === 'sign' && qv?.type === 'sign' && fv?.type === 'sign').toBe(true);
			if (pv?.type !== 'sign' || qv?.type !== 'sign' || fv?.type !== 'sign') continue;
			const attendu = pv.value === qv.value ? '+' : '-';
			expect(fv.value, `intervalle ${key}`).toBe(attendu);
		}
	});
});
