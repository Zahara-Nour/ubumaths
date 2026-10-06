/**
 * Oracle numérique des primitives — test PERMANENT (décision de David,
 * 2026-10-06). Règles : voir `primitives-oracle.ts` ; corpus :
 * `primitives-corpus.ts` ; écarts connus : `primitives-known.ts`.
 *
 * « Refus / non supporté » n'est pas un échec : il est compté (couverture).
 */

import { describe, it, expect, afterAll } from 'vitest';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import type { CalcSession } from '$lib/atelier/calcul';
import { DEFINITE_CASES, FAST_REFUSAL_INPUTS, PRIMITIVE_CASES } from './primitives-corpus';
import { parseLatex } from '$lib/mathAST/parser';
import { integrate } from '$lib/mathAST/integration/integrate';
import { judgeDefinite, judgePrimitive, stepChecks, type Verdict } from './primitives-oracle';
import { KNOWN_FORM_DIFF, KNOWN_WRONG } from './primitives-known';

// Une session partagée : `.intégrer` ne définit rien dans l'atelier
const session: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };

interface Judged {
	readonly key: string;
	readonly family: string;
	readonly verdict: Verdict;
}

const judged: Judged[] = [
	...PRIMITIVE_CASES.map((c) => ({
		key: `${c.path}:${c.input}`,
		family: c.family,
		verdict: judgePrimitive(c, session)
	})),
	...DEFINITE_CASES.map((c) => ({
		key: `def:${c.path}:${c.input}${c.path === 'latex' ? ` [${c.lower} ; ${c.upper}]` : ''}`,
		family: c.family,
		verdict: judgeDefinite(c, session)
	}))
];

/** Marge CI : refus mesuré en quelques ms en local */
const FAST_REFUSAL_MAX_MS = 2000;

describe('oracle : entrées qui bouclaient (refus rapide)', () => {
	it.each(FAST_REFUSAL_INPUTS)('%s est refusée en moins de 2 s', (input) => {
		const start = performance.now();
		const result = integrate(parseLatex(input), { variable: 'x' });
		const elapsed = performance.now() - start;
		expect(result.status).toBe('unsupported');
		expect(elapsed).toBeLessThan(FAST_REFUSAL_MAX_MS);
	});
});

describe('oracle numérique des primitives', () => {
	it('les clés du corpus sont uniques', () => {
		const keys = judged.map((j) => j.key);
		expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
	});

	it('les listes connues ne nomment que des entrées du corpus', () => {
		const keys = new Set(judged.map((j) => j.key));
		const stale = [...Object.keys(KNOWN_WRONG), ...Object.keys(KNOWN_FORM_DIFF)].filter(
			(k) => !keys.has(k)
		);
		expect(stale).toEqual([]);
	});

	it.each(judged)('$key', ({ key, verdict }) => {
		// Un corpus incohérent est un bug du test
		expect(verdict.status === 'corpus' ? verdict.reason : null).toBeNull();
		const wrong = verdict.status === 'faux';
		const description =
			verdict.status === 'faux'
				? `FAUX : ${verdict.reason} — rendu « ${verdict.rendered} »`
				: verdict.status === 'juste'
					? `juste — rendu « ${verdict.rendered} »`
					: verdict.status;
		// Faux sans être listé, ou listé mais plus faux (le retirer de KNOWN_WRONG)
		expect({ key, wrong, description }).toEqual({ key, wrong: key in KNOWN_WRONG, description });
		if (verdict.status === 'juste' && verdict.formOk !== null) {
			const formDiff = !verdict.formOk;
			expect({ key, formDiff, rendered: verdict.rendered }).toEqual({
				key,
				formDiff: key in KNOWN_FORM_DIFF,
				rendered: verdict.rendered
			});
		} else {
			expect(key in KNOWN_FORM_DIFF ? `${key} n'a plus d'écart de forme` : null).toBeNull();
		}
	});

	afterAll(() => {
		// Couverture par famille : juste / faux / refus
		const table = new Map<string, { juste: number; faux: number; refus: number; forme: number }>();
		for (const { family, verdict } of judged) {
			const row = table.get(family) ?? { juste: 0, faux: 0, refus: 0, forme: 0 };
			if (verdict.status === 'juste') row.juste++;
			else if (verdict.status === 'faux') row.faux++;
			else if (verdict.status === 'refus') row.refus++;
			if (verdict.status === 'juste' && verdict.formOk === false) row.forme++;
			table.set(family, row);
		}
		if (process.env.ORACLE_REPORT === '1') {
			console.table(Object.fromEntries(table));
			console.log(`étapes contrôlées : ${stepChecks.count}`);
			for (const { key, verdict } of judged)
				console.log(`${verdict.status}\t${key}\t${JSON.stringify(verdict)}`);
		}
	});
});
