/**
 * `.domaine` et `.variations` d'une fonction dont le domaine n'a pas pu être
 * établi (#963) : l'atelier montre le message du moteur, en français, et non
 * « Je n'ai pas su lire cette expression ».
 */
import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';

const run = (input: string) =>
	runInput({ atelier: new Atelier(), engine: new WebReplEngine() }, input);

describe('domaine non établi : message du moteur', () => {
	it.each(['.domaine sqrt(sin(x))', '.variations sqrt(sin(x))'])('%s', (input) => {
		const result = run(input);
		expect(result.kind).toBe('refus');
		if (result.kind === 'refus') {
			expect(result.message).toMatch(/^Je ne sais pas encore déterminer (ce|le) domaine/);
			// Pas d'écriture interne (`\sin\left(`) dans un message pour l'élève
			expect(result.message).not.toMatch(/\\/);
		}
	});
});
